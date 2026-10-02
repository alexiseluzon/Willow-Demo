jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { ticket: { create: jest.fn(), update: jest.fn() } },
}));
jest.mock("@/lib/ai/triage", () => ({ runTriage: jest.fn() }));

import request from "supertest";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { runTriage } from "@/lib/ai/triage";
import { POST } from "@/app/api/tickets/route";
import { PATCH } from "@/app/api/tickets/[id]/route";
import { routeServer } from "../helpers/route-server";

let n = 0;
const ip = () => `10.0.0.${++n}`;

beforeEach(() => jest.resetAllMocks());

describe("POST /api/tickets", () => {
  it("creates a ticket and schedules AI triage", async () => {
    (prisma.ticket.create as jest.Mock).mockResolvedValue({ id: "t1", title: "Hello" });

    const res = await request(routeServer(POST))
      .post("/api/tickets")
      .set("x-forwarded-for", ip())
      .send({ title: "Hello", detail: "World", source: "N8N" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("t1");
    expect(after).toHaveBeenCalledTimes(1);

    await (after as jest.Mock).mock.calls[0][0]();
    expect(runTriage).toHaveBeenCalledWith("t1");
  });

  it("rejects a missing title", async () => {
    const res = await request(routeServer(POST))
      .post("/api/tickets")
      .set("x-forwarded-for", ip())
      .send({ detail: "no title" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(prisma.ticket.create).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("rejects an over-long title", async () => {
    const res = await request(routeServer(POST))
      .post("/api/tickets")
      .set("x-forwarded-for", ip())
      .send({ title: "a".repeat(201) });

    expect(res.status).toBe(400);
  });

  it("rate limits after 20 requests per minute", async () => {
    const server = routeServer(POST);
    const addr = ip();
    for (let i = 0; i < 20; i++) {
      await request(server).post("/api/tickets").set("x-forwarded-for", addr).send({});
    }
    const res = await request(server)
      .post("/api/tickets")
      .set("x-forwarded-for", addr)
      .send({});

    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
  });
});

describe("PATCH /api/tickets/:id", () => {
  it("rejects an invalid status", async () => {
    const res = await request(routeServer(PATCH, { id: "t1" }))
      .patch("/api/tickets/t1")
      .send({ status: "DONE" });
    expect(res.status).toBe(400);
  });

  it("updates a valid status", async () => {
    (prisma.ticket.update as jest.Mock).mockResolvedValue({ id: "t1", status: "RESOLVED" });
    const res = await request(routeServer(PATCH, { id: "t1" }))
      .patch("/api/tickets/t1")
      .send({ status: "RESOLVED" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("RESOLVED");
  });

  it("returns 404 for an unknown ticket", async () => {
    (prisma.ticket.update as jest.Mock).mockRejectedValue(new Error("not found"));
    const res = await request(routeServer(PATCH, { id: "nope" }))
      .patch("/api/tickets/nope")
      .send({ status: "OPEN" });
    expect(res.status).toBe(404);
  });
});