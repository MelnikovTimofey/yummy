// Подсказка «На экран «Домой»» (#582, #587). Без DOM — среда и storage приходят снаружи.
import type { StorageLike } from './guest-session';

export const INSTALL_HINT_KEY = 'aroma-install-hint';

export type InstallEnv = {
  standalone: boolean;
  userAgent: string;
  maxTouchPoints: number;
  hasPrompt: boolean;
};

// prompt — системное окно браузера; остальное — наша шторка с шагами.
export type InstallWay = 'prompt' | 'ios' | 'inapp' | 'android';

export const installWay = ({ standalone, userAgent, maxTouchPoints, hasPrompt }: InstallEnv): InstallWay | null => {
  if (standalone) return null;
  // iPad с iPadOS 13 представляется Маком, выдают его только касания.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  const android = /Android/.test(userAgent);
  if (!ios && !android) return null;
  if (hasPrompt) return 'prompt';
  if (ios) {
    // Chrome и Firefox на iPhone пишут Safari/ и умеют «На экран «Домой»» через то же меню.
    // Встроенные браузеры Telegram и Instagram Safari/ не пишут.
    return /Safari\//.test(userAgent) ? 'ios' : 'inapp';
  }
  return 'android';
};

// Флаг пишется при показе: плашка один раз за всё время. Не записался — не показываем.
export const claimInstallPlate = (storage: StorageLike) => {
  try {
    if (storage.getItem(INSTALL_HINT_KEY) === 'done') return false;
    storage.setItem(INSTALL_HINT_KEY, 'done');
    return true;
  } catch {
    return false;
  }
};

export const markInstallHintDone = (storage: StorageLike) => {
  try {
    storage.setItem(INSTALL_HINT_KEY, 'done');
  } catch {
    // Без хранилища плашка и так не покажется.
  }
};
