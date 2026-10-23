import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { DeliveryLine, InventoryTobacco } from '@/contracts';
import { TobaccoOptionLabel, TobaccoSearchResults, useTobaccoSearch } from './tobacco-search';

type TobaccoPickerProps = {
  line: DeliveryLine;
  anchor: HTMLElement;
  search: (query: string) => Promise<InventoryTobacco[]>;
  onPick: (tobaccoId: string) => void;
  onClear: () => void;
  onSkip: () => void;
  onCreate: () => void;
  onClose: () => void;
};

const GAP = 4;
const EDGE = 8;
const MIN_WIDTH = 380;

// Выбор табака для строки счёта: сверху предложения разбора, ниже поиск
// по всему каталогу, внизу «Создать карточку» и «Это не табак».
export const TobaccoPicker = ({ line, anchor, search, onPick, onClear, onSkip, onCreate, onClose }: TobaccoPickerProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const found = useTobaccoSearch(query, search);

  useLayoutEffect(() => {
    const place = () => {
      const menu = ref.current;
      if (!menu) return;
      const box = anchor.getBoundingClientRect();
      const width = Math.min(Math.max(box.width, MIN_WIDTH), window.innerWidth - EDGE * 2);
      const height = menu.offsetHeight;
      const below = box.bottom + GAP;
      const top = below + height > window.innerHeight - EDGE ? Math.max(EDGE, box.top - height - GAP) : below;
      const left = Math.min(Math.max(EDGE, box.left), window.innerWidth - width - EDGE);
      setPosition({ top, left, width });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchor, found.items.length, found.state]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !anchor.contains(target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
      anchor.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchor, onClose]);

  const candidates = line.candidates.filter((candidate) => candidate.id !== line.tobacco?.id);

  return createPortal(
    <div
      ref={ref}
      className="deliv-picker"
      role="dialog"
      aria-label={`Табак для строки ${line.n}`}
      style={position ? { top: position.top, left: position.left, width: position.width } : { visibility: 'hidden' }}
    >
      <div className="input deliv-picker__search">
        <Search size={14} aria-hidden />
        <input
          autoFocus
          type="search"
          aria-label="Найти табак в каталоге"
          placeholder="Найти в каталоге: бренд или вкус"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="deliv-picker__list">
        {line.tobacco ? (
          <>
            <p className="shelf-menu__label">Выбрано</p>
            <button type="button" className="deliv-option" aria-pressed="true" onClick={onClose}>
              <TobaccoOptionLabel option={line.tobacco} />
            </button>
          </>
        ) : null}

        {candidates.length ? (
          <>
            <p className="shelf-menu__label">Похожие в каталоге</p>
            {candidates.map((candidate) => (
              <button key={candidate.id} type="button" className="deliv-option" onClick={() => onPick(candidate.id)}>
                <TobaccoOptionLabel option={candidate} />
                <span className="deliv-option__meta">{candidate.reason === 'memory' ? 'по памяти' : `${candidate.confidence} %`}</span>
              </button>
            ))}
          </>
        ) : null}

        {query.trim().length >= 2 ? <p className="shelf-menu__label">Каталог</p> : null}
        <TobaccoSearchResults
          query={query}
          state={found.state}
          items={found.items}
          selectedId={line.tobacco?.id}
          onPick={(option) => onPick(option.id)}
        />
        {!candidates.length && !line.tobacco && query.trim().length < 2 ? (
          <p className="deliv-picker__note">Похожих не нашли. Найдите табак поиском или создайте карточку.</p>
        ) : null}
      </div>

      <div className="shelf-menu__sep" />
      <button type="button" className="shelf-menu__item" onClick={onCreate}>
        Создать карточку
      </button>
      <button type="button" className="shelf-menu__item" onClick={onSkip}>
        Это не табак
      </button>
      {line.tobacco ? (
        <button type="button" className="shelf-menu__item" onClick={onClear}>
          Снять выбор
        </button>
      ) : null}
    </div>,
    document.body,
  );
};
