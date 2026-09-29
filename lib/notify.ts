const NOTIFY_PRIORITIES = new Set(["HIGH", "URGENT"]);
const APP_URL = process.env.APP_URL ?? "https://willow-demo.vercel.app";

export type NotifyTicket = {
  id: string;
  title: string;
  priority: string | null;
  category: string | null;
  summary: string | null;
};

export function shouldNotify(priority: string | null): boolean {
  return priority !== null && NOTIFY_PRIORITIES.has(priority);
}

// Slack mrkdwn: escape control chars so user text can't trigger mentions/links.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Never throws.
export async function notifyHighPriority(ticket: NotifyTicket): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url || !shouldNotify(ticket.priority)) return;

  const text = [
    `:rotating_light: *${ticket.priority}* ticket: ${esc(ticket.title.slice(0, 200))}`,
    ticket.category ? `Category: ${ticket.category}` : null,
    ticket.summary ? `Summary: ${esc(ticket.summary)}` : null,
    `Open: ${APP_URL}/tickets/${ticket.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) console.error("[notify] webhook responded", res.status);
  } catch (err) {
    console.error("[notify] failed", err);
  }
}