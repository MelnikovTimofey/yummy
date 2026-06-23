import type { BotConfig } from './config';
import type {
  AutomationDailyCodeCurrentResponse,
  AutomationDailyCodeEnsureResponse,
  AutomationDailyCodeRotateResponse,
  AutomationTelegramOperatorLinkResponse,
  AutomationTelegramOperatorResponse,
  AutomationTelegramStateResponse,
  TelegramAutomationReportPayload,
} from './types';

const AUTOMATION_HEADER = 'x-nomad-automation-key';

export class NomadBackendClient {
  constructor(private readonly config: BotConfig) {}

  private headers() {
    if (!this.config.backendAutomationToken) {
      throw new Error('NOMAD_BACKEND_AUTOMATION_TOKEN is required');
    }

    return {
      [AUTOMATION_HEADER]: this.config.backendAutomationToken,
    };
  }

  private async readResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error)
        : `Backend request failed with ${response.status}`;
      throw new Error(message);
    }

    return payload as T;
  }

  private async getJson<T>(path: string) {
    const response = await fetch(`${this.config.backendUrl}${path}`, {
      headers: this.headers(),
    });

    return this.readResponse<T>(response);
  }

  private async postJson<T>(path: string) {
    const response = await fetch(`${this.config.backendUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
    });

    return this.readResponse<T>(response);
  }

  private async postBodyJson<T>(path: string, payload: unknown) {
    const response = await fetch(`${this.config.backendUrl}${path}`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return this.readResponse<T>(response);
  }

  async getCurrentDailyCode() {
    return this.getJson<AutomationDailyCodeCurrentResponse>('/automation/daily-code/current');
  }

  async ensureDailyCode() {
    return this.postJson<AutomationDailyCodeEnsureResponse>('/automation/daily-code/ensure');
  }

  async rotateDailyCode() {
    return this.postJson<AutomationDailyCodeRotateResponse>('/automation/daily-code/rotate');
  }

  async getTelegramOperatorByChatId(chatId: number) {
    return this.getJson<AutomationTelegramOperatorResponse>(`/automation/telegram/operators/by-chat/${chatId}`);
  }

  async linkTelegramOperator(payload: {
    phone: string;
    chatId: string;
    telegramUserId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }) {
    return this.postBodyJson<AutomationTelegramOperatorLinkResponse>('/automation/telegram/operators/link', payload);
  }

  async getTelegramAutomationState() {
    return this.getJson<AutomationTelegramStateResponse>('/automation/telegram/state');
  }

  async reportTelegramAutomationState(payload: TelegramAutomationReportPayload) {
    return this.postBodyJson<AutomationTelegramStateResponse>('/automation/telegram/state/report', payload);
  }
}
