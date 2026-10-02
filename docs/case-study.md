# Willow Demo: Adding an AI Layer to a Support Ticket Tracker

**Live demo:** https://willow-demo.vercel.app/tickets · **Code:** github.com/alexiseluzon/Willow-Demo

## The problem
Support teams lose time on the same manual steps: reading each new ticket, deciding what it is and how urgent it is, checking whether it has happened before, and alerting someone when it's serious.

## What I built
I extended my full-stack ticket tracker (Next.js, Prisma, Postgres, n8n) with an AI layer:

- **Auto-triage:** every new ticket, from the UI or an n8n webhook, is categorized, prioritized and summarized by an LLM as schema-validated JSON.
- **Similar tickets (RAG):** tickets are embedded and stored in pgvector, so related past tickets surface by cosine similarity.
- **Agent with tool calling:** an assistant on each ticket page can search similar tickets, add notes and propose status changes. Status changes require user confirmation.
- **Outbound automation:** urgent tickets post to a Slack-compatible webhook.

## What I personally did
Everything: schema and migrations (including enabling pgvector on Neon), the LLM client, structured-output triage, the embeddings and similarity queries, the tool-calling loop and its UI, the notification module, the reliability layer, the test suites, CI, and the docs.

## Decisions I'm proud of
- **The model can't act outside its sandbox.** The server binds the ticket id, tools are validated, and the agent only proposes status changes. A user confirms before anything is written.
- **AI failure is a normal state, not a crash.** Invalid or missing model output marks the ticket for manual triage with a one-click retry.
- **Provider-agnostic design.** When my first LLM provider denied access to my project, I switched to another OpenAI-compatible provider by changing configuration and one small client file.
- **Tested without burning tokens.** The LLM is mocked in Jest and Supertest tests, including a test proving the agent never writes a status change on its own. A Playwright test covers the full flow against real services.

## Challenges
- **Provider access and model changes:** a denied project and a deprecated model name forced me to isolate the LLM behind one client and a config-driven model name.
- **Embeddings on serverless:** local embedding models don't load reliably on Vercel. I made embedding a graceful no-op and documented a hosted-API swap point instead of hiding the limitation.

## Stack
Next.js 16, TypeScript, Prisma 7, PostgreSQL (Neon) + pgvector, zod, OpenAI-compatible LLM API, Hugging Face Transformers (local embeddings), n8n, Jest, Supertest, Playwright, GitHub Actions.

## Honest limitations
In-memory rate limiting, no auth, and similar-ticket search runs locally rather than on the Vercel deployment.