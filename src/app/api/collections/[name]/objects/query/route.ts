import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/objects/query?db=<database>
//   body { ids }  -> fetch full stored objects (meta, filter, vectors) by id
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { ids } = (await request.json()) as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "a non-empty array of ids is required" },
        { status: 400 }
      )
    }
    const collection = await (await getImpersonatedClient(request, db)).getCollection(name)
    const objects = await collection.getObjects(ids)
    return NextResponse.json({ objects })
  } catch (error) {
    return errorResponse(error)
  }
}
