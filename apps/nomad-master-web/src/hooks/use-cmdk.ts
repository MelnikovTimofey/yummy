import { useCallback, useEffect, useState } from 'react';

const isTextInput = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
};

export const useCmdK = (enabled: boolean = true) => {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((current) => !current), []);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

      if (isCmdK) {
        event.preventDefault();
        togglePalette();
        return;
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTextInput(event.target)) return;
        event.preventDefault();
        openPalette();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, togglePalette, openPalette]);

  return { open, setOpen, openPalette, closePalette, togglePalette };
};
