'use client'

import { useEffect, useRef } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force'
import type { Simulation, SimulationNodeDatum, SimulationLinkDatum, ForceLink } from 'd3-force'
import type { FieldGraph } from './GraphTab'

const NODE_RADIUS = 10
/** The common unit: every edge relaxes toward this length. */
const LINK_DISTANCE = 90
const CANVAS_HEIGHT = 560
const MIN_ZOOM = 0.25
const MAX_ZOOM = 10
/** Base spacing (world units) of the isometric background dot grid. */
const GRID_SPACING = 28
/** Pointer movement (px) below which a press counts as a click, not a drag. */
const CLICK_SLOP = 4

interface SimNode extends SimulationNodeDatum {
  id: string
  searched: boolean
}

type SimLink = SimulationLinkDatum<SimNode>

interface Transform {
  x: number
  y: number
  k: number
}

type PointerState =
  | { mode: 'drag'; node: SimNode; moved: number }
  | { mode: 'pan'; startX: number; startY: number; origin: Transform; moved: number }
  | null

interface GraphCanvasProps {
  graph: FieldGraph
  selectedId: string | null
  onNodeClick: (id: string) => void
  loading: boolean
}

export default function GraphCanvas({ graph, selectedId, onNodeClick, loading }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Simulation state lives in refs: node positions must survive re-renders
  // without triggering them.
  const nodesRef = useRef<Map<string, SimNode>>(new Map())
  const linksRef = useRef<SimLink[]>([])
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 })
  const sizeRef = useRef({ w: 0, h: CANVAS_HEIGHT })
  const hoverRef = useRef<SimNode | null>(null)
  const selectedRef = useRef<string | null>(selectedId)
  const pointerRef = useRef<PointerState>(null)

  // Keep latest props visible to the (stable) event handlers.
  const onNodeClickRef = useRef(onNodeClick)
  const loadingRef = useRef(loading)
  useEffect(() => {
    onNodeClickRef.current = onNodeClick
    loadingRef.current = loading
  }, [onNodeClick, loading])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    // Theme is class-based (useTheme.ts toggles `dark` on <html>); don't
    // consult prefers-color-scheme or an OS dark preference would override
    // an explicit light app theme.
    const dark = document.documentElement.classList.contains('dark')

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h)

    const t = transformRef.current
    ctx.translate(t.x, t.y)
    ctx.scale(t.k, t.k)

    // Isometric dot grid (staggered rows), drawn in world space so it pans
    // and zooms with the graph. Spacing adapts to keep on-screen density sane.
    let spacing = GRID_SPACING
    while (spacing * t.k < 14) spacing *= 2
    while (spacing * t.k > 56) spacing /= 2
    const rowH = spacing * 0.866 // sin 60° — rows form equilateral triangles
    const dotR = 1.25 / t.k // ~constant screen-size dots
    const wx0 = -t.x / t.k
    const wy0 = -t.y / t.k
    const wx1 = (sizeRef.current.w - t.x) / t.k
    const wy1 = (sizeRef.current.h - t.y) / t.k
    ctx.fillStyle = dark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.22)'
    ctx.beginPath()
    for (let row = Math.floor(wy0 / rowH); row * rowH <= wy1; row++) {
      const y = row * rowH
      const offset = row % 2 ? spacing / 2 : 0
      for (let x = Math.floor((wx0 - offset) / spacing) * spacing + offset; x <= wx1; x += spacing) {
        ctx.moveTo(x + dotR, y)
        ctx.arc(x, y, dotR, 0, Math.PI * 2)
      }
    }
    ctx.fill()

    // Edges
    ctx.strokeStyle = dark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (const link of linksRef.current) {
      const s = link.source as SimNode
      const g = link.target as SimNode
      if (s.x == null || g.x == null) continue
      ctx.moveTo(s.x, s.y!)
      ctx.lineTo(g.x, g.y!)
    }
    ctx.stroke()

    // Nodes
    const hovered = hoverRef.current
    for (const node of nodesRef.current.values()) {
      if (node.x == null || node.y == null) continue
      ctx.beginPath()
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = node.searched ? '#2563eb' : '#f59e0b' // blue-600 / amber-500
      ctx.fill()
      ctx.strokeStyle = dark ? '#1e293b' : '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      if (node.id === selectedRef.current) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, NODE_RADIUS + 5, 0, Math.PI * 2)
        ctx.strokeStyle = dark ? '#f8fafc' : '#0f172a'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }

      if (node === hovered) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, NODE_RADIUS + 3.5, 0, Math.PI * 2)
        ctx.strokeStyle = node.searched ? 'rgba(37, 99, 235, 0.5)' : 'rgba(245, 158, 11, 0.6)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // Hovered node id label
    if (hovered && hovered.x != null && hovered.y != null) {
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = dark ? '#e2e8f0' : '#334155'
      ctx.fillText(hovered.id, hovered.x, hovered.y + NODE_RADIUS + 16)
    }
  }

  // Create the simulation once.
  useEffect(() => {
    const sim = forceSimulation<SimNode>()
      .force(
        'link',
        forceLink<SimNode, SimLink>()
          .id((d) => d.id)
          .distance(LINK_DISTANCE)
      )
      .force('charge', forceManyBody().strength(-180))
      .force('collide', forceCollide(NODE_RADIUS + 6))
      // World origin is (0, 0); the view transform centers it in the canvas.
      .force('x', forceX(0).strength(0.05))
      .force('y', forceY(0).strength(0.05))
      .on('tick', draw)
    simRef.current = sim

    const container = containerRef.current
    const canvas = canvasRef.current

    const resize = () => {
      if (!container || !canvas) return
      const w = container.clientWidth
      const h = CANVAS_HEIGHT
      const dpr = window.devicePixelRatio || 1
      const firstSize = sizeRef.current.w === 0
      sizeRef.current = { w, h }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      if (firstSize) {
        transformRef.current = { x: w / 2, y: h / 2, k: 1 }
      }
      draw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    if (container) observer.observe(container)

    // Redraw when the theme flips (canvas colors aren't CSS-driven).
    const themeObserver = new MutationObserver(draw)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // React's synthetic wheel listeners are passive; attach natively to preventDefault.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const t = transformRef.current
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.k * Math.exp(-e.deltaY * 0.007)))
      // Zoom toward the cursor.
      transformRef.current = {
        x: px - ((px - t.x) * k) / t.k,
        y: py - ((py - t.y) * k) / t.k,
        k,
      }
      draw()
    }
    canvas?.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      sim.stop()
      observer.disconnect()
      themeObserver.disconnect()
      canvas?.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Sync the accumulated graph into the simulation.
  useEffect(() => {
    const nodes = nodesRef.current

    for (const id of [...nodes.keys()]) {
      if (!graph[id]) nodes.delete(id)
    }

    const jitter = () => (Math.random() - 0.5) * LINK_DISTANCE
    for (const [id, gn] of Object.entries(graph)) {
      const existing = nodes.get(id)
      if (existing) {
        existing.searched = gn.searched
      } else {
        // Seed near an already-placed neighbor so the graph grows outward.
        const anchor = gn.neighbors.map((n) => nodes.get(n)).find((n) => n && n.x != null)
        nodes.set(id, {
          id,
          searched: gn.searched,
          x: (anchor?.x ?? 0) + jitter(),
          y: (anchor?.y ?? 0) + jitter(),
        })
      }
    }

    // Dedup'd undirected edge list.
    const links: SimLink[] = []
    const seen = new Set<string>()
    for (const [id, gn] of Object.entries(graph)) {
      for (const nb of gn.neighbors) {
        if (!graph[nb]) continue
        const key = id < nb ? `${id}|${nb}` : `${nb}|${id}`
        if (seen.has(key)) continue
        seen.add(key)
        links.push({ source: id, target: nb })
      }
    }
    linksRef.current = links

    const sim = simRef.current
    if (sim) {
      sim.nodes([...nodes.values()])
      ;(sim.force('link') as ForceLink<SimNode, SimLink>).links(links)
      sim.alpha(0.6).restart()
    }
    draw()
  }, [graph])

  useEffect(() => {
    selectedRef.current = selectedId
    draw()
  }, [selectedId])

  const toWorld = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const t = transformRef.current
    return { x: (px - t.x) / t.k, y: (py - t.y) / t.k }
  }

  const hitTest = (wx: number, wy: number): SimNode | null => {
    // Later nodes draw on top; test them first.
    const all = [...nodesRef.current.values()]
    for (let i = all.length - 1; i >= 0; i--) {
      const n = all[i]
      if (n.x == null || n.y == null) continue
      const dx = wx - n.x
      const dy = wy - n.y
      if (dx * dx + dy * dy <= (NODE_RADIUS + 2) * (NODE_RADIUS + 2)) return n
    }
    return null
  }

  const setCursor = (cursor: string) => {
    if (canvasRef.current) canvasRef.current.style.cursor = cursor
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = toWorld(e)
    const node = hitTest(x, y)
    if (node) {
      node.fx = node.x
      node.fy = node.y
      pointerRef.current = { mode: 'drag', node, moved: 0 }
      simRef.current?.alphaTarget(0.3).restart()
      setCursor('grabbing')
    } else {
      pointerRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origin: { ...transformRef.current },
        moved: 0,
      }
      setCursor('grabbing')
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = pointerRef.current
    if (state?.mode === 'drag') {
      const { x, y } = toWorld(e)
      state.moved += Math.abs(e.movementX) + Math.abs(e.movementY)
      state.node.fx = x
      state.node.fy = y
      return
    }
    if (state?.mode === 'pan') {
      const dx = e.clientX - state.startX
      const dy = e.clientY - state.startY
      state.moved = Math.abs(dx) + Math.abs(dy)
      transformRef.current = { ...state.origin, x: state.origin.x + dx, y: state.origin.y + dy }
      draw()
      return
    }
    // Hover
    const { x, y } = toWorld(e)
    const node = hitTest(x, y)
    if (node !== hoverRef.current) {
      hoverRef.current = node
      draw()
    }
    setCursor(node ? 'pointer' : 'default')
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const state = pointerRef.current
    pointerRef.current = null
    if (!state) return
    if (state.mode === 'drag') {
      simRef.current?.alphaTarget(0)
      state.node.fx = null
      state.node.fy = null
      if (state.moved < CLICK_SLOP && !loadingRef.current) {
        onNodeClickRef.current(state.node.id)
      }
      setCursor('pointer')
    } else {
      setCursor('default')
    }
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handlePointerLeave = () => {
    if (hoverRef.current) {
      hoverRef.current = null
      draw()
    }
  }

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="block rounded-md bg-slate-100 dark:bg-slate-800/60 touch-none"
      />
    </div>
  )
}
