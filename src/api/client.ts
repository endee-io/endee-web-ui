/**
 * Browser API client for the Endee Vector Database (v2 Collections API).
 *
 * All requests are routed through the Next server proxy routes (/api/collections,
 * /api/backups, /api/databases) which inject the per-database root-impersonation
 * token `root/<database>:<ROOT_TOKEN>` server-side. The browser never holds a
 * token and never imports the `endee` SDK at runtime — only its TypeScript types
 * (erased at build time). Every data-plane call is scoped to the currently
 * selected database, set via `setCurrentDatabase()` (driven by the selected-db
 * store).
 */

import type {
  FieldDefinition,
  FieldType,
  SpaceType,
  ObjectInput,
  FieldValue,
  SparseValue,
  SearchHit,
  SearchOptions,
  CollectionMetadata,
  FullObject,
  UpdateFilterEntry,
  RebuildFieldSpec,
  DatabaseInfo,
  DbType,
  TokenType,
  TokenInfo,
} from "endee"

// Re-export the SDK types the UI builds on, so views import them from one place.
export type {
  FieldDefinition,
  FieldType,
  SpaceType,
  ObjectInput,
  FieldValue,
  SparseValue,
  SearchHit,
  SearchOptions,
  CollectionMetadata,
  FullObject,
  UpdateFilterEntry,
  RebuildFieldSpec,
  DatabaseInfo,
  DbType,
  TokenType,
  TokenInfo,
}

/** Database tiers, mirrors the SDK's VALID_DB_TYPES. */
export const DB_TYPES: DbType[] = ["starter", "pro", "scale", "enterprise"]

/**
 * Precision values for vector / multi_vector fields. Declared as a string union
 * (mirrors the SDK's `Precision` enum) so the browser bundle never pulls in the
 * runtime SDK.
 */
export type Precision =
  | "binary"
  | "int8"
  | "int8e"
  | "int16"
  | "float16"
  | "float32"

export const PRECISIONS: Precision[] = [
  "float32",
  "float16",
  "int16",
  "int8",
  "int8e",
  "binary",
]

export const SPACE_TYPES: SpaceType[] = ["cosine", "l2", "ip"]

// ============================================================
// SELECTED DATABASE
// ============================================================

let currentDatabase: string | null = null

/** Set the database all subsequent data-plane API calls are scoped to. */
export function setCurrentDatabase(database: string | null): void {
  currentDatabase = database
}

/** The database API calls are currently scoped to (or null). */
export function getCurrentDatabase(): string | null {
  return currentDatabase
}

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/** Result of creating a database — includes the one-time `db_token`. */
export interface CreateDatabaseResult {
  db_name: string
  db_token: string
  db_type?: string
  message?: string
  [key: string]: unknown
}

/** Result of creating a token — includes the one-time `db_token` (db_name:secret). */
export interface CreateTokenResult {
  name: string
  token_type?: string
  db_token: string
  [key: string]: unknown
}

/** A collection as returned by `listCollections` (server metadata, snake_case). */
export interface CollectionSummary {
  name: string
  fields: FieldDefinition[]
  created_at?: number | string
  layout_version?: number
  /** Current object count. */
  total_elements?: number
  /** Configured capacity. */
  max_elements?: number
  [key: string]: unknown
}

/** Per-field search config: `{ query, limit?, ef_search? }`. */
export interface FieldQuery {
  query: FieldValue
  limit?: number
  ef_search?: number
}

/** Optional RRF fusion of the per-field results into a single ranked list. */
export interface RerankRequest {
  limit?: number
  fieldWeights?: Record<string, number> | null
  rrfK?: number
}

export interface SearchRequest {
  fields: Record<string, FieldQuery>
  filter?: Array<Record<string, unknown>> | null
  efSearch?: number
  prefilterCardinalityThreshold?: number
  filterBoostPercentage?: number
  /** When set, the server fuses the per-field lists with `rerank()`. */
  rerank?: RerankRequest
}

/** Search outcome: per-field ranked lists, or a single fused list when reranked. */
export type SearchOutcome =
  | { fused: false; results: Record<string, SearchHit[]> }
  | { fused: true; results: SearchHit[] }

/** True if a collection has at least one field of the given type. */
export function hasFieldType(
  collection: { fields: FieldDefinition[] },
  type: FieldType
): boolean {
  return collection.fields.some((f) => f.type === type)
}

/** Human-readable label for a space type. */
export function formatSpaceType(spaceType: string): string {
  switch (spaceType) {
    case "cosine":
      return "Cosine"
    case "l2":
      return "Euclidean"
    case "ip":
      return "Inner Product"
    default:
      return spaceType || "Unknown"
  }
}

// ============================================================
// FETCH HELPERS
// ============================================================

class NoDatabaseError extends Error {
  constructor() {
    super("No database selected.")
  }
}

/** Append the current `db` query param to a proxy path. */
function withDb(path: string): string {
  if (!currentDatabase) throw new NoDatabaseError()
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}db=${encodeURIComponent(currentDatabase)}`
}

/** Issue a db-scoped request to a proxy route and unwrap to `T` or throw. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return rawRequest<T>(withDb(path), init)
}

/** Issue a request to a proxy route that is NOT scoped to a database. */
async function rawRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      (payload as { error?: string }).error || `Request failed (${response.status})`
    )
  }
  return payload as T
}

function toApiResponse<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  return fn()
    .then((data) => ({ success: true, data }))
    .catch((error) => {
      console.error("API request failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    })
}

const enc = encodeURIComponent

// ============================================================
// API CLIENT
// ============================================================

class ApiClient {
  // ── collections ───────────────────────────────────────────

  async listCollections(): Promise<ApiResponse<CollectionSummary[]>> {
    return toApiResponse(async () => {
      const res = await request<{ collections: CollectionSummary[] }>("/api/collections")
      return res.collections || []
    })
  }

  async getCollection(name: string): Promise<ApiResponse<CollectionSummary>> {
    // describe() returns the same rich shape as a list entry (fields + counts).
    return toApiResponse(() =>
      request<CollectionSummary>(`/api/collections/${enc(name)}`)
    )
  }

  async createCollection(params: {
    name: string
    fields: FieldDefinition[]
  }): Promise<ApiResponse<{ success: boolean }>> {
    return toApiResponse(() =>
      request<{ success: boolean }>("/api/collections", {
        method: "POST",
        body: JSON.stringify(params),
      })
    )
  }

  async deleteCollection(name: string): Promise<ApiResponse<{ success: boolean }>> {
    return toApiResponse(() =>
      request<{ success: boolean }>(`/api/collections/${enc(name)}`, {
        method: "DELETE",
      })
    )
  }

  // ── objects ───────────────────────────────────────────────

  async upsertObjects(
    name: string,
    objects: ObjectInput[]
  ): Promise<ApiResponse<{ upserted: number }>> {
    return toApiResponse(() =>
      request<{ upserted: number }>(`/api/collections/${enc(name)}/objects`, {
        method: "POST",
        body: JSON.stringify({ objects }),
      })
    )
  }

  async getObjects(
    name: string,
    ids: string[]
  ): Promise<ApiResponse<FullObject[]>> {
    return toApiResponse(async () => {
      const res = await request<{ objects: FullObject[] }>(
        `/api/collections/${enc(name)}/objects/query`,
        { method: "POST", body: JSON.stringify({ ids }) }
      )
      return res.objects || []
    })
  }

  async deleteObject(
    name: string,
    id: string
  ): Promise<ApiResponse<{ deleted: string }>> {
    return toApiResponse(() =>
      request<{ deleted: string }>(
        `/api/collections/${enc(name)}/objects/${enc(id)}`,
        { method: "DELETE" }
      )
    )
  }

  async deleteByFilter(
    name: string,
    filter: Array<Record<string, unknown>>
  ): Promise<ApiResponse<{ deleted: number }>> {
    return toApiResponse(() =>
      request<{ deleted: number }>(`/api/collections/${enc(name)}/objects`, {
        method: "DELETE",
        body: JSON.stringify({ filter }),
      })
    )
  }

  async updateFilters(
    name: string,
    updates: UpdateFilterEntry[]
  ): Promise<ApiResponse<{ updated: number }>> {
    return toApiResponse(() =>
      request<{ updated: number }>(`/api/collections/${enc(name)}/filters`, {
        method: "POST",
        body: JSON.stringify({ updates }),
      })
    )
  }

  // ── search ────────────────────────────────────────────────

  async search(
    name: string,
    searchRequest: SearchRequest
  ): Promise<ApiResponse<SearchOutcome>> {
    return toApiResponse(() =>
      request<SearchOutcome>(`/api/collections/${enc(name)}/search`, {
        method: "POST",
        body: JSON.stringify(searchRequest),
      })
    )
  }

  // ── maintenance ───────────────────────────────────────────

  async rebuild(
    name: string,
    fields: RebuildFieldSpec[]
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/collections/${enc(name)}/rebuild`, {
        method: "POST",
        body: JSON.stringify({ fields }),
      })
    )
  }

  async rebuildStatus(name: string): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/collections/${enc(name)}/rebuild/status`)
    )
  }

  async shrink(name: string): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/collections/${enc(name)}/shrink`, {
        method: "POST",
      })
    )
  }

  // ── backups (db-scoped) ───────────────────────────────────

  async createBackup(
    name: string,
    backupName: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/collections/${enc(name)}/backup`, {
        method: "POST",
        body: JSON.stringify({ name: backupName }),
      })
    )
  }

  async listBackups(): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() => request<Record<string, unknown>>("/api/backups"))
  }

  async activeBackup(): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>("/api/backups/active")
    )
  }

  async backupInfo(backupName: string): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/backups/${enc(backupName)}/info`)
    )
  }

  async restoreBackup(
    backupName: string,
    targetCollectionName: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/backups/${enc(backupName)}/restore`, {
        method: "POST",
        body: JSON.stringify({ target_collection_name: targetCollectionName }),
      })
    )
  }

  async deleteBackup(backupName: string): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/backups/${enc(backupName)}`, {
        method: "DELETE",
      })
    )
  }

  /** Resolve the tokenized backend URL the browser streams the `.tar` from. */
  async downloadBackupUrl(backupName: string): Promise<ApiResponse<{ url: string }>> {
    return toApiResponse(() =>
      request<{ url: string }>(`/api/backups/${enc(backupName)}/download`)
    )
  }

  // ── tokens (db-scoped) ────────────────────────────────────

  async listTokens(): Promise<ApiResponse<TokenInfo[]>> {
    return toApiResponse(async () => {
      const res = await request<{ tokens: TokenInfo[] }>("/api/tokens")
      return res.tokens || []
    })
  }

  /** Mint a new token for the selected database. Returns the one-time db_token. */
  async createToken(
    name: string,
    tokenType: TokenType
  ): Promise<ApiResponse<CreateTokenResult>> {
    return toApiResponse(() =>
      request<CreateTokenResult>("/api/tokens", {
        method: "POST",
        body: JSON.stringify({ name, token_type: tokenType }),
      })
    )
  }

  async deleteToken(name: string): Promise<ApiResponse<Record<string, unknown>>> {
    return toApiResponse(() =>
      request<Record<string, unknown>>(`/api/tokens/${enc(name)}`, {
        method: "DELETE",
      })
    )
  }

  // ── databases (control plane; root token, not db-scoped) ──

  async listDatabases(): Promise<ApiResponse<DatabaseInfo[]>> {
    return toApiResponse(async () => {
      const res = await rawRequest<{ databases: DatabaseInfo[] }>("/api/databases")
      return res.databases || []
    })
  }

  /**
   * Create a database (requires the server root token, applied server-side).
   * Returns the server response including the new `db_token` (`db_name:secret`),
   * which is shown only once.
   */
  async createDatabase(
    dbName: string,
    dbType: DbType
  ): Promise<ApiResponse<CreateDatabaseResult>> {
    return toApiResponse(() =>
      rawRequest<CreateDatabaseResult>("/api/databases", {
        method: "POST",
        body: JSON.stringify({ db_name: dbName, db_type: dbType }),
      })
    )
  }
}

// Export singleton instance
export const api = new ApiClient()

// Export the class for testing
export default ApiClient
