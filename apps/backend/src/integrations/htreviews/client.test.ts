import assert from 'node:assert/strict';
import test from 'node:test';
import { HtReviewsClient } from './client';

// Issue #246: регулярный обход представляется своим именем и контактом, а не
// выдаёт себя за браузер со ссылкой на сам htreviews.
test('User-Agent называет сервис и контакт', () => {
  const { userAgent } = new HtReviewsClient();

  assert.match(userAgent, /^AromaAtelierCatalogSync\/\d/);
  assert.match(userAgent, /\+https:\/\/github\.com\/MelnikovTimofey\/yummy/);
  assert.doesNotMatch(userAgent, /Mozilla|htreviews\.org/);
});

test('пауза между запросами по умолчанию не меньше 250 мс', () => {
  assert.ok(new HtReviewsClient().delayMs >= 250);
});
