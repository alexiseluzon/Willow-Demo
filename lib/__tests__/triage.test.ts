jest.mock("@/lib/ai/client", () => ({ MODEL: "test-model", getAI: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { ticket: { findUnique: jest.fn(), update: jest.fn() } },
}));
jest.mock("@/lib/ai/embeddings", () => ({ embedTicket: jest.fn() }));
jest.mock("@/lib/notify", () => ({ notifyHighPriority: jest.fn() }));

import { getAI } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { embedTicket } from "@/lib/ai/embeddings";
import { notifyHighPriority } from "@/lib/notify";
import { triageTicket, runTriage } from "@/lib/ai/triage";

const create = jest.fn();
const findUnique = prisma.ticket.findUnique as jest.Mock;
const update = prisma.ticket.update as jest.Mock;

const llm = (content: unknown) => ({
  choices: [
    {
      message: {
        content:
          typeof content === "string" || content === null
            ? content
            : JSON.stringify(content),
      },
    },
  ],
});

const good = { category: "BUG", priority: "URGENT", summary: "Checkout fails." };

beforeEach(() => {
  jest.resetAllMocks();
  (getAI as jest.Mock).mockReturnValue({ chat: { completions: { create } } });
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe("triageTicket", () => {
  it("returns schema-validated output", async () => {
    create.mockResolvedValue(llm(good));
    await expect(triageTicket({ title: "t", detail: null })).resolves.toEqual(good);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        response_format: expect.objectContaining({ type: "json_schema" }),
      })
    );
  });

  it("rejects output that violates the schema", async () => {
    create.mockResolvedValue(llm({ ...good, priority: "SUPER" }));
    await expect(triageTicket({ title: "t", detail: null })).rejects.toThrow();
  });

  it("rejects non-JSON output", async () => {
    create.mockResolvedValue(llm("not json"));
    await expect(triageTicket({ title: "t", detail: null })).rejects.toThrow();
  });

  it("rejects empty output", async () => {
    create.mockResolvedValue(llm(null));
    await expect(triageTicket({ title: "t", detail: null })).rejects.toThrow();
  });

  it("truncates oversized input", async () => {
    create.mockResolvedValue(llm(good));
    await triageTicket({ title: "t", detail: "x".repeat(10_000) });
    const content = create.mock.calls[0][0].messages[1].content as string;
    expect(content.length).toBeLessThan(4500);
  });
});

describe("runTriage", () => {
  const ticket = { id: "t1", title: "Checkout down", detail: "500s" };

  it("stores the result, notifies and embeds", async () => {
    findUnique.mockResolvedValue(ticket);
    create.mockResolvedValue(llm(good));
    update.mockResolvedValue({ id: "t1", title: ticket.title, ...good });

    await runTriage("t1");

    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { ...good, triageStatus: "DONE" },
    });
    expect(notifyHighPriority).toHaveBeenCalledTimes(1);
    expect(embedTicket).toHaveBeenCalledWith("t1");
  });

  it("falls back to FAILED when the AI fails, and never throws", async () => {
    findUnique.mockResolvedValue(ticket);
    create.mockRejectedValue(new Error("boom"));
    update.mockResolvedValue({});

    await expect(runTriage("t1")).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(2); // retried once
    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { triageStatus: "FAILED" },
    });
    expect(notifyHighPriority).not.toHaveBeenCalled();
    expect(embedTicket).toHaveBeenCalledWith("t1");
  });

  it("does nothing for an unknown ticket", async () => {
    findUnique.mockResolvedValue(null);
    await runTriage("missing");
    expect(create).not.toHaveBeenCalled();
  });
});