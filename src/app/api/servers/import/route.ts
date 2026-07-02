import { NextResponse } from "next/server"
import { importServers, ServerStoreError } from "@/lib/serverStore"

export const dynamic = "force-dynamic"

// POST /api/servers/import  body: servers.json array -> replace the list (independent)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const servers = await importServers(body)
    return NextResponse.json({ servers })
  } catch (error) {
    if (error instanceof ServerStoreError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON file." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
