-- CreateEnum
CREATE TYPE "SquadSource" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "RecommendationMode" AS ENUM ('xi', 'transfer', 'build');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fplTeamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameweek" INTEGER NOT NULL,
    "players" JSONB NOT NULL,
    "bank" DECIMAL(4,1) NOT NULL,
    "teamValue" DECIMAL(4,1) NOT NULL,
    "source" "SquadSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameweek" INTEGER NOT NULL,
    "mode" "RecommendationMode" NOT NULL,
    "inputSignals" JSONB NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FplCache" (
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FplCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SquadSnapshot_userId_gameweek_idx" ON "SquadSnapshot"("userId", "gameweek");

-- CreateIndex
CREATE INDEX "Recommendation_userId_gameweek_idx" ON "Recommendation"("userId", "gameweek");

-- AddForeignKey
ALTER TABLE "SquadSnapshot" ADD CONSTRAINT "SquadSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
