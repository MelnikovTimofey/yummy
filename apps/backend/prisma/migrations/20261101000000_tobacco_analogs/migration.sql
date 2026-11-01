-- Аналоги табаков (#478): у каждого табака свой список, связь взаимная —
-- по строке на сторону. Замена в событии «Покурить» — для аналитики (PRD §5.3).

-- AlterTable
ALTER TABLE "SmokeCtaEvent" ADD COLUMN     "substitutedFromId" TEXT,
ADD COLUMN     "substitutedToId" TEXT;

-- CreateTable
CREATE TABLE "TobaccoAnalog" (
    "id" TEXT NOT NULL,
    "tobaccoId" TEXT NOT NULL,
    "analogId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TobaccoAnalog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TobaccoAnalog_not_self" CHECK ("tobaccoId" <> "analogId")
);

-- CreateIndex
CREATE INDEX "TobaccoAnalog_tobaccoId_idx" ON "TobaccoAnalog"("tobaccoId");

-- CreateIndex
CREATE INDEX "TobaccoAnalog_analogId_idx" ON "TobaccoAnalog"("analogId");

-- CreateIndex
CREATE UNIQUE INDEX "TobaccoAnalog_tobaccoId_analogId_key" ON "TobaccoAnalog"("tobaccoId", "analogId");

-- AddForeignKey
ALTER TABLE "TobaccoAnalog" ADD CONSTRAINT "TobaccoAnalog_tobaccoId_fkey" FOREIGN KEY ("tobaccoId") REFERENCES "Tobacco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoAnalog" ADD CONSTRAINT "TobaccoAnalog_analogId_fkey" FOREIGN KEY ("analogId") REFERENCES "Tobacco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmokeCtaEvent" ADD CONSTRAINT "SmokeCtaEvent_substitutedFromId_fkey" FOREIGN KEY ("substitutedFromId") REFERENCES "Tobacco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmokeCtaEvent" ADD CONSTRAINT "SmokeCtaEvent_substitutedToId_fkey" FOREIGN KEY ("substitutedToId") REFERENCES "Tobacco"("id") ON DELETE SET NULL ON UPDATE CASCADE;
