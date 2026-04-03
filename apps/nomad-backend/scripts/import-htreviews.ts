import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchHtReviewsCatalogSnapshot } from '../src/integrations/htreviews/catalog';

const toInt = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return fallback;
};

async function main() {
  const outputPath = path.resolve(
    process.cwd(),
    process.env.HTREVIEWS_OUTPUT_PATH ?? './data/imports/htreviews/preview.json',
  );
  const brandUrls = process.env.HTREVIEWS_BRAND_URLS
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const snapshot = await fetchHtReviewsCatalogSnapshot({
    brandLimit: toInt(process.env.HTREVIEWS_BRAND_LIMIT),
    tobaccoLimit: toInt(process.env.HTREVIEWS_TOBACCO_LIMIT),
    fetchDetails: toBoolean(process.env.HTREVIEWS_FETCH_DETAILS, true),
    delayMs: toInt(process.env.HTREVIEWS_DELAY_MS),
    brandUrls,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(snapshot, null, 2));

  console.log(`[htreviews] preview saved: ${outputPath}`);
  console.log(
    `[htreviews] brands=${snapshot.brandCount} tobaccos=${snapshot.tobaccoCount} withDetails=${toBoolean(
      process.env.HTREVIEWS_FETCH_DETAILS,
      true,
    )}`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[htreviews] ${message}`);
  process.exit(1);
});
