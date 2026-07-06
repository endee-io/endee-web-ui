'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { GoDatabase, GoServer, GoSun, GoMoon } from 'react-icons/go'
import { useTheme } from '../useTheme'
import Select from './Select'
import { useServers } from '../context/ServersContext'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'
import { serverPath, dbPath } from '../lib/routes'

/**
 * Shared top bar rendered on every route: brand + breadcrumb Selects (server,
 * database) + docs/theme controls. On the servers list (no server in the URL)
 * the server Select is disabled and reads "All Servers"; on the databases list
 * (no database in the URL) the database Select is disabled and reads
 * "All Databases".
 */
export default function TopBar() {
  const [theme, setTheme] = useTheme()
  const router = useRouter()
  const params = useParams<{ server?: string; database?: string }>()
  const currentServer = params?.server ? decodeURIComponent(params.server) : null
  const currentDatabase = params?.database ? decodeURIComponent(params.database) : null

  const { servers } = useServers()
  const { databases } = useSelectedDatabase()

  const onServersList = !currentServer
  const onDatabasesList = !!currentServer && !currentDatabase

  return (
    <header className="flex items-center justify-between gap-4 px-6 h-16 bg-background border-b border-border dark:border-slate-800 dark:bg-slate-900 shrink-0">
      {/* Breadcrumb: Endee / Server / Database */}
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
          <img src="/endee-logo.svg" className="h-7" alt="Endee" />
          <span className="text-xl text-slate-800 dark:text-white">Endee</span>
        </Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Select
          value={onServersList ? '__all__' : currentServer ?? ''}
          options={
            onServersList
              ? [{ value: '__all__', label: 'All Servers' }]
              : servers.map((s) => ({ value: s.name, label: s.name }))
          }
          onChange={(name) => router.push(serverPath(name))}
          disabled={onServersList}
          placeholder="Server"
          icon={<GoServer className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
          className="max-w-40 text-2xl"
          header="Servers"
          action={{ label: 'View All', onSelect: () => router.push('/') }}
        />
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Select
          value={onDatabasesList ? '__all__' : currentDatabase ?? ''}
          options={
            onDatabasesList
              ? [{ value: '__all__', label: 'All Databases' }]
              : databases.map((d) => ({ value: d.db_name, label: d.db_name }))
          }
          onChange={(name) => currentServer && router.push(dbPath(currentServer, name, 'collections'))}
          disabled={onServersList || onDatabasesList}
          placeholder="Database"
          icon={<GoDatabase className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
          className="max-w-40"
          header="Databases"
          action={{
            label: 'View All',
            onSelect: () => currentServer && router.push(serverPath(currentServer)),
          }}
        />
      </div>

      {/* Right: docs, theme */}
      <div className="flex items-center gap-1 shrink-0">
        <a
          href="https://docs.endee.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-slate-600 dark:text-slate-300 hover:bg-secondary dark:hover:bg-slate-800"
        >
          <span className="hidden sm:inline">Docs</span>
        </a>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center justify-center w-9 h-9 rounded-sm text-slate-600 dark:text-slate-300 hover:bg-secondary dark:hover:bg-slate-800"
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? <GoSun className="w-5 h-5" /> : <GoMoon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  )
}
