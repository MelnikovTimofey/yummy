import { AuthState } from './types';

const STORAGE_KEY = 'yummy_web_auth_state_v1';

export const loadAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return { tokens: null, user: null };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { tokens: null, user: null };
  }

  try {
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed?.tokens?.accessToken || !parsed?.tokens?.refreshToken || !parsed?.user?.id) {
      return { tokens: null, user: null };
    }
    return parsed;
  } catch {
    return { tokens: null, user: null };
  }
};

export const saveAuthState = (state: AuthState) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state.tokens || !state.user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
