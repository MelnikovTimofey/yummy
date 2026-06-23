import { Flame, Star, TriangleAlert } from 'lucide-react';

import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow, type MasterStatTile } from '@/components/shell/master-stats-row';
import { DashboardSummary, formatMetricValue } from '@/contracts';

type DashboardViewProps = {
  summary: DashboardSummary | null;
  summaryStatus: 'idle' | 'loading' | 'ready' | 'error';
  summaryError: string;
  onNavigate: (tab: 'inventory' | 'mixes' | 'rails' | 'access') => void;
};

const formatDayMonth = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long' }).format(parsed);
};

const formatWindowEyebrow = (startsAt: string, endsAt: string) => {
  const start = formatDayMonth(startsAt);
  const end = formatDayMonth(endsAt);
  if (!start || !end) {
    return 'Окно смены';
  }
  return `Окно: ${start} — ${end}`;
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
      tone: 'success',
    },
    {
      label: 'Заблокировано',
      value: formatMetricValue(blocked),
      hint: 'режет наличие',
      tone: 'warning',
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
  summaryStatus,
  summaryError,
  onNavigate,
}: DashboardViewProps) {
  const topMixes = (summary?.topMixes ?? []).slice(0, 6);
  const blockedMixes = summary?.ops.blockedMixes ?? [];
  const statusText =
    summaryStatus === 'loading'
      ? 'Обновляем'
      : summaryStatus === 'ready'
        ? 'Актуально'
        : summaryStatus === 'error'
          ? 'Ошибка загрузки'
          : 'Ожидает';

  return (
    <section className="dashboard-page">
      <MasterPageHeader
        eyebrow={formatWindowEyebrow(summary?.window.startsAt ?? '', summary?.window.endsAt ?? '')}
        title="Дашборд смены"
        subtitle="Что важно знать команде до открытия зала."
        meta={statusText}
      />

      {summaryError ? (
        <div className="dashboard-page__error" role="status">
          {summaryError}
        </div>
      ) : null}

      <MasterStatsRow tiles={buildStatsTiles(summary)} />

      <div className="dashboard-page__columns">
        <article className="dashboard-page__card">
          <p className="dashboard-page__eyebrow">Спрос гостей</p>
          <h3 className="dashboard-page__heading">Топ миксов недели</h3>
          {topMixes.length ? (
            <ol className="dashboard-page__rows">
              {topMixes.map((mix, index) => (
                <li key={mix.mixId} className="dashboard-page__row">
                  <span className="dashboard-page__rank">{String(index + 1).padStart(2, '0')}</span>
                  <div className="dashboard-page__row-copy">
                    <div className="dashboard-page__row-name">{mix.name}</div>
                    <div className="dashboard-page__row-meta cell-truncate">
                      Выборов {formatMetricValue(mix.smokeCtaCount)} · оценок {formatMetricValue(mix.ratingsCount)}
                    </div>
                  </div>
                  <div className="dashboard-page__row-metrics" aria-label="Спрос и рейтинг">
                    <span className="dashboard-page__metric">
                      <Flame size={11} aria-hidden="true" />
                      {formatMetricValue(mix.popularity)}
                    </span>
                    <span className="dashboard-page__metric">
                      <Star size={11} aria-hidden="true" />
                      {mix.avgRating ? mix.avgRating.toFixed(1) : '—'}
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
          <p className="dashboard-page__eyebrow">Внимание</p>
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
                        : 'блокирован отсутствием табака в наличии'}
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
