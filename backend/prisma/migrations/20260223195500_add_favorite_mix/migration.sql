CREATE TABLE "FavoriteMix" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FavoriteMix_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FavoriteMix_userId_idx" ON "FavoriteMix"("userId");
CREATE INDEX "FavoriteMix_mixId_idx" ON "FavoriteMix"("mixId");
CREATE UNIQUE INDEX "FavoriteMix_userId_mixId_key" ON "FavoriteMix"("userId", "mixId");

ALTER TABLE "FavoriteMix"
ADD CONSTRAINT "FavoriteMix_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FavoriteMix"
ADD CONSTRAINT "FavoriteMix_mixId_fkey"
FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
