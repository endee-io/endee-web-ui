'use client'

import { useState } from 'react'
import { GoPlay, GoCheck, GoX, GoChevronDown, GoChevronRight, GoTrash } from 'react-icons/go'
import { api } from '../api/client'
import type { ApiResponse, ObjectInput, RebuildFieldSpec } from '../api/client'
import { useSelectedDatabase } from '../context/SelectedDatabaseContext'

interface TutorialStep {
  id: string
  title: string
  description: string
  endpoint: string
  method: string
  defaultPayload?: string
  run: (payload?: string, collection?: string) => Promise<{ success: boolean; result: string }>
  requiresCollection?: boolean
  requiresPayload?: boolean
}

interface StepResult {
  success: boolean
  result: string
  timestamp: number
}

export default function TutorialsPage() {
  const [selectedCollection, setSelectedCollection] = useState<string>('tutorial_collection')
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    new Set(['create-collection', 'insert-objects', 'search-dense'])
  )
  const [stepPayloads, setStepPayloads] = useState<Record<string, string>>({})
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({})
  const [runningSteps, setRunningSteps] = useState<Set<string>>(new Set())
  const [stepErrors, setStepErrors] = useState<Record<string, string | null>>({})

  const { selectedDatabase } = useSelectedDatabase()

  // ?db=<selected> suffix for the proxy routes still hit via raw fetch (upload).
  const dbq = `db=${encodeURIComponent(selectedDatabase ?? '')}`

  const nameFieldPattern = /^[a-zA-Z0-9_]{1,48}$/
  const backupPayloadSteps = new Set(['create-backup', 'restore-backup', 'delete-backup', 'download-backup', 'backup-info'])

  const validateBackupPayload = (stepId: string, payload: string): string | null => {
    if (!backupPayloadSteps.has(stepId)) return null
    try {
      const parsed = JSON.parse(payload)
      if (stepId === 'create-backup') {
        if (!nameFieldPattern.test(parsed.name || ''))
          return '"name" must be alphanumeric with underscores only, max 48 characters.'
      } else if (stepId === 'restore-backup') {
        if (!nameFieldPattern.test(parsed.backup_name || ''))
          return '"backup_name" must be alphanumeric with underscores only, max 48 characters.'
        if (!nameFieldPattern.test(parsed.target_collection_name || ''))
          return '"target_collection_name" must be alphanumeric with underscores only, max 48 characters.'
      } else {
        if (!nameFieldPattern.test(parsed.backup_name || ''))
          return '"backup_name" must be alphanumeric with underscores only, max 48 characters.'
      }
      return null
    } catch {
      return null
    }
  }

  const formatResult = (data: unknown): string => {
    if (data === null || data === undefined) return 'null'
    if (typeof data === 'string') return data
    return JSON.stringify(data, null, 2)
  }

  /** Map an ApiResponse into the tutorial's {success, result} shape. */
  const apiResult = <T,>(response: ApiResponse<T>) => ({
    success: response.success,
    result: response.success ? formatResult(response.data) : response.error || 'Failed',
  })

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'create-collection',
      title: 'Create Collection',
      description:
        'Create a collection with one or more named, typed fields. This example adds a dense "embedding" field and a "keywords" sparse field.',
      endpoint: 'POST /api/v2/collections',
      method: 'POST',
      requiresPayload: true,
      defaultPayload: JSON.stringify(
        {
          name: 'tutorial_collection',
          fields: [
            { name: 'embedding', type: 'vector', params: { dimension: 4, space_type: 'cosine', precision: 'int8' } },
            { name: 'keywords', type: 'sparse', sparse_model: 'default' },
          ],
        },
        null,
        2
      ),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const parsed = JSON.parse(payload)
          const response = await api.createCollection({ name: parsed.name, fields: parsed.fields })
          if (response.success && parsed.name) setSelectedCollection(parsed.name)
          return apiResult(response)
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'insert-objects',
      title: 'Insert Objects',
      description:
        'Upsert objects. Each object carries values for any subset of the collection’s fields, plus optional meta and filter tags.',
      endpoint: 'POST /api/v2/collections/:collectionName/objects',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify(
        [
          {
            id: 'obj_001',
            fields: { embedding: [0.1, 0.2, 0.3, 0.4], keywords: { indices: [3, 17, 42], values: [0.9, 0.5, 0.2] } },
            meta: { title: 'Document 1', category: 'tech' },
            filter: { category: 'tech', year: 2024 },
          },
          {
            id: 'obj_002',
            fields: { embedding: [0.5, 0.6, 0.7, 0.8], keywords: { indices: [5, 17, 90], values: [0.7, 0.6, 0.1] } },
            meta: { title: 'Document 2', category: 'science' },
            filter: { category: 'science', year: 2023 },
          },
          {
            id: 'obj_003',
            fields: { embedding: [0.2, 0.3, 0.4, 0.5] },
            meta: { title: 'Document 3', category: 'tech' },
            filter: { category: 'tech', year: 2024 },
          },
        ],
        null,
        2
      ),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const parsed = JSON.parse(payload) as ObjectInput[]
          return apiResult(await api.upsertObjects(idx, parsed))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'search-dense',
      title: 'Search (single field)',
      description:
        'Search one field. The response is one ranked list keyed by that field name. "limit" is the max hits for the field.',
      endpoint: 'POST /api/v2/collections/:collectionName/search',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify(
        { fields: { embedding: { query: [0.1, 0.2, 0.3, 0.4], limit: 5 } } },
        null,
        2
      ),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          return apiResult(await api.search(idx, JSON.parse(payload)))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'search-hybrid',
      title: 'Hybrid Search + Rerank',
      description:
        'Query several fields at once and fuse the per-field lists into a single ranked list with Reciprocal Rank Fusion (rerank).',
      endpoint: 'POST /api/v2/collections/:collectionName/search',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify(
        {
          fields: {
            embedding: { query: [0.1, 0.2, 0.3, 0.4], limit: 10 },
            keywords: { query: { indices: [3, 17], values: [0.8, 0.4] }, limit: 10 },
          },
          rerank: { limit: 5, rrfK: 60 },
        },
        null,
        2
      ),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          return apiResult(await api.search(idx, JSON.parse(payload)))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'search-with-filter',
      title: 'Search with Filters',
      description: 'Apply a metadata filter to a search to narrow the candidates.',
      endpoint: 'POST /api/v2/collections/:collectionName/search',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify(
        {
          fields: { embedding: { query: [0.1, 0.2, 0.3, 0.4], limit: 5 } },
          filter: [{ category: { $eq: 'tech' } }],
        },
        null,
        2
      ),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          return apiResult(await api.search(idx, JSON.parse(payload)))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'list-collections',
      title: 'List Collections',
      description: 'Retrieve all collections in the selected database, with their field definitions.',
      endpoint: 'GET /api/v2/collections',
      method: 'GET',
      run: async () => {
        const response = await api.listCollections()
        if (response.success && response.data && response.data.length > 0) {
          setSelectedCollection((cur) => cur || response.data![0].name)
        }
        return apiResult(response)
      },
    },
    {
      id: 'describe-collection',
      title: 'Describe Collection',
      description: 'Retrieve metadata for one collection: its fields, object count, layout version, and creation time.',
      endpoint: 'GET /api/v2/collections/:collectionName',
      method: 'GET',
      requiresCollection: true,
      run: async (_payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        return apiResult(await api.getCollection(idx))
      },
    },
    {
      id: 'get-objects',
      title: 'Get Objects by ID',
      description:
        'Fetch full stored objects (meta, filter, and the stored vectors/sparses/multi-vectors) by id.',
      endpoint: 'POST /api/v2/collections/:collectionName/objects/query',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ ids: ['obj_001', 'obj_002'] }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { ids } = JSON.parse(payload)
          return apiResult(await api.getObjects(idx, ids))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'update-filters',
      title: 'Update Object Filters',
      description: 'Update the filter tags for one or more objects by id (no re-upsert of vectors).',
      endpoint: 'POST /api/v2/collections/:collectionName/filters',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify(
        [
          { id: 'obj_001', filter: { category: 'ml', year: 2025 } },
          { id: 'obj_002', filter: { category: 'science', year: 2023 } },
        ],
        null,
        2
      ),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          return apiResult(await api.updateFilters(idx, JSON.parse(payload)))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'delete-object',
      title: 'Delete Object by ID',
      description: 'Remove a single object from the collection by its id.',
      endpoint: 'DELETE /api/v2/collections/:collectionName/objects/:id',
      method: 'DELETE',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ id: 'obj_003' }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { id } = JSON.parse(payload)
          return apiResult(await api.deleteObject(idx, id))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'delete-by-filter',
      title: 'Delete by Filter',
      description: 'Delete every object that matches a filter. Returns the number of objects deleted.',
      endpoint: 'DELETE /api/v2/collections/:collectionName/objects',
      method: 'DELETE',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ filter: [{ category: { $eq: 'science' } }] }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { filter } = JSON.parse(payload)
          return apiResult(await api.deleteByFilter(idx, filter))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'rebuild',
      title: 'Rebuild Fields',
      description:
        'Rebuild one or more dense fields’ HNSW graphs (async). Only M / efCon may change. Poll progress with rebuild status.',
      endpoint: 'POST /api/v2/collections/:collectionName/rebuild',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ fields: [{ field: 'embedding', m: 16, efCon: 128 }] }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { fields } = JSON.parse(payload) as { fields: RebuildFieldSpec[] }
          return apiResult(await api.rebuild(idx, fields))
        } catch (e) {
          return { success: false, result: `Invalid JSON: ${e}` }
        }
      },
    },
    {
      id: 'rebuild-status',
      title: 'Rebuild Status',
      description: 'Poll the progress of an in-flight rebuild.',
      endpoint: 'GET /api/v2/collections/:collectionName/rebuild/status',
      method: 'GET',
      requiresCollection: true,
      run: async (_payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        return apiResult(await api.rebuildStatus(idx))
      },
    },
    {
      id: 'shrink',
      title: 'Shrink (Defragment)',
      description: 'Defragment the collection’s storage in place to reclaim space.',
      endpoint: 'POST /api/v2/collections/:collectionName/shrink',
      method: 'POST',
      requiresCollection: true,
      run: async (_payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        return apiResult(await api.shrink(idx))
      },
    },
    {
      id: 'create-backup',
      title: 'Create Backup',
      description:
        'Asynchronously back up a collection. The backup runs in the background — check the active-backup step to monitor progress.',
      endpoint: 'POST /api/v2/collections/:collectionName/backups',
      method: 'POST',
      requiresCollection: true,
      requiresPayload: true,
      defaultPayload: JSON.stringify({ name: 'tutorial_backup' }, null, 2),
      run: async (payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { name } = JSON.parse(payload)
          return apiResult(await api.createBackup(idx, name))
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      },
    },
    {
      id: 'list-backups',
      title: 'List Backups',
      description: 'Retrieve all backups for the selected database.',
      endpoint: 'GET /api/v2/backups',
      method: 'GET',
      run: async () => apiResult(await api.listBackups()),
    },
    {
      id: 'check-active-backup',
      title: 'Check Active Backup',
      description: 'Check whether a backup is currently being created for this database.',
      endpoint: 'GET /api/v2/backups/active',
      method: 'GET',
      run: async () => apiResult(await api.activeBackup()),
    },
    {
      id: 'backup-info',
      title: 'Get Backup Info',
      description: 'Retrieve metadata about a backup (source collection, params, size, timestamp).',
      endpoint: 'GET /api/v2/backups/:backupName/info',
      method: 'GET',
      requiresPayload: true,
      defaultPayload: JSON.stringify({ backup_name: 'tutorial_backup' }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name } = JSON.parse(payload)
          return apiResult(await api.backupInfo(backup_name))
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      },
    },
    {
      id: 'restore-backup',
      title: 'Restore Backup',
      description: 'Restore a backup into a new collection. Provide the backup name and the target collection name.',
      endpoint: 'POST /api/v2/backups/:backupName/restore',
      method: 'POST',
      requiresPayload: true,
      defaultPayload: JSON.stringify(
        { backup_name: 'tutorial_backup', target_collection_name: 'restored_collection' },
        null,
        2
      ),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name, target_collection_name } = JSON.parse(payload)
          const response = await api.restoreBackup(backup_name, target_collection_name)
          return response.success
            ? { success: true, result: `Backup restored to collection "${target_collection_name}"` }
            : { success: false, result: response.error || 'Failed to restore backup' }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      },
    },
    {
      id: 'download-backup',
      title: 'Download Backup',
      description: 'Download a backup as a .tar file.',
      endpoint: 'GET /api/v2/backups/:backupName/download',
      method: 'GET',
      requiresPayload: true,
      defaultPayload: JSON.stringify({ backup_name: 'tutorial_backup' }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name } = JSON.parse(payload)
          const resolve = await api.downloadBackupUrl(backup_name)
          if (!resolve.success || !resolve.data?.url) {
            throw new Error(resolve.error || 'Failed to start download')
          }
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = resolve.data.url
          document.body.appendChild(iframe)
          setTimeout(() => { document.body.removeChild(iframe) }, 60000)
          return { success: true, result: `Download started for "${backup_name}"` }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      },
    },
    {
      id: 'upload-backup',
      title: 'Upload Backup',
      description:
        'Upload a backup .tar file. This is a file-upload endpoint — use Run to select a file. Fails if a backup with the same name already exists.',
      endpoint: 'POST /api/v2/backups/upload',
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
          const response = await fetch(`/api/backups/upload?${dbq}`, { method: 'POST', body: formData })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to upload backup')
          }
          return { success: true, result: `Backup "${file.name}" uploaded successfully` }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      },
    },
    {
      id: 'delete-backup',
      title: 'Delete Backup',
      description: 'Permanently delete a backup.',
      endpoint: 'DELETE /api/v2/backups/:backupName',
      method: 'DELETE',
      requiresPayload: true,
      defaultPayload: JSON.stringify({ backup_name: 'tutorial_backup' }, null, 2),
      run: async (payload) => {
        if (!payload) return { success: false, result: 'Payload required' }
        try {
          const { backup_name } = JSON.parse(payload)
          const response = await api.deleteBackup(backup_name)
          return response.success
            ? { success: true, result: `Backup "${backup_name}" deleted successfully` }
            : { success: false, result: response.error || 'Failed to delete backup' }
        } catch (e) {
          return { success: false, result: `${e}` }
        }
      },
    },
    {
      id: 'delete-collection',
      title: 'Delete Collection',
      description: 'Permanently delete a collection and all of its objects.',
      endpoint: 'DELETE /api/v2/collections/:collectionName',
      method: 'DELETE',
      requiresCollection: true,
      run: async (_payload, idx) => {
        if (!idx) return { success: false, result: 'Select a collection' }
        return apiResult(await api.deleteCollection(idx))
      },
    },
  ]

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) newExpanded.delete(stepId)
    else newExpanded.add(stepId)
    setExpandedSteps(newExpanded)
  }

  const runStep = async (step: TutorialStep) => {
    setRunningSteps((prev) => new Set(prev).add(step.id))
    const payload = stepPayloads[step.id] ?? step.defaultPayload
    const result = await step.run(payload, selectedCollection)
    setStepResults((prev) => ({ ...prev, [step.id]: { ...result, timestamp: Date.now() } }))
    setRunningSteps((prev) => {
      const next = new Set(prev)
      next.delete(step.id)
      return next
    })
  }

  const getPayload = (step: TutorialStep) => stepPayloads[step.id] ?? step.defaultPayload ?? ''

  const setPayload = (stepId: string, value: string) => {
    setStepPayloads((prev) => ({ ...prev, [stepId]: value }))
    if (backupPayloadSteps.has(stepId)) {
      setStepErrors((prev) => ({ ...prev, [stepId]: validateBackupPayload(stepId, value) }))
    }
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Interactive Tutorials
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Learn the Endee v2 Collections API with these runnable examples. Run each step against the
          selected database to see the API in action.
        </p>
      </div>

      {/* Target collection */}
      <div className="mb-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
          Target collection
        </label>
        <input
          type="text"
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          placeholder="e.g., tutorial_collection"
          className="w-full md:w-80 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          The collection that collection-scoped steps target. Created/listed steps update this automatically.
        </p>
      </div>

      {/* Tutorial Steps */}
      <div className="space-y-4">
        {tutorialSteps.map((step) => {
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
                      {step.endpoint.replace(':collectionName', selectedCollection || ':collectionName')}
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
                        rows={Math.min(14, (getPayload(step).match(/\n/g) || []).length + 2)}
                        className={`w-full px-3 py-2 border rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${stepErrors[step.id] ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                      />
                      {stepErrors[step.id] && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{stepErrors[step.id]}</p>
                      )}
                    </div>
                  )}

                  {/* Collection Required Warning */}
                  {step.requiresCollection && !selectedCollection && (
                    <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
                      Please set a target collection above (or create one first).
                    </div>
                  )}

                  {/* Run Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => runStep(step)}
                      disabled={isRunning || (step.requiresCollection && !selectedCollection) || !!stepErrors[step.id]}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-white transition-colors ${step.method === 'DELETE'
                        ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                        : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                        } disabled:cursor-not-allowed`}
                    >
                      {step.method === 'DELETE' ? <GoTrash className="w-4 h-4" /> : <GoPlay className="w-4 h-4" />}
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
              <li><code>$gt</code> / <code>$gte</code> - Greater than / or equal</li>
              <li><code>$lt</code> / <code>$lte</code> - Less than / or equal</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-2">Array & Range</h3>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 font-mono text-xs">
              <li><code>$in</code> - Value in array</li>
              <li><code>$range</code> - Inclusive numeric range <code>[min, max]</code></li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs text-slate-700 dark:text-slate-300">
          Example: <code>{`[{"category": {"$eq": "tech"}}, {"year": {"$range": [2020, 2024]}}]`}</code>
        </div>
      </div>
    </div>
  )
}
