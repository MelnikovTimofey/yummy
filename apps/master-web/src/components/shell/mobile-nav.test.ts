import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_MORE_TABS, MOBILE_NAV, mobileNavItemFor, mobileTitleFor } from './mobile-nav';

test('нижняя навигация: Дашборд · Полка · Поставки · Ещё', () => {
  assert.deepEqual(
    MOBILE_NAV.map((item) => item.label),
    ['Дашборд', 'Полка', 'Поставки', 'Ещё'],
  );
  assert.deepEqual(MOBILE_MORE_TABS.map((tab) => tab.label), ['Каталог', 'Миксы', 'Рейлы', 'Доступ']);
});

test('разделы из «Ещё» подсвечивают пункт «Ещё»', () => {
  assert.equal(mobileNavItemFor('dashboard'), 'dashboard');
  assert.equal(mobileNavItemFor('shelf'), 'shelf');
  assert.equal(mobileNavItemFor('deliveries'), 'deliveries');
  assert.equal(mobileNavItemFor('catalog'), 'more');
  assert.equal(mobileNavItemFor('access'), 'more');
});

test('заголовок верхней панели — раздел, на полке в режиме «К заказу» — «К заказу»', () => {
  assert.equal(mobileTitleFor('shelf', 'shelf'), 'Полка');
  assert.equal(mobileTitleFor('shelf', 'reorder'), 'К заказу');
  assert.equal(mobileTitleFor('dashboard', 'reorder'), 'Дашборд');
  assert.equal(mobileTitleFor('rails', 'shelf'), 'Рейлы');
});
