'use client'

import { useEffect, useMemo, useState } from "react"
import { BarLoader } from "react-spinners"
import { api } from "../api/client"
import type { FieldDefinition, RebuildFieldSpec } from "../api/client"
import { typeLabel, typeBadge, fieldDimension } from "../lib/collectionFields"
import Notification from "./Notification"

type RebuildModalParams = {
    closeModal: () => void
    collectionName: string
    fields: FieldDefinition[]
}

/** Rebuild operates on dense fields only; sparse fields are skipped server-side. */
const isDense = (f: FieldDefinition) => f.type === "vector" || f.type === "multi_vector"

type FieldOverrides = {
    selected: boolean
    m: string
    efCon: string
}

export default function RebuildModal(params: RebuildModalParams) {
    const denseFields = useMemo(
        () => (params.fields ?? []).filter(isDense),
        [params.fields]
    )

    // Per-field selection + optional M / ef_con overrides, keyed by field name.
    const [overrides, setOverrides] = useState<Record<string, FieldOverrides>>(() =>
        Object.fromEntries(
            denseFields.map((f) => [f.name, { selected: true, m: "", efCon: "" }])
        )
    )

    const [rebuilding, setRebuilding] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Status polled from rebuildStatus() once a rebuild is kicked off.
    const [status, setStatus] = useState<Record<string, unknown> | null>(null)
    const [polling, setPolling] = useState(false)

    const setField = (name: string, patch: Partial<FieldOverrides>) =>
        setOverrides((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }))

    const selectedNames = denseFields.filter((f) => overrides[f.name]?.selected)
    const canRebuild = selectedNames.length > 0 && !rebuilding

    // Poll rebuild status while a rebuild is in flight.
    useEffect(() => {
        if (!polling) return
        let cancelled = false
        const tick = async () => {
            const res = await api.rebuildStatus(params.collectionName)
            if (cancelled) return
            if (res.success) {
                setStatus(res.data ?? null)
                const inProgress = Boolean(
                    (res.data as { in_progress?: boolean })?.in_progress
                )
                if (!inProgress) setPolling(false)
            } else {
                setPolling(false)
            }
        }
        tick()
        const id = setInterval(tick, 1500)
        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [polling, params.collectionName])

    const handleRebuild = async () => {
        if (selectedNames.length === 0) return
        setRebuilding(true)
        setError(null)
        try {
            const specs: RebuildFieldSpec[] = selectedNames.map((f) => {
                const o = overrides[f.name]
                const spec: RebuildFieldSpec = { field: f.name }
                if (o.m.trim() !== "") spec.m = Number(o.m)
                if (o.efCon.trim() !== "") spec.efCon = Number(o.efCon)
                return spec
            })
            const response = await api.rebuild(params.collectionName, specs)
            if (!response.success) {
                throw new Error(response.error || "Failed to start rebuild")
            }
            // Kick off status polling so the user sees progress.
            setPolling(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start rebuild")
        } finally {
            setRebuilding(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Rebuild Collection
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Rebuild the HNSW graph for one or more dense fields of{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                        {params.collectionName}
                    </span>
                    . Leave M / ef_con blank to keep the field&apos;s current values.
                </p>

                <div className="space-y-4">
                    {error && <Notification type="error" message={error} compact />}

                    {denseFields.length === 0 ? (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            This collection has no dense fields to rebuild.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {denseFields.map((field) => {
                                const o = overrides[field.name]
                                const dim = fieldDimension(field)
                                return (
                                    <div
                                        key={field.name}
                                        className="rounded-md border border-slate-200 dark:border-slate-600 p-3"
                                    >
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={o?.selected ?? false}
                                                onChange={(e) =>
                                                    setField(field.name, { selected: e.target.checked })
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {field.name}
                                            </span>
                                            <span
                                                className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge(field.type)}`}
                                            >
                                                {typeLabel(field.type)}
                                            </span>
                                            {dim != null && (
                                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                                    {dim}d
                                                </span>
                                            )}
                                        </label>

                                        {o?.selected && (
                                            <div className="grid grid-cols-2 gap-3 mt-3 pl-6">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        M
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={o.m}
                                                        onChange={(e) =>
                                                            setField(field.name, { m: e.target.value })
                                                        }
                                                        placeholder="keep current"
                                                        className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        ef_con
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={o.efCon}
                                                        onChange={(e) =>
                                                            setField(field.name, { efCon: e.target.value })
                                                        }
                                                        placeholder="keep current"
                                                        className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {(polling || status) && (
                        <div className="rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                {polling && (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {polling ? "Rebuild in progress…" : "Rebuild status"}
                            </div>
                            {status && (
                                <pre className="mt-2 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-all">
                                    {JSON.stringify(status, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    {rebuilding ? (
                        <BarLoader color="#155dfc" />
                    ) : (
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={params.closeModal}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                            >
                                {polling ? "Close" : "Cancel"}
                            </button>
                            {!polling && (
                                <button
                                    onClick={handleRebuild}
                                    disabled={!canRebuild}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                                >
                                    Rebuild
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
