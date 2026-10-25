-- Отзыв токенов мастера (#407): версия растёт при смене пароля и деактивации.

-- AlterTable
ALTER TABLE "StaffAccount" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
