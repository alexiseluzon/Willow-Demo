import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { findSimilar } from "@/lib/ai/similar";
import { AgentPanel } from "@/components/AgentPanel";
import { retryTriage } from "@/app/tickets/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "desc" } } },
  });
  if (!ticket) notFound();

  const similar = await findSimilar(id).catch(() => []);
  const fmt = (d: Date) =>
    new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila" });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <Link href="/tickets" className="text-sm text-blue-600 hover:underline">
        ← Back to tickets
      </Link>

      <header className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
            {ticket.status.replace("_", " ")}
          </span>
          {ticket.category && (
            <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-800">
              {ticket.category.replace("_", " ")}
            </span>
          )}
          {ticket.priority && (
            <span className={`rounded-full px-2 py-1 ${PRIORITY_STYLES[ticket.priority]}`}>
              {ticket.priority}
            </span>
          )}
          {ticket.triageStatus === "FAILED" && (
            <>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                Needs manual triage
              </span>
              <form action={retryTriage.bind(null, ticket.id)}>
                <button
                  type="submit"
                  title="Run AI triage again"
                  className="rounded-full border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
                >
                  Retry AI triage
                </button>
              </form>
            </>
          )}
        </div>
        {ticket.summary && (
          <p className="mt-3 text-sm text-gray-700">
            <span className="font-medium">AI summary:</span> {ticket.summary}
          </p>
        )}
        {ticket.detail && <p className="mt-2 text-sm text-gray-600">{ticket.detail}</p>}
        <p className="mt-2 text-xs text-gray-400">{fmt(ticket.createdAt)}</p>
      </header>

      <AgentPanel ticketId={ticket.id} />

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Notes</h2>
        {ticket.notes.length === 0 ? (
          <p className="text-sm text-gray-400">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ticket.notes.map((n) => (
              <li key={n.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {n.body}
                <span className="mt-1 block text-xs text-gray-400">{fmt(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Similar tickets</h2>
        {similar.length === 0 ? (
          <p className="text-sm text-gray-400">None found.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {similar.map((s) => (
              <li key={s.id} className="flex justify-between text-sm">
                <Link href={`/tickets/${s.id}`} className="truncate text-blue-600 hover:underline">
                  {s.title}
                </Link>
                <span className="shrink-0 text-xs text-gray-400">
                  {Math.round(s.similarity * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}