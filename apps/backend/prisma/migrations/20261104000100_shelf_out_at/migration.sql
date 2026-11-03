-- Полка без граммов (#518, срез S1): «Закончился» — дата outAt у строки полки, null — «Есть».
-- Наличие для гостя дальше считается по outAt, журнал граммов StockEntry пока пишется рядом.
ALTER TABLE "ShelfItem" ADD COLUMN "outAt" TIMESTAMP(3);

-- Заполнение из журнала так, чтобы Tobacco.inStock не изменился ни у одного табака:
-- «Закончился» — остаток по учёту 0, как его считает src/stock.ts (последняя отметка,
-- иначе первый приход, плюс приходы и минус списания после неё). Дата — последняя
-- отметка или списание, без них — появление строки на полке. Строки в плане не трогаем.
WITH "e" AS (
  SELECT "shelfItemId", "kind", "grams", "at",
         ROW_NUMBER() OVER (PARTITION BY "shelfItemId" ORDER BY "at", "createdAt", "id") AS "n"
  FROM "StockEntry"
), "anchor" AS (
  SELECT "shelfItemId",
         COALESCE(MAX("n") FILTER (WHERE "kind" = 'count'), MIN("n") FILTER (WHERE "kind" = 'receipt')) AS "n",
         MAX("at") FILTER (WHERE "kind" IN ('count', 'writeoff')) AS "lastDown"
  FROM "e"
  GROUP BY "shelfItemId"
), "book" AS (
  SELECT "anchor"."shelfItemId", "anchor"."lastDown",
         COALESCE(SUM(CASE WHEN "e"."kind" = 'writeoff' THEN -"e"."grams" ELSE "e"."grams" END)
           FILTER (WHERE "e"."n" >= "anchor"."n"), 0) AS "grams"
  FROM "anchor" JOIN "e" ON "e"."shelfItemId" = "anchor"."shelfItemId"
  GROUP BY "anchor"."shelfItemId", "anchor"."lastDown"
)
UPDATE "ShelfItem" AS "item"
SET "outAt" = COALESCE("book"."lastDown", "item"."createdAt")
FROM "ShelfItem" AS "self"
LEFT JOIN "book" ON "book"."shelfItemId" = "self"."id"
WHERE "self"."id" = "item"."id"
  AND "item"."status" <> 'plan'
  AND COALESCE("book"."grams", 0) <= 0;
