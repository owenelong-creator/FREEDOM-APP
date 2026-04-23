# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifact: `artifacts/freedom` (Freedom PWA, v1.2.0)

React + Vite + Tailwind PWA for teens overcoming digital addictions. Dark default with light toggle.

### Features
- Freedom Clock with milestones, streak counter (growing 🔥), daily quote (30 quotes, day-of-year indexed)
- Urge Surfing 5-min timer
- Trigger Journal
- Fortress lockdown
- Community feed (real-time, shared via Firestore)
- Settings with weekly urges chart (recharts)

### Cloud sync (Firebase)
- Auth: Google, Apple, Email/Password (`src/lib/auth-context.tsx`, gated by `src/components/auth-gate.tsx`)
- Per-user data synced to `users/{uid}` Firestore doc (start date, urges, journal, fortress, app name, theme) via `src/lib/sync.ts`
- Shared `posts` collection for community feed (`src/lib/community-store.ts`); offline cache via IndexedDB
- LocalStorage remains the device-side source of truth so the app works fully offline. Without `VITE_FIREBASE_*` env vars the AuthGate passes through to local-only mode.

### Required env vars (shared)
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` (optional)

### Firebase console setup the user must do
1. Authentication → Sign-in method: enable Google, Email/Password, (Apple optional, requires paid Apple Developer account)
2. Firestore Database: create in production mode
3. Authentication → Settings → Authorized domains: add the Replit dev domain and the deployed `.replit.app` domain
4. Firestore Rules (recommended starting rules):
   - `users/{uid}`: read/write only when `request.auth.uid == uid`
   - `posts/{id}`: read all signed-in users; create when `request.auth != null`; update reactions only
