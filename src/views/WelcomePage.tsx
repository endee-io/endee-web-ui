'use client'

import { useRouter } from 'next/navigation'
import { GoDatabase, GoCode, GoBook, GoArrowRight, GoSearch, GoPlus, GoZap, GoArchive } from 'react-icons/go'
import { useDbRoute } from '../lib/routes'

export default function WelcomePage() {
    const router = useRouter()
    const { path } = useDbRoute()

    return (
        <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center py-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <img src="/endee-logo.svg" className="h-12" alt="Endee Logo" />
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Endee</h1>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-2">
                    High Performance Multi-Field Vector Database
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                    Dense, sparse, and multi-vector fields in a single collection — built for scale, efficiency and speed.
                </p>
            </div>

            {/* Quick Start Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Get Started</h2>
                <div className="grid md:grid-cols-3 gap-4">
                    {/* Step 1 */}
                    <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                            <h3 className="font-medium text-slate-800 dark:text-slate-100">Create a Collection</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Define one or more fields — dense vector, sparse, or multi-vector — each with its own dimensions and distance metric.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                            <h3 className="font-medium text-slate-800 dark:text-slate-100">Insert Objects</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Upsert objects carrying values for each field, plus optional metadata filters for narrowing queries.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                            <h3 className="font-medium text-slate-800 dark:text-slate-100">Search & Rerank</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Query each field for nearest neighbors, then fuse the per-field results with RRF rerank for hybrid search.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Options */}
            <div className="space-y-4 mb-8">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Choose Your Path</h2>

                {/* Dashboard Option */}
                <div
                    onClick={() => router.push(path('collections'))}
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <GoDatabase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                    Use the Dashboard
                                </h3>
                                <GoArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mt-1 mb-3">
                                Manage your collections directly from this UI - no code required.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded">
                                    <GoPlus className="w-3 h-3" /> Create collections
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded">
                                    <GoZap className="w-3 h-3" /> Insert objects
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded">
                                    <GoSearch className="w-3 h-3" /> Search & rerank
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded">
                                    <GoArchive className="w-3 h-3" /> Backup & restore
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SDK Option */}
                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                            <GoCode className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                Integrate with SDKs
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 mt-1 mb-3">
                                Build production-grade applications with ready-to-use SDK examples for Python and TypeScript complete support for every feature, including hybrid search.
                            </p>
                            <div className="flex gap-3 mb-4">
                                <a
                                    href="https://docs.endee.io/v2/concepts/indexes"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                >
                                    Quick Start →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tutorials Option */}
                <div
                    onClick={() => router.push(path('tutorials'))}
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-5 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all cursor-pointer group"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                            <GoBook className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                    Interactive Tutorials
                                </h3>
                                <GoArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mt-1 mb-3">
                                Learn by doing with step-by-step interactive examples. Execute real API calls and see results instantly.
                            </p>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                Covers: Collection creation • Object insertion • Hybrid search & rerank • Filtered queries • Backup & restore
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Overview */}
            <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-5 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex gap-3">
                        <span className="text-blue-500">•</span>
                        <div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">Multi-Field Collections</span>
                            <p className="text-slate-500 dark:text-slate-400">Combine dense, sparse, and multi-vector fields in one collection and fuse results with RRF rerank.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className="text-blue-500">•</span>
                        <div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">Metadata Filtering</span>
                            <p className="text-slate-500 dark:text-slate-400">Filter results by metadata using $eq, $gt, $gte, $lt, $lte, $in, and $range operators.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className="text-blue-500">•</span>
                        <div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">Multiple Distance Metrics</span>
                            <p className="text-slate-500 dark:text-slate-400">Choose from cosine similarity, Euclidean distance, or inner product.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className="text-blue-500">•</span>
                        <div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">Configurable Precision</span>
                            <p className="text-slate-500 dark:text-slate-400">Balance between memory usage and accuracy with multiple options.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className="text-blue-500">•</span>
                        <div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">Backup & Restore</span>
                            <p className="text-slate-500 dark:text-slate-400">Create backups of your collections and restore them anytime.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Server connected and ready</span>
            </div>
        </div>
    )
}
