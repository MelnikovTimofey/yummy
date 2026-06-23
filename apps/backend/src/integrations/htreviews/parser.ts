import type {
  HtReviewsBrandRef,
  HtReviewsLineRef,
  HtReviewsTobaccoDetail,
  HtReviewsTobaccoSummary,
} from './types';

const RESERVED_TOBACCO_PATHS = new Set(['new', 'brands', 'lines']);

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));

const stripTags = (value: string) => decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseNumber = (value: string | null) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, '').replace(',', '.').toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith('k')) {
    const numeric = Number.parseFloat(normalized.slice(0, -1));
    return Number.isFinite(numeric) ? Math.round(numeric * 1000) : null;
  }

  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const STRENGTH_SCALE: Record<string, string> = {
  '1': 'Лёгкая',
  '2': 'Средне-лёгкая',
  '3': 'Средняя',
  '4': 'Средне-крепкая',
  '5': 'Крепкая',
};

const parsePathSlug = (url: string, index: number) => {
  try {
    const pathname = new URL(url).pathname.split('/').filter(Boolean);
    return pathname[index] ?? null;
  } catch {
    return null;
  }
};

const resolveAbsoluteUrl = (baseUrl: string, value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
};

const extractText = (block: string, pattern: RegExp) => {
  const match = pattern.exec(block);
  return match ? stripTags(match[1]) : null;
};

const extractInfoValue = (html: string, label: string) => {
  const escaped = escapeRegExp(label);
  return extractText(
    html,
    new RegExp(`${escaped}[\\s\\S]*?<span>\\s*<\\/span>[\\s\\S]*?<span(?: [^>]*)?>([\\s\\S]*?)<\\/span>`, 'i'),
  );
};

const deriveStrengthFromDescription = (description: string | null) => {
  if (!description) {
    return null;
  }

  const numericMatch = description.match(/(?:крепост[^\d]{0,24})?([1-5])\s*\/\s*5/i);
  if (numericMatch?.[1]) {
    return STRENGTH_SCALE[numericMatch[1]] ?? null;
  }

  return null;
};

const extractTagList = (html: string) => {
  const tags = Array.from(
    html.matchAll(/<a class="object_card_tag"[^>]*href="[^"]*\/tobaccos\?r=flavor&t=\d+"[^>]*>([\s\S]*?)<\/a>/gi),
  ).map((match) => stripTags(match[1]));

  return Array.from(new Set(tags.filter(Boolean)));
};

const extractJsonLdProduct = (html: string) => {
  const blocks = Array.from(
    html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi),
  )
    .map((match) => match[1]?.trim())
    .filter(Boolean);

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block) as Record<string, unknown>;
      if (parsed['@type'] === 'Product') {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const parseBrandRef = (url: string, name: string): HtReviewsBrandRef => ({
  name,
  slug: parsePathSlug(url, 1) ?? name.toLowerCase(),
  url,
});

const parseLineRef = (url: string | null, name: string | null): HtReviewsLineRef => ({
  name: name ?? 'Не указано',
  slug: url ? parsePathSlug(url, 2) : null,
  url,
});

export const extractCatalogEntryUrls = (html: string, baseUrl: string) => {
  const brandUrls = new Set<string>();
  const lineUrls = new Set<string>();
  const tobaccoUrls = new Set<string>();

  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    const absoluteUrl = resolveAbsoluteUrl(baseUrl, match[1]);
    if (!absoluteUrl) {
      continue;
    }

    let pathname: string;
    try {
      pathname = new URL(absoluteUrl).pathname;
    } catch {
      continue;
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] !== 'tobaccos') {
      continue;
    }

    const tobaccoPath = segments.slice(1);
    if (tobaccoPath.length === 0 || RESERVED_TOBACCO_PATHS.has(tobaccoPath[0] ?? '')) {
      continue;
    }

    if (tobaccoPath.length === 1) {
      brandUrls.add(absoluteUrl);
      continue;
    }

    if (tobaccoPath.length === 2) {
      lineUrls.add(absoluteUrl);
      continue;
    }

    tobaccoUrls.add(absoluteUrl);
  }

  return {
    brandUrls: Array.from(brandUrls),
    lineUrls: Array.from(lineUrls),
    tobaccoUrls: Array.from(tobaccoUrls),
  };
};

export const parseBrandIndexPage = (html: string, baseUrl: string): HtReviewsBrandRef[] => {
  const seen = new Set<string>();
  const brands: HtReviewsBrandRef[] = [];

  for (const match of html.matchAll(
    /<a class="tobacco_list_item_slug" href="(https?:\/\/htreviews\.org\/tobaccos\/[^"\/?#]+)"[^>]*>\s*<span>([\s\S]*?)<\/span>/gi,
  )) {
    const url = resolveAbsoluteUrl(baseUrl, match[1]);
    const name = stripTags(match[2]);
    if (!url || !name || seen.has(url)) {
      continue;
    }

    seen.add(url);
    brands.push(parseBrandRef(url, name));
  }

  return brands;
};

export const parseBrandPage = (html: string, baseUrl: string): HtReviewsTobaccoSummary[] => {
  const sections = html.split('<div class="tobacco_list_item ').slice(1);
  const items: HtReviewsTobaccoSummary[] = [];

  for (const section of sections) {
    const block = `<div class="tobacco_list_item ${section}`;
    const url = resolveAbsoluteUrl(
      baseUrl,
      block.match(/<a class="tobacco_list_item_slug" href="([^"]+)"/i)?.[1] ?? null,
    );
    const name = extractText(block, /<a class="tobacco_list_item_slug"[^>]*>\s*<span>([\s\S]*?)<\/span>/i);
    const aliasMatches = Array.from(block.matchAll(/<a class="tobacco_list_item_slug"[^>]*>\s*<span>[\s\S]*?<\/span>\s*<span>([\s\S]*?)<\/span>/gi));
    const alias = aliasMatches.length ? stripTags(aliasMatches[aliasMatches.length - 1][1]) : null;
    const brandUrl = resolveAbsoluteUrl(
      baseUrl,
      block.match(/<a class="tobacco_list_item_brand_slug" href="([^"]+)"/i)?.[1] ?? null,
    );
    const brandName = extractText(block, /<a class="tobacco_list_item_brand_slug"[^>]*>\s*<span>([\s\S]*?)<\/span>/i);
    const lineUrl = resolveAbsoluteUrl(
      baseUrl,
      block.match(/<a class="tobacco_list_item_line_slug" href="([^"]+)"/i)?.[1] ?? null,
    );
    const lineName = extractText(block, /<a class="tobacco_list_item_line_slug"[^>]*>\s*<span>([\s\S]*?)<\/span>/i);

    if (!url || !name || !brandUrl || !brandName) {
      continue;
    }

    items.push({
      sourceNumericId: block.match(/data-id="(\d+)"/i)?.[1] ?? null,
      name,
      alias: alias && alias !== name ? alias : null,
      url,
      imageUrl: resolveAbsoluteUrl(
        baseUrl,
        block.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i)?.[1] ?? null,
      ),
      brand: parseBrandRef(brandUrl, brandName),
      line: parseLineRef(lineUrl, lineName),
      rating: parseNumber(extractText(block, /<div class="list_item_rating"[\s\S]*?<span>([\s\S]*?)<\/span>/i)),
      ratingsCount: parseNumber(extractText(block, /<div class="list_item_ratings_count"[\s\S]*?<span>([\s\S]*?)<\/span>/i)),
      reviewsCount: parseNumber(extractText(block, /<div class="list_item_reviews"[\s\S]*?<span>([\s\S]*?)<\/span>/i)),
      viewsCount: parseNumber(extractText(block, /<div class="list_item_stats"[\s\S]*?<span>([\s\S]*?)<\/span>/i)),
    });
  }

  return items;
};

type HtReviewsObjectListItem = {
  id?: string | number | null;
  slug?: string | null;
  name?: string | null;
  alt_name?: string | null;
  media?: string | null;
  line?: string | null;
  line_slug?: string | null;
  brand?: string | null;
  brand_slug?: string | null;
  rating?: string | number | null;
  ratings_count?: string | number | null;
  reviews?: string | number | null;
  views?: string | number | null;
};

export type HtReviewsObjectListMeta = {
  objectId: string;
  action: 'objectByBrand' | 'objectByLine';
  offset: number;
  count: number;
};

const parseObjectListItem = (item: unknown, baseUrl: string): HtReviewsTobaccoSummary | null => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const payload = item as HtReviewsObjectListItem;
  const slug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const brandSlug = typeof payload.brand_slug === 'string' ? payload.brand_slug.trim() : '';
  const brandName = typeof payload.brand === 'string' ? payload.brand.trim() : '';

  if (!slug || !name || !brandSlug || !brandName) {
    return null;
  }

  const url = resolveAbsoluteUrl(baseUrl, `/tobaccos/${slug}`);
  const brandUrl = resolveAbsoluteUrl(baseUrl, `/tobaccos/${brandSlug}`);
  if (!url || !brandUrl) {
    return null;
  }

  const lineSlug = typeof payload.line_slug === 'string' ? payload.line_slug.trim() : '';
  const lineUrl = lineSlug ? resolveAbsoluteUrl(baseUrl, `/tobaccos/${lineSlug}`) : null;
  const lineName = typeof payload.line === 'string' ? payload.line.trim() : null;
  const alias = typeof payload.alt_name === 'string' ? payload.alt_name.trim() : null;
  const sourceNumericId =
    payload.id === null || payload.id === undefined
      ? null
      : String(payload.id).trim() || null;

  return {
    sourceNumericId,
    name,
    alias: alias && alias !== name ? alias : null,
    url,
    imageUrl: resolveAbsoluteUrl(baseUrl, payload.media ?? null),
    brand: parseBrandRef(brandUrl, brandName),
    line: parseLineRef(lineUrl, lineName),
    rating: parseNumber(payload.rating === null || payload.rating === undefined ? null : String(payload.rating)),
    ratingsCount: parseNumber(
      payload.ratings_count === null || payload.ratings_count === undefined ? null : String(payload.ratings_count),
    ),
    reviewsCount: parseNumber(
      payload.reviews === null || payload.reviews === undefined ? null : String(payload.reviews),
    ),
    viewsCount: parseNumber(
      payload.views === null || payload.views === undefined ? null : String(payload.views),
    ),
  };
};

export const parseObjectListMeta = (html: string, pageUrl: string): HtReviewsObjectListMeta | null => {
  const objectId = html.match(/<div class="object_wrapper" data-id="(\d+)"/i)?.[1] ?? null;
  const listMatch = html.match(/<div class="tobacco_list_items"[^>]*data-offset="(\d+)"[^>]*data-count="(\d+)"/i);
  if (!objectId || !listMatch) {
    return null;
  }

  let action: 'objectByBrand' | 'objectByLine' = 'objectByBrand';
  try {
    const segments = new URL(pageUrl).pathname.split('/').filter(Boolean);
    if (segments[0] === 'tobaccos' && segments.length > 2) {
      action = 'objectByLine';
    }
  } catch {
    action = 'objectByBrand';
  }

  return {
    objectId,
    action,
    offset: Number.parseInt(listMatch[1] ?? '0', 10) || 0,
    count: Number.parseInt(listMatch[2] ?? '0', 10) || 0,
  };
};

export const parseObjectListResponse = (items: unknown[], baseUrl: string): HtReviewsTobaccoSummary[] =>
  items
    .map((item) => parseObjectListItem(item, baseUrl))
    .filter((item): item is HtReviewsTobaccoSummary => item !== null);

export const parseTobaccoPage = (html: string, baseUrl: string, fallbackUrl: string): HtReviewsTobaccoDetail => {
  const product = extractJsonLdProduct(html);
  const pageUrl = resolveAbsoluteUrl(baseUrl, String(product?.url ?? fallbackUrl)) ?? fallbackUrl;
  const brandUrl = resolveAbsoluteUrl(
    baseUrl,
    html.match(/<a href="(https?:\/\/htreviews\.org\/tobaccos\/[^"\/?#]+)">\s*[\s\S]*?<\/a>/i)?.[1] ?? null,
  );
  const brandName = extractText(
    html,
    /<span>Бренд<\/span>[\s\S]*?<a href="https?:\/\/htreviews\.org\/tobaccos\/[^"]+">([\s\S]*?)<\/a>/i,
  );
  const lineUrl = resolveAbsoluteUrl(
    baseUrl,
    html.match(/<span>Линейка<\/span>[\s\S]*?<a href="(https?:\/\/htreviews\.org\/tobaccos\/[^"]+)"/i)?.[1] ?? null,
  );
  const lineName = extractText(
    html,
    /<span>Линейка<\/span>[\s\S]*?<a href="https?:\/\/htreviews\.org\/tobaccos\/[^"]+">([\s\S]*?)<\/a>/i,
  );

  const alias = extractText(html, /<div class="object_card_title">\s*<h1>[\s\S]*?<\/h1>\s*<span>([\s\S]*?)<\/span>/i);
  const description = extractText(html, /<div class="object_card_discr">\s*<span>([\s\S]*?)<\/span>/i);
  const communityStrength = extractInfoValue(html, 'Крепость по оценкам') ?? deriveStrengthFromDescription(description);

  return {
    name: stripTags(String(product?.name ?? extractText(html, /<h1>([\s\S]*?)<\/h1>/i) ?? '')),
    alias: alias && alias !== '-' ? alias : null,
    url: pageUrl,
    brand: parseBrandRef(brandUrl ?? pageUrl, brandName ?? 'Не указано'),
    line: parseLineRef(lineUrl, lineName),
    country: extractInfoValue(html, 'Страна'),
    officialStrength: extractInfoValue(html, 'Крепость официальная'),
    communityStrength,
    status: extractInfoValue(html, 'Статус'),
    htreviewsId: extractInfoValue(html, 'HtreviewsID'),
    addedAt: extractInfoValue(html, 'Добавлен на сайт'),
    description,
    imageUrl: resolveAbsoluteUrl(baseUrl, String(product?.image ?? html.match(/data-zoom src="([^"]+)"/i)?.[1] ?? '')) ?? null,
    sourceNumericId: html.match(/id=(\d+)&object=tobacco/i)?.[1] ?? null,
    rawTags: extractTagList(html),
    rating: parseNumber(String(product?.aggregateRating && typeof product.aggregateRating === 'object'
      ? (product.aggregateRating as Record<string, unknown>).ratingValue ?? ''
      : '')),
    reviewCount: parseNumber(String(product?.aggregateRating && typeof product.aggregateRating === 'object'
      ? (product.aggregateRating as Record<string, unknown>).reviewCount ?? ''
      : '')),
  };
};
