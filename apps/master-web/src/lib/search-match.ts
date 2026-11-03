// Поиск по неточному совпадению (#522): одна логика в backend, master-web и
// aroma-web. Файл скопирован в каждое приложение без изменений, тест-кейсы тоже —
// правка одной копии означает правку всех трёх.
//
// Запрос и текст сравниваются без регистра, «ё», пробелов, дефисов, апострофов,
// точек и удвоенных букв; запрос — ещё в транслите и в другой раскладке, текст —
// в транслите. Каждое слово запроса должно найтись подстрокой хотя бы в одном
// поле; если нет — словом с опечаткой (1 правка от 4 букв, 2 — от 8). Слово
// из одной-двух букв ищется только подстрокой как есть.

// 0 — с начала слова, 1 — внутри слова, 2 — похожее, с опечаткой.
export type SearchRank = 0 | 1 | 2;

// starts[i] = 1 — с позиции i в text начинается слово.
type Haystack = { text: string; starts: Uint8Array };

export type SearchTarget = {
  // Варианты текста (как есть и в транслите) для нечёткого сравнения.
  haystacks: Haystack[];
  // Поля только для точной подстроки как есть: описание, где опечатки дают шум.
  exact: Haystack | null;
  // Слова всех вариантов для опечаток; у полей из нескольких слов — ещё слитно.
  words: string[];
};

type QueryWord = {
  plain: string;
  variants: string[];
  maxEdits: number;
  // Опечатки считаются по уникальным словам: в каталоге они сильно повторяются.
  fuzzy: Map<string, boolean>;
};

export type SearchQuery = { words: QueryWord[] };

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const LATIN_TO_CYRILLIC: Record<string, string> = {
  shch: 'щ', sch: 'щ', zh: 'ж', kh: 'х', ts: 'ц', ch: 'ч', sh: 'ш', ya: 'я', yu: 'ю', yo: 'е', ye: 'е',
  ja: 'я', ju: 'ю', oo: 'у', ee: 'и', ph: 'ф', ck: 'к', a: 'а', b: 'б', c: 'к', d: 'д', e: 'е', f: 'ф',
  g: 'г', h: 'х', i: 'и', j: 'дж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с',
  t: 'т', u: 'у', v: 'в', w: 'в', x: 'кс', y: 'и', z: 'з',
};

const LATIN_PATTERN = /shch|sch|zh|kh|ts|ch|sh|ya|yu|yo|ye|ja|ju|oo|ee|ph|ck|[a-z]/g;

const QWERTY = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const JCUKEN = 'йцукенгшщзхъфывапролджэячсмитьбю';
const LAYOUT: Record<string, string> = {};
for (let index = 0; index < QWERTY.length; index += 1) {
  LAYOUT[QWERTY[index]] = JCUKEN[index];
  LAYOUT[JCUKEN[index]] = QWERTY[index];
}

const lower = (value: string) => value.toLowerCase().replace(/ё/g, 'е');
const toLatin = (value: string) => value.replace(/[а-я]/g, (char) => CYRILLIC_TO_LATIN[char] ?? char);
const toCyrillic = (value: string) => value.replace(LATIN_PATTERN, (chunk) => LATIN_TO_CYRILLIC[chunk] ?? chunk);
const switchLayout = (value: string) => Array.from(value, (char) => LAYOUT[char] ?? char).join('');
const tokenize = (value: string) => value.replace(/[’'‘`ʼ.]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const collapse = (value: string) => value.replace(/(.)\1+/gu, '$1');
const unique = (values: string[]) => Array.from(new Set(values));

// Поле пишется слитно, удвоенные буквы схлопываются и на стыке слов
// («Mint Tea» → «mintea»), начала слов запоминаются для ранга.
const buildHaystack = (fields: string[]): Haystack => {
  const chars: string[] = [];
  const starts: number[] = [];
  for (const field of fields) {
    let last = '';
    for (const word of tokenize(field)) {
      let first = true;
      for (const char of word) {
        if (char === last) {
          if (first) starts.push(chars.length - 1);
        } else {
          if (first) starts.push(chars.length);
          chars.push(char);
          last = char;
        }
        first = false;
      }
    }
    chars.push('\u0001');
  }
  const mask = new Uint8Array(chars.length);
  for (const start of starts) mask[start] = 1;
  return { text: chars.join(''), starts: mask };
};

const fieldWords = (field: string) => {
  const words = tokenize(field).map(collapse);
  return words.length > 1 ? [...words, collapse(words.join(''))] : words;
};

export const prepareSearchTarget = (fields: string[], exactFields: string[] = []): SearchTarget => {
  const base = fields.map(lower);
  const variants = [base, base.map(toLatin), base.map(toCyrillic)];
  const haystacks: Haystack[] = [];
  for (const variant of variants) {
    const haystack = buildHaystack(variant);
    if (!haystacks.some((item) => item.text === haystack.text)) haystacks.push(haystack);
  }
  return {
    haystacks,
    exact: exactFields.length ? buildHaystack(exactFields.map(lower)) : null,
    words: unique(variants.flatMap((variant) => variant.flatMap(fieldWords))),
  };
};

const allowedEdits = (length: number) => (length >= 8 ? 2 : length >= 4 ? 1 : 0);

const squash = (value: string) => collapse(tokenize(value).join(''));

export const prepareSearchQuery = (query: string): SearchQuery | null => {
  const words = lower(query)
    .split(/\s+/)
    .flatMap((raw): QueryWord[] => {
      const plain = squash(raw);
      if (!plain) return [];
      const forms = plain.length >= 3 ? [raw, toLatin(raw), toCyrillic(raw), switchLayout(raw)] : [raw];
      return [{ plain, variants: unique(forms.map(squash).filter(Boolean)), maxEdits: allowedEdits(plain.length), fuzzy: new Map() }];
    });
  return words.length ? { words } : null;
};

// Расстояние Дамерау-Левенштейна (перестановка соседних букв — одна правка)
// не больше limit; строка матрицы, где всё уже больше limit, обрывает счёт.
const withinEdits = (left: string, right: string, limit: number) => {
  if (Math.abs(left.length - right.length) > limit) return false;
  let beforePrevious: number[] = [];
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      let distance = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        distance = Math.min(distance, beforePrevious[j - 2] + 1);
      }
      current[j] = distance;
      if (distance < rowMin) rowMin = distance;
    }
    if (rowMin > limit) return false;
    beforePrevious = previous;
    previous = current;
  }
  return previous[right.length] <= limit;
};

const substringRank = (haystack: Haystack, needle: string): SearchRank | null => {
  let index = haystack.text.indexOf(needle);
  if (index < 0) return null;
  while (index >= 0) {
    if (haystack.starts[index]) return 0;
    index = haystack.text.indexOf(needle, index + 1);
  }
  return 1;
};

const isTypo = (word: QueryWord, candidate: string) => {
  const cached = word.fuzzy.get(candidate);
  if (cached !== undefined) return cached;
  const limit = Math.min(word.maxEdits, allowedEdits(candidate.length));
  const result = limit > 0 && word.variants.some((variant) => withinEdits(variant, candidate, limit));
  word.fuzzy.set(candidate, result);
  return result;
};

const wordRank = (word: QueryWord, target: SearchTarget): SearchRank | null => {
  let best: SearchRank | null = target.exact ? substringRank(target.exact, word.plain) : null;
  if (best === 0) return 0;
  // Одна-две буквы — только подстрока как есть, иначе находится почти всё.
  const haystacks = word.plain.length >= 3 ? target.haystacks : target.haystacks.slice(0, 1);
  for (const haystack of haystacks) {
    for (const variant of word.variants) {
      const rank = substringRank(haystack, variant);
      if (rank === 0) return 0;
      if (rank !== null) best = rank;
    }
  }
  if (best !== null) return best;
  if (!word.maxEdits) return null;
  return target.words.some((candidate) => isTypo(word, candidate)) ? 2 : null;
};

export const searchRank = (query: SearchQuery, target: SearchTarget): SearchRank | null => {
  let worst: SearchRank = 0;
  for (const word of query.words) {
    const rank = wordRank(word, target);
    if (rank === null) return null;
    if (rank > worst) worst = rank;
  }
  return worst;
};

export const matchSearch = (query: string, fields: string[], exactFields: string[] = []) => {
  const prepared = prepareSearchQuery(query);
  return prepared ? searchRank(prepared, prepareSearchTarget(fields, exactFields)) : 0;
};

// Отбор по запросу: точные выше похожих, внутри группы — порядок items
// (то есть выбранная на экране сортировка). Пустой запрос ничего не меняет.
export const rankBySearch = <T>(
  items: T[],
  query: string,
  fieldsOf: (item: T) => string[],
  exactFieldsOf?: (item: T) => string[],
): T[] => {
  const prepared = prepareSearchQuery(query);
  if (!prepared) return items;
  return items
    .flatMap((item) => {
      const rank = searchRank(prepared, prepareSearchTarget(fieldsOf(item), exactFieldsOf?.(item)));
      return rank === null ? [] : [{ item, rank }];
    })
    .sort((left, right) => left.rank - right.rank)
    .map(({ item }) => item);
};
