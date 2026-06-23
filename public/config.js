// Runtime configuration injected into the browser.
//
// This file is a placeholder for local development. In Docker, the container
// entrypoint (docker-entrypoint.sh) OVERWRITES this file at startup using the
// ENDEE_URL environment variable, so a single built image can target any
// Endee server without rebuilding.
//
// For local dev, set the URL in .env.local (NEXT_PUBLIC_ENDEE_URL) instead;
// see src/config.ts for the resolution order.
window.__ENV__ = window.__ENV__ || {};
window.__ENV__.ENDEE_URL = window.__ENV__.ENDEE_URL || "";
