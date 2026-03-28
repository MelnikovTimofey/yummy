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
    <Card className="rounded-[1.9rem] border-white/60 bg-white/82 shadow-[0_24px_60px_rgba(42,24,20,0.09)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <Badge variant="outline" className="w-fit rounded-full border-stone-800/10 bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-600">
          {kicker}
        </Badge>
        <div className="space-y-1">
          <CardTitle className="font-serif text-2xl font-semibold tracking-[-0.03em] text-stone-950">{title}</CardTitle>
          <CardDescription className="text-sm leading-6 text-stone-600">
            Production-ready срез, чтобы переходить к действиям без перехода в raw CRUD.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${kicker}:${item.key}`}
              className="rounded-[1.45rem] border border-stone-900/6 bg-stone-50/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-stone-900">{item.label}</div>
                  <div className="text-xs leading-5 text-stone-500">{stockLine(item)}</div>
                </div>
                <Badge variant="secondary" className="rounded-full bg-stone-900/6 px-3 py-1 text-stone-700">
                  {formatMetricValue(item.total)}
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-stone-950/8">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(115,47,34,0.92),rgba(183,139,74,0.88))]"
                  style={{ width: `${percent(item.total, max)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.45rem] border border-dashed border-stone-900/10 bg-white/70 p-5 text-sm leading-6 text-stone-500">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const signalToneClass: Record<'inventory' | 'product' | 'ops', string> = {
  inventory: 'from-emerald-500/18 via-emerald-500/6 to-white',
  product: 'from-amber-500/20 via-amber-500/7 to-white',
  ops: 'from-rose-500/18 via-rose-500/6 to-white',
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
    <section className="mx-auto grid w-full max-w-[1180px] gap-5">
      <Card className="overflow-hidden rounded-[2rem] border-none bg-[radial-gradient(circle_at_top_right,rgba(219,173,96,0.26),transparent_26%),linear-gradient(145deg,rgba(70,25,22,0.97),rgba(111,56,37,0.96)_52%,rgba(136,93,45,0.95))] text-white shadow-[0_32px_90px_rgba(42,21,19,0.28)]">
        <CardHeader className="space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white">
                  Dashboard / Product pulse
                </Badge>
                <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/88">
                  {summary?.window.label ?? dashboardWindowOptions.find((item) => item.key === dashboardWindow)?.label}
                </Badge>
              </div>
              <div className="space-y-3">
                <CardTitle className="font-serif text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                  Сигналы смены, а не просто сводка.
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7 text-white/78">
                  Дашборд собран как точка входа в решения по ассортименту, витринам и операционным блокировкам.
                  Product и ops-метрики разведены, чтобы команда видела не только цифры, но и следующий шаг.
                </CardDescription>
              </div>
            </div>

            <div className="min-w-0 rounded-[1.6rem] border border-white/12 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md lg:max-w-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/58">Окно анализа</div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {summary?.window.label ?? dashboardWindowOptions.find((item) => item.key === dashboardWindow)?.label}
                  </div>
                </div>
                <Sparkles className="size-5 text-white/74" />
              </div>
              <Separator className="my-4 bg-white/12" />
              <div className="grid gap-3 text-sm text-white/74">
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

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {dashboardWindowOptions.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={dashboardWindow === option.key ? 'secondary' : 'ghost'}
                  className={cn(
                    'rounded-full border border-white/12 px-4 text-sm',
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
              <Button type="button" variant="ghost" className="rounded-full border border-white/10 bg-white/8 text-white hover:bg-white/14" onClick={() => onNavigate('inventory')}>
                Инвентарь
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="rounded-full border border-white/10 bg-white/8 text-white hover:bg-white/14" onClick={() => onNavigate('mixes')}>
                Миксы
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="rounded-full border border-white/10 bg-white/8 text-white hover:bg-white/14" onClick={() => onNavigate('rails')}>
                Рейлы
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="ghost" className="rounded-full border border-white/10 bg-white/8 text-white hover:bg-white/14" onClick={() => onNavigate('access')}>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card
              key={card.label}
              className={cn(
                'rounded-[1.8rem] border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,252,248,0.72))] shadow-[0_22px_56px_rgba(46,26,22,0.08)] backdrop-blur-xl',
                signalToneClass[card.tone],
              )}
            >
              <CardContent className="flex items-start justify-between gap-4 pt-4">
                <div className="space-y-3">
                  <Badge variant="outline" className="rounded-full border-stone-900/10 bg-white/72 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                    {card.tone === 'inventory' ? 'Inventory' : card.tone === 'product' ? 'Product' : 'Ops'}
                  </Badge>
                  <div className="space-y-1">
                    <div className="text-3xl font-semibold tracking-[-0.04em] text-stone-950">{formatMetricValue(card.value)}</div>
                    <div className="text-sm leading-6 text-stone-600">{card.label}</div>
                  </div>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-stone-900/8 bg-white/70 text-stone-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <BreakdownPanel
          title="Производители"
          kicker="Inventory"
          items={summary?.inventory.manufacturers ?? []}
          emptyText="Пока нет разреза по производителям."
          stockLine={(item) => `В наличии ${formatMetricValue(item.inStockCount)} из ${formatMetricValue(item.total)}`}
        />
        <BreakdownPanel
          title="Категории вкуса"
          kicker="Profiles"
          items={summary?.inventory.flavorProfiles ?? []}
          emptyText="Пока нет разреза по профилям."
          stockLine={(item) => `Нет в наличии ${formatMetricValue(item.outOfStockCount)} позиции`}
        />
        <BreakdownPanel
          title="Топ вкусов"
          kicker="Flavors"
          items={summary?.inventory.topFlavors ?? []}
          emptyText="Пока нет разреза по вкусам."
          stockLine={(item) => `В наличии ${formatMetricValue(item.inStockCount)} позиции`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-[2rem] border-white/60 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(255,248,240,0.82))] shadow-[0_26px_62px_rgba(46,26,22,0.08)] backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit rounded-full border-amber-900/10 bg-white/72 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-500">
              Product metrics
            </Badge>
            <div className="space-y-1">
              <CardTitle className="font-serif text-3xl font-semibold tracking-[-0.04em] text-stone-950">Выборы и оценки гостей</CardTitle>
              <CardDescription className="text-sm leading-6 text-stone-600">
                Что выбирают гости, как они оценивают миксы и где меняется динамика по дням.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.4rem] border border-amber-900/8 bg-white/82 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Выборы</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{formatMetricValue(summary?.smokeCtaTotal ?? 0)}</div>
              </div>
              <div className="rounded-[1.4rem] border border-amber-900/8 bg-white/82 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Оценки</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{formatMetricValue(summary?.ratingsTotal ?? 0)}</div>
              </div>
              <div className="rounded-[1.4rem] border border-amber-900/8 bg-white/82 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Средняя оценка</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">
                  {summary?.avgGuestRating ? summary.avgGuestRating.toFixed(1) : '0.0'}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.55rem] border border-stone-900/6 bg-white/74 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-stone-900">Топ по выбору</div>
                    <div className="text-xs leading-5 text-stone-500">Где больше всего кликов на «Покурить».</div>
                  </div>
                  <ChartColumnIncreasing className="size-4 text-stone-500" />
                </div>
                <div className="space-y-3">
                  {(summary?.topMixes ?? []).map((mix) => (
                    <div key={`top:${mix.mixId}`} className="rounded-[1.2rem] border border-stone-900/6 bg-stone-50/88 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-stone-900">{mix.name}</div>
                          <div className="text-xs leading-5 text-stone-500">
                            Рейтинг {mix.avgRating.toFixed(1)} · оценок {formatMetricValue(mix.ratingsCount)}
                          </div>
                        </div>
                        <Badge className="rounded-full bg-amber-500/14 px-3 py-1 text-amber-900">{formatMetricValue(mix.smokeCtaCount)}</Badge>
                      </div>
                    </div>
                  ))}
                  {!summary?.topMixes.length ? <div className="text-sm leading-6 text-stone-500">Пока нет данных по выборам.</div> : null}
                </div>
              </div>

              <div className="rounded-[1.55rem] border border-stone-900/6 bg-white/74 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-stone-900">Топ по оценкам</div>
                    <div className="text-xs leading-5 text-stone-500">Какие миксы получают лучший отклик гостей.</div>
                  </div>
                  <Star className="size-4 text-stone-500" />
                </div>
                <div className="space-y-3">
                  {(summary?.topRatedMixes ?? []).map((mix) => (
                    <div key={`rated:${mix.mixId}`} className="rounded-[1.2rem] border border-stone-900/6 bg-stone-50/88 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-stone-900">{mix.name}</div>
                          <div className="text-xs leading-5 text-stone-500">
                            Выборов {formatMetricValue(mix.smokeCtaCount)} · оценок {formatMetricValue(mix.ratingsCount)}
                          </div>
                        </div>
                        <Badge className="rounded-full bg-emerald-500/14 px-3 py-1 text-emerald-900">{mix.avgRating.toFixed(1)}</Badge>
                      </div>
                    </div>
                  ))}
                  {!summary?.topRatedMixes.length ? <div className="text-sm leading-6 text-stone-500">Пока нет guest-оценок за окно.</div> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="rounded-[1.55rem] border border-stone-900/6 bg-white/74 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-stone-900">Распределение оценок</div>
                    <div className="text-xs leading-5 text-stone-500">Где концентрируется guest feedback.</div>
                  </div>
                  <Sparkles className="size-4 text-stone-500" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(summary?.ratingDistribution ?? []).map((item) => (
                    <Badge key={`rating:${item.value}`} variant="outline" className="rounded-full border-stone-900/8 bg-white px-3 py-1.5 text-stone-700">
                      {item.value}★ · {formatMetricValue(item.count)}
                    </Badge>
                  ))}
                  {!summary?.ratingDistribution.length ? <div className="text-sm leading-6 text-stone-500">Пока нет распределения оценок.</div> : null}
                </div>
              </div>

              <div className="rounded-[1.55rem] border border-stone-900/6 bg-white/74 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-stone-900">Динамика по дням</div>
                    <div className="text-xs leading-5 text-stone-500">Смотрим не только абсолют, но и ритм спроса.</div>
                  </div>
                  <Flame className="size-4 text-stone-500" />
                </div>
                <div className="space-y-3">
                  {(summary?.activity ?? []).map((item) => (
                    <div key={item.date} className="rounded-[1.2rem] border border-stone-900/6 bg-stone-50/88 p-3.5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-stone-900">{formatDashboardDay(item.date)}</div>
                        <div className="text-xs text-stone-500">
                          Выборов {formatMetricValue(item.smokeCtaCount)} · оценок {formatMetricValue(item.ratingsCount)}
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-950/8">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(109,49,36,0.94),rgba(218,164,83,0.9))]"
                          style={{ width: `${percent(item.smokeCtaCount + item.ratingsCount, activityMax)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {!summary?.activity.length ? <div className="text-sm leading-6 text-stone-500">Пока нет динамики по дням.</div> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/60 bg-[linear-gradient(180deg,rgba(252,248,244,0.92),rgba(247,239,232,0.82))] shadow-[0_26px_62px_rgba(46,26,22,0.08)] backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit rounded-full border-amber-900/10 bg-white/72 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-500">
              Ops metrics
            </Badge>
            <div className="space-y-1">
              <CardTitle className="font-serif text-3xl font-semibold tracking-[-0.04em] text-stone-950">Сигналы для команды</CardTitle>
              <CardDescription className="text-sm leading-6 text-stone-600">
                Что мешает продажам сейчас и где надо действовать в инвентаре или витрине.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-stone-900/8 bg-white/82 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Гостю видно</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{formatMetricValue(summary?.ops.guestVisibleMixesCount ?? 0)}</div>
              </div>
              <div className="rounded-[1.4rem] border border-stone-900/8 bg-white/82 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Скрыто вручную</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{formatMetricValue(summary?.ops.hiddenMixesCount ?? 0)}</div>
              </div>
              <div className="rounded-[1.4rem] border border-stone-900/8 bg-white/82 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Активных рейлов</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{formatMetricValue(summary?.ops.activeRailsCount ?? 0)}</div>
              </div>
            </div>

            <div className="rounded-[1.55rem] border border-stone-900/6 bg-white/74 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-stone-900">Миксы, которые режет наличие</div>
                  <div className="text-xs leading-5 text-stone-500">Здесь спрос уже упирается в инвентарь.</div>
                </div>
                <TriangleAlert className="size-4 text-stone-500" />
              </div>
              <div className="space-y-3">
                {(summary?.ops.blockedMixes ?? []).map((mix) => (
                  <div key={`blocked:${mix.mixId}`} className="rounded-[1.2rem] border border-stone-900/6 bg-stone-50/88 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-stone-900">{mix.name}</div>
                        <div className="text-xs leading-5 text-stone-500">
                          Нет в наличии: {mix.missingComponents.join(', ') || 'не указано'}
                        </div>
                        <div className="text-xs leading-5 text-stone-500">
                          Рейлы: {mix.railNames.join(', ') || 'не участвует'}
                        </div>
                      </div>
                      <Badge className="rounded-full bg-rose-500/14 px-3 py-1 text-rose-900">{formatMetricValue(mix.smokeCtaCount)}</Badge>
                    </div>
                  </div>
                ))}
                {!summary?.ops.blockedMixes.length ? <div className="text-sm leading-6 text-stone-500">Пока нет миксов, заблокированных наличием.</div> : null}
              </div>
            </div>

            <div className="rounded-[1.55rem] border border-stone-900/6 bg-white/74 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-stone-900">Состояние рейлов</div>
                  <div className="text-xs leading-5 text-stone-500">Понимаем, где витрина ослаблена скрытыми или пустыми позициями.</div>
                </div>
                <Waypoints className="size-4 text-stone-500" />
              </div>
              <div className="space-y-3">
                {(summary?.ops.railHealth ?? []).map((rail) => (
                  <div key={`rail-health:${rail.railId}`} className="rounded-[1.2rem] border border-stone-900/6 bg-stone-50/88 p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-stone-900">{rail.name}</div>
                          <Badge variant="outline" className="rounded-full border-stone-900/8 bg-white px-2.5 py-0.5 text-[11px] text-stone-600">
                            {rail.type}
                          </Badge>
                        </div>
                        <div className="text-xs leading-5 text-stone-500">
                          Видимых миксов {formatMetricValue(rail.visibleMixCount)} из {formatMetricValue(rail.totalMixCount)}
                        </div>
                      </div>
                      <Badge className={cn('rounded-full px-3 py-1', rail.hiddenMixCount ? 'bg-rose-500/14 text-rose-900' : 'bg-emerald-500/14 text-emerald-900')}>
                        {rail.hiddenMixCount ? `Скрыто ${formatMetricValue(rail.hiddenMixCount)}` : 'Без блокировок'}
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-950/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(61,95,78,0.9),rgba(196,164,98,0.88))]"
                        style={{ width: `${percent(rail.visibleMixCount, rail.totalMixCount)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!summary?.ops.railHealth.length ? <div className="text-sm leading-6 text-stone-500">Пока нет данных по рейлам.</div> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.45rem] border border-stone-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(251,244,236,0.84))] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <Factory className="size-4 text-stone-500" />
                  Инвентарь
                </div>
                <div className="text-sm leading-6 text-stone-600">
                  Переключись в инвентаризацию, если blocked mixes растут или падает in-stock coverage по ключевым профилям.
                </div>
              </div>
              <div className="rounded-[1.45rem] border border-stone-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(251,244,236,0.84))] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <ShieldCheck className="size-4 text-stone-500" />
                  Витрина
                </div>
                <div className="text-sm leading-6 text-stone-600">
                  Переключись в рейлы, если растёт hidden count или активные rail-подборки теряют наполненность.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
