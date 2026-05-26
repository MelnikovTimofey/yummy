import { Flame, Star, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
      label: 'В НАЛИЧИИ',
      value: formatMetricValue(inStock),
      hint: `из ${formatMetricValue(totalTobaccos)} табаков`,
    },
    {
      label: 'ВИДЕН ГОСТЮ',
      value: formatMetricValue(guestVisible),
      hint: 'миксов на витрине',
      tone: 'success',
    },
    {
      label: 'ЗАБЛОКИРОВАНО',
      value: formatMetricValue(blocked),
      hint: 'режет наличие',
      tone: 'warning',
    },
    {
      label: 'АКТИВНЫХ РЕЙЛОВ',
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
    <section className="dashboard-shift">
      <MasterPageHeader
        eyebrow={formatWindowEyebrow(summary?.window.startsAt ?? '', summary?.window.endsAt ?? '')}
        title="Дашборд смены"
        subtitle="Что важно знать команде до открытия зала."
        meta={statusText}
      />

      {summaryError ? (
        <div className="dashboard-shift__error" role="status">
          {summaryError}
        </div>
      ) : null}

      <MasterStatsRow tiles={buildStatsTiles(summary)} />

      <div className="dashboard-shift__columns">
        <article className="dashboard-shift__card dashboard-shift__card--demand">
          <p className="eyebrow">Спрос гостей</p>
          <h2 className="dashboard-shift__heading">Топ миксов недели</h2>
          {topMixes.length ? (
            <ol className="dashboard-shift__list">
              {topMixes.map((mix, index) => (
                <li key={mix.mixId} className="dashboard-shift__row">
                  <span className="dashboard-shift__rank">{String(index + 1).padStart(2, '0')}</span>
                  <div className="dashboard-shift__row-copy">
                    <p className="dashboard-shift__row-name">{mix.name}</p>
                    <p className="dashboard-shift__row-meta">
                      Выборов {formatMetricValue(mix.smokeCtaCount)} · оценок {formatMetricValue(mix.ratingsCount)}
                    </p>
                  </div>
                  <div className="dashboard-shift__row-metrics" aria-label="Спрос и рейтинг">
                    <span className="dashboard-shift__metric">
                      <Flame size={12} aria-hidden="true" />
                      {formatMetricValue(mix.popularity)}
                    </span>
                    <span className="dashboard-shift__metric">
                      <Star size={12} aria-hidden="true" />
                      {mix.avgRating ? mix.avgRating.toFixed(1) : '—'}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="dashboard-shift__empty">Пока нет данных по спросу.</p>
          )}
        </article>

        <aside className="dashboard-shift__card dashboard-shift__card--signals">
          <p className="eyebrow">Внимание</p>
          <h2 className="dashboard-shift__heading">Сигналы для команды</h2>
          {blockedMixes.length ? (
            <ul className="dashboard-shift__signals">
              {blockedMixes.map((mix) => (
                <li key={mix.mixId} className="dashboard-shift__signal">
                  <TriangleAlert size={16} aria-hidden="true" className="dashboard-shift__signal-icon" />
                  <div className="dashboard-shift__signal-copy">
                    <p className="dashboard-shift__signal-name">{mix.name}</p>
                    <p className="dashboard-shift__signal-reason">
                      {mix.missingComponents.length
                        ? `Нет наличия: ${mix.missingComponents.join(', ')}`
                        : 'блокирован отсутствием табака в наличии'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('mixes')}>
                    Открыть
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-shift__empty">Нет блокировок. Витрина чистая.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
