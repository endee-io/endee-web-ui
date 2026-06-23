import { NextResponse } from "next/server"
import type { VectorItem } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/collections/<name>/vectors?db=<database>&id=<id>  -> get one vector
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const id = new URL(request.url).searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }
    const index = await getImpersonatedClient(db).getIndex(name)
    const result = await index.getVector(id)
    if (!result) {
      return NextResponse.json({ error: "Vector not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/collections/<name>/vectors?db=<database>  -> upsert vectors
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { vectors } = (await request.json()) as { vectors: VectorItem[] }
    const index = await getImpersonatedClient(db).getIndex(name)
    await index.upsert(vectors)
    return NextResponse.json({ success: true, inserted: vectors.length })
  } catch (error) {
    return errorResponse(error)
  }
}

// PATCH /api/collections/<name>/vectors?db=<database>  -> update filters
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { updates } = (await request.json()) as {
      updates: Array<{ id: string; filter: Record<string, unknown> }>
    }
    const index = await getImpersonatedClient(db).getIndex(name)
    await index.updateFilters(updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/collections/<name>/vectors?db=<database>
//   ?id=<id>            -> delete a single vector by id
//   body { filter }     -> delete by filter
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const index = await getImpersonatedClient(db).getIndex(name)

    const id = new URL(request.url).searchParams.get("id")
    if (id) {
      await index.deleteVector(id)
      return NextResponse.json({ success: true })
    }

    const body = (await request.json().catch(() => ({}))) as {
      filter?: Array<Record<string, unknown>>
    }
    if (body.filter) {
      const result = await index.deleteWithFilter(body.filter)
      return NextResponse.json({
        success: true,
        deleted: typeof result === "number" ? result : 0,
      })
    }

    return NextResponse.json({ error: "id or filter is required" }, { status: 400 })
  } catch (error) {
    return errorResponse(error)
  }
}
