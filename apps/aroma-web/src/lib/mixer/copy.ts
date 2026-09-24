import type { EvaluationHint, Verdict } from './types';

// Вердикты и подсказки — фактический текст интерфейса, не реплики мастера.
const verdictLabels: Record<Verdict, string> = {
  classic: 'Классическое сочетание',
  confident: 'Уверенное сочетание',
  bold: 'Смелый эксперимент',
  'ask-master': 'Мастер переспросит',
};

export const verdictLabel = (verdict: Verdict) => verdictLabels[verdict];

export const hintText = (hint: EvaluationHint) => {
  switch (hint.kind) {
    case 'too-cold':
      return `Холодка ${hint.value === undefined ? 'больше 20' : hint.value}%. Обычно хватает 10–15%.`;
    case 'weak-base':
      return 'Основа меньше 35% — главный вкус теряется.';
    case 'heavy-twist':
      return 'Штрих больше 25% — он перетягивает вкус.';
    case 'mono':
      return 'Один табак. Добавьте акцент.';
  }
};

export const pluralize = (count: number, [one, few, many]: readonly [string, string, string]) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export const mixCountCaption = (count: number) =>
  count > 0
    ? {
        value: String(count),
        caption: `${pluralize(count, ['микс', 'микса', 'миксов'])} мастеров с ним`,
      }
    : { value: '—', caption: 'в миксах мастеров пока нет' };
