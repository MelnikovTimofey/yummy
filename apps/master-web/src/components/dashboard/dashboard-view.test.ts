import test from 'node:test';
import assert from 'node:assert/strict';
import type { DashboardSummary } from '@/contracts';
import { buildStatsTiles, formatWindow } from './dashboard-view';

test('период дашборда: внутри месяца «10–23 октября», через границу — оба месяца', () => {
  assert.equal(formatWindow('2026-10-10T00:00:00', '2026-10-23T23:59:59'), '10–23 октября');
  assert.equal(formatWindow('2026-09-29T00:00:00', '2026-10-05T23:59:59'), '29 сентября – 5 октября');
  assert.equal(formatWindow('', '2026-10-05T23:59:59'), undefined);
});

test('KPI дашборда: подписи sentence case, хвосты сокращены до одного факта', () => {
  const tiles = buildStatsTiles({
    totalTobaccos: 11528,
    inStockCount: 290,
    ops: { guestVisibleMixesCount: 15, blockedByInventoryCount: 0, activeRailsCount: 7, blockedMixes: [] },
  } as unknown as DashboardSummary);
  const plain = (value: unknown) => (value === undefined ? null : String(value).replace(/\u00a0|\u202f/g, ' '));
  assert.deepEqual(
    tiles.map((tile) => [tile.label, plain(tile.value), plain(tile.hint)]),
    [
      ['В наличии', '290', 'из 11 528 табаков'],
      ['Видно гостю', '15', 'миксов'],
      ['Заблокировано', '0', null],
      ['Активных рейлов', '7', null],
    ],
  );
});
