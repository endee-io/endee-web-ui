'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoArrowLeft, GoTrash, GoSearch, GoPlus, GoPackage, GoArchive, GoKebabHorizontal } from 'react-icons/go'
import { api } from '../api/client'
import type { CollectionSummary } from '../api/client'
import { typeLabel, typeBadge, fieldTypes, sparseModel } from '../lib/collectionFields'
import { useNotification } from '../context/NotificationContext'
import CreateBackupModal from '../components/CreateBackupModal'
import Notification from '../components/Notification'

export default function CollectionDetailPage() {
  const params = useParams()
  const collectionName = params?.collectionName as string
  const router = useRouter()
  const [collection, setCollection] = useState<CollectionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  const actionsMenuRef = useRef<HTMLDivElement>(null)

  const { notification, clearNotification } = useNotification()

  useEffect(() => {
    if (collectionName) loadPageData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName])

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
    if (!collectionName) return
    setLoading(true)
    try {
      const response = await api.getCollection(collectionName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch collection info')
      }
      setCollection(response.data!)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection info')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCollection = async () => {
    if (!collectionName) return
    setDeleting(true)
    try {
      const response = await api.deleteCollection(collectionName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete collection')
      }
      router.push('/collections')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatDate = (timestamp: number | string | undefined) =>
    new Date(Number(timestamp ?? 0) * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading collection information...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.push('/collections')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to Collections
        </button>
        <Notification type="error" message={error} />
      </div>
    )
  }

  const fields = collection?.fields ?? []

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/collections')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to Collections
        </button>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{collectionName}</h1>
            {fieldTypes(fields).map((t) => (
              <span key={t} className={`px-3 py-1 text-sm font-medium rounded-full ${typeBadge(t)}`}>
                {typeLabel(t)}
              </span>
            ))}
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
              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-10">
                <button
                  onClick={() => { setShowActionsMenu(false); setShowBackupModal(true) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <GoArchive className="w-4 h-4" />
                  Create Backup
                </button>
                <div className="border-t border-slate-200 dark:border-slate-600" />
                <button
                  onClick={() => { setShowActionsMenu(false); setShowDeleteConfirm(true) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <GoTrash className="w-4 h-4" />
                  Delete Collection
                </button>
              </div>
            )}
          </div>
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

      {/* Collection summary */}
      {collection && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Collection Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Objects</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {(collection.total_elements ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Fields</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">{fields.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Layout Version</div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {collection.layout_version ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Created</div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-2">
                {formatDate(collection.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fields table */}
      {fields.length > 0 && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Fields</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Dimension</th>
                <th className="pb-2 pr-4 font-medium">Space</th>
                <th className="pb-2 pr-4 font-medium">Precision</th>
                <th className="pb-2 pr-4 font-medium">Extra</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const p = field.params ?? {}
                const extra =
                  field.type === 'sparse'
                    ? `model: ${sparseModel(field) ?? '—'}`
                    : [
                        p.pooling ? `pooling: ${p.pooling}` : null,
                        p.M != null ? `M: ${p.M}` : null,
                        p.ef_con != null ? `ef_con: ${p.ef_con}` : null,
                      ].filter(Boolean).join(' · ') || '—'
                return (
                  <tr key={field.name} className="border-b border-slate-100 dark:border-slate-600/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{field.name}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge(field.type)}`}>
                        {typeLabel(field.type)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {field.type === 'sparse' ? '—' : (p.dimension ?? '—')}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {field.type === 'sparse' ? '—' : (p.space_type ?? '—')}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300 capitalize">
                      {field.type === 'sparse' ? '—' : (String(p.precision ?? '—'))}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{extra}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Operations */}
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Operations</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          href={`/collections/${collectionName}/search`}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow flex items-start gap-4"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <GoSearch className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Search Objects</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Query one or more fields and optionally fuse the results
            </p>
          </div>
        </Link>

        <Link
          href={`/collections/${collectionName}/insert`}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow flex items-start gap-4"
        >
          <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <GoPlus className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Insert Objects</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Upsert objects with values for any subset of fields
            </p>
          </div>
        </Link>

        <Link
          href={`/collections/${collectionName}/vectors`}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow flex items-start gap-4"
        >
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <GoPackage className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Get / Delete Objects</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Retrieve, update filters on, or delete objects by ID
            </p>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete Collection</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete the collection &quot;{collectionName}&quot;? This action cannot be undone and all objects will be permanently removed.
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
                onClick={handleDeleteCollection}
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
        <CreateBackupModal closeBackupModal={() => setShowBackupModal(false)} collectionName={collectionName} />
      )}
    </div>
  )
}
