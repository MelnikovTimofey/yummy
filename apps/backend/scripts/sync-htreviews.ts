import 'dotenv/config';
import { loadShelfBrandUrls, syncHtReviewsCatalog } from '../src/integrations/htreviews/sync';

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
  const shelfBrands = toBoolean(process.env.HTREVIEWS_SHELF_BRANDS, false);
  const brandUrls = shelfBrands
    ? await loadShelfBrandUrls()
    : process.env.HTREVIEWS_BRAND_URLS
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  // Пустой список брендов syncHtReviewsCatalog читает как «весь каталог»:
  // ночной прогон не должен молча превратиться в многочасовой полный.
  if (shelfBrands && !brandUrls?.length) {
    throw new Error('HTREVIEWS_SHELF_BRANDS=1, но в наличии нет ни одного табака htreviews');
  }

  const startedAt = Date.now();
  console.log(`[htreviews:sync] ${new Date().toISOString()} starting against ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') ?? '<no DATABASE_URL>'}`);

  const stats = await syncHtReviewsCatalog({
    brandLimit: toInt(process.env.HTREVIEWS_BRAND_LIMIT),
    tobaccoLimit: toInt(process.env.HTREVIEWS_TOBACCO_LIMIT),
    fetchDetails: toBoolean(process.env.HTREVIEWS_FETCH_DETAILS, true),
    delayMs: toInt(process.env.HTREVIEWS_DELAY_MS),
    defaultInStock: toBoolean(process.env.HTREVIEWS_DEFAULT_IN_STOCK, false),
    brandUrls,
  });

  const elapsedMs = Date.now() - startedAt;
  console.log(`[htreviews:sync] ${new Date().toISOString()} completed in ${Math.round(elapsedMs / 1000)}s`);
  console.log(`[htreviews:sync] stats ${JSON.stringify({ shelfBrands: shelfBrands ? brandUrls?.length : null, ...stats })}`);
  // Сетевые ошибки обход проглатывает по одному URL; если не пришло ничего —
  // htreviews недоступен или закрыл доступ, и это сбой, а не пустая синхронизация.
  if (stats.fetched === 0) {
    throw new Error('с htreviews не получено ни одного табака');
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[htreviews:sync] ${message}`);
  process.exit(1);
});
