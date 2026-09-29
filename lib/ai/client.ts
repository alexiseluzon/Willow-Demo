import { GoogleGenAI } from "@google/genai";

export const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
export const EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";

let client: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return (client ??= new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 15_000 },
  }));
}