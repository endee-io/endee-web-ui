import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoPlus, GoArchive } from 'react-icons/go';
import { api, isHybridIndex } from '../api/client';
import type { Index } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import CreateBackupModalFromIndex from '../components/CreateBackupModal';
import Notification from '../components/Notification';

export default function IndexesPage() {
    const [indices, setIndices] = useState<Index[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Backup modal state
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [backupIndexName, setBackupIndexName] = useState('');

    const { notification, clearNotification } = useNotification();

    useEffect(() => {
        loadIndices();
    }, []);

    const loadIndices = async () => {
        setLoading(true);
        try {
            const response = await api.listIndexes();

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch indices');
            }

            setIndices(response.data?.indexes || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load indices');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const openBackupModal = (indexName: string) => {
        setBackupIndexName(indexName);
        setShowBackupModal(true);
    };

    const closeBackupModal = () => {
        setShowBackupModal(false);
        setBackupIndexName('');
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                        Indexes
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Manage your vector indexes
                    </p>
                </div>

                {!loading && !error && indices.length !== 0 && (
                    <button
                        onClick={() => navigate('/indexes/create')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <GoPlus className="w-5 h-5" />
                        Create Index
                    </button>
                )}
            </div>

            {/* Notification */}
            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onDismiss={clearNotification}
                    className="mb-4"
                />
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-slate-600 dark:text-slate-300">Loading indices...</div>
                </div>
            )}

            {/* Error State */}
            {error && <Notification type="error" message={error} className="mb-4" />}

            {/* Empty State */}
            {!loading && !error && indices.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-slate-600 dark:text-slate-300 mb-4">No indexes found</div>
                    <button
                        onClick={() => navigate('/indexes/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Create your first index
                    </button>
                </div>
            )}

            {/* Indices List */}
            {!loading && !error && indices.length > 0 && (
                <div className="grid gap-4">
                    {indices.map((index, idx) => (
                        <div
                            key={idx}
                            className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <Link
                                    to={`/indexes/${index.name}`}
                                    className="flex items-center gap-3"
                                >
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                        {index.name}
                                    </h3>
                                    {isHybridIndex(index) ? (
                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                                            Hybrid
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                            Dense
                                        </span>
                                    )}
                                </Link>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openBackupModal(index.name)}
                                        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 rounded hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                                    >
                                        <GoArchive className="w-4 h-4" />
                                        Backup
                                    </button>
                                </div>
                            </div>

                            <Link to={`/indexes/${index.name}`}>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Created {formatDate(index.created_at)}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-600">
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                                            Dimension
                                        </div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                                            {index.dimension}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                                            Space Type
                                        </div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                                            {index.space_type}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                                            Precision
                                        </div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1 capitalize">
                                            {index.precision}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                                            Vectors
                                        </div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                                            {index.total_elements.toLocaleString()}
                                        </div>
                                    </div>
                                    {isHybridIndex(index) && (
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                                                Sparse Model
                                            </div>
                                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                                                {index.sparseModel}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Backup Modal */}
            {showBackupModal && (
                <CreateBackupModalFromIndex
                    closeBackupModal={closeBackupModal}
                    indexName={backupIndexName}
                />
            )}
        </div>
    );
}
