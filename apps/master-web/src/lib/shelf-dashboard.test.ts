import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bowlCostTile,
  forecastCaption,
  moneyCard,
  spendRows,
  spendTitle,
  stockValueTile,
  weekBars,
  weekLabel,
} from './shelf-dashboard';

// Intl ставит неразрывный пробел между разрядами.
const plain = (value: string) => value.replace(/\u00a0/g, ' ');

test('forecastCaption: чаши по граммовке и поправка на день недели двумя предложениями', () => {
  assert.equal(
    forecastCaption({ grams: 540, bowls: 30, weekdayFactor: 1.08, weekday: 4 }, 18),
    '30 чаш по 18 г. По четвергам выбирают на 8 % чаще среднего дня.',
  );
  assert.equal(
    forecastCaption({ grams: 300, bowls: 15.4, weekdayFactor: 0.95, weekday: 1 }, 20),
    '15 чаш по 20 г. По понедельникам выбирают на 5 % реже среднего дня.',
  );
  assert.equal(
    forecastCaption({ grams: 360, bowls: 20, weekdayFactor: 1.001, weekday: 7 }, 18),
    '20 чаш по 18 г. По воскресеньям выбирают как в средний день.',
  );
  assert.equal(
    forecastCaption({ grams: 18, bowls: 1, weekdayFactor: null, weekday: 2 }, 18),
    '1 чаша по 18 г. Мало данных, чтобы учесть день недели.',
  );
});

test('spendTitle: месяц из «YYYY-MM»', () => {
  assert.equal(spendTitle('2026-11'), 'Траты за ноябрь');
  assert.equal(spendTitle('2026-03'), 'Траты за март');
  assert.equal(spendTitle(''), 'Траты за месяц');
});

test('spendRows: полоса — доля от общей суммы, «без поставщика» подписан', () => {
  const rows = spendRows({
    month: '2026-11',
    bySupplier: [{ supplier: { id: 's1', name: 'Каспий Опт' }, sumKop: 6000000 }, { supplier: null, sumKop: 4000050 }],
    totalKop: 10000050,
  });
  assert.deepEqual(rows.map((row) => [row.key, row.name, plain(row.sum)]), [
    ['s1', 'Каспий Опт', '60 000 ₽'],
    ['none', 'Без поставщика', '40 001 ₽'],
  ]);
  assert.ok(Math.abs(rows[0].share - 0.6) < 0.001);
  assert.deepEqual(spendRows({ month: '2026-11', bySupplier: [], totalKop: 0 }), []);
});

test('bowlCostTile и stockValueTile: без «≈», без цен — прочерк с причиной', () => {
  assert.deepEqual(bowlCostTile(13700), { value: '137 ₽', hint: 'по ценам прихода' });
  assert.deepEqual(bowlCostTile(null), { value: '—', hint: 'нет цен прихода' });
  assert.equal(plain(stockValueTile(59400000).value), '594 000 ₽');
  assert.equal(stockValueTile(59400000).hint, 'по ценам прихода');
  assert.deepEqual(stockValueTile(0), { value: '—', hint: 'нет цен прихода' });
});

test('weekLabel: неделя в одном месяце, через границу месяца и текущая через запятую', () => {
  assert.equal(weekLabel({ from: '2026-10-19', to: '2026-10-25', grams: 0, partial: false }), '19–25 окт');
  assert.equal(weekLabel({ from: '2026-10-26', to: '2026-11-01', grams: 0, partial: false }), '26 окт–1 ноя');
  assert.equal(weekLabel({ from: '2026-11-16', to: '2026-11-19', grams: 0, partial: true }), '16–19 ноя, идёт');
  assert.equal(weekLabel({ from: '2026-11-16', to: '2026-11-16', grams: 0, partial: true }), '16 ноя, идёт');
});

test('weekBars: высота от максимума, граммы округлены, пусто — null', () => {
  const bars = weekBars([
    { from: '2026-11-02', to: '2026-11-08', grams: 3960.4, partial: false },
    { from: '2026-11-09', to: '2026-11-15', grams: 1980.2, partial: true },
  ]);
  assert.ok(bars);
  assert.deepEqual(bars.map((bar) => [bar.key, plain(bar.value), bar.partial]), [
    ['2026-11-02', '3 960', false],
    ['2026-11-09', '1 980', true],
  ]);
  assert.equal(bars[0].height, 1);
  assert.ok(Math.abs(bars[1].height - 0.5) < 0.001);
  assert.equal(weekBars([{ from: '2026-11-02', to: '2026-11-08', grams: 0, partial: false }]), null);
  assert.equal(weekBars([]), null);
});

const spend = { month: '2026-11', bySupplier: [], totalKop: 8721600 };
const budget = { budgetKop: 15000000, baseKop: 11200000, baseCount: 40, unknownCount: 9, leftKop: 3800000 };
const segmentsText = (segments: Array<{ text: string }>) => plain(segments.map((segment) => segment.text).join(''));

test('moneyCard с бюджетом: заголовок месяца, потрачено, база и остаток на пробы', () => {
  const card = moneyCard({ spend, budget });
  assert.equal(card.kind, 'budget');
  if (card.kind !== 'budget') return;
  assert.equal(plain(card.title), 'Ноябрь: бюджет 150 000 ₽');
  assert.equal(plain(card.spent), 'потрачено 87 216 ₽');
  assert.equal(plain(card.base), 'база 112 000 ₽ в месяц');
  assert.deepEqual({ ...card.left, value: plain(card.left.value) }, { label: 'на пробы остаётся', value: '38 000 ₽', tone: 'success' });
  assert.ok(Math.abs(card.spentShare - 0.58144) < 0.001);
  assert.ok(Math.abs(card.baseShare - 0.74667) < 0.001);
  assert.equal(card.unknown, 'У 9 табаков базы нет цены, сумма базы неполная.');
});

test('moneyCard: у всех цена — без предупреждения; база больше бюджета — полосы не вылезают', () => {
  const full = moneyCard({ spend, budget: { ...budget, unknownCount: 0 } });
  assert.equal(full.kind === 'budget' && full.unknown, null);
  const one = moneyCard({ spend, budget: { ...budget, unknownCount: 1 } });
  assert.equal(one.kind === 'budget' && one.unknown, 'У 1 табака базы нет цены, сумма базы неполная.');

  const over = moneyCard({ spend: { ...spend, totalKop: 20000000 }, budget: { ...budget, budgetKop: 10000000, leftKop: -1200000 } });
  assert.equal(over.kind, 'budget');
  if (over.kind !== 'budget') return;
  assert.deepEqual({ ...over.left, value: plain(over.left.value) }, { label: 'база больше бюджета на', value: '12 000 ₽', tone: 'danger' });
  assert.equal(over.spentShare, 1);
  assert.equal(over.baseShare, 1);

  const zero = moneyCard({ spend, budget: { ...budget, budgetKop: 0, leftKop: -11200000 } });
  assert.equal(zero.kind === 'budget' && zero.spentShare, 1);
});

test('moneyCard без бюджета: траты за месяц и приглашение указать бюджет', () => {
  const card = moneyCard({ spend, budget: { ...budget, budgetKop: null, leftKop: null } });
  assert.equal(card.kind, 'none');
  if (card.kind !== 'none') return;
  assert.equal(card.title, 'Траты за ноябрь');
  assert.equal(segmentsText(card.invite), 'База стоит 112 000 ₽ в месяц. Бюджет на табак не указан.');
  assert.deepEqual(card.invite.filter((segment) => segment.strong).map((segment) => plain(segment.text)), ['112 000 ₽']);
  // Базы нет — нечего и называть.
  const empty = moneyCard({ spend, budget: { budgetKop: null, baseKop: 0, baseCount: 0, unknownCount: 0, leftKop: null } });
  assert.equal(empty.kind === 'none' && segmentsText(empty.invite), 'Бюджет на табак не указан.');
});
