// Собирает файлы Design System «Арома Ателье, Film Noir» для Claude Design из канона
// репозитория. Публикация — вручную инструментом Artifact, см. README.md рядом.
// node packages/design-tokens/claude-design/build.mjs <out>
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const repo = resolvePath(HERE, '../../..');
const out = resolvePath(process.argv[2] || '');
if (!process.argv[2]) throw new Error('укажите папку для сборки: build.mjs <out>');
process.env.REF ??= 'main@' + execSync('git rev-parse --short HEAD', { cwd: repo }).toString().trim();
const TOK = join(repo, 'packages/design-tokens');
const SKILL = join(repo, '.claude/skills/aroma-atelier-design');
const P = join(out, 'project');
rmSync(out, { recursive: true, force: true });
const write = (rel, text) => {
  const file = join(P, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const read = (file) => readFileSync(file, 'utf8');

// ── Декларации канона: имя → { value, comment, file } ──
const decls = new Map();
for (const name of ['colors', 'profile-colors', 'typography', 'spacing', 'radius', 'elevation', 'motion', 'guest-surface', 'fonts']) {
  const css = read(join(TOK, name + '.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const root = css.slice(css.indexOf(':root'));
  const re = /(?:^|[{;\s])--([\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(root))) {
    decls.set(m[1], { value: m[2].replace(/\s+/g, ' ').trim(), file: name });
  }
}
const val = (name) => decls.get(name).value;
const resolve = (name) => {
  let v = val(name);
  while (/^var\(--([\w-]+)\)$/.test(v)) v = val(v.match(/^var\(--([\w-]+)\)$/)[1]);
  return v;
};
const placed = new Set();
const token = (name, usage, literal = false) => {
  placed.add(name);
  const raw = val(name);
  const alias = raw.match(/^var\(--([\w-]+)\)$/);
  return { name, value: alias && !literal ? '{' + alias[1] + '}' : literal ? resolve(name) : raw, usage };
};

// ── Цвета: одна тема Film Noir (продукт только тёмный) ──
const U = {
  'bg-base': 'Фон страницы и консоли Мастера. Текст `text-primary` на нём 14:1.',
  'bg-raised': 'Карточки, строки и панели первого уровня.',
  'bg-elevated': 'Поповеры и выпадающие меню, второй уровень над `bg-raised`.',
  'bg-overlay': 'Третий уровень: активный сегмент, тултипы, подложки поверх карточек.',
  glass: 'Полупрозрачная панель поверх контента (липкие шапки) с backdrop-blur.',
  'text-primary': 'Основной текст и заголовки на `bg-base` (14.7:1), `bg-raised` и `bg-elevated` (12.5:1).',
  'text-secondary': 'Вторичный текст: вкусы, подписи, описания. На `bg-base` 8.9:1, на `bg-elevated` 7.5:1.',
  'text-muted': 'Приглушённый текст: служебные подписи, значки, шапки таблиц. На `bg-base` 5.5:1, на `bg-elevated` 4.7:1.',
  'text-faint': 'Только декоративный текст и неактивные метки: на `bg-base` 3.3:1, для смысла не годится.',
  accent: 'Единственный цвет бренда, бордо. Заливки CTA, черта активной вкладки, графики. Текстом и иконками не набирается: на `bg-base` 2.3:1.',
  'accent-hover': 'Hover акцентных элементов и обводка фокуса 2 px. На `bg-base` 2.9:1, чуть ниже 3:1: так в продукте, не перекрашивать без решения владельца.',
  'accent-deep': 'Нижняя точка градиента CTA и глубокие заливки акцента.',
  'accent-fg': 'Текст на заливке `accent` (7:1) и `accent-deep` (11:1).',
  'accent-soft': 'Мягкая подложка акцента: hover контурной кнопки, кольцо фокуса.',
  'accent-border': 'Контур акцентных кнопок, рейтинга и колец.',
  'border-subtle': 'Hairline по умолчанию: карточки, строки, разделители.',
  'border-default': 'Контур контролов и активного сегмента.',
  'border-strong': 'Усиленный контур: hover полей ввода, выделенные блоки.',
  success: 'Состояние «готово», «в наличии». Всегда со словом или значком.',
  'success-soft': 'Подложка тега успеха.',
  warning: 'Предупреждения и «скоро закончится». Всегда со словом или значком.',
  'warning-soft': 'Подложка тега предупреждения.',
  danger: 'Ошибки и удаление. Всегда со словом или значком.',
  'danger-soft': 'Подложка ошибки.',
  'danger-border': 'Контур полей и кнопок с ошибкой.',
  info: 'Нейтральные справки в консоли Мастера.',
  'info-soft': 'Подложка тега справки.',
  'line-soft': 'Самый тихий разделитель: внутри карточек и списков, рамка фото вкуса.',
  input: 'Фон полей ввода Мастера (shadcn).',
  'profile-fallback': 'Цвет профиля, если категория не узнана.',
  'guest-row-bg': 'Фон строки микса в гостевых списках.',
  'guest-control-bg': 'Фон гостевых контролов: кнопки-призраки, поля.',
  'guest-control-bg-soft': 'Hover-фон иконочных кнопок шапки и тихие контролы гостя.',
  'guest-chip-bg': 'Фон неактивного чипа вкуса.',
  'guest-chip-ink-on': 'Текст активного чипа на `guest-chip-bg-on` (градиент, в `bundle.css`).',
  'guest-chip-border-on': 'Контур активного чипа.',
  'cta-solid-border': 'Контур гостевой CTA «Покурить».',
  'cta-solid-ink': 'Текст гостевой CTA на градиенте бордо (`cta-solid`, в `bundle.css`).',
  'cta-solid-disabled-bg': 'Фон неактивной CTA.',
  'segment-active-bg': 'Фон активного сегмента: графит, а не бордо.',
  'segment-active-ink': 'Текст активного сегмента.',
  'segment-active-border': 'Контур активного сегмента.',
  'segment-active-mark': 'Черта акцента под активным сегментом.',
  'segment-idle-bg': 'Фон неактивного сегмента.',
  'rating-bg': 'Фон плашки рейтинга.',
  'rating-border': 'Контур плашки рейтинга.',
  'rating-ink': 'Текст и звезда рейтинга.',
};
const groupUsage = (name) => {
  if (U[name]) return U[name];
  if (name.startsWith('chart-')) return 'Серия графиков на дашбордах Мастера, по порядку.';
  if (name.startsWith('profile-')) return `Цвет профиля вкуса «${name.slice(8)}»: глиф, полоса SignatureBar, чипы. Слой данных, не палитра бренда.`;
  if (name.startsWith('composition-')) return 'Сегмент полосы состава микса (CompositionStack), по порядку компонентов.';
  return `Алиас shadcn и прежних гостевых имён: то же, что ${val(name)}. Используйте в коде приложений, в новых макетах берите исходный токен.`;
};
const colorNames = [
  ...['bg-base', 'bg-raised', 'bg-elevated', 'bg-overlay', 'glass'],
  ...['text-primary', 'text-secondary', 'text-muted', 'text-faint'],
  ...['accent', 'accent-hover', 'accent-deep', 'accent-fg', 'accent-soft', 'accent-border'],
  ...['border-subtle', 'border-default', 'border-strong', 'line-soft'],
  ...['success', 'success-soft', 'warning', 'warning-soft', 'danger', 'danger-soft', 'danger-border', 'info', 'info-soft'],
  ...['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  ...[...decls.keys()].filter((n) => n.startsWith('profile-') || n.startsWith('composition-')),
  ...['guest-row-bg', 'guest-control-bg', 'guest-control-bg-soft', 'guest-chip-bg', 'guest-chip-ink-on', 'guest-chip-border-on'],
  ...['cta-solid-border', 'cta-solid-ink', 'cta-solid-disabled-bg'],
  ...['segment-active-bg', 'segment-active-ink', 'segment-active-border', 'segment-active-mark', 'segment-idle-bg'],
  ...['rating-bg', 'rating-border', 'rating-ink'],
  ...['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'destructive', 'border', 'input', 'ring'],
  ...['surface', 'surface-alt', 'surface-elevated', 'text-0', 'text-1', 'text-2', 'line'],
];
const color = {
  themes: [{ id: 'dark', name: 'Film Noir' }],
  tokens: colorNames.map((n) => token(n, groupUsage(n))),
};

// ── Типографика ──
const fam = (n) => val(n).replace(/"/g, '"');
const type = {
  fonts: [],
  families: { display: fam('font-display'), body: fam('font-body'), serif: fam('font-serif'), sans: fam('font-sans'), meta: fam('font-meta') },
  groups: [
    {
      name: 'Гость, Literata',
      family: 'display',
      styles: [
        { name: 'guest-hero', fontSize: '46px', lineHeight: 1.05, fontWeight: 400, sample: 'Арома Ателье', usage: 'Словесный знак на гейте.' },
        { name: 'guest-title', fontSize: '34px', lineHeight: 1.05, fontWeight: 400, sample: 'Готово, покажите мастеру', usage: 'Заголовок знакомства и подтверждения.' },
        { name: 'guest-h1', fontSize: '28px', lineHeight: 1.2, fontWeight: 400, sample: 'С чего начнём?', usage: 'Заголовок шага онбординга, название в рилсе.' },
        { name: 'guest-h2', fontSize: '22px', lineHeight: 1.2, fontWeight: 400, sample: 'Морозная ягода', usage: 'Заголовок героя подбора и листа микса.' },
        { name: 'guest-h3', fontSize: '16px', lineHeight: 1.35, fontWeight: 400, sample: 'Кашмирская вишня с орчатой', usage: 'Название в строке микса. Литерате нужна высота строки от 1.33, иначе хвосты букв срезаются.' },
      ],
    },
    {
      name: 'Гость, Mulish',
      family: 'body',
      styles: [
        { name: 'guest-body', fontSize: '15px', lineHeight: 1.5, fontWeight: 400, sample: 'Пара вопросов о вкусах, и подбор соберётся из того, что есть сегодня.', usage: 'Основной текст гостя.' },
        { name: 'guest-small', fontSize: '13px', lineHeight: 1.5, fontWeight: 400, sample: 'клубника, лесные ягоды, чёрный чай', usage: 'Вкусы, подписи, подсказки.' },
        { name: 'guest-cta', fontSize: '13px', lineHeight: 1.2, fontWeight: 600, letterSpacing: '0.18em', sample: 'ПОКУРИТЬ', usage: 'Только главная кнопка гостя AromaCTA: UPPERCASE с трекингом 0.18em.' },
        { name: 'caps', fontSize: '11px', lineHeight: 1.4, fontWeight: 500, letterSpacing: '0.18em', sample: 'НАМИКСУЙ', usage: 'Класс `.aroma-caps`: редкая служебная метка. Не ставить надзаголовком над каждым заголовком.' },
      ],
    },
    {
      name: 'Мастер, Source Serif 4',
      family: 'serif',
      styles: [
        { name: 'master-display', fontSize: '28px', lineHeight: 1.2, fontWeight: 500, sample: 'Дашборд смены', usage: 'Заголовок страницы консоли.' },
        { name: 'master-title', fontSize: '20px', lineHeight: 1.2, fontWeight: 500, sample: 'Миксы', usage: 'Заголовок карточки и секции.' },
      ],
    },
    {
      name: 'Мастер, IBM Plex Sans',
      family: 'sans',
      styles: [
        { name: 'master-body', fontSize: '14px', lineHeight: 1.5, fontWeight: 400, sample: 'Darkside Supernova, 100 г', usage: 'Текст консоли.' },
        { name: 'master-base', fontSize: '13px', lineHeight: 1.5, fontWeight: 400, sample: 'Добавлено 12 табаков', usage: 'Плотные строки таблиц.' },
        { name: 'master-small', fontSize: '12px', lineHeight: 1.5, fontWeight: 400, sample: 'обновлено 5 минут назад', usage: 'Подписи и подсказки.' },
        { name: 'master-th', fontSize: '10.5px', lineHeight: 1.4, fontWeight: 500, letterSpacing: '0.1em', sample: 'ТАБАК', usage: 'Шапка таблицы Мастера: UPPERCASE, tabular-nums.' },
      ],
    },
  ],
};

// ── Длины ──
const lengthUsage = {
  'space-1': 'Зазор значка и подписи.', 'space-2': 'Зазор между карточками ленты и чипами.', 'space-3': 'Внутренний отступ строки, зазор секций гостя.',
  'space-4': 'Отступ карточек Мастера.', 'space-5': 'Поле экрана гостя.', 'space-6': 'Отступ секций консоли.', 'space-8': 'Разрыв крупных блоков.', 'space-10': 'Верхний отступ страниц.',
  'row-h': 'Высота плотной строки таблицы Мастера.', 'list-row-min-h': 'Минимальная высота строки списка.', 'guest-shell-w': 'Максимальная ширина гостевого телефона.',
  'guest-gutter': 'Боковое поле гостевого экрана, 20 px.', 'guest-gutter-compact': 'Компактное поле: листы и узкие экраны.', 'tap-min': 'Минимальная цель нажатия.',
  'master-max-w': 'Максимальная ширина рабочей области Мастера.',
  'r-xs': 'Мелкие метки консоли.', 'r-sm': 'Теги и kbd Мастера.', 'r-md': 'Кнопки и поля Мастера.', 'r-lg': 'Карточки Мастера.', 'r-xl': 'Крупные панели Мастера.',
  'r-pill': 'Только плашки-счётчики и точки статуса. Кнопки, вкладки и чипы пилюлей не делаются.', radius: 'База shadcn в консоли Мастера.',
  'r-guest-shell': 'Рамка гостевого телефона.', 'r-guest-sheet': 'Верх нижнего листа.', 'r-guest-hero': 'Герой подбора.', 'r-guest-card': 'Карточки и постеры гостя.',
  'r-guest-row': 'Строка микса.', 'r-guest-glyph': 'Глиф профиля и фото вкуса.', 'r-guest-control': 'Кнопки и поля гостя.', 'r-guest-cta': 'Главная кнопка гостя.',
  'r-guest-chip': 'Чипы вкусов.', 'r-guest-badge': 'Плашка рейтинга.',
};
const spacing = { tokens: ['space-1', 'space-2', 'space-3', 'space-4', 'space-5', 'space-6', 'space-8', 'space-10', 'row-h', 'list-row-min-h', 'guest-shell-w', 'guest-gutter', 'guest-gutter-compact', 'tap-min', 'master-max-w'].map((n) => token(n, lengthUsage[n])) };
const radius = { tokens: ['r-xs', 'r-sm', 'r-md', 'r-lg', 'r-xl', 'r-pill', 'radius', 'r-guest-shell', 'r-guest-sheet', 'r-guest-hero', 'r-guest-card', 'r-guest-row', 'r-guest-glyph', 'r-guest-control', 'r-guest-cta', 'r-guest-chip', 'r-guest-badge'].map((n) => token(n, lengthUsage[n], true)) };
const shadowUsage = {
  'shadow-sm': 'Нижняя кромка плоских элементов консоли.', 'shadow-md': 'Карточки и поповеры Мастера.', 'shadow-lg': 'Модальные окна.',
  'shadow-guest-shell': 'Рамка гостевого телефона.', 'shadow-guest-card': 'Гостевые карточки и герой.', 'shadow-guest-scroll-card': 'Постеры в горизонтальных лентах.',
  'shadow-guest-sheet': 'Нижний лист микса.', 'shadow-guest-popover': 'Гостевые всплывающие панели.', 'highlight-inner': 'Внутренний блик верхней кромки карточки.',
};
const shadow = { tokens: Object.keys(shadowUsage).map((n) => token(n, shadowUsage[n])) };
const fsUsage = {
  'fs-xs': 'Мастер: метки и счётчики.', 'fs-sm': 'Мастер: подписи.', 'fs-base': 'Мастер: плотные таблицы.', 'fs-md': 'Мастер: основной текст.', 'fs-lg': 'Мастер: подзаголовки.',
  'fs-xl': 'Мастер: заголовок карточки.', 'fs-2xl': 'Мастер: заголовок страницы.', 'fs-3xl': 'Мастер: крупные метрики.',
  'fs-guest-hero': 'Гость: словесный знак гейта.', 'fs-guest-title': 'Гость: заголовок знакомства и подтверждения.', 'fs-guest-h1': 'Гость: заголовок онбординга.',
  'fs-guest-h2': 'Гость: герой и лист микса.', 'fs-guest-h3': 'Гость: название в строке.', 'fs-guest-body': 'Гость: основной текст.', 'fs-guest-small': 'Гость: подписи и вкусы.',
  'fs-guest-micro': 'Гость: служебная метка капсом.', 'caps-size': 'Размер `.aroma-caps`.',
};
const fontSize = { tokens: Object.keys(fsUsage).map((n) => token(n, fsUsage[n])) };
const lineHeight = { tokens: [['lh-tight', 'Словесный знак и крупные заголовки.'], ['lh-snug', 'Заголовки.'], ['lh-body', 'Текст.'], ['lh-relaxed', 'Длинные описания.']].map(([n, u]) => token(n, u)) };
const letterSpacing = { tokens: [['caps-tracking', 'Трекинг `.aroma-caps` и CTA гостя.'], ['caps-tracking-wide', 'Широкий трекинг подписей гейта.']].map(([n, u]) => token(n, u)) };
const fontWeight = { tokens: [token('caps-weight', 'Вес `.aroma-caps`.')] };
const duration = { tokens: [['dur-instant', 'Мгновенный отклик нажатия.'], ['dur-fast', 'Hover, смена цвета и контура.'], ['dur-base', 'Раскрытие и смена состояния.'], ['dur-slow', 'Появление панелей.'], ['dur-sheet', 'Выезд нижнего листа.']].map(([n, u]) => token(n, u)) };
const easing = { tokens: [['ease-standard', 'Смена состояний.'], ['ease-out', 'Появление элементов.'], ['ease-spring', 'Выезд листа, мягкая остановка.']].map(([n, u]) => token(n, u)) };

const tokens = {
  name: 'Арома Ателье, Film Noir',
  version: 1,
  meta: {
    source: 'github',
    repo: 'MelnikovTimofey/yummy',
    ref: process.env.REF,
    package: 'packages/design-tokens',
    paths: { tokens: ['packages/design-tokens/'], assets: ['.claude/skills/aroma-atelier-design/assets/'], docs: ['.claude/skills/aroma-atelier-design/readme.md'] },
    synced: new Date().toISOString().slice(0, 10),
  },
  color, type, spacing, radius, shadow, fontSize, lineHeight, letterSpacing, fontWeight, duration, easing,
};
write('tokens.json', JSON.stringify(tokens, null, 2) + '\n');

// ── bundle.css: всё, что токенами не выражается (градиенты, env(), var() в составных значениях), и база ──
const rest = [...decls.entries()].filter(([n, d]) => !placed.has(n) && !n.startsWith('font-') || n === 'font-mono');
let bundleCss = '/* Арома Ателье — то, чего нет в tokens.json: градиенты, составные значения, анимации, база.\n   Значения — из packages/design-tokens/, правятся там. */\n';
bundleCss += '@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;1,7..72,400&family=Mulish:wght@400;500;600;700&display=swap");\n\n:root {\n';
for (const [n, d] of rest) bundleCss += `  --${n}: ${d.value};\n`;
bundleCss += '}\n\n';
const motion = read(join(TOK, 'motion.css'));
bundleCss += motion.slice(motion.indexOf('@keyframes')) + '\n';
const base = read(join(SKILL, 'tokens/base.css'));
bundleCss += base.slice(base.indexOf('*,')) + '\n';
write('components/bundle.css', bundleCss);
console.error('в bundle.css:', rest.map(([n]) => n).join(', '));

// ── Бандл компонентов: только components/*, без UI-китов с автомонтированием ──
const bundle = read(join(SKILL, '_ds_bundle.js')).split('\n');
const kitStart = bundle.findIndex((l) => l.startsWith('// ui_kits/'));
const nsStart = bundle.findIndex((l, i) => i > kitStart && l.startsWith('__ds_ns.'));
let header = bundle[0];
const headerJson = JSON.parse(header.match(/@ds-bundle: (\{.*\}) \*\//)[1]);
const components = headerJson.components.map((c) => ({ name: c.name, group: c.sourcePath.includes('/guest/') ? 'Гость' : 'Мастер', dir: c.sourcePath.split('/')[1] }));
header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: headerJson.namespace, components: components.map(({ name }) => ({ name })) })} */`;
const bundleJs = [header, ...bundle.slice(1, kitStart), ...bundle.slice(nsStart)].join('\n');
if (/<\/script|<!--/i.test(bundleJs)) throw new Error('bundle содержит </script или <!--');
write('components/bundle.js', bundleJs);

// ── Карточки компонентов ──
const SAMPLES = {
  AccessCodeInput: `h(AccessCodeInput,{value:'27',label:'Код мастера',hint:'Код скажет мастер зала.'})`,
  AromaCTA: `h('div',{style:{display:'grid',gap:12,maxWidth:320}},h(AromaCTA,null,'Покурить'),h(AromaCTA,{pulse:true},'Покурить'),h(AromaCTA,{disabled:true},'Покурить'))`,
  AromaChip: `h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},h(AromaChip,{tier:'lg',profile:'berry',active:true},'Ягодный'),h(AromaChip,{profile:'citrus'},'Цитрусовый'),h(AromaChip,{active:true},'клубника'),h(AromaChip,{disabled:true},'мята'))`,
  CompositionStack: `h('div',{style:{maxWidth:360}},h(CompositionStack,{components:[{id:'1',name:'Red Tea',manufacturer:'Darkside',proportion:50},{id:'2',name:'Wildberry',manufacturer:'Darkside',proportion:40},{id:'3',name:'Supernova',manufacturer:'Darkside',proportion:10}]}))`,
  GuestCard: `h('div',{style:{maxWidth:360}},h(GuestCard,{title:'Тоже подходят'},h('p',{style:{margin:0,color:'var(--text-secondary)'}},'Лесные ягоды на холодном чае и лёгкий мороз в финише.')))`,
  GuestTab: `h('div',{style:{display:'flex',gap:8}},h(GuestTab,{active:true},'Знакомство'),h(GuestTab,null,'Предпочтения'))`,
  MixRow: `h('div',{style:{display:'grid',gap:8,maxWidth:380}},h(MixRow,{name:'Морозная ягода',profiles:['berry','fresh'],flavors:['чай','холодок'],rating:4.5}),h(MixRow,{name:'Кашмирская вишня с орчатой',profiles:['fruity','spicy'],flavors:['вишня','кашмир','кола','лайм'],rating:5}))`,
  OnboardingProgress: `h('div',{style:{maxWidth:380}},h(OnboardingProgress,{step:1,total:2}))`,
  ProfileCard: `h('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,160px)',gap:8}},h(ProfileCard,{profile:'sweet',label:'Сладкий',active:true}),h(ProfileCard,{profile:'minty',label:'Мятный'}))`,
  ProfileGlyph: `h('div',{style:{display:'flex',gap:12,alignItems:'center'}},h(ProfileGlyph,{profiles:['berry','fresh','sweet'],size:44}),h(ProfileGlyph,{profiles:['citrus','minty'],size:56}),h(ProfileGlyph,{profiles:['tobacco'],size:32}))`,
  RatingPill: `h('div',{style:{display:'flex',gap:8}},h(RatingPill,{rating:4.6,count:128}),h(RatingPill,{rating:5}))`,
  SegmentNav: `h(function(){const [v,s]=React.useState('showcase');return h('div',{style:{maxWidth:380}},h(SegmentNav,{value:v,onChange:s,items:[{id:'recommendations',label:'Подбор'},{id:'showcase',label:'Витрина'},{id:'catalog',label:'Каталог'}]}))})`,
  ShowcaseCard: `h('div',{style:{display:'flex',gap:8}},h(ShowcaseCard,{name:'Банан на сигарной базе',profiles:['fruity','tobacco'],rating:5}),h(ShowcaseCard,{name:'Тропики без визы',profiles:['fruity','dessert']}))`,
  SignatureBar: `h('div',{style:{display:'grid',gap:10,maxWidth:320}},h(SignatureBar,{profiles:['berry','fresh','sweet'],height:6}),h(SignatureBar,{profiles:['citrus','minty'],height:2}))`,
  EmptyState: `h(EmptyState,null,'Миксов с этим табаком пока нет.')`,
  FilterChip: `h('div',{style:{display:'flex',gap:8}},h(FilterChip,{active:true,count:12},'В наличии'),h(FilterChip,{count:3},'Закончился'),h(FilterChip,null,'В плане'))`,
  MasterButton: `h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},h(MasterButton,{variant:'primary'},'Сохранить'),h(MasterButton,null,'Добавить табак'),h(MasterButton,{variant:'ghost'},'Отмена'),h(MasterButton,{variant:'danger'},'Удалить'))`,
  MasterCard: `h('div',{style:{maxWidth:420}},h(MasterCard,{heading:'Код смены'},h('p',{style:{margin:0}},'Код действует до полуночи.')))`,
  MasterIconButton: `h('div',{style:{display:'flex',gap:8}},h(MasterIconButton,{label:'Обновить'},'↻'),h(MasterIconButton,{label:'Ещё',small:true},'⋯'))`,
  MasterInput: `h('div',{style:{maxWidth:320,display:'grid',gap:8}},h(MasterInput,{placeholder:'Найти табак'}),h(MasterInput,{value:'Darkside Supernova',size:'lg'}))`,
  MasterList: `h(MasterList,{columns:[{key:'name',label:'Табак'},{key:'brand',label:'Бренд'},{key:'status',label:'Наличие',align:'right'}],rows:[{id:'1',name:'Supernova',brand:'Darkside',status:'есть'},{id:'2',name:'Red Tea',brand:'Darkside',status:'закончился'},{id:'3',name:'Peppermint',brand:'MustHave',status:'есть'}]})`,
  MasterPageHeader: `h(MasterPageHeader,{title:'Миксы',subtitle:'64 микса в рейлах'})`,
  MasterSortPill: `h(function(){const [v,s]=React.useState('popular');return h(MasterSortPill,{value:v,onChange:s,label:'Сортировка',options:[{key:'popular',label:'Популярные'},{key:'new',label:'Новые'},{key:'rating',label:'По оценке'}]})})`,
  MasterStatsRow: `h(MasterStatsRow,{tiles:[{label:'Выборов',value:'128'},{label:'В наличии',value:'214',tone:'success'},{label:'Закончилось',value:'9',tone:'warning'},{label:'Код смены',value:'2714',tone:'code'}]})`,
  MasterTag: `h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},h(MasterTag,null,'черновик'),h(MasterTag,{tone:'success',dot:true},'в рейле'),h(MasterTag,{tone:'warning'},'скоро закончится'),h(MasterTag,{tone:'danger'},'нет табака'),h(MasterTag,{tone:'accent'},'хит'))`,
  MasterToggle: `h(function(){const [c,s]=React.useState(true);return h(MasterToggle,{checked:c,onChange:s,label:'Показывать гостям'})})`,
  MasterTopBar: `h(MasterTopBar,{items:[{id:'shelf',label:'Полка'},{id:'mixes',label:'Миксы'},{id:'rails',label:'Рейлы'},{id:'dash',label:'Дашборд'}],active:'mixes',userName:'Мастер смены',userRole:'master'})`,
  StatusPill: `h('div',{style:{display:'flex',gap:8}},h(StatusPill,{tone:'success',dot:true},'Смена открыта'),h(StatusPill,{tone:'warning',kbd:'K'},'Код истекает'))`,
};
const heights = { MasterTopBar: 96, MasterList: 200, MasterStatsRow: 120, CompositionStack: 150, MixRow: 170, AromaCTA: 200, GuestCard: 150, ProfileCard: 140 };
let indexDts = '';
for (const c of components) {
  const src = join(SKILL, 'components', c.dir, c.name);
  if (!SAMPLES[c.name]) throw new Error('нет примера ' + c.name);
  const readme = read(src + '.prompt.md');
  write(`components/${c.name}/README.md`, readme);
  const dts = read(src + '.d.ts');
  write(`components/${c.name}/${c.name}.d.ts`, dts);
  indexDts += `// ${c.name}\n${dts.replace(/^import .*\n/gm, '')}\n`;
  const pad = c.group === 'Гость' ? 20 : 16;
  write(
    `components/${c.name}/preview.html`,
    `<!-- @dsCard group="${c.group}" height=${heights[c.name] || 120} -->\n<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><style>body{margin:0;padding:${pad}px;background:var(--bg-base);color:var(--text-primary);font-family:var(--font-${c.group === 'Гость' ? 'body' : 'sans'})}</style></head>\n<body><div id="card"></div>\n<script>\nconst h = React.createElement;\nconst { ${c.name} } = window.${headerJson.namespace};\nReactDOM.createRoot(document.getElementById('card')).render(${SAMPLES[c.name]});\n</script></body></html>\n`,
  );
}
write('components/index.d.ts', "import type { CSSProperties, ReactNode } from 'react';\n\n" + indexDts);

// ── UI-киты: файлы для макетов, без страницы ──
for (const kit of ['aroma-guest', 'master']) {
  for (const f of ['README.md', 'GuestApp.jsx', 'GuestScreens.jsx', 'MasterApp.jsx', 'MasterScreens.jsx', 'mock-data.js']) {
    try {
      write(`ui_kits/${kit}/${f}`, read(join(SKILL, 'ui_kits', kit, f)));
    } catch {}
  }
}

// ── tokens.css: страница системы пишет его сама при сохранении, а холсты Design без
// него не получают переменных. Формат — «tokens.css as compiled» типа Design System. ──
const cssVal = (t) => String(typeof t.value === 'string' ? t.value : t.value.dark).replace(/^\{(.+)\}$/, 'var(--$1)');
let tokensCss = `/* ${tokens.name} — generated from tokens.json */\n:root, [data-theme="dark"] {\n`;
for (const t of [...color.tokens, ...shadow.tokens]) tokensCss += `  --${t.name}: ${cssVal(t)};\n`;
tokensCss += '}\n:root {\n';
for (const family of [spacing, radius, fontSize, lineHeight, letterSpacing, fontWeight, duration, easing]) for (const t of family.tokens) tokensCss += `  --${t.name}: ${cssVal(t)};\n`;
for (const [key, stack] of Object.entries(type.families)) tokensCss += `  --font-${key}: ${stack};\n`;
tokensCss += '}\n';
for (const g of type.groups) for (const s of g.styles) tokensCss += `.${s.name} { font-family: var(--font-${g.family}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ''} }\n`;
write('tokens.css', tokensCss);
write('components/Cover/preview.html', read(join(HERE, 'cover.html')));

// ── Загрузки (ассеты системы): логотипы и фото вкусов 780×480 ──
mkdirSync(join(out, 'uploads/photos'), { recursive: true });
for (const f of ['logo-mark.svg', 'logo-mark-oxblood.svg', 'logo-mark-light.svg', 'logo-lockup.svg', 'logo-master-mark.svg', 'favicon.svg']) copyFileSync(join(SKILL, 'assets', f), join(out, 'uploads', f));
const PHOTOS = join(repo, 'apps/aroma-web/public/photos');
for (const f of readdirSync(PHOTOS).filter((name) => name.endsWith('-sheet.webp'))) copyFileSync(join(PHOTOS, f), join(out, 'uploads/photos', f));
console.error('компонентов:', components.length, 'цветов:', color.tokens.length);

// ── README: книга бренда из readme.md скилла, без истории сборки ──
const src = read(join(SKILL, 'readme.md')).split('\n');
const at = (h) => src.findIndex((l) => l.startsWith(h));
const slice = (from, to) => src.slice(at(from), at(to)).join('\n').trim();
const intro = `«Арома Ателье» — сервис подбора кальянных миксов для заведения. Две поверхности на одной системе **Film Noir**: тёмные дымчатые поверхности, тёплый туманно-серый текст и **единственный** акцент — бордо \`accent\` (#8E2F3C).

| Поверхность | Что это | Кто пользуется |
|---|---|---|
| **Арома Ателье** (гость) | Mobile-first web без обязательного входа: гейт 18+ и код, знакомство, онбординг по вкусам, Подбор, Витрина, Рилсы, Каталог, Миксер, Кабинет, карточка микса, «Покурить», карточка для мастера | гость заведения, вход по QR |
| **Мастер** | Консоль: полка табаков, миксы, рейлы, дашборд смены, доступ | кальянный мастер, администратор |

Домен: табак → компонент микса → микс → рейл (полка Витрины). Таксономия — три разных поля: \`flavorProfiles\` (категории), \`flavors\` (вкусы), \`flavorTags\` (мета-теги). Ключевое событие гостя — нажатие «Покурить».

Тема одна, тёмная. Гостевой макет — телефон 375–430 px, поля \`guest-gutter\` 20 px. Консоль Мастера — десктоп до \`master-max-w\`.

Значения токенов в коде продукта живут в \`packages/design-tokens/\` репозитория; эта система — их копия для макетов. Градиенты, составные тени и анимации, которые токенами не выражаются (\`guest-card-bg\`, \`cta-solid\`, \`guest-chip-bg-on\`, \`guest-dock-fade\`, \`focus-ring\`, \`aroma-ember\`), лежат в \`components/bundle.css\` и доступны как CSS-переменные с теми же именами.`;
const componentsMd = `## Компоненты

Гость: ${['AromaCTA', 'AromaChip', 'SegmentNav', 'GuestTab', 'ProfileGlyph', 'SignatureBar', 'RatingPill', 'ProfileCard', 'MixRow', 'ShowcaseCard', 'GuestCard', 'CompositionStack', 'AccessCodeInput', 'OnboardingProgress'].map((n) => '`' + n + '`').join(', ')}.

Мастер: ${['MasterButton', 'MasterIconButton', 'MasterTag', 'MasterToggle', 'MasterInput', 'StatusPill', 'MasterStatsRow', 'MasterPageHeader', 'MasterTopBar', 'MasterList', 'MasterCard', 'FilterChip', 'MasterSortPill', 'EmptyState'].map((n) => '`' + n + '`').join(', ')}.

Компоненты лежат в \`window.${headerJson.namespace}\`. Прежде чем собирать экран, прочитайте README компонента. \`ShowcaseCard\` и \`MixRow\` отстают от продукта: в продукте вместо глифа стоит фото вкуса (группа ассетов «Фото вкусов»), постер Витрины — фото на всю карточку с затемнением снизу.

Dialog, Sheet, Checkbox, графики и палитра ⌘K в компоненты не вынесены: в продукте они на Radix и Recharts. Их поведение воспроизведено в UI-китах.

## UI-киты

Файлы \`ui_kits/aroma-guest/\` (\`GuestApp.jsx\`, \`GuestScreens.jsx\`, \`mock-data.js\`, \`README.md\`) и \`ui_kits/master/\` — экраны обеих поверхностей на этих компонентах и реальных миксах. Новый макет начинайте с экранов кита: шапка, нижняя панель, лист микса и карточка для мастера там уже собраны. README кита перечисляет экраны и решения владельца по каждому.

## Фото вкусов

Группа ассетов «Фото вкусов» (папка \`assets/Photos\`): по одному файлу на вкус и вариант, 780×480, имена \`<вкус>-<вариант>-sheet.webp\` (\`cherry-1-sheet.webp\`). Какое фото у микса, решает правило из «Фото вкусов (#592)» выше; в макете берите фото по первому яркому вкусу из названия или \`flavors\`. Под текстом на фото — затемнение угля, кремовый текст держит 4,5:1.`;
const logos = src[at('4. **Логотип создан здесь.**')].replace(/^4\. \*\*Логотип создан здесь\.\*\* /, '');
const readme = [
  intro,
  slice('## CONTENT FUNDAMENTALS', '## VISUAL FOUNDATIONS').replace('## CONTENT FUNDAMENTALS', '## Тексты'),
  slice('## VISUAL FOUNDATIONS', '## ICONOGRAPHY').replace('## VISUAL FOUNDATIONS', '## Визуальные основы'),
  slice('## ICONOGRAPHY', '## Components').replace('## ICONOGRAPHY', '## Иконки и знак'),
  '### Знак «Дым»\n\n' + logos.replace(/^По заданию владельца нарисован оригинальный знак \*\*«Дым»\*\*: /, 'Знак **«Дым»**: ').replace(/`assets\//g, '`'),
  componentsMd,
  `## Подключение

Страница и холст Design загружают по порядку: \`tokens.css\`, \`components/bundle.css\` (градиенты, анимации, база и шрифты Google Fonts), затем \`components/bundle.js\`. React 18 холст даёт сам. Компоненты — \`window.${headerJson.namespace}.<Имя>\`, провайдер не нужен. Фон артборда — \`bg-base\`, гостевой экран — \`guest-shell-bg\` из \`bundle.css\`.`,
].join('\n\n');
write('README.md', readme + '\n');

write('assets/Logos/README.md', `Знак «Дым» и словесный знак. Не перерисовывать и не перекрашивать.

- \`logo-mark-oxblood.svg\` — знак без плитки, три струи бордо (#B34A57, #8E2F3C, #7A2A34). Шапка гостя высотой 22 px, на тёмном фоне.
- \`logo-mark.svg\` — знак на тёмной плитке \`bg-raised\`. Иконка приложения, аватар.
- \`logo-mark-light.svg\` — кремовый знак (#F4EFEA) для акцентной плитки бордо.
- \`logo-lockup.svg\` — знак, «Арома Ателье» и подзаголовок; текст кремовый и \`text-muted\`, только на тёмном.
- \`favicon.svg\` — знак на плитке 64×64 для вкладки браузера.
- \`logo-master-mark.svg\` — прежний знак консоли Мастера (кремовый на тёмно-красном).

Высоту задавайте, ширину оставляйте auto: пропорции знака 54:78. Минимум — 24 px по высоте рисунка.
`);
write('assets/Photos/README.md', `Фото вкусов для гостевых макетов, 780×480 WebP, бесплатная лицензия Unsplash. Имя — \`<вкус>-<вариант>-sheet.webp\`. Тёмные сочные фото еды без людей, брендов и текста. Под текстом на фото — затемнение угля. Цветами профилей фото не подкрашивают.
`);
