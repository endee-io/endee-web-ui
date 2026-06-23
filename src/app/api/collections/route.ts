import { NextResponse } from "next/server"
import type { CreateIndexOptions } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/collections?db=<database>  -> list collections (indexes)
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const response = await getImpersonatedClient(db).listIndexes()
    return NextResponse.json(response)
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/collections?db=<database>  -> create a collection (index)
export async function POST(request: Request) {
  try {
    const db = requireDatabase(request)
    const options = (await request.json()) as CreateIndexOptions
    await getImpersonatedClient(db).createIndex(options)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
