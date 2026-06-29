import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/collections/<name>/rebuild/status?db=<database>  -> rebuild progress
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const collection = await getImpersonatedClient(db).getCollection(name)
    const result = await collection.rebuildStatus()
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
