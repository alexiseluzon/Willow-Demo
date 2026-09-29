"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";
type Msg = { role: "user" | "assistant"; text: string; actions?: string[] };
type Notice = { kind: "ok" | "error"; text: string };

export function AgentPanel({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);
  const [pending, setPending] = useState<Status | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const canSend = input.trim().length > 0 && !busy;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    const message = input.trim();
    setInput("");
    setNotice(null);
    setPending(null);
    setBusy(true);
    setLog((l) => [...l, { role: "user", text: message }]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setLog((l) => [...l, { role: "assistant", text: data.reply, actions: data.actions }]);
      setPending(data.pending?.status ?? null);
      if (data.actions?.length) router.refresh();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmStatus() {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pending }),
      });
      if (!res.ok) throw new Error("Could not update status");
      setNotice({ kind: "ok", text: `Status changed to ${pending.replace("_", " ")}` });
      setPending(null);
      router.refresh();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="AI assistant"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="mb-1 text-sm font-semibold text-gray-900">AI assistant</h2>
      <p className="mb-3 text-xs text-gray-500">
        Try: &quot;Find similar tickets and add a note&quot; or &quot;Mark this as in progress&quot;.
      </p>

      <div aria-live="polite" className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {log.map((m, i) => (
          <div
            key={i}
            className={`rounded-md px-3 py-2 text-sm ${
              m.role === "user" ? "self-end bg-blue-50 text-blue-900" : "bg-gray-50 text-gray-800"
            }`}
          >
            {m.text}
            {m.actions && m.actions.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-xs text-gray-500">
                {m.actions.map((a, j) => (
                  <li key={j}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-gray-400">Thinking…</p>}
      </div>

      {pending && (
        <div
          role="alertdialog"
          aria-label="Confirm status change"
          className="mb-3 flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
        >
          <span>
            Change status to <strong>{pending.replace("_", " ")}</strong>?
          </span>
          <span className="flex gap-1">
            <button
              onClick={confirmStatus}
              disabled={busy}
              title="Apply the status change"
              className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setPending(null)}
              disabled={busy}
              title="Discard the proposed change"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </span>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className={`mb-3 rounded-md px-3 py-2 text-xs ${
            notice.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </p>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Ask the assistant…"
          aria-label="Message the assistant"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!canSend}
          title={canSend ? "Send message" : "Type a message first"}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}