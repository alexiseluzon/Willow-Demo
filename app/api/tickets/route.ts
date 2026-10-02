import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCreateTicketBody } from "@/lib/validation";
import { runTriage } from "@/lib/ai/triage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const maxDuration = 30;

// GET /api/tickets - list all tickets, newest first
export async function GET() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    include: { notes: true },
  });
  return NextResponse.json(tickets);
}

// POST /api/tickets - create a ticket
// Accepts manual submissions from the UI and n8n webhook payloads.
export async function POST(req: NextRequest) {
  const rl = rateLimit(`tickets:${clientIp(req.headers)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = parseCreateTicketBody(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({ data: parsed });
  after(() => runTriage(ticket.id));
  return NextResponse.json(ticket, { status: 201 });
}