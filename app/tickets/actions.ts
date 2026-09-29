"use server";

import { after } from "next/server";
import { runTriage } from "@/lib/ai/triage";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTicket(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  const ticket = await prisma.ticket.create({
    data: { title, detail: detail || null },
  });
  after(() => runTriage(ticket.id));

  revalidatePath("/tickets");
}

export async function updateTicketStatus(id: string, status: string) {
  const valid = ["OPEN", "IN_PROGRESS", "RESOLVED"];
  if (!valid.includes(status)) {
    throw new Error("Invalid status.");
  }

  await prisma.ticket.update({
    where: { id },
    data: { status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" },
  });

  revalidatePath("/tickets");
}

export async function deleteTicket(id: string) {
  await prisma.ticket.delete({ where: { id } });
  revalidatePath("/tickets");
}