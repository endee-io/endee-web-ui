import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoArrowLeft, GoSearch, GoChevronDown, GoChevronRight } from 'react-icons/go';
import { api } from '../api/client';
import type { QueryResult } from '../api/client';
import Tooltip from '../components/Tooltip';
import type { IndexDescription } from 'endee';
import Notification from '../components/Notification';

export default function SearchPage() {
    const { indexName } = useParams<{ indexName: string }>();
    const navigate = useNavigate();
    const [indexInfo, setIndexInfo] = useState<IndexDescription | null>(null);
    const [loadingIndex, setLoadingIndex] = useState(true);
    const [vector, setVector] = useState('');
    const [sparseIndices, setSparseIndices] = useState('');
    const [sparseValues, setSparseValues] = useState('');
    const [k, setK] = useState('5');
    const [ef, setEf] = useState('');
    const [filter, setFilter] = useState('');
    const [includeVectors, setIncludeVectors] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<QueryResult[] | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const isHybrid = indexInfo?.isHybrid;

    useEffect(() => {
        if (indexName) {
            loadIndexInfo();
        }
    }, [indexName]);

    const loadIndexInfo = async () => {
        if (!indexName) return;
        setLoadingIndex(true);
        try {
            const response = await api.getIndexInfo(indexName);
            if (response.success && response.data) {
                setIndexInfo(response.data);
            }
        } catch (err) {
            console.error('Failed to load index info:', err);
        } finally {
            setLoadingIndex(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResults(null);

        if (!indexName) return;

        try {
            const vectorArray = JSON.parse(`[${vector}]`);
            if (!Array.isArray(vectorArray) || vectorArray.length === 0) {
                throw new Error('Vector must be a non-empty array of numbers');
            }

            const kValue = parseInt(k);
            if (isNaN(kValue) || kValue <= 0) {
                throw new Error('K must be a positive number');
            }

            // Build search request
            const searchRequest: {
                vector: number[];
                k: number;
                ef?: number;
                filter?: string;
                include_vectors?: boolean;
                sparse_indices?: number[];
                sparse_values?: number[];
            } = {
                vector: vectorArray,
                k: kValue,
                include_vectors: includeVectors,
            };

            // Add ef parameter if provided
            if (ef.trim()) {
                const efValue = parseInt(ef);
                if (!isNaN(efValue) && efValue > 0) {
                    searchRequest.ef = efValue;
                }
            }

            // Add filter if provided (pass as JSON string)
            if (filter.trim()) {
                // Validate it's valid JSON first
                try {
                    JSON.parse(filter);
                    searchRequest.filter = filter.trim();
                } catch {
                    throw new Error('Filter must be valid JSON');
                }
            }

            // Add sparse vectors for hybrid indexes
            if (isHybrid) {
                if (sparseIndices.trim()) {
                    searchRequest.sparse_indices = JSON.parse(`[${sparseIndices}]`);
                }
                if (sparseValues.trim()) {
                    searchRequest.sparse_values = JSON.parse(`[${sparseValues}]`);
                }

                // Validate sparse arrays have same length if both provided
                if (searchRequest.sparse_indices && searchRequest.sparse_values) {
                    if (
                        searchRequest.sparse_indices.length !== searchRequest.sparse_values.length
                    ) {
                        throw new Error('Sparse indices and values must have the same length');
                    }
                } else if (searchRequest.sparse_indices || searchRequest.sparse_values) {
                    throw new Error(
                        'Both sparse indices and sparse values must be provided together',
                    );
                }
            }

            setSearching(true);
            const response = await api.searchVectors(indexName, searchRequest);

            if (!response.success) {
                throw new Error(response.error || 'Search failed');
            }

            setResults(response.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setSearching(false);
        }
    };

    if (loadingIndex) {
        return (
            <div className="p-6">
                <div className="flex justify-center items-center py-12">
                    <div className="text-slate-600 dark:text-slate-300">
                        Loading index information...
                    </div>
                </div>
            </div>
        );
    }

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
                        Search Vectors
                    </h1>
                    {isHybrid && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                            Hybrid Index
                        </span>
                    )}
                </div>
            </div>

            {/* Search Form */}
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
                <form onSubmit={handleSearch} className="space-y-4">
                    {/* Dense Vector Input */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                Dense Query Vector <span className="text-red-500">*</span>
                            </label>
                            <Tooltip
                                tip={`Comma-separated numbers (${indexInfo?.dimension ? indexInfo.dimension : 'n'} dimensions)`}
                            />
                        </div>
                        <input
                            type="text"
                            value={vector}
                            onChange={(e) => setVector(e.target.value)}
                            placeholder={`e.g., 0.1, 0.2, 0.3, ... (${indexInfo?.dimension || 'n'} dimensions)`}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            disabled={searching}
                        />
                    </div>

                    {/* Sparse Vector Input - Only for Hybrid Indexes */}
                    {isHybrid && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                            <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-3">
                                Sparse Query Vector (Optional)
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                        Sparse Indices
                                    </label>
                                    <input
                                        type="text"
                                        value={sparseIndices}
                                        onChange={(e) => setSparseIndices(e.target.value)}
                                        placeholder="e.g., 10, 50, 100, 500"
                                        className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        disabled={searching}
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        With respect to your sparse model {indexInfo?.sparseModel}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                        Sparse Values
                                    </label>
                                    <input
                                        type="text"
                                        value={sparseValues}
                                        onChange={(e) => setSparseValues(e.target.value)}
                                        placeholder="e.g., 0.8, 0.5, 0.3, 0.1"
                                        className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        disabled={searching}
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Values at corresponding indices
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search Parameters */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Number of Results (k) <span className="text-red-500">*</span>
                                </label>
                                <Tooltip tip="Top k results out of all the nearest neighbours." />
                            </div>
                            <input
                                type="number"
                                value={k}
                                onChange={(e) => setK(e.target.value)}
                                min="1"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={searching}
                            />
                        </div>

                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeVectors}
                                    onChange={(e) => setIncludeVectors(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                                    disabled={searching}
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-200">
                                    Include vectors in results (dense only)
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Filter Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                            Filters (Optional)
                        </label>
                        <textarea
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder='e.g., [{"category": {"$eq":"tech"}}, {"year": {"$in": [2020,2024]}}]'
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            disabled={searching}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            JSON array for filtering results by metadata
                        </p>
                    </div>

                    {/* Advanced Options Dropdown */}
                    <div className="border border-slate-200 dark:border-slate-600 rounded-md">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors rounded-md"
                        >
                            <span>Advanced Options</span>
                            {showAdvanced ? (
                                <GoChevronDown className="w-4 h-4" />
                            ) : (
                                <GoChevronRight className="w-4 h-4" />
                            )}
                        </button>

                        {showAdvanced && (
                            <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-600">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                        ef (Search Depth)
                                    </label>
                                    <input
                                        type="number"
                                        value={ef}
                                        onChange={(e) => setEf(e.target.value)}
                                        min="1"
                                        placeholder="Default: auto"
                                        className="w-full md:w-64 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={searching}
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Higher values = more accurate results but slower search
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && <Notification type="error" message={error} />}

                    <button
                        type="submit"
                        disabled={searching}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        <GoSearch className="w-4 h-4" />
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* Results */}
            {results !== null && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                        Results ({results.length})
                    </h2>

                    {results.length === 0 ? (
                        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 text-center text-slate-600 dark:text-slate-300">
                            No results found
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {results.map((result, index) => (
                                <div
                                    key={result.id}
                                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4"
                                >
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                #{index + 1}
                                            </span>
                                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                                {result.id}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                sim: {result.similarity.toFixed(4)}
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500">
                                                |
                                            </span>
                                            <span className="text-slate-500 dark:text-slate-400">
                                                dist: {result.distance.toFixed(4)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-2 text-sm">
                                        {result.meta && Object.keys(result.meta).length > 0 && (
                                            <div className="flex gap-2">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-16 shrink-0">
                                                    Meta
                                                </span>
                                                <pre className="text-slate-700 dark:text-slate-300 text-xs overflow-x-auto">
                                                    {JSON.stringify(result.meta, null, 2)}
                                                </pre>
                                            </div>
                                        )}

                                        {result.filter && Object.keys(result.filter).length > 0 && (
                                            <div className="flex gap-2">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-16 shrink-0">
                                                    Filter
                                                </span>
                                                <code className="text-slate-700 dark:text-slate-300 text-xs">
                                                    {JSON.stringify(result.filter, null, 2)}
                                                </code>
                                            </div>
                                        )}

                                        {includeVectors &&
                                            result.vector &&
                                            result.vector.length > 0 && (
                                                <div className="flex gap-2">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase w-16 shrink-0">
                                                        Vector
                                                    </span>
                                                    <code className="text-slate-700 dark:text-slate-300 text-xs">
                                                        [
                                                        {result.vector
                                                            .slice(0, 8)
                                                            .map((v) => v.toFixed(4))
                                                            .join(', ')}
                                                        {result.vector.length > 8 &&
                                                            `, ... (${result.vector.length})`}
                                                        ]
                                                    </code>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Help Card */}
            {results === null && (
                <div className="bg-blue-50 dark:bg-slate-600 border border-blue-200 dark:border-slate-500 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-slate-100 mb-2">
                        {isHybrid ? 'Hybrid Search Example' : 'Dense Search Example'}
                    </h3>
                    <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>
                            {isHybrid
                                ? `{
  "vector": [0.1, 0.2, 0.3, ...],
  "sparse_indices": [10, 50, 100, 500],
  "sparse_values": [0.8, 0.5, 0.3, 0.1],
  "k": 5,
  "filter": [{"category": {"$eq":"tech"}}],
  "include_vectors": true
}`
                                : `{
  "vector": [0.1, 0.2, 0.3, 0.4, ...],
  "k": 5,
  "filter": [{"category": {"$eq":"tech"}}],
  "include_vectors": true
}`}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
