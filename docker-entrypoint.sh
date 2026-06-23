#!/bin/sh
set -e

# Inject runtime configuration into the static config.js that the browser loads.
# This lets a single built image target any Endee server via the ENDEE_URL env
# var, without rebuilding. The browser talks to the Endee server DIRECTLY, so
# ENDEE_URL must be reachable from the user's browser (not just from this
# container) and the Endee server must allow CORS for this frontend's origin.
#
# In the Next.js standalone output, public/ assets are served from ./public.

CONFIG_FILE="${CONFIG_FILE:-/app/public/config.js}"
ENDEE_URL="${ENDEE_URL:-}"

cat > "$CONFIG_FILE" <<EOF
window.__ENV__ = window.__ENV__ || {};
window.__ENV__.ENDEE_URL = "${ENDEE_URL}";
EOF

echo "[entrypoint] Wrote ${CONFIG_FILE} with ENDEE_URL=${ENDEE_URL:-<empty>}"

exec "$@"
