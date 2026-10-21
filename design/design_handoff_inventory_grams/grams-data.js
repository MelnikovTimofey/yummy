// Данные мокапа #306. Табаки и строки счёта — из мокапа инвентаря #152
// (../design_handoff_inventory/inventory-data.js), «сегодня» — четверг, 19 ноября 2026.
// Остатки, расход и журнал пересчитаны в граммы и сходятся между собой:
// left — остаток сейчас по расчёту, full — уровень сразу после последнего прихода,
// от него считаются доли ¾ ½ ⅓ ¼.
window.GR = {
  today: 'чт, 19 ноября',
  bowlGrams: 18,
  stats: { shelf: 269, kg: 78, ending: 14, out: 6, todayG: 540, todayBowls: 30 },
  statusCounts: { all: 269, ok: 233, ending: 14, check: 9, out: 6, stop: 3, plan: 4 },

  // status: ok | ending | check (проверьте остаток) | out | stop | plan.
  // rateKind: own | brand (оценка по бренду) | none.
  shelf: [
    { id: 'bb-cane', brand: 'Black Burn', name: 'Cane Mint', profiles: ['minty'], left: 40, full: 400, rate: 21, rateKind: 'own', until: '21 ноя', days: 2, status: 'ending', arrived: '5 ноя', plus: 400, supplier: 'Каспий Опт', mixes: 3 },
    { id: 'ds-blackcurrant', brand: 'DARKSIDE', name: 'Blackcurrant', profiles: ['berry'], left: 55, full: 250, rate: 9, rateKind: 'own', until: '25 ноя', days: 6, status: 'ending', mark: '¼ вчера', arrived: '15 окт', plus: 250, supplier: 'Южный табак', mixes: 1 },
    { id: 'hl-panama', brand: 'Хулиган', name: 'Panama', profiles: ['fruity'], left: 18, full: 200, rate: 8, rateKind: 'own', until: '—', days: null, status: 'check', arrived: '20 окт', plus: 200, supplier: 'Старт', mixes: 0 },
    { id: 'bb-pear', brand: 'Black Burn', name: 'Pear lemonade', profiles: ['fruity'], left: 140, full: 200, rate: 12, rateKind: 'own', until: '30 ноя', days: 11, status: 'ok', arrived: '12 ноя', plus: 200, supplier: 'Каспий Опт', mixes: 2 },
    { id: 'bb-rasp', brand: 'Black Burn', name: 'Raspberries', profiles: ['berry'], left: 300, full: 400, rate: 14.7, rateKind: 'own', until: '9 дек', days: 20, status: 'ok', mark: '330 г 17 ноя', arrived: '12 ноя', plus: 400, supplier: 'Каспий Опт', mixes: 4 },
    { id: 'ds-peach', brand: 'DARKSIDE', name: 'Virgin Peach 2.0', profiles: ['fruity'], left: 160, full: 250, rate: 10, rateKind: 'brand', until: '~5 дек', days: 16, status: 'ok', arrived: '12 ноя', plus: 250, supplier: 'Южный табак', mixes: 1 },
    { id: 'ds-bittersweet', brand: 'DARKSIDE', name: 'Bittersweet', profiles: ['citrus'], left: 600, full: 750, rate: 17, rateKind: 'own', until: '24 дек', days: 35, status: 'ok', arrived: '12 ноя', plus: 500, supplier: 'Южный табак', mixes: 3 },
    { id: 'ds-mango', brand: 'DARKSIDE', name: 'Mango Lassi 2.0', profiles: ['fruity'], left: 375, full: 500, rate: 11, rateKind: 'own', until: '23 дек', days: 34, status: 'ok', mark: '¾ 15 ноя', arrived: '15 окт', plus: 500, supplier: 'Южный табак', mixes: 2 },
    { id: 'sr-passion', brand: 'Сарма', name: 'Маракуйя', profiles: ['fruity'], left: 380, full: 400, rate: null, rateKind: 'none', until: '—', days: null, status: 'ok', arrived: '12 ноя', plus: 400, supplier: 'Каспий Опт', mixes: 0 },
    { id: 'sb-lemon', brand: 'Sebero', name: 'Лимонная шипучка', profiles: ['citrus'], left: 0, full: 200, rate: 15, rateKind: 'own', until: 'закончился 17 ноя', days: 0, status: 'out', arrived: '15 окт', plus: 200, supplier: 'Каспий Опт', mixes: 2 },
    { id: 'jt-gluhwein', brand: 'Jent', name: 'Gluhwein', profiles: ['spicy'], left: 200, full: 200, rate: null, rateKind: 'none', until: '—', days: null, status: 'stop', note: 'стоп до декабря', arrived: '15 окт', plus: 200, supplier: 'Южный табак', mixes: 0 },
    { id: 'ds-supernova', brand: 'DARKSIDE', name: 'Supernova', profiles: ['minty'], left: null, full: null, rate: null, rateKind: 'none', until: '—', days: null, status: 'plan', arrived: 'из идей', plus: null, supplier: '—', mixes: 0 },
  ],

  // Журнал Black Burn Raspberries для карточки, новые сверху.
  // kind: receipt (+г) | count (= г, отметка) | empty (= 0 г) | writeoff (−г).
  rasp: {
    events: [
      { kind: 'count', grams: '330 г', title: 'Осталось 330 г', line: '17 ноя · точно в граммах · maxim · расход с 12 ноя — 14 г/день' },
      { kind: 'receipt', grams: '+400 г', title: 'Приход', line: '12 ноя · Каспий Опт · счёт № 03944 · 3 100 ₽ · 7,75 ₽/г' },
      { kind: 'empty', grams: '0 г', title: 'Закончился', line: '11 ноя · maxim · расход с 29 окт — 15,4 г/день' },
      { kind: 'count', grams: '200 г', title: 'Осталось ½', line: '29 окт · ½ от 400 г · aleksei · расход с 15 окт — 14,3 г/день' },
      { kind: 'receipt', grams: '+400 г', title: 'Приход', line: '15 окт · Южный табак · счёт № ЮТ-5120 · 3 000 ₽ · 7,50 ₽/г' },
    ],
    weeks: [14.3, 14.6, 15.4, 15.0, 14.0],
    weekLabels: ['19–25 окт', '26 окт–1 ноя', '2–8 ноя', '9–15 ноя', '16–19 ноя'],
  },

  reorder: [
    {
      supplier: 'Каспий Опт', lastInvoice: 'последний счёт 18 ноя, черновик', sum: '≈ 7 400 ₽', items: [
        { name: 'Black Burn Cane Mint', until: '21 ноя', days: 2, rate: 21, left: 40, qty: 450, gram: '7,75 ₽' },
        { name: 'Sebero Лимонная шипучка', until: 'закончился', days: 0, rate: 15, left: 0, qty: 350, gram: '7,75 ₽' },
        { name: 'Хулиган Panama', until: 'проверьте остаток', days: null, rate: 8, left: 18, qty: 150, gram: '8,00 ₽', check: true },
      ],
    },
    {
      supplier: 'Южный табак', lastInvoice: 'последний счёт 12 ноя', sum: '≈ 3 000 ₽', items: [
        { name: 'DARKSIDE Blackcurrant', until: '25 ноя', days: 6, rate: 9, left: 55, qty: 150, gram: '7,60 ₽' },
        { name: 'DARKSIDE Supernova', until: 'в плане', days: null, rate: null, brandRate: 12, left: 0, qty: 250, gram: '7,60 ₽', plan: true },
      ],
    },
  ],
};
