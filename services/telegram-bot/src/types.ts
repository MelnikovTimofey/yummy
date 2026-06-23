export type DailyAccessCodeRecord = {
  id: string;
  codeValue: string;
  codeLabel: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AutomationWindow = {
  startsAt: string;
  endsAt: string;
};

export type AutomationDailyCodeCurrentResponse = {
  item: DailyAccessCodeRecord | null;
  window: AutomationWindow;
};

export type AutomationDailyCodeEnsureResponse = {
  item: DailyAccessCodeRecord;
  state: 'existing' | 'created';
  window: AutomationWindow;
};

export type AutomationDailyCodeRotateResponse = {
  item: DailyAccessCodeRecord;
  state: 'rotated';
  window: AutomationWindow;
};

export type TelegramOperatorRecord = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  linkedChatId: string | null;
  linkedTelegramUserId: string | null;
  linkedUsername: string | null;
  linkedDisplayName: string | null;
  linkedAt: string | null;
  lastCodeRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationTelegramOperatorResponse = {
  item: TelegramOperatorRecord | null;
};

export type AutomationTelegramOperatorLinkResponse = {
  item: TelegramOperatorRecord;
};

export type TelegramAutomationHealth = 'unknown' | 'healthy' | 'stale' | 'error';

export type TelegramAutomationStateRecord = {
  id: string;
  health: TelegramAutomationHealth;
  lastHeartbeatAt: string | null;
  lastRotateAt: string | null;
  lastRotateCodeId: string | null;
  lastRotateCodeValue: string | null;
  lastBroadcastAt: string | null;
  lastBroadcastCodeId: string | null;
  lastBroadcastCodeValue: string | null;
  lastBroadcastDayKey: string | null;
  lastRequestAt: string | null;
  lastRequestChatId: string | null;
  lastRequestOperatorId: string | null;
  lastRequestOperatorName: string | null;
  lastRequestPhone: string | null;
  lastRequestCodeId: string | null;
  lastRequestCodeValue: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  updatedAt: string | null;
};

export type AutomationTelegramStateResponse = {
  item: TelegramAutomationStateRecord;
};

export type TelegramAutomationReportPayload = {
  event: 'heartbeat' | 'broadcast' | 'rotate' | 'request' | 'error';
  codeId?: string;
  codeValue?: string;
  dayKey?: string;
  chatId?: string;
  message?: string;
};

export type BotState = {
  lastBroadcastCodeId: string | null;
  lastBroadcastCodeValue: string | null;
  lastBroadcastDayKey: string | null;
  lastBroadcastAt: string | null;
  lastRotationAt: string | null;
};

export type MoscowWindow = {
  dayKey: string;
  startsAt: Date;
  endsAt: Date;
};

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
};

export type TelegramFrom = {
  id: number;
  is_bot: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  text?: string;
  contact?: {
    phone_number?: string;
    user_id?: number;
    first_name?: string;
    last_name?: string;
  };
  chat: TelegramChat;
  from?: TelegramFrom;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};
