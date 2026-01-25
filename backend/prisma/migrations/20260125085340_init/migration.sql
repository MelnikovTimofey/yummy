-- CreateEnum
CREATE TYPE "FlavorProfile" AS ENUM ('sweet', 'sour', 'spicy', 'fresh', 'dessert', 'tobacco');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('home', 'lounge');

-- CreateEnum
CREATE TYPE "MixRatingSource" AS ENUM ('direct', 'derived');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "likedProfiles" "FlavorProfile"[],
    "dislikedProfiles" "FlavorProfile"[],
    "favoriteManufacturerIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferenceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tobacco" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flavorProfiles" "FlavorProfile"[],
    "flavorTags" TEXT[],
    "strength" INTEGER NOT NULL,
    "line" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tobacco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mix" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixComponent" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "tobaccoId" TEXT NOT NULL,
    "proportion" INTEGER NOT NULL,

    CONSTRAINT "MixComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmokingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationType" "LocationType" NOT NULL,
    "locationName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmokingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionRating" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixRating" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "source" "MixRatingSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MixRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_userId_idx" ON "MagicLinkToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceProfile_userId_key" ON "PreferenceProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE INDEX "Tobacco_manufacturerId_idx" ON "Tobacco"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tobacco_manufacturerId_name_key" ON "Tobacco"("manufacturerId", "name");

-- CreateIndex
CREATE INDEX "Mix_authorId_idx" ON "Mix"("authorId");

-- CreateIndex
CREATE INDEX "Recommendation_userId_idx" ON "Recommendation"("userId");

-- CreateIndex
CREATE INDEX "Recommendation_mixId_idx" ON "Recommendation"("mixId");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_userId_mixId_key" ON "Recommendation"("userId", "mixId");

-- CreateIndex
CREATE INDEX "MixComponent_mixId_idx" ON "MixComponent"("mixId");

-- CreateIndex
CREATE INDEX "MixComponent_tobaccoId_idx" ON "MixComponent"("tobaccoId");

-- CreateIndex
CREATE UNIQUE INDEX "MixComponent_mixId_tobaccoId_key" ON "MixComponent"("mixId", "tobaccoId");

-- CreateIndex
CREATE INDEX "SmokingSession_userId_idx" ON "SmokingSession"("userId");

-- CreateIndex
CREATE INDEX "SmokingSession_mixId_idx" ON "SmokingSession"("mixId");

-- CreateIndex
CREATE INDEX "SessionRating_sessionId_idx" ON "SessionRating"("sessionId");

-- CreateIndex
CREATE INDEX "SessionRating_userId_idx" ON "SessionRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionRating_sessionId_userId_key" ON "SessionRating"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "MixRating_mixId_idx" ON "MixRating"("mixId");

-- CreateIndex
CREATE INDEX "MixRating_userId_idx" ON "MixRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MixRating_mixId_userId_key" ON "MixRating"("mixId", "userId");

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenceProfile" ADD CONSTRAINT "PreferenceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tobacco" ADD CONSTRAINT "Tobacco_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mix" ADD CONSTRAINT "Mix_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixComponent" ADD CONSTRAINT "MixComponent_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixComponent" ADD CONSTRAINT "MixComponent_tobaccoId_fkey" FOREIGN KEY ("tobaccoId") REFERENCES "Tobacco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmokingSession" ADD CONSTRAINT "SmokingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmokingSession" ADD CONSTRAINT "SmokingSession_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRating" ADD CONSTRAINT "SessionRating_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SmokingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRating" ADD CONSTRAINT "SessionRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixRating" ADD CONSTRAINT "MixRating_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "Mix"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixRating" ADD CONSTRAINT "MixRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
