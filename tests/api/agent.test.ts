jest.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: { findUnique: jest.fn(), update: jest.fn() },
    note: { create: jest.fn() },
  },
}));
jest.mock("@/lib/ai/client", () => ({ MODEL: "test-model", getAI: jest.fn() }));
jest.mock("@/lib/ai/similar", () => ({ findSimilar: jest.fn() }));

import request from "supertest";
import { prisma } from "@/lib/prisma";
import { getAI } from "@/lib/ai/client";
import { findSimilar } from "@/lib/ai/similar";
import { POST } from "@/app/api/agent/route";
import { routeServer } from "../helpers/route-server";

const create = jest.fn();
const findUnique = prisma.ticket.findUnique as jest.Mock;

const text = (content: string) => ({
  choices: [{ message: { role: "assistant", content } }],
});
const toolCall = (name: string, args: object) => ({
  choices: [
    {
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          { id: "c1", type: "function", function: { name, arguments: JSON.stringify(args) } },
        ],
      },
    },
  ],
});

let n = 0;
const ip = () => `10.1.0.${++n}`;

const post = (body: object) =>
  request(routeServer(POST)).post("/api/agent").set("x-forwarded-for", ip()).send(body);

beforeEach(() => {
  jest.resetAllMocks();
  (getAI as jest.Mock).mockReturnValue({ chat: { completions: { create } } });
  (findSimilar as jest.Mock).mockResolvedValue([]);
  findUnique.mockResolvedValue({
    id: "t1",
    title: "Checkout down",
    detail: null,
    status: "OPEN",
    category: null,
    priority: null,
    notes: [],
  });
});

describe("POST /api/agent", () => {
  it("validates the body", async () => {
    const res = await post({ ticketId: "t1" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown ticket", async () => {
    findUnique.mockResolvedValue(null);
    const res = await post({ ticketId: "nope", message: "hi" });
    expect(res.status).toBe(404);
  });

  it("returns a plain reply when no tool is needed", async () => {
    create.mockResolvedValue(text("Looks like a payment outage."));
    const res = await post({ ticketId: "t1", message: "What is this?" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Looks like a payment outage.");
    expect(res.body.pending).toBeNull();
  });

  it("proposes a status change but never applies it", async () => {
    create
      .mockResolvedValueOnce(toolCall("update_status", { status: "IN_PROGRESS" }))
      .mockResolvedValueOnce(text("Please confirm the change."));

    const res = await post({ ticketId: "t1", message: "Mark this as in progress" });

    expect(res.status).toBe(200);
    expect(res.body.pending).toEqual({ type: "update_status", status: "IN_PROGRESS" });
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it("only writes notes to the requested ticket", async () => {
    create
      .mockResolvedValueOnce(toolCall("add_note", { body: "Investigating", ticketId: "other" }))
      .mockResolvedValueOnce(text("Note added."));

    const res = await post({ ticketId: "t1", message: "Add a note" });

    expect(res.status).toBe(200);
    expect(prisma.note.create).toHaveBeenCalledWith({
      data: { ticketId: "t1", body: "Investigating" },
    });
  });

  it("returns 502 when the LLM fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("down"));
    const res = await post({ ticketId: "t1", message: "hi" });
    expect(res.status).toBe(502);
    jest.restoreAllMocks();
  });
});