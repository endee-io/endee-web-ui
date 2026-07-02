'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoServer, GoArrowRight, GoPlus, GoTrash, GoUpload, GoDownload } from 'react-icons/go'
import { useServers } from '../context/ServersContext'
import { serverPath } from '../lib/routes'
import { useNotification } from '../context/NotificationContext'
import AddServerModal from '../components/AddServerModal'

export default function ServersPage() {
  const router = useRouter()
  const { mode, servers, removeServer, importServers } = useServers()
  const { showNotification } = useNotification()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAdd, setShowAdd] = useState(false)

  const independent = mode === 'independent'

  const connect = (name: string) => {
    router.push(serverPath(name))
  }

  const handleDelete = async (name: string) => {
    try {
      await removeServer(name)
      showNotification('success', `Removed server "${name}"`)
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to remove server')
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      await importServers(data)
      showNotification('success', 'Servers imported')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to import servers')
    }
  }

  const handleDownload = () => {
    // Streams the full servers.json (with tokens) through the export route.
    const a = document.createElement('a')
    a.href = '/api/servers/export'
    a.download = 'servers.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col items-center bg-card-background dark:bg-slate-800">
      <div className="w-full px-6 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Servers</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {independent ? 'Manage and choose a server to connect to.' : 'Choose a server to connect to.'}
            </p>
          </div>

          {independent && (
            <div className="flex items-center gap-2 shrink-0">
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <GoUpload className="w-4 h-4" /> Import
              </button>
              <button
                onClick={handleDownload}
                disabled={servers.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoDownload className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <GoPlus className="w-4 h-4" /> Add server
              </button>
            </div>
          )}
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            <GoServer className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <div className="text-slate-600 dark:text-slate-300 mb-1">No servers configured</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {independent ? 'Add a server or import a servers.json to get started.' : 'No server is configured for this deployment.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border bg-background border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">URL</th>
                  <th className="px-4 py-3 w-20" />
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
                      <div className="flex items-center justify-end gap-2">
                        {independent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(server.name)
                            }}
                            title="Remove server"
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <GoTrash className="w-4 h-4" />
                          </button>
                        )}
                        <GoArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors inline-block" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddServerModal onClose={() => setShowAdd(false)} onAdded={() => {}} />}
    </main>
  )
}
