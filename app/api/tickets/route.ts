import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const body = await req.json().catch(() => null);

  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json(
      { error: "A non-empty 'title' field is required." },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.create({
    data: {
      title: body.title.trim(),
      detail: typeof body.detail === "string" ? body.detail.trim() : null,
      source: body.source === "N8N" ? "N8N" : "MANUAL",
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}