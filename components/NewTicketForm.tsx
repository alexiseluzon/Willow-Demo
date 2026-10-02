"use client";

import { useState, useTransition } from "react";
import { createTicket } from "@/app/tickets/actions";

export function NewTicketForm() {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [isPending, startTransition] = useTransition();

  const canSubmit = title.trim().length > 0 && !isPending;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    const formData = new FormData();
    formData.set("title", title);
    formData.set("detail", detail);

    startTransition(async () => {
      await createTicket(formData);
      setTitle("");
      setDetail("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Follow up with missed appointment"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
          maxLength={200}
        />
      </div>

      <div>
        <label htmlFor="detail" className="mb-1 block text-sm font-medium text-gray-700">
          Detail (optional)
        </label>
        <textarea
          id="detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          maxLength={5000}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        title={canSubmit ? "Create ticket" : "Enter a title to create a ticket"}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isPending ? "Creating…" : "Create Ticket"}
      </button>
    </form>
  );
}