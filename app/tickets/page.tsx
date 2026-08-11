import { prisma } from "@/lib/prisma";
import { NewTicketForm } from "@/components/NewTicketForm";
import { TicketRow } from "@/components/TicketRow";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <a href="#ticket-list" className="sr-only focus:not-sr-only">
        Skip to ticket list
      </a>

      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Follow-up Tracker</h1>
      <p className="mb-6 text-sm text-gray-500">
        Tickets created here or via n8n webhook automation.
      </p>

      <div className="mb-8">
        <NewTicketForm />
      </div>

      <div id="ticket-list" className="flex flex-col gap-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-gray-400">No tickets yet. Create one above.</p>
        ) : (
          tickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </main>
  );
}