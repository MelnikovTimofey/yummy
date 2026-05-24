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

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { dashboardWindowOptions, DashboardBreakdownItem, DashboardSummary, DashboardWindowKey, formatFlavorProfileLabel, formatMetricValue } from '@/contracts';

const activityChartConfig = {
  smokeCta: { label: 'Выборы', color: 'var(--accent-copper)' },
  ratings: { label: 'Оценки', color: 'var(--accent-sand)' },
} satisfies ChartConfig;

const ratingChartConfig = {
  count: { label: 'Оценок', color: 'var(--accent-sand)' },
} satisfies ChartConfig;

const manufacturersChartConfig = {
  inStock: { label: 'В наличии', color: 'var(--accent-sand)' },
  outOfStock: { label: 'Нет наличия', color: 'rgba(206,106,90,0.7)' },
} satisfies ChartConfig;

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

const StockBreakdownChart = ({
  title,
  kicker,
  description,
  items,
  emptyText,
  formatItemLabel = (label: string) => label,
}: {
  title: string;
  kicker: string;
  description: string;
  items: DashboardBreakdownItem[];
  emptyText: string;
  formatItemLabel?: (label: string) => string;
}) => {
  return (
    <Card className="flex h-full flex-col rounded-[1.4rem] border-[rgba(226,172,123,0.1)] bg-[linear-gradient(180deg,rgba(23,20,23,0.96),rgba(15,14,17,0.92))] shadow-[0_18px_42px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <CardHeader className="space-y-1.5 p-5 pb-2">
        <Badge variant="outline" className="w-fit rounded-full border-[rgba(226,172,123,0.12)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgba(226,172,123,0.78)]">
          {kicker}
        </Badge>
        <CardTitle className="text-[1.3rem] font-semibold tracking-[-0.03em] text-[var(--nomad-ink)]">{title}</CardTitle>
        <CardDescription className="text-[13px] leading-5 text-[rgba(241,229,215,0.58)]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-5 pb-5">
        {items.length ? (
          <ChartContainer config={manufacturersChartConfig} className="h-[300px] w-full">
            <BarChart
              data={items.map((item) => ({
                name: formatItemLabel(item.label),
                inStock: item.inStockCount,
                outOfStock: item.outOfStockCount,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="rgba(226,172,123,0.08)" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(241,229,215,0.4)', fontSize: 10 }}
                allowDecimals={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={130}
                tick={{ fill: 'rgba(241,229,215,0.72)', fontSize: 11 }}
                interval={0}
              />
              <ChartTooltip cursor={{ fill: 'rgba(226,172,123,0.06)' }} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="inStock" stackId="stock" fill="var(--color-inStock)" radius={[4, 0, 0, 4]} />
              <Bar dataKey="outOfStock" stackId="stock" fill="var(--color-outOfStock)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">{emptyText}</div>
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

  return (
    <section className="grid w-full gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(20,18,21,0.94),rgba(15,14,17,0.88))] px-4 py-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
        <div className="flex flex-wrap items-center gap-2">
          {dashboardWindowOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={cn(
                'window-toggle',
                dashboardWindow === option.key && 'window-toggle--active',
              )}
              onClick={() => void onSelectDashboardWindow(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[rgba(241,229,215,0.7)]">
          <Sparkles className="size-3.5 text-[var(--accent-sand)]" />
          <span>Окно: <strong className="text-[var(--nomad-ink)]">{formatRange(summary?.window.startsAt ?? '', summary?.window.endsAt ?? '')}</strong></span>
          <span aria-hidden="true" className="text-[rgba(241,229,215,0.4)]">·</span>
          <span>{summaryStatus === 'loading' ? 'Обновляем' : summaryStatus === 'ready' ? 'Актуально' : 'Ожидает'}</span>
        </div>
      </div>

      {summaryError ? (
        <div className="rounded-[1.1rem] border border-rose-200/24 bg-rose-500/10 px-4 py-3 text-sm text-[var(--nomad-ink)]">
          {summaryError}
        </div>
      ) : null}

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

      <div className="grid gap-3 xl:auto-rows-fr xl:grid-cols-3">
        <StockBreakdownChart
          title="Производители"
          kicker="Наличие"
          description="В наличии vs нет наличия по линейкам."
          items={summary?.inventory.manufacturers ?? []}
          emptyText="Пока нет разреза по производителям."
        />
        <StockBreakdownChart
          title="Категории вкуса"
          kicker="Категории"
          description="Покрытие категорий по наличию."
          items={summary?.inventory.flavorProfiles ?? []}
          emptyText="Пока нет разреза по профилям."
          formatItemLabel={formatFlavorProfileLabel}
        />
        <StockBreakdownChart
          title="Топ вкусов"
          kicker="Вкусы"
          description="Где собирается спрос гостей."
          items={summary?.inventory.topFlavors ?? []}
          emptyText="Пока нет разреза по вкусам."
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2 xl:auto-rows-fr">
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

            {summary?.topMixes.length || summary?.topRatedMixes.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {summary?.topMixes.length ? (
                  <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Топ по выбору</div>
                        <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Где больше всего кликов на «Покурить».</div>
                      </div>
                      <ChartColumnIncreasing className="size-4 text-[rgba(241,229,215,0.48)]" />
                    </div>
                    <div className="space-y-2">
                      {summary.topMixes.map((mix) => (
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
                    </div>
                  </div>
                ) : null}

                {summary?.topRatedMixes.length ? (
                  <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Топ по оценкам</div>
                        <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Какие миксы получают лучший отклик гостей.</div>
                      </div>
                      <Star className="size-4 text-[rgba(241,229,215,0.48)]" />
                    </div>
                    <div className="space-y-2">
                      {summary.topRatedMixes.map((mix) => (
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
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3">
              <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Распределение оценок</div>
                    <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Как гости оценивают миксы.</div>
                  </div>
                  <Sparkles className="size-4 text-[rgba(241,229,215,0.48)]" />
                </div>
                {summary?.ratingDistribution.length && summary.ratingDistribution.some((r) => r.count > 0) ? (
                  <ChartContainer config={ratingChartConfig} className="h-[180px] w-full">
                    <BarChart
                      data={[...summary.ratingDistribution].sort((a, b) => a.value - b.value).map((item) => ({
                        rating: `${item.value}★`,
                        count: item.count,
                      }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="rgba(226,172,123,0.08)" />
                      <XAxis
                        dataKey="rating"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'rgba(241,229,215,0.58)', fontSize: 11 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        tick={{ fill: 'rgba(241,229,215,0.4)', fontSize: 10 }}
                        allowDecimals={false}
                      />
                      <ChartTooltip cursor={{ fill: 'rgba(226,172,123,0.06)' }} content={<ChartTooltipContent indicator="dot" />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет распределения оценок.</div>
                )}
              </div>

              <div className="rounded-[1.2rem] border border-[rgba(226,172,123,0.08)] bg-[linear-gradient(180deg,rgba(28,24,27,0.94),rgba(18,16,19,0.88))] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--nomad-ink)]">Динамика по дням</div>
                    <div className="text-[11px] leading-4.5 text-[rgba(241,229,215,0.56)]">Выборы и оценки гостей в одном окне.</div>
                  </div>
                  <Flame className="size-4 text-[rgba(241,229,215,0.48)]" />
                </div>
                {summary?.activity.length && summary.activity.some((d) => d.smokeCtaCount > 0 || d.ratingsCount > 0) ? (
                  <ChartContainer config={activityChartConfig} className="h-[220px] w-full">
                    <AreaChart
                      data={summary.activity.map((item) => ({
                        date: formatDashboardDay(item.date),
                        smokeCta: item.smokeCtaCount,
                        ratings: item.ratingsCount,
                      }))}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fillSmokeCta" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-smokeCta)" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="var(--color-smokeCta)" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="fillRatings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-ratings)" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="var(--color-ratings)" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(226,172,123,0.08)" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'rgba(241,229,215,0.58)', fontSize: 11 }}
                        interval="preserveStartEnd"
                        minTickGap={28}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        tick={{ fill: 'rgba(241,229,215,0.4)', fontSize: 10 }}
                        allowDecimals={false}
                      />
                      <ChartTooltip cursor={{ stroke: 'rgba(226,172,123,0.2)' }} content={<ChartTooltipContent indicator="line" />} />
                      <Area type="monotone" dataKey="smokeCta" stroke="var(--color-smokeCta)" strokeWidth={2} fill="url(#fillSmokeCta)" stackId="1" />
                      <Area type="monotone" dataKey="ratings" stroke="var(--color-ratings)" strokeWidth={2} fill="url(#fillRatings)" stackId="1" />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="text-[13px] leading-5 text-[rgba(241,229,215,0.56)]">Пока нет динамики по дням.</div>
                )}
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
                        style={{ width: `${rail.totalMixCount ? Math.max(12, Math.round((rail.visibleMixCount / rail.totalMixCount) * 100)) : 0}%` }}
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
