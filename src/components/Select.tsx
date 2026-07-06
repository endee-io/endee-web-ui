'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { GoChevronDown, GoCheck } from 'react-icons/go'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** Optional leading icon rendered inside the trigger. */
  icon?: React.ReactNode
  className?: string
  /** Optional header shown at the top of the dropdown. */
  header?: React.ReactNode
  /** Optional action rendered as the last item; clicking it closes the dropdown. */
  action?: {
    label: React.ReactNode
    onSelect: () => void
  }
}

export default function Select({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select…',
  icon,
  className = '',
  header,
  action,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value) ?? null

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // When opening, highlight the currently selected option.
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value)
      setActiveIndex(idx)
    }
  }, [open, options, value])

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined
    node?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function commit(index: number) {
    const opt = options[index]
    if (opt) {
      onChange(opt.value)
      setOpen(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) {
          setOpen(true)
        } else {
          setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) commit(activeIndex)
        else setOpen(true)
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="flex max-w-64 items-center gap-2 rounded-md  px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-slate-300 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className={`flex-1 truncate text-left ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <GoChevronDown
          className={`shrink-0 w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1 p-2 max-h-60 w-full min-w-56 overflow-auto rounded-md border border-border bg-background py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {header && (
            <li
              role="presentation"
              className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {header}
            </li>
          )}
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No options</li>
          )}
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isActive = i === activeIndex
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(i)}
                className={`flex cursor-pointer items-center justify-between font-medium gap-2 px-2 rounded my-1 py-2 text-sm ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <GoCheck className="shrink-0 w-4 h-4 text-blue-600 dark:text-blue-300" />}
              </li>
            )
          })}
          {action && (
            <li
              role="option"
              aria-selected={false}
              onClick={() => {
                setOpen(false)
                action.onSelect()
              }}
              className="mt-1 flex cursor-pointer items-center gap-2 border-t border-border px-2 py-3 text-sm font-light hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              {action.label}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
