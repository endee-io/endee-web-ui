'use client'

import { useState } from 'react'
import { BarLoader } from 'react-spinners'
import { GoCopy, GoCheck } from 'react-icons/go'
import { api, DB_TYPES } from '../api/client'
import type { DbType, CreateDatabaseResult } from '../api/client'
import Notification from './Notification'

type Props = {
  onClose: () => void
  /** Called after the user dismisses the success screen, with the new db name. */
  onCreated: (dbName: string) => void
}

const namePattern = /^[a-zA-Z0-9_]{0,48}$/
const nameValid = (n: string) => /^[a-zA-Z0-9_]{1,48}$/.test(n)

export default function CreateDatabaseModal({ onClose, onCreated }: Props) {
  const [dbName, setDbName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [dbType, setDbType] = useState<DbType>('scale')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateDatabaseResult | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!nameValid(dbName)) return
    setCreating(true)
    setError(null)
    try {
      const response = await api.createDatabase(dbName.trim(), dbType)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create database')
      }
      setResult(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create database')
    } finally {
      setCreating(false)
    }
  }

  const copyToken = async () => {
    if (!result?.db_token) return
    try {
      await navigator.clipboard.writeText(result.db_token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — the token is still selectable in the field */
    }
  }

  const handleDone = () => {
    if (result) onCreated(result.db_name)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        {!result ? (
          <>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Create Database</h3>
            <div className="space-y-4">
              {error && <Notification type="error" message={error} compact />}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => {
                    const val = e.target.value
                    if (namePattern.test(val)) {
                      setDbName(val)
                      setNameError(null)
                    } else if (val.length > 48) {
                      setNameError('Max 48 characters allowed.')
                    } else {
                      setNameError('Only alphanumeric characters and underscores are allowed.')
                    }
                  }}
                  placeholder="e.g., my_app"
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${nameError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                  disabled={creating}
                />
                {nameError ? (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{nameError}</p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alphanumeric characters and underscores only. Max 48 characters.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tier</label>
                <select
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value as DbType)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                  disabled={creating}
                >
                  {DB_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              {creating ? (
                <BarLoader color="#155dfc" />
              ) : (
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!nameValid(dbName)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    Create Database
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Database Created</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Database <span className="font-medium text-slate-800 dark:text-slate-200">{result.db_name}</span> is ready.
            </p>

            <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 mb-4">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">
                Copy this database token now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.db_token}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs"
                />
                <button
                  onClick={copyToken}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors text-sm shrink-0"
                >
                  {copied ? <GoCheck className="w-4 h-4 text-green-600" /> : <GoCopy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleDone}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
