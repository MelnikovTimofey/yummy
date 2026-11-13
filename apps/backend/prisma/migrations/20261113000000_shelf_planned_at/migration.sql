-- «В плане» (#559, срез S0, #561): дата постановки в план — поле строки полки.
ALTER TABLE "ShelfItem" ADD COLUMN "plannedAt" TIMESTAMP(3);

-- Заполнение из журнала: последнее событие «add» со статусом plan у этого табака.
-- Аудит полки пишет details через JSON.stringify без пробелов, entityId — id табака.
-- Строки, пришедшие из плана, тоже получают дату: по ней видно, что табак из плана.
UPDATE "ShelfItem" AS "item"
SET "plannedAt" = "planned"."at"
FROM (
  SELECT "entityId", MAX("createdAt") AS "at"
  FROM "AuditEvent"
  WHERE "entityType" = 'shelf' AND "action" = 'add' AND "details" LIKE '%"status":"plan"%'
  GROUP BY "entityId"
) AS "planned"
WHERE "planned"."entityId" = "item"."tobaccoId";

-- В плане без события в журнале — дата появления строки.
UPDATE "ShelfItem" SET "plannedAt" = "createdAt" WHERE "status" = 'plan' AND "plannedAt" IS NULL;
