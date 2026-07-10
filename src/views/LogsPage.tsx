'use client'

import { useCallback, useEffect, useState } from 'react'
import { GoSync } from 'react-icons/go'
import { api } from '../api/client'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'
import Notification from '../components/Notification'
import Select from '../components/Select'

const LIMIT_OPTIONS = [
  { value: '50', label: 'Last 50' },
  { value: '100', label: 'Last 100' },
  { value: '250', label: 'Last 250' },
  { value: '500', label: 'Last 500' },
]

const POLL_INTERVAL_MS = 3000

// Server log line shape:
// `2026-07-10T10:57:32Z INFO_2270: local_db/-: GET /api/v2/collection 200 (1.5ms)`
const LINE_RE = /^(\S+)\s+([A-Z]+)(?:_\d+)?:\s(.*)$/

interface LogLine {
  raw: string
  timestamp?: string
  level?: string
  message?: string
}

function parseLine(raw: string): LogLine {
  const match = raw.match(LINE_RE)
  if (!match) return { raw }
  return { raw, timestamp: match[1], level: match[2], message: match[3] }
}

/** Time-of-day portion of an ISO timestamp; full value stays in the tooltip. */
function formatTime(timestamp: string): string {
  const t = timestamp.indexOf('T')
  return t >= 0 ? timestamp.slice(t + 1).replace(/Z$/, '') : timestamp
}

function levelBadge(level: string): string {
  switch (level) {
    case 'ERROR':
    case 'ERR':
    case 'FATAL':
      return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
    case 'WARN':
    case 'WARNING':
      return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
    case 'DEBUG':
    case 'TRACE':
      return 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
    default:
      return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
  }
}

export default function LogsPage() {
  const { selectedDatabase } = useSelectedDatabase()
  const [lines, setLines] = useState<LogLine[]>([])
  const [limit, setLimit] = useState('100')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(
    async (background = false) => {
      if (!background) setLoading(true)
      try {
        const response = await api.getLogs(Number(limit))
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch logs')
        }
        // Newest first so the latest activity is visible without scrolling.
        setLines((response.data?.lines || []).map(parseLine).reverse())
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs')
      } finally {
        setLoading(false)
      }
    },
    [limit]
  )

  useEffect(() => {
    if (!selectedDatabase) return
    loadLogs()
  }, [selectedDatabase, loadLogs])

  // Background poll while auto-refresh is on (errors surface via the banner).
  useEffect(() => {
    if (!autoRefresh || !selectedDatabase) return
    const interval = setInterval(() => loadLogs(true), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [autoRefresh, selectedDatabase, loadLogs])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadLogs(true)
    setRefreshing(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Logs</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {selectedDatabase
              ? `Recent activity for ${selectedDatabase}`
              : 'Recent activity for the selected database'}
          </p>
        </div>

        {selectedDatabase && (
          <div className="flex items-center gap-3">
            <Select
              value={limit}
              options={LIMIT_OPTIONS}
              onChange={setLimit}
              triggerClassName="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md"
            />
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? 'Stop auto-refreshing' : 'Refresh every few seconds'}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                autoRefresh
                  ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-secondary dark:hover:bg-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'
                }`}
              />
              Auto-refresh
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              <GoSync className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* No database selected */}
      {!selectedDatabase && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Select a database to view its logs.</div>
        </div>
      )}

      {/* Loading */}
      {selectedDatabase && loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-600 dark:text-slate-300">Loading logs...</div>
        </div>
      )}

      {/* Error */}
      {selectedDatabase && !loading && error && (
        <Notification type="error" message={error} className="mb-4" />
      )}

      {/* Empty */}
      {selectedDatabase && !loading && !error && lines.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-600 dark:text-slate-300">No logs yet</div>
        </div>
      )}

      {/* Log lines, newest first */}
      {selectedDatabase && !loading && !error && lines.length > 0 && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-x-auto">
          <div className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600 font-medium">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'} · newest first
          </div>
          <div className="font-mono text-xs">
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-5 py-2 border-b border-slate-100 dark:border-slate-600/60 last:border-0"
              >
                {line.level ? (
                  <>
                    <span
                      title={line.timestamp}
                      className="shrink-0 text-slate-400 dark:text-slate-400 tabular-nums"
                    >
                      {formatTime(line.timestamp!)} UTC
                    </span>
                    <span
                      className={`shrink-0 w-14 text-center px-1.5 py-px rounded font-semibold ${levelBadge(line.level)}`}
                    >
                      {line.level}
                    </span>
                    <span className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-all">
                      {line.message}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-all">
                    {line.raw}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
