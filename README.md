# Follow-up Tracker

A full-stack internal tool demo: a support-ticket / follow-up tracker built to mirror how a small internal system might be migrated off low-code tooling (Knack, Make) into custom, maintainable code.

**Live app:** https://willow-demo.vercel.app/tickets

## Why this exists

Built to demonstrate a specific stack and pattern: a Next.js app that is genuinely full-stack (UI + backend in one codebase), backed by a real relational schema, with an external automation platform (n8n) writing into it via webhook — the same shape as migrating a workflow off a low-code tool into custom software.

## Stack

- **Next.js 16 (App Router)** — Server Components, Server Actions, and API routes in a single codebase
- **TypeScript** — `strict: true`
- **Prisma 7** — ORM, relational schema (`Ticket` → `Note`, one-to-many)
- **PostgreSQL (Neon)** — pooled connection for the app at runtime, direct connection for migrations
- **n8n** — webhook workflow that creates tickets from an external trigger, tagged with `source: N8N`
- **Tailwind CSS** — styling
- **AI layer** — OpenAI-compatible chat API (Groq by default) for structured triage and tool calling; `zod` validates every model output
- **Local embeddings** — `all-MiniLM-L6-v2` via `@huggingface/transformers` (384 dims) stored in **pgvector** on Neon
- **Testing** — Jest (unit), Supertest (API routes), Playwright (E2E), GitHub Actions CI

## Architecture notes

**Two write paths into the same table, by design:**
- `app/tickets/actions.ts` — Server Actions, used by the dashboard UI (`app/tickets/page.tsx`)
- `app/api/tickets/route.ts` and `app/api/tickets/[id]/route.ts` — REST API routes, used by the n8n webhook and available for any other external caller

Both paths share the same validation logic (`lib/validation.ts`), so a ticket created by a human via the form and a ticket created by an automation follow the exact same rules — no duplicated or drifting logic between the two entry points.

## AI features

| Feature | Where | What it does |
|---|---|---|
| Auto-triage | `lib/ai/triage.ts` | New tickets get a category, priority and one-line summary as schema-validated JSON |
| Similar tickets (RAG) | `lib/ai/embeddings.ts`, `lib/ai/similar.ts` | Each ticket is embedded; related tickets are found by cosine similarity in pgvector |
| Agent | `lib/ai/tools.ts`, `app/api/agent/route.ts` | Tool-calling assistant on the ticket page: search similar tickets, add notes, propose status changes |
| Notifications | `lib/notify.ts` | High and urgent tickets post to a Slack-compatible webhook |

**Safety and reliability**
- Model output is validated with `zod`; invalid output marks the ticket `FAILED` for manual triage, with a one-click retry
- The agent can only act on the current ticket (the server binds the ticket id, the model never supplies it)
- `update_status` only *proposes* a change; the user must confirm in the UI before anything is written
- Ticket text is treated as untrusted data in prompts and escaped in outbound messages
- Timeouts, one retry with backoff, input length limits, and in-memory rate limiting on public routes

See [docs/architecture.md](docs/architecture.md) for the flow and design decisions.

**Database connection split (Neon + Prisma 7):**
- `DATABASE_URL` — pooled connection (PgBouncer), used by the app at runtime via `@prisma/adapter-pg` (`lib/prisma.ts`)
- `DIRECT_URL` — direct connection, used only for migrations (`prisma.config.ts`)

This avoids exhausting Postgres's connection limit under serverless traffic, while still letting `prisma migrate dev` run against a connection that supports schema changes.

## Data model

```
Ticket
  id, title, detail, status (OPEN | IN_PROGRESS | RESOLVED)
  source (MANUAL | N8N), createdAt, updatedAt
  category, priority, summary, triageStatus (PENDING | DONE | FAILED)
  embedding vector(384)
  notes: Note[]

Note
  id, body, ticketId (→ Ticket, cascade delete), createdAt
```

## n8n integration

A webhook-triggered workflow maps an incoming payload to the ticket shape and POSTs it to `/api/tickets` with `source: "N8N"`. Tickets created this way are visibly tagged in the UI, distinguishing automation-originated tickets from manually created ones — this is the piece meant to mirror a real "external system feeds our internal tool" integration.

The exported workflow (`n8n.workflow.json`) is included in this repo and can be re-imported into any n8n instance via **Import from File**.

## Local setup

```powershell
npm install
Copy-Item .env.example .env   # then fill in the values below
npx prisma migrate dev
npm run dev
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection (runtime) |
| `DIRECT_URL` | Neon direct connection (migrations; pgvector is enabled by the first AI migration) |
| `LLM_API_KEY` | Key for any OpenAI-compatible provider |
| `LLM_BASE_URL` | Provider endpoint (default: Groq) |
| `LLM_MODEL` | Chat model with JSON-schema and tool-calling support |
| `APP_URL` | Base URL used in notification links |
| `NOTIFY_WEBHOOK_URL` | Optional Slack-compatible webhook for high-priority alerts |

Open http://localhost:3000/tickets.

## Testing

```powershell
npm test            # Jest unit tests + Supertest route tests (LLM mocked)
npm run test:e2e    # Playwright: create → triage → agent → confirm (needs real DB and LLM key)
```

CI runs lint, type-check and Jest on every push and pull request.

## Known limitations

- Local embeddings need a long-lived Node process. On Vercel serverless the model does not load, so similar-ticket search is empty in production (everything else works). A hosted embeddings API would fix this by changing only `embedText()`.
- Rate limiting is in-memory (per instance); use Redis/Upstash for a shared limit
- The agent is stateless per message (no conversation memory)
- No authentication or real-time updates, to keep the demo focused

---

© 2026 Alexis Luzon. Demo project provided "as is", without warranty of any kind. Not intended for production use. Do not submit real customer data.