'use client'

import { useState } from 'react'
import { BarLoader } from 'react-spinners'
import { useServers } from '../context/ServersContext'
import Notification from './Notification'

type Props = {
  onClose: () => void
  onAdded: () => void
}

export default function AddServerModal({ onClose, onAdded }: Props) {
  const { addServer } = useServers()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = name.trim().length > 0 && url.trim().length > 0

  const handleAdd = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await addServer({ name: name.trim(), url: url.trim(), token: token.trim() })
      onAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server')
    } finally {
      setSaving(false)
    }
  }

  const field =
    'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Add Server</h3>
        <div className="space-y-4">
          {error && <Notification type="error" message={error} compact />}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Production" className={field} disabled={saving} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:8080/api/v2" className={field} disabled={saving} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Root Token</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Root token" className={`${field} font-mono text-xs`} disabled={saving} />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          {saving ? (
            <BarLoader color="#155dfc" />
          ) : (
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={!valid} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed">
                Add Server
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
