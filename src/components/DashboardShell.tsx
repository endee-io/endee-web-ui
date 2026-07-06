'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { GoDatabase, GoBook, GoArchive, GoKey, GoRocket, GoShieldCheck } from 'react-icons/go'
import { useServersStore } from '../context/ServersContext'
import { useSelectedDatabase, useSelectedDatabaseStore } from '../context/SelectedDatabaseContext'
import { dbPath, serverPath } from '../lib/routes'

interface NavItem {
  name: string
  /** Path relative to the current database root, e.g. 'collections'. */
  sub: string
  icon: React.ReactNode
}

const DatabaseNav: NavItem[] = [
  { name: 'Collections', sub: 'collections', icon: <GoDatabase className="h-5 w-6" /> },
  { name: 'Tokens', sub: 'tokens', icon: <GoKey className="h-5 w-6" /> },
  { name: 'Backups', sub: 'backups', icon: <GoArchive className="h-5 w-6" /> },
  { name: 'Tutorials', sub: 'tutorials', icon: <GoBook className="h-5 w-6" /> },
]

const LicenseNav: NavItem[] = [
  { name: 'License', sub: 'license', icon: <GoShieldCheck className="h-5 w-6" /> },
]

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${active
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-gray-200 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-secondary dark:hover:bg-slate-800 dark:hover:text-gray-300 hover:text-secondary-fg'
        }`}
    >
      <span>{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  )
}

function Sidebar({ server, database }: { server: string; database: string }) {
  const pathname = usePathname() ?? ''
  return (
    <aside className="text-black bg-background dark:text-white w-60 border-r border-border dark:border-slate-800 dark:bg-slate-900 flex flex-col">
      <div className="flex flex-col gap-1 px-2 pt-4 pb-0 text-sm">
        <NavLink
          href={dbPath(server, database, 'get-started')}
          label="Get started"
          icon={<GoRocket className="h-5 w-6" />}
          active={pathname.includes('/get-started')}
        />
      </div>
      <div className="flex flex-col gap-1 px-2 py-4 text-sm flex-1">
        <div className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Database
        </div>
        {DatabaseNav.map((item) => (
          <NavLink
            key={item.sub}
            href={dbPath(server, database, item.sub)}
            label={item.name}
            icon={item.icon}
            active={pathname.includes(`/${item.sub}`)}
          />
        ))}

        <div className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          License
        </div>
        {LicenseNav.map((item) => (
          <NavLink
            key={item.sub}
            href={dbPath(server, database, item.sub)}
            label={item.name}
            icon={item.icon}
            active={pathname.includes(`/${item.sub}`)}
          />
        ))}
      </div>
    </aside>
  )
}

/**
 * Dashboard chrome (sidebar) for /[server]/[database] routes. Activates the
 * server + database named in the URL and guards access: redirects to the
 * servers list if the server is unknown, or to the databases list if the
 * database isn't valid for the active server.
 */
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams<{ server: string; database: string }>()
  const server = params?.server ? decodeURIComponent(params.server) : ''
  const database = params?.database ? decodeURIComponent(params.database) : ''

  const { databases, selectedDatabase, loading } = useSelectedDatabase()
  const { servers, loaded } = useServersStore()
  const known = servers.some((s) => s.name === server)

  // Point the API client at the server + select the database from the URL.
  useEffect(() => {
    if (!loaded) return
    if (!known) {
      router.replace('/')
      return
    }
    useServersStore.getState().setActiveServer(server)
    if (database) useSelectedDatabaseStore.getState().selectDatabase(database)
    useSelectedDatabaseStore.getState().refreshDatabases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, database, known, loaded])

  // Once databases are loaded, ensure the URL database actually exists.
  useEffect(() => {
    if (loading) return
    if (database && databases.length > 0 && !databases.some((d) => d.db_name === database)) {
      router.replace(serverPath(server))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, databases, database, server])

  const ready = loaded && known && selectedDatabase === database

  if (!ready) {
    return (
      <main className="flex-1 flex items-center justify-center bg-card-background dark:bg-slate-800">
        <div className="text-slate-600 dark:text-slate-300">Loading…</div>
      </main>
    )
  }

  return (
    <div className="flex flex-row flex-1 overflow-hidden">
      <Sidebar server={server} database={database} />
      <main className="flex-1 overflow-auto flex flex-col items-center bg-card-background dark:bg-slate-800">
        <div className="p-6 w-[95%]">{children}</div>
      </main>
    </div>
  )
}
