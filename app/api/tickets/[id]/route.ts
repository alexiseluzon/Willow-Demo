import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VALID_STATUSES, isValidStatus } from "@/lib/validation";

// PATCH /api/tickets/:id - update status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body || !isValidStatus(body.status)) {
    return NextResponse.json(
      { error: `status must be one of ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }
}

// DELETE /api/tickets/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.ticket.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }
}