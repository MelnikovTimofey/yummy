/* eslint-disable */
// Данные мокапа #540: мобильный Мастер. Табаки и миксы полки Nomad, «сегодня» 4 ноября.
window.MM = {
  code: { value: '4817', until: 'до 06:00 5 ноября', left: 'осталось 17 ч' },
  mixes: [
    { id: 'm1', name: 'Малиновый морс', ratio: '50/30/20', parts: ['Black Burn Raspberries', 'Darkside Red Tea', 'Black Burn Cane Mint'], status: 'swap', statusText: 'с заменой', note: 'Cane Mint закрыт Musthave Ice Mint', picks: 42, rating: '4,7' },
    { id: 'm2', name: 'Морозная ягода', ratio: '60/40', parts: ['Darkside Wildberry', 'Black Burn Cane Mint'], status: 'swap', statusText: 'с заменой', note: 'Cane Mint закрыт Musthave Ice Mint', picks: 31, rating: '4,5' },
    { id: 'm3', name: 'Манго ласси с чаем', ratio: '70/30', parts: ['Darkside Mango Lassi 2.0', 'Darkside Red Tea'], status: 'on', statusText: 'виден гостю', picks: 27, rating: '4,8' },
    { id: 'm4', name: 'Таёжный морс', ratio: '40/40/20', parts: ['Сарма Таежный чай', 'Black Burn Raspberries', 'Darkside Wildberry'], status: 'on', statusText: 'виден гостю', picks: 18, rating: '4,4' },
    { id: 'm5', name: 'Ледяной лайм', ratio: '60/40', parts: ['Sebero Лимонная шипучка', 'Black Burn Cane Mint'], status: 'hidden', statusText: 'скрыт', note: 'нет Cane Mint', picks: 12, rating: '4,2' },
    { id: 'm6', name: 'Черничный чизкейк', ratio: '50/50', parts: ['Black Burn Cheesecake', 'Darkside Blackcurrant'], status: 'off', statusText: 'выключен', picks: 0, rating: '—' },
  ],
  // Состав открытого микса «Малиновый морс».
  edit: {
    name: 'Малиновый морс',
    description: 'Кислая малина на чайной основе, холодок в конце.',
    author: 'Максим',
    components: [
      { id: 'bb-rasp', name: 'Raspberries', brand: 'Black Burn', pct: 50, state: 'in' },
      { id: 'ds-redtea', name: 'Red Tea', brand: 'Darkside', pct: 30, state: 'in' },
      { id: 'bb-cane', name: 'Cane Mint', brand: 'Black Burn', pct: 20, state: 'swap', analog: 'Musthave Ice Mint' },
    ],
    presets: ['50/30/20', '40/40/20', '60/20/20'],
  },
  library: [
    { id: 'ds-wild', name: 'Wildberry', brand: 'Darkside', flavors: 'лесные ягоды', added: false },
    { id: 'bb-rasp', name: 'Raspberries', brand: 'Black Burn', flavors: 'малина', added: true },
    { id: 'bb-cheese', name: 'Cheesecake', brand: 'Black Burn', flavors: 'чизкейк, сливки', added: false },
    { id: 'ds-redtea', name: 'Red Tea', brand: 'Darkside', flavors: 'чай каркаде', added: true },
    { id: 'mh-icemint', name: 'Ice Mint', brand: 'Musthave', flavors: 'мята, холодок', added: false },
    { id: 'sr-taiga', name: 'Таежный чай', brand: 'Сарма', flavors: 'чай, хвоя, брусника', added: false },
    { id: 'ds-mango', name: 'Mango Lassi 2.0', brand: 'Darkside', flavors: 'манго, йогурт', added: false },
  ],
  catalog: [
    { id: 'bb-cane', name: 'Cane Mint', brand: 'Black Burn', flavors: 'тростниковая мята', shelf: 'out', mixes: 6 },
    { id: 'bb-rasp', name: 'Raspberries', brand: 'Black Burn', flavors: 'малина', shelf: 'in', mixes: 4 },
    { id: 'bb-lemon', name: 'Lemon Shock', brand: 'Black Burn', flavors: 'лимон, кислинка', shelf: null, mixes: 0 },
    { id: 'ds-supernova', name: 'Supernova', brand: 'Darkside', line: 'Core', flavors: 'ледяной холодок', shelf: 'out', mixes: 4 },
    { id: 'ds-wild', name: 'Wildberry', brand: 'Darkside', line: 'Core', flavors: 'лесные ягоды', shelf: 'in', mixes: 5 },
    { id: 'ah-blansh', name: 'Blansh Чёрный чай с бергамотом', brand: 'AHF Tobacco', line: 'Blansh', flavors: 'чай, бергамот', shelf: null, mixes: 0 },
    { id: 'sr-taiga', name: 'Таежный чай', brand: 'Сарма', line: 'Классическая', flavors: 'чай, хвоя, брусника', shelf: 'in', mixes: 2 },
  ],
  deliveries: [
    { id: 'd1', date: '3 ноя', supplier: 'Каспий Опт', number: '1201', lines: 14, sum: '38 420 ₽', status: 'draft', statusText: 'черновик' },
    { id: 'd2', date: '12 окт', supplier: 'Каспий Опт', number: '1184', lines: 9, sum: '24 960 ₽', status: 'ok', statusText: 'принят 13 окт' },
    { id: 'd3', date: '4 окт', supplier: 'Каспий Опт', number: '1161', lines: 11, sum: '29 300 ₽', status: 'ok', statusText: 'принят 5 окт' },
    { id: 'd4', date: '24 сен', supplier: 'Южный табак', number: '387', lines: 7, sum: '21 700 ₽', status: 'ok', statusText: 'принят 24 сен' },
    { id: 'd5', date: '20 авг', supplier: null, number: null, lines: 269, sum: '—', status: 'ok', statusText: 'стартовый приход' },
  ],
  draftLines: [
    { text: 'Табак BlackBurn Cane Mint 100г', tobacco: 'Cane Mint', brand: 'Black Burn', qty: '2 шт.', price: '2 980 ₽', match: 'success', label: 'по памяти', arrived: true },
    { text: 'DarkSide Core Blackcurrant 100г', tobacco: 'Blackcurrant', brand: 'Darkside', qty: '1 шт.', price: '1 840 ₽', match: 'success', label: 'по каталогу', arrived: true },
    { text: 'Себеро Лимон шипучка 200г', tobacco: 'Лимонная шипучка', brand: 'Sebero', qty: '2 шт.', price: '2 360 ₽', match: 'warning', label: 'проверьте', arrived: true },
    { text: 'Мята-лайм 200г', tobacco: null, qty: '1 шт.', price: '1 290 ₽', match: 'danger', label: 'нет в каталоге', arrived: true },
    { text: 'Доставка', tobacco: null, qty: '', price: '350 ₽', match: 'ghost', label: 'не табак', skip: true },
  ],
  rails: [
    { id: 'r1', name: 'Больше всего выбирают', type: 'Статистический', readOnly: true, count: 8, mixes: 'Малиновый морс, Морозная ягода, Манго ласси с чаем', description: 'Статистический рейл формируется автоматически и доступен только для просмотра.' },
    { id: 'r2', name: 'Холодок', type: 'Ручной', count: 5, mixes: 'Морозная ягода, Ледяной лайм, Малиновый морс', description: 'Для тех, кто любит мятный финал.' },
    { id: 'r3', name: 'Чайные', type: 'Ручной', count: 4, mixes: 'Манго ласси с чаем, Таёжный морс', description: 'Мягкие миксы на чайной основе.' },
    { id: 'r4', name: 'Новинки ноября', type: 'Ручной', count: 0, off: true, mixes: '', description: '' },
  ],
  operators: [
    { name: 'Анна', phone: '+7 999 120-44-18', tg: '@anna_nomad', last: 'код 4 ноя' },
    { name: 'Илья', phone: '+7 999 761-03-52', tg: '@ilya_hk', last: 'код 2 ноя' },
  ],
  staff: [
    { name: 'Максим', login: 'maxim', role: 'master', last: 'сегодня 14:12', on: true },
    { name: 'Администратор', login: 'admin', role: 'admin', last: '1 ноя', on: true },
    { name: 'Стажёр', login: 'trainee', role: 'master', last: 'не входил', on: false },
  ],
};
