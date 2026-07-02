import { NextResponse } from "next/server"
import { deleteServer, ServerStoreError } from "@/lib/serverStore"

export const dynamic = "force-dynamic"

// DELETE /api/servers/<name>  -> remove a server (independent mode)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const servers = await deleteServer(decodeURIComponent(name))
    return NextResponse.json({ servers })
  } catch (error) {
    if (error instanceof ServerStoreError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
