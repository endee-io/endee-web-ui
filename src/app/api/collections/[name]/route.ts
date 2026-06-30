import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/collections/<name>?db=<database>  -> describe a collection
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const collection = await getImpersonatedClient(request, db).getCollection(name)
    return NextResponse.json(await collection.describe())
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/collections/<name>?db=<database>  -> delete a collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    await getImpersonatedClient(request, db).deleteCollection(name)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
