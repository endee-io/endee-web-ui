import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/shrink?db=<database>  -> defragment storage in place
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const collection = await (await getImpersonatedClient(request, db)).getCollection(name)
    const result = await collection.shrink()
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
