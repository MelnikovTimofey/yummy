-- Событие «Покурить» для микса, собранного гостем в «Намиксуй». Отдельная
-- таблица без FK: снимок состава переживает удаление табака и не попадает
-- в статистику каталога (SmokeCtaEvent).

-- CreateTable
CREATE TABLE "CustomMixSmokeEvent" (
    "id" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "harmony" INTEGER NOT NULL,
    "swipes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomMixSmokeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomMixSmokeEvent_signature_idx" ON "CustomMixSmokeEvent"("signature");

-- CreateIndex
CREATE INDEX "CustomMixSmokeEvent_createdAt_idx" ON "CustomMixSmokeEvent"("createdAt");

