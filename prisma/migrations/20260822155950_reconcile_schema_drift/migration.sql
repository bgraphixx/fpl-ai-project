-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastReminderGw" INTEGER,
ADD COLUMN     "lastReminderStage" TEXT,
ADD COLUMN     "pushRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerHistory" (
    "id" INTEGER NOT NULL,
    "pastSeasonMinutes" INTEGER NOT NULL,
    "pastSeasonStarts" INTEGER NOT NULL,
    "pastSeasonXG" DECIMAL(5,2) NOT NULL,
    "pastSeasonXA" DECIMAL(5,2) NOT NULL,
    "pastSeasonXGC" DECIMAL(5,2) NOT NULL,
    "pastSeasonXGI" DECIMAL(5,2) NOT NULL,
    "pastSeasonSaves" INTEGER NOT NULL,
    "pastSeasonBPS" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStrength" (
    "id" INTEGER NOT NULL,
    "strengthAttackHome" INTEGER NOT NULL,
    "strengthAttackAway" INTEGER NOT NULL,
    "strengthDefenseHome" INTEGER NOT NULL,
    "strengthDefenseAway" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamStrength_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

