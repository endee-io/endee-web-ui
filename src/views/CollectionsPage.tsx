'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoPlus, GoArchive } from 'react-icons/go'
import { api } from '../api/client'
import type { CollectionSummary } from '../api/client'
import { typeLabel, typeBadge, fieldSpec, fieldTypes } from '../lib/collectionFields'
import { useNotification } from '../context/NotificationContext'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'
import { useDbRoute } from '../lib/routes'
import CreateBackupModalFromCollection from '../components/CreateBackupModal'
import Notification from '../components/Notification'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { path } = useDbRoute()

  // Backup modal state
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [backupCollectionName, setBackupCollectionName] = useState('')

  const { notification, clearNotification } = useNotification()
  const { selectedDatabase } = useSelectedDatabase()

  useEffect(() => {
    if (!selectedDatabase) return
    loadCollections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatabase])

  const loadCollections = async () => {
    setLoading(true)
    try {
      const response = await api.listCollections()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch collections')
      }
      setCollections(response.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number | string | undefined) =>
    new Date(Number(timestamp ?? 0) * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const openBackupModal = (collectionName: string) => {
    setBackupCollectionName(collectionName)
    setShowBackupModal(true)
  }

  const closeBackupModal = () => {
    setShowBackupModal(false)
    setBackupCollectionName('')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Collections</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {selectedDatabase
              ? `Collections in ${selectedDatabase}`
              : 'Manage your vector collections'}
          </p>
        </div>

        {selectedDatabase && !loading && !error && collections.length !== 0 && (
          <button
            onClick={() => router.push(path('collections/create'))}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <GoPlus className="w-5 h-5" />
            Create Collection
          </button>
        )}
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

      {/* No database selected */}
      {!selectedDatabase && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300">
            Select a database to view its collections.
          </div>
        </div>
      )}

      {/* Loading State */}
      {selectedDatabase && loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading collections...</div>
        </div>
      )}

      {/* Error State */}
      {selectedDatabase && error && (
        <Notification type="error" message={error} className="mb-4" />
      )}

      {/* Empty State */}
      {selectedDatabase && !loading && !error && collections.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300 mb-4">No collections found</div>
          <button
            onClick={() => router.push(path('collections/create'))}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create your first collection
          </button>
        </div>
      )}

      {/* Collections List */}
      {!loading && !error && collections.length > 0 && (
        <div className="grid gap-4">
          {collections.map((collection) => {
            const fields = collection.fields ?? []
            return (
              <div
                key={collection.name}
                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {/* Header row */}
                <div className="flex justify-between items-start mb-3">
                  <Link href={path(`collections/${collection.name}`)} className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {collection.name}
                    </h3>
                    {fieldTypes(collection.fields ?? []).map((t) => (
                      <span
                        key={t}
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeBadge(t)}`}
                      >
                        {typeLabel(t)}
                      </span>
                    ))}
                  </Link>
                  <button
                    onClick={() => openBackupModal(collection.name)}
                    className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 rounded hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors shrink-0"
                  >
                    <GoArchive className="w-4 h-4" />
                    Backup
                  </button>
                </div>

                {/* Meta line */}
                <Link href={path(`collections/${collection.name}`)} className="block">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Created {formatDate(collection.created_at)}
                    {collection.total_elements != null && (
                      <> · {collection.total_elements.toLocaleString()} objects</>
                    )}
                    {' · '}
                    {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                  </p>

                  {/* Per-field breakdown */}
                  {fields.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-600">
                      {fields.map((field) => (
                        <div
                          key={field.name}
                          className="rounded-md border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {field.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge(field.type)}`}
                            >
                              {typeLabel(field.type)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {fieldSpec(field)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <CreateBackupModalFromCollection
          closeBackupModal={closeBackupModal}
          collectionName={backupCollectionName}
        />
      )}
    </div>
  )
}
