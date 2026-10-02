"use server";

import { after } from "next/server";
import { runTriage } from "@/lib/ai/triage";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { MAX_TITLE, MAX_DETAIL } from "@/lib/validation";

export async function createTicket(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (title.length > MAX_TITLE || detail.length > MAX_DETAIL) {
    throw new Error("Title or detail is too long.");
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

export async function retryTriage(id: string) {
  const rl = rateLimit(`retry:${clientIp(await headers())}`, 5, 60_000);
  if (!rl.ok) return;

  await runTriage(id);
  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
}