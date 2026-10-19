import { useState } from 'react';
import { formatFlavorProfileLabel, formatMetricValue, type ShelfRow } from '@/contracts';
import { buildShelfFilterOptions, type ShelfFilters } from '@/lib/shelf';

type ShelfFilterPanelProps = {
  rows: ShelfRow[];
  filters: ShelfFilters;
  onChange: (next: ShelfFilters) => void;
};

const BRANDS_FOLDED = 6;

const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const Check = ({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) => (
  <label className="shelf-check">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="shelf-check__label">{label}</span>
    <em>{formatMetricValue(count)}</em>
  </label>
);

// Фильтры полки — в браузере по загруженным строкам, без запросов к серверу.
export const ShelfFilterPanel = ({ rows, filters, onChange }: ShelfFilterPanelProps) => {
  const [allBrands, setAllBrands] = useState(false);
  const options = buildShelfFilterOptions(rows);
  const brands = allBrands ? options.brands : options.brands.slice(0, BRANDS_FOLDED);
  const hiddenBrands = options.brands.length - brands.length;

  return (
    <div className="shelf-filters" role="group" aria-label="Фильтры полки">
      <div className="shelf-filters__group">
        <h4>Бренд</h4>
        {brands.map((option) => (
          <Check
            key={option.value}
            label={option.value}
            count={option.count}
            checked={filters.brands.includes(option.value)}
            onChange={() => onChange({ ...filters, brands: toggle(filters.brands, option.value) })}
          />
        ))}
        {hiddenBrands > 0 || allBrands ? (
          <button type="button" className="shelf-filters__more" onClick={() => setAllBrands((current) => !current)}>
            {allBrands ? 'Свернуть' : `Ещё ${formatMetricValue(hiddenBrands)}…`}
          </button>
        ) : null}
      </div>
      <div className="shelf-filters__group">
        <h4>Характер</h4>
        {options.profiles.map((option) => (
          <Check
            key={option.value}
            label={formatFlavorProfileLabel(option.value)}
            count={option.count}
            checked={filters.profiles.includes(option.value)}
            onChange={() => onChange({ ...filters, profiles: toggle(filters.profiles, option.value) })}
          />
        ))}
      </div>
      <div className="shelf-filters__group">
        <h4>Крепость</h4>
        {options.strengths.map((option) => (
          <Check
            key={option.value || 'none'}
            label={option.value || 'Не указана'}
            count={option.count}
            checked={filters.strengths.includes(option.value)}
            onChange={() => onChange({ ...filters, strengths: toggle(filters.strengths, option.value) })}
          />
        ))}
      </div>
      <div className="shelf-filters__group">
        <h4>Ещё</h4>
        <Check
          label="Есть в миксах"
          count={options.extra.withMixes}
          checked={filters.withMixes}
          onChange={() => onChange({ ...filters, withMixes: !filters.withMixes })}
        />
        <Check
          label="Нет в миксах"
          count={options.extra.withoutMixes}
          checked={filters.withoutMixes}
          onChange={() => onChange({ ...filters, withoutMixes: !filters.withoutMixes })}
        />
        <Check
          label="Мало данных о расходе"
          count={options.extra.fewData}
          checked={filters.fewData}
          onChange={() => onChange({ ...filters, fewData: !filters.fewData })}
        />
      </div>
    </div>
  );
};
