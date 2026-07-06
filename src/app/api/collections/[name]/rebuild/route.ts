import { NextResponse } from "next/server"
import type { RebuildFieldSpec } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/rebuild?db=<database>
//   body { fields: RebuildFieldSpec[] }  -> rebuild dense fields' HNSW graphs
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { fields } = (await request.json()) as { fields: RebuildFieldSpec[] }
    const collection = await (await getImpersonatedClient(request, db)).getCollection(name)
    const result = await collection.rebuild(fields)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
