import { useEffect, useState } from "react";
import { BarLoader } from "react-spinners";
import { api, type Index } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import Notification from "./Notification";

type CreateBackupParams = {
    closeBackupModal: () => void;
    indexName?: string;
}

export default function CreateBackupModal(params: CreateBackupParams) {
    // Backup modal state
    const [backupName, setBackupName] = useState('')
    const [creatingBackup, setCreatingBackup] = useState(false)
    const [backupError, setBackupError] = useState<string | null>(null)
    const [backupIndexName, setBackupIndexName] = useState('')

    // Indexes for dropdown
    const [indexes, setIndexes] = useState<Index[]>([])
    const [loadingIndexes, setLoadingIndexes] = useState(false)

    const { token, handleUnauthorized } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (params.indexName) {
            setBackupIndexName(params.indexName)
        } else {
            loadIndexes()
        }
    }, [])

    const loadIndexes = async () => {
        setLoadingIndexes(true)
        try {
            const response = await api.listIndexes()
            if (response.success && response.data) {
                setIndexes(response.data.indexes)
            } else {
                setIndexes([])
            }
        } catch {
            setIndexes([])
        } finally {
            setLoadingIndexes(false)
        }
    }

    const handleCreateBackup = async () => {
        if (!backupIndexName || !backupName.trim()) return

        setCreatingBackup(true)
        setBackupError(null)
        try {
            const response = await fetch(`/api/v1/index/${encodeURIComponent(backupIndexName)}/backup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: token })
                },
                body: JSON.stringify({ name: backupName.trim() })
            })

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized()
                    throw new Error("Authentication Token Required.")
                }
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to create backup')
            }

            params.closeBackupModal()
            navigate("/backups")
        } catch (err) {
            setBackupError(err instanceof Error ? err.message : 'Failed to create backup')
        } finally {
            setCreatingBackup(false)
        }
    }
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Create Backup</h3>
                <div className="space-y-4">

                    {backupError && (
                        <Notification type="error" message={backupError} compact />
                    )}

                    {params.indexName ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Creating backup for index: <span className="font-medium text-slate-800 dark:text-slate-200">{backupIndexName}</span>
                        </p>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Index Name
                            </label>
                            {loadingIndexes ? (
                                <div className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Loading indexes...
                                </div>
                            ) : (
                                <select
                                    value={backupIndexName}
                                    onChange={(e) => { setBackupIndexName(e.target.value) }}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select an index</option>
                                    {indexes.map((index) => (
                                        <option key={index.name} value={index.name}>
                                            {index.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {!loadingIndexes && indexes.length === 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    No indexes available. Create an index first.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Backup Name
                        </label>
                        <input
                            type="text"
                            value={backupName}
                            onChange={(e) => setBackupName(e.target.value)}
                            placeholder="Enter a name for the backup"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    {creatingBackup ? (
                        <BarLoader color='#155dfc' />
                    ) : (
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={params.closeBackupModal}
                                disabled={creatingBackup}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBackup}
                                disabled={creatingBackup || !backupName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                Create Backup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>)
}
