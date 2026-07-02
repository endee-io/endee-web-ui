import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/backup?db=<database>
//   body { name }  -> start an async backup of a collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const { name: backupName } = (await request.json()) as { name: string }
    const collection = await (await getImpersonatedClient(request, db)).getCollection(name)
    const result = await collection.createBackup(backupName)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
