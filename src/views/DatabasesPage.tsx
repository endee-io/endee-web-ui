'use client'

import { useState } from 'react'
import { GoCheckCircleFill, GoPlus } from 'react-icons/go'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'
import Notification from '../components/Notification'
import CreateDatabaseModal from '../components/CreateDatabaseModal'

export default function DatabasesPage() {
  const {
    databases,
    selectedDatabase,
    loading,
    error,
    selectDatabase,
    refreshDatabases,
  } = useSelectedDatabase()

  const [showCreate, setShowCreate] = useState(false)

  const handleCreated = async (dbName: string) => {
    await refreshDatabases()
    selectDatabase(dbName)
  }

  const formatDate = (timestamp: number | string | undefined) =>
    new Date(Number(timestamp ?? 0) * 1000).toLocaleDateString('en-US', {
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
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Databases</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Select a database to scope collections and backups
          </p>
        </div>

        {!loading && !error && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <GoPlus className="w-5 h-5" />
            Create Database
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading databases...</div>
        </div>
      )}

      {!loading && error && <Notification type="error" message={error} className="mb-4" />}

      {!loading && !error && databases.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300 mb-4">No databases found</div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create your first database
          </button>
        </div>
      )}

      {/* Database cards */}
      {!loading && !error && databases.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {databases.map((db) => {
            const isSelected = db.db_name === selectedDatabase
            return (
              <button
                key={db.db_name}
                onClick={() => selectDatabase(db.db_name)}
                className={`text-left bg-white dark:bg-slate-700 border rounded-lg p-5 transition-all hover:shadow-md ${isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500/40'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {/* <span className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                      <GoServer className="w-5 h-5" />
                    </span> */}
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 break-all">
                        {db.db_name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{db.db_type}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-300">
                      <GoCheckCircleFill className="w-4 h-4" />
                      Selected
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-600">
                  {db.is_active ? (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full">
                      Inactive
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(db.created_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateDatabaseModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
