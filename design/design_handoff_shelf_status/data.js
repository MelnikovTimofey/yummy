/* eslint-disable */
// Данные мокапа #518: полка без граммов. «Сегодня» — 4 ноября.
// status: in — есть, out — закончился, stop — стоп для гостей, plan — в плане (ещё не приходил).
window.SS = {
  today: 'ср, 4 ноября',
  total: 269,
  counts: { all: 269, in: 251, out: 9, stop: 2, plan: 3, trial: 4 },
  shelf: [
    { id: 'bb-cane', name: 'Cane Mint', brand: 'Black Burn', status: 'out', outAt: '3 ноя', keep: true, arrived: '12 окт', supplier: 'Каспий Опт', mixes: 6, hidden: 2, analog: 'Musthave Ice Mint' },
    { id: 'ds-blackcurrant', name: 'Blackcurrant', brand: 'Darkside', status: 'out', outAt: '2 ноя', keep: true, arrived: '24 сен', supplier: 'Южный табак', mixes: 3, hidden: 3 },
    { id: 'sb-lemon', name: 'Лимонная шипучка', brand: 'Sebero', status: 'out', outAt: '30 окт', keep: true, arrived: '4 окт', supplier: 'Каспий Опт', mixes: 2, hidden: 0, analog: 'Black Burn Lemon Shock' },
    { id: 'hl-panama', name: 'Panama', brand: 'Хулиган', status: 'in', trial: true, keep: false, arrived: '20 окт', supplier: 'Каспий Опт', mixes: 1 },
    { id: 'bb-pear', name: 'Pear lemonade', brand: 'Black Burn', status: 'in', trial: true, keep: false, arrived: '4 окт', supplier: 'Каспий Опт', mixes: 2 },
    { id: 'bb-rasp', name: 'Raspberries', brand: 'Black Burn', status: 'in', keep: true, arrived: '4 окт', supplier: 'Каспий Опт', mixes: 4 },
    { id: 'ds-wild', name: 'Wildberry', brand: 'Darkside', status: 'in', keep: true, arrived: '24 сен', supplier: 'Южный табак', mixes: 5 },
    { id: 'ds-redtea', name: 'Red Tea', brand: 'Darkside', status: 'in', keep: true, arrived: '24 сен', supplier: 'Южный табак', mixes: 4 },
    { id: 'ds-mango', name: 'Mango Lassi 2.0', brand: 'Darkside', status: 'in', keep: true, arrived: '24 сен', supplier: 'Южный табак', mixes: 3 },
    { id: 'sr-taiga', name: 'Таежный чай', brand: 'Сарма', status: 'in', keep: true, arrived: '20 окт', supplier: 'Каспий Опт', mixes: 2 },
    { id: 'sr-sorrel', name: 'Щавель', brand: 'Сарма', status: 'stop', keep: false, arrived: '20 окт', supplier: 'Каспий Опт', mixes: 1, stopNote: 'пересушен' },
    { id: 'mh-pine', name: 'Pineapple Rings', brand: 'Musthave', status: 'plan', keep: true, arrived: null, supplier: null, mixes: 1 },
    { id: 'bb-cheese', name: 'Cheesecake', brand: 'Black Burn', status: 'in', keep: true, arrived: '12 окт', supplier: 'Каспий Опт', mixes: 2 },
    { id: 'hl-pool', name: 'POOL', brand: 'Хулиган', status: 'out', outAt: '28 окт', keep: false, arrived: '20 окт', supplier: 'Каспий Опт', mixes: 0, hidden: 0 },
  ],
  // «К заказу»: закончились и держим постоянно. Поставщик — по последнему приходу.
  order: [
    { supplier: 'Каспий Опт', last: 'последний счёт 12 окт', ids: ['bb-cane', 'sb-lemon', 'bb-melon', 'sr-peach'] },
    { supplier: 'Южный табак', last: 'последний счёт 24 сен', ids: ['ds-blackcurrant', 'ds-supernova'] },
  ],
  orderExtra: {
    'bb-melon': { id: 'bb-melon', name: 'Melon Halls', brand: 'Black Burn', status: 'out', outAt: '27 окт', keep: true, arrived: '12 окт', supplier: 'Каспий Опт', mixes: 1, hidden: 1 },
    'sr-peach': { id: 'sr-peach', name: 'Персик', brand: 'Сарма', status: 'out', outAt: '25 окт', keep: true, arrived: '20 окт', supplier: 'Каспий Опт', mixes: 0, hidden: 0 },
    'ds-supernova': { id: 'ds-supernova', name: 'Supernova', brand: 'Darkside', status: 'out', outAt: '21 окт', keep: true, arrived: '24 сен', supplier: 'Южный табак', mixes: 4, hidden: 0, analog: 'Musthave Ice Mint' },
  },
  // Закончились, но не держим постоянно: в заявку не идут.
  notKept: ['Хулиган POOL', 'Сарма Ромашковое варенье', 'Black Burn Haribon'],
  mixesOf: {
    'bb-cane': [
      { name: 'Pineapple Mint', state: 'аналог Musthave Ice Mint' },
      { name: 'Морозная ягода', state: 'аналог Musthave Ice Mint' },
      { name: 'Мятный чай', state: 'аналог Musthave Ice Mint' },
      { name: 'Арбузный холодок', state: 'аналог Musthave Ice Mint' },
      { name: 'Ледяной лайм', state: 'скрыт' },
      { name: 'Цитрусовый лёд', state: 'скрыт' },
    ],
    'bb-rasp': [
      { name: 'Малиновый морс', state: 'на витрине' },
      { name: 'Ягодный лимонад', state: 'на витрине' },
      { name: 'Малина с мятой', state: 'на витрине' },
      { name: 'Лесная ягода', state: 'на витрине' },
    ],
  },
  receipts: {
    'bb-cane': [
      { date: '12 окт', supplier: 'Каспий Опт', what: '2 шт.', doc: 'счёт 1184' },
      { date: '14 сен', supplier: 'Каспий Опт', what: '1 шт.', doc: 'счёт 1102' },
      { date: '20 авг', supplier: 'Стартовый приход', what: '1 шт.', doc: 'вручную' },
    ],
    'bb-rasp': [
      { date: '4 окт', supplier: 'Каспий Опт', what: '2 шт.', doc: 'счёт 1161' },
      { date: '20 авг', supplier: 'Стартовый приход', what: '1 шт.', doc: 'вручную' },
    ],
  },
  events: {
    'bb-cane': [
      { date: '3 ноя', text: 'Закончился', who: 'maxim' },
      { date: '12 окт', text: 'Пришёл по счёту 1184', who: 'Каспий Опт' },
    ],
    'bb-rasp': [
      { date: '4 окт', text: 'Пришёл по счёту 1161', who: 'Каспий Опт' },
    ],
  },
};
