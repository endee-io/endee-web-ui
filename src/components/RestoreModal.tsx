import { useState } from 'react';
import Notification from './Notification';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

type RestoreBackupParams = {
    restoreBackupName: string;
    closeRestoreBackupModal: () => void;
};

export default function RestoreBackupModal(params: RestoreBackupParams) {
    const [restoreTargetIndex, setRestoreTargetIndex] = useState('');
    const [restoring, setRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);

    const { token, handleUnauthorized } = useAuth();

    const navigate = useNavigate();

    const handleRestoreBackup = async () => {
        if (!params.restoreBackupName || !restoreTargetIndex.trim()) return;

        const indexNamePattern = /^(?=.{1,48}$)[a-zA-Z0-9_]+$/;
        if (!indexNamePattern.test(restoreTargetIndex)) {
            setRestoreError(
                'Invalid index name. Index name must be alphanumeric and can contain underscores and less than 48 characters',
            );
            return;
        }

        setRestoring(true);
        setRestoreError(null);
        try {
            const response = await fetch(
                `/api/v1/backups/${encodeURIComponent(params.restoreBackupName)}/restore`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { Authorization: token }),
                    },
                    body: JSON.stringify({ target_index_name: restoreTargetIndex.trim() }),
                },
            );

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    throw new Error('Authentication Token Required.');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to restore backup');
            }

            params.closeRestoreBackupModal();
            navigate('/backups');
        } catch (err) {
            setRestoreError(err instanceof Error ? err.message : 'Failed to restore backup');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Restore Backup
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Restoring backup:{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                        {params.restoreBackupName}
                    </span>
                </p>

                {restoreError && (
                    <Notification type="error" message={restoreError} compact className="mb-4" />
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Target Index Name
                    </label>
                    <input
                        type="text"
                        value={restoreTargetIndex}
                        onChange={(e) => setRestoreTargetIndex(e.target.value)}
                        placeholder="Name for the restored index"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        This will create a new index with the given name from the backup data.
                    </p>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                    <button
                        onClick={params.closeRestoreBackupModal}
                        disabled={restoring}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRestoreBackup}
                        disabled={restoring || !restoreTargetIndex.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {restoring ? 'Restoring...' : 'Restore'}
                    </button>
                </div>
            </div>
        </div>
    );
}
