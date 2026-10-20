// «Для вас» на Подборе (#245): фразы причин, подсказка «Давно на одном вкусе»
// и режим «Под настроение». Контракт — apps/backend/src/types.ts, GuestForYou*.
// Образцы фраз — design/design_handoff_guest_cabinet/README.md, п. 9–11.

import { profileLabelMap } from './profile-labels';

export type GuestForYouReason =
  | { kind: 'again'; rating: number | null; timesChosen: number }
  | { kind: 'taste'; profiles: string[]; flavors: string[]; likeMixName: string | null }
  | { kind: 'sidestep'; fromProfile: string; toProfile: string }
  | { kind: 'sidestep-neutral'; toProfile: string };

export type GuestForYouHint =
  | { kind: 'same-mix'; mixName: string; count: number; outOf: number }
  | { kind: 'same-profile'; profile: string; count: number; outOf: number };

export type GuestForYouCard<M> = { mix: M; reason: GuestForYouReason };

export type GuestForYouPersonal<M> = {
  mode: 'personal';
  fresh: GuestForYouCard<M>[];
  sidestep: GuestForYouCard<M>[];
  again: GuestForYouCard<M>[];
  hint: GuestForYouHint | null;
};

export type GuestForYouCold<R> = {
  mode: 'cold';
  picks: number;
  onboarding: { likedProfiles: string[]; likedFlavors: string[] };
  items: R[];
};

export type GuestForYouResponse<M, R> = GuestForYouPersonal<M> | GuestForYouCold<R>;

export const FOR_YOU_TITLE = 'Для вас';
export const FOR_YOU_SUBTITLE = 'По вашим выборам, оценкам и избранному.';
export const HINT_TITLE = 'Давно на одном вкусе';
export const COLD_NOTE = '«Для вас» соберётся, когда у нас будет больше ваших выборов. Пока — по вкусам из онбординга.';
export const MOOD_LINK = 'Подобрать под настроение';
export const MOOD_DRAFT_NOTE = 'Только на этот визит. Вкусы в кабинете не изменятся.';
export const MOOD_RESULT_NOTE = 'Подбор на этот визит. «Для вас» и вкусы в кабинете не изменились.';
export const BACK_TO_FOR_YOU = 'Вернуться к «Для вас»';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const plainProfile = (profile: string) => (profileLabelMap[profile] ?? profile.replace(/_/g, ' ')).toLowerCase();

// Подписи профилей — прилагательные мужского рода («Ягодный», «Свежий»). В
// причинах они звучат в среднем роде: «ягодное», «с цитрусовым».
export const profileNeuter = (profile: string) => {
  const word = plainProfile(profile);
  if (/[кгх]ий$/.test(word)) return `${word.slice(0, -2)}ое`;
  if (/ий$/.test(word)) return `${word.slice(0, -2)}ее`;
  if (/(ый|ой)$/.test(word)) return `${word.slice(0, -2)}ое`;
  return word;
};

export const profileInstrumental = (profile: string) => {
  const word = plainProfile(profile);
  if (/ий$/.test(word)) return `${word.slice(0, -2)}им`;
  if (/(ый|ой)$/.test(word)) return `${word.slice(0, -2)}ым`;
  return word;
};

const withPreposition = (word: string) => (/^[сзшжщ][^аеёиоуыэюя]/.test(word) ? `со ${word}` : `с ${word}`);

const pluralize = (count: number, [one, few, many]: readonly [string, string, string]) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const joinAnd = (items: string[]) => items.join(' и ');

export const reasonText = (reason: GuestForYouReason): string => {
  switch (reason.kind) {
    case 'again': {
      const times = `выбирали ${reason.timesChosen} ${pluralize(reason.timesChosen, ['раз', 'раза', 'раз'])}`;
      return reason.rating ? `Ваша оценка ★ ${reason.rating} · ${times}` : capitalize(times);
    }
    case 'taste':
      if (reason.flavors.length) return `${capitalize(joinAnd(reason.flavors))} — рядом с вашими любимыми`;
      if (reason.likeMixName) return `Похоже на микс «${reason.likeMixName}», который вы выбирали`;
      if (reason.profiles.length) return `${capitalize(joinAnd(reason.profiles.map(profileNeuter)))}, как вы любите`;
      return 'В вашем вкусе';
    case 'sidestep':
      return `Мастера часто сводят ${profileNeuter(reason.fromProfile)} ${withPreposition(profileInstrumental(reason.toProfile))}`;
    case 'sidestep-neutral':
      // Сродства с любимыми профилями нет — не выдумываем его и не называем
      // профиль (решения владельца, #241 и 2026-10-20).
      return 'Попробуйте что-то другое';
  }
};

const NOMINATIVE = ['', 'один', 'два', 'три', 'четыре', 'пять'];
const GENITIVE = ['', 'одного', 'двух', 'трёх', 'четырёх', 'пяти'];

const lastPicks = (count: number, outOf: number) => {
  if (count === outOf) return `Все ${NOMINATIVE[count] ?? count} последних`;
  return `${capitalize(NOMINATIVE[count] ?? String(count))} из ${GENITIVE[outOf] ?? outOf} последних`;
};

// Подсказка информирует и ничего не запрещает (PRD §6.5 п. 5).
export const hintText = (hint: GuestForYouHint) => {
  const subject = hint.kind === 'same-mix' ? `«${hint.mixName}»` : profileNeuter(hint.profile);
  return `${lastPicks(hint.count, hint.outOf)} — ${subject}. Мастер уважает постоянство, но рядом есть кое-что.`;
};

export type ForYouRow<M> = { mix: M; reason: string };

const toRow = <M>(card: GuestForYouCard<M> | undefined): ForYouRow<M> | null =>
  card ? { mix: card.mix, reason: reasonText(card.reason) } : null;

// Раскладка A · по слотам: «Новое в вашем вкусе» (герой + три строки),
// «Шаг в сторону», «Снова». Подсказка ведёт на микс «Шаг в сторону».
export type ForYouSlots<M> = {
  hint: { text: string; mix: M } | null;
  hero: ForYouRow<M> | null;
  taste: ForYouRow<M>[];
  sidestep: ForYouRow<M> | null;
  again: ForYouRow<M> | null;
};

export const forYouSlots = <M>(response: GuestForYouPersonal<M>): ForYouSlots<M> => {
  const [hero, ...taste] = response.fresh;
  const sidestep = toRow(response.sidestep[0]);
  return {
    hint: response.hint && sidestep ? { text: hintText(response.hint), mix: sidestep.mix } : null,
    hero: toRow(hero),
    taste: taste.slice(0, 3).map((card) => toRow(card)!),
    sidestep,
    again: toRow(response.again[0]),
  };
};

export const moodTitle = ({ profiles, flavors }: { profiles: string[]; flavors: string[] }) => {
  const picked = profiles.length ? profiles.map((profile) => profileLabelMap[profile] ?? profile) : flavors.slice(0, 3);
  return ['Под настроение', ...picked].join(' · ');
};

// Что делает «Показать подбор» в онбординге. «Под настроение» — подбор на
// один визит: вкусы в кабинете (PUT /guest/me/onboarding) и на устройстве не
// трогаем. Вошедший правит вкусы — сохраняем в кабинете и пересобираем «Для
// вас» вместо POST /guest/onboarding/recommendations.
export const submitPlan = ({ mood, signedIn }: { mood: boolean; signedIn: boolean }) => {
  if (mood) return { saveTaste: false, keepTaste: false, load: 'recommendations' as const };
  if (signedIn) return { saveTaste: true, keepTaste: true, load: 'for-you' as const };
  return { saveTaste: false, keepTaste: true, load: 'recommendations' as const };
};
