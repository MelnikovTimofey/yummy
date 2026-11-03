/* eslint-disable */
// Данные мокапа #520: выборы гостей за период. «Сегодня» — 4 ноября.
// Выбор — «Покурить» у микса каталога или свой микс из «Намиксуй». Табак считается целиком
// за каждый выбор микса, где он есть; при замене аналогом — табак с полки.
(function () {
  const days = [];
  const base = [14, 12, 13, 15, 22, 31, 27, 13, 15, 14, 16, 24, 33, 29, 15, 13, 16, 17, 26, 35, 30, 16, 14, 17, 18, 27, 36, 31, 17, 15];
  const own = [2, 2, 3, 2, 4, 6, 5, 2, 3, 3, 3, 5, 6, 6, 3, 2, 3, 4, 5, 7, 6, 3, 3, 4, 4, 5, 7, 6, 4, 3];
  const wd = ['вт', 'ср', 'чт', 'пт', 'сб', 'вс', 'пн'];
  for (let i = 0; i < 30; i++) {
    const d = 6 + i;
    const label = d <= 31 ? d + ' окт' : d - 31 + ' ноя';
    days.push({ label, short: String(d <= 31 ? d : d - 31), wd: wd[(i + 6) % 7], catalog: base[i] - own[i], own: own[i] });
  }
  // Недели с понедельника; до 5 октября выборов не было. Суммы сходятся с днями.
  const weeks = ['3 авг', '10 авг', '17 авг', '24 авг', '31 авг', '7 сен', '14 сен', '21 сен', '28 сен'].map((label) => ({ label, catalog: 0, own: 0 }));
  ['5 окт', '12 окт', '19 окт', '26 окт', '2 ноя'].forEach((label, w) => {
    const from = w === 0 ? 0 : 6 + (w - 1) * 7;
    const part = days.slice(from, w === 0 ? 6 : from + 7);
    weeks.push({ label, catalog: part.reduce((a, d) => a + d.catalog, 0), own: part.reduce((a, d) => a + d.own, 0) });
  });

  window.GA = {
    today: '4 ноября',
    periods: [
      { id: 'week', label: 'Неделя', range: '29 октября – 4 ноября' },
      { id: 'month', label: 'Месяц', range: '6 октября – 4 ноября' },
      { id: 'quarter', label: 'Квартал', range: '6 августа – 4 ноября' },
      { id: 'all', label: 'Всё время', range: 'с 6 октября' },
      { id: 'custom', label: 'Даты', range: '13 – 26 октября' },
    ],
    kpi: { choices: 621, own: 121, mixesChosen: 58, mixesTotal: 64, rating: '4,6', ratings: 87, hidden: 5 },
    days,
    weeks,
    tobaccos: [
      { name: 'Red Tea', brand: 'Darkside', n: 96 },
      { name: 'Wildberry', brand: 'Darkside', n: 88 },
      { name: 'Cane Mint', brand: 'Black Burn', n: 81, mark: 'out' },
      { name: 'Таежный чай', brand: 'Сарма', n: 64 },
      { name: 'Raspberries', brand: 'Black Burn', n: 58 },
      { name: 'Mango Lassi 2.0', brand: 'Darkside', n: 51 },
      { name: 'Supernova', brand: 'Darkside', n: 47, mark: 'out' },
      { name: 'Ice Mint', brand: 'Musthave', n: 44 },
      { name: 'Panama', brand: 'Хулиган', n: 31, mark: 'trial' },
      { name: 'Cheesecake', brand: 'Black Burn', n: 29 },
    ],
    mixes: [
      { name: 'Морозная ягода', n: 74, rating: '4,7' },
      { name: 'Космокола', n: 61, rating: '4,5' },
      { name: 'Тропики', n: 55, rating: '4,6' },
      { name: 'Pineapple Mint', n: 48, rating: '4,4', mark: 'analog' },
      { name: 'Cinnamon Red Tea', n: 41, rating: '4,8' },
      { name: 'Малиновый морс', n: 38, rating: '4,5' },
      { name: 'Melon Cola', n: 33, rating: '4,2', mark: 'hidden' },
      { name: 'Таежный сбор', n: 30, rating: '4,6' },
      { name: 'Lemon Pineapple', n: 27, rating: null },
      { name: 'Ягодный лимонад', n: 25, rating: '4,3' },
    ],
    profiles: [
      { key: 'berry', label: 'Ягодный', share: 24 },
      { key: 'fruity', label: 'Фруктовый', share: 21 },
      { key: 'beverage', label: 'Напитки', share: 14 },
      { key: 'minty', label: 'Мятный', share: 12 },
      { key: 'citrus', label: 'Цитрусовый', share: 10 },
      { key: 'dessert', label: 'Десертный', share: 9 },
      { key: 'floral-herbal', label: 'Травяной', share: 6 },
      { key: 'tobacco', label: 'Другие', share: 4 },
    ],
    signals: [
      { kind: 'out', text: 'Закончились популярные: Black Burn Cane Mint, Darkside Supernova.', action: 'К заказу' },
      { kind: 'hidden', text: 'Скрыты у гостя, нет табака: Melon Cola, Ледяной лайм, Цитрусовый лёд и ещё 2.', action: 'Миксы' },
      { kind: 'rail', text: 'Рейл «Новинки» пустой.', action: 'Рейлы' },
    ],
  };
})();
