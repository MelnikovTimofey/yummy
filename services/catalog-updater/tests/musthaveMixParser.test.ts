import assert from 'node:assert/strict';
import test from 'node:test';

import { extractMix } from '../src/importers/musthaveMixParser';

test('extractMix parses a valid mix card', () => {
  const html = `
    <article>
      <script>window.bad = true;</script>
      <h1>Ягоды &amp; Лед</h1>
      <div>#ID 321</div>
      <div>2024</div>
      <div>Автор</div>
      <p>Яркий микс с прохладой</p>
      <div>Berry Juice</div>
      <div>60%</div>
      <div>MustHave Base</div>
      <div>40%</div>
    </article>
  `;

  assert.deepStrictEqual(extractMix(html, 321), {
    name: 'Ягоды & Лед',
    description: 'Яркий микс с прохладой',
    components: [{ manufacturer: 'MUSTHAVE', tobacco: 'Berry Juice', proportion: 60 }],
  });
});

test('extractMix returns null when the card does not contain the requested #ID', () => {
  const html = `
    <article>
      <h1>Без идентификатора</h1>
      <div>2024</div>
      <p>Карточка без нужного номера</p>
    </article>
  `;

  assert.equal(extractMix(html, 999), null);
});

test('extractMix deduplicates duplicate components by tobacco name', () => {
  const html = `
    <article>
      <h1>Повтор вкуса</h1>
      <div>#ID 555</div>
      <div>2023</div>
      <div>Автор</div>
      <p>Проверка дубликатов</p>
      <div>Banana Papa</div>
      <div>30%</div>
      <div>Banana Papa</div>
      <div>70%</div>
    </article>
  `;

  assert.deepStrictEqual(extractMix(html, 555), {
    name: 'Повтор вкуса',
    description: 'Проверка дубликатов',
    components: [{ manufacturer: 'MUSTHAVE', tobacco: 'Banana Papa', proportion: 70 }],
  });
});

test('extractMix tolerates broken or partial HTML without throwing', () => {
  const html = '<article><div>#ID 777<div><div>2024';

  assert.doesNotThrow(() => extractMix(html, 777));
  assert.equal(extractMix(html, 777), null);
});
