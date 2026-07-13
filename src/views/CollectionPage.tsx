'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  GoArrowLeft,
  GoTrash,
  GoSearch,
  GoPlus,
  GoPackage,
  GoInfo,
  GoArchive,
  GoKebabHorizontal,
  GoSync
} from 'react-icons/go'
import { api } from '../api/client'
import type { CollectionSummary } from '../api/client'
import { typeLabel, typeBadge, fieldTypes } from '../lib/collectionFields'
import { useNotification } from '../context/NotificationContext'
import CreateBackupModal from '../components/CreateBackupModal'
import RebuildModal from '../components/RebuildModal'
import Notification from '../components/Notification'
import InfoTab from '../components/collection/InfoTab'
import SearchTab from '../components/collection/SearchTab'
import InsertTab from '../components/collection/InsertTab'
import ObjectsTab from '../components/collection/ObjectsTab'
import GraphTab from '../components/collection/GraphTab'
import { useDbRoute } from '../lib/routes'
import { PiGraphLight } from 'react-icons/pi'

const TABS = [
  { key: 'info', name: 'Info', icon: <GoInfo className="w-4 h-4" /> },
  { key: 'search', name: 'Search', icon: <GoSearch className="w-4 h-4" /> },
  { key: 'insert', name: 'Insert', icon: <GoPlus className="w-4 h-4" /> },
  { key: 'objects', name: 'Get Objects', icon: <GoPackage className="w-4 h-4" /> },
  { key: 'graph', name: 'Graph', icon: <PiGraphLight className="w-5 h-5" /> },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function CollectionPage() {
  const params = useParams()
  const collectionName = params?.collectionName as string
  const router = useRouter()
  const { path } = useDbRoute()
  const searchParams = useSearchParams()

  const tabParam = searchParams?.get('tab')
  const activeTab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'info'

  // Keep visited tabs mounted so their state (drafts, results) survives
  // switches. Render-phase state adjustment, per "adjusting state when props
  // change" (react.dev).
  const [visitedTabs, setVisitedTabs] = useState<TabKey[]>([activeTab])
  if (!visitedTabs.includes(activeTab)) {
    setVisitedTabs([...visitedTabs, activeTab])
  }

  const [collection, setCollection] = useState<CollectionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showRebuildModal, setShowRebuildModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  const actionsMenuRef = useRef<HTMLDivElement>(null)

  const { notification, clearNotification } = useNotification()

  const loadCollection = async () => {
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

  useEffect(() => {
    if (collectionName) loadCollection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName])

  // Silent refresh (e.g. after inserts) — updates counts without a loading flash.
  const refreshCollection = async () => {
    if (!collectionName) return
    const response = await api.getCollection(collectionName)
    if (response.success && response.data) setCollection(response.data)
  }

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

  const handleDeleteCollection = async () => {
    if (!collectionName) return
    setDeleting(true)
    try {
      const response = await api.deleteCollection(collectionName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete collection')
      }
      router.push(path('collections'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading collection information...</div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.push(path('collections'))}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
        >
          <GoArrowLeft className="w-5 h-5" />
          Back to Collections
        </button>
        <Notification type="error" message={error ?? 'Collection not found'} />
      </div>
    )
  }

  const fields = collection.fields ?? []

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
                <button
                  onClick={() => { setShowActionsMenu(false); setShowRebuildModal(true) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <GoSync className="w-4 h-4" />
                  Rebuild
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

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => {
          const active = t.key === activeTab
          return (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              replace
              scroll={false}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-blue-600 text-blue-700 dark:text-blue-300 font-medium'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t.icon}
              {t.name}
            </Link>
          )
        })}
      </div>

      {/* Tab panels — visited tabs stay mounted so their state persists */}
      {(visitedTabs.includes('info') || activeTab === 'info') && (
        <div className={activeTab === 'info' ? '' : 'hidden'}>
          <InfoTab collection={collection} />
        </div>
      )}
      {(visitedTabs.includes('search') || activeTab === 'search') && (
        <div className={activeTab === 'search' ? '' : 'hidden'}>
          <SearchTab collectionName={collectionName} collection={collection} />
        </div>
      )}
      {(visitedTabs.includes('insert') || activeTab === 'insert') && (
        <div className={activeTab === 'insert' ? '' : 'hidden'}>
          <InsertTab collectionName={collectionName} collection={collection} onInserted={refreshCollection} />
        </div>
      )}
      {(visitedTabs.includes('objects') || activeTab === 'objects') && (
        <div className={activeTab === 'objects' ? '' : 'hidden'}>
          <ObjectsTab collectionName={collectionName} />
        </div>
      )}
      {(visitedTabs.includes('graph') || activeTab === 'graph') && (
        <div className={activeTab === 'graph' ? '' : 'hidden'}>
          <GraphTab collectionName={collectionName} collection={collection} />
        </div>
      )}

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

      {/* Rebuild Modal */}
      {showRebuildModal && (
        <RebuildModal
          closeModal={() => setShowRebuildModal(false)}
          collectionName={collectionName}
          fields={fields}
        />
      )}
    </div>
  )
}
