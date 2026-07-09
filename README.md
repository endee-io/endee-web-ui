# Endee Web UI

Web console for **Endee** — a vector database. Built with **Next.js 16** (App
Router, standalone output), **React 19**, **TailwindCSS 4**, and the `endee`
client SDK.

The browser never talks to an Endee server directly. Every Endee request is
proxied through this app's Next.js route handlers, which resolve the active
server's URL and **root token server-side**. The token is never sent to the
browser.

---

## Table of contents

- [How this app is run](#how-this-app-is-run)
- [Architecture at a glance](#architecture-at-a-glance)
- [Application modes](#application-modes)
- [Prerequisites](#prerequisites)
- [Configuration (environment)](#configuration-environment)
- [Run alongside the Endee server](#run-alongside-the-endee-server)
- [Run standalone (multi-server) with Docker Compose](#run-standalone-multi-server-with-docker-compose)
- [Build & run the Docker image directly](#build--run-the-docker-image-directly)
- [Local development (no Docker)](#local-development-no-docker)
- [Common operations](#common-operations)
- [Troubleshooting](#troubleshooting)

---

## How this app is run

There are two ways to run the console:

1. **With the Endee server** — the Endee server's own `docker-compose` stack
   includes this image and runs it in **single-server** mode, published on
   **`8081:3000`**. The UI is wired to the bundled Endee server automatically.
   You just build/publish this image; the Endee server repo owns that compose.

2. **Standalone** — run this repo's `docker-compose.yml` on your own in
   **multi-server** mode, published on **`3000:3000`**. You add Endee servers
   from the UI, and the list is persisted to a mounted volume. This is what the
   compose file in this repository is for.

---

## Architecture at a glance

```
Browser ──HTTP──▶ Next.js (endee-web) ──HTTP──▶ Endee server (vector DB)
                  │  resolves server URL + root token SERVER-SIDE
                  └─ proxies every /api/* call
```

- The frontend listens on **port 3000** inside the container.
- The root token stays inside the frontend container — it is never sent to the
  browser.

---

## Application modes

The UI discovers Endee servers based on the `APP_MODE` env var, read at
**runtime** (no rebuild needed to switch modes):

| `APP_MODE`      | Description                                                                                                | Server management in UI | Typical port |
| --------------- | --------------------------------------------------------------------------------------------------------- | ----------------------- | ------------ |
| `single-server` | One server from `NDD_SERVER_URL` / `NDD_ROOT_TOKEN`. Used inside the Endee server's compose stack.         | Disabled (read-only)    | `8081:3000`  |
| `multi-server`  | Servers are user-managed in the UI and persisted to `SERVERS_FILE`. Add / import / download enabled.       | Enabled                 | `3000:3000`  |

---

## Prerequisites

- **Docker** and **Docker Compose v2** (`docker compose ...`).
- For local development instead: **Node.js 22+** and **pnpm 10** (`corepack enable`).

---

## Configuration (environment)

Copy the example env file and fill it in:

```bash
cp .env.example .env
```

| Variable          | Mode          | Description                                                                                          |
| ----------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `APP_MODE`        | both          | `single-server` or `multi-server`. Default `single-server`.                                          |
| `NDD_SERVER_URL`  | single-server | Base URL of the Endee server, reached by the **Next server** (not the browser). e.g. `http://endee:8080/api/v2`. `ENDEE_URL` accepted as fallback. |
| `NDD_ROOT_TOKEN`  | single-server | Admin root token. Read **server-side only** — never sent to the browser. `ROOT_TOKEN` accepted as fallback. |
| `NDD_SERVER_NAME` | single-server | Optional display name for the deployment (default `Endee`).                                          |
| `SERVERS_FILE`    | multi-server  | Path to the user-managed server list JSON. Mount on a volume to persist. Default `./data/servers.json`. |

---

## Run alongside the Endee server

The Endee server's own Docker Compose stack references this image and runs it in
single-server mode on **`8081:3000`**. From this repo you only need to make the
image available to that stack.

1. **Build (and tag) the image** so the Endee server compose can consume it:

   ```bash
   # From the endee-web repository root
   docker build -t endee-web:latest .
   ```

   > The Endee server compose file references the `endee-web` image. If you pull
   > it from a registry instead, tag it to match that reference.

2. **Bring up the Endee server stack** (from the Endee server repository):

   ```bash
   docker compose up -d
   ```

3. Open the console at **http://localhost:8081**.

The frontend reaches the Endee server over the internal compose network by its
service name — the Endee port need not be published to the host, and the root
token stays inside the frontend container.

---

## Run standalone (multi-server) with Docker Compose

Runs **only** the frontend on **`3000:3000`**. You add Endee servers from the
UI; the list (and its tokens) is persisted to `./data/servers.json` via a
mounted volume, so it survives restarts.

```bash
# Build and start
docker compose up -d --build

# Follow logs
docker compose logs -f

# Stop
docker compose down

# Stop and remove the persisted server-list volume as well
docker compose down -v
```

File: [docker-compose.yml](docker-compose.yml)

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    image: endee-web:latest
    ports:
      - "3000:3000"
    environment:
      - APP_MODE=multi-server
      - SERVERS_FILE=/data/servers.json
    volumes:
      - ./data:/data   # persists the user-managed server list
    restart: unless-stopped
```

Open **http://localhost:3000** and use the **Servers** page to add / import /
download servers.

### Optionally seed the server list before first run

```bash
mkdir -p data
cp servers.example.json data/servers.json
# then edit data/servers.json with your server name / url / token
```

`data/servers.json` format:

```json
[
  {
    "name": "Local",
    "url": "http://localhost:8080/api/v2",
    "token": "your-root-token-here"
  }
]
```

---

## Build & run the Docker image directly

Without compose, using the multi-stage [Dockerfile](Dockerfile) (Next.js
standalone output on `node:22-alpine`, runs as a non-root user, exposes 3000):

```bash
# Build
docker build -t endee-web:latest .

# Run — multi-server mode on port 3000, with a volume for the server list
docker run -d --name endee-web -p 3000:3000 \
  -e APP_MODE=multi-server \
  -e SERVERS_FILE=/data/servers.json \
  -v "$(pwd)/data:/data" \
  endee-web:latest
```

To run it in single-server mode directly (pointing at an existing Endee server):

```bash
# Server-side URL + token used by the Next server to reach the Endee server
export NDD_SERVER_URL="http://host.docker.internal:8080/api/v2"
export NDD_ROOT_TOKEN="<your-endee-root-token>"

docker run -d --name endee-web -p 3000:3000 \
  -e APP_MODE=single-server \
  -e NDD_SERVER_URL="$NDD_SERVER_URL" \
  -e NDD_ROOT_TOKEN="$NDD_ROOT_TOKEN" \
  endee-web:latest
```

> `host.docker.internal` lets the container reach an Endee server running on the
> host (macOS/Windows). On Linux, use the host IP or `--network host`.

## Build and push to docker hub
```bash
 docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t endeeio/endee-web:latest \
  --push .
```

---

## Local development (no Docker)

```bash
# Enable pnpm (bundled with Node via corepack)
corepack enable

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# edit .env — set APP_MODE and the relevant vars for that mode

# Start the dev server (webpack; Next 16 defaults to Turbopack, we pass --webpack
# because the endee SDK needs Node built-in polyfills configured in next.config.ts)
pnpm dev
```

Open **http://localhost:3000**.

Other scripts:

```bash
pnpm build   # production build (standalone output)
pnpm start   # run the production build
pnpm lint    # eslint
```

---

## Common operations

```bash
# Rebuild after code changes
docker compose up -d --build

# View logs
docker compose logs -f

# Shell into the running container
docker compose exec frontend sh

# Tear down
docker compose down

# Tear down including the persisted server-list volume
docker compose down -v
```

---

## Troubleshooting

- **Server list not persisting (multi-server)** — ensure `./data` is mounted and
  writable, and `SERVERS_FILE` points inside the mount (`/data/servers.json`).
- **Blank page / "cannot reach server" errors** — check the logs
  (`docker compose logs -f`). Verify the Endee server URL you added is reachable
  **from inside the container** (use a routable host, not `localhost`).
- **Frontend can't reach an Endee server on the host** — from a container use
  `host.docker.internal` (macOS/Windows) or the host IP / `--network host`
  (Linux), not `localhost`.
- **401 / unauthorized** — the root token for that server is missing or wrong.
- **Build/runtime crypto or Buffer errors** — the app uses webpack (`--webpack`)
  so the endee SDK's Node built-in polyfills in [next.config.ts](next.config.ts)
  are applied. Don't switch to Turbopack without porting those polyfills.
```

