import type { BotConfig } from './config';
import type {
  AutomationDailyCodeCurrentResponse,
  AutomationDailyCodeEnsureResponse,
  AutomationDailyCodeRotateResponse,
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

  async getCurrentDailyCode() {
    return this.getJson<AutomationDailyCodeCurrentResponse>('/automation/daily-code/current');
  }

  async ensureDailyCode() {
    return this.postJson<AutomationDailyCodeEnsureResponse>('/automation/daily-code/ensure');
  }

  async rotateDailyCode() {
    return this.postJson<AutomationDailyCodeRotateResponse>('/automation/daily-code/rotate');
  }
}
