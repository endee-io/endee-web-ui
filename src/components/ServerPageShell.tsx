'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { GoArrowLeft } from 'react-icons/go'
import { serverPath } from '../lib/routes'

/**
 * Chrome for the server-level License page, which doesn't require a selected
 * database. Provides a back link to the databases list so the page stays
 * reachable before any database exists (e.g. when an expired license blocks
 * database creation).
 */
export default function ServerPageShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ server: string }>()
  const server = params?.server ? decodeURIComponent(params.server) : ''

  return (
    <main className="flex-1 overflow-auto flex flex-col items-center bg-card-background dark:bg-slate-800">
      <div className="w-full max-w-3xl px-6 py-8">
        <Link
          href={serverPath(server)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-6"
        >
          <GoArrowLeft className="w-4 h-4" />
          Databases
        </Link>

        {children}
      </div>
    </main>
  )
}
