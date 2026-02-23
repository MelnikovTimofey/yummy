import { CatalogSourcePayload, TobaccoSeed } from '../types';

type HookahPortalOptions = {
  sitemapUrl: string;
  maxItems: number;
  delayMs: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…');

const stripTags = (value: string) =>
  decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

const firstMatch = (value: string, pattern: RegExp) => {
  const match = value.match(pattern);
  return match?.[1] ?? null;
};

const normalizeStrength = (input: string | null) => {
  if (!input) {
    return 5;
  }

  const normalized = input.toLowerCase();
  const numeric = normalized.match(/\d+/);
  if (numeric) {
    const parsed = Number(numeric[0]);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(10, parsed));
    }
  }

  if (normalized.includes('очень креп')) {
    return 9;
  }
  if (normalized.includes('крепк')) {
    return 7;
  }
  if (normalized.includes('средн')) {
    return 5;
  }
  if (normalized.includes('легк')) {
    return 3;
  }

  return 5;
};

const parseXmlUrls = (xml: string) => {
  const urls: string[] = [];
  const locRegex = /<loc>\s*([^<]+?)\s*<\/loc>/gi;

  let match = locRegex.exec(xml);
  while (match) {
    urls.push(match[1]);
    match = locRegex.exec(xml);
  }

  return urls.filter((url) => url.includes('/tobacco/'));
};

const parsePropertyMap = (html: string) => {
  const result = new Map<string, string[]>();
  const specific = firstMatch(
    html,
    /<div class="product-mix-specific">([\s\S]*?)<\/div>\s*<div class="row"><div class="col">Поделиться/i,
  );

  if (!specific) {
    return result;
  }

  const rowRegex = /<span>\s*([^<:]+?)\s*:\s*<\/span>\s*<ul>([\s\S]*?)<\/ul>/gi;
  let rowMatch = rowRegex.exec(specific);
  while (rowMatch) {
    const key = stripTags(rowMatch[1]);
    const values: string[] = [];
    const valueRegex = /<li>\s*(?:<a[^>]*>)?\s*([\s\S]*?)\s*(?:<\/a>)?\s*<\/li>/gi;
    let valueMatch = valueRegex.exec(rowMatch[2]);
    while (valueMatch) {
      const value = stripTags(valueMatch[1]);
      if (value) {
        values.push(value);
      }
      valueMatch = valueRegex.exec(rowMatch[2]);
    }

    if (key && values.length) {
      result.set(key, values);
    }

    rowMatch = rowRegex.exec(specific);
  }

  return result;
};

const parseTobaccoPage = (html: string, url: string): TobaccoSeed | null => {
  const productInfo = firstMatch(html, /<div class="product-info">([\s\S]*?)<\/div>\s*<div class="create-mix-button">/i);
  if (!productInfo) {
    return null;
  }

  const manufacturer = firstMatch(
    productInfo,
    /<ul class="product-info__list">[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i,
  );
  const name = firstMatch(productInfo, /<h1>\s*([^<]+?)\s*<\/h1>/i);
  const description = firstMatch(productInfo, /<p>\s*([\s\S]*?)\s*<\/p>/i);

  if (!manufacturer || !name) {
    return null;
  }

  const properties = parsePropertyMap(html);
  const strength = normalizeStrength(properties.get('Крепость')?.[0] ?? null);
  const line = properties.get('Линейка')?.[0] ?? null;
  const flavor = properties.get('Вкус') ?? [];
  const tasteType = properties.get('Тип') ?? [];
  const flavorTags = Array.from(new Set([...flavor, ...tasteType]));

  return {
    manufacturer: stripTags(manufacturer),
    website: 'https://hookahportal.ru/',
    name: stripTags(name),
    strength,
    line,
    description: description ? stripTags(description) : null,
    flavorTags,
    sources: [url],
  };
};

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'yummy-catalog-updater/0.1 (test-source-hookahportal)',
      Accept: 'text/html,application/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
};

export const loadHookahPortalTobaccos = async (
  options: HookahPortalOptions,
): Promise<CatalogSourcePayload> => {
  const sitemap = await fetchText(options.sitemapUrl);
  const urls = parseXmlUrls(sitemap).slice(0, options.maxItems);

  const tobaccos: TobaccoSeed[] = [];

  for (const url of urls) {
    try {
      const html = await fetchText(url);
      const parsed = parseTobaccoPage(html, url);
      if (parsed) {
        tobaccos.push(parsed);
      }
    } catch {
      // Для тестового источника пропускаем битые страницы.
    }

    if (options.delayMs > 0) {
      await delay(options.delayMs);
    }
  }

  return {
    source: 'hookahportal-tobaccos-test',
    tobaccos,
    mixes: [],
    fetchedAt: new Date().toISOString(),
  };
};
