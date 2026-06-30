import { NextResponse } from "next/server"
import type { ObjectInput } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/objects?db=<database>  -> upsert objects
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { objects } = (await request.json()) as { objects: ObjectInput[] }
    const collection = await getImpersonatedClient(request, db).getCollection(name)
    const result = await collection.upsert(objects)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/collections/<name>/objects?db=<database>
//   body { filter }  -> delete every object matching a filter
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { filter } = (await request.json().catch(() => ({}))) as {
      filter?: Array<Record<string, unknown>>
    }
    if (!filter) {
      return NextResponse.json({ error: "filter is required" }, { status: 400 })
    }
    const collection = await getImpersonatedClient(request, db).getCollection(name)
    const result = await collection.deleteByFilter(filter)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
