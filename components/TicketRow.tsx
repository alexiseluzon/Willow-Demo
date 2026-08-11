"use client";

import { useState, useTransition } from "react";
import { updateTicketStatus, deleteTicket } from "@/app/tickets/actions";

type Ticket = {
  id: string;
  title: string;
  detail: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  source: "MANUAL" | "N8N";
  createdAt: Date;
};

const STATUS_STYLES: Record<Ticket["status"], string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
};

export function TicketRow({ ticket }: { ticket: Ticket }) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value;
    startTransition(async () => {
      await updateTicketStatus(ticket.id, status);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTicket(ticket.id);
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-gray-900">{ticket.title}</h3>
          {ticket.source === "N8N" && (
            <span
              title="Created via n8n automation"
              className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
            >
              n8n
            </span>
          )}
        </div>
        {ticket.detail && <p className="mt-1 text-sm text-gray-600">{ticket.detail}</p>}
        <p className="mt-1 text-xs text-gray-400">
          {new Date(ticket.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
          {ticket.status.replace("_", " ")}
        </span>

        <select
          value={ticket.status}
          onChange={handleStatusChange}
          disabled={isPending}
          title="Change ticket status"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={isPending}
              title="Confirm delete"
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              title="Cancel delete"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            title="Delete ticket"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}