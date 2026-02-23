ALTER TABLE "Mix"
ADD COLUMN "flavorProfiles" "FlavorProfile"[] NOT NULL DEFAULT ARRAY[]::"FlavorProfile"[];

ALTER TABLE "Mix"
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
