'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoArrowLeft, GoPlus, GoTrash, GoChevronDown, GoChevronRight } from 'react-icons/go'
import { api, PRECISIONS, SPACE_TYPES, formatSpaceType } from '../api/client'
import type { FieldDefinition, FieldType, Precision, SpaceType } from '../api/client'
import { typeLabel, typeBadge } from '../lib/collectionFields'
import Tooltip from '../components/Tooltip'
import Notification from '../components/Notification'
import { useDbRoute } from '../lib/routes'

interface FieldRow {
  name: string
  type: FieldType
  dimension: string
  spaceType: SpaceType
  precision: Precision
  pooling: 'mean' | 'max'
  m: string
  efCon: string
  sparseModel: string
  showAdvanced: boolean
}

const FIELD_TYPES: FieldType[] = ['vector', 'sparse', 'multi_vector']
const namePattern = /^[a-zA-Z0-9_]{0,48}$/
const isNameValid = (n: string) => /^[a-zA-Z0-9_]{1,48}$/.test(n)

const newField = (): FieldRow => ({
  name: '',
  type: 'vector',
  dimension: '',
  spaceType: 'cosine',
  precision: 'int8',
  pooling: 'mean',
  m: '',
  efCon: '',
  sparseModel: 'default',
  showAdvanced: false,
})

export default function CreateCollectionPage() {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [fields, setFields] = useState<FieldRow[]>([newField()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { path } = useDbRoute()

  const nameValid = isNameValid(name)

  const addField = () => setFields((prev) => [...prev, newField()])
  const removeField = (i: number) =>
    setFields((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  const updateField = (i: number, patch: Partial<FieldRow>) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))

  const buildFields = (): FieldDefinition[] => {
    const seen = new Set<string>()
    return fields.map((row, idx) => {
      const fname = row.name.trim()
      if (!fname) throw new Error(`Field #${idx + 1}: name is required`)
      if (!isNameValid(fname)) {
        throw new Error(`Field "${fname}": only alphanumeric characters and underscores (max 48)`)
      }
      if (seen.has(fname)) throw new Error(`Duplicate field name: ${fname}`)
      seen.add(fname)

      if (row.type === 'sparse') {
        return { name: fname, type: 'sparse', sparse_model: row.sparseModel }
      }

      const dim = parseInt(row.dimension)
      if (!row.dimension || isNaN(dim) || dim <= 0) {
        throw new Error(`Field "${fname}": dimension must be a positive number`)
      }
      const params: Record<string, unknown> = {
        dimension: dim,
        space_type: row.spaceType,
        precision: row.precision,
      }
      if (row.type === 'multi_vector') params.pooling = row.pooling
      if (row.showAdvanced) {
        if (row.m.trim()) {
          const m = parseInt(row.m)
          if (isNaN(m) || m < 4 || m > 64) throw new Error(`Field "${fname}": M must be between 4 and 64`)
          params.M = m
        }
        if (row.efCon.trim()) {
          const ef = parseInt(row.efCon)
          if (isNaN(ef) || ef < 64 || ef > 512) throw new Error(`Field "${fname}": ef_con must be between 64 and 512`)
          params.ef_con = ef
        }
      }
      return { name: fname, type: row.type, params }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Collection name is required')
      return
    }

    let builtFields: FieldDefinition[]
    try {
      builtFields = buildFields()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid field configuration')
      return
    }

    setSubmitting(true)
    try {
      const response = await api.createCollection({ name: name.trim(), fields: builtFields })
      if (!response.success) {
        throw new Error(response.error || 'Failed to create collection')
      }
      router.push(path('collections'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(path('collections'))}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to Collections
        </button>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Create a new collection</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          A collection holds objects with one or more named, typed fields (dense, sparse, or multi-vector).
        </p>
      </div>

      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Collection Name */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Collection Name <span className="text-red-500">*</span>
              </label>
              <Tooltip tip="A unique identifier for your collection. Only alphanumeric characters and `_` allowed." />
            </div>
            <input
              id="name"
              value={name}
              onChange={(e) => {
                const val = e.target.value
                if (namePattern.test(val)) {
                  setName(val)
                  setNameError(null)
                } else if (val.length > 48) {
                  setNameError('Max 48 characters allowed.')
                } else {
                  setNameError('Only alphanumeric characters and underscores are allowed.')
                }
              }}
              placeholder="e.g., product_embeddings"
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${nameError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
              disabled={submitting}
            />
            {nameError ? (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">{nameError}</p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alphanumeric characters and underscores only. Max 48 characters.</p>
            )}
          </div>

          {/* Fields */}
          <div className="border-t border-slate-200 dark:border-slate-600 pt-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Fields</h2>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="rounded-md border border-slate-200 dark:border-slate-600 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-100">Field #{index + 1}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge(field.type)}`}>
                        {typeLabel(field.type)}
                      </span>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        disabled={submitting}
                      >
                        <GoTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Field name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Field Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        placeholder="e.g., embedding"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={submitting}
                      />
                    </div>

                    {/* Field type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={submitting}
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>{typeLabel(t)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sparse: model only */}
                  {field.type === 'sparse' ? (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Sparse Model <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={field.sparseModel}
                        onChange={(e) => updateField(index, { sparseModel: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={submitting}
                      >
                        <option value="default">Default</option>
                        <option value="endee_bm25">Endee BM25</option>
                      </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        The sparse vector model. Bring your own or use Endee BM25.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Vector / multi-vector params */}
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                            Dimension <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={field.dimension}
                            onChange={(e) => updateField(index, { dimension: e.target.value })}
                            placeholder="e.g., 768"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Space Type</label>
                          <select
                            value={field.spaceType}
                            onChange={(e) => updateField(index, { spaceType: e.target.value as SpaceType })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                          >
                            {SPACE_TYPES.map((s) => (
                              <option key={s} value={s}>{formatSpaceType(s)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Precision</label>
                          <select
                            value={field.precision}
                            onChange={(e) => updateField(index, { precision: e.target.value as Precision })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                            disabled={submitting}
                          >
                            {PRECISIONS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Pooling (multi-vector only) */}
                      {field.type === 'multi_vector' && (
                        <div className="mt-4 md:w-1/3">
                          <div className="flex items-center gap-2 mb-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                              Pooling <span className="text-red-500">*</span>
                            </label>
                            <Tooltip tip="How the multiple vectors per object are pooled (mean or max)." />
                          </div>
                          <select
                            value={field.pooling}
                            onChange={(e) => updateField(index, { pooling: e.target.value as 'mean' | 'max' })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                          >
                            <option value="mean">Mean</option>
                            <option value="max">Max</option>
                          </select>
                        </div>
                      )}

                      {/* Per-field advanced HNSW params */}
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => updateField(index, { showAdvanced: !field.showAdvanced })}
                          className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          {field.showAdvanced ? <GoChevronDown className="w-4 h-4" /> : <GoChevronRight className="w-4 h-4" />}
                          Advanced (HNSW)
                        </button>
                        {field.showAdvanced && (
                          <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">M</label>
                                <Tooltip tip="HNSW connections per node. Range 4-64. Higher = better recall, more memory." />
                              </div>
                              <input
                                type="number"
                                min="4"
                                max="64"
                                value={field.m}
                                onChange={(e) => updateField(index, { m: e.target.value })}
                                placeholder="default: 16"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={submitting}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">ef_con</label>
                                <Tooltip tip="Build-time search depth. Range 64-512. Higher = better quality, slower build." />
                              </div>
                              <input
                                type="number"
                                min="64"
                                max="512"
                                value={field.efCon}
                                onChange={(e) => updateField(index, { efCon: e.target.value })}
                                placeholder="default: 128"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={submitting}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addField}
              disabled={submitting}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50"
            >
              <GoPlus className="w-5 h-5" />
              Add Another Field
            </button>
          </div>

          {error && <Notification type="error" message={error} />}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-600">
            <button
              type="submit"
              disabled={submitting || !nameValid}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Collection'}
            </button>
            <button
              type="button"
              onClick={() => router.push(path('collections'))}
              disabled={submitting}
              className="px-6 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
