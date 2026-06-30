'use client'

import { useRouter } from 'next/navigation'
import { GoServer, GoArrowRight } from 'react-icons/go'
import { useServers } from '../context/ServersContext'
import { serverPath } from '../lib/routes'

export default function ServersPage() {
  const router = useRouter()
  const { servers } = useServers()

  const connect = (name: string) => {
    router.push(serverPath(name))
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col items-center bg-card-background dark:bg-slate-800">
      <div className="w-full px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Servers</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Choose a server to connect to.
          </p>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            <GoServer className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <div className="text-slate-600 dark:text-slate-300 mb-1">No servers configured</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Add entries to <code>src/config/servers.json</code>.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border bg-background border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    URL
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => (
                  <tr
                    key={server.name}
                    onClick={() => connect(server.name)}
                    className="group border-b border-slate-100 dark:border-slate-700/60 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 shrink-0">
                          <GoServer className="w-4 h-4" />
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{server.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{server.url}</td>
                    <td className="px-4 py-3 text-right">
                      <GoArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
