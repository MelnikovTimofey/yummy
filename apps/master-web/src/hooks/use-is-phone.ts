import { useSyncExternalStore } from 'react';

// Граница телефона (#215) — та же, что у @media (max-width: 640px) в styles.css.
const PHONE_QUERY = '(max-width: 640px)';

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(PHONE_QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
};

export const useIsPhone = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(PHONE_QUERY).matches, () => false);
