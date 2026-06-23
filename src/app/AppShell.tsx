'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoRocketOutline } from "react-icons/io5"
import { GoDatabase, GoServer, GoSun, GoMoon, GoBook, GoLinkExternal, GoArchive } from 'react-icons/go'
import { useTheme } from '../useTheme'
import Select from '../components/Select'
import {
  SelectedDatabaseProvider,
  useSelectedDatabase,
} from '../context/SelectedDatabaseContext'
import { NotificationProvider } from '../context/NotificationContext'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
}

// Section 1: getting started + database management.
const GeneralNav: NavItem[] = [
  { name: "Welcome", href: "/", icon: <IoRocketOutline className='h-6 w-6' /> },
  { name: "Databases", href: "/databases", icon: <GoServer className='h-5 w-6' /> },
]

// Section 2: scoped to the selected database.
const DatabaseNav: NavItem[] = [
  { name: "Collections", href: "/indexes", icon: <GoDatabase className='h-5 w-6' /> },
  { name: "Backups", href: "/backups", icon: <GoArchive className='h-5 w-6' /> },
  { name: "Tutorials", href: "/tutorials", icon: <GoBook className='h-5 w-6' /> },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  return (
    <Link
      href={item.href}
      className={
        `flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${isActive
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-gray-200 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-secondary dark:hover:bg-slate-800 dark:hover:text-gray-300 hover:text-secondary-fg'
        }`
      }
    >
      <span>{item.icon}</span>
      <span className='text-sm'>{item.name}</span>
    </Link>
  )
}

function Sidebar() {
  const [theme, setTheme] = useTheme();
  const pathname = usePathname() ?? '';

  return (
    <aside className='text-black dark:text-white w-60 border-r border-border dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full'>
      <div className='flex items-center gap-2 py-4 px-6 border-b border-border dark:border-slate-800 h-16'>
        <img src="/endee-logo.svg" className='h-8' alt="Endee" />
        <span className='text-2xl'>Endee</span>
      </div>

      <div className="flex flex-col gap-1 px-2 py-4 text-sm flex-1">
        {/* Section 1: General */}
        <div className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Getting Started
        </div>
        {GeneralNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {/* Section 2: Database-scoped */}
        <div className="mt-4 pt-4 border-t border-border dark:border-slate-800 px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Database
        </div>
        {DatabaseNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      {/* Footer Links */}
      <div className='border-t border-border dark:border-slate-800 px-2 py-4 space-y-1'>
        <a
          href="https://docs.endee.io"
          target="_blank"
          rel="noopener noreferrer"
          className='w-full flex items-center gap-3 px-4 py-3 rounded-sm text-slate-600 dark:text-slate-400 hover:bg-secondary dark:hover:bg-slate-800 dark:hover:text-gray-300 hover:text-secondary-fg'
        >
          <GoLinkExternal className='h-5 w-5' />
          <span className='text-sm'>Documentation</span>
        </a>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className='w-full flex items-center gap-3 px-4 py-3 rounded-sm text-slate-600 dark:text-slate-400 hover:bg-secondary dark:hover:bg-slate-800 dark:hover:text-gray-300 hover:text-secondary-fg'
        >
          {theme === "light" ? (
            <>
              <GoSun className='h-5 w-5' />
              <span className='text-sm'>Light Mode</span>
            </>
          ) : (
            <>
              <GoMoon className='h-5 w-5' />
              <span className='text-sm'>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

function DatabaseSelector() {
  const { databases, selectedDatabase, loading, selectDatabase } = useSelectedDatabase()

  const placeholder = loading
    ? 'Loading…'
    : databases.length === 0
      ? 'No databases'
      : 'Select a database'

  return (
    <Select
      value={selectedDatabase ?? ''}
      options={databases.map((db) => ({ value: db.username, label: db.username }))}
      onChange={selectDatabase}
      disabled={loading || databases.length === 0}
      placeholder={placeholder}
      icon={<GoServer className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
      className="min-w-52"
    />
  )
}

function Header() {
  return (
    <div className='flex items-center justify-between py-4 px-6 border-b border-border dark:border-slate-800 dark:bg-slate-900 dark:text-white h-16'>
      <div className='flex items-center gap-4'>
        <DatabaseSelector />
      </div>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SelectedDatabaseProvider>
      <NotificationProvider>
        <div className='flex flex-row h-screen bg-background dark:bg-slate-800'>
          <Sidebar />

          <main className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <div className='bg-card-background dark:bg-slate-800 flex-1 overflow-auto flex flex-col items-center'>
              <div className="p-6 w-[95%]">
                {children}
              </div>
            </div>
          </main>

          <footer></footer>
        </div>
      </NotificationProvider>
    </SelectedDatabaseProvider>
  )
}
