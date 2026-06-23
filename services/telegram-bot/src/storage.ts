import fs from 'node:fs/promises';
import path from 'node:path';
import type { BotState } from './types';

const defaultState = (): BotState => ({
  lastBroadcastCodeId: null,
  lastBroadcastCodeValue: null,
  lastBroadcastDayKey: null,
  lastBroadcastAt: null,
  lastRotationAt: null,
});

export class JsonStateStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<BotState> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<BotState>;

      return {
        ...defaultState(),
        ...parsed,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return defaultState();
      }

      throw error;
    }
  }

  async write(state: BotState) {
    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });

    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }

  async update(mutator: (state: BotState) => BotState | Promise<BotState>) {
    const nextState = await mutator(await this.read());
    await this.write(nextState);
    return nextState;
  }
}

export const createEmptyState = defaultState;
