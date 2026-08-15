// Mock staff data for the Мастер kit.
window.MASTER_MOCK = {
  tobaccos: [
    { id: 't1', name: 'Wildberry', manufacturer: 'Darkside', line: 'Core', profiles: 'Ягоды', mixes: 4, inStock: true, updated: '14 авг, 18:20' },
    { id: 't2', name: 'Red Tea', manufacturer: 'Darkside', line: 'Core', profiles: 'Напитки', mixes: 6, inStock: true, updated: '14 авг, 18:20' },
    { id: 't3', name: 'Cosmo Flower', manufacturer: 'Darkside', line: 'Base', profiles: 'Цветы', mixes: 2, inStock: false, updated: '14 авг, 12:04' },
    { id: 't4', name: 'Orange Team', manufacturer: 'MustHave', line: '—', profiles: 'Цитрусы', mixes: 3, inStock: true, updated: '13 авг, 22:41' },
    { id: 't5', name: 'Cheesecake', manufacturer: 'Spectrum', line: 'Classic', profiles: 'Десертка', mixes: 5, inStock: true, updated: '13 авг, 19:15' },
    { id: 't6', name: 'Ice Granny', manufacturer: 'BlackBurn', line: '—', profiles: 'Прочие', mixes: 2, inStock: false, updated: '12 авг, 09:58' },
  ],
  mixes: [
    { id: 'x1', name: 'Морозная ягода', components: 3, rails: 'Больше всего выбирают', status: 'visible', rating: 4.7, chosen: 214 },
    { id: 'x2', name: 'Cheesecake Wild Forest', components: 3, rails: 'Больше всего выбирают, Вечер в ателье', status: 'visible', rating: 4.8, chosen: 176 },
    { id: 'x3', name: 'Космокола', components: 3, rails: 'Больше всего выбирают', status: 'blocked', rating: 4.4, chosen: 168 },
    { id: 'x4', name: 'Pirate Citrus', components: 3, rails: 'Советуют мастера', status: 'visible', rating: 4.6, chosen: 118 },
    { id: 'x5', name: 'Лимонный пирог', components: 2, rails: 'Вечер в ателье', status: 'hidden', rating: 4.5, chosen: 87 },
  ],
  rails: [
    { id: 'r1', name: 'Больше всего выбирают', type: 'statistical', mixes: 5, editable: false, reason: 'Пересчитывается по событиям «Покурить»' },
    { id: 'r2', name: 'Лучшие оценки', type: 'statistical', mixes: 5, editable: false, reason: 'Пересчитывается по оценкам гостей' },
    { id: 'r3', name: 'Вечер в ателье', type: 'prepared', mixes: 4, editable: true, reason: '' },
    { id: 'r4', name: 'Советуют мастера', type: 'curated', mixes: 4, editable: true, reason: '' },
  ],
  operators: [
    { id: 'o1', name: 'Ирина К.', phone: '+7 903 555-14-02', linked: true, active: true },
    { id: 'o2', name: 'Пётр С.', phone: '+7 926 118-77-30', linked: false, active: true },
    { id: 'o3', name: 'Артём Л.', phone: '+7 916 402-09-55', linked: true, active: false },
  ],
  staff: [
    { id: 's1', login: 'admin', role: 'admin', active: true },
    { id: 's2', login: 'atelier', role: 'master', active: true },
  ],
  audit: [
    { id: 'a1', at: '14 авг, 18:22', action: 'inventory.toggle', entity: 'Cosmo Flower → нет в наличии', who: 'atelier' },
    { id: 'a2', at: '14 авг, 17:05', action: 'mix.update', entity: 'Морозная ягода · состав', who: 'admin' },
    { id: 'a3', at: '14 авг, 09:00', action: 'code.rotate', entity: 'Код смены 4821', who: 'system' },
  ],
};
