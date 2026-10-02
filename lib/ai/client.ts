import OpenAI from "openai";

export const MODEL = process.env.LLM_MODEL ?? "openai/gpt-oss-20b";

let client: OpenAI | null = null;

export function getAI(): OpenAI {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY is not set");
  return (client ??= new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
    timeout: 10_000,
    maxRetries: 0,
  }));
}