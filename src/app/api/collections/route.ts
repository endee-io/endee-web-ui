import { NextResponse } from "next/server"
import type { FieldDefinition } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/collections?db=<database>  -> list collections
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const collections = await getImpersonatedClient(request, db).listCollections()
    return NextResponse.json({ collections })
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/collections?db=<database>  -> create a collection with typed fields
export async function POST(request: Request) {
  try {
    const db = requireDatabase(request)
    const { name, fields } = (await request.json()) as {
      name: string
      fields: FieldDefinition[]
    }
    await getImpersonatedClient(request, db).createCollection({ name, fields })
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
