import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Назначение: собрать КАНОНИЧЕСКОЕ состояние данных Nomad поверх уже залитого
// каталога табаков (htreviews) — 20 миксов из docs/data/top-20-mixes.md и
// 5 prepared-рейлов из docs/data/preset-rails.md (+ 2 системных statistical).
// Компоненты миксов матчатся на реальные NomadTobacco по «бренд + вкус».
// Если хоть один компонент не сопоставлен — микс пропускается (чистые данные
// важнее полноты 20/20). Скрипт идемпотентный: владеет слоем mix/rail целиком
// и пересобирает его при каждом запуске. Состав/тексты табаков не меняет, но
// помечает весь каталог inStock=true (инвентарь), чтобы миксы были видны гостю.
// staff/auth НЕ трогает.
//
// Это НЕ seed: демо-фикстуры prisma/seed.ts и их роль в smoke не затрагиваются.
// ---------------------------------------------------------------------------

const maskDatabaseUrl = (url: string | undefined) =>
  url?.replace(/:[^:@/]*@/, ':***@') ?? '<no DATABASE_URL>';

const DOCS_DIR = path.join(__dirname, '../../../docs/data');

// --- Нормализация брендов: написание в docs → manufacturer в NomadTobacco -----
const BRAND_MANUFACTURER: Record<string, string> = {
  darkside: 'DARKSIDE',
  'dark side': 'DARKSIDE',
  musthave: 'MUSTHAVE',
  'must have': 'MUSTHAVE',
  adalya: 'Adalya',
  sebero: 'Sebero',
  spectrum: 'Spectrum',
  blackburn: 'Black Burn',
  'black burn': 'Black Burn',
  tangiers: 'Tangiers',
  serbetli: 'Serbetli',
  alfakher: 'Al Fakher',
  'al fakher': 'Al Fakher',
  starbuzz: 'Starbuzz',
};

// Бренды отсортированы по длине: длинный префикс матчим раньше короткого,
// чтобы «Black Burn» не распался на «Black» + «Burn ...».
const BRAND_KEYS = Object.keys(BRAND_MANUFACTURER).sort((a, b) => b.length - a.length);

// --- Алиасы вкусов: написание в docs (часто RU) → как лежит в каталоге (EN) ---
// Применяются как нормализация строки вкуса перед матчингом.
const FLAVOR_ALIASES: Record<string, string> = {
  дыня: 'melon',
  молоко: 'milk',
  банан: 'banana',
  черника: 'blueberry',
  жвачка: 'gum',
  мята: 'mint',
  brazillian: 'brazilian', // двойная «l» в docs против каталожного «Brazilian»
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[«»"'`’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zа-я0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const despace = (value: string) => normalize(value).replace(/\s+/g, '');

const applyFlavorAliases = (flavor: string) => {
  const lower = flavor.toLowerCase().trim();
  if (FLAVOR_ALIASES[lower]) return FLAVOR_ALIASES[lower];
  return lower
    .split(/\s+/)
    .map((token) => FLAVOR_ALIASES[token] ?? token)
    .join(' ');
};

// --- Типы разобранных данных --------------------------------------------------
type ParsedComponent = { brandRaw: string; flavorRaw: string; proportion: number };
type ParsedMix = {
  num: number;
  name: string;
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  components: ParsedComponent[];
};
type ParsedRail = { slug: string; title: string; subtitle: string; mixNums: number[] };

// --- Осмысленное описание микса из его вкусов и тегов -------------------------
// Соединяем ноты по-русски («a, b и c») и добавляем характер из мета-тегов.
const naturalJoinRu = (items: string[]) =>
  items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}`;

// Из flavorTags берём только описательные (характер вкуса), а не служебные
// (хит, классика, новичкам, моно-бренд) — последние ничего не говорят о вкусе.
const TAG_MOOD: Record<string, string> = {
  холодок: 'с морозным холодком',
  освежающий: 'освежающий',
  свежий: 'свежий',
  согревающий: 'согревающий',
  осенний: 'с осенним настроением',
  сладкий: 'с мягкой сладостью',
  кислинка: 'с лёгкой кислинкой',
  'с кислинкой': 'с лёгкой кислинкой',
  гастро: 'с гастрономическим характером',
  газировка: 'с нотой газировки',
  коктейль: 'в коктейльном духе',
  лёгкий: 'лёгкий',
};

const buildMixDescription = (flavors: string[], flavorTags: string[]) => {
  const notes = naturalJoinRu(flavors);
  const head = notes.charAt(0).toUpperCase() + notes.slice(1);
  const moods = [...new Set(flavorTags.map((t) => TAG_MOOD[t.toLowerCase()]).filter(Boolean))];
  return moods.length ? `${head} — ${moods.join(', ')}.` : `${head}.`;
};

// --- Парсинг docs/data/top-20-mixes.md ---------------------------------------
const splitCsvList = (value: string) =>
  value
    .split(/[,·]/)
    .map((s) => s.trim())
    .filter(Boolean);

const parseComposition = (raw: string): ParsedComponent[] => {
  // Состав разделён символом «·». Каждый компонент: «<бренд> <вкус> NN%».
  // Моно-табаки (№18/19) записаны без процентов и со скобкой-пояснением —
  // это один компонент на 100%.
  const parts = raw.split('·').map((s) => s.trim()).filter(Boolean);
  const components: ParsedComponent[] = [];
  for (const part of parts) {
    const pctMatch = part.match(/(\d+)\s*%/);
    const proportion = pctMatch ? Number(pctMatch[1]) : 100;
    // отрезаем процент и любое скобочное пояснение моно-табака
    const head = part
      .replace(/\(\s*[^)]*\)/g, '')
      .replace(/\d+\s*%/g, '')
      .trim();
    const brandKey = BRAND_KEYS.find((key) => normalize(head).startsWith(key));
    if (!brandKey) {
      components.push({ brandRaw: '', flavorRaw: head, proportion });
      continue;
    }
    // Бренд занимает первые N слов (N = число слов в распознанном ключе),
    // остаток строки — вкус.
    const headWords = head.split(/\s+/);
    const brandWordCount = brandKey.split(' ').length;
    const brandRaw = headWords.slice(0, brandWordCount).join(' ');
    const flavor = headWords.slice(brandWordCount).join(' ').trim();
    components.push({ brandRaw, flavorRaw: flavor, proportion });
  }
  return components;
};

const parseMixes = (): ParsedMix[] => {
  const md = fs.readFileSync(path.join(DOCS_DIR, 'top-20-mixes.md'), 'utf8');
  const mixes: ParsedMix[] = [];
  for (const line of md.split('\n')) {
    const row = line.trim();
    if (!row.startsWith('|')) continue;
    const cells = row.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 7) continue;
    const num = Number(cells[0]);
    if (!Number.isInteger(num) || num < 1) continue; // пропускаем шапку/разделитель
    mixes.push({
      num,
      name: cells[1],
      components: parseComposition(cells[2]),
      flavorProfiles: splitCsvList(cells[3]),
      flavors: splitCsvList(cells[4]),
      flavorTags: splitCsvList(cells[5]),
    });
  }
  return mixes;
};

// --- Парсинг docs/data/preset-rails.md ---------------------------------------
const parseRails = (): ParsedRail[] => {
  const md = fs.readFileSync(path.join(DOCS_DIR, 'preset-rails.md'), 'utf8');
  const lines = md.split('\n');

  // 1) карта рейлов из таблицы «| `slug` | Заголовок | О чём | Размер |»
  const meta = new Map<string, { title: string; subtitle: string }>();
  for (const line of lines) {
    const m = line.match(/^\|\s*`([a-z-]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*\d+\s*\|/);
    if (m) meta.set(m[1], { title: m[2].trim(), subtitle: m[3].trim() });
  }

  // 2) состав: секции «### `slug` — …» с буллетами «- №N …»
  const rails: ParsedRail[] = [];
  let current: ParsedRail | null = null;
  for (const line of lines) {
    const header = line.match(/^###\s+`([a-z-]+)`/);
    if (header) {
      const slug = header[1];
      const m = meta.get(slug) ?? { title: slug, subtitle: '' };
      current = { slug, title: m.title, subtitle: m.subtitle, mixNums: [] };
      rails.push(current);
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^-\s*№\s*(\d+)/);
    if (bullet) current.mixNums.push(Number(bullet[1]));
  }
  return rails;
};

// --- Матчинг компонента на NomadTobacco --------------------------------------
type Candidate = { id: string; name: string; inStock: boolean };

const scoreCandidate = (flavorNorm: string, flavorDespaced: string, name: string) => {
  const nameNorm = normalize(name);
  const nameDespaced = despace(name);
  if (nameNorm === flavorNorm || nameDespaced === flavorDespaced) {
    return 1000 - nameNorm.length; // точное совпадение, короче — лучше
  }
  const flavorTokens = flavorNorm.split(' ').filter(Boolean);
  const nameTokens = nameNorm.split(' ').filter(Boolean);
  const allPresent = flavorTokens.every((t) => nameTokens.includes(t));
  if (allPresent) {
    // все искомые токены есть; штраф за лишние слова в названии каталога
    const extra = nameTokens.length - flavorTokens.length;
    return 500 - extra * 10 - nameNorm.length * 0.01;
  }
  // Префиксное совпадение — только для близких по длине написаний (множ.
  // число, мелкие опечатки). Большая разница длин — это другой вкус или
  // мусорная запись каталога (напр. «Fresh..»), не матчим.
  const lenDiff = Math.abs(nameDespaced.length - flavorDespaced.length);
  if (lenDiff <= 2 && (nameDespaced.startsWith(flavorDespaced) || flavorDespaced.startsWith(nameDespaced))) {
    return 200 - lenDiff;
  }
  return -1;
};

type MatchResult = { tobaccoId: string; tobaccoName: string } | null;

const matchComponent = (
  component: ParsedComponent,
  byManufacturer: Map<string, Candidate[]>,
): MatchResult => {
  const brandKey = normalize(component.brandRaw);
  const manufacturer = BRAND_MANUFACTURER[brandKey];
  if (!manufacturer) return null;
  const candidates = byManufacturer.get(manufacturer) ?? [];
  // Ищем по двум формам: только вкус и «бренд + вкус» — в каталоге часть
  // названий включает бренд (напр. DARKSIDE → name «Darkside Cola»), и тогда
  // совпадает именно полная форма, а не очищенный остаток.
  const terms = [
    applyFlavorAliases(component.flavorRaw),
    applyFlavorAliases(`${component.brandRaw} ${component.flavorRaw}`.trim()),
  ].map((t) => ({ norm: normalize(t), despaced: despace(t) }));

  let best: { id: string; name: string; score: number } | null = null;
  for (const cand of candidates) {
    let score = Math.max(...terms.map((t) => scoreCandidate(t.norm, t.despaced, cand.name)));
    if (score < 0) continue;
    if (cand.inStock) score += 0.5; // лёгкий приоритет доступным
    if (!best || score > best.score) best = { id: cand.id, name: cand.name, score };
  }
  if (!best) return null;
  return { tobaccoId: best.id, tobaccoName: best.name };
};

// --- Построение состояния -----------------------------------------------------
const main = async () => {
  console.log(`[build-catalog-backup] target DB: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);

  const tobaccoCount = await prisma.nomadTobacco.count();
  console.log(`[build-catalog-backup] табаков в каталоге: ${tobaccoCount}`);
  if (tobaccoCount < 1000) {
    throw new Error(
      `Каталог табаков слишком мал (${tobaccoCount} < 1000) — сначала восстанови ` +
        `каталог из ~/nomad-backups/latest-tobacco.sql. Стоп.`,
    );
  }

  // Загружаем кандидатов только нужных брендов в память
  const manufacturers = [...new Set(Object.values(BRAND_MANUFACTURER))];
  const tobaccos = await prisma.nomadTobacco.findMany({
    where: { manufacturer: { in: manufacturers } },
    select: { id: true, name: true, manufacturer: true, inStock: true },
  });
  const byManufacturer = new Map<string, Candidate[]>();
  for (const t of tobaccos) {
    const list = byManufacturer.get(t.manufacturer) ?? [];
    list.push({ id: t.id, name: t.name, inStock: t.inStock });
    byManufacturer.set(t.manufacturer, list);
  }

  const parsedMixes = parseMixes();
  const parsedRails = parseRails();
  console.log(
    `[build-catalog-backup] распарсено: миксов=${parsedMixes.length}, рейлов=${parsedRails.length}`,
  );

  // Матчинг компонентов
  let totalComponents = 0;
  let matchedComponents = 0;
  const builtMixes: { num: number; id: string; mix: ParsedMix; comps: { tobaccoId: string; proportion: number }[] }[] = [];
  const skipped: { num: number; name: string; unmatched: string[] }[] = [];

  for (const mix of parsedMixes) {
    const comps: { tobaccoId: string; proportion: number }[] = [];
    const unmatched: string[] = [];
    const seenTobacco = new Set<string>();
    for (const c of mix.components) {
      totalComponents += 1;
      const res = matchComponent(c, byManufacturer);
      if (res && !seenTobacco.has(res.tobaccoId)) {
        matchedComponents += 1;
        seenTobacco.add(res.tobaccoId);
        comps.push({ tobaccoId: res.tobaccoId, proportion: c.proportion });
      } else if (res) {
        // дубликат табака внутри микса — компонент засчитан, но не дублируем
        matchedComponents += 1;
      } else {
        unmatched.push(`${c.brandRaw} ${c.flavorRaw}`.trim());
      }
    }
    if (unmatched.length > 0) {
      skipped.push({ num: mix.num, name: mix.name, unmatched });
    } else {
      builtMixes.push({ num: mix.num, id: `mix-catalog-${String(mix.num).padStart(2, '0')}`, mix, comps });
    }
  }

  const matchRate = totalComponents === 0 ? 0 : matchedComponents / totalComponents;
  console.log('\n[build-catalog-backup] === ОТЧЁТ ПО МАТЧИНГУ ===');
  console.log(
    `компонентов: ${matchedComponents}/${totalComponents} сопоставлено (${(matchRate * 100).toFixed(1)}%)`,
  );
  console.log(`миксов готово: ${builtMixes.length}/${parsedMixes.length}, пропущено: ${skipped.length}`);
  if (skipped.length > 0) {
    console.log('\n[build-catalog-backup] пропущенные миксы (есть несопоставленный компонент):');
    for (const s of skipped) {
      console.log(`  №${s.num} «${s.name}» — не сопоставлено: ${s.unmatched.join('; ')}`);
    }
  }

  // Stop-condition: <50% компонентов сопоставлено → каталог не тот / парсер сломан
  if (matchRate < 0.5) {
    throw new Error(
      `Сопоставлено только ${(matchRate * 100).toFixed(1)}% компонентов (<50%) — ` +
        `каталог не тот или парсер сломан. Ничего не записано. Стоп.`,
    );
  }

  const apply = process.argv.slice(2).some((a) => a === '--yes' || a === '-y');
  if (!apply) {
    console.log(
      '\n[build-catalog-backup] РЕЖИМ ПРЕВЬЮ — БД не изменена.\n' +
        'Для записи запусти с подтверждением: npm run build:catalog -- --yes',
    );
    return;
  }

  // --- Идемпотентная пересборка слоя mix/rail (каталог табаков не трогаем) ----
  const builtMixNums = new Set(builtMixes.map((m) => m.num));
  await prisma.$transaction(async (tx) => {
    // Слой mix/rail принадлежит этому скрипту целиком — сносим и пересобираем.
    await tx.nomadRailMix.deleteMany();
    await tx.nomadMixComponent.deleteMany();
    await tx.nomadSmokeCtaEvent.deleteMany();
    await tx.nomadMixRating.deleteMany();
    await tx.nomadRail.deleteMany();
    await tx.nomadMix.deleteMany();

    for (const m of builtMixes) {
      await tx.nomadMix.create({
        data: {
          id: m.id,
          name: m.mix.name,
          description: buildMixDescription(m.mix.flavors, m.mix.flavorTags),
          flavorProfiles: JSON.stringify(m.mix.flavorProfiles),
          flavors: JSON.stringify(m.mix.flavors),
          flavorTags: JSON.stringify(m.mix.flavorTags),
          components: {
            create: m.comps.map((c, i) => ({
              tobaccoId: c.tobaccoId,
              proportion: c.proportion,
              sortOrder: i,
            })),
          },
        },
      });
    }

    // prepared-рейлы из docs (включаем только успешно созданные миксы)
    for (const rail of parsedRails) {
      const mixNums = rail.mixNums.filter((n) => builtMixNums.has(n));
      await tx.nomadRail.create({
        data: {
          id: `rail-prepared-${rail.slug}`,
          name: rail.title,
          description: rail.subtitle,
          type: 'prepared',
          active: true,
          isSystem: false,
          mixes: {
            create: mixNums.map((n, i) => ({
              mixId: `mix-catalog-${String(n).padStart(2, '0')}`,
              sortOrder: i,
            })),
          },
        },
      });
      console.log(
        `[build-catalog-backup] рейл «${rail.title}» (${rail.slug}): ${mixNums.length} миксов` +
          (mixNums.length === rail.mixNums.length ? '' : ` (из ${rail.mixNums.length}, часть пропущена)`),
      );
    }

    // 2 системных statistical-рейла («Топ по Покурить», «Топ по оценкам») НЕ
    // храним строками NomadRail: backend синтезирует их на лету из событий
    // (buildStatisticalRails в src/state.ts) и не читает statistical-строки.
    // Хранить их = пустые дубли в «Мастер → Менеджер рейлов».

    // Весь каталог — «в наличии», чтобы собранные миксы были guest-visible и
    // prepared-рейлы показывались на Главной (инвариант №3: видимость зависит
    // от инвентаря). guestVisible = mix.available && все компоненты inStock.
    const stocked = await tx.nomadTobacco.updateMany({ data: { inStock: true } });
    console.log(`[build-catalog-backup] помечено «в наличии» табаков: ${stocked.count}`);
  });

  const after = {
    'табаки в наличии': await prisma.nomadTobacco.count({ where: { inStock: true } }),
    миксы: await prisma.nomadMix.count(),
    'состав миксов': await prisma.nomadMixComponent.count(),
    рейлы: await prisma.nomadRail.count(),
    'связи рейл↔микс': await prisma.nomadRailMix.count(),
  };
  console.log('\n[build-catalog-backup] состояние после записи:');
  console.table(after);
  console.log('[build-catalog-backup] готово. Теперь сними бэкап-набор (см. ~/nomad-backups/README.md).');
};

void main()
  .catch((error) => {
    console.error('[build-catalog-backup] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
