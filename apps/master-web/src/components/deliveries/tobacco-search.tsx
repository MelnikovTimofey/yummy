import { useEffect, useState } from 'react';
import type { InventoryTobacco } from '@/contracts';

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

export type TobaccoOption = { id: string; manufacturer: string; lineName: string; name: string };

// Поиск по всему каталогу (11 тыс. карточек) — на сервере, с задержкой на ввод.
export const useTobaccoSearch = (query: string, search: (query: string) => Promise<InventoryTobacco[]>) => {
  const [items, setItems] = useState<TobaccoOption[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setItems([]);
      setState('idle');
      return;
    }
    let alive = true;
    setState('loading');
    const timer = window.setTimeout(() => {
      search(trimmed)
        .then((found) => {
          if (!alive) return;
          setItems(found.map(({ id, manufacturer, lineName, name }) => ({ id, manufacturer, lineName: lineName ?? '', name })));
          setState('ready');
        })
        .catch(() => {
          if (alive) setState('error');
        });
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [trimmed, search]);

  return { items, state };
};

export const TobaccoOptionLabel = ({ option }: { option: TobaccoOption }) => (
  <span className="deliv-option__name">
    <b>{option.name}</b>
    <span className="shelf-faint">
      {option.manufacturer}
      {option.lineName ? ` · ${option.lineName}` : ''}
    </span>
  </span>
);

type TobaccoSearchResultsProps = {
  query: string;
  state: 'idle' | 'loading' | 'ready' | 'error';
  items: TobaccoOption[];
  selectedId?: string | null;
  onPick: (option: TobaccoOption) => void;
};

export const TobaccoSearchResults = ({ query, state, items, selectedId, onPick }: TobaccoSearchResultsProps) => {
  if (query.trim().length < MIN_QUERY) return null;
  if (state === 'loading' && !items.length) return <p className="deliv-picker__note">Ищем в каталоге…</p>;
  if (state === 'error') return <p className="deliv-picker__note">Каталог не ответил. Повторите поиск.</p>;
  if (!items.length) return <p className="deliv-picker__note">В каталоге ничего похожего.</p>;
  return (
    <>
      {items.map((option) => (
        <button
          key={option.id}
          type="button"
          className="deliv-option"
          aria-pressed={option.id === selectedId}
          onClick={() => onPick(option)}
        >
          <TobaccoOptionLabel option={option} />
        </button>
      ))}
    </>
  );
};
