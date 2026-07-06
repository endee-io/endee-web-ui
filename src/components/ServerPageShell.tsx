'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { GoArrowLeft, GoShieldCheck, GoInfo } from 'react-icons/go'
import { serverPath, seg } from '../lib/routes'

/**
 * Chrome for server-level pages that don't require a selected database
 * (License, Info). Provides a back link to the databases list and a tab nav
 * between the server-level pages, so they stay reachable before any database
 * exists (e.g. when an expired license blocks database creation).
 */
export default function ServerPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const params = useParams<{ server: string }>()
  const server = params?.server ? decodeURIComponent(params.server) : ''

  const tabs = [
    { name: 'License', sub: 'license', icon: <GoShieldCheck className="w-4 h-4" /> },
    { name: 'Info', sub: 'info', icon: <GoInfo className="w-4 h-4" /> },
  ]

  return (
    <main className="flex-1 overflow-auto flex flex-col items-center bg-card-background dark:bg-slate-800">
      <div className="w-full max-w-3xl px-6 py-8">
        <Link
          href={serverPath(server)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4"
        >
          <GoArrowLeft className="w-4 h-4" />
          Databases
        </Link>

        <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
          {tabs.map((t) => {
            const active = pathname.endsWith(`/${t.sub}`)
            return (
              <Link
                key={t.sub}
                href={`/${seg(server)}/${t.sub}`}
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

        {children}
      </div>
    </main>
  )
}
