import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeftRight, ArrowUp, Search, X } from 'lucide-react';
import type { InventoryTobacco, ShelfAnalog, ShelfCard, ShelfRow, TobaccoRef } from '@/contracts';
import { mixStatusTag, substitutionNote } from '@/components/mixes/mix-status';
import { describeShelfError } from '@/lib/shelf';
import { analogCell, analogStock, moveAnalog, withoutAnalog } from '@/lib/shelf-analogs';

const SubMark = ({ label }: { label: string }) => (
  <span className="shelf-sub-mark" role="img" aria-label={label} title={label}>
    <ArrowLeftRight size={12} aria-hidden />
  </span>
);

// Колонка «Аналоги» (#482): два первых в порядке замены, остальные — «ещё N».
export const ShelfAnalogsCell = ({ analogs }: { analogs: ShelfAnalog[] }) => {
  if (!analogs.length) return <span className="shelf-faint">—</span>;
  const { head, rest, title } = analogCell(analogs);
  return (
    <span className="shelf-analogs" title={title}>
      {head.map((item, index) => (
        <span key={item.tobaccoId} className="shelf-analogs__item" data-off={!item.inStock || undefined}>
          <span className="shelf-analogs__name">{item.name}</span>
          {item.substituting ? <SubMark label="стоит в миксах вместо этого табака" /> : null}
          {index === 1 && rest ? <span className="shelf-faint">ещё {rest}</span> : null}
        </span>
      ))}
    </span>
  );
};

export type AnalogChange = (ids: string[], added?: TobaccoRef) => Promise<void>;

const AnalogSearch = ({
  exclude,
  disabled,
  searchCatalog,
  onPick,
}: {
  exclude: Set<string>;
  disabled: boolean;
  searchCatalog: (query: string) => Promise<InventoryTobacco[]>;
  onPick: (item: InventoryTobacco) => void;
}) => {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<InventoryTobacco[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setFound([]);
      setError('');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCatalog(value)
        .then((items) => {
          if (cancelled) return;
          setFound(items.filter((item) => !exclude.has(item.id)));
          setError('');
        })
        .catch((cause) => {
          if (!cancelled) setError(describeShelfError(cause));
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, exclude, searchCatalog]);

  return (
    <div className="shelf-analog-search">
      <label className="shelf-analog-search__field">
        <Search size={14} aria-hidden />
        <input
          type="search"
          aria-label="Добавить аналог"
          placeholder="Добавить аналог"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {found.length ? (
        <ul className="shelf-analog-search__list" aria-label="Найденные табаки">
          {found.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="shelf-analog-search__option"
                disabled={disabled}
                onClick={() => {
                  setQuery('');
                  onPick(item);
                }}
              >
                <span className="shelf-analog__name">
                  <small>{item.manufacturer}</small>
                  <b>{item.name}</b>
                </span>
                {item.inStock ? null : <span className="shelf-faint">нет в наличии</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
};

// «Аналоги» и «Похожие на полке» в карточке табака (#482, #shot=shelf-analogs, shelf-suggest).
export const ShelfAnalogsSections = ({
  row,
  card,
  rows,
  searchCatalog,
  onChange,
}: {
  row: ShelfRow;
  card: ShelfCard | null;
  rows: ShelfRow[];
  searchCatalog: (query: string) => Promise<InventoryTobacco[]>;
  onChange: AnalogChange;
}) => {
  const [busy, setBusy] = useState(false);
  const analogs = row.analogs;
  const ids = analogs.map((item) => item.tobaccoId);
  const similar = card?.similar ?? [];
  const idsKey = ids.join(',');
  const exclude = useMemo(() => new Set([row.tobacco.id, ...idsKey.split(',').filter(Boolean)]), [row.tobacco.id, idsKey]);

  const change = async (next: string[], added?: TobaccoRef) => {
    setBusy(true);
    try {
      await onChange(next, added);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="shelf-card__section">
        <h3 className="shelf-card__h3">Аналоги</h3>
        {analogs.length ? (
          <>
            <ol className="shelf-analog-list">
              {analogs.map((item, index) => (
                <li key={item.tobaccoId} className="shelf-analog">
                  <span className="shelf-analog__n">{index + 1}</span>
                  <span className="shelf-analog__name">
                    <small>{item.manufacturer}</small>
                    <b>{item.name}</b>
                  </span>
                  <span className="shelf-analog__stock" data-off={!item.inStock || undefined}>
                    {analogStock(item, rows)}
                  </span>
                  <span className="shelf-analog__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Выше: ${item.name}`}
                      disabled={busy || index === 0}
                      onClick={() => void change(moveAnalog(ids, index, -1))}
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Ниже: ${item.name}`}
                      disabled={busy || index === analogs.length - 1}
                      onClick={() => void change(moveAnalog(ids, index, 1))}
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Убрать из аналогов: ${item.name}`}
                      disabled={busy}
                      onClick={() => void change(withoutAnalog(ids, item.tobaccoId))}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
            <p className="shelf-faint shelf-card__note">Гостю ставим первый, который есть на полке.</p>
          </>
        ) : (
          <p className="shelf-faint shelf-card__note">Аналогов нет.</p>
        )}
        <AnalogSearch
          exclude={exclude}
          disabled={busy}
          searchCatalog={searchCatalog}
          onPick={(item) => void change([...ids, item.id], { tobaccoId: item.id, manufacturer: item.manufacturer, name: item.name })}
        />
      </section>

      {similar.length ? (
        <section className="shelf-card__section">
          <h3 className="shelf-card__h3">Похожие на полке</h3>
          <ul className="shelf-analog-list">
            {similar.map((item) => (
              <li key={item.tobaccoId} className="shelf-similar">
                <span className="shelf-analog__name">
                  <small>{item.manufacturer}</small>
                  <b>{item.name}</b>
                </span>
                <span className="shelf-similar__flavors">{item.flavors.join(', ')}</span>
                <button
                  type="button"
                  className="btn"
                  data-size="sm"
                  aria-label={`Сделать аналогом: ${item.name}`}
                  disabled={busy}
                  onClick={() => void change([...ids, item.tobaccoId], item)}
                >
                  Сделать аналогом
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
};

// «В миксах»: статус каждого микса, у микса с заменой — что чем заменено.
export const ShelfCardMixes = ({ mixes, onOpenMix }: { mixes: ShelfCard['mixes']; onOpenMix: (mixId: string) => void }) => (
  <ul className="shelf-analog-list">
    {mixes.map((mix) => {
      const tag = mix.status ? mixStatusTag(mix.status) : null;
      return (
        <li key={mix.id} className="shelf-card-mix">
          <button type="button" className="shelf-link shelf-card-mix__name" onClick={() => onOpenMix(mix.id)}>
            {mix.name}
          </button>
          {tag ? (
            <span className={tag.ghost ? 'tag tag--ghost' : 'tag'} data-tone={tag.tone}>
              {tag.label}
            </span>
          ) : null}
          {mix.status === 'substituted' && mix.substitution ? (
            <span className="shelf-card-mix__note">{substitutionNote(mix.substitution)}</span>
          ) : null}
        </li>
      );
    })}
  </ul>
);
