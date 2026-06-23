import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import type { InventoryTobacco } from '@/contracts';

type TobaccoLibraryProps = {
  // Список по умолчанию (пустой поиск): первые 100 табаков по алфавиту.
  defaultTobaccos: InventoryTobacco[];
  currentIds: string[];
  onAdd: (tobacco: InventoryTobacco) => void;
  // Поиск по всему каталогу на сервере (не только по загруженным 100).
  onSearch: (query: string) => Promise<InventoryTobacco[]>;
};

type LibrarySort = 'name' | 'manufacturer';

const SEARCH_DEBOUNCE_MS = 250;

export const TobaccoLibrary = ({ defaultTobaccos, currentIds, onAdd, onSearch }: TobaccoLibraryProps) => {
  const [search, setSearch] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sort, setSort] = useState<LibrarySort>('name');
  // null — поиск не активен, показываем defaultTobaccos.
  const [results, setResults] = useState<InventoryTobacco[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(() => {
      void onSearch(trimmed).then((items) => {
        if (!cancelled) {
          setResults(items);
          setLoading(false);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, onSearch]);

  const source = results ?? defaultTobaccos;
  const filtered = useMemo(() => {
    let list = source.filter((t) => !t.archived);
    if (inStockOnly) list = list.filter((t) => t.inStock);
    if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else if (sort === 'manufacturer') {
      list = [...list].sort(
        (a, b) =>
          a.manufacturer.localeCompare(b.manufacturer, 'ru') ||
          a.name.localeCompare(b.name, 'ru'),
      );
    }
    return list;
  }, [source, inStockOnly, sort]);

  return (
    <aside className="mix-builder__library" aria-label="Библиотека табаков">
      <div className="mix-builder__library-head">
        <label className="mix-builder__library-search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск табака, бренда, вкуса"
            aria-label="Поиск по библиотеке табаков"
          />
        </label>
        <div className="mix-builder__library-toolbar">
          <label className="mix-builder__library-toggle">
            <button
              type="button"
              role="switch"
              aria-checked={inStockOnly}
              className={`toggle ${inStockOnly ? 'toggle--on' : 'toggle--off'}`}
              onClick={() => setInStockOnly(!inStockOnly)}
            >
              <span className="toggle__track" aria-hidden="true">
                <span className="toggle__thumb" />
              </span>
            </button>
            <span>Только в наличии</span>
          </label>
          <label className="mix-builder__library-sort">
            <span className="sr-only">Сортировка</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}>
              <option value="name">По алфавиту</option>
              <option value="manufacturer">По бренду</option>
            </select>
          </label>
        </div>
        <p className="mix-builder__library-count">
          {loading ? 'Поиск…' : `${filtered.length} из ${source.length}`}
        </p>
      </div>

      <div className="mix-builder__library-list" role="listbox" aria-label="Все табаки">
        {filtered.length === 0 ? (
          <div className="mix-builder__library-empty">
            <strong>Ничего не найдено</strong>
            <p>Сбросьте фильтры или измените поиск.</p>
          </div>
        ) : (
          filtered.map((tobacco) => {
            const isInMix = currentIds.includes(tobacco.id);
            return (
              <button
                key={tobacco.id}
                type="button"
                className="mix-builder__library-item"
                data-in-mix={isInMix}
                data-out-of-stock={!tobacco.inStock}
                onClick={() => {
                  if (!isInMix) onAdd(tobacco);
                }}
                aria-pressed={isInMix}
                aria-disabled={isInMix}
              >
                <div className="mix-builder__library-item-body">
                  <div className="mix-builder__library-item-name">
                    {tobacco.name}
                    {!tobacco.inStock ? (
                      <span className="mix-builder__library-item-badge">нет</span>
                    ) : null}
                  </div>
                  <div className="mix-builder__library-item-meta">
                    {tobacco.manufacturer}
                    {tobacco.lineName ? ` · ${tobacco.lineName}` : ''}
                    {tobacco.flavors?.length ? ` · ${tobacco.flavors.slice(0, 3).join(', ')}` : ''}
                  </div>
                </div>
                <span className="mix-builder__library-item-action" aria-hidden="true">
                  {isInMix ? <Check size={14} /> : <Plus size={14} />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
