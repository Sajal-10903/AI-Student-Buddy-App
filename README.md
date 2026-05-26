# AI Student Buddy

An adaptive AI-powered learning platform for students. Generate quizzes on any topic, study PDFs with AI-generated summaries and flashcards, track your performance, and let the system automatically adjust difficulty to match your level.

---

## Project Structure

```
workspace/
├── artifacts/
│   ├── api-server/           ← Express + TypeScript REST API
│   │   └── src/
│   │       ├── routes/       ← Request/response handlers (thin layer)
│   │       │   ├── auth.ts
│   │       │   ├── quiz.ts
│   │       │   ├── pdf.ts
│   │       │   ├── results.ts
│   │       │   ├── profile.ts
│   │       │   ├── adaptive.ts
│   │       │   └── output-history.ts
│   │       ├── services/     ← Business logic (framework-agnostic)
│   │       │   ├── pdf.service.ts      (summarise, flashcards, quiz gen)
│   │       │   ├── quiz.service.ts     (grading logic)
│   │       │   └── output.service.ts   (file I/O for generated content)
│   │       ├── middlewares/  ← JWT auth, request logging
│   │       └── lib/          ← Gemini AI client
│   │
│   └── student-buddy/        ← React + Vite frontend
│       └── src/
│           ├── pages/        ← Route-level page components
│           ├── components/   ← Shared UI components
│           └── lib/          ← Zustand store, utilities
│
├── lib/
│   ├── db/                   ← Drizzle ORM schema + PostgreSQL client
│   ├── api-spec/             ← OpenAPI specification (source of truth)
│   └── api-client-react/     ← Auto-generated React Query hooks (from OpenAPI)
│
└── output/                   ← Generated file storage (auto-created)
    ├── generated_files/      ← AI outputs: summaries, flashcards, quizzes
    └── saved_results/        ← Graded quiz results
```

---

## Backend Setup

The backend is a Node.js/TypeScript Express server.

```bash
# Install dependencies (from workspace root)
pnpm install

# Start the API server in development mode
pnpm --filter @workspace/api-server run dev

# The server runs on port 8080 (or $PORT if set)
```

The server hot-reloads on file changes during development.

---

## Frontend Setup

The frontend is a React + Vite single-page application.

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm --filter @workspace/student-buddy run dev
```

---

## Database Setup

The project uses PostgreSQL with Drizzle ORM.

```bash
# Push schema changes to the database
pnpm --filter @workspace/db run push
```

Schema is defined in `lib/db/src/schema/`.

---

## Output System

Every AI-generated artifact is saved to disk under `output/` at the workspace root.

| Directory | Contents |
|---|---|
| `output/generated_files/` | Summaries, flashcards, topic quizzes, PDF quizzes |
| `output/saved_results/`   | Graded quiz results submitted by users |

Files are named with a timestamp + random ID for uniqueness:
```
summary_2026-04-01T12-30-00_a3f7bc2d.json
result_2026-04-01T13-00-00_9e1c45a8.json
```

Each file includes a `_meta` block:
```json
{
  "_meta": {
    "type": "summary",
    "userId": 42,
    "topic": "lecture-notes.pdf",
    "createdAt": "2026-04-01T12:30:00.000Z"
  },
  ...content
}
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in, get JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Quiz
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quiz/generate` | Generate a quiz from a topic + difficulty |
| POST | `/api/quiz/submit` | Submit answers, get graded result |

### PDF Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pdf/upload` | Upload a PDF, extract text |
| GET  | `/api/pdf/` | List all user PDFs |
| GET  | `/api/pdf/:id` | Get single PDF metadata |
| POST | `/api/pdf/:id/summarize` | Generate AI summary |
| POST | `/api/pdf/:id/flashcards` | Generate flashcards |
| POST | `/api/pdf/:id/quiz` | Generate quiz from PDF |

### Results & Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/results/` | List all user results |
| GET | `/api/results/:id` | Get specific result with feedback |
| GET | `/api/profile/` | User profile + topic stats |

### Adaptive Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/adaptive/suggest` | Compute next-difficulty suggestion after a result |
| POST | `/api/adaptive/decide` | Accept or override the suggestion |
| GET  | `/api/adaptive/history` | Performance history for charts |
| GET  | `/api/adaptive/next-difficulty` | Recommended difficulty for next quiz |

### Output History
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/output-history` | List all generated files (newest first) |
| GET | `/api/output-history/download/:subdir/:filename` | Download a generated file |

---

## Architecture: Data Flow

```
Frontend → API Route → Service Layer → DB / AI / Output Folder → Response
```

- **Routes** handle HTTP: parse request, validate input, send response.
- **Services** contain business logic: AI calls, grading, file I/O.
- **Output Service** writes every generation to disk and provides history.
- **DB** (PostgreSQL + Drizzle) stores users, quizzes, results, PDFs, performance.

---

## Key Features

- **JWT Authentication** — access token (15 min) + refresh token (7 days)
- **AI Quiz Generation** — Gemini 2.5 Flash, any topic, three difficulty levels
- **PDF Learning** — drag-drop upload → Summary / Flashcards / Quiz tabs
- **PDF History** — revisit any previously uploaded PDF and regenerate content
- **Adaptive Difficulty** — rule-based RL system promotes/demotes difficulty based on score
- **Human-in-the-loop** — accept or override difficulty suggestions on the results page
- **Performance Dashboard** — score line chart with difficulty markers, history table, KPIs
- **Output Storage** — every generated file saved to disk with metadata for retrieval

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | JWT signing secret |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Replit AI proxy base URL |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Replit AI proxy API key |
| `PORT` | Server port (default 8080) |
