-- AlterTable
ALTER TABLE "SquadSnapshot" ADD COLUMN     "points" INTEGER,
ADD COLUMN     "pointsOnBench" INTEGER,
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "totalPoints" INTEGER,
ADD COLUMN     "transferCost" INTEGER;

-- CreateIndex
CREATE INDEX "SquadSnapshot_userId_createdAt_idx" ON "SquadSnapshot"("userId", "createdAt");
