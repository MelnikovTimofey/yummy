-- Полка без граммов (#518, срез S6): журнал граммов StockEntry, настройки полки
-- ShelfSettings и поправка граммов строки счёта уходят. Наличие — ShelfItem.outAt (S1),
-- приходы — строки принятых поставок DeliveryLine (S2).

-- Стартовый приход жил только в журнале. Строка стартовой поставки на каждый табак
-- сохраняет и приход в карточке, и правило пробы: табак со стартовой полки — не проба.
INSERT INTO "DeliveryLine" ("id", "deliveryId", "n", "rawName", "qty", "tobaccoId", "kind", "arrived")
SELECT gen_random_uuid()::text, se."deliveryId",
       COALESCE((SELECT MAX(l."n") FROM "DeliveryLine" l WHERE l."deliveryId" = se."deliveryId"), 0)
         + ROW_NUMBER() OVER (PARTITION BY se."deliveryId" ORDER BY t."manufacturer", t."name", t."id"),
       t."manufacturer" || ' ' || t."name", 1, t."id", 'tobacco', true
FROM "StockEntry" se
JOIN "Delivery" d ON d."id" = se."deliveryId" AND d."kind" = 'start'
JOIN "ShelfItem" si ON si."id" = se."shelfItemId"
JOIN "Tobacco" t ON t."id" = si."tobaccoId"
WHERE se."kind" = 'receipt' AND se."deliveryLineId" IS NULL;

-- DropForeignKey
ALTER TABLE "StockEntry" DROP CONSTRAINT "StockEntry_shelfItemId_fkey";

-- DropForeignKey
ALTER TABLE "StockEntry" DROP CONSTRAINT "StockEntry_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "StockEntry" DROP CONSTRAINT "StockEntry_deliveryLineId_fkey";

-- AlterTable
ALTER TABLE "DeliveryLine" DROP COLUMN "receivedGrams";

-- DropTable
DROP TABLE "StockEntry";

-- DropTable
DROP TABLE "ShelfSettings";
