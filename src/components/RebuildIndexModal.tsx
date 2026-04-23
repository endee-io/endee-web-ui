import { useState } from 'react';
import { BarLoader } from 'react-spinners';
import { api } from '../api/client';
import Notification from './Notification';

type RebuildIndexModalProps = {
    closeModal: () => void;
    indexName: string;
    currentM: number;
    currentEfCon: number;
    onRebuildStarted?: () => void;
};

export default function RebuildIndexModal({
    closeModal,
    indexName,
    currentM,
    currentEfCon,
    onRebuildStarted,
}: RebuildIndexModalProps) {
    const [newM, setNewM] = useState(String(currentM));
    const [newEfCon, setNewEfCon] = useState(String(currentEfCon));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mVal = parseInt(newM, 10);
    const efConVal = parseInt(newEfCon, 10);

    const mChanged = mVal !== currentM;
    const efConChanged = efConVal !== currentEfCon;

    const mInvalid = isNaN(mVal) || mVal < 4 || mVal > 512;
    const efConInvalid = isNaN(efConVal) || efConVal < 8 || efConVal > 4096;
    const noChanges = !mChanged && !efConChanged;
    const canSubmit = !mInvalid && !efConInvalid && !noChanges;

    const handleRebuild = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const options: { M?: number; efCon?: number } = {};
            if (mChanged) options.M = mVal;
            if (efConChanged) options.efCon = efConVal;

            const response = await api.rebuildIndex(indexName, options);
            if (!response.success) {
                throw new Error(response.error || 'Failed to start rebuild');
            }
            // Rebuild accepted by server — close modal immediately, page handles polling
            onRebuildStarted?.();
            closeModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start rebuild');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Rebuild Index
                </h3>

                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Rebuild the HNSW graph for{' '}
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {indexName}
                        </span>{' '}
                        with new parameters. At least one value must change.
                    </p>

                    {error && <Notification type="error" message={error} compact />}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            M{' '}
                            <span className="font-normal text-slate-500 dark:text-slate-400">
                                (4 – 512)
                            </span>
                        </label>
                        <input
                            type="number"
                            value={newM}
                            onChange={(e) => setNewM(e.target.value)}
                            disabled={submitting}
                            min={4}
                            max={512}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        />
                        {mInvalid && newM !== '' && (
                            <p className="text-xs text-red-500 mt-1">Must be between 4 and 512</p>
                        )}
                        {mChanged && !mInvalid && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Current: {currentM}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            ef_construction{' '}
                            <span className="font-normal text-slate-500 dark:text-slate-400">
                                (8 – 4096)
                            </span>
                        </label>
                        <input
                            type="number"
                            value={newEfCon}
                            onChange={(e) => setNewEfCon(e.target.value)}
                            disabled={submitting}
                            min={8}
                            max={4096}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        />
                        {efConInvalid && newEfCon !== '' && (
                            <p className="text-xs text-red-500 mt-1">Must be between 8 and 4096</p>
                        )}
                        {efConChanged && !efConInvalid && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Current: {currentEfCon}
                            </p>
                        )}
                    </div>

                    {noChanges && !submitting && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Change at least one parameter to start a rebuild.
                        </p>
                    )}

                    <div className="flex justify-end mt-6">
                        {submitting ? (
                            <BarLoader color="#155dfc" />
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRebuild}
                                    disabled={!canSubmit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                                >
                                    Start Rebuild
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
