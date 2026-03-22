import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import { extractMix } from '../../services/catalog-updater/src/importers/musthaveMixParser';

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
