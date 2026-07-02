#!/bin/sh
set -e

# The browser never talks to the Endee server directly — every request is
# proxied through this app's Next.js route handlers, which resolve the active
# server's URL + root token SERVER-SIDE (from env in bundled mode, or the
# on-disk servers file in independent mode). No browser config injection needed.
#
# In independent mode, ensure the directory that holds the user-managed server
# list exists so the first write succeeds. Best-effort: a read-only mount just
# means the app surfaces a write error instead.
if [ "$APP_MODE" = "independent" ]; then
  SERVERS_FILE="${SERVERS_FILE:-./data/servers.json}"
  mkdir -p "$(dirname "$SERVERS_FILE")" 2>/dev/null || true
fi

exec "$@"
