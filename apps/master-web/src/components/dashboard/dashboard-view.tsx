import type { ReactNode } from 'react';
import { Flame, Star, TriangleAlert } from 'lucide-react';

import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow, type MasterStatTile } from '@/components/shell/master-stats-row';
import { DashboardSummary, formatMetricValue, formatRating } from '@/contracts';

type DashboardViewProps = {
  summary: DashboardSummary | null;
  summaryError: string;
  onNavigate: (tab: 'inventory' | 'mixes' | 'rails' | 'access') => void;
  // Блок «Полка» (#213) — сверху, как в мокапе; остальные блоки без изменений.
  shelfBlock?: ReactNode;
};

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

// «10–23 октября», а через границу месяца — «29 сентября – 5 октября».
export const formatWindow = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${dayMonth.format(end)}`;
  }
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
};

const buildStatsTiles = (summary: DashboardSummary | null): MasterStatTile[] => {
  const totalTobaccos = summary?.totalTobaccos ?? 0;
  const inStock = summary?.inStockCount ?? 0;
  const guestVisible = summary?.ops.guestVisibleMixesCount ?? 0;
  const blocked = summary?.ops.blockedByInventoryCount ?? 0;
  const activeRails = summary?.ops.activeRailsCount ?? 0;

  return [
    {
      label: 'В наличии',
      value: formatMetricValue(inStock),
      hint: `из ${formatMetricValue(totalTobaccos)} табаков`,
    },
    {
      label: 'Виден гостю',
      value: formatMetricValue(guestVisible),
      hint: 'миксов на витрине',
    },
    {
      label: 'Заблокировано',
      value: formatMetricValue(blocked),
      hint: 'из-за наличия',
      tone: blocked > 0 ? 'warning' : 'default',
    },
    {
      label: 'Активных рейлов',
      value: formatMetricValue(activeRails),
      hint: 'в гостевой витрине',
    },
  ];
};

export function DashboardView({
  summary,
  summaryError,
  onNavigate,
  shelfBlock,
}: DashboardViewProps) {
  const topMixes = (summary?.topMixes ?? []).slice(0, 6);
  const blockedMixes = summary?.ops.blockedMixes ?? [];
  return (
    <section className="dashboard-page">
      <MasterPageHeader
        title="Дашборд смены"
        meta={summary ? formatWindow(summary.window.startsAt, summary.window.endsAt) : undefined}
      />

      {summaryError ? (
        <div className="dashboard-page__error" role="status">
          {summaryError}
        </div>
      ) : null}

      {shelfBlock}

      <MasterStatsRow tiles={buildStatsTiles(summary)} />

      <div className="dashboard-page__columns">
        <article className="dashboard-page__card">
          <h3 className="dashboard-page__heading">Топ миксов недели</h3>
          {topMixes.length ? (
            <ol className="dashboard-page__rows">
              {topMixes.map((mix, index) => (
                <li key={mix.mixId} className="dashboard-page__row">
                  <span className="dashboard-page__rank">{String(index + 1).padStart(2, '0')}</span>
                  <div className="dashboard-page__row-copy">
                    <div className="dashboard-page__row-name">{mix.name}</div>
                    <div className="dashboard-page__row-meta cell-truncate">
                      Оценок {formatMetricValue(mix.ratingsCount)}
                    </div>
                  </div>
                  <div className="dashboard-page__row-metrics" aria-label="Спрос и рейтинг">
                    <span className="dashboard-page__metric">
                      <Flame size={11} aria-hidden="true" />
                      {formatMetricValue(mix.smokeCtaCount)}
                    </span>
                    <span className="dashboard-page__metric">
                      <Star size={11} aria-hidden="true" />
                      {mix.avgRating ? formatRating(mix.avgRating) : '—'}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">Пока нет данных по спросу.</p>
          )}
        </article>

        <aside className="dashboard-page__card">
          <h3 className="dashboard-page__heading">Сигналы для команды</h3>
          {blockedMixes.length ? (
            <ul className="dashboard-page__signals">
              {blockedMixes.map((mix) => (
                <li key={mix.mixId} className="dashboard-page__signal">
                  <TriangleAlert
                    size={14}
                    aria-hidden="true"
                    className="dashboard-page__signal-icon"
                  />
                  <div className="dashboard-page__row-copy">
                    <div className="dashboard-page__row-name">{mix.name}</div>
                    <div className="dashboard-page__row-meta cell-truncate">
                      {mix.missingComponents.length
                        ? `Нет наличия: ${mix.missingComponents.join(', ')}`
                        : 'нет в наличии компонента'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    data-size="sm"
                    onClick={() => onNavigate('mixes')}
                  >
                    Открыть
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Нет блокировок. Витрина чистая.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
