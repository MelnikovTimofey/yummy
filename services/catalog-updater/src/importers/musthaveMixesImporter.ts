import { CatalogSourcePayload, MixSeed } from '../types';
import { extractMix } from './musthaveMixParser';

type MustHaveOptions = {
  baseUrl: string;
  fromId: number;
  toId: number;
  delayMs: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
