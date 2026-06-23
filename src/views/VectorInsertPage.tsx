import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GoArrowLeft, GoPlus, GoTrash } from 'react-icons/go'
import { api } from '../api/client'
import type { IndexDescription, VectorItem } from 'endee'
import Notification from '../components/Notification'

interface VectorInput {
  id: string
  vector: string
  sparse_indices: string
  sparse_values: string
  meta: string
  filter: string
}

export default function VectorInsertPage() {
  const { indexName } = useParams<{ indexName: string }>()
  const navigate = useNavigate()
  const [indexInfo, setIndexInfo] = useState<IndexDescription | null>(null)
  const [loadingIndex, setLoadingIndex] = useState(true)
  const [vectors, setVectors] = useState<VectorInput[]>([
    { id: '', vector: '', sparse_indices: '', sparse_values: '', meta: '', filter : '' }
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const isHybrid = indexInfo?.isHybrid;

  useEffect(() => {
    if (indexName) {
      loadIndexInfo()
    }
  }, [indexName])

  const loadIndexInfo = async () => {
    if (!indexName) return
    setLoadingIndex(true)
    try {
      const response = await api.getIndexInfo(indexName)
      if (response.success && response.data) {
        setIndexInfo(response.data)
      }
    } catch (err) {
      console.error('Failed to load index info:', err)
    } finally {
      setLoadingIndex(false)
    }
  }

  const addVector = () => {
    setVectors([...vectors, { id: '', vector: '', sparse_indices: '', sparse_values: '', meta: '', filter: '' }])
  }

  const removeVector = (index: number) => {
    if (vectors.length > 1) {
      setVectors(vectors.filter((_, i) => i !== index))
    }
  }

  const updateVector = (index: number, field: keyof VectorInput, value: string) => {
    const updated = [...vectors]
    updated[index][field] = value
    setVectors(updated)
  }

  const parseVector = (input: VectorInput): VectorItem | null => {
    try {
      if (!input.id.trim()) {
        throw new Error('Vector ID is required')
      }

      const vectorArray = JSON.parse(`[${input.vector}]`)
      if (!Array.isArray(vectorArray) || vectorArray.length === 0) {
        throw new Error('Vector must be a non-empty array of numbers')
      }

      const result: VectorItem = {
        id: input.id.trim(),
        vector: vectorArray,
      }

      // Only parse sparse fields for hybrid indexes
      if (isHybrid) {
        if (input.sparse_indices.trim()) {
          result.sparseIndices = JSON.parse(`[${input.sparse_indices}]`)
        }

        if (input.sparse_values.trim()) {
          result.sparseValues = JSON.parse(`[${input.sparse_values}]`)
        }

        // Validate sparse arrays have same length
        if (result.sparseIndices && result.sparseValues) {
          if (result.sparseIndices.length !== result.sparseValues.length) {
            throw new Error('Sparse indices and values must have the same length')
          }
        } else if (result.sparseIndices || result.sparseValues) {
          throw new Error('Both sparse indices and sparse values must be provided together')
        }
      }

      if (input.meta.trim()) {
        result.meta = JSON.parse(input.meta)
      }

      if (input.filter.trim()) {
        // Validate it's valid JSON, but pass as string
        const parsedFilter = JSON.parse(input.filter)
        result.filter = parsedFilter;
      }

      return result
    } catch (err) {
      throw new Error(`Invalid vector data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!indexName) return

    try {
      // Filter out completely empty vectors before parsing
      const nonEmptyVectors = vectors.filter(v => v.id.trim() || v.vector.trim())

      if (nonEmptyVectors.length === 0) {
        throw new Error('At least one vector is required')
      }

      const parsedVectors: VectorItem[] = []
      for (let i = 0; i < nonEmptyVectors.length; i++) {
        const parsed = parseVector(nonEmptyVectors[i])
        if (parsed) {
          parsedVectors.push(parsed)
        }
      }

      if (parsedVectors.length === 0) {
        throw new Error('At least one valid vector is required')
      }

      setSubmitting(true)
      const response = await api.insertVectors(indexName, parsedVectors)

      if (!response.success) {
        throw new Error(response.error || 'Failed to insert vectors')
      }

      setSuccess(`Successfully inserted ${parsedVectors.length} vector(s)`)
      setVectors([{ id: '', vector: '', sparse_indices: '', sparse_values: '', meta: '', filter: '' }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to insert vectors')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingIndex) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading index information...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/indexes/${indexName}`)}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to {indexName}
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Insert Vectors</h1>
          {isHybrid && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
              Hybrid Index
            </span>
          )}
        </div>
        {/* <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Add new {isHybrid ? 'hybrid (dense + sparse)' : 'dense'} vectors to "{indexName}"
        </p> */}
      </div>

      {/* Success Message */}
      {success && (
        <Notification type="success" message={success} onDismiss={() => setSuccess(null)} className="mb-6" />
      )}

      {/* Error Message */}
      {error && (
        <Notification type="error" message={error} onDismiss={() => setError(null)} className="mb-6" />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {vectors.map((vector, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Vector #{index + 1}</h3>
                {vectors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVector(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                  >
                    <GoTrash className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Basic Fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Vector ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vector.id}
                      onChange={(e) => updateVector(index, 'id', e.target.value)}
                      placeholder="e.g., vec_001"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Dense Vector <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vector.vector}
                      onChange={(e) => updateVector(index, 'vector', e.target.value)}
                      placeholder={`e.g., 0.1, 0.2, 0.3, ... (${indexInfo?.dimension || 'n'} dimensions)`}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submitting}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Comma-separated numbers ({indexInfo?.dimension} dimensions)
                    </p>
                  </div>
                </div>

                {/* Sparse Fields - Only shown for hybrid indexes */}
                {isHybrid && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                    <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-3">
                      Sparse Vector (Hybrid Index)
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                          Sparse Indices
                        </label>
                        <input
                          type="text"
                          value={vector.sparse_indices}
                          onChange={(e) => updateVector(index, 'sparse_indices', e.target.value)}
                          placeholder="e.g., 10, 50, 100, 500"
                          className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={submitting}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          With respect to your sparse model {indexInfo?.sparseModel}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                          Sparse Values
                        </label>
                        <input
                          type="text"
                          value={vector.sparse_values}
                          onChange={(e) => updateVector(index, 'sparse_values', e.target.value)}
                          placeholder="e.g., 0.8, 0.5, 0.3, 0.1"
                          className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={submitting}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Values at corresponding indices
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Metadata (optional)
                  </label>
                  <textarea
                    value={vector.meta}
                    onChange={(e) => updateVector(index, 'meta', e.target.value)}
                    placeholder='e.g., {"text": "document content"}'
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    disabled={submitting}
                  />
                </div>
                {/* Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Filters (optional)
                  </label>
                  <textarea
                    value={vector.filter}
                    onChange={(e) => updateVector(index, 'filter', e.target.value)}
                    placeholder='e.g., {"category": "tech", "source": "wiki"}'
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add More Button */}
        <button
          type="button"
          onClick={addVector}
          disabled={submitting}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50"
        >
          <GoPlus className="w-5 h-5" />
          Add Another Vector
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Inserting...' : `Insert ${vectors.length} Vector${vectors.length > 1 ? 's' : ''}`}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/indexes/${indexName}`)}
            disabled={submitting}
            className="px-6 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Help Card */}
      <div className="mt-6 bg-blue-50 dark:bg-slate-600 border border-blue-200 dark:border-slate-500 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-slate-100 mb-2">
          {isHybrid ? 'Hybrid Vector Example' : 'Dense Vector Example'}
        </h3>
        <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
          <pre>{isHybrid ? `{
  "id": "doc_001",
  "vector": [0.1, 0.2, 0.3, ...],
  "sparse_indices": [10, 50, 100, 500],
  "sparse_values": [0.8, 0.5, 0.3, 0.1],
  "meta": {"text": "document content", "category": "tech"}
}` : `{
  "id": "vec_001",
  "vector": [0.1, 0.2, 0.3, 0.4, ...],
  "meta": {"text": "document content", "category": "tech"}
}`}</pre>
        </div>
      </div>
    </div>
  )
}
