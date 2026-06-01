-- CreateTable
CREATE TABLE "NomadIntroCard" (
    "id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bullets" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadIntroCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadStaffAccount" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadStaffAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadDailyAccessCode" (
    "id" TEXT NOT NULL,
    "codeValue" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeSalt" TEXT NOT NULL,
    "codeLabel" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadDailyAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadTelegramRecipient" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadTelegramRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadTelegramOperator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "linkedChatId" TEXT,
    "linkedTelegramUserId" TEXT,
    "linkedUsername" TEXT,
    "linkedDisplayName" TEXT,
    "linkedAt" TIMESTAMP(3),
    "lastCodeRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadTelegramOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadTelegramAutomationState" (
    "id" TEXT NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastRotateAt" TIMESTAMP(3),
    "lastRotateCodeId" TEXT,
    "lastRotateCodeValue" TEXT,
    "lastBroadcastAt" TIMESTAMP(3),
    "lastBroadcastCodeId" TEXT,
    "lastBroadcastCodeValue" TEXT,
    "lastBroadcastDayKey" TEXT,
    "lastRequestAt" TIMESTAMP(3),
    "lastRequestChatId" TEXT,
    "lastRequestOperatorId" TEXT,
    "lastRequestOperatorName" TEXT,
    "lastRequestPhone" TEXT,
    "lastRequestCodeId" TEXT,
    "lastRequestCodeValue" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadTelegramAutomationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadAuditEvent" (
    "id" TEXT NOT NULL,
    "actorLogin" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NomadAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadTobacco" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "lineName" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "description" TEXT,
    "sourceKind" TEXT,
    "sourceUrl" TEXT,
    "sourceExternalId" TEXT,
    "sourceNumericId" TEXT,
    "country" TEXT,
    "officialStrength" TEXT,
    "communityStrength" TEXT,
    "productionStatus" TEXT,
    "imageUrl" TEXT,
    "rawSourceTags" TEXT,
    "flavorProfiles" TEXT NOT NULL,
    "flavors" TEXT NOT NULL,
    "flavorTags" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadTobacco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadFlavorProfileCatalog" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tobaccoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadFlavorProfileCatalog_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NomadFlavorCatalog" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tobaccoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadFlavorCatalog_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NomadFlavorTagCatalog" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tobaccoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadFlavorTagCatalog_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NomadSourceTagMapping" (
    "id" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceTag" TEXT NOT NULL,
    "normalizedSourceTag" TEXT NOT NULL,
    "flavorProfiles" TEXT NOT NULL,
    "flavors" TEXT NOT NULL,
    "flavorTags" TEXT NOT NULL,
    "tobaccoCount" INTEGER NOT NULL DEFAULT 0,
    "unmapped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadSourceTagMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadMix" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "flavorProfiles" TEXT NOT NULL,
    "flavors" TEXT NOT NULL,
    "flavorTags" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "baseAvgRating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadMix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadMixComponent" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "tobaccoId" TEXT NOT NULL,
    "proportion" INTEGER NOT NULL DEFAULT 50,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NomadMixComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadRail" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NomadRail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadRailMix" (
    "id" TEXT NOT NULL,
    "railId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NomadRailMix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadSmokeCtaEvent" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NomadSmokeCtaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomadMixRating" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'guest',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NomadMixRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NomadIntroCard_step_key" ON "NomadIntroCard"("step");

-- CreateIndex
CREATE UNIQUE INDEX "NomadStaffAccount_login_key" ON "NomadStaffAccount"("login");

-- CreateIndex
CREATE INDEX "NomadStaffAccount_active_idx" ON "NomadStaffAccount"("active");

-- CreateIndex
CREATE INDEX "NomadDailyAccessCode_active_startsAt_endsAt_idx" ON "NomadDailyAccessCode"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "NomadTelegramRecipient_scope_active_idx" ON "NomadTelegramRecipient"("scope", "active");

-- CreateIndex
CREATE UNIQUE INDEX "NomadTelegramRecipient_chatId_scope_key" ON "NomadTelegramRecipient"("chatId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "NomadTelegramOperator_phone_key" ON "NomadTelegramOperator"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "NomadTelegramOperator_linkedChatId_key" ON "NomadTelegramOperator"("linkedChatId");

-- CreateIndex
CREATE INDEX "NomadTelegramOperator_active_idx" ON "NomadTelegramOperator"("active");

-- CreateIndex
CREATE INDEX "NomadTelegramOperator_linkedChatId_idx" ON "NomadTelegramOperator"("linkedChatId");

-- CreateIndex
CREATE INDEX "NomadAuditEvent_createdAt_idx" ON "NomadAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "NomadAuditEvent_entityType_createdAt_idx" ON "NomadAuditEvent"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "NomadAuditEvent_actorLogin_createdAt_idx" ON "NomadAuditEvent"("actorLogin", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NomadTobacco_sourceExternalId_key" ON "NomadTobacco"("sourceExternalId");

-- CreateIndex
CREATE INDEX "NomadTobacco_manufacturer_lineName_name_idx" ON "NomadTobacco"("manufacturer", "lineName", "name");

-- CreateIndex
CREATE INDEX "NomadTobacco_inStock_idx" ON "NomadTobacco"("inStock");

-- CreateIndex
CREATE INDEX "NomadTobacco_archived_idx" ON "NomadTobacco"("archived");

-- CreateIndex
CREATE INDEX "NomadTobacco_sourceKind_idx" ON "NomadTobacco"("sourceKind");

-- CreateIndex
CREATE UNIQUE INDEX "NomadTobacco_sourceKind_sourceNumericId_key" ON "NomadTobacco"("sourceKind", "sourceNumericId");

-- CreateIndex
CREATE INDEX "NomadSourceTagMapping_sourceKind_idx" ON "NomadSourceTagMapping"("sourceKind");

-- CreateIndex
CREATE UNIQUE INDEX "NomadSourceTagMapping_sourceKind_normalizedSourceTag_key" ON "NomadSourceTagMapping"("sourceKind", "normalizedSourceTag");

-- CreateIndex
CREATE INDEX "NomadMixComponent_mixId_idx" ON "NomadMixComponent"("mixId");

-- CreateIndex
CREATE INDEX "NomadMixComponent_tobaccoId_idx" ON "NomadMixComponent"("tobaccoId");

-- CreateIndex
CREATE UNIQUE INDEX "NomadMixComponent_mixId_tobaccoId_key" ON "NomadMixComponent"("mixId", "tobaccoId");

-- CreateIndex
CREATE INDEX "NomadRail_type_idx" ON "NomadRail"("type");

-- CreateIndex
CREATE INDEX "NomadRail_active_idx" ON "NomadRail"("active");

-- CreateIndex
CREATE INDEX "NomadRailMix_railId_idx" ON "NomadRailMix"("railId");

-- CreateIndex
CREATE INDEX "NomadRailMix_mixId_idx" ON "NomadRailMix"("mixId");

-- CreateIndex
CREATE UNIQUE INDEX "NomadRailMix_railId_mixId_key" ON "NomadRailMix"("railId", "mixId");

-- CreateIndex
CREATE INDEX "NomadSmokeCtaEvent_mixId_idx" ON "NomadSmokeCtaEvent"("mixId");

-- CreateIndex
CREATE INDEX "NomadMixRating_mixId_idx" ON "NomadMixRating"("mixId");

-- CreateIndex
CREATE INDEX "NomadMixRating_createdAt_idx" ON "NomadMixRating"("createdAt");

-- AddForeignKey
ALTER TABLE "NomadMixComponent" ADD CONSTRAINT "NomadMixComponent_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "NomadMix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomadMixComponent" ADD CONSTRAINT "NomadMixComponent_tobaccoId_fkey" FOREIGN KEY ("tobaccoId") REFERENCES "NomadTobacco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomadRailMix" ADD CONSTRAINT "NomadRailMix_railId_fkey" FOREIGN KEY ("railId") REFERENCES "NomadRail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomadRailMix" ADD CONSTRAINT "NomadRailMix_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "NomadMix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomadSmokeCtaEvent" ADD CONSTRAINT "NomadSmokeCtaEvent_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "NomadMix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomadMixRating" ADD CONSTRAINT "NomadMixRating_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "NomadMix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

