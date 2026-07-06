'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GoShieldCheck, GoUpload, GoCopy, GoCheck, GoAlert } from 'react-icons/go'
import { api, type ServerInfo } from '../api/client'
import Notification, { type NotificationType } from '../components/Notification'

interface Feedback {
  type: NotificationType
  message: string
}

/** Colour + label for a license status value. */
function statusBadge(status?: string): { label: string; className: string } {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'valid':
      return {
        label: status!,
        className: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      }
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      }
    default:
      return {
        label: status || 'Not Activated',
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300',
      }
  }
}

/** Number of days before expiry at which we nudge the user to renew. */
const EXPIRY_NUDGE_DAYS = 7

/** Parse a license date string into a Date, or null if unparseable. */
function parseLicenseDate(value?: string): Date | null {
  if (!value) return null
  // License dates are UTC without a zone marker; append one so parsing is stable.
  const d = new Date(`${value.trim().replace(' ', 'T')}Z`)
  return isNaN(d.getTime()) ? null : d
}

/** Format a license date string as a date only (no time), e.g. "Jul 6, 2026". */
function formatDate(value?: string): string {
  const d = parseLicenseDate(value)
  if (!d || isNaN(d.getTime())) return value || '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Whole days from now until `value`; negative if already past. Null if unparseable. */
function daysUntil(value?: string): number | null {
  const d = parseLicenseDate(value)
  if (!d || isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

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

export default function LicensePage() {
  // Server + license info (loaded on mount, refreshed after activation).
  const [info, setInfo] = useState<ServerInfo | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState<string | null>(null)

  // Generate / activate form state.
  const [email, setEmail] = useState('')
  const [license, setLicense] = useState('')
  const [generating, setGenerating] = useState(false)
  const [activating, setActivating] = useState(false)
  const [genFeedback, setGenFeedback] = useState<Feedback | null>(null)
  const [actFeedback, setActFeedback] = useState<Feedback | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadInfo = useCallback(async () => {
    setInfoLoading(true)
    const res = await api.getInfo()
    if (res.success) {
      setInfo(res.data ?? null)
      setInfoError(null)
    } else {
      setInfoError(res.error || 'Failed to load server info.')
    }
    setInfoLoading(false)
  }, [])

  useEffect(() => {
    loadInfo()
  }, [loadInfo])

  async function handleGenerate() {
    if (!email.trim()) {
      setGenFeedback({ type: 'error', message: 'Please enter an email address.' })
      return
    }
    setGenerating(true)
    setGenFeedback(null)
    const res = await api.generateLicense(email.trim())
    setGenerating(false)
    if (res.success) {
      const message =
        (res.data?.message as string) ||
        'License generated. Check your inbox — it should arrive within seconds.'
      setGenFeedback({ type: 'success', message })
    } else {
      setGenFeedback({ type: 'error', message: res.error || 'Failed to generate license.' })
    }
  }

  async function handleActivate() {
    if (!license.trim()) {
      setActFeedback({ type: 'error', message: 'Paste your license content or upload a license.lic file.' })
      return
    }
    setActivating(true)
    setActFeedback(null)
    const res = await api.validateLicense(license.trim())
    setActivating(false)
    if (res.success) {
      setActFeedback({ type: 'success', message: (res.data?.message as string) || 'License activated.' })
      // Refresh the status card in place instead of navigating away.
      loadInfo()
    } else {
      setActFeedback({ type: 'error', message: res.error || 'Failed to activate license.' })
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setLicense(text.trim())
    setActFeedback(null)
    // Allow re-uploading the same file.
    e.target.value = ''
  }

  const licenseInfo = info?.license
  const badge = statusBadge(licenseInfo?.status)
  // Nudge when an active license is close to expiring (or already lapsed).
  const daysLeft = licenseInfo?.status && statusBadge(licenseInfo.status).label !== 'Expired'
    ? daysUntil(licenseInfo.end_date)
    : null
  const showExpiryNudge = daysLeft !== null && daysLeft <= EXPIRY_NUDGE_DAYS

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <GoShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">License</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          System details, the current license status, and tools to generate and activate a license.
        </p>
      </div>

      {/* Expiry nudge */}
      {showExpiryNudge && (
        <div className="flex items-start gap-3 mb-6 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20">
          <GoAlert className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {daysLeft! <= 0
                ? 'Your license has expired'
                : `Your license expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300/90 mt-0.5">
              Generate a new license below and activate it to avoid interruption
              {licenseInfo?.end_date ? ` (expires ${formatDate(licenseInfo.end_date)})` : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Server info + license status */}
      {infoLoading && <div className="text-slate-500 dark:text-slate-400 mb-6">Loading server info…</div>}

      {!infoLoading && infoError && (
        <Notification
          type="error"
          message={infoError}
          onDismiss={() => setInfoError(null)}
          className="mb-6"
        />
      )}

      {!infoLoading && !infoError && info && (
        <div className="space-y-6 mb-8">
          {/* System */}
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

          {/* License status */}
          <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                License Status
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            {licenseInfo && licenseInfo.status ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Plan Type">
                  <span className="capitalize">{licenseInfo.plan_type || '—'}</span>
                </Field>
                <Field label="License ID">
                  <span className="font-mono text-sm">{licenseInfo.license_id || '—'}</span>
                </Field>
                <Field label="Start Date">{formatDate(licenseInfo.start_date)}</Field>
                <Field label="End Date">{formatDate(licenseInfo.end_date)}</Field>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-300">
                No license activated. Use the steps below to generate and activate one.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 1 — Generate */}
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">
            1
          </span>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Generate License</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Enter your email address. Your license will be sent to you within seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !generating && handleGenerate()}
            placeholder="you@example.com"
            disabled={generating}
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {generating ? 'Generating…' : 'Generate License'}
          </button>
        </div>
        {genFeedback && (
          <Notification
            type={genFeedback.type}
            message={genFeedback.message}
            onDismiss={() => setGenFeedback(null)}
            className="mt-4"
          />
        )}
      </div>

      {/* Step 2 — Activate */}
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">
            2
          </span>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Activate License</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Paste the content of your <code className="text-xs bg-slate-100 dark:bg-slate-600 px-1 py-0.5 rounded">license.lic</code> file, or upload it directly.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".lic,text/plain"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={activating}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors mb-4"
        >
          <GoUpload className="w-4 h-4" />
          Upload license.lic
        </button>

        <textarea
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          placeholder="Or paste license.lic content here..."
          disabled={activating}
          rows={5}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />

        <button
          onClick={handleActivate}
          disabled={activating}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {activating ? 'Activating…' : 'Activate License'}
        </button>

        {actFeedback && (
          <Notification
            type={actFeedback.type}
            message={actFeedback.message}
            onDismiss={() => setActFeedback(null)}
            className="mt-4"
          />
        )}
      </div>
    </div>
  )
}
