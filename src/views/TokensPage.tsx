'use client'

import { useEffect, useState } from 'react'
import { GoPlus, GoTrash } from 'react-icons/go'
import { api } from '../api/client'
import type { TokenInfo } from '../api/client'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'
import Notification from '../components/Notification'
import CreateTokenModal from '../components/CreateTokenModal'

const tokenTypeLabel = (t?: string) => (t === 'r' ? 'Read-only' : t === 'rw' ? 'Read-write' : t || 'Unknown')
const tokenTypeBadge = (t?: string) =>
  t === 'r'
    ? 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
    : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'

export default function TokensPage() {
  const { selectedDatabase } = useSelectedDatabase()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!selectedDatabase) return
    loadTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatabase])

  const loadTokens = async () => {
    setLoading(true)
    try {
      const response = await api.listTokens()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tokens')
      }
      setTokens(response.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      const response = await api.deleteToken(deleteTarget)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete token')
      }
      setDeleteTarget(null)
      await loadTokens()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete token')
    } finally {
      setDeleting(false)
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

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Tokens</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {selectedDatabase
              ? `Access tokens for ${selectedDatabase}`
              : 'Access tokens for the selected database'}
          </p>
        </div>

        {selectedDatabase && !loading && !error && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <GoPlus className="w-5 h-5" />
            Create Token
          </button>
        )}
      </div>

      {/* No database selected */}
      {!selectedDatabase && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Select a database to view its tokens.</div>
        </div>
      )}

      {/* Loading */}
      {selectedDatabase && loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading tokens...</div>
        </div>
      )}

      {/* Error */}
      {selectedDatabase && !loading && error && (
        <Notification type="error" message={error} className="mb-4" />
      )}

      {/* Empty */}
      {selectedDatabase && !loading && !error && tokens.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300">No tokens found</div>
        </div>
      )}

      {/* Token list */}
      {selectedDatabase && !loading && !error && tokens.length > 0 && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr
                  key={token.name}
                  className="border-b border-slate-100 dark:border-slate-600/60 last:border-0"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-100 break-all">{token.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tokenTypeBadge(token.token_type)}`}>
                      {tokenTypeLabel(token.token_type)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {formatDate(token.created_at)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(token.name)}
                      title="Delete token"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <GoTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create token modal */}
      {showCreate && (
        <CreateTokenModal onClose={() => setShowCreate(false)} onCreated={loadTokens} />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete Token</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete the token &quot;{deleteTarget}&quot;? Any client using it will
              immediately lose access. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
