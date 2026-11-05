import { useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { CalendarRange, EyeOff, GalleryVerticalEnd, TriangleAlert, type LucideIcon } from 'lucide-react';

import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow, type MasterStatTile } from '@/components/shell/master-stats-row';
import { FilterChip } from '@/components/ui/filter-bar';
import { SmokeLoading } from '@/components/ui/loading';
import { ChartContainer, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { RangeCalendar } from '@/components/dashboard/range-calendar';
import { mixStatusTag } from '@/components/mixes/mix-status';
import { useIsPhone } from '@/hooks/use-is-phone';
import {
  formatCount,
  formatMetricValue,
  formatRating,
  type GuestChoices,
  type GuestChoicesPeriod,
  type GuestTobaccoStock,
  type GuestTopMix,
  type GuestTopTobacco,
} from '@/contracts';
import {
  axisTicks,
  barWidth,
  dayKey,
  profileSlices,
  rangeLabel,
  signalRows,
  tickInterval,
  timelineRows,
  type SignalKind,
} from '@/lib/guest-choices';

type DashboardViewProps = {
  data: GuestChoices | null;
  period: GuestChoicesPeriod;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  onPeriodChange: (period: GuestChoicesPeriod) => void;
  onSignal: (kind: SignalKind) => void;
};

type PeriodKey = GuestChoicesPeriod['key'];

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: '7d', label: 'Неделя' },
  { key: '30d', label: 'Месяц' },
  { key: '90d', label: 'Квартал' },
  { key: 'all', label: 'Всё время' },
  { key: 'custom', label: 'Даты' },
];

// Порог как APP_MIN_EVENTS на backend: меньше — графики не строим.
const MIN_CHOICES = 20;
const PHONE_TOP = 5;

const timelineConfig = {
  catalog: { label: 'Миксы каталога', color: 'var(--chart-1)' },
  own: { label: 'Свои миксы', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const phoneTimelineConfig = {
  catalog: timelineConfig.catalog,
  own: { label: 'Свои', color: 'var(--chart-5)' },
} satisfies ChartConfig;

// Плитки (#shot=month, mobile): на телефоне короче, под числом только витрина.
export const buildKpiTiles = (kpi: GuestChoices['kpi'], phone: boolean): MasterStatTile[] => {
  const rating = kpi.avgRating === null ? '—' : formatRating(kpi.avgRating);
  const ratings = kpi.ratingsCount ? `по ${formatCount(kpi.ratingsCount, ['оценке', 'оценкам', 'оценкам'])}` : 'оценок нет';
  return [
    { label: 'Выборов', value: formatMetricValue(kpi.choices), hint: phone ? undefined : '«Покурить» и свои миксы' },
    { label: 'Свои миксы', value: formatMetricValue(kpi.ownMixes), hint: phone ? undefined : 'собраны в «Намиксуй»' },
    {
      label: phone ? 'Миксов' : 'Миксов выбирали',
      value: formatMetricValue(kpi.mixesChosen),
      hint: `из ${formatMetricValue(kpi.mixesOnShowcase)}${phone ? '' : ' на витрине'}`,
    },
    { label: phone ? 'Оценка' : 'Оценка гостей', value: rating, hint: phone ? undefined : ratings },
  ];
};

export const noDataText = (period: GuestChoices['period'], choices: number) => {
  const range = rangeLabel(period);
  if (!choices) {
    return { title: 'Выборов нет', text: period.key === 'all' ? 'Гости пока ничего не выбирали.' : `За ${range} гости ничего не выбирали.` };
  }
  const head = range.charAt(0).toLocaleUpperCase('ru-RU') + range.slice(1);
  return {
    title: 'Мало данных',
    text: `${head}: ${formatCount(choices, ['выбор', 'выбора', 'выборов'])}. Графики появятся с ${MIN_CHOICES} выборов, выберите период длиннее.`,
  };
};

export const periodPressed = (key: PeriodKey, period: GuestChoicesPeriod, calendarOpen: boolean) =>
  calendarOpen ? key === 'custom' : period.key === key;

function Card({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="dash-card" aria-labelledby={id}>
      <div className="dash-card__head">
        <h2 id={id}>{title}</h2>
        {note ? <span className="dash-card__note">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

// «Выборы по дням / неделям» — shadcn Bar Chart, stacked. Наведённый столбец ярче остальных.
function Timeline({ data, phone }: { data: GuestChoices; phone: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const rows = timelineRows(data.timeline, data.period.bucket);
  const config = phone ? phoneTimelineConfig : timelineConfig;
  const ticks = axisTicks(Math.max(0, ...rows.map((row) => row.catalog + row.own)));
  const cells = rows.map((row, index) => (
    <Cell key={row.date} fillOpacity={active === null || active === index ? 1 : 0.55} />
  ));

  return (
    <ChartContainer config={config} className="dash-timeline" data-phone={phone || undefined}>
      <BarChart
        data={rows}
        margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
        barCategoryGap={data.period.bucket === 'week' ? '25%' : '19%'}
        accessibilityLayer
        onMouseMove={(state) => setActive(state.activeTooltipIndex == null ? null : Number(state.activeTooltipIndex))}
        onMouseLeave={() => setActive(null)}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="tick"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={tickInterval(rows.length, data.period.bucket, phone)}
        />
        <YAxis tickLine={false} axisLine={false} width={30} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="tip" />} />
        <Bar dataKey="catalog" stackId="choices" fill="var(--color-catalog)" isAnimationActive={false}>
          {cells}
        </Bar>
        <Bar dataKey="own" stackId="choices" fill="var(--color-own)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {cells}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

type BarTag = { label: string; tone?: 'success' | 'danger' | 'info' | 'warning'; ghost?: true };

// Наличие — как на «Полке»: «есть» или «закончился»; табак не с полки — призрачной меткой.
const STOCK_TAGS: Record<GuestTobaccoStock, BarTag> = {
  in: { label: 'есть', tone: 'success' },
  out: { label: 'закончился', tone: 'danger' },
  'off-shelf': { label: 'нет на полке', ghost: true },
};

type BarRow = { key: string; name: string; brand?: string; choices: number; tags: BarTag[]; rating?: number | null };

// Топы — горизонтальные столбцы с подписью внутри (shadcn Bar Chart layout="vertical",
// custom label). Столбцы нейтральные: акцент только у динамики.
function TopBars({ rows, phone }: { rows: BarRow[]; phone: boolean }) {
  const [all, setAll] = useState(false);
  const shown = phone && !all ? rows.slice(0, PHONE_TOP) : rows;
  const max = rows[0]?.choices ?? 0;
  return (
    <>
      <ol className="dash-bars">
        {shown.map((row) => (
          <li className="dash-bar" key={row.key}>
            <div className="dash-bar__track">
              <span className="dash-bar__fill" style={{ width: `${barWidth(row.choices, max)}%` }} aria-hidden="true" />
              <span className="dash-bar__label">
                <span className="dash-bar__name" title={row.brand ? `${row.brand} ${row.name}` : row.name}>
                  {row.name}
                </span>
                {row.brand ? <small>{row.brand}</small> : null}
                {row.tags.map((tag) => (
                  <span key={tag.label} className={tag.ghost ? 'tag tag--ghost' : 'tag'} data-tone={tag.tone}>
                    {tag.label}
                  </span>
                ))}
                {row.rating ? <span className="dash-bar__rating">★ {formatRating(row.rating)}</span> : null}
              </span>
            </div>
            <em>{formatMetricValue(row.choices)}</em>
          </li>
        ))}
      </ol>
      {shown.length < rows.length ? (
        <button type="button" className="btn dash-bars__all" data-variant="ghost" data-size="sm" onClick={() => setAll(true)}>
          Все {rows.length}
        </button>
      ) : null}
    </>
  );
}

export const tobaccoRows = (rows: GuestTopTobacco[]): BarRow[] =>
  rows.map((row) => ({
    key: row.tobaccoId,
    name: row.name,
    brand: row.manufacturer,
    choices: row.choices,
    tags: [...(row.stock ? [STOCK_TAGS[row.stock]] : []), ...(row.trial ? [{ label: 'проба' }] : [])],
  }));

// Статус микса — тот же тег, что в «Миксах».
export const mixRows = (rows: GuestTopMix[]): BarRow[] =>
  rows.map((row) => ({
    key: row.mixId ?? `deleted:${row.mixName}`,
    name: row.mixName,
    choices: row.choices,
    tags: row.status ? [mixStatusTag(row.status)] : [],
    rating: row.avgRating,
  }));

// «Вкусы» — shadcn Pie Chart, donut with text; цвета — слой данных --profile-*.
function Flavors({ data, phone }: { data: GuestChoices; phone: boolean }) {
  const slices = profileSlices(data.profiles);
  const size = phone ? 120 : 200;
  return (
    <div className="dash-flavors">
      <div className="dash-donut" style={{ width: size, height: size }}>
        <ChartContainer config={{}} style={{ width: size, height: size }}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" valueFormatter={(value) => `${value}%`} />} />
            <Pie
              data={slices}
              dataKey="share"
              nameKey="label"
              innerRadius={phone ? 40 : 70}
              outerRadius={phone ? 58 : 96}
              startAngle={90}
              endAngle={-270}
              stroke="var(--bg-raised)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {/* Число в центре кольца (donut with text) поверх графика, подсказкам не мешает. */}
        <div className="dash-donut__center" aria-hidden="true">
          <b>{formatMetricValue(data.kpi.choices)}</b>
          <span>{formatCount(data.kpi.choices, ['выбор', 'выбора', 'выборов']).split(' ').pop()}</span>
        </div>
      </div>
      <ul className="dash-shares">
        {slices.map((slice) => (
          <li key={slice.key}>
            <i style={{ background: slice.color }} aria-hidden="true" />
            <span>{slice.label}</span>
            <em>{slice.share}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SIGNAL_ICONS: Record<SignalKind, LucideIcon> = { out: TriangleAlert, hidden: EyeOff, rail: GalleryVerticalEnd };

function Signals({ data, onSignal }: { data: GuestChoices; onSignal: (kind: SignalKind) => void }) {
  const rows = signalRows(data.signals, data.topTobaccos);
  if (!rows.length) return <p className="empty">Сигналов нет.</p>;
  return (
    <ul className="dash-signals">
      {rows.map((row) => {
        const Icon = SIGNAL_ICONS[row.kind];
        return (
          <li className="dash-signal" data-kind={row.kind} key={row.kind}>
            <Icon size={15} aria-hidden="true" />
            <span>{row.text}</span>
            <button type="button" className="btn" data-variant="ghost" data-size="sm" onClick={() => onSignal(row.kind)}>
              {row.action}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Дашборд (#520, design/design_handoff_guest_analytics): выборы гостей за период.
// Меньше 20 выборов — одна карточка «Мало данных» вместо графиков, плитки и сигналы остаются.
export function DashboardView({ data, period, status, error, onPeriodChange, onSignal }: DashboardViewProps) {
  const phone = useIsPhone();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = dayKey(new Date());
  const range = data ? rangeLabel(data.period) : '';

  const choosePeriod = (key: PeriodKey) => {
    if (key === 'custom') {
      setCalendarOpen((open) => !open);
      return;
    }
    setCalendarOpen(false);
    onPeriodChange({ key });
  };

  const calendar = calendarOpen ? (
    <RangeCalendar
      initial={period.key === 'custom' ? { from: period.from, to: period.to } : null}
      today={today}
      months={phone ? 1 : 2}
      onApply={(from, to) => {
        setCalendarOpen(false);
        onPeriodChange({ key: 'custom', from, to });
      }}
      onClose={() => setCalendarOpen(false)}
    />
  ) : null;

  const periodControls = phone ? (
    <div className="dash-chips" role="group" aria-label="Период">
      {PERIODS.map((item) => (
        <span key={item.key} data-calendar-toggle={item.key === 'custom' || undefined}>
          <FilterChip active={periodPressed(item.key, period, calendarOpen)} onClick={() => choosePeriod(item.key)}>
            {item.label}
          </FilterChip>
        </span>
      ))}
    </div>
  ) : (
    <div className="shelf-seg dash-seg" role="group" aria-label="Период">
      {PERIODS.map((item) => (
        <button
          type="button"
          key={item.key}
          aria-pressed={periodPressed(item.key, period, calendarOpen)}
          data-calendar-toggle={item.key === 'custom' || undefined}
          onClick={() => choosePeriod(item.key)}
        >
          {item.key === 'custom' ? <CalendarRange size={14} aria-hidden="true" /> : null}
          {item.label}
        </button>
      ))}
    </div>
  );

  const nothing = data && !data.enough ? noDataText(data.period, data.kpi.choices) : null;
  const signals = data ? (
    <Card id="dash-signals" title="Сигналы">
      <Signals data={data} onSignal={onSignal} />
    </Card>
  ) : null;

  return (
    <section className="dashboard-page" aria-busy={status === 'loading' || undefined}>
      {phone ? (
        <div className="dash-phone-head">
          <h1 className="sr-only">Дашборд</h1>
          {periodControls}
          {calendar}
          {range ? <span className="dash-range">{range}</span> : null}
        </div>
      ) : (
        <MasterPageHeader
          title="Дашборд"
          actions={
            <div className="dash-period">
              {range ? <span className="dash-range">{range}</span> : null}
              {periodControls}
              {calendar}
            </div>
          }
        />
      )}

      {error ? (
        <div className="dashboard-page__error" role="status">
          {error}
        </div>
      ) : null}

      {!data ? (
        status === 'error' ? null : <SmokeLoading label="Загружаем выборы гостей" />
      ) : (
        <div className="dash-body">
          <MasterStatsRow tiles={buildKpiTiles(data.kpi, phone)} />
          {nothing ? (
            <>
              <section className="dash-card dash-few" role="status">
                <b>{nothing.title}</b>
                <span>{nothing.text}</span>
              </section>
              {signals}
            </>
          ) : (
            <>
              <section className="dash-card" aria-labelledby="dash-timeline">
                <div className="dash-card__head">
                  <h2 id="dash-timeline">{data.period.bucket === 'week' ? 'Выборы по неделям' : 'Выборы по дням'}</h2>
                  {phone ? null : <ChartLegendContent config={timelineConfig} />}
                </div>
                <Timeline data={data} phone={phone} />
                {phone ? <ChartLegendContent config={phoneTimelineConfig} /> : null}
              </section>
              <div className="dash-grid">
                <Card id="dash-tobaccos" title="Популярные табаки" note={phone ? undefined : 'в скольких выборах'}>
                  <TopBars rows={tobaccoRows(data.topTobaccos)} phone={phone} />
                </Card>
                <Card id="dash-mixes" title="Популярные миксы" note={phone ? undefined : 'выборов'}>
                  {data.topMixes.length ? <TopBars rows={mixRows(data.topMixes)} phone={phone} /> : <p className="empty">Только свои миксы.</p>}
                </Card>
                <Card id="dash-flavors" title="Вкусы" note={phone ? undefined : 'доля выборов'}>
                  <Flavors data={data} phone={phone} />
                </Card>
                {signals}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
