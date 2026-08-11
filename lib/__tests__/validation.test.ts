import { isValidStatus, parseCreateTicketBody } from "@/lib/validation";

describe("isValidStatus", () => {
  it("accepts all defined statuses", () => {
    expect(isValidStatus("OPEN")).toBe(true);
    expect(isValidStatus("IN_PROGRESS")).toBe(true);
    expect(isValidStatus("RESOLVED")).toBe(true);
  });

  it("rejects unknown or malformed statuses", () => {
    expect(isValidStatus("DONE")).toBe(false);
    expect(isValidStatus("")).toBe(false);
    expect(isValidStatus(null)).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
    expect(isValidStatus(123)).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isValidStatus("open")).toBe(false);
  });
});

describe("parseCreateTicketBody", () => {
  it("accepts a minimal valid body with just a title", () => {
    const result = parseCreateTicketBody({ title: "Missed appointment" });
    expect(result).toEqual({
      title: "Missed appointment",
      detail: null,
      source: "MANUAL",
    });
  });

  it("trims whitespace from title and detail", () => {
    const result = parseCreateTicketBody({ title: "  Hello  ", detail: "  world  " });
    expect(result).toEqual({
      title: "Hello",
      detail: "world",
      source: "MANUAL",
    });
  });

  it("rejects a missing title", () => {
    const result = parseCreateTicketBody({ detail: "no title here" });
    expect(result).toHaveProperty("error");
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(parseCreateTicketBody({ title: "" })).toHaveProperty("error");
    expect(parseCreateTicketBody({ title: "   " })).toHaveProperty("error");
  });

  it("rejects a non-object body", () => {
    expect(parseCreateTicketBody(null)).toHaveProperty("error");
    expect(parseCreateTicketBody("just a string")).toHaveProperty("error");
    expect(parseCreateTicketBody(42)).toHaveProperty("error");
  });

  it("tags source as N8N only when explicitly provided", () => {
    const result = parseCreateTicketBody({ title: "From automation", source: "N8N" });
    expect(result).toMatchObject({ source: "N8N" });
  });

  it("defaults an invalid source value to MANUAL rather than rejecting it", () => {
    const result = parseCreateTicketBody({ title: "Test", source: "unknown-system" });
    expect(result).toMatchObject({ source: "MANUAL" });
  });

  it("converts an empty detail string to null", () => {
    const result = parseCreateTicketBody({ title: "Test", detail: "   " });
    expect(result).toMatchObject({ detail: null });
  });
});