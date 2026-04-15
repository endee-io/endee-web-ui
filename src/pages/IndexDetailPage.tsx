import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { GoArrowLeft, GoTrash, GoSearch, GoPlus, GoPackage, GoArchive, GoSync, GoKebabHorizontal } from 'react-icons/go'
import { api } from '../api/client'
import type { IndexDescription } from 'endee'
import { useNotification } from '../context/NotificationContext'
import CreateBackupModal from '../components/CreateBackupModal'
import RebuildIndexModal from '../components/RebuildIndexModal'
import Notification from '../components/Notification'

export default function IndexDetailPage() {
  const { indexName } = useParams<{ indexName: string }>()
  const navigate = useNavigate()
  const [indexInfo, setIndexInfo] = useState<IndexDescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showRebuildModal, setShowRebuildModal] = useState(false)
  const [rebuildInProgress, setRebuildInProgress] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  const { notification, showNotification, clearNotification } = useNotification()

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const startPolling = () => {
    stopPolling()
    pollIntervalRef.current = setInterval(async () => {
      if (!indexName) return
      const response = await api.getRebuildStatus(indexName)
      if (!response.success) return
      const status = response.data?.status
      if (status === 'completed') {
        stopPolling()
        setRebuildInProgress(false)
        loadIndexInfo()
        showNotification('success', `"${indexName}" has been rebuilt successfully`)
      } else if (status === 'failed') {
        stopPolling()
        setRebuildInProgress(false)
        showNotification('error', response.data?.error || `Rebuild of "${indexName}" failed`)
      }
      // in_progress: keep polling
    }, 10000)
  }

  useEffect(() => {
    if (indexName) loadPageData()
    return () => stopPolling()
  }, [indexName])

  // Close actions menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadPageData = async () => {
    if (!indexName) return
    setLoading(true)
    try {
      const [infoResponse, statusResponse] = await Promise.all([
        api.getIndexInfo(indexName),
        api.getRebuildStatus(indexName),
      ])
      if (!infoResponse.success) {
        throw new Error(infoResponse.error || 'Failed to fetch index info')
      }
      setIndexInfo(infoResponse.data!)
      setError(null)

      const status = statusResponse.data?.status
      if (status === 'in_progress') {
        setRebuildInProgress(true)
        startPolling()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load index info')
    } finally {
      setLoading(false)
    }
  }

  const loadIndexInfo = async () => {
    if (!indexName) return
    try {
      const response = await api.getIndexInfo(indexName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch index info')
      }
      setIndexInfo(response.data!)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load index info')
    }
  }

  const handleDeleteIndex = async () => {
    if (!indexName) return
    setDeleting(true)
    try {
      const response = await api.deleteIndex(indexName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete index')
      }
      navigate('/indexes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete index')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading index information...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/indexes')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to Indexes
        </button>
        <Notification type="error" message={error} />
      </div>
    )
  }

  const isHybrid = indexInfo?.isHybrid

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
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{indexName}</h1>
            {isHybrid ? (
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                Hybrid Index
              </span>
            ) : (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                Dense Index
              </span>
            )}
          </div>

          {/* Actions dropdown */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setShowActionsMenu((v) => !v)}
              className="flex items-center justify-center w-9 h-9 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              title="Actions"
            >
              <GoKebabHorizontal className="w-4 h-4" />
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-10">
                <button
                  onClick={() => { setShowActionsMenu(false); setShowBackupModal(true) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <GoArchive className="w-4 h-4" />
                  Create Backup
                </button>
                <button
                  onClick={() => { if (!rebuildInProgress) { setShowActionsMenu(false); setShowRebuildModal(true) } }}
                  disabled={rebuildInProgress}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoSync className={`w-4 h-4 ${rebuildInProgress ? 'animate-spin' : ''}`} />
                  {rebuildInProgress ? 'Rebuilding...' : 'Rebuild Index'}
                </button>
                <div className="border-t border-slate-200 dark:border-slate-600" />
                <button
                  onClick={() => { setShowActionsMenu(false); setShowDeleteConfirm(true) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <GoTrash className="w-4 h-4" />
                  Delete Index
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rebuild In Progress Banner */}
      {rebuildInProgress && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="flex-1 text-sm text-blue-700 dark:text-blue-300">
            Rebuilding index <span className="font-medium">"{indexName}"</span>... Searches continue using the old index until rebuild completes.
          </span>
          <span className="text-xs text-blue-500 dark:text-blue-400 shrink-0">In progress</span>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onDismiss={clearNotification}
          className="mb-4"
        />
      )}

      {/* Index Stats */}
      {indexInfo && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Index Information</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Dimension</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">{indexInfo.dimension}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total Vectors</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {indexInfo.count?.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Space Type</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">{indexInfo.spaceType}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Precision</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1 capitalize">{indexInfo.precision}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">M Parameter</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">{indexInfo.M}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">ef construction</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">{indexInfo.efCon}</div>
            </div>
            {isHybrid && (
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Sparse Model</div>
                <div className="text-xl font-semibold text-purple-600 dark:text-purple-400 mt-1">{indexInfo.sparseModel}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Operations</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          to={`/indexes/${indexName}/search`}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow flex items-start gap-4"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <GoSearch className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Search Vectors</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isHybrid ? 'Search using dense and/or sparse vectors' : 'Search for similar vectors using a query vector'}
            </p>
          </div>
        </Link>

        <Link
          to={`/indexes/${indexName}/insert`}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow flex items-start gap-4"
        >
          <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <GoPlus className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Insert Vectors</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isHybrid ? 'Add vectors with dense and sparse components' : 'Add new dense vectors to this index'}
            </p>
          </div>
        </Link>

        <Link
          to={`/indexes/${indexName}/vectors`}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow flex items-start gap-4"
        >
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <GoPackage className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Get / Delete Vector</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Retrieve or delete vectors by ID
            </p>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete Index</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete the index "{indexName}"? This action cannot be undone and all vectors will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteIndex}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <CreateBackupModal closeBackupModal={() => setShowBackupModal(false)} indexName={indexName} />
      )}

      {/* Rebuild Modal */}
      {showRebuildModal && indexInfo && (
        <RebuildIndexModal
          closeModal={() => setShowRebuildModal(false)}
          indexName={indexName!}
          currentM={indexInfo.M}
          currentEfCon={indexInfo.efCon}
          onRebuildStarted={() => {
            setRebuildInProgress(true)
            startPolling()
          }}
        />
      )}
    </div>
  )
}
