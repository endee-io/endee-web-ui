import { useEffect, useState } from 'react'
import { GoCopy, GoCheck } from 'react-icons/go'
import { api } from '../api/client'

type InfoData = {
    version: string
    build_arch: string
    machine_id?: string
    license?: {
        status: 'active' | 'expired' | 'not_activated'
        license_id?: string
        plan_type?: string
        start_date?: string
        end_date?: string
    }
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
            <span className="text-sm font-mono text-gray-800 break-all">{value}</span>
        </div>
    )
}

function MachineIdField({ value }: { value: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(value)
        } else {
            const el = document.createElement('textarea')
            el.value = value
            el.style.position = 'fixed'
            el.style.opacity = '0'
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Machine ID</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-800 truncate flex-1">{value}</span>
                <button
                    onClick={handleCopy}
                    className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Copy Machine ID"
                >
                    {copied ? <GoCheck className="w-4 h-4 text-green-500" /> : <GoCopy className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: 'active' | 'expired' | 'not_activated' }) {
    const styles = {
        active: 'bg-green-100 text-green-700',
        expired: 'bg-red-100 text-red-700',
        not_activated: 'bg-gray-100 text-gray-600',
    }
    const labels = {
        active: 'Active',
        expired: 'Expired',
        not_activated: 'Not Activated',
    }
    return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    )
}

export default function InfoPage() {
    const [info, setInfo] = useState<InfoData | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        api.getInfo().then(res => {
            if (res.success && res.data) setInfo(res.data)
            else setError(res.error || 'Failed to load info')
        })
    }, [])

    if (error) {
        return (
            <div className="p-6 text-red-600 text-sm">{error}</div>
        )
    }

    if (!info) {
        return (
            <div className="p-6 text-gray-400 text-sm">Loading...</div>
        )
    }

    return (
        <div className="p-6 max-w-2xl space-y-6">
            <h1 className="text-xl font-semibold text-gray-900">Server Info</h1>

            <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">System</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Endee Server Version" value={info.version} />
                    <Field label="Build Architecture" value={info.build_arch.toUpperCase()} />
                    {info.machine_id && <MachineIdField value={info.machine_id} />}
                </div>
            </section>

            {info.license && (
                <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">License</h2>
                        <StatusBadge status={info.license.status} />
                    </div>
                    {info.license.status === 'not_activated' ? (
                        <p className="text-sm text-gray-500">No license activated. Go to the License page to generate and activate one.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {info.license.license_id && <Field label="License ID" value={info.license.license_id} />}
                            {info.license.plan_type && <Field label="Plan" value={info.license.plan_type} />}
                            {info.license.start_date && <Field label="Start Date" value={info.license.start_date + ' UTC'} />}
                            {info.license.end_date && <Field label="End Date" value={info.license.end_date + ' UTC'} />}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}
