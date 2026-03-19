import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoArrowLeft, GoChevronDown, GoChevronRight } from 'react-icons/go'
import { api, Precision } from '../api/client'
import Tooltip from "../components/Tooltip"
import Notification from '../components/Notification'
type SpaceType = 'cosine' | 'euclidean' | 'inner_product'

export default function CreateIndexPage() {
  const [name, setName] = useState('')
  const [spaceType, setSpaceType] = useState<SpaceType>('cosine')
  const [dimension, setDimension] = useState('')
  const [precision, setPrecision] = useState<Precision>(Precision.INT8)

  // Hybrid index options
  const [isHybrid, setIsHybrid] = useState(false)
  const [sparseModel, setSparseModel] = useState('default')

  // Advanced configuration
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mParam, setMParam] = useState('16')
  const [efConstruction, setEfConstruction] = useState('128')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Index name is required')
      return
    }

    const dimValue = parseInt(dimension)
    if (!dimension || isNaN(dimValue) || dimValue <= 0) {
      setError('Dimension must be a positive number')
      return
    }

    // Validate hybrid options
    let sparseModelValue: string | null = null;
    if (isHybrid) {
      sparseModelValue = sparseModel;
    }

    // Validate advanced options
    const mValue = parseInt(mParam)
    const efValue = parseInt(efConstruction)
    if (showAdvanced) {
      if (isNaN(mValue) || mValue < 4 || mValue > 64) {
        setError('M parameter must be between 4 and 64')
        return
      }
      if (isNaN(efValue) || efValue < 64 || efValue > 512) {
        setError('ef_construction must be between 64 and 512')
        return
      }
    }

    setSubmitting(true)

    try {
      const response = await api.createIndex(name.trim(), dimValue, spaceType, {
        precision,
        sparseModel: sparseModelValue,
        M: showAdvanced ? mValue : undefined,
        ef_con: showAdvanced ? efValue : undefined,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to create index')
      }

      navigate('/indexes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create index')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/indexes')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to Indexes
        </button>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Create a new index</h1>
      </div>

      {/* Form */}
      <div className="">
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Index Name */}
            <div>
              <div className='flex items-center gap-2 mb-2'>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Index Name <span className="text-red-500">*</span>
                </label>
                <Tooltip tip="A unique identifier for your index. Only alphanumeric characters and `_` allowed." />
              </div>
              <input

                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., product-embeddings"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              />
              {/* <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  A unique identifier for your index
                </p> */}
            </div>

            {/* Dimension */}
            <div>
              <div className='flex items-center gap-2 mb-2'>
                <label htmlFor="dimension" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Dimension <span className="text-red-500">*</span>
                </label>
                <Tooltip tip="The number of dimensions in your dense vectors" />
              </div>
              <input
                type="number"
                id="dimension"
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                placeholder="e.g., 768"
                min="1"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              />
              {/* <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  The number of dimensions in your dense vectors
                </p> */}
            </div>

            <div className='flex gap-6'>
              {/* Space Type */}
              <div className='flex-1'>
                <div className='flex items-center gap-2 mb-2'>
                  <label htmlFor="spaceType" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Space Type <span className="text-red-500">*</span>
                  </label>
                  <Tooltip tip="The distance metric used for similarity search" />
                </div>
                <select
                  id="spaceType"
                  value={spaceType}
                  onChange={(e) => setSpaceType(e.target.value as SpaceType)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="cosine">Cosine Similarity</option>
                  <option value="l2">Euclidean Distance</option>
                  <option value="ip">Inner Product</option>
                </select>
              </div>

              {/* Precision */}
              <div className='flex-1'>
                <div className='flex items-center gap-2 mb-2'>
                  <label htmlFor="precision" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Precision <span className="text-red-500">*</span>
                  </label>
                  <Tooltip tip="Higher precision gives higher accuracy but trades off speed" />
                </div>
                <select
                  id="precision"
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value as Precision)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value={Precision.BINARY}>Binary</option>
                  <option value={Precision.INT8}>Int8</option>
                  <option value={Precision.INT16}>Int16</option>
                  <option value={Precision.FLOAT16}>Float16</option>
                  <option value={Precision.FLOAT32}>Float32</option>
                </select>
              </div>
            </div>

            {/* Hybrid Index Toggle */}
            <div className="border-t border-slate-200 dark:border-slate-600 pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHybrid}
                  onChange={(e) => setIsHybrid(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 dark:border-slate-600 focus:ring-purple-500"
                  disabled={submitting}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Create as Hybrid Index
                </span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                  Sparse & Dense
                </span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-7">
                Hybrid indexes support both dense vectors and sparse vectors for improved search quality
              </p>

              {/* Sparse Model - shown when hybrid is checked */}
              {isHybrid && (
                <div className="mt-4 ml-7 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                  <label htmlFor="sparseModel" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Sparse Model <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="sparseModel"
                    value={sparseModel}
                    onChange={(e) => setSparseModel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={submitting}
                  >
                    <option value='default' selected>Default</option>
                    <option value='endee_bm25'>Endee BM25</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    The vocabulary size for sparse vectors (e.g., SPLADE model vocabulary)
                  </p>
                </div>
              )}
            </div>

            {/* Advanced Configuration */}
            <div className="border-t border-slate-200 dark:border-slate-600 pt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {showAdvanced ? (
                  <GoChevronDown className="w-4 h-4" />
                ) : (
                  <GoChevronRight className="w-4 h-4" />
                )}
                Advanced Configuration
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-600 space-y-4">
                  {/* M Parameter */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label htmlFor="mParam" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        M (HNSW connections)
                      </label>
                      <Tooltip tip='Higher values create more connections, improving recall but increasing memory usage' />
                    </div>
                    <input
                      type="number"
                      id="mParam"
                      value={mParam}
                      onChange={(e) => setMParam(e.target.value)}
                      min="4"
                      max="64"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submitting}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Default: 16. Range: 4-64. Higher = better recall, more memory
                    </p>
                  </div>

                  {/* ef_construction */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label htmlFor="efConstruction" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        ef_construction
                      </label>
                      <Tooltip tip='Higher values improve index quality but increase build time' />
                    </div>
                    <input
                      type="number"
                      id="efConstruction"
                      value={efConstruction}
                      onChange={(e) => setEfConstruction(e.target.value)}
                      min="64"
                      max="512"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submitting}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Default: 128. Range: 64-512. Higher = better quality, slower build
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <Notification type="error" message={error} />
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : isHybrid ? 'Create Hybrid Index' : 'Create Index'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/indexes')}
                disabled={submitting}
                className="px-6 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
