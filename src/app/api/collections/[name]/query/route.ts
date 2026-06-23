import { NextResponse } from "next/server"
import type { QueryOptions } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/query?db=<database>  -> vector search
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const queryOptions = (await request.json()) as QueryOptions
    const index = await getImpersonatedClient(db).getIndex(name)
    const results = await index.query(queryOptions)
    return NextResponse.json(results)
  } catch (error) {
    return errorResponse(error)
  }
}
