import { useSyncExternalStore } from 'react';

import { installWay, markInstallHintDone, type InstallWay } from '@/lib/install-hint';

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Chrome шлёт событие один раз и рано — до того, как гость дойдёт до «Кабинета»,
// поэтому слушаем с загрузки модуля (#587).
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferred = event as InstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  installed = true;
  markInstallHintDone(localStorage);
  notify();
});

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const snapshot = (): InstallWay | null =>
  installed
    ? null
    : installWay({
        standalone: standalone(),
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        hasPrompt: deferred !== null,
      });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useInstallWay = () => useSyncExternalStore(subscribe, snapshot);

// Событие одноразовое: после prompt() следующий раз — шторка с шагами.
export const openInstallPrompt = () => {
  const event = deferred;
  deferred = null;
  notify();
  void event?.prompt().catch(() => undefined);
};
