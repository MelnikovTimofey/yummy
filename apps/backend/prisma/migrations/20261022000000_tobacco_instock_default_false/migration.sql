-- inStock — кэш правила полки (src/shelf.ts). Запись табака в обход сервиса полки
-- не должна становиться видимой гостю по умолчанию. Данные не меняются.
ALTER TABLE "Tobacco" ALTER COLUMN "inStock" SET DEFAULT false;
