-- Анонимная оценка микса — одна с устройства: повторная заменяет прежнюю.
-- Старые анонимные оценки остаются с NULL (уникальность NULL не ограничивает).

-- AlterTable
ALTER TABLE "MixRating" ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MixRating_deviceId_mixId_key" ON "MixRating"("deviceId", "mixId");
