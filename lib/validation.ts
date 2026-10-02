export const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export const MAX_TITLE = 200;
export const MAX_DETAIL = 5000;
export type TicketStatus = (typeof VALID_STATUSES)[number];

export function isValidStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (VALID_STATUSES as readonly string[]).includes(value);
}

export type CreateTicketInput = {
  title: string;
  detail: string | null;
  source: "MANUAL" | "N8N";
};

export function parseCreateTicketBody(body: unknown): CreateTicketInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }

  const { title, detail, source } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "A non-empty 'title' field is required." };
  }
  if (title.trim().length > MAX_TITLE) {
    return { error: `'title' must be at most ${MAX_TITLE} characters.` };
  }
  if (typeof detail === "string" && detail.trim().length > MAX_DETAIL) {
    return { error: `'detail' must be at most ${MAX_DETAIL} characters.` };
  }

  return {
    title: title.trim(),
    detail: typeof detail === "string" && detail.trim().length > 0 ? detail.trim() : null,
    source: source === "N8N" ? "N8N" : "MANUAL",
  };
}