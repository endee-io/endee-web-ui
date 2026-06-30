'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { GoPlus, GoTrash, GoSync, GoDownload, GoUpload, GoX } from 'react-icons/go'
import { api } from '../api/client'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'
import { useNotification } from '../context/NotificationContext'
import CreateBackupModal from '../components/CreateBackupModal'
import UploadBackupModal from '../components/UploadBackupModal'
import Notification from '../components/Notification'

interface Backup {
  name: string
  original_collection: string
  timestamp: number
}

interface ActiveBackup {
  active: boolean
  backup_name?: string
  collection_id?: string
}

interface BackupInfo {
  original_collection: string
  params: {
    M: number
    checksum: number
    dim: number
    ef_construction: number
    quant_level: number
    space_type: string
    sparse_model: string
    total_elements: number
  }
  size_mb: number
  timestamp: number
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Active backup state
  const [activeBackup, setActiveBackup] = useState<ActiveBackup | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const prevActiveRef = useRef<boolean | null>(null)
  const activeBackupNameRef = useRef<string | null>(null)

  // Create backup modal state
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Upload backup modal state
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreBackupName, setRestoreBackupName] = useState('')
  const [restoreTargetIndex, setRestoreTargetIndex] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreIndexNameError, setRestoreIndexNameError] = useState<string | null>(null)

  const restoreIndexPattern = /^[a-zA-Z0-9_]{0,48}$/
  const restoreIndexValid = /^[a-zA-Z0-9_]{1,48}$/.test(restoreTargetIndex)

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteBackupName, setDeleteBackupName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Info modal state
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [infoBackupName, setInfoBackupName] = useState('')
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)

  const { selectedDatabase } = useSelectedDatabase()
  const { notification, showNotification, clearNotification } = useNotification()

  const loadBackups = useCallback(async () => {
    if (!selectedDatabase) return
    setLoading(true)
    try {
      const response = await api.listBackups()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch backups.')
      }
      const data = response.data ?? {}
      const backupList: Backup[] = Object.entries(data).map(([name, info]) => {
        const bi = info as Partial<BackupInfo> & { original_index?: string }
        return {
          name,
          // v2 renamed index → collection; fall back to the old key just in case.
          original_collection: bi.original_collection ?? bi.original_index ?? '',
          timestamp: bi.timestamp ?? 0,
        }
      })
      // Sort by timestamp descending (newest first)
      backupList.sort((a, b) => b.timestamp - a.timestamp)
      setBackups(backupList)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
    } finally {
      setLoading(false)
    }
  }, [selectedDatabase])

  const loadActiveBackup = useCallback(async () => {
    if (!selectedDatabase) return
    try {
      const response = await api.activeBackup()
      if (!response.success) return
      const data = (response.data ?? { active: false }) as unknown as ActiveBackup
      if (data.active && data.backup_name) {
        activeBackupNameRef.current = data.backup_name
      }
      setActiveBackup(data)
      setIsPolling(data.active)
    } catch {
      // silently fail
    }
  }, [selectedDatabase])

  useEffect(() => {
    if (!selectedDatabase) return
    loadBackups()
    loadActiveBackup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatabase])

  // Reload backups and notify when active backup completes
  useEffect(() => {
    if (prevActiveRef.current === true && activeBackup?.active === false) {
      loadBackups()
      const name = activeBackupNameRef.current
      showNotification('success', name ? `Backup "${name}" created successfully` : 'Backup created successfully')
      activeBackupNameRef.current = null
    }
    prevActiveRef.current = activeBackup?.active ?? null
  }, [activeBackup, loadBackups, showNotification])

  // Poll for active backup updates every 3s
  useEffect(() => {
    if (!isPolling) return
    const interval = setInterval(loadActiveBackup, 3000)
    return () => clearInterval(interval)
  }, [isPolling, loadActiveBackup])

  const openCreateModal = () => setShowCreateModal(true)

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setIsPolling(true)
    loadActiveBackup()
  }

  const openUploadModal = () => setShowUploadModal(true)

  const closeUploadModal = () => {
    setShowUploadModal(false)
    loadBackups()
  }

  const openRestoreModal = (backupName: string) => {
    setRestoreBackupName(backupName)
    setRestoreTargetIndex('')
    setRestoreError(null)
    setShowRestoreModal(true)
  }

  const closeRestoreModal = () => {
    setShowRestoreModal(false)
    setRestoreBackupName('')
    setRestoreTargetIndex('')
    setRestoreError(null)
  }

  const handleRestoreBackup = async () => {
    if (!restoreBackupName || !restoreIndexValid) return

    setRestoring(true)
    setRestoreError(null)
    try {
      const response = await api.restoreBackup(restoreBackupName, restoreTargetIndex.trim())
      if (!response.success) {
        throw new Error(response.error || 'Failed to restore backup')
      }

      closeRestoreModal()
      showNotification('success', `Backup "${restoreBackupName}" restored to collection "${restoreTargetIndex.trim()}"`)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore backup')
    } finally {
      setRestoring(false)
    }
  }

  const openDeleteModal = (backupName: string) => {
    setDeleteBackupName(backupName)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteBackupName('')
  }

  const handleDeleteBackup = async () => {
    if (!deleteBackupName) return

    setDeleting(true)
    try {
      const response = await api.deleteBackup(deleteBackupName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete backup')
      }

      closeDeleteModal()
      showNotification('success', `Backup "${deleteBackupName}" deleted successfully`)
      loadBackups()
    } catch (err) {
      closeDeleteModal()
      showNotification('error', err instanceof Error ? err.message : 'Failed to delete backup')
    } finally {
      setDeleting(false)
    }
  }

  const openInfoModal = async (backupName: string) => {
    setInfoBackupName(backupName)
    setBackupInfo(null)
    setInfoError(null)
    setLoadingInfo(true)
    setShowInfoModal(true)
    try {
      const response = await api.backupInfo(backupName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch backup info')
      }
      setBackupInfo(response.data as unknown as BackupInfo)
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : 'Failed to load backup info')
    } finally {
      setLoadingInfo(false)
    }
  }

  const closeInfoModal = () => {
    setShowInfoModal(false)
    setInfoBackupName('')
    setBackupInfo(null)
    setInfoError(null)
  }

  const handleDownloadBackup = async (backupName: string) => {
    try {
      // Resolve the signed backend download URL via the proxy (token injected
      // server-side), then trigger the download in a hidden iframe.
      const response = await api.downloadBackupUrl(backupName)
      if (!response.success || !response.data?.url) {
        throw new Error(response.error || 'Failed to start download')
      }
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = response.data.url
      document.body.appendChild(iframe)
      setTimeout(() => { document.body.removeChild(iframe) }, 60000)
      showNotification('success', `Downloading backup "${backupName}"`)
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to download backup')
    }
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Backups</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {selectedDatabase ? `Backups in ${selectedDatabase}` : 'Manage your backups'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${selectedDatabase ? '' : 'hidden'}`}>
          <button
            onClick={openUploadModal}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <GoUpload className="w-5 h-5" />
            Upload Backup
          </button>
          <button
            onClick={openCreateModal}
            disabled={activeBackup?.active === true}
            title={activeBackup?.active ? 'A backup is already in progress' : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <GoPlus className="w-5 h-5" />
            Create Backup
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onDismiss={clearNotification}
          className="mb-4"
        />
      )}

      {/* Error State */}
      {error && (
        <Notification
          type="error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      {/* No database selected */}
      {!selectedDatabase && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300">
            Select a database to view its backups.
          </div>
        </div>
      )}

      {/* Active Backup Banner */}
      {selectedDatabase && activeBackup?.active && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="flex-1 text-sm text-blue-700 dark:text-blue-300">
            Creating backup{activeBackup.backup_name ? <> <span className="font-medium">"{activeBackup.backup_name}"</span></> : ''}...
          </span>
          <span className="text-xs text-blue-500 dark:text-blue-400 shrink-0">In progress</span>
        </div>
      )}

      {/* Loading State */}
      {selectedDatabase && loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading backups...</div>
        </div>
      )}

      {/* Empty State */}
      {selectedDatabase && !loading && !error && backups.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300 mb-4">No backups found</div>
          <button
            onClick={openCreateModal}
            disabled={activeBackup?.active === true}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            Create your first backup
          </button>
        </div>
      )}

      {/* Backups List */}
      {selectedDatabase && !loading && backups.length > 0 && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Backup Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Original Collection
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created At
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
              {backups.map((backup) => (
                <tr key={backup.name} className="hover:bg-slate-50 dark:hover:bg-slate-600/50 transition-colors">
                  <td className="px-4 py-3">
                    <span onClick={() => openInfoModal(backup.name)} className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer">
                      {backup.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {backup.original_collection}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDateTime(backup.timestamp)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* <button
                        title="Info"
                        onClick={() => openInfoModal(backup.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <GoInfo className="w-4 h-4" />
                      </button> */}
                      <button
                        title="Restore"
                        onClick={() => openRestoreModal(backup.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <GoSync className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => openDeleteModal(backup.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <GoTrash className="w-4 h-4" />
                      </button>
                      <button
                        title="Download"
                        onClick={() => handleDownloadBackup(backup.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <GoDownload className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Backup Modal */}
      {showCreateModal && (
        <CreateBackupModal closeBackupModal={closeCreateModal} />
      )}

      {/* Backup Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Backup Details</p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">{infoBackupName}</h3>
                </div>
                <button
                  onClick={closeInfoModal}
                  className="p-1.5 -mr-1.5 -mt-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-all"
                >
                  <GoX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              {loadingInfo && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}

              {infoError && (
                <Notification type="error" message={infoError} compact />
              )}

              {backupInfo && (
                <div className="space-y-6">
                  {/* Primary Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Source Collection</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{backupInfo.original_collection}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Created</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{formatDateTime(backupInfo.timestamp)}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Size</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{backupInfo.size_mb} <span className="text-slate-400">MB</span></p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-700" />

                  {/* Index Parameters */}
                  <div>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Index Configuration</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Dimensions</span>
                        <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{backupInfo.params.dim}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Vectors</span>
                        <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{backupInfo.params.total_elements.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Space Type</span>
                        <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{backupInfo.params.space_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">M</span>
                        <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{backupInfo.params.M}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">ef_construction</span>
                        <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{backupInfo.params.ef_construction}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Quant Level</span>
                        <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{backupInfo.params.quant_level}</span>
                      </div>
                      {(backupInfo.params.sparse_model == 'default' || backupInfo.params.sparse_model == 'endee_bm25') && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 dark:text-slate-400">Sparse Model</span>
                          <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{backupInfo.params.sparse_model}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
              <div className="flex justify-end">
                <button
                  onClick={closeInfoModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Restore Backup</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Restoring backup: <span className="font-medium text-slate-800 dark:text-slate-200">{restoreBackupName}</span>
            </p>

            {restoreError && (
              <Notification type="error" message={restoreError} compact className="mb-4" />
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Collection Name
              </label>
              <input
                type="text"
                value={restoreTargetIndex}
                onChange={(e) => {
                  const val = e.target.value
                  if (restoreIndexPattern.test(val)) {
                    setRestoreTargetIndex(val)
                    setRestoreIndexNameError(null)
                  } else if (val.length > 48) {
                    setRestoreIndexNameError('Max 48 characters allowed.')
                  } else {
                    setRestoreIndexNameError('Only alphanumeric characters and underscores are allowed.')
                  }
                }}
                placeholder="e.g., my_restored_collection"
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${restoreIndexNameError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
              />
              {restoreIndexNameError ? (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{restoreIndexNameError}</p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alphanumeric characters and underscores only. Max 48 characters.</p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeRestoreModal}
                disabled={restoring}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={restoring || !restoreIndexValid}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete Backup</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete the backup "<span className="font-medium">{deleteBackupName}</span>"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBackup}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Backup Modal */}
      {showUploadModal && (
        <UploadBackupModal closeUploadModal={closeUploadModal} />
      )}
    </div>
  )
}
