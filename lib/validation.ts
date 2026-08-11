export const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
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

  return {
    title: title.trim(),
    detail: typeof detail === "string" && detail.trim().length > 0 ? detail.trim() : null,
    source: source === "N8N" ? "N8N" : "MANUAL",
  };
}