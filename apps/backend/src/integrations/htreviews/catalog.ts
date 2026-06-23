import { HtReviewsClient } from './client';
import { buildHtReviewsDescription } from './description';
import {
  extractCatalogEntryUrls,
  parseBrandIndexPage,
  parseBrandPage,
  parseObjectListMeta,
  parseObjectListResponse,
  parseTobaccoPage,
} from './parser';
import { buildNomadTaxonomyCandidate } from './taxonomy';
import type {
  HtReviewsBrandRef,
  HtReviewsCatalogSnapshot,
  HtReviewsImportedTobacco,
  HtReviewsImportOptions,
  HtReviewsTobaccoDetail,
  HtReviewsTobaccoSummary,
} from './types';

const DISCOVERY_PATHS = ['/tobaccos', '/tobaccos/new', '/tobaccos/brands', '/tobaccos/lines'];
const HTREVIEWS_DISCOVERY_PAGE_SIZE = 20;
const HTREVIEWS_BRAND_DISCOVERY_MODES = ['position', 'others'] as const;

const takeLimit = <T>(items: T[], limit: number | undefined) => {
  if (!limit || limit < 1) {
    return items;
  }

  return items.slice(0, limit);
};

const mergeSummaryAndDetail = (
  summary: HtReviewsTobaccoSummary,
  detail: HtReviewsTobaccoDetail | null,
): HtReviewsImportedTobacco => {
  const rawTags = detail?.rawTags.length ? detail.rawTags : [];
  const nomadCandidate = buildNomadTaxonomyCandidate(rawTags);

  return {
    manufacturer: detail?.brand.name ?? summary.brand.name,
    lineName: detail?.line.name ?? summary.line.name,
    name: detail?.name ?? summary.name,
    alias: detail?.alias ?? summary.alias,
    sourceUrl: detail?.url ?? summary.url,
    sourceNumericId: detail?.sourceNumericId ?? summary.sourceNumericId,
    sourceExternalId: detail?.htreviewsId ?? null,
    country: detail?.country ?? null,
    officialStrength: detail?.officialStrength ?? null,
    communityStrength: detail?.communityStrength ?? null,
    status: detail?.status ?? null,
    addedAt: detail?.addedAt ?? null,
    description: detail ? buildHtReviewsDescription(detail) : null,
    imageUrl: detail?.imageUrl ?? summary.imageUrl,
    rating: summary.rating ?? detail?.rating ?? null,
    ratingsCount: summary.ratingsCount,
    reviewsCount: summary.reviewsCount ?? detail?.reviewCount ?? null,
    viewsCount: summary.viewsCount,
    rawTags,
    nomadCandidate,
  };
};

const toBrandRefs = (client: HtReviewsClient, brandUrls?: string[]) => {
  if (!brandUrls?.length) {
    return null;
  }

  return brandUrls.map((url) => {
    const slug = new URL(url, client.baseUrl).pathname.split('/').filter(Boolean)[1] ?? url;
    const name = slug.replace(/-/g, ' ');
    return {
      name,
      slug,
      url: new URL(url, client.baseUrl).toString(),
    } satisfies HtReviewsBrandRef;
  });
};

const toBrandRef = (url: string): HtReviewsBrandRef => {
  const parsedUrl = new URL(url);
  const slug = parsedUrl.pathname.split('/').filter(Boolean)[1] ?? url;

  return {
    name: slug.replace(/-/g, ' '),
    slug,
    url: parsedUrl.toString(),
  };
};

const safeFetchText = async (client: HtReviewsClient, url: string) => {
  try {
    return await client.fetchText(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[htreviews] skipped ${url}: ${message}`);
    return null;
  }
};

const safeFetchJson = async <T>(client: HtReviewsClient, url: string) => {
  try {
    return await client.fetchJson<T>(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[htreviews] skipped ${url}: ${message}`);
    return null;
  }
};

const safePostJson = async <T>(client: HtReviewsClient, url: string, body: unknown) => {
  try {
    return await client.postJson<T>(url, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[htreviews] skipped ${url}: ${message}`);
    return null;
  }
};

const toBrandRefFromDiscoveryItem = (client: HtReviewsClient, item: unknown): HtReviewsBrandRef | null => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const slug = typeof (item as { slug?: unknown }).slug === 'string'
    ? (item as { slug: string }).slug.trim()
    : '';
  const name = typeof (item as { name?: unknown }).name === 'string'
    ? (item as { name: string }).name.trim()
    : '';

  if (!slug || !name) {
    return null;
  }

  return {
    name,
    slug,
    url: new URL(`/tobaccos/${slug}`, client.baseUrl).toString(),
  };
};

const fetchAdditionalBrandRefs = async (client: HtReviewsClient) => {
  const brands: HtReviewsBrandRef[] = [];
  const seenUrls = new Set<string>();

  for (const mode of HTREVIEWS_BRAND_DISCOVERY_MODES) {
    for (let offset = HTREVIEWS_DISCOVERY_PAGE_SIZE; ; offset += HTREVIEWS_DISCOVERY_PAGE_SIZE) {
      const params = new URLSearchParams({
        action: 'brands',
        r: mode,
        s: 'rating',
        d: 'desc',
        o: String(offset),
      });
      const entries = await safeFetchJson<unknown[]>(client, `${client.baseUrl}/getData?${params.toString()}`);
      if (!entries?.length) {
        break;
      }

      let addedOnPage = 0;
      for (const entry of entries) {
        const brand = toBrandRefFromDiscoveryItem(client, entry);
        if (!brand || seenUrls.has(brand.url)) {
          continue;
        }

        seenUrls.add(brand.url);
        brands.push(brand);
        addedOnPage += 1;
      }

      if (entries.length < HTREVIEWS_DISCOVERY_PAGE_SIZE || addedOnPage === 0) {
        break;
      }
    }
  }

  return brands;
};

const fetchAdditionalObjectPageSummaries = async (
  client: HtReviewsClient,
  html: string,
  pageUrl: string,
) => {
  const meta = parseObjectListMeta(html, pageUrl);
  if (!meta || meta.offset >= meta.count) {
    return [];
  }

  const page = new URL(pageUrl);
  const sort = {
    s: page.searchParams.get('s') ?? 'rating',
    d: page.searchParams.get('d') ?? 'desc',
  };
  const summaries: HtReviewsTobaccoSummary[] = [];

  for (let offset = meta.offset; offset < meta.count; offset += HTREVIEWS_DISCOVERY_PAGE_SIZE) {
    const entries = await safePostJson<unknown[]>(
      client,
      `${client.baseUrl}/postData`,
      {
        action: meta.action,
        data: {
          id: meta.objectId,
          limit: HTREVIEWS_DISCOVERY_PAGE_SIZE,
          offset,
          sort,
        },
      },
    );
    if (!entries?.length) {
      break;
    }

    summaries.push(...parseObjectListResponse(entries, client.baseUrl));
    if (entries.length < HTREVIEWS_DISCOVERY_PAGE_SIZE) {
      break;
    }
  }

  return summaries;
};

// Прогресс-логирование рассчитано на длинный scrape (часы): без него
// `docker compose run seeder` выглядит «зависшим». Логи stdout-only, чтобы
// docker compose их подхватывал в реальном времени.
const logProgress = (message: string) => {
  console.log(`[htreviews] ${new Date().toISOString()} ${message}`);
};

export const fetchHtReviewsCatalogSnapshot = async (
  options: HtReviewsImportOptions = {},
): Promise<HtReviewsCatalogSnapshot> => {
  const client = new HtReviewsClient(options);
  const explicitBrands = toBrandRefs(client, options.brandUrls);
  const discoveryBrandUrls = new Set<string>();
  const discoveryLineUrls = new Set<string>();
  const summaryMap = new Map<string, HtReviewsTobaccoSummary>();

  logProgress(
    `phase=start delayMs=${client.delayMs} timeoutMs=${client.requestTimeoutMs}` +
    ` brandLimit=${options.brandLimit ?? 'none'} tobaccoLimit=${options.tobaccoLimit ?? 'none'}` +
    ` fetchDetails=${options.fetchDetails !== false}` +
    ` explicitBrands=${explicitBrands?.length ?? 0}`,
  );

  if (!explicitBrands) {
    logProgress(`phase=discovery paths=${DISCOVERY_PATHS.length}`);
    let pathIndex = 0;
    for (const path of DISCOVERY_PATHS) {
      pathIndex += 1;
      const html = await safeFetchText(client, `${client.baseUrl}${path}`);
      if (!html) {
        continue;
      }
      const links = extractCatalogEntryUrls(html, client.baseUrl);
      for (const url of links.brandUrls) {
        discoveryBrandUrls.add(url);
      }
      for (const url of links.lineUrls) {
        discoveryLineUrls.add(url);
      }
      for (const summary of parseBrandPage(html, client.baseUrl)) {
        summaryMap.set(summary.url, summary);
      }
      if (path.endsWith('/brands')) {
        for (const brand of parseBrandIndexPage(html, client.baseUrl)) {
          discoveryBrandUrls.add(brand.url);
        }
        for (const brand of await fetchAdditionalBrandRefs(client)) {
          discoveryBrandUrls.add(brand.url);
        }
      }
      logProgress(
        `discovery ${pathIndex}/${DISCOVERY_PATHS.length} ${path}` +
        ` brands=${discoveryBrandUrls.size} lines=${discoveryLineUrls.size} summaries=${summaryMap.size}`,
      );
    }
  }

  if (!explicitBrands && !options.brandLimit) {
    const lineUrls = Array.from(discoveryLineUrls);
    logProgress(`phase=lines total=${lineUrls.length}`);
    let lineIndex = 0;
    for (const lineUrl of lineUrls) {
      lineIndex += 1;
      const html = await safeFetchText(client, lineUrl);
      if (!html) {
        continue;
      }
      for (const summary of parseBrandPage(html, client.baseUrl)) {
        summaryMap.set(summary.url, summary);
        discoveryBrandUrls.add(summary.brand.url);
      }
      for (const summary of await fetchAdditionalObjectPageSummaries(client, html, lineUrl)) {
        summaryMap.set(summary.url, summary);
        discoveryBrandUrls.add(summary.brand.url);
      }
      if (lineIndex % 10 === 0 || lineIndex === lineUrls.length) {
        logProgress(
          `lines ${lineIndex}/${lineUrls.length}` +
          ` brands=${discoveryBrandUrls.size} summaries=${summaryMap.size}`,
        );
      }
      if (options.tobaccoLimit && summaryMap.size >= options.tobaccoLimit) {
        logProgress(`lines stopped at tobaccoLimit=${options.tobaccoLimit}`);
        break;
      }
    }
  }

  const brands = takeLimit(
    explicitBrands ?? Array.from(discoveryBrandUrls).map((url) => toBrandRef(url)),
    options.brandLimit,
  );

  logProgress(`phase=brands total=${brands.length}`);
  let brandIndex = 0;
  for (const brand of brands) {
    brandIndex += 1;
    const before = summaryMap.size;
    const html = await safeFetchText(client, brand.url);
    if (!html) {
      continue;
    }
    for (const summary of parseBrandPage(html, client.baseUrl)) {
      summaryMap.set(summary.url, summary);
    }
    for (const summary of await fetchAdditionalObjectPageSummaries(client, html, brand.url)) {
      summaryMap.set(summary.url, summary);
    }
    const added = summaryMap.size - before;
    if (brandIndex % 10 === 0 || added > 0 || brandIndex === brands.length) {
      logProgress(
        `brands ${brandIndex}/${brands.length} ${brand.name}` +
        ` +${added} (summaries=${summaryMap.size})`,
      );
    }
    if (options.tobaccoLimit && summaryMap.size >= options.tobaccoLimit) {
      logProgress(`brands stopped at tobaccoLimit=${options.tobaccoLimit}`);
      break;
    }
  }

  const limitedSummaries = takeLimit(
    Array.from(summaryMap.values()),
    options.tobaccoLimit,
  );

  const items: HtReviewsImportedTobacco[] = [];

  if (options.fetchDetails === false) {
    logProgress(`phase=details skipped (fetchDetails=false) total=${limitedSummaries.length}`);
  } else {
    logProgress(`phase=details total=${limitedSummaries.length}`);
  }

  let detailIndex = 0;
  for (const summary of limitedSummaries) {
    detailIndex += 1;
    const detailHtml =
      options.fetchDetails === false
        ? null
        : await safeFetchText(client, summary.url);
    const detail =
      detailHtml && options.fetchDetails !== false
        ? parseTobaccoPage(detailHtml, client.baseUrl, summary.url)
        : null;
    items.push(mergeSummaryAndDetail(summary, detail));
    if (
      options.fetchDetails !== false &&
      (detailIndex % 25 === 0 || detailIndex === limitedSummaries.length)
    ) {
      logProgress(`details ${detailIndex}/${limitedSummaries.length}`);
    }
  }

  logProgress(
    `phase=snapshot-ready brands=${brands.length} tobaccos=${items.length}`,
  );

  return {
    source: 'htreviews',
    fetchedAt: new Date().toISOString(),
    baseUrl: client.baseUrl,
    robotsNotes: [
      'HTReviews robots.txt запрещает /api/* для User-agent *.',
      'HTReviews robots.txt отдельно запрещает GPTBot.',
      'Интеграция использует публичный HTML и рассчитана на ручной dry-run/import review.',
    ],
    brandCount: brands.length,
    tobaccoCount: items.length,
    items,
  };
};
