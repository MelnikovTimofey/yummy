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

// Единый stats-row под mockup Мастер · Refactor / _standalone_:
// .stats grid (1px разделители, 4 ячейки), .stat label/value/sub,
// data-tone на value для смыслового цвета (success/warning/danger/mono).
// Используется на всех 5 экранах (Dashboard, Tobaccos, Mixes, Access).
export const MasterStatsRow = ({ tiles }: MasterStatsRowProps) => (
  <div className="stats">
    {tiles.map((tile, index) => (
      <div key={`${tile.label}-${index}`} className="stat">
        <div className="stat__label">{tile.label}</div>
        <div className="stat__value" data-tone={tile.tone ?? 'default'}>
          {tile.value}
        </div>
        {tile.hint ? <div className="stat__sub">{tile.hint}</div> : null}
      </div>
    ))}
  </div>
);
