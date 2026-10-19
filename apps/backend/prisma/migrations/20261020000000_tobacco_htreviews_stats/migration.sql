-- Статистика htreviews для «Идей» каталога (#209). Колонки nullable: ручные
-- карточки и табаки до первой синхронизации статистики не имеют.

-- AlterTable
ALTER TABLE "Tobacco" ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "ratingsCount" INTEGER,
ADD COLUMN     "reviewsCount" INTEGER,
ADD COLUMN     "statsSyncedAt" TIMESTAMP(3),
ADD COLUMN     "viewsCount" INTEGER;
