import 'dotenv/config';
import { syncHtReviewsCatalogToNomad } from '../src/integrations/htreviews/sync';

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
  const brandUrls = process.env.HTREVIEWS_BRAND_URLS
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const stats = await syncHtReviewsCatalogToNomad({
    brandLimit: toInt(process.env.HTREVIEWS_BRAND_LIMIT),
    tobaccoLimit: toInt(process.env.HTREVIEWS_TOBACCO_LIMIT),
    fetchDetails: toBoolean(process.env.HTREVIEWS_FETCH_DETAILS, true),
    delayMs: toInt(process.env.HTREVIEWS_DELAY_MS),
    defaultInStock: toBoolean(process.env.HTREVIEWS_DEFAULT_IN_STOCK, false),
    brandUrls,
  });

  console.log('[htreviews:sync] completed');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[htreviews:sync] ${message}`);
  process.exit(1);
});
