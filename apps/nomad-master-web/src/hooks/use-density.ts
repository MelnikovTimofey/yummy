import { useCallback, useEffect, useState } from 'react';

export type Density = 'compact' | 'default' | 'cozy';

const STORAGE_KEY = 'nomad-master-density-v1';
const VALID: readonly Density[] = ['compact', 'default', 'cozy'];

const readStored = (): Density => {
  if (typeof window === 'undefined') return 'default';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return VALID.includes(raw as Density) ? (raw as Density) : 'default';
};

export const useDensity = () => {
  const [density, setDensityState] = useState<Density>(() => readStored());

  useEffect(() => {
    const root = document.documentElement;
    if (density === 'default') {
      root.removeAttribute('data-density');
    } else {
      root.setAttribute('data-density', density);
    }
    window.localStorage.setItem(STORAGE_KEY, density);
  }, [density]);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
  }, []);

  return { density, setDensity };
};
