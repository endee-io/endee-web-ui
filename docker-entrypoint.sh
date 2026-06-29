#!/bin/sh
set -e

# The browser no longer talks to the Endee server directly — every request is
# proxied through this app's Next.js route handlers, which read the backend URL
# (NEXT_PUBLIC_SERVER_URL) and the admin token (ROOT_TOKEN) from the container
# environment at request time. No runtime browser config injection is needed.

exec "$@"
