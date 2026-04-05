import { setTimeout as delay } from 'node:timers/promises';
import type { HtReviewsImportOptions } from './types';

export const HTREVIEWS_BASE_URL = 'https://htreviews.org';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_DELAY_MS = 250;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; NomadCatalogPreview/0.1; +https://htreviews.org)';

export class HtReviewsClient {
  readonly baseUrl: string;

  readonly userAgent: string;

  readonly requestTimeoutMs: number;

  readonly delayMs: number;

  constructor(options: HtReviewsImportOptions = {}) {
    this.baseUrl = options.baseUrl ?? HTREVIEWS_BASE_URL;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  }

  private async fetchResponse(url: string, accept: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': this.userAgent,
          accept,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTReviews responded ${response.status} for ${url}`);
      }

      return response;
    } finally {
      clearTimeout(timeout);
      if (this.delayMs > 0) {
        await delay(this.delayMs);
      }
    }
  }

  async fetchText(url: string) {
    const response = await this.fetchResponse(url, 'text/html,application/xhtml+xml');
    return response.text();
  }

  async fetchJson<T>(url: string) {
    const response = await this.fetchResponse(url, 'application/json,text/plain,*/*');
    return response.json() as Promise<T>;
  }
}
