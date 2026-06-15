import { useRef, useState } from 'react'
import { GoShieldCheck, GoCheck, GoX, GoUpload } from 'react-icons/go'
import { api } from '../api/client'

export default function LicensePage() {
    const [email, setEmail] = useState('')
    const [generateStatus, setGenerateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [generating, setGenerating] = useState(false)

    const [licenseContent, setLicenseContent] = useState('')
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
    const [activateStatus, setActivateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [activating, setActivating] = useState(false)
    const [licenseInfo, setLicenseInfo] = useState<{ plan_type?: string; end_date?: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const content = ev.target?.result as string
            setLicenseContent(content.trim())
            setUploadedFileName(file.name)
            setActivateStatus(null)
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const handleGenerate = async () => {
        if (!email) return
        setGenerating(true)
        setGenerateStatus(null)
        const result = await api.generateLicense(email)
        setGenerating(false)
        if (result.success) {
            setGenerateStatus({ type: 'success', message: result.data?.message || 'License sent to your email' })
        } else {
            setGenerateStatus({ type: 'error', message: result.error || 'Failed to generate license' })
        }
    }

    const handleActivate = async () => {
        if (!licenseContent.trim()) return
        setActivating(true)
        setActivateStatus(null)
        const result = await api.activateLicense(licenseContent.trim())
        setActivating(false)
        if (result.success) {
            setActivateStatus({ type: 'success', message: result.data?.message || 'License activated successfully' })
            const info = await api.getInfo()
            if (info.success && info.data?.license) {
                setLicenseInfo({ plan_type: info.data.license.plan_type, end_date: info.data.license.end_date })
            }
        } else {
            setActivateStatus({ type: 'error', message: result.error || 'Failed to activate license' })
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <GoShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">License</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                    Generate your free trial license and activate it to unlock all features.
                </p>
            </div>

            {/* Step 1 — Generate */}
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Generate License</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Enter your email address. Your license will be sent to you within seconds.
                </p>
                <div className="flex gap-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        placeholder="you@example.com"
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !email}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors"
                    >
                        {generating ? 'Sending...' : 'Generate License'}
                    </button>
                </div>
                {generateStatus && (
                    <div className={`mt-3 flex items-start gap-2 text-sm ${generateStatus.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {generateStatus.type === 'success'
                            ? <GoCheck className="w-4 h-4 mt-0.5 shrink-0" />
                            : <GoX className="w-4 h-4 mt-0.5 shrink-0" />}
                        <span>{generateStatus.message}</span>
                    </div>
                )}
            </div>

            {/* Step 2 — Activate */}
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Activate License</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Paste the content of your <code className="bg-slate-100 dark:bg-slate-600 px-1 rounded text-xs">license.lic</code> file, or upload it directly.
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".lic"
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <GoUpload className="w-4 h-4" />
                        Upload license.lic
                    </button>
                    {uploadedFileName && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{uploadedFileName}</span>
                    )}
                </div>
                <textarea
                    value={licenseContent}
                    onChange={(e) => { setLicenseContent(e.target.value); setUploadedFileName(null); }}
                    placeholder="Or paste license.lic content here..."
                    rows={6}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                />
                <button
                    onClick={handleActivate}
                    disabled={activating || !licenseContent.trim()}
                    className="mt-3 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md transition-colors"
                >
                    {activating ? 'Activating...' : 'Activate License'}
                </button>
                {activateStatus && (
                    <div className={`mt-3 flex items-start gap-2 text-sm ${activateStatus.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {activateStatus.type === 'success'
                            ? <GoCheck className="w-4 h-4 mt-0.5 shrink-0" />
                            : <GoX className="w-4 h-4 mt-0.5 shrink-0" />}
                        <span>{activateStatus.message}</span>
                    </div>
                )}
                {activateStatus?.type === 'success' && licenseInfo && (
                    <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm space-y-1">
                        {licenseInfo.plan_type && <div className="text-slate-600 dark:text-slate-300"><span className="font-medium">Plan:</span> {licenseInfo.plan_type}</div>}
                        {licenseInfo.end_date && <div className="text-slate-600 dark:text-slate-300"><span className="font-medium">Valid until:</span> {licenseInfo.end_date} UTC</div>}
                    </div>
                )}
            </div>
        </div>
    )
}
