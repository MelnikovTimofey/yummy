import fs from 'node:fs/promises';
import path from 'node:path';
import { CatalogSourcePayload, MixSeed, TobaccoSeed } from '../types';

const readJson = async <T>(filePath: string): Promise<T> => {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data) as T;
};

export const loadLocalSeedCatalog = async (seedDir: string): Promise<CatalogSourcePayload> => {
  const tobaccosPath = path.join(seedDir, 'tobaccos.json');
  const mixesPath = path.join(seedDir, 'mixes.json');

  const [tobaccos, mixes] = await Promise.all([
    readJson<TobaccoSeed[]>(tobaccosPath),
    readJson<MixSeed[]>(mixesPath),
  ]);

  return {
    source: 'local-seed',
    tobaccos,
    mixes,
    fetchedAt: new Date().toISOString(),
  };
};
