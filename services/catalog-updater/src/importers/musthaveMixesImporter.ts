import { CatalogSourcePayload, MixSeed } from '../types';

type MustHaveOptions = {
  baseUrl: string;
  fromId: number;
  toId: number;
  delayMs: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const stripHtml = (html: string) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  return withoutScripts.replace(/<[^>]+>/g, '\n');
};

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»');

const extractMix = (html: string, id: number) => {
  const text = decodeHtml(stripHtml(html));
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const idLineIndex = lines.findIndex((line) => line.includes(`#ID ${id}`));
  if (idLineIndex < 0) {
    return null;
  }

  const name = lines[idLineIndex - 1] ?? lines[idLineIndex + 1];
  if (!name) {
    return null;
  }

  const yearIndex = lines.findIndex((line) => /^(19|20)\d{2}$/.test(line));
  const description =
    yearIndex >= 0 && lines[yearIndex + 2]
      ? lines[yearIndex + 2]
      : lines.find((line) => line.length > 10 && !line.includes('#ID')) ?? '';

  const components: Array<{ manufacturer: string; tobacco: string; proportion: number }> = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (!/^\d{1,3}%$/.test(lines[i])) {
      continue;
    }

    const proportion = Number(lines[i].replace('%', ''));
    const tobacco = lines[i - 1];
    if (!tobacco || /^\d+$/.test(tobacco)) {
      continue;
    }

    if (tobacco.toLowerCase().includes('musthave')) {
      continue;
    }

    components.push({ manufacturer: 'MUSTHAVE', tobacco, proportion });
  }

  const unique = new Map<string, { manufacturer: string; tobacco: string; proportion: number }>();
  for (const component of components) {
    unique.set(component.tobacco, component);
  }

  return {
    name,
    description,
    components: Array.from(unique.values()),
  };
};

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'yummy-catalog-updater/0.1',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
};

export const loadMustHaveMixes = async (options: MustHaveOptions): Promise<CatalogSourcePayload> => {
  const mixes: MixSeed[] = [];

  for (let id = options.fromId; id <= options.toId; id += 1) {
    const url = `${options.baseUrl}${id}/`;

    try {
      const html = await fetchText(url);
      const parsed = extractMix(html, id);
      if (parsed && parsed.components.length > 0) {
        mixes.push({
          name: parsed.name,
          authorEmail: 'musthave@musthave.ru',
          description: parsed.description,
          isUserMix: false,
          components: parsed.components,
          sources: [url],
        });
      }
    } catch {
      // Пропускаем невалидные/удаленные карточки.
    }

    if (options.delayMs > 0) {
      await delay(options.delayMs);
    }
  }

  return {
    source: 'musthave-mixes',
    tobaccos: [],
    mixes,
    fetchedAt: new Date().toISOString(),
  };
};
