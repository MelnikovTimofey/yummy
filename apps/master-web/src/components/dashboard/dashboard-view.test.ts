import test from 'node:test';
import assert from 'node:assert/strict';
import { formatWindow } from './dashboard-view';

test('период дашборда: внутри месяца «10–23 октября», через границу — оба месяца', () => {
  assert.equal(formatWindow('2026-10-10T00:00:00', '2026-10-23T23:59:59'), '10–23 октября');
  assert.equal(formatWindow('2026-09-29T00:00:00', '2026-10-05T23:59:59'), '29 сентября – 5 октября');
  assert.equal(formatWindow('', '2026-10-05T23:59:59'), undefined);
});
