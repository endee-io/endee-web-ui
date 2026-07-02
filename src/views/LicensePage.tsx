'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoShieldCheck, GoUpload } from 'react-icons/go'
import { api } from '../api/client'
import Notification, { type NotificationType } from '../components/Notification'
import { dbPath, serverPath, useDbRoute } from '../lib/routes'

interface Feedback {
  type: NotificationType
  message: string
}

export default function LicensePage() {
  const router = useRouter()
  const { server, database } = useDbRoute()
  const infoPath = database ? dbPath(server, database, 'info') : `${serverPath(server)}/info`
  const [email, setEmail] = useState('')
  const [license, setLicense] = useState('')
  const [generating, setGenerating] = useState(false)
  const [activating, setActivating] = useState(false)
  const [genFeedback, setGenFeedback] = useState<Feedback | null>(null)
  const [actFeedback, setActFeedback] = useState<Feedback | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const message = `${(res.data?.message as string)}. Redirecting.`
      setActFeedback({ type: 'success', message })
      setTimeout(() => router.push(infoPath), 1000)
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <GoShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">License</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Generate your free trial license and activate it to unlock all features.
        </p>
      </div>

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
