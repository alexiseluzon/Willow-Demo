ALTER TABLE "Ticket" DROP COLUMN "embedding";
ALTER TABLE "Ticket" ADD COLUMN "embedding" vector(384);