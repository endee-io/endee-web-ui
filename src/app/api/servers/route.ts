import { NextResponse } from "next/server"
import { addServer, listPublicServers, ServerStoreError } from "@/lib/serverStore"

export const dynamic = "force-dynamic"

function storeError(error: unknown): NextResponse {
  if (error instanceof ServerStoreError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  const message = error instanceof Error ? error.message : "Unknown error"
  return NextResponse.json({ error: message }, { status: 500 })
}

// GET /api/servers -> { servers: { name, url }[] }  (tokens stripped)
export async function GET() {
  try {
    return NextResponse.json({ servers: await listPublicServers() })
  } catch (error) {
    return storeError(error)
  }
}

// POST /api/servers  body { name, url, token }  -> add a server (multi-server mode)
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; url?: string; token?: string }
    const servers = await addServer(body)
    return NextResponse.json({ servers })
  } catch (error) {
    return storeError(error)
  }
}
