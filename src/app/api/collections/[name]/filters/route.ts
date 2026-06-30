import { NextResponse } from "next/server"
import type { UpdateFilterEntry } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/filters?db=<database>
//   body { updates: [{ id, filter }] }  -> update filter tags on existing objects
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { updates } = (await request.json()) as { updates: UpdateFilterEntry[] }
    const collection = await getImpersonatedClient(request, db).getCollection(name)
    const result = await collection.updateFilters(updates)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
