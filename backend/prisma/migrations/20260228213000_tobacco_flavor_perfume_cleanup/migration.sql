ALTER TYPE "FlavorProfile" ADD VALUE IF NOT EXISTS 'perfume';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Tobacco' AND column_name = 'flavor'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Tobacco' AND column_name = 'flavors'
  ) THEN
    ALTER TABLE "Tobacco" RENAME COLUMN "flavor" TO "flavors";
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Mix' AND column_name = 'flavor'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Mix' AND column_name = 'flavors'
  ) THEN
    ALTER TABLE "Mix" RENAME COLUMN "flavor" TO "flavors";
  END IF;
END
$$;

ALTER TABLE "Tobacco"
DROP COLUMN IF EXISTS "line";

ALTER TABLE "Tobacco"
DROP COLUMN IF EXISTS "tags";
