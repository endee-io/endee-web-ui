/**
 * API Client for communicating with the Endee Vector Database backend.
 *
 * All requests are routed through Next server proxy routes (/api/collections,
 * /api/backups) which inject the per-database root-impersonation token
 * `root/<database>:<ROOT_TOKEN>` server-side. The browser never holds the root
 * token. Every call is scoped to the currently-selected database, set via
 * `setCurrentDatabase()` (driven by SelectedDatabaseContext).
 */

import { Precision } from "endee";
import type {
  VectorItem,
  QueryOptions,
  QueryResult,
  CreateIndexOptions,
  IndexDescription,
  VectorInfo,
} from "endee";

// Re-export types from endee for use in UI components
export type { VectorItem, QueryOptions, QueryResult, CreateIndexOptions, IndexDescription };
export { Precision };

// ============================================================
// SELECTED DATABASE
// ============================================================

let currentDatabase: string | null = null;

/** Set the database all subsequent API calls are scoped to. */
export function setCurrentDatabase(database: string | null): void {
  currentDatabase = database;
}

/** The database API calls are currently scoped to (or null). */
export function getCurrentDatabase(): string | null {
  return currentDatabase;
}

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type for the raw list response from the API (snake_case from backend)
interface RawIndexListItem {
  name: string;
  M: number;
  total_elements: number;
  space_type: string;
  precision: Precision;
  created_at: number;
  dimension: number;
  sparse_model: string;
}

// Index type for list display (uses snake_case to match API response)
export interface Index {
  name: string;
  M: number;
  total_elements: number;
  space_type: string;
  precision: Precision;
  created_at: number;
  dimension: number;
  sparseModel: string;
}

export interface IndexListResponse {
  indexes: Index[];
}

// Search request parameters
export interface SearchRequest {
  vector: number[];
  k: number;
  ef?: number;
  filter?: string;
  include_vectors?: boolean;
  sparse_indices?: number[];
  sparse_values?: number[];
}

export interface VectorGetRequest {
  id?: string;
}

// Helper function to check if an index is hybrid
export function isHybridIndex(index: Index): boolean {
  return (index.sparseModel == 'default' || index.sparseModel == 'endee_bm25') ;
}

// Helper function to format space type to readable state
function formatSpaceType(space_type : string) : string {
  switch (space_type){
    case 'cosine':
      return 'Cosine';
    case 'l2':
      return 'Euclidean';
    case 'ip':
      return 'Inner Product';
    default:
      return 'Unknown';
  }
}

// ============================================================
// FETCH HELPERS
// ============================================================

class NoDatabaseError extends Error {
  constructor() {
    super("No database selected.");
  }
}

/** Append the current `db` query param to a proxy path. */
function withDb(path: string): string {
  if (!currentDatabase) throw new NoDatabaseError();
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}db=${encodeURIComponent(currentDatabase)}`;
}

/** Issue a request to a proxy route and unwrap to { data } or throw. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withDb(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (payload as { error?: string }).error || `Request failed (${response.status})`
    );
  }
  return payload as T;
}

function toApiResponse<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  return fn()
    .then((data) => ({ success: true, data }))
    .catch((error) => {
      console.error("API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    });
}

// ============================================================
// API CLIENT
// ============================================================

class ApiClient {
  // ============================================================
  // HEALTH
  // ============================================================

  async health(): Promise<ApiResponse<{ status: string }>> {
    return toApiResponse(async () => {
      await request<{ indexes: RawIndexListItem[] }>("/api/collections");
      return { status: "ok" };
    });
  }

  // ============================================================
  // COLLECTION (INDEX) OPERATIONS
  // ============================================================

  async listIndexes(): Promise<ApiResponse<IndexListResponse>> {
    return toApiResponse(async () => {
      const response = await request<{ indexes: RawIndexListItem[] }>("/api/collections");
      const rawIndexes = response.indexes || [];
      const indexes: Index[] = rawIndexes.map((idx) => ({
        name: idx.name,
        M: idx.M,
        total_elements: idx.total_elements,
        space_type: formatSpaceType(idx.space_type),
        precision: idx.precision,
        created_at: idx.created_at,
        dimension: idx.dimension,
        sparseModel: idx.sparse_model || "",
      }));
      return { indexes };
    });
  }

  async getIndexInfo(indexName: string): Promise<ApiResponse<IndexDescription>> {
    return toApiResponse(() =>
      request<IndexDescription>(`/api/collections/${encodeURIComponent(indexName)}`)
    );
  }

  async createIndex(
    indexName: string,
    dimension: number,
    spaceType: string,
    options?: {
      precision?: Precision;
      sparseModel?: string | null;
      M?: number;
      ef_con?: number;
    }
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return toApiResponse(async () => {
      const createOptions: CreateIndexOptions = {
        name: indexName,
        dimension: dimension,
        spaceType: spaceType as "cosine" | "l2" | "ip",
      };
      if (options?.precision) createOptions.precision = options.precision;
      if (options?.sparseModel) createOptions.sparseModel = options.sparseModel;
      if (options?.M) createOptions.M = options.M;
      if (options?.ef_con) createOptions.efCon = options.ef_con;

      await request("/api/collections", {
        method: "POST",
        body: JSON.stringify(createOptions),
      });
      return { success: true, message: "Index created successfully" };
    });
  }

  async deleteIndex(
    indexName: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return toApiResponse(async () => {
      await request(`/api/collections/${encodeURIComponent(indexName)}`, {
        method: "DELETE",
      });
      return { success: true, message: "Index deleted successfully" };
    });
  }

  // ============================================================
  // VECTOR OPERATIONS
  // ============================================================

  async insertVectors(
    indexName: string,
    vectors: VectorItem[]
  ): Promise<ApiResponse<{ success: boolean; inserted: number }>> {
    return toApiResponse(async () => {
      await request(`/api/collections/${encodeURIComponent(indexName)}/vectors`, {
        method: "POST",
        body: JSON.stringify({ vectors }),
      });
      return { success: true, inserted: vectors.length };
    });
  }

  async getVector(
    indexName: string,
    requestParams: VectorGetRequest
  ): Promise<ApiResponse<VectorInfo>> {
    return toApiResponse(async () => {
      if (!requestParams.id) {
        throw new Error("Either id or filter must be provided");
      }
      return request<VectorInfo>(
        `/api/collections/${encodeURIComponent(indexName)}/vectors?id=${encodeURIComponent(
          requestParams.id
        )}`
      );
    });
  }

  async deleteVectorById(
    indexName: string,
    vectorId: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return toApiResponse(async () => {
      await request(
        `/api/collections/${encodeURIComponent(indexName)}/vectors?id=${encodeURIComponent(
          vectorId
        )}`,
        { method: "DELETE" }
      );
      return { success: true, message: "Vector deleted successfully" };
    });
  }

  async updateFilters(
    indexName: string,
    updates: Array<{ id: string; filter: Record<string, unknown> }>
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return toApiResponse(async () => {
      await request(`/api/collections/${encodeURIComponent(indexName)}/vectors`, {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      });
      return { success: true, message: "Filters updated successfully" };
    });
  }

  async deleteVectorsByFilter(
    indexName: string,
    filter: Array<Record<string, unknown>>
  ): Promise<ApiResponse<{ success: boolean; deleted: number }>> {
    return toApiResponse(async () => {
      const result = await request<{ deleted: number }>(
        `/api/collections/${encodeURIComponent(indexName)}/vectors`,
        { method: "DELETE", body: JSON.stringify({ filter }) }
      );
      return { success: true, deleted: result.deleted ?? 0 };
    });
  }

  // ============================================================
  // SEARCH OPERATIONS
  // ============================================================

  async searchVectors(
    indexName: string,
    searchRequest: SearchRequest
  ): Promise<ApiResponse<QueryResult[]>> {
    return toApiResponse(async () => {
      const queryOptions: QueryOptions = {
        vector: searchRequest.vector,
        topK: searchRequest.k,
      };
      if (searchRequest.ef) queryOptions.ef = searchRequest.ef;
      if (searchRequest.filter) {
        try {
          queryOptions.filter = JSON.parse(searchRequest.filter);
        } catch {
          // If it's not valid JSON, pass as-is (omit)
        }
      }
      if (searchRequest.include_vectors) queryOptions.includeVectors = searchRequest.include_vectors;
      if (searchRequest.sparse_indices) queryOptions.sparseIndices = searchRequest.sparse_indices;
      if (searchRequest.sparse_values) queryOptions.sparseValues = searchRequest.sparse_values;

      return request<QueryResult[]>(
        `/api/collections/${encodeURIComponent(indexName)}/query`,
        { method: "POST", body: JSON.stringify(queryOptions) }
      );
    });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export the class for testing
export default ApiClient;
