# `@code-launcher/client-with-vite`

Vite + React SPA for the `code:launcher` UI.

This is an internal workspace package. The full project README, including
how to run and configure everything, lives at the repo root.

## Local development

From the repo root:

```bash
pnpm install
pnpm dev
```

The dev script runs both the Vite dev server (port `19002`) and the
Fastify API server (port `19001`) in parallel; the Vite config proxies
`/api` to the API server.

## Layout

- `src/App.tsx` — top-level page composition
- `src/components/` — section components (SmartBar, ProjectsList, …)
- `src/lib/store.ts` — valtio store
- `src/lib/apiService.ts` — typed fetch wrapper around `/api/*`
