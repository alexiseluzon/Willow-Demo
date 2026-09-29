CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BUG', 'BILLING', 'FEATURE_REQUEST', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TriageStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "category" "TicketCategory",
ADD COLUMN     "embedding" vector(768),
ADD COLUMN     "priority" "TicketPriority",
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "triageStatus" "TriageStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");
