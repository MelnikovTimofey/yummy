/* global React */
// Mock data + helpers for Nomad Master refactor demo
// Realistic enough to demonstrate ergonomics

const TOBACCO_BRANDS = [
  { name: "Nomad Reserve", short: "NR" },
  { name: "Atlas Smoke", short: "AS" },
  { name: "Velvet Line", short: "VL" },
  { name: "North Wind", short: "NW" },
  { name: "Lounge Garden", short: "LG" },
  { name: "Duft", short: "DT" },
  { name: "Adalya", short: "AD" },
  { name: "Tangiers", short: "TG" },
  { name: "Brusko", short: "BR" },
  { name: "Satyr", short: "ST" },
];

const FLAVOR_PROFILES = [
  "Фруктовые", "Ягодные", "Цитрусовые", "Десертные", "Сладкие",
  "Мятные", "Свежие", "Пряные", "Табачные", "Цветочно-травяные",
  "Кислые", "Парфюмерные",
];

// Build a tobacco library
function makeTobacco(id, name, brand, line, profiles, flavors, strength, inStock = true, usage = 0) {
  return {
    id,
    name,
    manufacturer: brand,
    brandShort: TOBACCO_BRANDS.find((b) => b.name === brand)?.short || brand.slice(0, 2).toUpperCase(),
    lineName: line,
    flavorProfiles: profiles,
    flavors,
    strength,
    inStock,
    usageCount: usage, // how many mixes use this tobacco
    updatedAt: "2026-05-24T19:45:00Z",
    description: "",
  };
}

const TOBACCOS = [
  makeTobacco("t-citrus-breeze", "Citrus Breeze", "Nomad Reserve", "Signature", ["Цитрусовые", "Свежие"], ["лимон", "грейпфрут", "лайм"], "medium", true, 5),
  makeTobacco("t-mint-veil", "Mint Veil", "Nomad Reserve", "Signature", ["Мятные", "Свежие"], ["мята", "холодок"], "light", true, 7),
  makeTobacco("t-berry-oasis", "Berry Oasis", "Nomad Reserve", "Signature", ["Ягодные", "Сладкие"], ["малина", "черника", "клубника"], "medium", true, 4),
  makeTobacco("t-desert-honey", "Desert Honey", "Nomad Reserve", "Signature", ["Десертные", "Сладкие"], ["мёд", "ваниль", "карамель"], "medium", true, 2),
  makeTobacco("t-spice-route", "Spice Route", "Nomad Reserve", "Signature", ["Пряные", "Табачные"], ["корица", "кардамон", "мёд"], "strong", true, 2),
  makeTobacco("t-rose-noct", "Rose Nocturne", "Lounge Garden", "Petal", ["Цветочно-травяные", "Парфюмерные"], ["роза", "пион"], "light", true, 1),
  makeTobacco("t-coconut-cream", "Coconut Cream", "North Wind", "Soft", ["Десертные", "Сладкие"], ["кокос", "сливки", "ваниль"], "light", true, 1),
  makeTobacco("t-apple-fizz", "Apple Fizz", "North Wind", "Soft", ["Кислые", "Фруктовые"], ["зелёное яблоко", "лимон"], "medium", true, 1),
  makeTobacco("t-grape-fog", "Grape Fog", "Atlas Smoke", "Reserve", ["Ягодные", "Фруктовые"], ["виноград", "ежевика"], "medium", false, 1),
  makeTobacco("t-pear-bloom", "Pear Bloom", "Velvet Line", "Soft", ["Фруктовые", "Цветочно-травяные"], ["груша", "белые цветы"], "light", true, 1),
  makeTobacco("t-iced-plum", "Iced Plum", "Velvet Line", "Soft", ["Ягодные", "Мятные"], ["слива", "лёд"], "medium", true, 1),
  makeTobacco("t-dark-leaf", "Dark Leaf", "Atlas Smoke", "Reserve", ["Табачные", "Пряные"], ["пряности", "корица"], "strong", true, 1),
  makeTobacco("t-herbal-dawn", "Herbal Dawn", "Lounge Garden", "Petal", ["Свежие", "Цветочно-травяные"], ["зелёный чай", "мелисса", "лайм"], "light", true, 0),
  makeTobacco("t-peach-silk", "Peach Silk", "Nomad Reserve", "Signature", ["Сладкие", "Фруктовые"], ["персик"], "medium", false, 1),
  makeTobacco("t-mango-tide", "Mango Tide", "Duft", "All Stars", ["Фруктовые", "Сладкие"], ["манго"], "medium", true, 0),
  makeTobacco("t-bubblegum", "Bubblegum Pop", "Brusko", "Strong", ["Сладкие", "Парфюмерные"], ["жвачка"], "medium", true, 0),
  makeTobacco("t-watermelon", "Watermelon Splash", "Adalya", "Classic", ["Фруктовые", "Свежие"], ["арбуз"], "light", true, 0),
  makeTobacco("t-pineapple", "Pineapple Glow", "Adalya", "Classic", ["Фруктовые", "Кислые"], ["ананас"], "medium", true, 0),
  makeTobacco("t-orange-zest", "Orange Zest", "Tangiers", "Noir", ["Цитрусовые", "Кислые"], ["апельсин"], "strong", true, 0),
  makeTobacco("t-cardamom", "Cardamom Velvet", "Tangiers", "Noir", ["Пряные", "Десертные"], ["кардамон", "ваниль"], "strong", false, 0),
  makeTobacco("t-cherry-mist", "Cherry Mist", "Satyr", "Soft", ["Ягодные", "Сладкие"], ["вишня"], "light", true, 0),
  makeTobacco("t-vanilla-wood", "Vanilla Wood", "Satyr", "Aroma", ["Десертные"], ["ваниль", "дерево"], "medium", true, 0),
  makeTobacco("t-cassis", "Cassis Bloom", "Lounge Garden", "Petal", ["Ягодные", "Цветочно-травяные"], ["чёрная смородина"], "medium", true, 0),
  makeTobacco("t-melon-frost", "Melon Frost", "Duft", "All Stars", ["Фруктовые", "Мятные"], ["дыня", "холодок"], "light", true, 0),
  makeTobacco("t-tropic-rain", "Tropic Rain", "Brusko", "Strong", ["Фруктовые"], ["маракуйя"], "strong", true, 0),
];

const MIXES = [
  {
    id: "m-citrus-caravan",
    name: "Цитрусовый караван",
    description: "Свежий микс с ярким лимонно-мятным акцентом.",
    components: [
      { tobaccoId: "t-citrus-breeze", proportion: 50 },
      { tobaccoId: "t-mint-veil", proportion: 50 },
    ],
    flavorProfiles: ["Свежие", "Цитрусовые", "Кислые", "Мятные"],
    flavors: ["лимон", "грейпфрут", "лайм", "мята"],
    railIds: ["r-quickstart"],
    avgRating: 4.8,
    ratingsCount: 12,
    popularity: 92,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-berry-dawn",
    name: "Ягодный рассвет",
    description: "Мягкая ягодная сладость с холодным хвостом.",
    components: [
      { tobaccoId: "t-berry-oasis", proportion: 50 },
      { tobaccoId: "t-mint-veil", proportion: 50 },
    ],
    flavorProfiles: ["Ягодные", "Сладкие", "Фруктовые", "Свежие", "Мятные"],
    flavors: ["малина", "черника", "мята"],
    railIds: ["r-quickstart"],
    avgRating: 4.7,
    ratingsCount: 9,
    popularity: 85,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-silk-road",
    name: "Шёлковый путь",
    description: "Десертный микс с мёдом и ванилью.",
    components: [
      { tobaccoId: "t-desert-honey", proportion: 50 },
      { tobaccoId: "t-berry-oasis", proportion: 50 },
    ],
    flavorProfiles: ["Десертные", "Сладкие", "Ягодные", "Фруктовые"],
    flavors: ["мёд", "ваниль", "малина", "черника"],
    railIds: ["r-soft"],
    avgRating: 4.6,
    ratingsCount: 14,
    popularity: 78,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-amber-bazaar",
    name: "Янтарный базар",
    description: "Пряно-табачный профиль с тёплым послевкусием.",
    components: [
      { tobaccoId: "t-spice-route", proportion: 50 },
      { tobaccoId: "t-desert-honey", proportion: 50 },
    ],
    flavorProfiles: ["Пряные", "Табачные", "Десертные", "Сладкие"],
    flavors: ["корица", "кардамон", "мёд", "ваниль"],
    railIds: ["r-curated"],
    avgRating: 4.5,
    ratingsCount: 7,
    popularity: 74,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-apple-wave",
    name: "Яблочная волна",
    description: "Сочный кисло-свежий микс с холодным послевкусием.",
    components: [
      { tobaccoId: "t-apple-fizz", proportion: 50 },
      { tobaccoId: "t-mint-veil", proportion: 50 },
    ],
    flavorProfiles: ["Кислые", "Фруктовые", "Свежие", "Мятные"],
    flavors: ["зелёное яблоко", "лимон", "мята"],
    railIds: ["r-quickstart"],
    avgRating: 4.4,
    ratingsCount: 6,
    popularity: 69,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-grape-atelier",
    name: "Виноградное ателье",
    description: "Фруктовый микс с ягодной глубиной и мягкой основой.",
    components: [
      { tobaccoId: "t-grape-fog", proportion: 50 },
      { tobaccoId: "t-pear-bloom", proportion: 50 },
    ],
    flavorProfiles: ["Ягодные", "Фруктовые", "Цветочно-травяные"],
    flavors: ["виноград", "ежевика", "груша"],
    railIds: ["r-soft"],
    avgRating: 4.5,
    ratingsCount: 4,
    popularity: 66,
    available: false, // blocked because Grape Fog out of stock
    guestVisible: false,
  },
  {
    id: "m-plum-night",
    name: "Сливовая ночь",
    description: "Ледяная ягодная подача для тех, кто любит прохладный дым.",
    components: [
      { tobaccoId: "t-iced-plum", proportion: 50 },
      { tobaccoId: "t-berry-oasis", proportion: 50 },
    ],
    flavorProfiles: ["Ягодные", "Мятные", "Свежие", "Сладкие", "Фруктовые"],
    flavors: ["слива", "лёд", "малина"],
    railIds: ["r-soft"],
    avgRating: 4.4,
    ratingsCount: 5,
    popularity: 64,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-dark-market",
    name: "Тёмный рынок",
    description: "Табачный микс с сухофруктами и тёплыми специями.",
    components: [
      { tobaccoId: "t-dark-leaf", proportion: 50 },
      { tobaccoId: "t-spice-route", proportion: 50 },
    ],
    flavorProfiles: ["Табачные", "Пряные"],
    flavors: ["пряности", "корица", "кардамон"],
    railIds: ["r-curated"],
    avgRating: 4.3,
    ratingsCount: 3,
    popularity: 61,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-rose-dusk",
    name: "Розовый сумрак",
    description: "Нежный цветочно-парфюмный микс для медленного вечера.",
    components: [
      { tobaccoId: "t-rose-noct", proportion: 50 },
      { tobaccoId: "t-coconut-cream", proportion: 50 },
    ],
    flavorProfiles: ["Парфюмерные", "Цветочно-травяные", "Десертные", "Сладкие"],
    flavors: ["роза", "кокос", "сливки", "ваниль"],
    railIds: ["r-curated"],
    avgRating: 4.2,
    ratingsCount: 4,
    popularity: 58,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-herbal-garden",
    name: "Травяной сад",
    description: "Спокойный чайный микс с цитрусовой свежестью.",
    components: [
      { tobaccoId: "t-herbal-dawn", proportion: 50 },
      { tobaccoId: "t-mint-veil", proportion: 50 },
    ],
    flavorProfiles: ["Свежие", "Цветочно-травяные", "Мятные"],
    flavors: ["зелёный чай", "мелисса", "лайм", "мята"],
    railIds: [],
    avgRating: 4.3,
    ratingsCount: 2,
    popularity: 63,
    available: true,
    guestVisible: true,
  },
  {
    id: "m-peach-mirage",
    name: "Персиковый мираж",
    description: "Сладкий фруктовый микс, сейчас недоступен по наличию.",
    components: [
      { tobaccoId: "t-peach-silk", proportion: 50 },
      { tobaccoId: "t-mint-veil", proportion: 50 },
    ],
    flavorProfiles: ["Сладкие", "Фруктовые", "Свежие", "Мятные"],
    flavors: ["персик", "мята"],
    railIds: [],
    avgRating: 4.4,
    ratingsCount: 3,
    popularity: 81,
    available: false,
    guestVisible: false,
  },
];

const RAILS = [
  { id: "r-stat-pop", name: "Больше всего выбирают", type: "statistical", editable: false,
    description: "Миксы, которые выбирают чаще всего и лучше оценивают гости.",
    mixIds: ["m-citrus-caravan", "m-berry-dawn", "m-silk-road"], active: true },
  { id: "r-stat-rated", name: "Лучшие оценки", type: "statistical", editable: false,
    description: "Миксы с самыми сильными оценками гостей.",
    mixIds: ["m-citrus-caravan", "m-berry-dawn", "m-silk-road"], active: true },
  { id: "r-quickstart", name: "Быстрый старт", type: "prepared", editable: true,
    description: "Лёгкие и понятные миксы для первого выбора в зале.",
    mixIds: ["m-citrus-caravan", "m-apple-wave", "m-berry-dawn"], active: true },
  { id: "r-soft", name: "Мягкая витрина", type: "prepared", editable: true,
    description: "Сладкие, фруктовые и спокойные сочетания для длинного вечера.",
    mixIds: ["m-silk-road", "m-grape-atelier", "m-plum-night"], active: true },
  { id: "r-curated", name: "От наших мастеров", type: "curated", editable: true,
    description: "Подборка, которую команда зала советует для более выразительного вкуса.",
    mixIds: ["m-amber-bazaar", "m-dark-market", "m-rose-dusk"], active: true },
];

// --------- Color hash for components (so proportion bar is visually distinct) ---------
const COMPONENT_HUES = [38, 200, 160, 80, 320, 260, 20, 120];
function colorForTobacco(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = COMPONENT_HUES[h % COMPONENT_HUES.length];
  return {
    fill: `oklch(0.65 0.13 ${hue})`,
    soft: `oklch(0.65 0.13 ${hue} / 0.14)`,
    border: `oklch(0.65 0.13 ${hue} / 0.4)`,
    text: `oklch(0.78 0.12 ${hue})`,
  };
}

// =====================================================================
// Access / staff / Telegram / audit (used by Access screen)
// =====================================================================

const DAILY_CODE = {
  current: "NOMAD-2026",
  startsAt: "2026-05-24T00:00:00",
  endsAt: "2026-05-25T00:00:00",
  rotationMode: "auto", // auto | manual
  rotationTime: "00:00",
  history: [
    { code: "NOMAD-2026", day: "24 мая", requests: 18, verified: 16 },
    { code: "ATLAS-7421", day: "23 мая", requests: 24, verified: 22 },
    { code: "VELVET-3309", day: "22 мая", requests: 31, verified: 28 },
    { code: "SILK-8812", day: "21 мая", requests: 27, verified: 24 },
    { code: "OASIS-1145", day: "20 мая", requests: 19, verified: 17 },
  ],
};

const TG_BOT = {
  status: "healthy", // healthy | degraded | down
  heartbeat: "2026-05-24T21:45:00",
  lastCodeRequest: { at: "2026-05-24T21:12:00", operator: "Анна", chat: "@anna_n" },
  errors: [],
};

const OPERATORS = [
  {
    id: "op-anna",
    name: "Анна",
    phone: "+79991234567",
    role: "Кальянный мастер",
    chatBound: true,
    chatHandle: "@anna_nomad",
    active: true,
    lastCodeAt: "2026-05-24T21:12:00",
    addedAt: "2026-04-12",
  },
  {
    id: "op-ilya",
    name: "Илья",
    phone: "+79997654321",
    role: "Кальянный мастер",
    chatBound: false,
    chatHandle: null,
    active: true,
    lastCodeAt: null,
    addedAt: "2026-05-20",
  },
  {
    id: "op-sergey",
    name: "Сергей",
    phone: "+79993338890",
    role: "Администратор зала",
    chatBound: true,
    chatHandle: "@sergey_n",
    active: true,
    lastCodeAt: "2026-05-24T18:30:00",
    addedAt: "2026-03-01",
  },
  {
    id: "op-marina",
    name: "Марина",
    phone: "+79991112233",
    role: "Кальянный мастер",
    chatBound: true,
    chatHandle: "@marina_n",
    active: false,
    lastCodeAt: "2026-05-10T19:22:00",
    addedAt: "2026-02-14",
  },
];

const STAFF_USERS = [
  { id: "u-admin", login: "admin", name: "Admin", role: "admin", active: true, lastLoginAt: "2026-05-24T19:01:00" },
  { id: "u-nomad", login: "nomad", name: "Nomad Staff", role: "nomad", active: true, lastLoginAt: "2026-05-24T15:42:00" },
];

const AUDIT_EVENTS = [
  { at: "2026-05-24T21:12:00", actor: "система", kind: "code_issued", text: "Выдан daily code Анне (@anna_nomad)" },
  { at: "2026-05-24T19:01:00", actor: "admin", kind: "login", text: "Вход в Master" },
  { at: "2026-05-24T18:30:00", actor: "система", kind: "code_issued", text: "Выдан daily code Сергею (@sergey_n)" },
  { at: "2026-05-24T15:42:00", actor: "nomad", kind: "login", text: "Вход в Master" },
  { at: "2026-05-24T00:00:00", actor: "система", kind: "code_rotated", text: "Daily code обновлён: NOMAD-2026" },
  { at: "2026-05-23T22:14:00", actor: "admin", kind: "operator_added", text: "Добавлен оператор Илья (+79997654321)" },
  { at: "2026-05-23T17:08:00", actor: "admin", kind: "tobacco_added", text: "Добавлено 4 табака линейки Tangiers Noir" },
  { at: "2026-05-22T11:33:00", actor: "nomad", kind: "mix_visibility", text: "Скрыт от гостя «Персиковый мираж»" },
  { at: "2026-05-22T11:14:00", actor: "nomad", kind: "stock", text: "Отмечено «нет в наличии»: Grape Fog, Peach Silk" },
  { at: "2026-05-21T20:02:00", actor: "admin", kind: "rail_edit", text: "Обновлён рейл «От наших мастеров»" },
];

window.NomadData = {
  TOBACCOS, MIXES, RAILS, TOBACCO_BRANDS, FLAVOR_PROFILES,
  colorForTobacco,
  DAILY_CODE, TG_BOT, OPERATORS, STAFF_USERS, AUDIT_EVENTS,
};
