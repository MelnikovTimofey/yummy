import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bowlCostTile,
  forecastCaption,
  spendRows,
  spendTitle,
  stockValueTile,
  weekBars,
  weekLabel,
} from './shelf-dashboard';

// Intl ставит неразрывный пробел между разрядами.
const plain = (value: string) => value.replace(/\u00a0/g, ' ');

test('forecastCaption: чаши по граммовке и поправка на день недели', () => {
  assert.equal(
    forecastCaption({ grams: 540, bowls: 30, weekdayFactor: 1.08, weekday: 4 }, 18),
    '≈ 30 чаш по 18 г · четверг: +8 % к среднему дню по «Покурить»',
  );
  assert.equal(
    forecastCaption({ grams: 300, bowls: 15.4, weekdayFactor: 0.95, weekday: 1 }, 20),
    '≈ 15 чаш по 20 г · понедельник: −5 % к среднему дню по «Покурить»',
  );
  assert.equal(
    forecastCaption({ grams: 360, bowls: 20, weekdayFactor: 1.001, weekday: 7 }, 18),
    '≈ 20 чаш по 18 г · воскресенье: как средний день по «Покурить»',
  );
  assert.equal(
    forecastCaption({ grams: 18, bowls: 1, weekdayFactor: null, weekday: 2 }, 18),
    '≈ 1 чаша по 18 г · без поправки на день недели — мало данных',
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

test('bowlCostTile и stockValueTile: без цен — прочерк с причиной', () => {
  assert.deepEqual(bowlCostTile(13700, 18), { value: '≈ 137 ₽', hint: '18 г по средней цене грамма табаков на полке' });
  assert.deepEqual(bowlCostTile(null, 18), { value: '—', hint: 'нет цен прихода у табаков на полке' });
  assert.equal(plain(stockValueTile(59400000).value), '≈ 594 000 ₽');
  assert.equal(stockValueTile(59400000).hint, 'по ценам прихода');
  assert.deepEqual(stockValueTile(0), { value: '—', hint: 'нет цен прихода' });
});

test('weekLabel: неделя в одном месяце, через границу месяца и текущая', () => {
  assert.equal(weekLabel({ from: '2026-10-19', to: '2026-10-25', grams: 0, partial: false }), '19–25 окт');
  assert.equal(weekLabel({ from: '2026-10-26', to: '2026-11-01', grams: 0, partial: false }), '26 окт–1 ноя');
  assert.equal(weekLabel({ from: '2026-11-16', to: '2026-11-19', grams: 0, partial: true }), '16–19 ноя · идёт');
  assert.equal(weekLabel({ from: '2026-11-16', to: '2026-11-16', grams: 0, partial: true }), '16 ноя · идёт');
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
