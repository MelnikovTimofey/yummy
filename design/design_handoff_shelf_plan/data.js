/* eslint-disable */
// Данные мокапа #559: «В плане» от идеи до полки. «Сегодня» — 13 ноября.
// status: in — есть, out — закончился, stop — стоп для гостей, plan — в плане (ещё не приходил).
// Табаки в плане — как на проде 13 ноября: Догма Лемон дропс, Bonche Caramel, Bonche Clover Club.
window.PL = {
  today: 'чт, 13 ноября',
  total: 273,
  counts: { all: 273, in: 251, out: 9, stop: 2, plan: 4, trial: 5 },
  shelf: [
    { id: 'dg-lemon', name: 'Лемон дропс', brand: 'Догма', status: 'plan', planned: '11 ноя', mixes: 1 },
    { id: 'bn-caramel', name: 'Caramel', brand: 'Bonche', status: 'plan', planned: '11 ноя', mixes: 1 },
    { id: 'bn-clover', name: 'Clover Club', brand: 'Bonche', status: 'plan', planned: '11 ноя', mixes: 2 },
    { id: 'mh-pine', name: 'Pineapple Rings', brand: 'Musthave', status: 'plan', planned: '12 сен', mixes: 1 },
    { id: 'bb-cane', name: 'Cane Mint', brand: 'Black Burn', status: 'out', outAt: '3 ноя', keep: true, arrived: '12 окт', supplier: 'Каспий Опт', mixes: 6 },
    { id: 'hl-panama', name: 'Panama', brand: 'Хулиган', status: 'in', trial: true, keep: false, arrived: '20 окт', supplier: 'Каспий Опт', mixes: 1 },
    { id: 'bb-rasp', name: 'Raspberries', brand: 'Black Burn', status: 'in', keep: true, arrived: '4 окт', supplier: 'Каспий Опт', mixes: 4 },
    { id: 'ds-wild', name: 'Wildberry', brand: 'Darkside', status: 'in', keep: true, arrived: '24 сен', supplier: 'Южный табак', mixes: 5 },
    { id: 'sr-sorrel', name: 'Щавель', brand: 'Сарма', status: 'stop', keep: false, arrived: '20 окт', supplier: 'Каспий Опт', mixes: 1, stopNote: 'пересушен' },
  ],
  // «К заказу»: закончились и держим; ниже — блок плана (поставщика у плана ещё нет).
  order: [
    { supplier: 'Каспий Опт', last: 'последний счёт 12 окт', rows: [
      { name: 'Black Burn Cane Mint', outAt: '3 ноя', mixes: '2 из 6 скрыты у гостя', arrived: '12 окт' },
      { name: 'Sebero Лимонная шипучка', outAt: '30 окт', mixes: 'закрыт аналогом', muted: true, arrived: '4 окт' },
      { name: 'Black Burn Melon Halls', outAt: '27 окт', mixes: '1 микс скрыт у гостя', arrived: '12 окт' },
    ] },
    { supplier: 'Южный табак', last: 'последний счёт 24 сен', rows: [
      { name: 'Darkside Blackcurrant', outAt: '2 ноя', mixes: '3 микса скрыты у гостя', arrived: '24 сен' },
    ] },
  ],
  planOrder: [
    { id: 'mh-pine', name: 'Musthave Pineapple Rings', planned: '12 сен', mixes: 'ждёт 1 микс' },
    { id: 'dg-lemon', name: 'Догма Лемон дропс', planned: '11 ноя', mixes: 'ждёт 1 микс' },
    { id: 'bn-clover', name: 'Bonche Clover Club', planned: '11 ноя', mixes: 'ждут 2 микса' },
    { id: 'bn-caramel', name: 'Bonche Caramel', planned: '11 ноя', mixes: 'ждёт 1 микс' },
  ],
  mixesOf: {
    'bn-clover': [
      { name: 'Клубный лимонад', state: 'ждёт этот табак' },
      { name: 'Малиновый клевер', state: 'ждёт этот табак' },
    ],
    'bn-caramel': [
      { name: 'Карамельный попкорн', state: 'ждёт этот табак' },
    ],
  },
  catalog: [
    { id: 'bn-caramel', name: 'Caramel', brand: 'Bonche', profiles: ['десертный'], rating: '4,6', votes: '212', shelf: 'in' },
    { id: 'bn-clover', name: 'Clover Club', brand: 'Bonche', profiles: ['ягодный', 'напитки'], rating: '4,5', votes: '138', shelf: 'plan' },
    { id: 'bn-cola', name: 'Cherry Cola', brand: 'Bonche', profiles: ['напитки'], rating: '4,4', votes: '96', shelf: null },
    { id: 'dg-lemon', name: 'Лемон дропс', brand: 'Догма', profiles: ['цитрусовый', 'десертный'], rating: '4,7', votes: '301', shelf: 'plan' },
    { id: 'dg-feijoa', name: 'Фейхоа', brand: 'Догма', profiles: ['фруктовый'], rating: '4,5', votes: '187', shelf: null },
    { id: 'dg-tarhun', name: 'Тархун', brand: 'Догма', profiles: ['травяной', 'напитки'], rating: '4,3', votes: '154', shelf: null },
    { id: 'bb-rasp', name: 'Raspberries', brand: 'Black Burn', profiles: ['ягодный'], rating: '4,6', votes: '1 204', shelf: 'in' },
    { id: 'ds-wild', name: 'Wildberry', brand: 'Darkside', profiles: ['ягодный'], rating: '4,5', votes: '2 117', shelf: 'in' },
  ],
  delivery: {
    supplier: 'Каспий Опт', number: '1207', date: '12 ноя',
    lines: [
      { raw: 'Табак Bonche Caramel 30г', tobacco: 'Bonche Caramel', qty: 2, price: '1 180 ₽', tag: 'plan' },
      { raw: 'Табак Bonche Clover Club 30г', tobacco: 'Bonche Clover Club', qty: 2, price: '1 180 ₽', tag: 'plan' },
      { raw: 'Black Burn Cane Mint 200г', tobacco: 'Black Burn Cane Mint', qty: 1, price: '2 450 ₽', tag: 'out' },
      { raw: 'DS Supernova 100гр', tobacco: 'Darkside Supernova', qty: 1, price: '1 390 ₽', tag: null },
    ],
  },
  mixes: [
    { name: 'Клубный лимонад', comp: 'Bonche Clover Club, Догма Тархун, Musthave Ice Mint', status: 'wait', wait: 'Bonche Clover Club, Догма Тархун' },
    { name: 'Малиновый клевер', comp: 'Bonche Clover Club, Black Burn Raspberries', status: 'wait', wait: 'Bonche Clover Club' },
    { name: 'Pineapple Mint', comp: 'Musthave Pineapple Rings, Black Burn Cane Mint', status: 'blocked', wait: 'Black Burn Cane Mint' },
    { name: 'Морозная ягода', comp: 'Darkside Wildberry, Black Burn Cane Mint', status: 'sub', sub: 'Cane Mint → Musthave Ice Mint' },
    { name: 'Малиновый морс', comp: 'Black Burn Raspberries, Darkside Red Tea', status: 'visible' },
    { name: 'Карамельный попкорн', comp: 'Bonche Caramel, Сарма Таежный чай', status: 'wait', wait: 'Bonche Caramel' },
  ],
  // Редактор микса: Тархуна нет на полке — «В план» прямо из состава.
  mixEdit: {
    name: 'Клубный лимонад',
    rows: [
      { tobacco: 'Clover Club', brand: 'Bonche', pct: 50, state: 'plan' },
      { tobacco: 'Тархун', brand: 'Догма', pct: 30, state: 'none' },
      { tobacco: 'Ice Mint', brand: 'Musthave', pct: 20, state: 'in' },
    ],
  },
};
