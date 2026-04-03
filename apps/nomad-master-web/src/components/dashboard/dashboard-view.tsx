import {
  ArrowRight,
  Boxes,
  ChartColumnIncreasing,
  Factory,
  Flame,
  Leaf,
  ShieldCheck,
  Sparkles,
  Star,
  TriangleAlert,
  Waypoints,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { dashboardWindowOptions, DashboardBreakdownItem, DashboardSummary, DashboardWindowKey, formatMetricValue } from '@/contracts';

type DashboardViewProps = {
  summary: DashboardSummary | null;
  summaryStatus: 'idle' | 'loading' | 'ready' | 'error';
  summaryError: string;
  dashboardWindow: DashboardWindowKey;
  onSelectDashboardWindow: (windowKey: DashboardWindowKey) => void | Promise<void>;
  onNavigate: (tab: 'inventory' | 'mixes' | 'rails' | 'access') => void;
};

const zeroSummaryCards = [
  { label: 'Всего табаков', value: 0, tone: 'inventory' as const, icon: Boxes },
  { label: 'В наличии', value: 0, tone: 'inventory' as const, icon: Leaf },
  { label: 'Выборы гостей', value: 0, tone: 'product' as const, icon: Flame },
  { label: 'Оценок гостей', value: 0, tone: 'product' as const, icon: Star },
  { label: 'Миксов блокирует наличие', value: 0, tone: 'ops' as const, icon: TriangleAlert },
  { label: 'Пустых активных рейлов', value: 0, tone: 'ops' as const, icon: Waypoints },
];

const formatDashboardDay = (value: string) => {
  if (!value) {
    return 'Нет даты';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(parsed);
};

const formatRange = (startsAt: string, endsAt: string) => {
  if (!startsAt || !endsAt) {
    return 'Окно не задано';
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Окно не задано';
  }

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const percent = (value: number, max: number) => {
  if (!max || value <= 0) {
    return 0;
  }

  return Math.max(12, Math.round((value / max) * 100));
};

const readSummaryCards = (summary: DashboardSummary | null) => {
  if (!summary) {
    return zeroSummaryCards;
  }

  return [
    { label: 'Всего табаков', value: summary.totalTobaccos, tone: 'inventory' as const, icon: Boxes },
    { label: 'В наличии', value: summary.inStockCount, tone: 'inventory' as const, icon: Leaf },
    { label: 'Выборы гостей', value: summary.smokeCtaTotal, tone: 'product' as const, icon: Flame },
    { label: 'Оценок гостей', value: summary.ratingsTotal, tone: 'product' as const, icon: Star },
    { label: 'Миксов блокирует наличие', value: summary.ops.blockedByInventoryCount, tone: 'ops' as const, icon: TriangleAlert },
    { label: 'Пустых активных рейлов', value: summary.ops.emptyActiveRailsCount, tone: 'ops' as const, icon: Waypoints },
  ];
};

const BreakdownPanel = ({
  title,
  kicker,
  items,
  emptyText,
  stockLine,
}: {
  title: string;
  kicker: string;
  items: DashboardBreakdownItem[];
  emptyText: string;
  stockLine: (item: DashboardBreakdownItem) => string;
}) => {
  const max = items.reduce((acc, item) => Math.max(acc, item.total), 0);

  return (
    <Card className="rounded-[1.6rem] border-[rgba(226,172,123,0.12)] bg-[radial-gradient(circle_at_top_right,rgba(226,172,123,0.08),transparent_26%),linear-gradient(180deg,rgba(23,20,23,0.96),rgba(15,14,17,0.92))] shadow-[0_18px_42px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <CardHeader className="space-y-1.5">
        <Badge variant="outline" className="w-fit rounded-full border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.04)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[rgba(226,172,123,0.78)]">
          {kicker}
        </Badge>
        <div className="space-y-1">
          <CardTitle className="text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--nomad-ink)]">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${kicker}:${item.key}`}
              className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--nomad-ink)]">{item.label}</div>
                  <div className="text-xs leading-5 text-[rgba(241,229,215,0.56)]">{stockLine(item)}</div>
                </div>
                <Badge variant="secondary" className="rounded-full bg-[rgba(226,172,123,0.08)] px-2.5 py-0.5 text-[rgba(241,229,215,0.84)]">
                  {formatMetricValue(item.total)}
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(115,47,34,0.92),rgba(183,139,74,0.88))]"
                  style={{ width: `${percent(item.total, max)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-6 text-[rgba(241,229,215,0.56)]">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const signalToneClass: Record<'inventory' | 'product' | 'ops', string> = {
  inventory: 'from-emerald-500/10 via-emerald-500/4 to-transparent',
  product: 'from-amber-500/12 via-amber-500/4 to-transparent',
  ops: 'from-rose-500/10 via-rose-500/4 to-transparent',
};

export function DashboardView({
  summary,
  summaryStatus,
  summaryError,
  dashboardWindow,
  onSelectDashboardWindow,
  onNavigate,
}: DashboardViewProps) {
  const summaryCards = readSummaryCards(summary);
  const activityMax = (summary?.activity ?? []).reduce(
    (acc, item) => Math.max(acc, item.smokeCtaCount + item.ratingsCount),
    0,
  );

  return (
    <section className="grid w-full gap-4">
      <Card className="overflow-hidden rounded-[1.45rem] border-none bg-[radial-gradient(circle_at_top_right,rgba(216,171,104,0.2),transparent_24%),linear-gradient(145deg,rgba(89,28,25,0.96),rgba(119,43,38,0.95)_52%,rgba(163,111,69,0.9))] text-white shadow-[0_18px_46px_rgba(57,22,20,0.2)]">
        <CardHeader className="space-y-3 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full border border-white/12 bg-white/10 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.22em] text-white">
                  Дашборд / сигналы смены
                </Badge>
                <Badge className="rounded-full border border-white/12 bg-white/10 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.22em] text-white/88">
                  {summary?.window.label ?? dashboardWindowOptions.find((item) => item.key === dashboardWindow)?.label}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold tracking-[-0.04em] text-white md:text-[1.7rem]">
                  Что требует внимания в этой смене.
                </CardTitle>
                <CardDescription className="max-w-2xl text-[13px] leading-5 text-white/76">
                  Ключевые сигналы по спросу, витрине и блокировкам.
                </CardDescription>
              </div>
            </div>

            <div className="min-w-0 rounded-[1.05rem] border border-white/12 bg-white/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md lg:max-w-[16rem]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/58">Окно анализа</div>
                  <div className="mt-1 text-base font-semibold text-white">
                    {summary?.window.label ?? dashboardWindowOptions.find((item) => item.key === dashboardWindow)?.label}
                  </div>
                </div>
                <Sparkles className="size-4 text-white/74" />
              </div>
              <Separator className="my-3 bg-white/12" />
              <div className="grid gap-2 text-[13px] text-white/74">
                <div className="flex items-center justify-between gap-4">
                  <span>Период</span>
                  <strong className="text-right font-medium text-white">{formatRange(summary?.window.startsAt ?? '', summary?.window.endsAt ?? '')}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Статус данных</span>
                  <strong className="text-right font-medium text-white">
                    {summaryStatus === 'loading' ? 'Обновляем' : summaryStatus === 'ready' ? 'Актуально' : 'Ожидает'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {dashboardWindowOptions.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={dashboardWindow === option.key ? 'secondary' : 'ghost'}
                  className={cn(
                    'h-8 rounded-full border border-white/12 px-3 text-xs',
                    dashboardWindow === option.key
                      ? 'bg-white text-stone-950 hover:bg-white/92'
                      : 'bg-white/8 text-white hover:bg-white/14 hover:text-white',
                  )}
                  onClick={() => void onSelectDashboardWindow(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" className="h-8 rounded-full border border-white/10 bg-white/8 px-3 text-xs text-white hover:bg-white/14" onClick={() => onNavigate('inventory')}>
                Инвентаризация
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="h-8 rounded-full border border-white/10 bg-white/8 px-3 text-xs text-white hover:bg-white/14" onClick={() => onNavigate('mixes')}>
                Миксы
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="h-8 rounded-full border border-white/10 bg-white/8 px-3 text-xs text-white hover:bg-white/14" onClick={() => onNavigate('rails')}>
                Рейлы
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="h-8 rounded-full border border-white/10 bg-white/8 px-3 text-xs text-white hover:bg-white/14" onClick={() => onNavigate('access')}>
                Доступ
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          {summaryStatus === 'loading' ? <div className="text-sm text-white/72">Загружаем свежую сводку...</div> : null}
          {summaryError ? (
            <div className="rounded-[1.2rem] border border-rose-200/24 bg-rose-500/12 px-4 py-3 text-sm text-white">
              {summaryError}
            </div>
          ) : null}
        </CardHeader>
      </Card>

      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card
              key={card.label}
              className={cn(
                'rounded-[1.15rem] border-[rgba(226,172,123,0.1)] bg-[linear-gradient(180deg,rgba(23,20,23,0.96),rgba(16,15,18,0.9))] shadow-[0_16px_34px_rgba(0,0,0,0.26)] backdrop-blur-xl',
                signalToneClass[card.tone],
              )}
            >
              <CardContent className="flex items-start justify-between gap-3 py-1.5">
                <div className="space-y-1.5">
                  <Badge variant="outline" className="rounded-full border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[rgba(226,172,123,0.78)]">
                    {card.tone === 'inventory' ? 'Наличие' : card.tone === 'product' ? 'Спрос' : 'Операции'}
                  </Badge>
                  <div className="space-y-1">
                    <div className="text-[1.55rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">{formatMetricValue(card.value)}</div>
                    <div className="text-[13px] leading-4.5 text-[rgba(241,229,215,0.58)]">{card.label}</div>
                  </div>
                </div>
                <div className="flex size-8 items-center justify-center rounded-[0.85rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(241,229,215,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <Icon className="size-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <BreakdownPanel
          title="Производители"
          kicker="Наличие"
          items={summary?.inventory.manufacturers ?? []}
          emptyText="Пока нет разреза по производителям."
          stockLine={(item) => `В наличии ${formatMetricValue(item.inStockCount)} из ${formatMetricValue(item.total)}`}
        />
        <BreakdownPanel
          title="Категории вкуса"
          kicker="Категории"
          items={summary?.inventory.flavorProfiles ?? []}
          emptyText="Пока нет разреза по профилям."
          stockLine={(item) => `Нет наличия ${formatMetricValue(item.outOfStockCount)} позиции`}
        />
        <BreakdownPanel
          title="Топ вкусов"
          kicker="Вкусы"
          items={summary?.inventory.topFlavors ?? []}
          emptyText="Пока нет разреза по вкусам."
          stockLine={(item) => `В наличии ${formatMetricValue(item.inStockCount)} позиции`}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-[1.4rem] border-[rgba(226,172,123,0.12)] bg-[radial-gradient(circle_at_top_right,rgba(226,172,123,0.08),transparent_28%),linear-gradient(180deg,rgba(23,20,23,0.96),rgba(15,14,17,0.92))] shadow-[0_18px_42px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <CardHeader className="space-y-1.5 p-5">
            <Badge variant="outline" className="w-fit rounded-full border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.78)]">
              Спрос гостей
            </Badge>
            <div className="space-y-1">
              <CardTitle className="text-[1.5rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">Выборы и оценки гостей</CardTitle>
              <CardDescription className="text-[13px] leading-5 text-[rgba(241,229,215,0.58)]">Выборы, оценки и дневной ритм.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2.5 md:grid-cols-3">
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.74)]">Выборы</div>
                <div className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">{formatMetricValue(summary?.smokeCtaTotal ?? 0)}</div>
              </div>
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.74)]">Оценки</div>
                <div className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">{formatMetricValue(summary?.ratingsTotal ?? 0)}</div>
              </div>
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.74)]">Средняя оценка</div>
                <div className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">
                  {summary?.avgGuestRating ? summary.avgGuestRating.toFixed(1) : '0.0'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Топ по выбору</div>
                    <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Где больше всего кликов на «Покурить».</div>
                  </div>
                  <ChartColumnIncreasing className="size-4 text-[rgba(241,229,215,0.48)]" />
                </div>
                <div className="space-y-2">
                  {(summary?.topMixes ?? []).map((mix) => (
                    <div key={`top:${mix.mixId}`} className="rounded-[1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">{mix.name}</div>
                          <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">
                            Рейтинг {mix.avgRating.toFixed(1)} · оценок {formatMetricValue(mix.ratingsCount)}
                          </div>
                        </div>
                        <Badge className="rounded-full bg-amber-500/16 px-2.5 py-0.5 text-[11px] text-amber-100">{formatMetricValue(mix.smokeCtaCount)}</Badge>
                      </div>
                    </div>
                  ))}
                  {!summary?.topMixes.length ? <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет данных по выборам.</div> : null}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Топ по оценкам</div>
                    <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Какие миксы получают лучший отклик гостей.</div>
                  </div>
                  <Star className="size-4 text-[rgba(241,229,215,0.48)]" />
                </div>
                <div className="space-y-2">
                  {(summary?.topRatedMixes ?? []).map((mix) => (
                    <div key={`rated:${mix.mixId}`} className="rounded-[1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">{mix.name}</div>
                          <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">
                            Выборов {formatMetricValue(mix.smokeCtaCount)} · оценок {formatMetricValue(mix.ratingsCount)}
                          </div>
                        </div>
                        <Badge className="rounded-full bg-emerald-500/16 px-2.5 py-0.5 text-[11px] text-emerald-100">{mix.avgRating.toFixed(1)}</Badge>
                      </div>
                    </div>
                  ))}
                  {!summary?.topRatedMixes.length ? <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет оценок гостей за выбранное окно.</div> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Распределение оценок</div>
                    <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Показывает, как распределяется обратная связь гостей.</div>
                  </div>
                  <Sparkles className="size-4 text-[rgba(241,229,215,0.48)]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(summary?.ratingDistribution ?? []).map((item) => (
                    <Badge key={`rating:${item.value}`} variant="outline" className="rounded-full border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] text-[rgba(241,229,215,0.82)]">
                      {item.value}★ · {formatMetricValue(item.count)}
                    </Badge>
                  ))}
                  {!summary?.ratingDistribution.length ? <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет распределения оценок.</div> : null}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Динамика по дням</div>
                    <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Смотрим не только абсолют, но и ритм спроса.</div>
                  </div>
                  <Flame className="size-4 text-[rgba(241,229,215,0.48)]" />
                </div>
                <div className="space-y-2">
                  {(summary?.activity ?? []).map((item) => (
                    <div key={item.date} className="rounded-[1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">{formatDashboardDay(item.date)}</div>
                        <div className="text-[11px] text-[rgba(241,229,215,0.56)]">
                          Выборов {formatMetricValue(item.smokeCtaCount)} · оценок {formatMetricValue(item.ratingsCount)}
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(109,49,36,0.94),rgba(218,164,83,0.9))]"
                          style={{ width: `${percent(item.smokeCtaCount + item.ratingsCount, activityMax)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {!summary?.activity.length ? <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет динамики по дням.</div> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.4rem] border-[rgba(226,172,123,0.12)] bg-[radial-gradient(circle_at_top_right,rgba(226,172,123,0.08),transparent_28%),linear-gradient(180deg,rgba(23,20,23,0.96),rgba(15,14,17,0.92))] shadow-[0_18px_42px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <CardHeader className="space-y-1.5 p-5">
            <Badge variant="outline" className="w-fit rounded-full border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.78)]">
              Операции
            </Badge>
            <div className="space-y-1">
              <CardTitle className="text-[1.5rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">Сигналы для команды</CardTitle>
              <CardDescription className="text-[13px] leading-5 text-[rgba(241,229,215,0.58)]">Блокировки витрины и состояние рейлов.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.74)]">Гостю видно</div>
                <div className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">{formatMetricValue(summary?.ops.guestVisibleMixesCount ?? 0)}</div>
              </div>
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.74)]">Скрыто вручную</div>
                <div className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">{formatMetricValue(summary?.ops.hiddenMixesCount ?? 0)}</div>
              </div>
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.74)]">Активных рейлов</div>
                <div className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">{formatMetricValue(summary?.ops.activeRailsCount ?? 0)}</div>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Миксы, которые режет наличие</div>
                  <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Здесь спрос уже упирается в инвентарь.</div>
                </div>
                <TriangleAlert className="size-4 text-[rgba(241,229,215,0.48)]" />
              </div>
              <div className="space-y-2">
                {(summary?.ops.blockedMixes ?? []).map((mix) => (
                  <div key={`blocked:${mix.mixId}`} className="rounded-[1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">{mix.name}</div>
                        <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">
                          Нет наличия: {mix.missingComponents.join(', ') || 'не указано'}
                        </div>
                        <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">
                          Рейлы: {mix.railNames.join(', ') || 'не участвует'}
                        </div>
                      </div>
                      <Badge className="rounded-full bg-rose-500/16 px-2.5 py-0.5 text-[11px] text-rose-100">{formatMetricValue(mix.smokeCtaCount)}</Badge>
                    </div>
                  </div>
                ))}
                {!summary?.ops.blockedMixes.length ? <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет миксов, заблокированных наличием.</div> : null}
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Состояние рейлов</div>
                  <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Понимаем, где витрина ослаблена скрытыми или пустыми позициями.</div>
                </div>
                <Waypoints className="size-4 text-[rgba(241,229,215,0.48)]" />
              </div>
              <div className="space-y-2">
                {(summary?.ops.railHealth ?? []).map((rail) => (
                  <div key={`rail-health:${rail.railId}`} className="rounded-[1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">{rail.name}</div>
                          <Badge variant="outline" className="rounded-full border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] text-[rgba(241,229,215,0.72)]">
                            {rail.type}
                          </Badge>
                        </div>
                        <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">
                          Видимых миксов {formatMetricValue(rail.visibleMixCount)} из {formatMetricValue(rail.totalMixCount)}
                        </div>
                      </div>
                      <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px]', rail.hiddenMixCount ? 'bg-rose-500/16 text-rose-100' : 'bg-emerald-500/16 text-emerald-100')}>
                        {rail.hiddenMixCount ? `Скрыто ${formatMetricValue(rail.hiddenMixCount)}` : 'Без блокировок'}
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(61,95,78,0.9),rgba(196,164,98,0.88))]"
                        style={{ width: `${percent(rail.visibleMixCount, rail.totalMixCount)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!summary?.ops.railHealth.length ? <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет данных по рейлам.</div> : null}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--nomad-ink)]">
                  <Factory className="size-4 text-[rgba(241,229,215,0.48)]" />
                  Инвентарь
                </div>
                <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.58)]">
                  Переключись в инвентаризацию, если растёт число заблокированных миксов или падает покрытие по ключевым профилям.
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--nomad-ink)]">
                  <ShieldCheck className="size-4 text-[rgba(241,229,215,0.48)]" />
                  Витрина
                </div>
                <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.58)]">
                  Переключись в рейлы, если растёт число скрытых позиций или активные подборки теряют наполненность.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
