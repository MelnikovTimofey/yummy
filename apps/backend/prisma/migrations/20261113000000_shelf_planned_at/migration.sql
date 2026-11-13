-- «В плане» (#559, срез S0, #561): дата постановки в план — поле строки полки.
ALTER TABLE "ShelfItem" ADD COLUMN "plannedAt" TIMESTAMP(3);

-- Заполнение из журнала: дата берётся, только если последнее событие «add» у табака —
-- постановка в план. Последнее «add» в работу — табак встал мимо плана, даты нет.
-- Приход по счёту «add» не пишет: строка, пришедшая из плана, сохраняет дату плана.
-- Аудит полки пишет details через JSON.stringify без пробелов, entityId — id табака.
UPDATE "ShelfItem" AS "item"
SET "plannedAt" = "last"."createdAt"
FROM (
  SELECT DISTINCT ON ("entityId") "entityId", "createdAt", "details"
  FROM "AuditEvent"
  WHERE "entityType" = 'shelf' AND "action" = 'add'
  ORDER BY "entityId", "createdAt" DESC, "id" DESC
) AS "last"
WHERE "last"."entityId" = "item"."tobaccoId"
  AND "last"."details" LIKE '%"status":"plan"%';

-- В плане без такого события — дата появления строки.
UPDATE "ShelfItem" SET "plannedAt" = "createdAt" WHERE "status" = 'plan' AND "plannedAt" IS NULL;
