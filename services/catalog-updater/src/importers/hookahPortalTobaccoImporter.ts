import fs from 'node:fs/promises';
import path from 'node:path';
import { CatalogSourcePayload, MixSeed, TobaccoSeed } from '../types';

type HookahPortalOptions = {
  tobaccosSitemapUrl: string;
  mixesSitemapUrl: string;
  maxTobaccos: number;
  maxMixes: number;
  delayMs: number;
  concurrency: number;
  timeoutMs: number;
  cacheDir: string;
  cacheRead: boolean;
  cacheWrite: boolean;
};

type ParsedTobacco = {
  seed: TobaccoSeed;
  url: string;
};

type CacheEnvelope<T> = {
  fetchedAt: string;
  count: number;
  items: T[];
};

const HOOKAHPORTAL_AUTHOR = 'hookahportal';
const PROGRESS_STEP = 100;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

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
  normalizeWhitespace(
    decodeHtml(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' '),
    ),
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

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '');

const safeConcurrency = (value: number) => {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
};

const cacheFiles = (cacheDir: string) => ({
  tobaccos: path.join(cacheDir, 'tobaccos.json'),
  mixes: path.join(cacheDir, 'mixes.json'),
});

const readCache = async <T>(filePath: string): Promise<T[] | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed.items;
  } catch {
    return null;
  }
};

const writeCache = async <T>(filePath: string, items: T[]) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload: CacheEnvelope<T> = {
    fetchedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
};

const buildTobaccoLookups = (tobaccos: TobaccoSeed[]) => {
  const tobaccoByUrl = new Map<string, TobaccoSeed>();
  const tobaccoByDisplayName = new Map<string, TobaccoSeed>();

  for (const tobacco of tobaccos) {
    for (const source of tobacco.sources ?? []) {
      if (source.includes('/tobacco/')) {
        tobaccoByUrl.set(normalizeUrl(source), tobacco);
      }
    }

    tobaccoByDisplayName.set(`${tobacco.manufacturer} ${tobacco.name}`.toLowerCase(), tobacco);
  }

  return {
    tobaccoByUrl,
    tobaccoByDisplayName,
  };
};

const parseXmlUrls = (xml: string, segment: '/tobacco/' | '/mix/') => {
  const urls: string[] = [];
  const locRegex = /<loc>\s*([^<]+?)\s*<\/loc>/gi;

  let match = locRegex.exec(xml);
  while (match) {
    urls.push(match[1]);
    match = locRegex.exec(xml);
  }

  return urls.filter((url) => url.includes(segment)).map(normalizeUrl);
};

const dedupeUrls = (urls: string[]) => Array.from(new Set(urls.map(normalizeUrl)));

const parseCatalogTobaccoUrls = (html: string) => {
  const urls = new Set<string>();
  const linkRegex = /href="(https:\/\/hookahportal\.ru\/tobacco\/[^"#?\s<]+)"/gi;

  let match = linkRegex.exec(html);
  while (match) {
    urls.add(normalizeUrl(match[1]));
    match = linkRegex.exec(html);
  }

  return Array.from(urls);
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

const parseTobaccoPage = (html: string, url: string): ParsedTobacco | null => {
  const productInfo = firstMatch(
    html,
    /<div class="product-info">([\s\S]*?)<\/div>\s*<div class="create-mix-button">/i,
  );
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
    seed: {
      manufacturer: stripTags(manufacturer),
      website: 'https://hookahportal.ru/',
      name: stripTags(name),
      strength,
      line,
      description: description ? stripTags(description) : null,
      flavorTags,
      sources: [url],
    },
    url: normalizeUrl(url),
  };
};

const parseMixPage = (
  html: string,
  url: string,
  tobaccoByUrl: Map<string, TobaccoSeed>,
  tobaccoByDisplayName: Map<string, TobaccoSeed>,
): MixSeed | null => {
  const name = firstMatch(
    html,
    /<div class="product-info product-info-desc">[\s\S]*?<h1>\s*([\s\S]*?)\s*<\/h1>/i,
  );
  if (!name) {
    return null;
  }

  const descriptionMatch = firstMatch(
    html,
    /<div class="product-info product-info-desc">[\s\S]*?<p>\s*([\s\S]*?)\s*<\/p>/i,
  );
  const description = descriptionMatch ? stripTags(descriptionMatch) : null;

  const listHtml = firstMatch(html, /<div id="list"[^>]*>([\s\S]*?)<\/div>\s*<div id="listTypes"/i);
  if (!listHtml) {
    return null;
  }

  const itemRegex =
    /<div class="product-mix-specific__title pb-3">[\s\S]*?<span>\s*(\d{1,3})%\s*<\/span>[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<h3>\s*([\s\S]*?)\s*<\/h3>/gi;

  const components: MixSeed['components'] = [];
  let itemMatch = itemRegex.exec(listHtml);
  while (itemMatch) {
    const proportion = Number(itemMatch[1]);
    const componentUrl = normalizeUrl(itemMatch[2]);
    const rawName = stripTags(itemMatch[3]);

    const tobaccoFromUrl = tobaccoByUrl.get(componentUrl);
    const tobaccoFromName = tobaccoByDisplayName.get(rawName.toLowerCase());
    const tobacco = tobaccoFromUrl ?? tobaccoFromName ?? null;
    if (!tobacco || !Number.isFinite(proportion) || proportion <= 0) {
      itemMatch = itemRegex.exec(listHtml);
      continue;
    }

    components.push({
      manufacturer: tobacco.manufacturer,
      tobacco: tobacco.name,
      proportion,
    });

    itemMatch = itemRegex.exec(listHtml);
  }

  if (!components.length) {
    return null;
  }

  return {
    name: stripTags(name),
    authorEmail: HOOKAHPORTAL_AUTHOR,
    description: description && description.length > 0 ? description : null,
    isUserMix: false,
    components,
    sources: [url],
  };
};

const fetchText = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'yummy-catalog-updater/0.1 (test-source-hookahportal)',
        Accept: 'text/html,application/xml',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const collectInParallel = async <T>(
  total: number,
  worker: (index: number) => Promise<T | null>,
  concurrency: number,
): Promise<T[]> => {
  const result: T[] = [];
  const limit = Math.min(Math.max(safeConcurrency(concurrency), 1), Math.max(total, 1));
  let cursor = 0;
  let done = 0;

  const runners = Array.from({ length: limit }).map(async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= total) {
        return;
      }

      const item = await worker(index);
      done += 1;

      if (item) {
        result.push(item);
      }

      if (done % PROGRESS_STEP === 0 || done === total) {
        console.log(`[hookahportal] progress ${done}/${total}`);
      }
    }
  });

  await Promise.all(runners);
  return result;
};

const loadHookahPortalTobaccos = async (
  options: HookahPortalOptions,
): Promise<{ tobaccos: TobaccoSeed[]; tobaccoByUrl: Map<string, TobaccoSeed>; tobaccoByDisplayName: Map<string, TobaccoSeed> }> => {
  const cachePath = cacheFiles(options.cacheDir).tobaccos;
  if (options.cacheRead) {
    const cached = await readCache<TobaccoSeed>(cachePath);
    if (cached !== null) {
      console.log(`[hookahportal] tobaccos loaded from cache: ${cached.length}`);
      const lookups = buildTobaccoLookups(cached);
      return {
        tobaccos: cached,
        tobaccoByUrl: lookups.tobaccoByUrl,
        tobaccoByDisplayName: lookups.tobaccoByDisplayName,
      };
    }
  }

  const sitemap = await fetchText(options.tobaccosSitemapUrl, options.timeoutMs);
  const sitemapUrls = parseXmlUrls(sitemap, '/tobacco/');

  let catalogUrls: string[] = [];
  try {
    const catalogHtml = await fetchText('https://hookahportal.ru/tobacco/', options.timeoutMs);
    catalogUrls = parseCatalogTobaccoUrls(catalogHtml);
  } catch {
    catalogUrls = [];
  }

  const urls = dedupeUrls([...catalogUrls, ...sitemapUrls]).slice(0, options.maxTobaccos);
  console.log(
    `[hookahportal] tobaccos urls from sitemap=${sitemapUrls.length}, fallback=${catalogUrls.length}, final=${urls.length}`,
  );

  const parsedTobaccos = await collectInParallel<ParsedTobacco>(
    urls.length,
    async (index) => {
      const url = urls[index];
      try {
        const html = await fetchText(url, options.timeoutMs);
        return parseTobaccoPage(html, url);
      } catch {
        return null;
      } finally {
        if (options.delayMs > 0) {
          await delay(options.delayMs);
        }
      }
    },
    options.concurrency,
  );

  const parsedByUrl = new Set(parsedTobaccos.map((item) => item.url));
  const missingCatalogUrls = catalogUrls.filter((url) => !parsedByUrl.has(normalizeUrl(url)));
  if (missingCatalogUrls.length) {
    let recovered = 0;
    for (const url of missingCatalogUrls) {
      try {
        const html = await fetchText(url, options.timeoutMs);
        const parsed = parseTobaccoPage(html, url);
        if (parsed && !parsedByUrl.has(parsed.url)) {
          parsedTobaccos.push(parsed);
          parsedByUrl.add(parsed.url);
          recovered += 1;
        }
      } catch {
        // ignore and keep partial dataset
      }
    }

    if (recovered > 0) {
      console.log(
        `[hookahportal] recovered ${recovered}/${missingCatalogUrls.length} fallback tobaccos`,
      );
    }
  }

  const tobaccos: TobaccoSeed[] = [];
  for (const parsed of parsedTobaccos) {
    tobaccos.push(parsed.seed);
  }

  if (options.cacheWrite) {
    await writeCache(cachePath, tobaccos);
    console.log(`[hookahportal] tobaccos cache saved: ${cachePath}`);
  }

  const lookups = buildTobaccoLookups(tobaccos);

  return {
    tobaccos,
    tobaccoByUrl: lookups.tobaccoByUrl,
    tobaccoByDisplayName: lookups.tobaccoByDisplayName,
  };
};

const loadHookahPortalMixes = async (
  options: HookahPortalOptions,
  tobaccoByUrl: Map<string, TobaccoSeed>,
  tobaccoByDisplayName: Map<string, TobaccoSeed>,
) => {
  const cachePath = cacheFiles(options.cacheDir).mixes;
  if (options.cacheRead) {
    const cached = await readCache<MixSeed>(cachePath);
    if (cached !== null) {
      console.log(`[hookahportal] mixes loaded from cache: ${cached.length}`);
      return cached;
    }
  }

  const sitemap = await fetchText(options.mixesSitemapUrl, options.timeoutMs);
  const urls = parseXmlUrls(sitemap, '/mix/').slice(0, options.maxMixes);

  const mixes = await collectInParallel<MixSeed>(
    urls.length,
    async (index) => {
      const url = urls[index];
      try {
        const html = await fetchText(url, options.timeoutMs);
        return parseMixPage(html, url, tobaccoByUrl, tobaccoByDisplayName);
      } catch {
        return null;
      } finally {
        if (options.delayMs > 0) {
          await delay(options.delayMs);
        }
      }
    },
    options.concurrency,
  );

  if (options.cacheWrite) {
    await writeCache(cachePath, mixes);
    console.log(`[hookahportal] mixes cache saved: ${cachePath}`);
  }

  return mixes;
};

export const loadHookahPortalCatalog = async (
  options: HookahPortalOptions,
): Promise<CatalogSourcePayload> => {
  const { tobaccos, tobaccoByUrl, tobaccoByDisplayName } = await loadHookahPortalTobaccos(options);
  const mixes = await loadHookahPortalMixes(options, tobaccoByUrl, tobaccoByDisplayName);

  return {
    source: 'hookahportal-catalog-test',
    tobaccos,
    mixes,
    fetchedAt: new Date().toISOString(),
  };
};
