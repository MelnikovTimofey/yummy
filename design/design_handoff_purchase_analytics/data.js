// Данные мокапа #324. Полка, журнал и счета — из мокапа #306
// (../design_handoff_inventory_grams/grams-data.js), «сегодня» — четверг, 19 ноября 2026.
// Расход в месяц = г/день × 30. Медиана расхода по полке — 10 г/день.
// Бюджет и суммы сходятся: потрачено 51 080 + 36 136 = 87 216 ₽.
window.PA = {
  today: 'чт, 19 ноября',
  medianRate: 10,

  // #325: интервал — медиана между принятыми счетами за 90 дней.
  interval: { days: 10, invoices: 6, horizon: '6 дек', lead: 7 },

  // #323 + #325: в список попадает то, что закончится до 6 дек (интервал 10 + срок поставки 7).
  reorder: [
    {
      supplier: 'Каспий Опт', lastInvoice: 'последний счёт 18 ноя, черновик', items: [
        { name: 'Black Burn Cane Mint', until: '21 ноя', days: 2, month: 630, left: 40, gram: '7,75 ₽' },
        { name: 'Sebero Лимонная шипучка', until: 'закончился', days: 0, month: 450, left: 0, gram: '7,75 ₽' },
        { name: 'Хулиган Panama', until: 'проверьте остаток', days: null, month: 240, left: 18, gram: '8,00 ₽', check: true },
        { name: 'Black Burn Pear lemonade', until: '30 ноя', days: 11, month: 360, left: 140, gram: '7,75 ₽', byInterval: true },
      ],
    },
    {
      supplier: 'Южный табак', lastInvoice: 'последний счёт 12 ноя, принят', items: [
        { name: 'DARKSIDE Blackcurrant', until: '25 ноя', days: 6, month: 270, left: 55, gram: '7,60 ₽' },
        { name: 'DARKSIDE Virgin Peach 2.0', until: '~5 дек', days: 16, month: 300, brand: true, left: 160, gram: '7,60 ₽', byInterval: true },
        { name: 'DARKSIDE Supernova', until: 'в плане', days: null, month: 360, brand: true, left: null, gram: '—', plan: true },
      ],
    },
  ],

  // #326: бюджет и база.
  budget: {
    month: 'ноябрь', budget: '150 000 ₽', spent: '87 216 ₽', spentShare: 0.58,
    base: '≈ 112 000 ₽', baseShare: 0.75, left: '≈ 38 000 ₽',
    unknown: 9, baseCount: 214,
  },

  // #327: база. share — доля в расходе полки; app — «Покурить» по миксам с табаком за 30 дней.
  base: [
    { name: 'Cane Mint', brand: 'Black Burn', month: 630, share: '3,9 %', rub: '4 880 ₽', app: 14, keep: true },
    { name: 'Bittersweet', brand: 'DARKSIDE', month: 510, share: '3,1 %', rub: '3 880 ₽', app: 9, keep: true },
    { name: 'Лимонная шипучка', brand: 'Sebero', month: 450, share: '2,8 %', rub: '3 490 ₽', app: 6, keep: true },
    { name: 'Raspberries', brand: 'Black Burn', month: 440, share: '2,7 %', rub: '3 410 ₽', app: 11, keep: true },
    { name: 'Pinkman', brand: 'Must Have', month: 450, share: '2,8 %', rub: '3 490 ₽', app: 2, keep: false, flag: 'notBase' },
    { name: 'Pear lemonade', brand: 'Black Burn', month: 360, share: '2,2 %', rub: '2 790 ₽', app: 7, keep: false, flag: 'notBase' },
    { name: 'Mango Lassi 2.0', brand: 'DARKSIDE', month: 330, share: '2,0 %', rub: '2 510 ₽', app: 5, keep: true },
    { name: 'Gummy Bears', brand: 'Satyr', month: 30, share: '0,2 %', rub: '230 ₽', app: 0, keep: true, flag: 'idleBase' },
    { name: 'Груша', brand: 'Сарма', month: 0, share: '0 %', rub: '0 ₽', app: 0, keep: true, flag: 'idleBase' },
  ],

  // #328: закончились быстро за 60 дней. next — что было дальше.
  fast: [
    { name: 'Pinkman', brand: 'Must Have', plus: 100, arrived: '14 ноя', gone: 2, empty: 3, now: 'нет на полке', nowOut: true, next: null },
    { name: 'Bittersweet', brand: 'DARKSIDE', plus: 250, arrived: '2 ноя', gone: 2, empty: 8, now: 'есть', next: '+500 г 12 ноя' },
    { name: 'Cane Mint', brand: 'Black Burn', plus: 200, arrived: '29 окт', gone: 3, empty: 4, now: 'заканчивается', next: '+400 г 5 ноя' },
  ],

  // #329: пробы — впервые пришли на полку за 60 дней.
  trials: [
    { id: 'starline-melon', name: 'Дыня', brand: 'Starline', plus: 25, arrived: '14 ноя', speed: 2.8, speedText: 'ушла за 2 дня', app: 3, rating: '4,8', ht: '4,4', mixes: 1, mark: null },
    { id: 'bb-pear', name: 'Pear lemonade', brand: 'Black Burn', plus: 200, arrived: '12 ноя', speed: 1.2, app: 7, rating: '4,6', ht: '4,5', mixes: 2, mark: 'yes' },
    { id: 'hl-panama', name: 'Panama', brand: 'Хулиган', plus: 200, arrived: '20 окт', speed: 0.8, app: 0, rating: null, ht: '4,1', mixes: 0, mark: 'no' },
    { id: 'sr-passion', name: 'Маракуйя', brand: 'Сарма', plus: 400, arrived: '12 ноя', speed: null, app: 0, rating: null, ht: '4,2', mixes: 0, mark: null },
  ],

  // #330: лежит — расход за 21 день ниже 2 г/день, пришёл больше 21 дня назад, без стопа.
  idle: {
    total: '≈ 9 250 ₽',
    rows: [
      { name: 'Gummy Bears', brand: 'Satyr', left: 480, rate21: '1 г/день', rub: '3 600 ₽', arrived: '15 окт', days: 35, keep: true },
      { name: 'Груша', brand: 'Сарма', left: 350, rate21: '0 г', rub: '2 450 ₽', arrived: '15 окт', days: 35, keep: true },
      { name: 'Black Cola', brand: 'Black Burn', left: 230, rate21: '1,5 г/день', rub: '1 780 ₽', arrived: '20 окт', days: 30, keep: false },
      { name: 'Earl Grey', brand: 'Tangiers', left: 160, rate21: '0,5 г/день', rub: '1 420 ₽', arrived: '19 окт', days: 31, keep: true },
    ],
  },

  // #331: вкусовые направления — доли за 30 дней.
  profiles: [
    { key: 'fruity', spend: 28, shelf: 31, app: 25 },
    { key: 'berry', spend: 22, shelf: 14, app: 30, flag: 'more' },
    { key: 'minty', spend: 18, shelf: 15, app: 14 },
    { key: 'citrus', spend: 14, shelf: 13, app: 12 },
    { key: 'dessert', spend: 10, shelf: 17, app: 13, flag: 'less' },
    { key: 'spicy', spend: 5, shelf: 6, app: 4 },
    { key: 'floral_herbal', spend: 3, shelf: 4, app: 2 },
  ],
};
