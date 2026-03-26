import { useState } from 'react'
import { GoPlay, GoCheck, GoX, GoChevronDown, GoChevronRight, GoTrash } from 'react-icons/go'
import { api } from '../api/client'
import type { QueryResult } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface TutorialStep {
  id: string
  title: string
  description: string
  endpoint: string
  method: string
  defaultPayload?: string
  run: (payload?: string, selectedIndex?: string) => Promise<{ success: boolean; result: string }>
  requiresIndex?: boolean
  requiresPayload?: boolean
}

interface StepResult {
  success: boolean
  result: string
  timestamp: number
}

export default function TutorialsPage() {
  const [selectedIndex, setSelectedIndex] = useState<string>('tutorial_index')
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(['create-index', 'insert-vectors', 'search-vectors']))
  const [stepPayloads, setStepPayloads] = useState<Record<string, string>>({})
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({})
  const [runningSteps, setRunningSteps] = useState<Set<string>>(new Set())

  const { token } = useAuth();

  const formatResult = (data: unknown): string => {
    if (data === null || data === undefined) return 'null'
    if (typeof data === 'string') return data
    return JSON.stringify(data, null, 2)
  }

  const formatVectorResult = (results: QueryResult[]): string => {
    return JSON.stringify(results.map(r => ({
      id: r.id,
      similarity: r.similarity,
      distance: r.distance,
      meta: r.meta,
      norm: r.norm,
      filter: r.filter,
      vector: r.vector
    })), null, 2)
  }

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'create-index',
      title: 'Create Index',
      description: 'Create a new vector index with specified dimensions and configuration.',
      endpoint: 'POST /api/v1/index/create',
      method: 'POST',
      requiresPayload: true,
      defaultPayload: JSON.stringify({
        index_name: "tutorial_index",
        dim: 4,
        space_type: "cosine",
      }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const parsed = JSON.parse(payload)
          const response = await api.createIndex(
            parsed.index_name,
            parsed.dim,
            parsed.space_type,
            {
              precision: parsed.precision,
              sparseModel: parsed.sparse_model,
              M: parsed.M,
              ef_con: parsed.ef_con
            }
          )
          return {
            success: response.success,
            result: response.success ? formatResult(response.data) : response.error || 'Failed'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'insert-vectors',
      title: 'Insert Vectors',
      description: 'Insert one or more vectors into an index with optional metadata and filters.',
      endpoint: 'POST /api/v1/index/:indexName/vector/insert',
      method: 'POST',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify([
        {
          id: "vec_001",
          vector: [0.1, 0.2, 0.3, 0.4],
          meta: { title: "Document 1", category: "tech" },
          filter: { year: 2024, type: "article" }
        },
        {
          id: "vec_002",
          vector: [0.5, 0.6, 0.7, 0.8],
          meta: { title: "Document 2", category: "science" },
          filter: { year: 2023, type: "paper" }
        },
        {
          id: "vec_003",
          vector: [0.2, 0.3, 0.4, 0.5],
          meta: { title: "Document 3", category: "tech" },
          filter: { year: 2024, type: "blog" }
        }
      ], null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const parsed = JSON.parse(payload)

          console.log("Parsed =>", parsed);
          // Convert filter objects to JSON strings for each vector
          const response = await api.insertVectors(idx, parsed)
          return {
            success: response.success,
            result: response.success ? formatResult(response.data) : response.error || 'Failed'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'search-vectors',
      title: 'Search Vectors',
      description: 'Find the k most similar vectors to a query vector using semantic search.',
      endpoint: 'POST /api/v1/index/:indexName/search',
      method: 'POST',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({
        vector: [0.1, 0.2, 0.3, 0.4],
        k: 5,
        include_vectors: true
      }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const parsed = JSON.parse(payload)
          // Convert filter to JSON string if it's an object/array
          const request = {
            ...parsed,
            filter: parsed.filter ? JSON.stringify(parsed.filter) : undefined
          }
          const response = await api.searchVectors(idx, request)
          if (response.success && response.data) {
            return { success: true, result: formatVectorResult(response.data) }
          }
          return {
            success: response.success,
            result: response.error || 'No results'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'search-with-filter',
      title: 'Search with Filters',
      description: 'Search vectors with metadata filters to narrow down results.',
      endpoint: 'POST /api/v1/index/:indexName/search',
      method: 'POST',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({
        vector: [0.1, 0.2, 0.3, 0.4],
        k: 5,
        filter: [{ "year": { "$eq": 2024 } }],
        include_vectors: false
      }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const parsed = JSON.parse(payload)
          // Convert filter to JSON string if it's an object/array
          const request = {
            ...parsed,
            filter: parsed.filter ? JSON.stringify(parsed.filter) : undefined
          }
          const response = await api.searchVectors(idx, request)
          console.log(response)
          if (response.success && response.data) {
            return { success: true, result: formatVectorResult(response.data) }
          }
          return {
            success: response.success,
            result: response.error || 'No results'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'list-indexes',
      title: 'List Indexes',
      description: 'Retrieve a list of all vector indexes in the database.',
      endpoint: 'GET /api/v1/index/list',
      method: 'GET',
      run: async () => {
        const response = await api.listIndexes()
        if (response.success && response.data) {
          // setIndexes(response.data.indexes || [])
          if (response.data.indexes?.length > 0 && !selectedIndex) {
            setSelectedIndex(response.data.indexes[0].name)
          }
        }
        return {
          success: response.success,
          result: response.success ? formatResult(response.data) : response.error || 'Failed'
        }
      }
    },
    {
      id: 'get-index-info',
      title: 'Get Index Info',
      description: 'Retrieve detailed information about a specific index.',
      endpoint: 'GET /api/v1/index/:indexName/info',
      method: 'GET',
      requiresIndex: true,
      run: async (_payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        const response = await api.getIndexInfo(idx)
        return {
          success: response.success,
          result: response.success ? formatResult(response.data) : response.error || 'Failed'
        }
      }
    },
    {
      id: 'rebuild-index',
      title: 'Rebuild Index',
      description: 'Rebuild the HNSW graph for an index with new M and/or ef_construction parameters. Returns 202 immediately — the rebuild runs in the background. At least one parameter must change.',
      endpoint: 'POST /api/v1/index/:indexName/rebuild',
      method: 'POST',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ M: 20, ef_con: 200 }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const parsed = JSON.parse(payload)
          const options: { M?: number; efCon?: number } = {}
          if (parsed.M !== undefined) options.M = parsed.M
          if (parsed.ef_con !== undefined) options.efCon = parsed.ef_con
          const response = await api.rebuildIndex(idx, options)
          return {
            success: response.success,
            result: response.success ? formatResult(response.data) : response.error || 'Failed'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'get-rebuild-status',
      title: 'Get Rebuild Status',
      description: 'Check the current rebuild status for an index. Returns status: idle | in_progress | completed | failed, along with timestamps and progress info.',
      endpoint: 'GET /api/v1/index/:indexName/rebuild/status',
      method: 'GET',
      requiresIndex: true,
      run: async (_payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        const response = await api.getRebuildStatus(idx)
        return {
          success: response.success,
          result: response.success ? formatResult(response.data) : response.error || 'Failed'
        }
      }
    },
    {
      id: 'get-vector-by-id',
      title: 'Get Vector by ID',
      description: 'Retrieve a specific vector by its unique identifier.',
      endpoint: 'POST /api/v1/index/:indexName/vector/get',
      method: 'POST',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ id: "vec_001" }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const request = JSON.parse(payload)
          const response = await api.getVector(idx, request)
          return {
            success: response.success,
            result: response.success ? formatResult(response.data) : response.error || 'Failed'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'health',
      title: 'Health Check',
      description: 'Check if the Endee API server is running and healthy.',
      endpoint: 'GET /api/v1/health',
      method: 'GET',
      run: async () => {
        const response = await fetch('/api/v1/health');
        if (!response.ok) {
          throw new Error('Failed to fetch backups')
        }
        const data = await response.json()
        return {
          success: true,
          result: formatResult(data)
        }
      }
    },
    {
      id: 'create-backup',
      title: 'Create Backup',
      description: 'Asynchronously create a backup of an index. The backup runs in the background — check /api/v1/backups/active to monitor progress.',
      endpoint: 'POST /api/v1/index/:indexName/backup',
      method: 'POST',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ name: "my_backup" }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { name } = JSON.parse(payload)
          const response = await fetch(`/api/v1/index/${encodeURIComponent(idx)}/backup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && ({ Authorization: token }))
            },
            body: JSON.stringify({ name })
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to create backup')
          }
          return { success: true, result: 'Backup created successfully' }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'list-backups',
      title: 'List Backups',
      description: 'Retrieve a list of all backups.',
      endpoint: 'GET /api/v1/backups',
      method: 'GET',
      run: async () => {
        try {
          const response = await fetch('/api/v1/backups', {
            method: "GET",
            headers: { ...(token && ({ Authorization: token })) }
          })
          if (!response.ok) {
            throw new Error('Failed to fetch backups')
          }
          const data = await response.json()
          return { success: true, result: formatResult(data) }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'restore-backup',
      title: 'Restore Backup',
      description: 'Restore a backup to a new index. Provide the backup name and target index name.',
      endpoint: 'POST /api/v1/backups/:backupName/restore',
      method: 'POST',
      requiresPayload: true,
      defaultPayload: JSON.stringify({
        backup_name: "my_backup",
        target_index_name: "restored_index"
      }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name, target_index_name } = JSON.parse(payload)
          const response = await fetch(`/api/v1/backups/${encodeURIComponent(backup_name)}/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && ({ Authorization: token }))
            },
            body: JSON.stringify({ target_index_name })
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to restore backup')
          }
          return { success: true, result: `Backup restored to index "${target_index_name}"` }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'delete-backup',
      title: 'Delete Backup',
      description: 'Permanently delete a backup.',
      endpoint: 'DELETE /api/v1/backups/:backupName',
      method: 'DELETE',
      requiresPayload: true,
      defaultPayload: JSON.stringify({ backup_name: "my_backup" }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name } = JSON.parse(payload)
          const response = await fetch(`/api/v1/backups/${encodeURIComponent(backup_name)}`, {
            method: 'DELETE',
            headers: { ...(token && { Authorization: token }) }
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to delete backup')
          }
          return { success: true, result: `Backup "${backup_name}" deleted successfully` }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'download-backup',
      title: 'Download Backup',
      description: 'Download a backup as a .tar file.',
      endpoint: 'GET /api/v1/backups/:backupName/download',
      method: 'GET',
      requiresPayload: true,
      defaultPayload: JSON.stringify({ backup_name: "my_backup" }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name } = JSON.parse(payload)
          let downloadUrl = `/api/v1/backups/${encodeURIComponent(backup_name)}/download`
          if (token) {
            downloadUrl += `?token=${encodeURIComponent(token)}`
          }
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = downloadUrl
          document.body.appendChild(iframe)
          setTimeout(() => { document.body.removeChild(iframe) }, 60000)
          return { success: true, result: `Download started for "${backup_name}"` }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'upload-backup',
      title: 'Upload Backup',
      description: 'Upload a backup .tar file. This is a file upload endpoint — use the Run button to select a file. If a backup with the same name already exists, the upload will fail.',
      endpoint: 'POST /api/v1/backups/upload',
      method: 'POST',
      run: async () => {
        try {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.tar'
          const file = await new Promise<File>((resolve, reject) => {
            input.onchange = () => {
              const f = input.files?.[0]
              if (f) resolve(f)
              else reject(new Error('No file selected'))
            }
            input.click()
          })
          const formData = new FormData()
          formData.append('backup', file)
          const response = await fetch('/api/v1/backups/upload', {
            method: 'POST',
            headers: { ...(token && { Authorization: token }) },
            body: formData
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to upload backup')
          }
          return { success: true, result: `Backup "${file.name}" uploaded successfully` }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'check-active-backup',
      title: 'Check Active Backup',
      description: 'Check if a backup is currently being created. Returns active status, backup name, and index ID when a backup is in progress.',
      endpoint: 'GET /api/v1/backups/active',
      method: 'GET',
      run: async () => {
        try {
          const response = await fetch('/api/v1/backups/active', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: token })
            }
          })
          if (!response.ok) {
            throw new Error('Failed to check active backup')
          }
          const data = await response.json()
          return { success: true, result: formatResult(data) }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'backup-info',
      title: 'Get Backup Info',
      description: 'Retrieve metadata about a backup including original index name, parameters, size, and creation timestamp.',
      endpoint: 'GET /api/v1/backups/:backupName/info',
      method: 'GET',
      requiresPayload: true,
      defaultPayload: JSON.stringify({ backup_name: "my_backup" }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name } = JSON.parse(payload)
          const response = await fetch(`/api/v1/backups/${encodeURIComponent(backup_name)}/info`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: token })
            }
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to fetch backup info')
          }
          const data = await response.json()
          return { success: true, result: formatResult(data) }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      }
    },
    {
      id: 'update-filters',
      title: 'Update Vector Filters',
      description: 'Update the filter metadata for one or more vectors by their IDs.',
      endpoint: 'POST /api/v1/index/:indexName/filters/update',
      method: 'POST',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify([
        { id: "vec_001", filter: { category: "ml", score: 95 } },
        { id: "vec_002", filter: { category: "science", score: 80 } }
      ], null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const updates = JSON.parse(payload)
          const response = await api.updateFilters(idx, updates)
          return {
            success: response.success,
            result: response.success ? formatResult(response.data) : response.error || 'Failed'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'delete-vector',
      title: 'Delete Vector by ID',
      description: 'Remove a specific vector from an index by its ID.',
      endpoint: 'DELETE /api/v1/index/:indexName/vector/:vectorId/delete',
      method: 'DELETE',
      requiresIndex: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ id: "vec_003" }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { id } = JSON.parse(payload)
          const response = await api.deleteVectorById(idx, id)
          return {
            success: response.success,
            result: response.success ? formatResult(response.data) : response.error || 'Failed'
          }
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      }
    },
    {
      id: 'delete-index',
      title: 'Delete Index',
      description: 'Permanently delete an index and all its vectors.',
      endpoint: 'DELETE /api/v1/index/:indexName/delete',
      method: 'DELETE',
      requiresIndex: true,
      run: async (_payload, idx) => {
        if (!idx) return { success: false, result: 'Select an index' }
        const response = await api.deleteIndex(idx)
        return {
          success: response.success,
          result: response.success ? formatResult(response.data) : response.error || 'Failed'
        }
      }
    }
  ]

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const runStep = async (step: TutorialStep) => {
    setRunningSteps(prev => new Set(prev).add(step.id))
    const payload = stepPayloads[step.id] || step.defaultPayload
    const result = await step.run(payload, selectedIndex)
    setStepResults(prev => ({
      ...prev,
      [step.id]: { ...result, timestamp: Date.now() }
    }))
    setRunningSteps(prev => {
      const next = new Set(prev)
      next.delete(step.id)
      return next
    })
  }

  const getPayload = (step: TutorialStep) => {
    return stepPayloads[step.id] ?? step.defaultPayload ?? ''
  }

  const setPayload = (stepId: string, value: string) => {
    setStepPayloads(prev => ({ ...prev, [stepId]: value }))
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
      case 'POST': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Interactive Tutorials
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Learn how to use the Endee Vector Database API with these interactive examples.
          Run each step to see the API in action.
        </p>
      </div>

      {/* Tutorial Steps */}
      <div className="space-y-4">
        {tutorialSteps.map(step => {
          const isExpanded = expandedSteps.has(step.id)
          const isRunning = runningSteps.has(step.id)
          const result = stepResults[step.id]

          return (
            <div
              key={step.id}
              className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden"
            >
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <GoChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <GoChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                  <h3 className="font-medium text-slate-800 dark:text-slate-100">{step.title}</h3>
                  <span className={`px-2 py-0.5 text-xs font-mono rounded ${getMethodColor(step.method)}`}>
                    {step.method}
                  </span>
                </div>
                {result && (
                  <span className={`flex items-center gap-1 text-sm ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {result.success ? <GoCheck className="w-4 h-4" /> : <GoX className="w-4 h-4" />}
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                )}
              </button>

              {/* Step Content */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-600 p-4 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{step.description}</p>

                  {/* Endpoint */}
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Endpoint
                    </div>
                    <code className="text-sm font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {step.endpoint.replace(':indexName', selectedIndex || ':indexName')}
                    </code>
                  </div>

                  {/* Payload Editor */}
                  {step.requiresPayload && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Request Body (editable)
                      </div>
                      <textarea
                        value={getPayload(step)}
                        onChange={(e) => setPayload(step.id, e.target.value)}
                        rows={Math.min(10, (getPayload(step).match(/\n/g) || []).length + 2)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Index Required Warning */}
                  {step.requiresIndex && !selectedIndex && (
                    <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
                      Please select or create an index first.
                    </div>
                  )}

                  {/* Run Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => runStep(step)}
                      disabled={isRunning || (step.requiresIndex && !selectedIndex)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-white transition-colors ${step.method === 'DELETE'
                        ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                        : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                        } disabled:cursor-not-allowed`}
                    >
                      {step.method === 'DELETE' ? (
                        <GoTrash className="w-4 h-4" />
                      ) : (
                        <GoPlay className="w-4 h-4" />
                      )}
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                  </div>

                  {/* Result */}
                  {result && (
                    <div>
                      <div className={`text-xs font-medium uppercase mb-1 ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {result.success ? 'Response' : 'Error'}
                      </div>
                      <pre className={`text-sm font-mono p-3 rounded-md overflow-x-auto ${result.success
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}>
                        {result.result}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Filter Operators Reference */}
      <div className="mt-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Filter Operators Reference
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-2">Comparison</h3>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 font-mono text-xs">
              <li><code>$eq</code> - Equal to</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-2">Array & Logical</h3>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 font-mono text-xs">
              <li><code>$in</code> - Value in array</li>
              <li><code>$range</code> - Numerical values in range</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs text-slate-700 dark:text-slate-300">
          Example: <code>{`[{"year": {"$gte": 2020}}, {"type": {"$in": ["article", "paper"]}}]`}</code>
        </div>
      </div>
    </div>
  )
}
