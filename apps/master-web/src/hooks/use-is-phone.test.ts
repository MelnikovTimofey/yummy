import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHONE_QUERY } from './use-is-phone';

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('телефонная вёрстка в styles.css включается той же границей, что и useIsPhone', () => {
  assert.ok(styles.includes(`@media ${PHONE_QUERY} {`));
  assert.ok(!styles.includes('@media (max-width: 640px) {'));
});

test('повёрнутый телефон — тоже телефон: невысокий сенсорный экран (#334)', () => {
  assert.match(PHONE_QUERY, /\(max-width: 640px\)/);
  assert.match(PHONE_QUERY, /\(max-height: 500px\) and \(pointer: coarse\)/);
});
