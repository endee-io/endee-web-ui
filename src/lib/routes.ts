'use client'

import { useParams } from 'next/navigation'

/** URL-encode a path segment (server/database names may contain spaces). */
export function seg(value: string): string {
  return encodeURIComponent(value)
}

/** Build the path to the databases list for a server. */
export function serverPath(server: string): string {
  return `/${seg(server)}`
}

/** Build a path scoped to a server + database, e.g. dbPath(s, d, 'collections'). */
export function dbPath(server: string, database: string, sub = ''): string {
  const base = `/${seg(server)}/${seg(database)}`
  if (!sub) return base
  return `${base}/${sub.replace(/^\/+/, '')}`
}

/**
 * Read the current server/database from the URL and return helpers that build
 * paths relative to them. Use inside dashboard pages so links stay scoped to
 * the active server + database without threading params through props.
 */
export function useDbRoute() {
  const params = useParams<{ server?: string; database?: string }>()
  const server = params?.server ? decodeURIComponent(params.server) : ''
  const database = params?.database ? decodeURIComponent(params.database) : ''
  return {
    server,
    database,
    /** Path within the current database, e.g. path('collections/create'). */
    path: (sub = '') => dbPath(server, database, sub),
    /** Path to this server's databases list. */
    serverPath: () => serverPath(server),
  }
}
