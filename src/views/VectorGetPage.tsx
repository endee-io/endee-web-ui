'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoArrowLeft, GoSearch, GoTrash, GoPencil } from 'react-icons/go'
import { api } from '../api/client'
import type { FullObject } from '../api/client'
import Notification from '../components/Notification'
import { useDbRoute } from '../lib/routes'
import { BarLoader } from 'react-spinners'

/** Render a numeric vector, truncated. */
function vectorPreview(vec: number[], max = 10): string {
  const head = vec.slice(0, max).map((v) => v.toFixed(4)).join(', ')
  return `[${head}${vec.length > max ? `, … (${vec.length})` : ''}]`
}

export default function VectorGetPage() {
  const params = useParams()
  const collectionName = params?.collectionName as string
  const router = useRouter()
  const { path } = useDbRoute()

  const [idsInput, setIdsInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [objects, setObjects] = useState<FullObject[] | null>(null)

  // Update filter modal state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterInput, setFilterInput] = useState('')
  const [updatingFilter, setUpdatingFilter] = useState(false)
  const [updateFilterError, setUpdateFilterError] = useState<string | null>(null)

  const parseIds = (raw: string): string[] =>
    raw.split(',').map((s) => s.trim()).filter(Boolean)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setObjects(null)
    if (!collectionName) return

    const ids = parseIds(idsInput)
    if (ids.length === 0) {
      setError('Enter at least one object ID')
      return
    }

    setSearching(true)
    try {
      const response = await api.getObjects(collectionName, ids)
      if (!response.success) throw new Error(response.error || 'Failed to fetch objects')
      setObjects(response.data || [])
      if ((response.data || []).length === 0) {
        setError('No objects found for the given ID(s)')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch objects')
    } finally {
      setSearching(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!collectionName) return
    setDeletingId(id)
    setError(null)
    try {
      const response = await api.deleteObject(collectionName, id)
      if (!response.success) throw new Error(response.error || 'Failed to delete object')
      setObjects((prev) => (prev ? prev.filter((o) => o.id !== id) : prev))
      setSuccess(`Object "${id}" deleted successfully`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete object')
    } finally {
      setDeletingId(null)
    }
  }

  const openUpdateFilterModal = (obj: FullObject) => {
    setEditingId(obj.id)
    setFilterInput(obj.filter && Object.keys(obj.filter).length ? JSON.stringify(obj.filter, null, 2) : '{}')
    setUpdateFilterError(null)
  }

  const handleUpdateFilter = async () => {
    if (!collectionName || !editingId) return
    setUpdatingFilter(true)
    setUpdateFilterError(null)
    try {
      const parsedFilter = JSON.parse(filterInput)
      const response = await api.updateFilters(collectionName, [{ id: editingId, filter: parsedFilter }])
      if (!response.success) throw new Error(response.error || 'Failed to update filter')

      // Reflect the change locally.
      setObjects((prev) => prev ? prev.map((o) => (o.id === editingId ? { ...o, filter: parsedFilter } : o)) : prev)
      setSuccess(`Filter updated for object "${editingId}"`)
      setEditingId(null)
    } catch (err) {
      if (err instanceof SyntaxError) setUpdateFilterError('Invalid JSON format')
      else setUpdateFilterError(err instanceof Error ? err.message : 'Failed to update filter')
    } finally {
      setUpdatingFilter(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(path(`collections/`))}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to {collectionName}
        </button>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Get &amp; Delete Objects</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Retrieve, update filters on, or delete objects in &quot;{collectionName}&quot; by ID.
        </p>
      </div>

      {success && <Notification type="success" message={success} onDismiss={() => setSuccess(null)} className="mb-6" />}
      {error && <Notification type="error" message={error} onDismiss={() => setError(null)} className="mb-6" />}

      {/* Get form */}
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Get Objects by ID</h3>
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Object ID(s) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={idsInput}
              onChange={(e) => setIdsInput(e.target.value)}
              placeholder="e.g., obj_001, obj_002"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={searching}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comma-separate to fetch multiple objects.</p>
          </div>

          <button
            type="submit"
            disabled={searching}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <GoSearch className="w-4 h-4" />
            {searching ? 'Fetching...' : 'Get Objects'}
          </button>
        </form>
      </div>

      {/* Results */}
      {objects && objects.length > 0 && (
        <div className="space-y-4">
          {objects.map((obj) => {
            const denseEntries = Object.entries(obj.vectors ?? {})
            const sparseEntries = Object.entries(obj.sparses ?? {})
            const multiEntries = Object.entries(obj.multi_vectors ?? {})
            return (
              <div
                key={obj.id}
                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-200 dark:border-slate-600">
                  <div className="flex gap-4">
                    <span className="font-medium text-slate-500 dark:text-slate-400 uppercase shrink-0">ID</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{obj.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openUpdateFilterModal(obj)}
                      disabled={deletingId === obj.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <GoPencil className="w-4 h-4" />
                      Update Filter
                    </button>
                    <button
                      onClick={() => handleDelete(obj.id)}
                      disabled={deletingId === obj.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-red-600 text-red-600 rounded-md hover:bg-red-500 hover:text-white transition-colors disabled:opacity-60"
                    >
                      <GoTrash className="w-4 h-4" />
                      {deletingId === obj.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 text-sm">
                  {obj.meta && Object.keys(obj.meta).length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">Meta</span>
                      <pre className="text-slate-700 dark:text-slate-300 text-xs overflow-x-auto">
                        {JSON.stringify(obj.meta, null, 2)}
                      </pre>
                    </div>
                  )}

                  {obj.filter && Object.keys(obj.filter).length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">Filter</span>
                      <code className="text-slate-700 dark:text-slate-300 text-xs">{JSON.stringify(obj.filter)}</code>
                    </div>
                  )}

                  {/* Dense vector fields */}
                  {denseEntries.map(([name, vec]) => (
                    <div key={name} className="flex gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0 truncate" title={name}>
                        {name} (vector)
                      </span>
                      <code className="text-slate-700 dark:text-slate-300 text-xs break-all">{vectorPreview(vec)}</code>
                    </div>
                  ))}

                  {/* Sparse fields */}
                  {sparseEntries.map(([name, sp]) => (
                    <div key={name} className="flex gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0 truncate" title={name}>
                        {name} (sparse)
                      </span>
                      <code className="text-slate-700 dark:text-slate-300 text-xs break-all">
                        {sp.indices.length} terms — idx {vectorPreview(sp.indices.map(Number), 8)} · val {vectorPreview(sp.values, 8)}
                      </code>
                    </div>
                  ))}

                  {/* Multi-vector fields */}
                  {multiEntries.map(([name, mv]) => (
                    <div key={name} className="flex gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0 truncate" title={name}>
                        {name} (multi)
                      </span>
                      <code className="text-slate-700 dark:text-slate-300 text-xs break-all">
                        {mv.length} vectors{mv[0] ? ` × ${mv[0].length}d` : ''}
                        {mv[0] ? ` — first ${vectorPreview(mv[0], 8)}` : ''}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Update Filter Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Update Filter</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Update filter tags for object: <span className="font-medium text-slate-800 dark:text-slate-200">{editingId}</span>
            </p>

            <div className="space-y-4">
              {updateFilterError && <Notification type="error" message={updateFilterError} compact />}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filter (JSON)</label>
                <textarea
                  value={filterInput}
                  onChange={(e) => setFilterInput(e.target.value)}
                  placeholder='{"category": "electronics"}'
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              {updatingFilter ? (
                <BarLoader color="#155dfc" />
              ) : (
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateFilter}
                    disabled={!filterInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
