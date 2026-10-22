-- Аналитика закупки (#324): бюджет на табак (#326) и отметка пробы мастером (#329).

-- AlterTable
ALTER TABLE "ShelfSettings" ADD COLUMN     "budgetKop" INTEGER;

-- AlterTable
ALTER TABLE "ShelfItem" ADD COLUMN     "trialMarkedAt" TIMESTAMP(3),
ADD COLUMN     "trialVerdict" TEXT;
