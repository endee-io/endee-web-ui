import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// DELETE /api/backups/<backupName>?db=<database>  -> delete a backup
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const result = await getImpersonatedClient(request, db).deleteBackup(backupName)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
