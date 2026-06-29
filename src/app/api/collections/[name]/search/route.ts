import { NextResponse } from "next/server"
import { rerank } from "endee"
import type { SearchOptions } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

interface RerankRequest {
  limit?: number
  fieldWeights?: Record<string, number> | null
  rrfK?: number
}

// POST /api/collections/<name>/search?db=<database>
//   body: SearchOptions, plus an optional `rerank` block to fuse the per-field
//   results into a single ranked list (Reciprocal Rank Fusion) server-side.
//   -> { fused: false, results: { [field]: SearchHit[] } }  (default)
//   -> { fused: true,  results: SearchHit[] }                (when `rerank` set)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { rerank: rerankOpts, ...options } = (await request.json()) as SearchOptions & {
      rerank?: RerankRequest
    }
    const collection = await getImpersonatedClient(db).getCollection(name)
    const searchResults = await collection.search(options)

    if (rerankOpts) {
      const fused = rerank({ searchResults, ...rerankOpts })
      return NextResponse.json({ fused: true, results: fused.results })
    }
    return NextResponse.json({ fused: false, results: searchResults.results })
  } catch (error) {
    return errorResponse(error)
  }
}
