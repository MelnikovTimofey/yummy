import type { TelegramUpdate } from './types';

export type TelegramSendMessageOptions = {
  disable_web_page_preview?: boolean;
};

export class TelegramClient {
  constructor(
    private readonly token: string,
    private readonly apiBaseUrl = 'https://api.telegram.org',
  ) {}

  private async readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'description' in payload
        ? String((payload as { description?: unknown }).description)
        : `Telegram request failed with ${response.status}`;
      throw new Error(message);
    }

    const envelope = payload as { ok?: boolean; result?: T };
    if (!envelope?.ok) {
      throw new Error('Telegram API returned a failed response');
    }

    return envelope.result as T;
  }

  async getUpdates(offset: number, timeoutSeconds: number) {
    const url = new URL(`${this.apiBaseUrl}/bot${this.token}/getUpdates`);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('timeout', String(timeoutSeconds));
    url.searchParams.set('allowed_updates', JSON.stringify(['message']));

    const response = await fetch(url);
    return this.readJson<TelegramUpdate[]>(response);
  }

  async sendMessage(chatId: number, text: string, options: TelegramSendMessageOptions = {}) {
    const response = await fetch(`${this.apiBaseUrl}/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: options.disable_web_page_preview ?? true,
      }),
    });

    return this.readJson<unknown>(response);
  }

  async sendMessages(chatIds: number[], text: string) {
    const uniqueChatIds = Array.from(new Set(chatIds));
    for (const chatId of uniqueChatIds) {
      await this.sendMessage(chatId, text);
    }
  }
}
