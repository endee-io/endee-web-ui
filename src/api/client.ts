/**
 * API Client for communicating with Endee Vector Database backend
 *
 * This module wraps the endee package to provide a consistent interface
 * for the frontend application.
 */

import { Endee, Precision } from "endee";
import type {
  VectorItem,
  QueryOptions,
  QueryResult,
  CreateIndexOptions,
  IndexDescription,
  VectorInfo,
  RebuildOptions,
  RebuildResult,
  RebuildStatus,
} from "endee";

// Re-export types from endee for use in UI components
export type { VectorItem, QueryOptions, QueryResult, CreateIndexOptions, IndexDescription };
export { Precision };

// ============================================================
// INITIALIZE ENDEE CLIENT
// ============================================================

const AUTH_TOKEN_KEY = 'endee_auth_token'

// Callback for 401 errors (will be set by AuthContext)
let onUnauthorized: (() => void) | null = null

// Current Endee instance (will be recreated when token changes)
let endee: Endee | null = null

// Get the current token from localStorage
export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

// Create or get the Endee client instance
function getEndeeClient(): Endee {
  if (!endee) {
    const token = getStoredToken()
    endee = new Endee(token)
    endee.setBaseUrl("/api/v1")
  }
  return endee
}

// Reinitialize the Endee client with a new token
export function reinitializeEndee(token: string | null): void {
  endee = new Endee(token)
  endee.setBaseUrl("/api/v1")
}

// Set the callback for 401 errors
export function setOnUnauthorized(callback: (() => void) | null): void {
  onUnauthorized = callback
}

// Helper to check if an error is a 401 Unauthorized
function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('401') || message.includes('invalid token')
  }
  return false
}

// Wrapper to handle API errors with 401 detection
function handleApiError<T>(error: unknown): ApiResponse<T> {
  console.error("API request failed:", error)

  // Check for 401 and trigger auth modal
  if (isUnauthorizedError(error) && onUnauthorized) {
    onUnauthorized()
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  }
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
// API CLIENT
// ============================================================

class ApiClient {
  // ============================================================
  // HEALTH
  // ============================================================

  async health(): Promise<ApiResponse<{ status: string }>> {
    try {
      await getEndeeClient().listIndexes();
      return { success: true, data: { status: "ok" } };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ============================================================
  // INDEX OPERATIONS
  // ============================================================

  async listIndexes(): Promise<ApiResponse<IndexListResponse>> {
    try {
      const response = await getEndeeClient().listIndexes();
      const rawIndexes = (response as { indexes: RawIndexListItem[] }).indexes || [];
      const mappedIndexes: Index[] = rawIndexes.map((idx: RawIndexListItem) => ({
        name: idx.name,
        M: idx.M,
        total_elements: idx.total_elements,
        space_type: formatSpaceType(idx.space_type),
        precision: idx.precision,
        created_at: idx.created_at,
        dimension: idx.dimension,
        sparseModel: idx.sparse_model || '',
      }));
      return { success: true, data: { indexes: mappedIndexes } };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getIndexInfo(indexName: string): Promise<ApiResponse<IndexDescription>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);
      const description = index.describe();
      return {
        success: true,
        data: description,
      };
    } catch (error) {
      return handleApiError(error);
    }
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
    try {
      const createOptions: CreateIndexOptions = {
        name: indexName,
        dimension: dimension,
        spaceType: spaceType as "cosine" | "l2" | "ip",
      };

      if (options?.precision) {
        createOptions.precision = options.precision;
      }
      if (options?.sparseModel) {
        createOptions.sparseModel = options.sparseModel;
      }
      if (options?.M) {
        createOptions.M = options.M;
      }
      if (options?.ef_con) {
        createOptions.efCon = options.ef_con;
      }

      await getEndeeClient().createIndex(createOptions);
      return { success: true, data: { success: true, message: "Index created successfully" } };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteIndex(
    indexName: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      await getEndeeClient().deleteIndex(indexName);
      return { success: true, data: { success: true, message: "Index deleted successfully" } };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async rebuildIndex(
    indexName: string,
    options: RebuildOptions
  ): Promise<ApiResponse<RebuildResult>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);
      const result = await index.rebuild(options);
      return { success: true, data: result };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getRebuildStatus(indexName: string): Promise<ApiResponse<RebuildStatus>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);
      const status = await index.getRebuildStatus();
      return { success: true, data: status };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ============================================================
  // VECTOR OPERATIONS
  // ============================================================

  async insertVectors(
    indexName: string,
    vectors: VectorItem[]
  ): Promise<ApiResponse<{ success: boolean; inserted: number }>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);
      await index.upsert(vectors);
      return { success: true, data: { success: true, inserted: vectors.length } };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getVector(
    indexName: string,
    request: VectorGetRequest
  ): Promise<ApiResponse<VectorInfo>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);

      if (request.id) {
        const result = await index.getVector(request.id);
        if (!result) {
          throw new Error("Vector not found");
        }
        return {
          success: true,
          data: {
            id: result.id,
            meta: result.meta,
            filter: result.filter,
            norm: result.norm,
            vector: result.vector,
          },
        };
      } else {
        throw new Error("Either id or filter must be provided");
      }
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteVectorById(
    indexName: string,
    vectorId: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);
      await index.deleteVector(vectorId);
      return { success: true, data: { success: true, message: "Vector deleted successfully" } };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateFilters(
    indexName: string,
    updates: Array<{ id: string; filter: Record<string, unknown> }>
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);
      await index.updateFilters(updates);
      return { success: true, data: { success: true, message: "Filters updated successfully" } };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteVectorsByFilter(
    indexName: string,
    filter: Array<Record<string, unknown>>
  ): Promise<ApiResponse<{ success: boolean; deleted: number }>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);
      const result = await index.deleteWithFilter(filter);
      return {
        success: true,
        data: {
          success: true,
          deleted: typeof result === "number" ? result : 0,
        },
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ============================================================
  // SEARCH OPERATIONS
  // ============================================================

  async searchVectors(
    indexName: string,
    request: SearchRequest
  ): Promise<ApiResponse<QueryResult[]>> {
    try {
      const index = await getEndeeClient().getIndex(indexName);

      const queryOptions: QueryOptions = {
        vector: request.vector,
        topK: request.k,
      };

      if (request.ef) {
        queryOptions.ef = request.ef;
      }
      if (request.filter) {
        try {
          queryOptions.filter = JSON.parse(request.filter);
        } catch {
          // If it's not valid JSON, pass as-is
        }
      }
      if (request.include_vectors) {
        queryOptions.includeVectors = request.include_vectors;
      }
      if (request.sparse_indices) {
        queryOptions.sparseIndices = request.sparse_indices;
      }
      if (request.sparse_values) {
        queryOptions.sparseValues = request.sparse_values;
      }

      const results = await index.query(queryOptions);
      return { success: true, data: results };
    } catch (error) {
      return handleApiError(error);
    }
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export the class for testing
export default ApiClient;
