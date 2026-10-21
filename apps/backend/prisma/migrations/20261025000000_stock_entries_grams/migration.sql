-- Инвентарь в граммах (#306): журнал остатка StockEntry вместо банок Pack и PackMark.

-- CreateTable
CREATE TABLE "StockEntry" (
    "id" TEXT NOT NULL,
    "shelfItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "fraction" DOUBLE PRECISION,
    "at" TIMESTAMP(3) NOT NULL,
    "priceKop" INTEGER,
    "reason" TEXT,
    "deliveryId" TEXT,
    "deliveryLineId" TEXT,
    "actorLogin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockEntry_shelfItemId_at_idx" ON "StockEntry"("shelfItemId", "at");

-- CreateIndex
CREATE INDEX "StockEntry_deliveryId_idx" ON "StockEntry"("deliveryId");

-- CreateIndex
CREATE INDEX "StockEntry_deliveryLineId_idx" ON "StockEntry"("deliveryLineId");

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_shelfItemId_fkey" FOREIGN KEY ("shelfItemId") REFERENCES "ShelfItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_deliveryLineId_fkey" FOREIGN KEY ("deliveryLineId") REFERENCES "DeliveryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "DeliveryLine" ADD COLUMN     "receivedGrams" INTEGER;

-- Перенос банок (design/design_handoff_inventory_grams/README.md §5). «Остальные банки» —
-- банки того же табака, которые к моменту t пришли и ещё не опустели и не списаны;
-- открытые среди них считаются полными: точнее по банкам не восстановить.

-- Приходы: банки одной строки поставки (или одного ручного прихода) — одна запись.
INSERT INTO "StockEntry" ("id", "shelfItemId", "kind", "grams", "at", "priceKop", "deliveryId", "deliveryLineId", "createdAt")
SELECT gen_random_uuid()::text, "shelfItemId", 'receipt', SUM("weight"), "receivedAt",
       CASE WHEN COUNT("priceKop") = COUNT(*) THEN SUM("priceKop") END,
       "deliveryId", "deliveryLineId", MIN("createdAt")
FROM "Pack"
GROUP BY "shelfItemId", "receivedAt", "deliveryId", "deliveryLineId";

-- Отметка банки → остаток табака: доля × вес банки + остальные банки.
INSERT INTO "StockEntry" ("id", "shelfItemId", "kind", "grams", "at", "actorLogin", "createdAt")
SELECT gen_random_uuid()::text, p."shelfItemId", 'count',
       ROUND(m."fraction" * p."weight")::int + COALESCE((
         SELECT SUM(o."weight") FROM "Pack" o
         WHERE o."shelfItemId" = p."shelfItemId" AND o."id" <> p."id" AND o."receivedAt" <= m."at"
           AND (o."emptiedAt" IS NULL OR o."emptiedAt" > m."at")
           AND (o."writtenOffAt" IS NULL OR o."writtenOffAt" > m."at")
       ), 0),
       m."at", m."actorLogin", m."createdAt"
FROM "PackMark" m JOIN "Pack" p ON p."id" = m."packId";

-- Пустая банка → остаток табака = остальные банки (0 г — «Закончился»).
INSERT INTO "StockEntry" ("id", "shelfItemId", "kind", "grams", "at", "createdAt")
SELECT gen_random_uuid()::text, p."shelfItemId", 'count',
       COALESCE((
         SELECT SUM(o."weight") FROM "Pack" o
         WHERE o."shelfItemId" = p."shelfItemId" AND o."id" <> p."id" AND o."receivedAt" <= p."emptiedAt"
           AND (o."emptiedAt" IS NULL OR o."emptiedAt" > p."emptiedAt")
           AND (o."writtenOffAt" IS NULL OR o."writtenOffAt" > p."emptiedAt")
       ), 0),
       p."emptiedAt", p."emptiedAt"
FROM "Pack" p
WHERE p."emptiedAt" IS NOT NULL AND p."writtenOffAt" IS NULL;

-- Списанная банка → списание её остатка: по последней отметке до списания, иначе целиком.
INSERT INTO "StockEntry" ("id", "shelfItemId", "kind", "grams", "at", "reason", "createdAt")
SELECT gen_random_uuid()::text, p."shelfItemId", 'writeoff',
       ROUND(p."weight" * COALESCE((
         SELECT m."fraction" FROM "PackMark" m
         WHERE m."packId" = p."id" AND m."at" <= p."writtenOffAt"
         ORDER BY m."at" DESC LIMIT 1
       ), 1))::int,
       p."writtenOffAt", p."writeOffReason", p."writtenOffAt"
FROM "Pack" p
WHERE p."writtenOffAt" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Pack" DROP CONSTRAINT "Pack_shelfItemId_fkey";

-- DropForeignKey
ALTER TABLE "Pack" DROP CONSTRAINT "Pack_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "Pack" DROP CONSTRAINT "Pack_deliveryLineId_fkey";

-- DropForeignKey
ALTER TABLE "PackMark" DROP CONSTRAINT "PackMark_packId_fkey";

-- AlterTable
ALTER TABLE "ShelfItem" DROP COLUMN "packWeight";

-- DropTable
DROP TABLE "PackMark";

-- DropTable
DROP TABLE "Pack";
