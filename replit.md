# AI Student Buddy

## Overview

Full-stack adaptive learning platform. pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

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
- **AI**: Gemini AI via Replit AI Integrations

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── student-buddy/      # React + Vite frontend (AI Student Buddy)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## AI Student Buddy

Full-stack adaptive learning platform at `/` (root).

### Features
- JWT Auth (register, login, token refresh)
- AI-powered quiz generation (Gemini 2.5 Flash via Replit AI Integrations)
- Quiz taking with timer (one question at a time)
- Evaluation with feedback + explanations
- Dashboard with performance charts (recharts)
- Topic-wise stats and weak area detection
- Adaptive next-quiz suggestions
- Responsive sidebar layout

### Frontend (artifacts/student-buddy)
- React + Vite + TypeScript + Tailwind
- Pages: Landing, Auth, Dashboard, Generate Quiz, Take Quiz, Results, Profile
- State: Zustand (auth store + quiz state)
- Charts: Recharts

### Backend (artifacts/api-server)
- Routes: `/api/auth/*`, `/api/quiz/*`, `/api/results/*`, `/api/profile/*`
- JWT auth with access (15m) + refresh (7d) tokens
- Gemini AI for quiz generation with retry logic

### DB Schema
- `users` — id, name, email, password_hash, created_at
- `quizzes` — id, user_id, topic, difficulty, questions (JSONB), created_at
- `results` — id, user_id, quiz_id, topic, difficulty, score, accuracy, time, feedback (JSONB), completed_at

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/`.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Auth: JWT via `jsonwebtoken`, passwords via `bcryptjs`
- AI: Gemini via `@google/genai` using Replit AI Integrations env vars
- `pnpm --filter @workspace/api-server run dev` — run the dev server

### `artifacts/student-buddy` (`@workspace/student-buddy`)

React + Vite frontend served at `/`.

- `pnpm --filter @workspace/student-buddy run dev` — run the dev server

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/users.ts` — users table
- `src/schema/quizzes.ts` — quizzes table (questions stored as JSONB)
- `src/schema/results.ts` — results table (feedback stored as JSONB)
- `pnpm --filter @workspace/db run push` — push schema to DB

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
