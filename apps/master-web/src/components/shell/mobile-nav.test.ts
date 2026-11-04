import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_MORE_TABS, MOBILE_NAV, mobileNavItemFor, mobileTitleFor, openSection } from './mobile-nav';

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

test('заголовок верхней панели — раздел; «К заказу» переключается на самой полке (#518)', () => {
  assert.equal(mobileTitleFor('shelf'), 'Полка');
  assert.equal(mobileTitleFor('dashboard'), 'Дашборд');
  assert.equal(mobileTitleFor('rails'), 'Рейлы');
});

test('раздел из нижней навигации открывается с начала, а не на прокрутке прошлого (#334)', () => {
  const calls: string[] = [];
  openSection('dashboard', (tab) => calls.push(`tab:${tab}`), () => calls.push('top'));
  assert.deepEqual(calls, ['tab:dashboard', 'top']);
});
