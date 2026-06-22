-- Strip "Nomad" prefix from all data-model objects (tables, constraints, indexes)
-- and migrate staff role value 'nomad' -> 'master'. Metadata-only renames (no data rewrite).

-- 1) Rename tables
ALTER TABLE "NomadAuditEvent" RENAME TO "AuditEvent";
ALTER TABLE "NomadDailyAccessCode" RENAME TO "DailyAccessCode";
ALTER TABLE "NomadFlavorCatalog" RENAME TO "FlavorCatalog";
ALTER TABLE "NomadFlavorProfileCatalog" RENAME TO "FlavorProfileCatalog";
ALTER TABLE "NomadFlavorTagCatalog" RENAME TO "FlavorTagCatalog";
ALTER TABLE "NomadIntroCard" RENAME TO "IntroCard";
ALTER TABLE "NomadMix" RENAME TO "Mix";
ALTER TABLE "NomadMixComponent" RENAME TO "MixComponent";
ALTER TABLE "NomadMixRating" RENAME TO "MixRating";
ALTER TABLE "NomadRail" RENAME TO "Rail";
ALTER TABLE "NomadRailMix" RENAME TO "RailMix";
ALTER TABLE "NomadSmokeCtaEvent" RENAME TO "SmokeCtaEvent";
ALTER TABLE "NomadSourceTagMapping" RENAME TO "SourceTagMapping";
ALTER TABLE "NomadStaffAccount" RENAME TO "StaffAccount";
ALTER TABLE "NomadTelegramAutomationState" RENAME TO "TelegramAutomationState";
ALTER TABLE "NomadTelegramOperator" RENAME TO "TelegramOperator";
ALTER TABLE "NomadTelegramRecipient" RENAME TO "TelegramRecipient";
ALTER TABLE "NomadTobacco" RENAME TO "Tobacco";

-- 2) Rename primary-key and foreign-key constraints
ALTER TABLE "AuditEvent" RENAME CONSTRAINT "NomadAuditEvent_pkey" TO "AuditEvent_pkey";
ALTER TABLE "DailyAccessCode" RENAME CONSTRAINT "NomadDailyAccessCode_pkey" TO "DailyAccessCode_pkey";
ALTER TABLE "FlavorCatalog" RENAME CONSTRAINT "NomadFlavorCatalog_pkey" TO "FlavorCatalog_pkey";
ALTER TABLE "FlavorProfileCatalog" RENAME CONSTRAINT "NomadFlavorProfileCatalog_pkey" TO "FlavorProfileCatalog_pkey";
ALTER TABLE "FlavorTagCatalog" RENAME CONSTRAINT "NomadFlavorTagCatalog_pkey" TO "FlavorTagCatalog_pkey";
ALTER TABLE "IntroCard" RENAME CONSTRAINT "NomadIntroCard_pkey" TO "IntroCard_pkey";
ALTER TABLE "MixComponent" RENAME CONSTRAINT "NomadMixComponent_mixId_fkey" TO "MixComponent_mixId_fkey";
ALTER TABLE "MixComponent" RENAME CONSTRAINT "NomadMixComponent_pkey" TO "MixComponent_pkey";
ALTER TABLE "MixComponent" RENAME CONSTRAINT "NomadMixComponent_tobaccoId_fkey" TO "MixComponent_tobaccoId_fkey";
ALTER TABLE "MixRating" RENAME CONSTRAINT "NomadMixRating_mixId_fkey" TO "MixRating_mixId_fkey";
ALTER TABLE "MixRating" RENAME CONSTRAINT "NomadMixRating_pkey" TO "MixRating_pkey";
ALTER TABLE "Mix" RENAME CONSTRAINT "NomadMix_pkey" TO "Mix_pkey";
ALTER TABLE "RailMix" RENAME CONSTRAINT "NomadRailMix_mixId_fkey" TO "RailMix_mixId_fkey";
ALTER TABLE "RailMix" RENAME CONSTRAINT "NomadRailMix_pkey" TO "RailMix_pkey";
ALTER TABLE "RailMix" RENAME CONSTRAINT "NomadRailMix_railId_fkey" TO "RailMix_railId_fkey";
ALTER TABLE "Rail" RENAME CONSTRAINT "NomadRail_pkey" TO "Rail_pkey";
ALTER TABLE "SmokeCtaEvent" RENAME CONSTRAINT "NomadSmokeCtaEvent_mixId_fkey" TO "SmokeCtaEvent_mixId_fkey";
ALTER TABLE "SmokeCtaEvent" RENAME CONSTRAINT "NomadSmokeCtaEvent_pkey" TO "SmokeCtaEvent_pkey";
ALTER TABLE "SourceTagMapping" RENAME CONSTRAINT "NomadSourceTagMapping_pkey" TO "SourceTagMapping_pkey";
ALTER TABLE "StaffAccount" RENAME CONSTRAINT "NomadStaffAccount_pkey" TO "StaffAccount_pkey";
ALTER TABLE "TelegramAutomationState" RENAME CONSTRAINT "NomadTelegramAutomationState_pkey" TO "TelegramAutomationState_pkey";
ALTER TABLE "TelegramOperator" RENAME CONSTRAINT "NomadTelegramOperator_pkey" TO "TelegramOperator_pkey";
ALTER TABLE "TelegramRecipient" RENAME CONSTRAINT "NomadTelegramRecipient_pkey" TO "TelegramRecipient_pkey";
ALTER TABLE "Tobacco" RENAME CONSTRAINT "NomadTobacco_pkey" TO "Tobacco_pkey";

-- 3) Rename unique/secondary indexes
ALTER INDEX "NomadAuditEvent_actorLogin_createdAt_idx" RENAME TO "AuditEvent_actorLogin_createdAt_idx";
ALTER INDEX "NomadAuditEvent_createdAt_idx" RENAME TO "AuditEvent_createdAt_idx";
ALTER INDEX "NomadAuditEvent_entityType_createdAt_idx" RENAME TO "AuditEvent_entityType_createdAt_idx";
ALTER INDEX "NomadDailyAccessCode_active_startsAt_endsAt_idx" RENAME TO "DailyAccessCode_active_startsAt_endsAt_idx";
ALTER INDEX "NomadIntroCard_step_key" RENAME TO "IntroCard_step_key";
ALTER INDEX "NomadMixComponent_mixId_idx" RENAME TO "MixComponent_mixId_idx";
ALTER INDEX "NomadMixComponent_mixId_tobaccoId_key" RENAME TO "MixComponent_mixId_tobaccoId_key";
ALTER INDEX "NomadMixComponent_tobaccoId_idx" RENAME TO "MixComponent_tobaccoId_idx";
ALTER INDEX "NomadMixRating_createdAt_idx" RENAME TO "MixRating_createdAt_idx";
ALTER INDEX "NomadMixRating_mixId_idx" RENAME TO "MixRating_mixId_idx";
ALTER INDEX "NomadRailMix_mixId_idx" RENAME TO "RailMix_mixId_idx";
ALTER INDEX "NomadRailMix_railId_idx" RENAME TO "RailMix_railId_idx";
ALTER INDEX "NomadRailMix_railId_mixId_key" RENAME TO "RailMix_railId_mixId_key";
ALTER INDEX "NomadRail_active_idx" RENAME TO "Rail_active_idx";
ALTER INDEX "NomadRail_type_idx" RENAME TO "Rail_type_idx";
ALTER INDEX "NomadSmokeCtaEvent_mixId_idx" RENAME TO "SmokeCtaEvent_mixId_idx";
ALTER INDEX "NomadSourceTagMapping_sourceKind_idx" RENAME TO "SourceTagMapping_sourceKind_idx";
ALTER INDEX "NomadSourceTagMapping_sourceKind_normalizedSourceTag_key" RENAME TO "SourceTagMapping_sourceKind_normalizedSourceTag_key";
ALTER INDEX "NomadStaffAccount_active_idx" RENAME TO "StaffAccount_active_idx";
ALTER INDEX "NomadStaffAccount_login_key" RENAME TO "StaffAccount_login_key";
ALTER INDEX "NomadTelegramOperator_active_idx" RENAME TO "TelegramOperator_active_idx";
ALTER INDEX "NomadTelegramOperator_linkedChatId_idx" RENAME TO "TelegramOperator_linkedChatId_idx";
ALTER INDEX "NomadTelegramOperator_linkedChatId_key" RENAME TO "TelegramOperator_linkedChatId_key";
ALTER INDEX "NomadTelegramOperator_phone_key" RENAME TO "TelegramOperator_phone_key";
ALTER INDEX "NomadTelegramRecipient_chatId_scope_key" RENAME TO "TelegramRecipient_chatId_scope_key";
ALTER INDEX "NomadTelegramRecipient_scope_active_idx" RENAME TO "TelegramRecipient_scope_active_idx";
ALTER INDEX "NomadTobacco_archived_idx" RENAME TO "Tobacco_archived_idx";
ALTER INDEX "NomadTobacco_inStock_idx" RENAME TO "Tobacco_inStock_idx";
ALTER INDEX "NomadTobacco_manufacturer_lineName_name_idx" RENAME TO "Tobacco_manufacturer_lineName_name_idx";
ALTER INDEX "NomadTobacco_sourceExternalId_key" RENAME TO "Tobacco_sourceExternalId_key";
ALTER INDEX "NomadTobacco_sourceKind_idx" RENAME TO "Tobacco_sourceKind_idx";
ALTER INDEX "NomadTobacco_sourceKind_sourceNumericId_key" RENAME TO "Tobacco_sourceKind_sourceNumericId_key";

-- 4) Migrate staff role value
UPDATE "StaffAccount" SET "role" = 'master' WHERE "role" = 'nomad';
