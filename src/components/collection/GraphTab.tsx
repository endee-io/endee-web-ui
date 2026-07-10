'use client'

import { useState } from 'react'
import { GoChevronDown, GoChevronRight } from 'react-icons/go'
import { api } from '../../api/client'
import type { CollectionSummary, FullObject, ObjectLinksResult } from '../../api/client'
import { typeLabel, fieldDimension } from '../../lib/collectionFields'
import Notification from '../Notification'
import Select from '../Select'
import GraphCanvas from './GraphCanvas'
import { vectorPreview } from './ObjectsTab'

export interface GraphNode {
  label?: number
  /** True if this id has been searched directly (not just seen as a link). */
  searched: boolean
  /** All ids this node has been searched from or returned as connected to. */
  neighbors: string[]
}

/** Accumulated adjacency for one dense field, keyed by object id. */
export type FieldGraph = Record<string, GraphNode>

interface GraphTabProps {
  collectionName: string
  collection: CollectionSummary
}

export default function GraphTab({ collectionName, collection }: GraphTabProps) {
  const denseFields = (collection.fields ?? []).filter((f) => f.type === 'vector')

  const [field, setField] = useState(denseFields[0]?.name ?? '')
  const [idInput, setIdInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Results accumulate across searches, per field. Component state only, so a
  // page refresh resets the graph.
  const [graphs, setGraphs] = useState<Record<string, FieldGraph>>({})

  // Selected node (any node on the canvas) + its full object details.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<FullObject | null>(null)
  const [objectLoading, setObjectLoading] = useState(false)
  const [objectError, setObjectError] = useState<string | null>(null)
  // Connections dropdown; kept across selections so graph-walking stays open.
  const [showConnections, setShowConnections] = useState(false)

  const fieldGraph = graphs[field] ?? {}
  const nodeIds = Object.keys(fieldGraph)
  const selectedNode = selectedId ? fieldGraph[selectedId] : undefined

  const mergeResult = (res: ObjectLinksResult) => {
    setGraphs((prev) => {
      const graph: FieldGraph = { ...(prev[res.field] ?? {}) }
      const neighborIds = res.links.map((l) => l.id)

      const src = graph[res.id] ?? { searched: false, neighbors: [] }
      graph[res.id] = {
        label: res.label,
        searched: true,
        neighbors: Array.from(new Set([...src.neighbors, ...neighborIds])),
      }

      for (const link of res.links) {
        const node = graph[link.id] ?? { searched: false, neighbors: [] }
        graph[link.id] = {
          ...node,
          label: link.label,
          neighbors: node.neighbors.includes(res.id) ? node.neighbors : [...node.neighbors, res.id],
        }
      }

      return { ...prev, [res.field]: graph }
    })
  }

  const loadObjectDetails = async (id: string) => {
    setObjectLoading(true)
    setObjectError(null)
    setSelectedObject(null)
    try {
      const response = await api.getObjects(collectionName, [id])
      if (!response.success) throw new Error(response.error || 'Failed to fetch object')
      const obj = (response.data ?? [])[0] ?? null
      setSelectedObject(obj)
      if (!obj) setObjectError(`Object "${id}" not found`)
    } catch (err) {
      setObjectError(err instanceof Error ? err.message : 'Failed to fetch object')
    } finally {
      setObjectLoading(false)
    }
  }

  const selectNode = (id: string) => {
    setSelectedId(id)
    loadObjectDetails(id)
  }

  const runSearch = async (rawId: string) => {
    setError(null)

    const id = rawId.trim()
    if (!id) {
      setError('Enter an object ID')
      return
    }
    if (!field) {
      setError('Select a dense field')
      return
    }

    setLoading(true)
    try {
      const response = await api.getObjectLinks(collectionName, id, field)
      if (!response.success) throw new Error(response.error || 'Failed to fetch links')
      mergeResult(response.data!)
      selectNode(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch links')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(idInput)
  }

  /** Canvas / chip click: select the node; expand it too if not searched yet. */
  const handleNodeClick = (id: string) => {
    if (fieldGraph[id]?.searched) {
      selectNode(id)
    } else {
      setIdInput(id)
      runSearch(id)
    }
  }

  const clearResults = () => {
    setGraphs((prev) => ({ ...prev, [field]: {} }))
    setError(null)
    setSelectedId(null)
    setSelectedObject(null)
    setObjectError(null)
  }

  if (denseFields.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 text-center text-slate-600 dark:text-slate-300">
        This collection has no dense fields — graph links are only available for dense fields.
      </div>
    )
  }

  const denseEntries = Object.entries(selectedObject?.vectors ?? {})
  const sparseEntries = Object.entries(selectedObject?.sparses ?? {})
  const multiEntries = Object.entries(selectedObject?.multi_vectors ?? {})
  const selectedFieldM = denseFields.find((f) => f.name === field)?.params?.M

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        Inspect the graph neighbors of an object in the HSNW graph: pick a dense field and an object ID to list its linked nodes.
      </p>

      {error && <Notification type="error" message={error} onDismiss={() => setError(null)} className="mb-6" />}

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Visualizer */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Explored
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Unexplored
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-800 dark:border-slate-100" />
                  Selected
                </span>
              </div>
              {nodeIds.length > 0 && (
                <button
                  onClick={clearResults}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border-none bg-white dark:bg-slate-700 border text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {nodeIds.length > 0 ? (
              <GraphCanvas
                key={field}
                graph={fieldGraph}
                selectedId={selectedId}
                onNodeClick={handleNodeClick}
                loading={loading}
              />
            ) : (
              <div className="h-140 flex items-center justify-center rounded-md bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-500 dark:text-slate-400">
                Search an ID to start building the graph
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            Note: the neighbours returned for a node depend on the <span className="font-medium">M</span> parameter
            {selectedFieldM != null ? ` (${selectedFieldM} for "${field}")` : ''} set at the time of collection creation.
          </p>
        </div>

        {/* Search console */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Field (dense) <span className="text-red-500">*</span>
                </label>
                <Select
                  value={field}
                  options={denseFields.map((f) => ({
                    value: f.name,
                    label: `${f.name} ${fieldDimension(f) ? ` (${fieldDimension(f)}d)` : ''}`,
                  }))}
                  onChange={setField}
                  disabled={loading}
                  placeholder="Select a dense field"
                  className="w-full"
                  triggerClassName="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Object ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  placeholder="e.g., obj_001"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Fetching...' : 'Get Neighbours'}
              </button>
            </form>
          </div>

          {/* Selected node details */}
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Selected Node</h2>
          {!selectedId ? (
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Click a node on the canvas to see its details
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedId}</span>
                  {/* {selectedNode?.searched && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      searched
                    </span>
                  )} */}
                </div>
                {/* <span className="text-xs text-slate-500 dark:text-slate-400">
                  label: {selectedNode?.label ?? '—'}
                </span> */}
              </div>

              <div className="space-y-3 text-sm overflow-y-auto pr-1">

                {/* Object details (get object by ID) */}
                {objectLoading && (
                  <div className="text-slate-600 dark:text-slate-300 text-sm py-2">Loading object details...</div>
                )}
                {objectError && <Notification type="error" message={objectError} compact />}
                {selectedObject && (
                  <>
                    {selectedObject.meta && Object.keys(selectedObject.meta).length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-24 shrink-0">Meta</span>
                        <pre className="text-slate-700 dark:text-slate-300 text-xs overflow-x-auto">
                          {JSON.stringify(selectedObject.meta, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedObject.filter && Object.keys(selectedObject.filter).length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-24 shrink-0">Filter</span>
                        <code className="text-slate-700 dark:text-slate-300 text-xs">
                          {JSON.stringify(selectedObject.filter)}
                        </code>
                      </div>
                    )}

                    {denseEntries.map(([name, vec]) => (
                      <div key={name} className="flex gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-24 shrink-0 truncate" title={name}>
                          {name} (vector)
                        </span>
                        <code className="text-slate-700 dark:text-slate-300 text-xs break-all">
                          {vectorPreview(vec, 8)}
                        </code>
                      </div>
                    ))}

                    {sparseEntries.map(([name, sp]) => (
                      <div key={name} className="flex gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-24 shrink-0 truncate" title={name}>
                          {name} (sparse)
                        </span>
                        <code className="text-slate-700 dark:text-slate-300 text-xs break-all">
                          {sp.indices.length} terms — idx {vectorPreview(sp.indices.map(Number), 6)} · val {vectorPreview(sp.values, 6)}
                        </code>
                      </div>
                    ))}

                    {multiEntries.map(([name, mv]) => (
                      <div key={name} className="flex gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-24 shrink-0 truncate" title={name}>
                          {name} (multi)
                        </span>
                        <code className="text-slate-700 dark:text-slate-300 text-xs break-all">
                          {mv.length} vectors{mv[0] ? ` × ${mv[0].length}d` : ''}
                          {mv[0] ? ` — first ${vectorPreview(mv[0], 6)}` : ''}
                        </code>
                      </div>
                    ))}
                  </>
                )}

                {/* Graph connections */}
                <div className="border border-slate-200 dark:border-slate-600 rounded-md">
                  <button
                    type="button"
                    onClick={() => setShowConnections((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors rounded-md"
                  >
                    <span>Connections ({selectedNode?.neighbors.length ?? 0})</span>
                    {showConnections ? <GoChevronDown className="w-4 h-4" /> : <GoChevronRight className="w-4 h-4" />}
                  </button>

                  {showConnections && (
                    <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <div className="flex flex-wrap gap-2">
                        {(selectedNode?.neighbors ?? []).map((nid) => (
                          <button
                            key={nid}
                            onClick={() => handleNodeClick(nid)}
                            disabled={loading}
                            title={`Select ${nid}`}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                          >
                            {nid}
                          </button>
                        ))}
                        {(selectedNode?.neighbors.length ?? 0) === 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">None known yet</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
