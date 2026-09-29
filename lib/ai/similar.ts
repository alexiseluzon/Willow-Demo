import { prisma } from "@/lib/prisma";

export type SimilarTicket = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  similarity: number;
};

export async function findSimilar(
  ticketId: string,
  limit = 5,
  minSimilarity = 0.3
): Promise<SimilarTicket[]> {
  const rows = await prisma.$queryRaw<{ v: string | null }[]>`
    SELECT "embedding"::text AS v FROM "Ticket" WHERE "id" = ${ticketId}`;
  const vec = rows[0]?.v;
  if (!vec) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 20);

  return prisma.$queryRaw<SimilarTicket[]>`
    SELECT "id", "title", "status"::text AS status, "priority"::text AS priority,
           1 - ("embedding" <=> ${vec}::vector) AS similarity
    FROM "Ticket"
    WHERE "id" <> ${ticketId}
      AND "embedding" IS NOT NULL
      AND 1 - ("embedding" <=> ${vec}::vector) >= ${minSimilarity}
    ORDER BY "embedding" <=> ${vec}::vector
    LIMIT ${safeLimit}`;
}