-- Полка, банки и поставки (#152, срез 1 — #210). Tobacco.inStock остаётся
-- кэшем наличия, который дальше пишет только сервис полки (src/shelf.ts).

-- CreateTable
CREATE TABLE "ShelfItem" (
    "id" TEXT NOT NULL,
    "tobaccoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "keepStocked" BOOLEAN NOT NULL DEFAULT true,
    "stopped" BOOLEAN NOT NULL DEFAULT false,
    "stopNote" TEXT,
    "packWeight" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShelfItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL,
    "shelfItemId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "priceKop" INTEGER,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "emptiedAt" TIMESTAMP(3),
    "writtenOffAt" TIMESTAMP(3),
    "writeOffReason" TEXT,
    "deliveryId" TEXT,
    "deliveryLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackMark" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "fraction" DOUBLE PRECISION NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "actorLogin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bowlGrams" INTEGER NOT NULL DEFAULT 18,
    "leadDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShelfSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT,
    "format" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItem" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "article" TEXT,
    "normalizedName" TEXT NOT NULL,
    "tobaccoId" TEXT NOT NULL,
    "packWeight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "kind" TEXT NOT NULL,
    "number" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalKop" INTEGER,
    "fileName" TEXT,
    "file" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLine" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "rawName" TEXT NOT NULL,
    "article" TEXT,
    "qty" INTEGER NOT NULL,
    "unit" TEXT,
    "priceKop" INTEGER,
    "sumKop" INTEGER,
    "grams" INTEGER,
    "tobaccoId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'tobacco',
    "arrived" BOOLEAN NOT NULL DEFAULT true,
    "matchReason" TEXT,

    CONSTRAINT "DeliveryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShelfItem_tobaccoId_key" ON "ShelfItem"("tobaccoId");

-- CreateIndex
CREATE INDEX "ShelfItem_status_idx" ON "ShelfItem"("status");

-- CreateIndex
CREATE INDEX "Pack_shelfItemId_idx" ON "Pack"("shelfItemId");

-- CreateIndex
CREATE INDEX "Pack_deliveryId_idx" ON "Pack"("deliveryId");

-- CreateIndex
CREATE INDEX "Pack_deliveryLineId_idx" ON "Pack"("deliveryLineId");

-- CreateIndex
CREATE INDEX "PackMark_packId_idx" ON "PackMark"("packId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_inn_key" ON "Supplier"("inn");

-- CreateIndex
CREATE INDEX "SupplierItem_supplierId_article_idx" ON "SupplierItem"("supplierId", "article");

-- CreateIndex
CREATE INDEX "SupplierItem_tobaccoId_idx" ON "SupplierItem"("tobaccoId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierItem_supplierId_normalizedName_key" ON "SupplierItem"("supplierId", "normalizedName");

-- CreateIndex
CREATE INDEX "Delivery_supplierId_idx" ON "Delivery"("supplierId");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "DeliveryLine_deliveryId_idx" ON "DeliveryLine"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryLine_tobaccoId_idx" ON "DeliveryLine"("tobaccoId");

-- AddForeignKey
ALTER TABLE "ShelfItem" ADD CONSTRAINT "ShelfItem_tobaccoId_fkey" FOREIGN KEY ("tobaccoId") REFERENCES "Tobacco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_shelfItemId_fkey" FOREIGN KEY ("shelfItemId") REFERENCES "ShelfItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_deliveryLineId_fkey" FOREIGN KEY ("deliveryLineId") REFERENCES "DeliveryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackMark" ADD CONSTRAINT "PackMark_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_tobaccoId_fkey" FOREIGN KEY ("tobaccoId") REFERENCES "Tobacco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_tobaccoId_fkey" FOREIGN KEY ("tobaccoId") REFERENCES "Tobacco"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Старт на проде (design/design_handoff_inventory/README.md §8): каждому табаку
-- в наличии — запись на полке и одна полная банка, «как будто пришла сегодня».
-- openedAt не пишем: вскрытие выводит resolvePacks. inStock у живых табаков не
-- меняется — он уже совпадает с правилом «активен, не стоп, есть банка, не
-- архив»; архивные с inStock (код их так не оставляет, но мало ли) выравниваем.
-- Стартовая поставка создаётся, только если есть что на неё повесить.
-- Время — UTC, как его пишет и читает Prisma в timestamp(3).
INSERT INTO "ShelfSettings" ("id", "bowlGrams", "leadDays", "updatedAt")
VALUES (1, 18, 7, now() AT TIME ZONE 'UTC');

WITH "start" AS (
  INSERT INTO "Delivery" ("id", "kind", "status", "receivedAt", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, 'start', 'received', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
  WHERE EXISTS (SELECT 1 FROM "Tobacco" WHERE "inStock" AND NOT "archived")
  RETURNING "id"
), "shelf" AS (
  INSERT INTO "ShelfItem" ("id", "tobaccoId", "status", "keepStocked", "stopped", "packWeight", "createdAt", "updatedAt")
  SELECT
    gen_random_uuid()::text,
    "id",
    'active',
    true,
    false,
    CASE WHEN "manufacturer" IN ('DARKSIDE', 'Starline') THEN 250 ELSE 200 END,
    now() AT TIME ZONE 'UTC',
    now() AT TIME ZONE 'UTC'
  FROM "Tobacco"
  WHERE "inStock" AND NOT "archived"
  RETURNING "id", "packWeight"
)
INSERT INTO "Pack" ("id", "shelfItemId", "weight", "receivedAt", "deliveryId", "createdAt")
SELECT gen_random_uuid()::text, "shelf"."id", "shelf"."packWeight", now() AT TIME ZONE 'UTC', "start"."id", now() AT TIME ZONE 'UTC'
FROM "shelf" CROSS JOIN "start";

UPDATE "Tobacco" SET "inStock" = false WHERE "inStock" AND "archived";
