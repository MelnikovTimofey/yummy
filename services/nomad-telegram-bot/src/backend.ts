import type { BotConfig } from './config';
import type { DailyAccessCodeRecord, MoscowWindow } from './types';
import {
  buildDailyCodeLabel,
  buildDailyCodeValue,
  buildMoscowWindow,
  isWithinWindow,
  nextDailyCodeSequence,
} from './time';

type StaffAuthResponse = {
  accessToken: string;
  tokenType?: 'Bearer';
  user: {
    login: string;
    name: string;
    role: 'admin' | 'nomad';
  };
};

type DailyAccessCodeListResponse = {
  items: DailyAccessCodeRecord[];
};

type DailyAccessCodeMutationResponse = {
  item: DailyAccessCodeRecord;
};

export type DailyCodeAutomationResponse = {
  item: DailyAccessCodeRecord | null;
  window: MoscowWindow;
};

export type DailyCodeEnsureResponse = {
  item: DailyAccessCodeRecord;
  state: 'existing' | 'created';
  window: MoscowWindow;
};

export type DailyCodeRotateResponse = {
  item: DailyAccessCodeRecord;
  state: 'rotated';
  window: MoscowWindow;
};

const AUTH_PREFIX = 'Bearer ';

export class NomadBackendClient {
  private accessToken: string | null = null;

  constructor(private readonly config: BotConfig) {}

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

  private headers(token: string, body?: BodyInit | null) {
    const headers: Record<string, string> = {
      authorization: `${AUTH_PREFIX}${token}`,
    };

    if (body) {
      headers['content-type'] = 'application/json';
    }

    return headers;
  }

  private async request<T>(path: string, options: RequestInit = {}, tokenOverride?: string): Promise<T> {
    const token = tokenOverride ?? (await this.resolveToken());
    const response = await fetch(`${this.config.backendUrl}${path}`, {
      ...options,
      headers: this.headers(token, options.body),
    });

    try {
      return await this.readResponse<T>(response);
    } catch (error) {
      if (
        !tokenOverride &&
        !this.config.backendAutomationToken &&
        response.status === 401 &&
        error instanceof Error
      ) {
        this.accessToken = null;
        const retryToken = await this.resolveToken();
        const retryResponse = await fetch(`${this.config.backendUrl}${path}`, {
          ...options,
          headers: this.headers(retryToken, options.body),
        });
        return this.readResponse<T>(retryResponse);
      }

      throw error;
    }
  }

  private async requestWithoutAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.backendUrl}${path}`, {
      ...options,
      headers: options.body ? { 'content-type': 'application/json' } : options.headers,
    });

    return this.readResponse<T>(response);
  }

  private async login() {
    const auth = await this.requestWithoutAuth<StaffAuthResponse>('/staff/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        login: this.config.backendAdminLogin,
        password: this.config.backendAdminPassword,
      }),
    });

    this.accessToken = auth.accessToken;
    return auth.accessToken;
  }

  private async resolveToken() {
    if (this.config.backendAutomationToken) {
      return this.config.backendAutomationToken;
    }

    if (this.accessToken) {
      return this.accessToken;
    }

    return this.login();
  }

  async getCurrentDailyCode(): Promise<DailyCodeAutomationResponse> {
    const window = buildMoscowWindow();
    const codes = await this.getDailyCodes();
    const current = codes.find((code) => code.active && isWithinWindow(code.startsAt, window)) ?? null;
    return { item: current, window };
  }

  async getDailyCodes() {
    const response = await this.request<DailyAccessCodeListResponse>('/staff/access/daily-codes');
    return response.items ?? [];
  }

  async ensureDailyCode(): Promise<DailyCodeEnsureResponse> {
    const window = buildMoscowWindow();
    const codes = await this.getDailyCodes();
    const activeCurrent = codes.filter((code) => code.active && isWithinWindow(code.startsAt, window));

    if (activeCurrent.length) {
      const current = [...activeCurrent].sort((left, right) => {
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      })[0];

      for (const duplicate of activeCurrent.filter((code) => code.id !== current.id)) {
        await this.updateDailyCode(duplicate.id, {
          active: false,
          codeValue: duplicate.codeValue,
          codeLabel: duplicate.codeLabel,
          startsAt: duplicate.startsAt,
          endsAt: duplicate.endsAt,
        });
      }

      return { item: current, state: 'existing', window };
    }

    const sequence = nextDailyCodeSequence(codes, this.config.codePrefix, window.dayKey);
    const created = await this.createDailyCode({
      codeValue: buildDailyCodeValue(this.config.codePrefix, window.dayKey, sequence),
      codeLabel: buildDailyCodeLabel(window.dayKey, sequence),
      active: true,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
    });

    return {
      item: created,
      state: 'created',
      window,
    };
  }

  async rotateDailyCode(): Promise<DailyCodeRotateResponse> {
    const window = buildMoscowWindow();
    const codes = await this.getDailyCodes();
    const activeCurrent = codes.filter((code) => code.active && isWithinWindow(code.startsAt, window));

    for (const code of activeCurrent) {
      await this.updateDailyCode(code.id, {
        active: false,
        codeValue: code.codeValue,
        codeLabel: code.codeLabel,
        startsAt: code.startsAt,
        endsAt: code.endsAt,
      });
    }

    const sequence = nextDailyCodeSequence(codes, this.config.codePrefix, window.dayKey);
    const created = await this.createDailyCode({
      codeValue: buildDailyCodeValue(this.config.codePrefix, window.dayKey, sequence),
      codeLabel: buildDailyCodeLabel(window.dayKey, sequence),
      active: true,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
    });

    return {
      item: created,
      state: 'rotated',
      window,
    };
  }

  private async createDailyCode(input: {
    codeValue: string;
    codeLabel: string;
    active: boolean;
    startsAt: string;
    endsAt: string;
  }) {
    const response = await this.request<DailyAccessCodeMutationResponse>('/staff/access/daily-codes', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return response.item;
  }

  private async updateDailyCode(id: string, input: {
    codeValue?: string;
    codeLabel?: string;
    active?: boolean;
    startsAt?: string;
    endsAt?: string;
  }) {
    const response = await this.request<DailyAccessCodeMutationResponse>(`/staff/access/daily-codes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });

    return response.item;
  }
}
