-- Автор микса (#491): сотрудник, который завёл микс. Учётку удалили — автор null.
ALTER TABLE "Mix" ADD COLUMN "authorId" TEXT;

CREATE INDEX "Mix_authorId_idx" ON "Mix"("authorId");

ALTER TABLE "Mix" ADD CONSTRAINT "Mix_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "StaffAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
