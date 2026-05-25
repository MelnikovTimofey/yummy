import type { StaffUser } from '@/contracts';

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
