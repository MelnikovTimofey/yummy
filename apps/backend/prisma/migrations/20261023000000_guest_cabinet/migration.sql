-- Кабинет гостя (#151, срез #238): учётка, избранное, связь событий и оценок
-- с гостем, снимок микса в событии «Покурить» (история переживает удаление
-- микса мастером — mixId становится NULL). Анонимный путь не меняется.

-- DropForeignKey
ALTER TABLE "SmokeCtaEvent" DROP CONSTRAINT "SmokeCtaEvent_mixId_fkey";

-- AlterTable
ALTER TABLE "SmokeCtaEvent" ADD COLUMN     "guestId" TEXT,
ADD COLUMN     "mixName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mixProfiles" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "mixId" DROP NOT NULL;

-- Снимок для уже записанных событий: название и профили из живого микса.
-- Дальше снимок пишет recordSmokeCtaEvent, поэтому DEFAULT снимается.
UPDATE "SmokeCtaEvent" AS e
SET "mixName" = m."name",
    "mixProfiles" = CASE WHEN m."flavorProfiles" LIKE '[%' THEN m."flavorProfiles"::jsonb ELSE '[]'::jsonb END
FROM "Mix" AS m
WHERE m."id" = e."mixId";

ALTER TABLE "SmokeCtaEvent" ALTER COLUMN "mixName" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MixRating" ADD COLUMN     "guestId" TEXT;

-- AlterTable
ALTER TABLE "CustomMixSmokeEvent" ADD COLUMN     "guestId" TEXT;

-- CreateTable
CREATE TABLE "GuestAccount" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "likedProfiles" JSONB NOT NULL DEFAULT '[]',
    "likedFlavors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestFavorite" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "mixId" TEXT,
    "customMixEventId" TEXT,
    "mixName" TEXT NOT NULL,
    "mixProfiles" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestAccount_telegramId_key" ON "GuestAccount"("telegramId");

-- CreateIndex
CREATE INDEX "GuestFavorite_guestId_createdAt_idx" ON "GuestFavorite"("guestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuestFavorite_guestId_mixId_key" ON "GuestFavorite"("guestId", "mixId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestFavorite_guestId_customMixEventId_key" ON "GuestFavorite"("guestId", "customMixEventId");

-- CreateIndex
CREATE INDEX "SmokeCtaEvent_guestId_createdAt_idx" ON "SmokeCtaEvent"("guestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MixRating_guestId_mixId_key" ON "MixRating"("guestId", "mixId");

-- CreateIndex
CREATE INDEX "CustomMixSmokeEvent_guestId_createdAt_idx" ON "CustomMixSmokeEvent"("guestId", "createdAt");

-- AddForeignKey
ALTER TABLE "SmokeCtaEvent" ADD CONSTRAINT "SmokeCtaEvent_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmokeCtaEvent" ADD CONSTRAINT "SmokeCtaEvent_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixRating" ADD CONSTRAINT "MixRating_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomMixSmokeEvent" ADD CONSTRAINT "CustomMixSmokeEvent_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestFavorite" ADD CONSTRAINT "GuestFavorite_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestFavorite" ADD CONSTRAINT "GuestFavorite_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestFavorite" ADD CONSTRAINT "GuestFavorite_customMixEventId_fkey" FOREIGN KEY ("customMixEventId") REFERENCES "CustomMixSmokeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

