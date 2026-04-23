import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoArrowLeft, GoSearch, GoTrash, GoPencil } from 'react-icons/go';
import { api } from '../api/client';
import type { IndexDescription } from '../api/client';
import type { VectorInfo } from 'endee';
import Notification from '../components/Notification';
import { BarLoader } from 'react-spinners';

export default function VectorGetPage() {
    const { indexName } = useParams<{ indexName: string }>();
    const navigate = useNavigate();
    const [indexInfo, setIndexInfo] = useState<IndexDescription | null>(null);
    const [vectorId, setVectorId] = useState('');
    const [searching, setSearching] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [result, setResult] = useState<VectorInfo | null>(null);

    // Update filter modal state
    const [showUpdateFilterModal, setShowUpdateFilterModal] = useState(false);
    const [filterInput, setFilterInput] = useState('');
    const [updatingFilter, setUpdatingFilter] = useState(false);
    const [updateFilterError, setUpdateFilterError] = useState<string | null>(null);

    const isHybrid = indexInfo?.isHybrid;

    useEffect(() => {
        if (indexName) {
            loadIndexInfo();
        }
    }, [indexName]);

    const loadIndexInfo = async () => {
        if (!indexName) return;
        try {
            const response = await api.getIndexInfo(indexName);
            if (response.success && response.data) {
                setIndexInfo(response.data);
            }
        } catch (err) {
            console.error('Failed to load index info:', err);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setResult(null);

        if (!indexName) return;

        if (!vectorId.trim()) {
            setError('Vector ID is required');
            return;
        }

        setSearching(true);
        try {
            const response = await api.getVector(indexName, { id: vectorId.trim() });

            if (!response.success) {
                throw new Error(response.error || 'Failed to get vector');
            }

            setResult(response.data!);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get vector');
        } finally {
            setSearching(false);
        }
    };

    const handleDeleteById = async () => {
        if (!indexName || !result) return;

        setDeleting(true);
        setError(null);
        try {
            const response = await api.deleteVectorById(indexName, result.id);

            if (!response.success) {
                throw new Error(response.error || 'Failed to delete vector');
            }

            setSuccess(`Vector "${result.id}" deleted successfully`);
            setResult(null);
            setVectorId('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete vector');
        } finally {
            setDeleting(false);
        }
    };

    const openUpdateFilterModal = () => {
        setFilterInput(result?.filter ? JSON.stringify(result.filter, null, 2) : '{}');
        setUpdateFilterError(null);
        setShowUpdateFilterModal(true);
    };

    const handleUpdateFilter = async () => {
        if (!indexName || !result) return;

        setUpdatingFilter(true);
        setUpdateFilterError(null);

        try {
            const parsedFilter = JSON.parse(filterInput);
            const response = await api.updateFilters(indexName, [
                { id: result.id, filter: parsedFilter },
            ]);

            if (!response.success) {
                throw new Error(response.error || 'Failed to update filter');
            }

            // Refresh the vector data
            const refreshResponse = await api.getVector(indexName, { id: result.id });
            if (refreshResponse.success && refreshResponse.data) {
                setResult(refreshResponse.data);
            }

            setShowUpdateFilterModal(false);
            setSuccess(`Filter updated for vector "${result.id}"`);
        } catch (err) {
            if (err instanceof SyntaxError) {
                setUpdateFilterError('Invalid JSON format');
            } else {
                setUpdateFilterError(
                    err instanceof Error ? err.message : 'Failed to update filter',
                );
            }
        } finally {
            setUpdatingFilter(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(`/indexes/${indexName}`)}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
                >
                    <GoArrowLeft className="w-5 h-5" />
                    Back to {indexName}
                </button>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                        Get & Delete Vectors
                    </h1>
                    {isHybrid && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                            Hybrid Index
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Retrieve and manage vectors in "{indexName}"
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <Notification
                    type="success"
                    message={success}
                    onDismiss={() => setSuccess(null)}
                    className="mb-6"
                />
            )}

            {/* Error Message */}
            {error && (
                <Notification
                    type="error"
                    message={error}
                    onDismiss={() => setError(null)}
                    className="mb-6"
                />
            )}

            {/* Get Vector Form */}
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                    Get Vector by ID
                </h3>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                            Vector ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={vectorId}
                            onChange={(e) => setVectorId(e.target.value)}
                            placeholder="e.g., vec_001"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={searching}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={searching}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        <GoSearch className="w-4 h-4" />
                        {searching ? 'Searching...' : 'Get Vector'}
                    </button>
                </form>
            </div>

            {/* Result */}
            {result && (
                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 mb-6">
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-200">
                        <div className="flex gap-4">
                            <span className="font-medium text-slate-500 dark:text-slate-400 uppercase shrink-0">
                                ID
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                {result.id}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={openUpdateFilterModal}
                                disabled={deleting || updatingFilter}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            >
                                <GoPencil className="w-4 h-4" />
                                Update Filter
                            </button>
                            <button
                                onClick={handleDeleteById}
                                disabled={deleting}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-red-600 text-red-600 rounded-md hover:bg-red-500 dark:hover:bg-red-500 hover:text-white transition-colors disabled:bg-red-400"
                            >
                                <GoTrash className="w-4 h-4" />
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-4 text-sm">
                        {result.meta && Object.keys(result.meta).length > 0 && (
                            <div className="flex gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">
                                    Meta
                                </span>
                                <pre className="text-slate-700 dark:text-slate-300 text-xs overflow-x-auto">
                                    {JSON.stringify(result.meta, null, 2)}
                                </pre>
                            </div>
                        )}

                        {result.filter && (
                            <div className="flex gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">
                                    Filter
                                </span>
                                <code className="text-slate-700 dark:text-slate-300 text-xs">
                                    {JSON.stringify(result.filter, null, 2)}
                                </code>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">
                                Norm
                            </span>
                            <code className="text-slate-700 dark:text-slate-300 text-xs">
                                {result.norm.toFixed(6)}
                            </code>
                        </div>

                        <div className="flex gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">
                                Vector
                            </span>
                            <code className="text-slate-700 dark:text-slate-300 text-xs">
                                [
                                {result.vector
                                    .slice(0, 10)
                                    .map((v) => v.toFixed(4))
                                    .join(', ')}
                                {result.vector.length > 10 && `, ... (${result.vector.length})`}]
                            </code>
                        </div>

                        {result.sparseIndices && result.sparseIndices.length > 0 && (
                            <div className="flex gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">
                                    Sparse Indices
                                </span>
                                <code className="text-slate-700 dark:text-slate-300 text-xs">
                                    [
                                    {result.sparseIndices
                                        .slice(0, 10)
                                        .map((idx) => `${idx}`)
                                        .join(', ')}
                                    {result.sparseIndices.length > 10 &&
                                        `, ... (${result.sparseIndices.length} terms)`}
                                    ]
                                </code>
                            </div>
                        )}
                        {result.sparseValues && result.sparseValues.length > 0 && (
                            <div className="flex gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-32 shrink-0">
                                    Sparse Values
                                </span>
                                <code className="text-slate-700 dark:text-slate-300 text-xs">
                                    [
                                    {result.sparseValues
                                        .slice(0, 10)
                                        .map((idx) => `${idx}`)
                                        .join(', ')}
                                    {result.sparseValues.length > 10 &&
                                        `, ... (${result.sparseValues.length} terms)`}
                                    ]
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Update Filter Modal */}
            {showUpdateFilterModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                            Update Filter
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Update filter for vector:{' '}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                {result?.id}
                            </span>
                        </p>

                        <div className="space-y-4">
                            {updateFilterError && (
                                <Notification type="error" message={updateFilterError} compact />
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Filter (JSON)
                                </label>
                                <textarea
                                    value={filterInput}
                                    onChange={(e) => setFilterInput(e.target.value)}
                                    placeholder='{"category": "ml", "score": 95}'
                                    rows={6}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            {updatingFilter ? (
                                <BarLoader color="#155dfc" />
                            ) : (
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowUpdateFilterModal(false)}
                                        disabled={updatingFilter}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateFilter}
                                        disabled={updatingFilter || !filterInput.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                                    >
                                        Update
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
