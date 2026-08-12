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
- **Jest** — unit tests on core validation logic

## Architecture notes

**Two write paths into the same table, by design:**
- `app/tickets/actions.ts` — Server Actions, used by the dashboard UI (`app/tickets/page.tsx`)
- `app/api/tickets/route.ts` and `app/api/tickets/[id]/route.ts` — REST API routes, used by the n8n webhook and available for any other external caller

Both paths share the same validation logic (`lib/validation.ts`), so a ticket created by a human via the form and a ticket created by an automation follow the exact same rules — no duplicated or drifting logic between the two entry points.

**Database connection split (Neon + Prisma 7):**
- `DATABASE_URL` — pooled connection (PgBouncer), used by the app at runtime via `@prisma/adapter-pg` (`lib/prisma.ts`)
- `DIRECT_URL` — direct connection, used only for migrations (`prisma.config.ts`)

This avoids exhausting Postgres's connection limit under serverless traffic, while still letting `prisma migrate dev` run against a connection that supports schema changes.

## Data model

```
Ticket
  id, title, detail, status (OPEN | IN_PROGRESS | RESOLVED)
  source (MANUAL | N8N), createdAt, updatedAt
  notes: Note[]

Note
  id, body, ticketId (→ Ticket, cascade delete), createdAt
```

## n8n integration

A webhook-triggered workflow maps an incoming payload to the ticket shape and POSTs it to `/api/tickets` with `source: "N8N"`. Tickets created this way are visibly tagged in the UI, distinguishing automation-originated tickets from manually created ones — this is the piece meant to mirror a real "external system feeds our internal tool" integration.

The exported workflow (`n8n-workflow.json`) is included in this repo and can be re-imported into any n8n instance via **Import from File**.

## Local setup

```bash
npm install
cp .env.example .env   # fill in your Neon DATABASE_URL (pooled) and DIRECT_URL (direct)
npx prisma migrate dev
npm run dev
```

## Testing

```bash
npm test
```

Covers the shared validation logic (`lib/validation.ts`) that both the Server Actions and API routes depend on — status validation and ticket-creation input parsing/sanitization.

## What's intentionally out of scope

- Real-time updates (the dashboard is server-rendered on request, not push-based) — not called for by the target use case, and not worth the added complexity for a demo project
- Authentication — omitted to keep the demo focused on the Next.js/Prisma/n8n integration pattern itself