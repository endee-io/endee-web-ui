'use client'

import { useEffect, useState } from 'react'
import { GoInfo, GoCopy, GoCheck } from 'react-icons/go'
import { api, type ServerInfo } from '../api/client'
import Notification from '../components/Notification'
import LicenseExpiryNudge from '../components/LicenseExpiryNudge'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-slate-800 dark:text-slate-100">{children}</div>
    </div>
  )
}

function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm break-all">{value}</span>
      <button
        onClick={copy}
        title="Copy"
        className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        {copied ? <GoCheck className="w-4 h-4 text-green-500" /> : <GoCopy className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function InfoPage() {
  const [info, setInfo] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await api.getInfo()
      if (cancelled) return
      if (res.success) {
        setInfo(res.data ?? null)
        setError(null)
      } else {
        setError(res.error || 'Failed to load server info.')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <GoInfo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Server Info</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          System details for this server.
        </p>
      </div>

      {/* Expiry nudge — reuses the license info already loaded below. */}
      <LicenseExpiryNudge license={info?.license ?? null} />

      {loading && <div className="text-slate-500 dark:text-slate-400">Loading…</div>}

      {!loading && error && (
        <Notification type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {!loading && !error && info && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-4">
            System
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Endee Server Version">{info.version || '—'}</Field>
            <Field label="Build Architecture">
              <span className="uppercase">{info.build_arch || '—'}</span>
            </Field>
            {info.machine_id && (
              <div className="sm:col-span-2">
                <Field label="Machine ID">
                  <CopyableId value={info.machine_id} />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
