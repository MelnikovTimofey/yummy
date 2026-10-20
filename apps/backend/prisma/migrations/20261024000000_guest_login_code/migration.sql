-- Одноразовые коды входа гостя через бота (#239): сайт создаёт код, бот
-- подтверждает Telegram id, сайт забирает токен. Живут 10 минут.

-- CreateTable
CREATE TABLE "GuestLoginCode" (
    "code" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "likedProfiles" JSONB NOT NULL DEFAULT '[]',
    "likedFlavors" JSONB NOT NULL DEFAULT '[]',
    "telegramId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestLoginCode_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "GuestLoginCode_expiresAt_idx" ON "GuestLoginCode"("expiresAt");
