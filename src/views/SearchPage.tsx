'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { GoArrowLeft, GoSearch, GoChevronDown, GoChevronRight } from 'react-icons/go'
import { api } from '../api/client'
import type {
  CollectionSummary,
  FieldQuery,
  SearchHit,
  SearchOutcome,
  SearchRequest,
} from '../api/client'
import {
  typeLabel,
  typeBadge,
  fieldDimension,
  sparseModel,
  parseFieldValue,
} from '../lib/collectionFields'
import Tooltip from '../components/Tooltip'
import Notification from '../components/Notification'

interface FieldDraft {
  enabled: boolean
  value: string
  sparseIndices: string
  sparseValues: string
  limit: string
  efSearch: string
}

const emptyDraft = (): FieldDraft => ({
  enabled: false,
  value: '',
  sparseIndices: '',
  sparseValues: '',
  limit: '10',
  efSearch: '',
})

export default function SearchPage() {
  const params = useParams()
  const collectionName = params?.collectionName as string
  const router = useRouter()

  const [collection, setCollection] = useState<CollectionSummary | null>(null)
  const [loadingCollection, setLoadingCollection] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({})
  const [filter, setFilter] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Rerank (RRF fusion) options
  const [rerankEnabled, setRerankEnabled] = useState(false)
  const [rerankLimit, setRerankLimit] = useState('10')
  const [rrfK, setRrfK] = useState('60')
  const [customWeights, setCustomWeights] = useState(false)
  const [weights, setWeights] = useState<Record<string, string>>({})

  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null)

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
        const initial: Record<string, FieldDraft> = {}
        const initialWeights: Record<string, string> = {}
        ;(response.data.fields ?? []).forEach((f, i) => {
          initial[f.name] = { ...emptyDraft(), enabled: i === 0 } // enable first field by default
          initialWeights[f.name] = ''
        })
        setDrafts(initial)
        setWeights(initialWeights)
      } else {
        setError(response.error || 'Failed to load collection')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection')
    } finally {
      setLoadingCollection(false)
    }
  }

  const updateDraft = (name: string, patch: Partial<FieldDraft>) =>
    setDrafts((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }))

  const enabledFields = fields.filter((f) => drafts[f.name]?.enabled)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOutcome(null)

    if (!collectionName) return

    try {
      if (enabledFields.length === 0) {
        throw new Error('Select at least one field to query')
      }

      const fieldQueries: Record<string, FieldQuery> = {}
      for (const field of enabledFields) {
        const draft = drafts[field.name]
        let query
        try {
          query = parseFieldValue(field, {
            value: draft.value,
            sparseIndices: draft.sparseIndices,
            sparseValues: draft.sparseValues,
          })
        } catch (err) {
          throw new Error(`Field "${field.name}": ${err instanceof Error ? err.message : 'invalid query'}`)
        }
        const q: FieldQuery = { query }
        const limit = parseInt(draft.limit)
        if (!isNaN(limit) && limit > 0) q.limit = limit
        if (draft.efSearch.trim()) {
          const ef = parseInt(draft.efSearch)
          if (!isNaN(ef) && ef > 0) q.ef_search = ef
        }
        fieldQueries[field.name] = q
      }

      const searchRequest: SearchRequest = { fields: fieldQueries }

      if (filter.trim()) {
        try {
          searchRequest.filter = JSON.parse(filter)
        } catch {
          throw new Error('Filter must be valid JSON (an array of conditions)')
        }
      }

      if (rerankEnabled) {
        if (enabledFields.length < 2) {
          throw new Error('Reranking needs at least two queried fields to fuse')
        }
        const rerank: NonNullable<SearchRequest['rerank']> = {}
        const limit = parseInt(rerankLimit)
        if (!isNaN(limit) && limit > 0) rerank.limit = limit
        const k = parseInt(rrfK)
        if (!isNaN(k) && k > 0) rerank.rrfK = k
        if (customWeights) {
          const fieldWeights: Record<string, number> = {}
          for (const field of enabledFields) {
            const w = parseFloat(weights[field.name])
            if (isNaN(w)) throw new Error(`Weight for "${field.name}" must be a number`)
            fieldWeights[field.name] = w
          }
          rerank.fieldWeights = fieldWeights
        }
        searchRequest.rerank = rerank
      }

      setSearching(true)
      const response = await api.search(collectionName, searchRequest)
      if (!response.success) {
        throw new Error(response.error || 'Search failed')
      }
      setOutcome(response.data!)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
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
          onClick={() => router.push(`/collections/${collectionName}`)}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to {collectionName}
        </button>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Search Objects</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Query any subset of fields. Each field returns its own ranked list — enable reranking to fuse them.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Per-field query builders */}
          <div className="space-y-3">
            {fields.map((field) => {
              const draft = drafts[field.name] ?? emptyDraft()
              return (
                <div
                  key={field.name}
                  className={`rounded-md border p-4 transition-colors ${
                    draft.enabled
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/10'
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(e) => updateDraft(field.name, { enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                      disabled={searching}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-100">{field.name}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge(field.type)}`}>
                      {typeLabel(field.type)}
                    </span>
                  </label>

                  {draft.enabled && (
                    <div className="space-y-3 pl-6">
                      {field.type === 'sparse' ? (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                              Sparse Indices
                            </label>
                            <input
                              type="text"
                              value={draft.sparseIndices}
                              onChange={(e) => updateDraft(field.name, { sparseIndices: e.target.value })}
                              placeholder="e.g., 10, 50, 100"
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              disabled={searching}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Model: {sparseModel(field) ?? 'default'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                              Sparse Values
                            </label>
                            <input
                              type="text"
                              value={draft.sparseValues}
                              onChange={(e) => updateDraft(field.name, { sparseValues: e.target.value })}
                              placeholder="e.g., 0.8, 0.5, 0.3"
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              disabled={searching}
                            />
                          </div>
                        </div>
                      ) : field.type === 'multi_vector' ? (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                            Query (multi-vector)
                          </label>
                          <textarea
                            value={draft.value}
                            onChange={(e) => updateDraft(field.name, { value: e.target.value })}
                            placeholder={`[[0.1, 0.2, ...], [0.3, 0.4, ...]]  (each vector ${fieldDimension(field) ?? 'n'}d)`}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            disabled={searching}
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            JSON array of vectors, or one comma-separated vector per line
                          </p>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                            Query Vector
                          </label>
                          <input
                            type="text"
                            value={draft.value}
                            onChange={(e) => updateDraft(field.name, { value: e.target.value })}
                            placeholder={`e.g., 0.1, 0.2, 0.3, ... (${fieldDimension(field) ?? 'n'} dimensions)`}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            disabled={searching}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Limit</label>
                            <Tooltip tip="Max hits to return for this field (top-k)." />
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={draft.limit}
                            onChange={(e) => updateDraft(field.name, { limit: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={searching}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">ef_search</label>
                            <Tooltip tip="HNSW search depth for this field. Higher = more accurate, slower." />
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={draft.efSearch}
                            onChange={(e) => updateDraft(field.name, { efSearch: e.target.value })}
                            placeholder="auto"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={searching}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Filter Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Filters (Optional)
            </label>
            <textarea
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder='e.g., [{"category": {"$eq":"tech"}}, {"year": {"$in": [2020,2024]}}]'
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              disabled={searching}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              JSON array of conditions ($eq, $in, $range, $gt, $gte, $lt, $lte)
            </p>
          </div>

          {/* Rerank / fusion */}
          <div className="border border-slate-200 dark:border-slate-600 rounded-md">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors rounded-md"
            >
              <span>Reranking &amp; Fusion (RRF)</span>
              {showAdvanced ? <GoChevronDown className="w-4 h-4" /> : <GoChevronRight className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-600 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rerankEnabled}
                    onChange={(e) => setRerankEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                    disabled={searching}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    Fuse the per-field results into a single ranked list
                  </span>
                </label>

                {rerankEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                          Fused limit
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={rerankLimit}
                          onChange={(e) => setRerankLimit(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          disabled={searching}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">rrfK</label>
                          <Tooltip tip="RRF rank constant (default 60). Larger flattens top ranks." />
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={rrfK}
                          onChange={(e) => setRrfK(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          disabled={searching}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customWeights}
                        onChange={(e) => setCustomWeights(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                        disabled={searching}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        Custom field weights (must sum to 1.0)
                      </span>
                    </label>

                    {customWeights && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {enabledFields.map((field) => (
                          <div key={field.name}>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                              {field.name}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={weights[field.name] ?? ''}
                              onChange={(e) => setWeights((w) => ({ ...w, [field.name]: e.target.value }))}
                              placeholder="e.g., 0.5"
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              disabled={searching}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <Notification type="error" message={error} />}

          <button
            type="submit"
            disabled={searching}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <GoSearch className="w-4 h-4" />
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Results */}
      {outcome !== null && <SearchResults outcome={outcome} />}
    </div>
  )
}

// ── results ──────────────────────────────────────────────────────────────────

function SearchResults({ outcome }: { outcome: SearchOutcome }) {
  if (outcome.fused) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          Fused Results ({outcome.results.length})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Single list fused across fields with Reciprocal Rank Fusion (similarity = RRF score).
        </p>
        <HitList hits={outcome.results} />
      </div>
    )
  }

  const fieldNames = Object.keys(outcome.results)
  return (
    <div className="mb-6 space-y-6">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        One ranked list per field. Similarity is in each field&apos;s own scale — not comparable across fields.
      </p>
      {fieldNames.map((name) => (
        <div key={name}>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {name} ({outcome.results[name].length})
          </h2>
          <HitList hits={outcome.results[name]} />
        </div>
      ))}
    </div>
  )
}

function HitList({ hits }: { hits: SearchHit[] }) {
  if (hits.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 text-center text-slate-600 dark:text-slate-300">
        No results
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {hits.map((hit, index) => (
        <div
          key={`${hit.id}-${index}`}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">#{index + 1}</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{hit.id}</span>
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
              sim: {hit.similarity.toFixed(4)}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            {hit.meta && Object.keys(hit.meta).length > 0 && (
              <div className="flex gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-16 shrink-0">Meta</span>
                <pre className="text-slate-700 dark:text-slate-300 text-xs overflow-x-auto">
                  {JSON.stringify(hit.meta, null, 2)}
                </pre>
              </div>
            )}
            {hit.filter && Object.keys(hit.filter).length > 0 && (
              <div className="flex gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-16 shrink-0">Filter</span>
                <code className="text-slate-700 dark:text-slate-300 text-xs">
                  {JSON.stringify(hit.filter)}
                </code>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
