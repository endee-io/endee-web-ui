import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/backups/<backupName>/restore?db=<database>
//   body { target_collection_name }  -> restore a backup into a new collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const { target_collection_name } = (await request.json()) as {
      target_collection_name: string
    }
    const result = await getImpersonatedClient(db).restoreBackup(
      backupName,
      target_collection_name
    )
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
