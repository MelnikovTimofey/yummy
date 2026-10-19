// Данные мокапа. Табаки и миксы — полка и каталог миксов прода на 19.10.2026
// (GET /guest/mixer/palette, GET /guest/catalog/mixes). Мокап показывает полку через месяц
// после запуска: «сегодня» — четверг, 19 ноября 2026. Банки, расход, цены и поставки
// смоделированы по двум реальным счетам; поставщики и номера счетов вымышлены,
// цифры htreviews условные.
window.INV = {
  today: 'чт, 19 ноября',
  bowlGrams: 18,
  stats: { shelf: 269, packs: 412, kg: 78, ending: 14, out: 6, todayG: 540, todayBowls: 30 },
  statusCounts: { all: 269, ok: 211, last: 38, ending: 14, out: 6, stop: 3, plan: 4 },

  // packs: open — доля остатка открытой банки, sealed — банок в запасе.
  // rate — г/день; rateKind: ok | brand (оценка по бренду) | none.
  shelf: [
    { id: 'bb-cane', brand: 'Black Burn', name: 'Cane Mint', grams: 200, profiles: ['minty'], open: 0.2, sealed: 0, remain: 40, rate: 21, rateKind: 'ok', until: '21 ноя', days: 2, status: 'ending', last: true, arrived: '5 ноя', supplier: 'Каспий Опт', mixes: 3 },
    { id: 'ds-blackcurrant', brand: 'DARKSIDE', name: 'Blackcurrant', grams: 250, profiles: ['berry'], open: 0.25, sealed: 0, remain: 55, rate: 9, rateKind: 'ok', until: '25 ноя', days: 6, status: 'ending', last: true, mark: '¼ вчера', arrived: '15 окт', supplier: 'Южный табак', mixes: 0 },
    { id: 'bb-pear', brand: 'Black Burn', name: 'Pear lemonade', grams: 200, profiles: ['fruity'], open: 0.7, sealed: 0, remain: 140, rate: 12, rateKind: 'ok', until: '30 ноя', days: 11, status: 'last', last: true, arrived: '12 ноя', supplier: 'Каспий Опт', mixes: 0 },
    { id: 'hl-panama', brand: 'Хулиган', name: 'Panama', grams: 200, profiles: ['fruity'], open: 0.05, sealed: 1, remain: 210, rate: 8, rateKind: 'ok', until: '15 дек', days: 26, status: 'check', initial: true, arrived: 'начальный остаток', supplier: '—', mixes: 0 },
    { id: 'ds-bittersweet', brand: 'DARKSIDE', name: 'Bittersweet', grams: 250, profiles: ['citrus'], open: 0.4, sealed: 2, remain: 600, rate: 17, rateKind: 'ok', until: '24 дек', days: 35, status: 'ok', arrived: '12 ноя', supplier: 'Южный табак', mixes: 3 },
    { id: 'bb-rasp', brand: 'Black Burn', name: 'Raspberries', grams: 200, profiles: ['berry'], open: 0.45, sealed: 1, remain: 290, rate: 13, rateKind: 'ok', until: '11 дек', days: 22, status: 'ok', mark: '½ 17 ноя', arrived: '12 ноя', supplier: 'Каспий Опт', mixes: 0 },
    { id: 'ds-mango', brand: 'DARKSIDE', name: 'Mango Lassi 2.0', grams: 250, profiles: ['fruity'], open: 0.5, sealed: 1, remain: 375, rate: 11, rateKind: 'ok', until: '23 дек', days: 34, status: 'ok', arrived: '15 окт', supplier: 'Южный табак', mixes: 1 },
    { id: 'ds-peach', brand: 'DARKSIDE', name: 'Virgin Peach 2.0', grams: 250, profiles: ['fruity'], open: 0.65, sealed: 0, remain: 160, rate: 10, rateKind: 'brand', until: '~5 дек', days: 16, status: 'last', last: true, arrived: '12 ноя', supplier: 'Южный табак', mixes: 1 },
    { id: 'bb-popcorn', brand: 'Black Burn', name: 'Original Popcorn', grams: 200, profiles: ['dessert'], open: 0.8, sealed: 1, remain: 360, rate: 9, rateKind: 'ok', until: '28 дек', days: 39, status: 'ok', arrived: '12 ноя', supplier: 'Каспий Опт', mixes: 1 },
    { id: 'sl-millefeuille', brand: 'Starline', name: 'Клубничный мильфей', grams: 250, profiles: ['berry', 'dessert'], open: 0.85, sealed: 0, remain: 210, rate: 6, rateKind: 'ok', until: '24 дек', days: 35, status: 'last', last: true, arrived: '15 окт', supplier: 'Южный табак', mixes: 0 },
    { id: 'sr-passion', brand: 'Сарма', name: 'Маракуйя', grams: 200, profiles: ['fruity'], open: 0.9, sealed: 1, remain: 380, rate: null, rateKind: 'none', until: '—', days: null, status: 'ok', arrived: '12 ноя', supplier: 'Каспий Опт', mixes: 1 },
    { id: 'sb-lemon', brand: 'Sebero', name: 'Лимонная шипучка', grams: 200, profiles: ['citrus'], open: null, sealed: 0, remain: 0, rate: 15, rateKind: 'ok', until: 'закончился 17 ноя', days: 0, status: 'out', arrived: '15 окт', supplier: 'Каспий Опт', mixes: 2 },
    { id: 'jt-gluhwein', brand: 'Jent', name: 'Gluhwein', grams: 200, profiles: ['spicy'], open: null, sealed: 1, remain: 200, rate: null, rateKind: 'none', until: '—', days: null, status: 'stop', note: 'стоп до декабря', arrived: '15 окт', supplier: 'Южный табак', mixes: 1 },
    { id: 'ds-supernova', brand: 'DARKSIDE', name: 'Supernova', grams: 250, profiles: ['minty'], open: null, sealed: 0, remain: 0, rate: null, rateKind: 'none', until: '—', days: null, status: 'plan', arrived: 'из идей htreviews', supplier: '—', mixes: 0 },
  ],

  mixesByTobacco: {
    'bb-cane': ['Арбузный джин-тоник', 'Грейпфрут и бергамот', 'Манго ласси с маракуйей'],
    'ds-bittersweet': ['Арбузный джин-тоник', 'Малиновый тоник', 'Юдзу-тоник'],
    'sb-lemon': ['Барбариска с лимонадом', 'Лавандовый лимонад'],
  },

  // История банок Black Burn Raspberries для карточки.
  rasp: {
    packs: [
      { n: 5, state: 'sealed', title: 'В запасе', line: 'пришла 12 ноя · счёт № 03944 · 1 550 ₽' },
      { n: 4, state: 'open', fill: 0.45, title: 'В работе', line: 'пришла 12 ноя · вскрыта 14 ноя · отметка ½ 17 ноя' },
      { n: 3, state: 'empty', title: 'Пустая', line: '29 окт → 14 ноя · 16 дн · 12,5 г/день' },
      { n: 2, state: 'empty', title: 'Пустая', line: '15 окт → 29 окт · 14 дн · 14,3 г/день' },
    ],
    bars: [14.3, 12.5, 13.1],
    barLabels: ['банка 2', 'банка 3', 'банка 4 (идёт)'],
  },

  deliveries: [
    { id: 'd-draft', date: '18 ноя', supplier: 'Каспий Опт', number: '№ 04102', lines: 15, packs: 16, sum: '22 270 ₽', arrived: '—', status: 'draft' },
    { id: 'd-1', date: '12 ноя', supplier: 'Южный табак', number: '№ ЮТ-5233', lines: 9, packs: 9, sum: '15 996 ₽', arrived: '14 ноя', status: 'done' },
    { id: 'd-2', date: '11 ноя', supplier: 'Каспий Опт', number: '№ 03944', lines: 12, packs: 14, sum: '19 860 ₽', arrived: '12 ноя', status: 'done' },
    { id: 'd-3', date: '3 ноя', supplier: 'Каспий Опт', number: '№ 03871', lines: 6, packs: 6, sum: '8 950 ₽', arrived: '5 ноя', status: 'done' },
    { id: 'd-4', date: '13 окт', supplier: 'Южный табак', number: '№ ЮТ-5120', lines: 11, packs: 12, sum: '20 140 ₽', arrived: '15 окт', status: 'done' },
  ],

  // Строки счёта — дословно из реального счёта поставщика (кроме номера и поставщика).
  // match: memory (по памяти) | suggest (предложение) | none (не найдено) | skip (не табак).
  parse: {
    title: 'Счёт № 04102 от 18.11.2026',
    supplier: 'Каспий Опт',
    total: '22 270 ₽',
    lines: [
      { raw: 'ОБЛАКО Египетская', qty: 1, price: '500,00', sum: '500,00', match: 'skip' },
      { raw: 'Табак для кальяна BLANSH 200 гр Грейпфрутовый Сок', qty: 1, price: '1 490,00', sum: '1 490,00', grams: 200, match: 'none', hint: 'Бренда Blansh нет в каталоге' },
      { raw: 'Табак для кальяна BLANSH 200 гр КЛУБНИЧКА 18+', qty: 1, price: '1 490,00', sum: '1 490,00', grams: 200, match: 'none', hint: 'Бренда Blansh нет в каталоге' },
      { raw: 'Табак для кальяна BLANSH 200 гр ЯГОДА МАЛИНКА', qty: 1, price: '1 490,00', sum: '1 490,00', grams: 200, match: 'none', hint: 'Бренда Blansh нет в каталоге' },
      { raw: 'Табак для кальяна Black Burn 200г Original Popcorn (Оригинальный попкорн)', qty: 1, price: '1 550,00', sum: '1 550,00', grams: 200, match: 'memory', brand: 'Black Burn', name: 'Original Popcorn' },
      { raw: 'Табак для кальяна Black Burn 200г Pear Lemonade (Грушевый лимонад)', qty: 1, price: '1 550,00', sum: '1 550,00', grams: 200, match: 'memory', brand: 'Black Burn', name: 'Pear lemonade' },
      { raw: 'Табак для кальяна Black Burn 200г Pineapple (Сочный ананас)', qty: 1, price: '1 550,00', sum: '1 550,00', grams: 200, match: 'suggest', brand: 'Black Burn', name: 'Ananas Shock', confidence: 64, hint: 'вкус совпал, название — нет' },
      { raw: 'Табак для кальяна Black Burn 200г Raspberries (Спелая лесная малина)', qty: 2, price: '1 550,00', sum: '3 100,00', grams: 200, match: 'memory', brand: 'Black Burn', name: 'Raspberries' },
      { raw: 'Табак для кальяна Black Burn 200г Red Orange (Красный апельсин)', qty: 1, price: '1 550,00', sum: '1 550,00', grams: 200, match: 'memory', brand: 'Black Burn', name: 'Red Orange' },
      { raw: 'Табак для кальяна Black Burn 200г Something Tropical (Что-то тропическое)', qty: 1, price: '1 550,00', sum: '1 550,00', grams: 200, match: 'memory', brand: 'Black Burn', name: 'Something Tropical' },
      { raw: 'Табак для кальяна SEBERO Блэк БЧК 200гр Барбарисовая Шипучка', qty: 1, price: '1 550,00', sum: '1 550,00', grams: 200, match: 'suggest', brand: 'Sebero', name: 'Барбарис', confidence: 58, hint: 'линейка «Black» в каталоге не найдена' },
      { raw: 'Табак для кальяна SEBERO Блэк БЧК 200гр Смородиновая Шипучка', qty: 1, price: '1 550,00', sum: '1 550,00', grams: 200, match: 'suggest', brand: 'Sebero', name: 'Смородиновые леденцы', confidence: 41, hint: 'выберите вручную' },
      { raw: 'Табак для кальяна Сарма 25г Бабл Гам', qty: 1, price: '220,00', sum: '220,00', grams: 25, match: 'suggest', brand: 'Сарма', name: 'Бабл Гам', confidence: 77, hint: 'фасовка 25 г', newOnShelf: true },
      { raw: 'Табак для кальяна Сарма 360 Крепкая 200гр Маракуйя', qty: 1, price: '1 530,00', sum: '1 530,00', grams: 200, match: 'suggest', brand: 'Сарма', name: 'Маракуйя', confidence: 72, hint: 'на полке — «Маракуйя» классической линейки' },
      { raw: 'Табак для кальяна Хулиган 200г Panama (Фруктовый салатик)', qty: 1, price: '1 600,00', sum: '1 600,00', grams: 200, match: 'memory', brand: 'Хулиган', name: 'Panama' },
    ],
  },

  reorder: [
    {
      supplier: 'Каспий Опт', lastInvoice: 'последний счёт 18 ноя, черновик', items: [
        { name: 'Black Burn Cane Mint', until: '21 ноя', days: 2, rate: 21, qty: 3, price: '1 550 ₽' },
        { name: 'Sebero Лимонная шипучка', until: 'закончился', days: 0, rate: 15, qty: 2, price: '1 550 ₽' },
        { name: 'Black Burn Pear lemonade', until: '30 ноя', days: 11, rate: 12, qty: 2, price: '1 550 ₽' },
      ], sum: '10 850 ₽',
    },
    {
      supplier: 'Южный табак', lastInvoice: 'последний счёт 12 ноя', items: [
        { name: 'DARKSIDE Blackcurrant', until: '25 ноя', days: 6, rate: 9, qty: 1, price: '1 886 ₽' },
        { name: 'DARKSIDE Virgin Peach 2.0', until: '~5 дек', days: 16, rate: 10, qty: 1, price: '1 886 ₽', soft: true },
      ], sum: '3 772 ₽',
    },
    {
      supplier: 'Поставщик не выбран', lastInvoice: 'в плане из идей htreviews', items: [
        { name: 'DARKSIDE Supernova', until: 'в плане', days: null, rate: null, qty: 1, price: '—' },
      ], sum: '—',
    },
  ],

  // Подборки идей. Цифры htreviews условные.
  ideas: [
    {
      title: 'Популярное у ваших брендов', hint: 'Бренды полки, отсортированы по просмотрам на htreviews', items: [
        { brand: 'DARKSIDE', name: 'Supernova', profiles: ['minty'], rating: '4,6', votes: '2 140', views: '96 тыс.', planned: true },
        { brand: 'DARKSIDE', name: 'Torpedo', profiles: ['fruity'], rating: '4,5', votes: '1 870', views: '81 тыс.' },
        { brand: 'Black Burn', name: 'Barberry Shock', profiles: ['berry'], rating: '4,4', votes: '1 210', views: '64 тыс.' },
        { brand: 'Сарма', name: 'Дюшес', profiles: ['dessert', 'fruity'], rating: '4,3', votes: '640', views: '38 тыс.' },
      ],
    },
    {
      title: 'Высокий рейтинг', hint: 'С поправкой на число оценок: 5,0 с тремя оценками не обгоняет 4,7 с тысячей', items: [
        { brand: 'Starline', name: 'Черничный морс', profiles: ['berry'], rating: '4,8', votes: '930', views: '41 тыс.' },
        { brand: 'Sebero', name: 'Арбуз', profiles: ['fruity'], rating: '4,7', votes: '1 020', views: '52 тыс.' },
        { brand: 'Overdose', name: 'Ледяной лимон', profiles: ['citrus', 'minty'], rating: '4,7', votes: '760', views: '33 тыс.' },
        { brand: 'Deus', name: 'Pomelo', profiles: ['citrus'], rating: '4,6', votes: '410', views: '19 тыс.' },
      ],
    },
    {
      title: 'Похоже на то, что быстро уходит', hint: 'Вкусы и характеры десяти табаков с самым большим расходом', items: [
        { brand: 'Black Burn', name: 'Ice Mint', profiles: ['minty'], rating: '4,4', votes: '820', views: '45 тыс.', why: 'как Cane Mint · 21 г/день' },
        { brand: 'DARKSIDE', name: 'Lemonblast', profiles: ['citrus'], rating: '4,5', votes: '1 330', views: '58 тыс.', why: 'как Bittersweet · 17 г/день' },
        { brand: 'Palitra', name: 'Raspberry', profiles: ['berry'], rating: '4,2', votes: '290', views: '12 тыс.', why: 'как Raspberries · 13 г/день' },
      ],
    },
  ],

  weekly: [
    { label: '19–25 окт', g: 3420 }, { label: '26 окт–1 ноя', g: 3780 }, { label: '2–8 ноя', g: 3610 },
    { label: '9–15 ноя', g: 3960 }, { label: '16–19 ноя', g: 2190, partial: true },
  ],
  spend: [{ supplier: 'Каспий Опт', sum: '51 080 ₽', share: 0.6 }, { supplier: 'Южный табак', sum: '36 136 ₽', share: 0.4 }],
};
