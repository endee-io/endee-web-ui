'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GoArrowLeft, GoPlus, GoTrash } from 'react-icons/go'
import { api } from '../api/client'
import type { CollectionSummary, FieldDefinition, ObjectInput, FieldValue } from '../api/client'
import { typeLabel, typeBadge, fieldDimension, sparseModel, parseFieldValue } from '../lib/collectionFields'
import Notification from '../components/Notification'
import { useDbRoute } from '../lib/routes'

interface FieldInput {
  value: string
  sparseIndices: string
  sparseValues: string
}

interface ObjectDraft {
  id: string
  meta: string
  filter: string
  fields: Record<string, FieldInput>
}

const emptyFieldInput = (): FieldInput => ({ value: '', sparseIndices: '', sparseValues: '' })

function emptyObject(fields: FieldDefinition[]): ObjectDraft {
  const f: Record<string, FieldInput> = {}
  fields.forEach((field) => { f[field.name] = emptyFieldInput() })
  return { id: '', meta: '', filter: '', fields: f }
}

/** True if the user entered something for this field. */
function hasFieldInput(field: FieldDefinition, input: FieldInput): boolean {
  if (field.type === 'sparse') return !!(input.sparseIndices.trim() || input.sparseValues.trim())
  return !!input.value.trim()
}

export default function VectorInsertPage() {
  const params = useParams()
  const collectionName = params?.collectionName as string
  const router = useRouter()
  const { path } = useDbRoute()

  const [collection, setCollection] = useState<CollectionSummary | null>(null)
  const [loadingCollection, setLoadingCollection] = useState(true)
  const [objects, setObjects] = useState<ObjectDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fields = collection?.fields ?? []

  useEffect(() => {
    if (collectionName) loadCollection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName])

  const loadCollection = async () => {
    if (!collectionName) return
    setLoadingCollection(true)
    try {
      const response = await api.getCollection(collectionName)
      if (response.success && response.data) {
        setCollection(response.data)
        setObjects([emptyObject(response.data.fields ?? [])])
      } else {
        setError(response.error || 'Failed to load collection')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection')
    } finally {
      setLoadingCollection(false)
    }
  }

  const addObject = () => setObjects((prev) => [...prev, emptyObject(fields)])
  const removeObject = (i: number) => setObjects((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const updateObject = (i: number, patch: Partial<Pick<ObjectDraft, 'id' | 'meta' | 'filter'>>) =>
    setObjects((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))

  const updateField = (i: number, fieldName: string, patch: Partial<FieldInput>) =>
    setObjects((prev) =>
      prev.map((o, idx) =>
        idx === i
          ? { ...o, fields: { ...o.fields, [fieldName]: { ...o.fields[fieldName], ...patch } } }
          : o
      )
    )

  const buildObject = (draft: ObjectDraft): ObjectInput => {
    if (!draft.id.trim()) throw new Error('Object ID is required')
    const obj: ObjectInput = { id: draft.id.trim() }

    const fieldValues: Record<string, FieldValue> = {}
    for (const field of fields) {
      const input = draft.fields[field.name]
      if (!input || !hasFieldInput(field, input)) continue
      try {
        fieldValues[field.name] = parseFieldValue(field, input)
      } catch (err) {
        throw new Error(`Field "${field.name}": ${err instanceof Error ? err.message : 'invalid value'}`)
      }
    }
    if (Object.keys(fieldValues).length === 0) {
      throw new Error(`Object "${draft.id}" has no field values`)
    }
    obj.fields = fieldValues

    if (draft.meta.trim()) {
      try { obj.meta = JSON.parse(draft.meta) } catch { throw new Error(`Object "${draft.id}": metadata must be valid JSON`) }
    }
    if (draft.filter.trim()) {
      try { obj.filter = JSON.parse(draft.filter) } catch { throw new Error(`Object "${draft.id}": filter must be valid JSON`) }
    }
    return obj
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!collectionName) return

    try {
      const drafts = objects.filter((o) => o.id.trim() || fields.some((f) => hasFieldInput(f, o.fields[f.name])))
      if (drafts.length === 0) throw new Error('At least one object is required')

      const payload = drafts.map(buildObject)

      setSubmitting(true)
      const response = await api.upsertObjects(collectionName, payload)
      if (!response.success) throw new Error(response.error || 'Failed to insert objects')

      setSuccess(`Successfully upserted ${response.data?.upserted ?? payload.length} object(s)`)
      setObjects([emptyObject(fields)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to insert objects')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingCollection) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading collection information...</div>
        </div>
      </div>
    )
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
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Insert Objects</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Upsert objects into &quot;{collectionName}&quot;. Each object may set values for any subset of fields.
        </p>
      </div>

      {success && <Notification type="success" message={success} onDismiss={() => setSuccess(null)} className="mb-6" />}
      {error && <Notification type="error" message={error} onDismiss={() => setError(null)} className="mb-6" />}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {objects.map((obj, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Object #{index + 1}</h3>
                {objects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObject(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                  >
                    <GoTrash className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Object ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={obj.id}
                    onChange={(e) => updateObject(index, { id: e.target.value })}
                    placeholder="e.g., obj_001"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Per-field inputs */}
                {fields.map((field) => {
                  const input = obj.fields[field.name] ?? emptyFieldInput()
                  return (
                    <div key={field.name} className="rounded-md border border-slate-200 dark:border-slate-600 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{field.name}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge(field.type)}`}>
                          {typeLabel(field.type)}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">optional</span>
                      </div>

                      {field.type === 'sparse' ? (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Indices</label>
                            <input
                              type="text"
                              value={input.sparseIndices}
                              onChange={(e) => updateField(index, field.name, { sparseIndices: e.target.value })}
                              placeholder="e.g., 10, 50, 100"
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              disabled={submitting}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Model: {sparseModel(field) ?? 'default'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Values</label>
                            <input
                              type="text"
                              value={input.sparseValues}
                              onChange={(e) => updateField(index, field.name, { sparseValues: e.target.value })}
                              placeholder="e.g., 0.8, 0.5, 0.3"
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      ) : field.type === 'multi_vector' ? (
                        <textarea
                          value={input.value}
                          onChange={(e) => updateField(index, field.name, { value: e.target.value })}
                          placeholder={`[[0.1, 0.2, ...], [0.3, 0.4, ...]]  (each vector ${fieldDimension(field) ?? 'n'}d)`}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          disabled={submitting}
                        />
                      ) : (
                        <input
                          type="text"
                          value={input.value}
                          onChange={(e) => updateField(index, field.name, { value: e.target.value })}
                          placeholder={`e.g., 0.1, 0.2, 0.3, ... (${fieldDimension(field) ?? 'n'} dimensions)`}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          disabled={submitting}
                        />
                      )}
                    </div>
                  )
                })}

                {/* Metadata */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Metadata (optional)</label>
                  <textarea
                    value={obj.meta}
                    onChange={(e) => updateObject(index, { meta: e.target.value })}
                    placeholder='e.g., {"name": "Wireless Headphones", "price": 99}'
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    disabled={submitting}
                  />
                </div>

                {/* Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Filter tags (optional)</label>
                  <textarea
                    value={obj.filter}
                    onChange={(e) => updateObject(index, { filter: e.target.value })}
                    placeholder='e.g., {"category": "electronics"}'
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addObject}
          disabled={submitting}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50"
        >
          <GoPlus className="w-5 h-5" />
          Add Another Object
        </button>

        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Inserting...' : `Insert ${objects.length} Object${objects.length > 1 ? 's' : ''}`}
          </button>
          <button
            type="button"
            onClick={() => router.push(path(`collections/`))}
            disabled={submitting}
            className="px-6 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
