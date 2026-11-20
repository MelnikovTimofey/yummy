import test from 'node:test';
import assert from 'node:assert/strict';
import { awaitsPlan, mixStatusTag, substitutionNote } from './mix-status';

// Статус микса в «Миксах» (#481, мокап analogs @ a74ab4c2, экран mixes).

test('метка статуса: «с заменой» — info, «блокирован» — warning, «скрыт» — ghost', () => {
  assert.deepEqual(mixStatusTag('visible'), { label: 'виден' });
  assert.deepEqual(mixStatusTag('substituted'), { label: 'с заменой', tone: 'info' });
  assert.deepEqual(mixStatusTag('hidden'), { label: 'скрыт', ghost: true });
  assert.deepEqual(mixStatusTag('blocked'), { label: 'блокирован', tone: 'warning' });
});

test('пара замены: «Lemon Shock вместо Lemonblast»', () => {
  assert.equal(
    substitutionNote({
      from: { tobaccoId: 'a', manufacturer: 'Darkside', name: 'Lemonblast' },
      to: { tobaccoId: 'b', manufacturer: 'Black Burn', name: 'Lemon Shock' },
    }),
    'Lemon Shock вместо Lemonblast',
  );
});

test('одноимённые табаки в паре замены различаются брендом', () => {
  assert.equal(
    substitutionNote({
      from: { tobaccoId: 'a', manufacturer: 'Starline', name: 'Гранатовый сок' },
      to: { tobaccoId: 'b', manufacturer: 'Сарма', name: 'Гранатовый сок' },
    }),
    'Сарма Гранатовый сок вместо Starline Гранатовый сок',
  );
});

// #566 (#shot=mixes): «Ждёт табак из плана» — blocked, когда все недостающие табаки в плане.
const missing = (tobaccoId: string, planned: boolean) => ({ tobaccoId, manufacturer: 'Bonche', name: tobaccoId, onShelf: true, planned });

test('ждёт план: заблокирован, и все недостающие табаки в плане', () => {
  assert.equal(awaitsPlan({ status: 'blocked', missing: [missing('clover-club', true)] }), true);
  assert.equal(awaitsPlan({ status: 'blocked', missing: [missing('clover-club', true), missing('tarhun', true)] }), true);
});

test('не ждёт план: один из недостающих не в плане, замена или скрыт', () => {
  assert.equal(awaitsPlan({ status: 'blocked', missing: [missing('clover-club', true), missing('cane-mint', false)] }), false);
  assert.equal(awaitsPlan({ status: 'substituted', missing: [missing('clover-club', true)] }), false);
  assert.equal(awaitsPlan({ status: 'hidden', missing: [missing('clover-club', true)] }), false);
  assert.equal(awaitsPlan({ status: 'blocked', missing: [] }), false);
});
