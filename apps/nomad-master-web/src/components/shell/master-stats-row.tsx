import type { ReactNode } from 'react';

export type MasterStatTone = 'default' | 'success' | 'warning' | 'danger' | 'mono';

export type MasterStatTile = {
  /** eyebrow uppercase mono: «В КАТАЛОГЕ» / «ВИДНО ГОСТЮ» */
  label: string;
  /** Большое значение — число или короткая строка (для mono-кодов типа NOMAD-2026) */
  value: ReactNode;
  /** Подпись под значением (caption) — необязательная */
  hint?: ReactNode;
  /** Цветовой акцент: success=зелёный, warning=жёлтый, danger=терракотовый, mono=monospace */
  tone?: MasterStatTone;
};

type MasterStatsRowProps = {
  tiles: MasterStatTile[];
};

// Единый stats-row под mockups.html прототипа master-refactor: один
// контейнер с тонкими разделителями между ячейками (а не индивидуальные
// card-border'ы вокруг каждой плитки). Числа очень крупные (56-64px,
// font-display), цвет акцент по `tone`. Используется на всех 5 экранах
// в одинаковой раскладке (обычно 4 плитки).
export const MasterStatsRow = ({ tiles }: MasterStatsRowProps) => (
  <div className="master-stats-row">
    {tiles.map((tile, index) => (
      <article
        key={`${tile.label}-${index}`}
        className="master-stats-row__tile"
        data-tone={tile.tone ?? 'default'}
      >
        <p className="master-stats-row__label">{tile.label}</p>
        <p className="master-stats-row__value">{tile.value}</p>
        {tile.hint ? <p className="master-stats-row__hint">{tile.hint}</p> : null}
      </article>
    ))}
  </div>
);
