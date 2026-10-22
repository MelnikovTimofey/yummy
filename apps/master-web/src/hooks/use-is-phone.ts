import { useSyncExternalStore } from 'react';

// Граница телефона (#215) — та же, что у телефонного @media в styles.css.
// Повёрнутый телефон шире 640 px, но невысокий и сенсорный (#334): без второго
// условия он получал десктопную шапку с вкладками в несколько строк.
export const PHONE_QUERY = '(max-width: 640px), (max-height: 500px) and (pointer: coarse)';

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(PHONE_QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
};

export const useIsPhone = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(PHONE_QUERY).matches, () => false);
