import { z } from "zod";

export const CATEGORIES = [
  "BUG",
  "BILLING",
  "FEATURE_REQUEST",
  "ACCOUNT",
  "OTHER",
] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const TriageSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  summary: z.string().min(1).max(280),
});

export type Triage = z.infer<typeof TriageSchema>;

// JSON Schema sent to the model (strip the $schema key, Gemini rejects it)
const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(TriageSchema) };
delete jsonSchema.$schema;
export const TriageJsonSchema = jsonSchema;