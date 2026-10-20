import test from 'node:test';
import assert from 'node:assert/strict';
import {
  forYouSlots,
  hintText,
  moodTitle,
  profileInstrumental,
  profileNeuter,
  reasonText,
  submitPlan,
  type GuestForYouPersonal,
} from './for-you-copy';

test('профиль склоняется в среднем роде и в творительном падеже', () => {
  assert.equal(profileNeuter('berry'), 'ягодное');
  assert.equal(profileNeuter('sweet'), 'сладкое');
  assert.equal(profileNeuter('fresh'), 'свежее');
  assert.equal(profileNeuter('floral_herbal'), 'цветочно-травяное');
  assert.equal(profileInstrumental('citrus'), 'цитрусовым');
  assert.equal(profileInstrumental('fresh'), 'свежим');
  assert.equal(profileInstrumental('sweet'), 'сладким');
  assert.equal(profileNeuter('unknown_profile'), 'unknown profile');
});

test('«Снова»: оценка гостя и сколько раз выбирал', () => {
  assert.equal(reasonText({ kind: 'again', rating: 5, timesChosen: 5 }), 'Ваша оценка ★ 5 · выбирали 5 раз');
  assert.equal(reasonText({ kind: 'again', rating: null, timesChosen: 2 }), 'Выбирали 2 раза');
  assert.equal(reasonText({ kind: 'again', rating: 4, timesChosen: 1 }), 'Ваша оценка ★ 4 · выбирали 1 раз');
});

test('«Новое в вашем вкусе»: вкусы, затем похожий выбор, затем профили', () => {
  assert.equal(
    reasonText({ kind: 'taste', profiles: ['berry'], flavors: ['черника', 'холодок'], likeMixName: 'Морозная ягода' }),
    'Черника и холодок — рядом с вашими любимыми',
  );
  assert.equal(
    reasonText({ kind: 'taste', profiles: ['berry'], flavors: [], likeMixName: 'Морозная ягода' }),
    'Похоже на микс «Морозная ягода», который вы выбирали',
  );
  assert.equal(
    reasonText({ kind: 'taste', profiles: ['berry', 'fresh'], flavors: [], likeMixName: null }),
    'Ягодное и свежее, как вы любите',
  );
  assert.equal(reasonText({ kind: 'taste', profiles: ['berry'], flavors: [], likeMixName: null }), 'Ягодное, как вы любите');
  assert.equal(reasonText({ kind: 'taste', profiles: [], flavors: [], likeMixName: null }), 'В вашем вкусе');
});

test('«Шаг в сторону»: сродство профилей по образцу из handoff', () => {
  assert.equal(
    reasonText({ kind: 'sidestep', fromProfile: 'berry', toProfile: 'citrus' }),
    'Мастера часто сводят ягодное с цитрусовым',
  );
  assert.equal(
    reasonText({ kind: 'sidestep', fromProfile: 'citrus', toProfile: 'sweet' }),
    'Мастера часто сводят цитрусовое со сладким',
  );
});

test('нейтральный «Шаг в сторону» не выдумывает сродства', () => {
  const text = reasonText({ kind: 'sidestep-neutral', toProfile: 'spicy' });
  assert.equal(text, 'Попробуйте что-то другое — пряное');
  assert.doesNotMatch(text, /Мастера/);
  assert.equal(reasonText({ kind: 'sidestep-neutral', toProfile: '' }), 'Попробуйте что-то другое');
});

test('подсказка «Давно на одном вкусе» называет факт и ничего не запрещает', () => {
  assert.equal(
    hintText({ kind: 'same-mix', mixName: 'Морозная ягода', count: 4, outOf: 5 }),
    'Четыре из пяти последних — «Морозная ягода». Мастер уважает постоянство, но рядом есть кое-что.',
  );
  assert.equal(
    hintText({ kind: 'same-mix', mixName: 'Морозная ягода', count: 5, outOf: 5 }),
    'Все пять последних — «Морозная ягода». Мастер уважает постоянство, но рядом есть кое-что.',
  );
  assert.equal(
    hintText({ kind: 'same-profile', profile: 'berry', count: 4, outOf: 5 }),
    'Четыре из пяти последних — ягодное. Мастер уважает постоянство, но рядом есть кое-что.',
  );
  for (const text of [hintText({ kind: 'same-profile', profile: 'berry', count: 4, outOf: 4 })]) {
    assert.match(text, /^Все четыре последних — ягодное\./);
    assert.doesNotMatch(text, /нельзя|хватит|чаще|курите/i);
  }
});

const mix = (id: string) => ({ id, name: `Микс ${id}` });
const personal = (overrides: Partial<GuestForYouPersonal<ReturnType<typeof mix>>> = {}): GuestForYouPersonal<ReturnType<typeof mix>> => ({
  mode: 'personal',
  fresh: ['f1', 'f2', 'f3', 'f4'].map((id) => ({ mix: mix(id), reason: { kind: 'taste', profiles: ['berry'], flavors: [], likeMixName: null } })),
  sidestep: [{ mix: mix('s1'), reason: { kind: 'sidestep', fromProfile: 'berry', toProfile: 'citrus' } }],
  again: [{ mix: mix('a1'), reason: { kind: 'again', rating: 5, timesChosen: 3 } }],
  hint: null,
  ...overrides,
});

test('слоты A: герой и три строки, шаг в сторону, снова — каждый с фразой причины', () => {
  const slots = forYouSlots(personal());
  assert.equal(slots.hero?.mix.id, 'f1');
  assert.equal(slots.hero?.reason, 'Ягодное, как вы любите');
  assert.deepEqual(slots.taste.map((row) => row.mix.id), ['f2', 'f3', 'f4']);
  assert.equal(slots.sidestep?.reason, 'Мастера часто сводят ягодное с цитрусовым');
  assert.equal(slots.again?.reason, 'Ваша оценка ★ 5 · выбирали 3 раза');
  assert.equal(slots.hint, null);
});

test('подсказка ведёт на микс «Шаг в сторону» и не убирает «Снова»', () => {
  const slots = forYouSlots(personal({ hint: { kind: 'same-mix', mixName: 'Микс a1', count: 4, outOf: 5 } }));
  assert.equal(slots.hint?.mix.id, 's1');
  assert.match(slots.hint?.text ?? '', /^Четыре из пяти последних — «Микс a1»/);
  assert.equal(slots.again?.mix.id, 'a1');
  assert.equal(slots.sidestep?.mix.id, 's1');
});

test('пустые слоты не показываются', () => {
  const slots = forYouSlots(personal({ fresh: [], sidestep: [], again: [], hint: { kind: 'same-mix', mixName: 'X', count: 4, outOf: 5 } }));
  assert.equal(slots.hero, null);
  assert.deepEqual(slots.taste, []);
  assert.equal(slots.sidestep, null);
  assert.equal(slots.again, null);
  assert.equal(slots.hint, null);
});

test('«Под настроение» — профили этого визита, иначе вкусы', () => {
  assert.equal(moodTitle({ profiles: ['citrus', 'berry'], flavors: ['мята'] }), 'Под настроение · Цитрусовый · Ягодный');
  assert.equal(moodTitle({ profiles: [], flavors: ['мята', 'лайм'] }), 'Под настроение · мята · лайм');
  assert.equal(moodTitle({ profiles: [], flavors: [] }), 'Под настроение');
});

test('«Под настроение» не перезаписывает сохранённые вкусы ни у вошедшего, ни у анонима', () => {
  for (const signedIn of [true, false]) {
    const plan = submitPlan({ mood: true, signedIn });
    assert.equal(plan.saveTaste, false, 'PUT /guest/me/onboarding не вызывается');
    assert.equal(plan.keepTaste, false, 'выбор не пишется в сохранённые вкусы устройства');
    assert.equal(plan.load, 'recommendations', 'выдача — POST /guest/onboarding/recommendations');
  }
});

test('правка вкусов вошедшего сохраняется в кабинете и пересобирает «Для вас» без второго подбора', () => {
  assert.deepEqual(submitPlan({ mood: false, signedIn: true }), { saveTaste: true, keepTaste: true, load: 'for-you' });
  assert.deepEqual(submitPlan({ mood: false, signedIn: false }), { saveTaste: false, keepTaste: true, load: 'recommendations' });
});
