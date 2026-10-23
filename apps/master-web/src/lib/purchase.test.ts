import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePurchaseView, type PurchaseView } from '../contracts';
import {
  PURCHASE_SECTIONS,
  baseRowView,
  budgetStrip,
  fastRowView,
  fewDataText,
  idleNotes,
  idleRowView,
  nextTrialVerdict,
  patchPurchase,
  profileBars,
  profileDirection,
  trialRowView,
  trialVerdictText,
} from './purchase';

// Intl ставит неразрывный пробел между разрядами.
const plain = (value: string) => value.replace(/ /g, ' ');

const tobacco = (id: string, name = 'Cane Mint', manufacturer = 'Black Burn') => ({ id, manufacturer, lineName: '', name });

const view = (patch: Record<string, unknown> = {}): PurchaseView =>
  normalizePurchaseView({
    since: '2026-11-16T09:00:00.000Z',
    budget: { budgetKop: 15000000, baseKop: 11200000, baseCount: 214, unknownCount: 9, leftKop: 3800000 },
    spend: { month: '2026-11', totalKop: 8721600 },
    base: {
      enough: true,
      counts: { notBase: 2, idleBase: 2 },
      rows: [
        { tobacco: tobacco('a'), monthGrams: 630, rateKind: 'own', share: 0.039, rubKop: 488000, keepStocked: true, app: { smokes: 14 } },
        { tobacco: tobacco('b'), monthGrams: 450, rateKind: 'own', share: 0.028, keepStocked: false, flag: 'notBase' },
      ],
    },
    fast: { enough: true, rows: [{ tobacco: tobacco('a') }, { tobacco: tobacco('b') }, { tobacco: tobacco('c') }] },
    trials: {
      enough: true,
      rows: [
        { tobacco: tobacco('a'), trialVerdict: null },
        { tobacco: tobacco('b'), trialVerdict: 'yes' },
      ],
    },
    idle: { enough: true, rows: [{ tobacco: tobacco('b'), keepStocked: true }] },
    profiles: {
      enough: true,
      appEnough: true,
      rows: [
        { key: 'fruity', spend: 0.28, shelf: 0.31, app: 0.25 },
        { key: 'berry', spend: 0.22, shelf: 0.14, app: 0.3, flag: 'more' },
        { key: 'dessert', spend: 0.1, shelf: 0.17, app: 0.13, flag: 'less' },
      ],
    },
    ...patch,
  });

test('разделы «Закупки» по порядку мокапа', () => {
  assert.deepEqual(PURCHASE_SECTIONS, [
    ['base', 'База'],
    ['fast', 'Закончились быстро'],
    ['trials', 'Пробы'],
    ['idle', 'Лежит'],
    ['profiles', 'Вкусы'],
  ]);
});

const text = (segments: Array<{ text: string }>) => plain(segments.map((segment) => segment.text).join(''));
const strong = (segments: Array<{ text: string; strong?: boolean; tone?: string }>) =>
  segments.filter((segment) => segment.strong).map((segment) => ({ text: plain(segment.text), tone: segment.tone }));

test('budgetStrip: с бюджетом — одна строка вместо плиток: бюджет, база, остаток на пробы и потрачено', () => {
  const strip = budgetStrip(view());
  assert.equal(strip.kind, 'budget');
  assert.equal(
    text(strip.segments),
    'Бюджет на ноябрь 150 000 ₽. База из 214 табаков стоит 112 000 ₽ в месяц, на пробы остаётся 38 000 ₽. По принятым счетам потрачено 87 216 ₽, 58 % бюджета.',
  );
  assert.deepEqual(strong(strip.segments), [
    { text: '150 000 ₽', tone: undefined },
    { text: '112 000 ₽', tone: undefined },
    { text: '38 000 ₽', tone: 'success' },
    { text: '87 216 ₽', tone: undefined },
  ]);
  assert.deepEqual(strip.unknown, {
    warn: 'У 9 табаков базы нет цены.',
    text: ' Стартовый остаток заводился без счёта, сумма базы уточнится с их первым приходом по счёту.',
  });
});

test('budgetStrip: база больше бюджета — сумма превышения красная', () => {
  const strip = budgetStrip(view({ budget: { budgetKop: 10000000, baseKop: 11200000, baseCount: 1, unknownCount: 0, leftKop: -1200000 } }));
  assert.equal(
    text(strip.segments),
    'Бюджет на ноябрь 100 000 ₽. База из 1 табака стоит 112 000 ₽ в месяц, это больше бюджета на 12 000 ₽. По принятым счетам потрачено 87 216 ₽, 87 % бюджета.',
  );
  assert.deepEqual(strong(strip.segments)[2], { text: '12 000 ₽', tone: 'danger' });
  assert.equal(strip.unknown, null);
});

test('budgetStrip: без бюджета — стоимость базы и факт, что бюджета нет (кнопка рядом)', () => {
  const strip = budgetStrip(view({ budget: { budgetKop: null, baseKop: 11200000, baseCount: 214, unknownCount: 1 } }));
  assert.equal(strip.kind, 'none');
  assert.equal(text(strip.segments), 'База из 214 табаков стоит 112 000 ₽ в месяц. Бюджет на табак не указан.');
  assert.equal(strip.unknown?.warn, 'У 1 табака базы нет цены.');

  const empty = budgetStrip(view({ budget: { budgetKop: null, baseKop: 0 } }));
  assert.equal(empty.kind, 'none');
  assert.deepEqual(empty.segments, [{ text: 'Бюджет на табак не указан.' }]);
});

test('baseRowView: свой расход — граммы, доля, рубли; бренд — без «≈», с подписью, без доли и флага', () => {
  const own = baseRowView(view().base.rows[0]);
  assert.deepEqual({ ...own, rub: plain(own.rub) }, {
    month: '630 г',
    brand: false,
    few: false,
    share: '3,9 %',
    rub: '4 880 ₽',
    app: '14',
    flag: null,
  });

  const [brand, none, flagged, zero] = normalizePurchaseView({
    base: {
      rows: [
        { tobacco: tobacco('x'), monthGrams: 300, rateKind: 'brand', share: null, rubKop: 228000, flag: 'notBase' },
        { tobacco: tobacco('y'), monthGrams: null, rateKind: 'none' },
        { tobacco: tobacco('z'), monthGrams: 30, rateKind: 'own', share: 0.002, rubKop: 23000, flag: 'idleBase', app: { smokes: 0 } },
        { tobacco: tobacco('w'), monthGrams: 0, rateKind: 'own', share: 0, rubKop: 0, flag: 'idleBase' },
      ],
    },
  }).base.rows.map(baseRowView);
  assert.deepEqual({ ...brand, rub: plain(brand.rub) }, { month: '300 г', brand: true, few: false, share: '—', rub: '2 280 ₽', app: '—', flag: null });
  assert.deepEqual(none, { month: 'мало данных', brand: false, few: true, share: '—', rub: '—', app: '—', flag: null });
  assert.equal(flagged.share, '0,2 %');
  assert.deepEqual(flagged.flag, { text: 'почти не берут', tone: 'faint' });
  assert.equal(zero.share, '0 %');
  assert.equal(zero.month, '0 г');
  assert.equal(zero.rub, '0 ₽');
  const notBase = baseRowView(view().base.rows[1]);
  assert.deepEqual(notBase.flag, { text: 'берут часто, не в базе', tone: 'warning' });
});

test('fastRowView: приход, ушёл за, дни без табака, что дальше и сейчас', () => {
  const [out, back] = normalizePurchaseView({
    fast: {
      rows: [
        {
          tobacco: tobacco('a'),
          receiptGrams: 100,
          receivedAt: '2026-11-14T10:00:00',
          goneDays: 2.2,
          emptyDays: 2.9,
          ongoing: true,
          next: null,
          times: 2,
          status: 'out',
        },
        {
          tobacco: tobacco('b'),
          receiptGrams: 250,
          receivedAt: '2026-11-02T10:00:00',
          goneDays: 0.4,
          emptyDays: 8,
          ongoing: false,
          next: { grams: 500, at: '2026-11-12T10:00:00' },
          times: 1,
          status: 'ending',
        },
      ],
    },
  }).fast.rows.map(fastRowView);
  assert.deepEqual(out, {
    receipt: '+100 г',
    receivedAt: '14 ноя',
    gone: '2 дня',
    times: '×2 за 60 дней',
    empty: '3 дн',
    ongoing: true,
    next: null,
    now: { text: 'нет на полке', tone: 'danger' },
  });
  assert.deepEqual(back, {
    receipt: '+250 г',
    receivedAt: '2 ноя',
    gone: 'меньше дня',
    times: null,
    empty: '8 дн',
    ongoing: false,
    next: '12 ноя, +500 г',
    now: { text: 'заканчивается', tone: 'warning' },
  });
});

test('trialRowView: скорость к полке, «ушла за», приложение и «нет в миксах»', () => {
  const [melon, panama, passion] = normalizePurchaseView({
    trials: {
      rows: [
        {
          tobacco: tobacco('m'),
          receiptGrams: 25,
          receivedAt: '2026-11-14T10:00:00',
          speed: 2.8,
          goneDays: 1.9,
          app: { smokes: 3, rating: 4.8, ratings: 4 },
          mixCount: 1,
        },
        { tobacco: tobacco('p'), receiptGrams: 200, receivedAt: '2026-10-20T10:00:00', speed: 0.8, mixCount: 0 },
        { tobacco: tobacco('s'), receiptGrams: 400, receivedAt: '2026-11-12T10:00:00', speed: null, app: { smokes: 2 }, mixCount: 2 },
      ],
    },
  }).trials.rows.map(trialRowView);
  assert.deepEqual(melon, {
    receipt: '25 г',
    receivedAt: '14 ноя',
    speed: { text: '×2,8 к полке', fast: true },
    gone: 'ушла за 2 дня',
    app: { kind: 'stats', text: '3 выбора, ★ 4,8' },
  });
  assert.deepEqual(panama.speed, { text: '×0,8 к полке', fast: false });
  assert.equal(panama.gone, null);
  assert.deepEqual(panama.app, { kind: 'noMixes', text: 'нет в миксах' });
  assert.equal(passion.speed, null);
  assert.deepEqual(passion.app, { kind: 'stats', text: '2 выбора' });
});

test('trialVerdictText: скорость словами и отметка мастера, через запятую', () => {
  assert.deepEqual(trialVerdictText(2.8, null), { text: 'расходится быстрее полки, ждёт отметки', tone: 'default' });
  assert.deepEqual(trialVerdictText(1.2, 'yes'), { text: 'расходится быстрее полки, гостям зашло', tone: 'default' });
  assert.deepEqual(trialVerdictText(0.8, 'no'), { text: 'расходится медленнее полки, гостям не зашло', tone: 'muted' });
  assert.deepEqual(trialVerdictText(0.8, null), { text: 'расходится медленнее полки, ждёт отметки', tone: 'muted' });
  assert.deepEqual(trialVerdictText(0.8, 'yes'), { text: 'расходится медленнее полки, гостям зашло', tone: 'default' });
  assert.deepEqual(trialVerdictText(null, 'yes'), { text: 'мало данных', tone: 'faint' });
});

test('nextTrialVerdict: повторный клик по выбранному снимает отметку', () => {
  assert.equal(nextTrialVerdict(null, 'yes'), 'yes');
  assert.equal(nextTrialVerdict('yes', 'no'), 'no');
  assert.equal(nextTrialVerdict('yes', 'yes'), null);
  assert.equal(nextTrialVerdict('no', 'no'), null);
});

test('idleRowView и заметки под «Лежит»', () => {
  const [gummy, pear, cola] = normalizePurchaseView({
    idle: {
      rows: [
        { tobacco: tobacco('g'), leftGrams: 480, rate21: 1, rubKop: 360000, receivedAt: '2026-10-15T10:00:00', days: 35.4 },
        { tobacco: tobacco('p'), leftGrams: 350, rate21: 0, rubKop: null, receivedAt: '2026-10-15T10:00:00', days: 35 },
        { tobacco: tobacco('c'), leftGrams: 230, rate21: 1.46, rubKop: 178000, receivedAt: '2026-10-20T10:00:00', days: 30 },
      ],
    },
  }).idle.rows.map(idleRowView);
  assert.deepEqual({ ...gummy, rub: plain(gummy.rub) }, { left: '480 г', rate: '1 г/день', rub: '3 600 ₽', receivedAt: '15 окт', days: '35 дн' });
  assert.equal(pear.rate, '0 г');
  assert.equal(pear.rub, '—');
  assert.equal(cola.rate, '1,5 г/день');

  const notes = idleNotes(view({ idle: { enough: true, totalKop: 925000, unmarkedCount: 3, unknownPriceCount: 1, rows: [] } }).idle);
  assert.equal(plain(notes.total), '9 250 ₽');
  assert.equal(notes.unmarked, 'Ещё у 3 табаков нет отметок остатка за 21 день, их расход неизвестен.');
  assert.equal(notes.unknownPrice, 'У 1 табака нет цены прихода, в сумму он не вошёл.');
  const clean = idleNotes(view({ idle: { enough: true, totalKop: 0, rows: [] } }).idle);
  assert.equal(clean.unmarked, null);
  assert.equal(clean.unknownPrice, null);
  assert.equal(idleNotes(view({ idle: { unknownPriceCount: 2 } }).idle).unknownPrice, 'У 2 табаков нет цены прихода, в сумму они не вошли.');
});

test('profileDirection: направление в единственном числе, как в мокапе', () => {
  assert.equal(profileDirection('berry'), 'Ягодный');
  assert.equal(profileDirection('floral_herbal'), 'Травяной');
  assert.equal(profileDirection('unknown'), 'unknown');
});

test('profileBars: проценты и ширина полос от наибольшей доли', () => {
  const rows = view().profiles.rows;
  const bars = profileBars(rows);
  assert.deepEqual(bars[0], {
    key: 'fruity',
    label: 'Фруктовый',
    spend: { text: '28 %', width: 0.28 / 0.31 },
    shelf: { text: '31 %', width: 1 },
    app: { text: '25 %', width: 0.25 / 0.31 },
    flag: null,
    ideas: null,
  });
  assert.deepEqual(bars[1].flag, { text: 'расходится больше, чем есть', tone: 'warning' });
  assert.equal(bars[1].ideas, 'Идеи: ягодный');
  assert.deepEqual(bars[2].flag, { text: 'на полке больше, чем расходится', tone: 'faint' });
  assert.equal(bars[2].ideas, null);
});

test('fewDataText: сколько дней идёт учёт, когда ждать цифры и что для них нужно', () => {
  const now = new Date(2026, 10, 19, 12);
  const need = 'Для них нужны счета в поставках и отметки, когда табак закончился.';
  assert.equal(
    fewDataText(new Date(2026, 10, 16, 9).toISOString(), now),
    `Учёт в граммах идёт 3 дня. Цифры появятся через 2–4 недели, ориентировочно 14 декабря. ${need}`,
  );
  assert.equal(
    fewDataText(new Date(2026, 10, 19, 9).toISOString(), now),
    `Учёт в граммах идёт с сегодняшнего дня. Цифры появятся через 2–4 недели, ориентировочно 17 декабря. ${need}`,
  );
  assert.equal(fewDataText(null, now), `Учёт в граммах ещё не начался. Цифры появятся через 2–4 недели после первого счёта. ${need}`);
  assert.equal(fewDataText(new Date(2026, 8, 1).toISOString(), now), `Учёт в граммах идёт 79 дней, но отметок пока мало. ${need}`);
});

test('тексты «Закупки» без middot, тире между частями, «≈», кавычек и точки с запятой', () => {
  const now = new Date(2026, 10, 19, 12);
  const lines = [
    text(budgetStrip(view()).segments),
    text(budgetStrip(view({ budget: { budgetKop: 10000000, baseKop: 11200000, baseCount: 1, leftKop: -1200000 } })).segments),
    text(budgetStrip(view({ budget: { budgetKop: null, baseKop: 11200000, baseCount: 3 } })).segments),
    budgetStrip(view()).unknown?.warn ?? '',
    budgetStrip(view()).unknown?.text ?? '',
    ...Object.values(idleNotes(view({ idle: { enough: true, totalKop: 925000, unmarkedCount: 3, unknownPriceCount: 1, rows: [] } }).idle)).map(String),
    trialVerdictText(2.8, null).text,
    fewDataText(null, now),
    fewDataText(new Date(2026, 10, 16, 9).toISOString(), now),
    fewDataText(new Date(2026, 8, 1).toISOString(), now),
  ];
  for (const line of lines) assert.doesNotMatch(line, /[·≈«»;~]| — /);
});

test('patchPurchase: «Держим» и отметка пробы меняют строки всех разделов', () => {
  const data = view();
  const kept = patchPurchase(data, 'b', { keepStocked: true });
  assert.equal(kept.base.rows[1].keepStocked, true);
  assert.equal(kept.idle.rows[0].keepStocked, true);
  assert.equal(kept.base.rows[0], data.base.rows[0]);
  const marked = patchPurchase(data, 'a', { trialVerdict: 'no' });
  assert.equal(marked.trials.rows[0].trialVerdict, 'no');
  assert.equal(marked.trials.rows[1].trialVerdict, 'yes');
  const unmarked = patchPurchase(data, 'b', { trialVerdict: null });
  assert.equal(unmarked.trials.rows[1].trialVerdict, null);
});
