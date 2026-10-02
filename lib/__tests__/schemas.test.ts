import { TriageSchema, TriageJsonSchema } from "@/lib/ai/schemas";

describe("TriageSchema", () => {
  const valid = {
    category: "BUG",
    priority: "URGENT",
    summary: "Checkout fails with a 500 error.",
  };

  it("accepts valid output", () => {
    expect(TriageSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an unknown category", () => {
    expect(TriageSchema.safeParse({ ...valid, category: "SPAM" }).success).toBe(false);
  });

  it("rejects an unknown priority", () => {
    expect(TriageSchema.safeParse({ ...valid, priority: "SUPER" }).success).toBe(false);
  });

  it("rejects empty and over-long summaries", () => {
    expect(TriageSchema.safeParse({ ...valid, summary: "" }).success).toBe(false);
    expect(TriageSchema.safeParse({ ...valid, summary: "x".repeat(281) }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(TriageSchema.safeParse({ category: "BUG" }).success).toBe(false);
  });

  it("exposes a JSON schema without $schema", () => {
    expect(TriageJsonSchema).not.toHaveProperty("$schema");
    expect(TriageJsonSchema).toHaveProperty("properties.category");
  });
});