import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string, initialValue = false) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);

    sync();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, [query]);

  return matches;
};
