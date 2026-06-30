'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoPlus, GoArchive } from 'react-icons/go'
import { api } from '../api/client'
import type { CollectionSummary } from '../api/client'
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
              <Link
                key={collection.name}
                href={path(`collections/${collection.name}`)}
                className="block bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {/* Header row */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {collection.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openBackupModal(collection.name)
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 rounded hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors shrink-0"
                  >
                    <GoArchive className="w-4 h-4" />
                    Backup
                  </button>
                </div>

                {/* Meta table */}
                <dl className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-600 border-t border-slate-100 dark:border-slate-600 pt-4">
                    <div className="px-1 first:pl-0">
                      <dt className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Created
                      </dt>
                      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        {formatDate(collection.created_at)}
                      </dd>
                    </div>
                    <div className="px-4">
                      <dt className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Objects
                      </dt>
                      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        {collection.total_elements != null
                          ? collection.total_elements.toLocaleString()
                          : '—'}
                      </dd>
                    </div>
                    <div className="px-4">
                      <dt className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Fields
                      </dt>
                      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        {fields.length}
                      </dd>
                    </div>
                  </dl>
              </Link>
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
