import { prisma } from "@/lib/prisma";

const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2"; // 384 dims

type Extractor = (
  text: string,
  opts: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  extractorPromise ??= import("@huggingface/transformers")
    .then(({ pipeline }) => pipeline("feature-extraction", EMBED_MODEL))
    .then((p) => p as unknown as Extractor)
    .catch((err) => {
      extractorPromise = null; // allow retry on the next call
      throw err;
    });
  return extractorPromise;
}

// Returns null instead of throwing, so embeddings never break ticket flow.
export async function embedText(text: string): Promise<number[] | null> {
  try {
    const extract = await getExtractor();
    const out = await extract(text.slice(0, 1000), {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(out.data);
  } catch (err) {
    console.error("[embeddings] failed", err);
    return null;
  }
}

export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

// Never throws.
export async function embedTicket(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  const vec = await embedText(`${ticket.title}\n${ticket.detail ?? ""}`);
  if (!vec) return;

  await prisma
    .$executeRaw`UPDATE "Ticket" SET "embedding" = ${toVectorLiteral(vec)}::vector WHERE "id" = ${ticketId}`
    .catch((err) => console.error("[embeddings] save failed", err));
}