import type OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { VALID_STATUSES } from "@/lib/validation";
import { findSimilar } from "./similar";

export const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_similar_tickets",
      description: "Find past tickets similar to the current one.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "add_note",
      description: "Add an internal note to the current ticket.",
      parameters: {
        type: "object",
        properties: { body: { type: "string", description: "Note text, max 1000 chars" } },
        required: ["body"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_status",
      description:
        "Propose a status change for the current ticket. The user must confirm before it applies.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: [...VALID_STATUSES] } },
        required: ["status"],
        additionalProperties: false,
      },
    },
  },
];

const AddNoteArgs = z.object({ body: z.string().trim().min(1).max(1000) });
const UpdateStatusArgs = z.object({ status: z.enum(VALID_STATUSES) });

export type PendingAction = {
  type: "update_status";
  status: (typeof VALID_STATUSES)[number];
};

export type ToolOutcome = {
  content: string; // returned to the model
  summary?: string; // shown to the user
  pending?: PendingAction;
};

// Never throws: errors go back to the model as tool output.
export async function runTool(
  ticketId: string,
  name: string,
  rawArgs: string
): Promise<ToolOutcome> {
  try {
    const args = rawArgs ? JSON.parse(rawArgs) : {};
    switch (name) {
      case "search_similar_tickets": {
        const rows = await findSimilar(ticketId);
        return {
          content: JSON.stringify(rows),
          summary: `Searched similar tickets (${rows.length} found)`,
        };
      }
      case "add_note": {
        const { body } = AddNoteArgs.parse(args);
        await prisma.note.create({ data: { ticketId, body } });
        return { content: "Note added.", summary: "Added a note" };
      }
      case "update_status": {
        const { status } = UpdateStatusArgs.parse(args);
        return {
          content: `Proposed status ${status}. It is NOT applied until the user confirms.`,
          summary: `Proposed status change to ${status}`,
          pending: { type: "update_status", status },
        };
      }
      default:
        return { content: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      content: `Tool error: ${err instanceof Error ? err.message : "invalid arguments"}`,
    };
  }
}