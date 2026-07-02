'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { GoCheckCircleFill, GoPlus, GoServer, GoShieldCheck, GoInfo, GoAlert } from 'react-icons/go'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'
import { useServers } from '../context/ServersContext'
import { dbPath, seg } from '../lib/routes'
import { api } from '../api/client'
import Notification from '../components/Notification'
import CreateDatabaseModal from '../components/CreateDatabaseModal'

/** A license is usable for creating databases only when it's active/valid. */
function isLicenseActive(status?: string): boolean {
  const s = (status || '').toLowerCase()
  return s === 'active' || s === 'valid'
}

export default function DatabasesPage() {
  const router = useRouter()
  const params = useParams<{ server: string }>()
  const serverName = params?.server ? decodeURIComponent(params.server) : ''
  const { servers } = useServers()
  const server = servers.find((s) => s.name === serverName) ?? null
  const {
    databases,
    selectedDatabase,
    loading,
    error,
    refreshDatabases,
  } = useSelectedDatabase()

  const [showCreate, setShowCreate] = useState(false)
  // Server-level license status — gates database creation.
  const [licenseActive, setLicenseActive] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await api.getInfo()
      if (cancelled) return
      setLicenseActive(res.success ? isLicenseActive(res.data?.license?.status) : null)
    })()
    return () => {
      cancelled = true
    }
  }, [serverName])

  const licenseHref = `/${seg(serverName)}/license`

  const pick = (name: string) => {
    router.push(dbPath(serverName, name, 'collections'))
  }

  const handleCreated = async (dbName: string) => {
    await refreshDatabases()
    pick(dbName)
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
    <main className="flex-1 overflow-auto flex flex-col items-center bg-card-background dark:bg-slate-800">
      <div className="w-full px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Databases</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5">
              <GoServer className="w-4 h-4" />
              {server ? server.name : 'No server'} · select a database to open the dashboard
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={licenseHref}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <GoShieldCheck className="w-4 h-4" />
              License
            </Link>
            <Link
              href={`/${seg(serverName)}/info`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <GoInfo className="w-4 h-4" />
              Info
            </Link>
            {!loading && !error && licenseActive !== false && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <GoPlus className="w-5 h-5" />
                Create Database
              </button>
            )}
          </div>
        </div>

        {/* License gate: databases can't be created without an active license. */}
        {licenseActive === false && (
          <div className="flex items-start gap-3 mb-6 p-4 rounded-lg border border-blue-300 bg-blue-50 dark:border-blue-800/60 dark:bg-blue-900/20">
            <GoInfo className="w-5 h-5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                No active license
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300/90 mt-0.5">
                A valid license is required to create databases. Generate and activate one to get started.
              </p>
            </div>
            <Link
              href={licenseHref}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <GoShieldCheck className="w-4 h-4" />
              Activate License
            </Link>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-slate-600 dark:text-slate-300">Loading databases...</div>
          </div>
        )}

        {!loading && error && <Notification type="error" message={error} className="mb-4" />}

        {!loading && !error && databases.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-600 dark:text-slate-300 mb-4">No databases found</div>
            {licenseActive === false ? (
              <Link
                href={licenseHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <GoShieldCheck className="w-4 h-4" />
                Activate a license to get started
              </Link>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create your first database
              </button>
            )}
          </div>
        )}

        {!loading && !error && databases.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {databases.map((db) => {
              const isSelected = db.db_name === selectedDatabase
              return (
                <button
                  key={db.db_name}
                  onClick={() => pick(db.db_name)}
                  className={`text-left bg-white dark:bg-slate-800 border rounded-lg p-5 transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 ring-1 ring-blue-500/40'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 break-all">
                        {db.db_name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{db.db_type}</span>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-300">
                        <GoCheckCircleFill className="w-4 h-4" />
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                    {db.is_active ? (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full">
                        Inactive
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(db.created_at)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDatabaseModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </main>
  )
}
