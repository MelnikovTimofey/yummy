import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

const BASE_URL = 'https://musthave.ru/showmixes/view/';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchText = (url: string) =>
  new Promise<string>((resolve, reject) => {
    https
      .get(url, (res) => {
        console.log(url, res.statusCode)
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        res.setEncoding('utf8');
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });

const stripHtml = (html: string) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  return withoutScripts.replace(/<[^>]+>/g, '\n');
};

const extractMix = (html: string, id: number) => {
  const text = stripHtml(html)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»');
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

  const components: { manufacturer: string; tobacco: string; proportion: number }[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (/^\d{1,3}%$/.test(lines[i])) {
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

const main = async () => {
  const minId = Number(process.env.MIX_ID_FROM ?? 1);
  const maxId = Number(process.env.MIX_ID_TO ?? 2000);
  const delayMs = Number(process.env.DELAY_MS ?? 300);

  const mixes: {
    name: string;
    authorEmail: string;
    description: string;
    isUserMix: boolean;
    components: { manufacturer: string; tobacco: string; proportion: number }[];
    sources: string[];
  }[] = [];

  for (let id = minId; id <= maxId; id += 1) {
    const url = `${BASE_URL}${id}/`;
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
    } catch (error) {
      // Ignore missing pages.
    }

    if (delayMs > 0) {
      await delay(delayMs);
    }
  }

  const output = mixes.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const outputPath = path.join(__dirname, '..', 'seed', 'mixes.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');

  console.log(`Saved ${output.length} mixes to ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
