import type { StaffAccountRecord, StaffUser, TelegramOperatorRecord } from '@/contracts';

export type StaffAccountEditorState = {
  id: string;
  login: string;
  name: string;
  role: StaffUser['role'];
  password: string;
  active: boolean;
};

export type TelegramOperatorEditorState = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

export type AccessLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type AccessRoleStatus = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error';
export type AccessSaveStatus = 'idle' | 'loading' | 'ready' | 'error';

export const emptyStaffAccountEditor = (): StaffAccountEditorState => ({
  id: '',
  login: '',
  name: '',
  role: 'nomad',
  password: '',
  active: true,
});

export const emptyTelegramOperatorEditor = (): TelegramOperatorEditorState => ({
  id: '',
  name: '',
  phone: '',
  active: true,
});

export const toStaffAccountEditorState = (account: StaffAccountRecord): StaffAccountEditorState => ({
  id: account.id,
  login: account.login,
  name: account.name,
  role: account.role,
  password: '',
  active: account.active,
});

export const toTelegramOperatorEditorState = (operator: TelegramOperatorRecord): TelegramOperatorEditorState => ({
  id: operator.id,
  name: operator.name,
  phone: operator.phone,
  active: operator.active,
});
