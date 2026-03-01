import { ApiUser } from './types';

const STORAGE_KEY = 'yummy_web_profile_names_v1';
const DEFAULT_PROFILE_LABEL = 'Мой профиль';

type ProfileNameMap = Record<string, string>;

const normalizeProfileNameMap = (raw: unknown): ProfileNameMap => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const entries = Object.entries(raw as Record<string, unknown>).filter(
    ([key, value]) => typeof key === 'string' && typeof value === 'string',
  );

  return entries.reduce<ProfileNameMap>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

const readStorageMap = (): ProfileNameMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return normalizeProfileNameMap(JSON.parse(raw));
  } catch {
    return {};
  }
};

const writeStorageMap = (map: ProfileNameMap) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const sanitizeProfileNameInput = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40);

export const loadStoredProfileName = (userId: string | null | undefined) => {
  if (!userId) {
    return null;
  }

  const value = readStorageMap()[userId];
  if (!value) {
    return null;
  }

  const normalized = sanitizeProfileNameInput(value);
  return normalized || null;
};

export const saveStoredProfileName = (userId: string, value: string) => {
  const map = readStorageMap();
  const normalized = sanitizeProfileNameInput(value);

  if (!normalized) {
    delete map[userId];
    writeStorageMap(map);
    return null;
  }

  map[userId] = normalized;
  writeStorageMap(map);
  return normalized;
};

export const resolveProfileName = (
  user: ApiUser | null | undefined,
  storedName?: string | null,
) => {
  const localName = sanitizeProfileNameInput(storedName ?? '');
  if (localName) {
    return localName;
  }

  const userName = sanitizeProfileNameInput(user?.name ?? '');
  if (userName) {
    return userName;
  }

  const emailName = sanitizeProfileNameInput(user?.email ?? '');
  if (emailName) {
    return emailName;
  }

  return DEFAULT_PROFILE_LABEL;
};
