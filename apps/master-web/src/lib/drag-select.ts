// Выделение в «Каталоге» протягиванием по чекбоксам (#521): строки от первой
// до текущей получают состояние, которое первая получила бы по клику.

export type DragMode = 'select' | 'deselect';

export const dragModeFor = (selected: string[], id: string): DragMode =>
  selected.includes(id) ? 'deselect' : 'select';

// Считается от выбора на момент нажатия: если вести обратно, строки за
// диапазоном возвращаются к прежнему состоянию.
export const dragSelection = (order: string[], base: string[], anchor: string, target: string, mode: DragMode) => {
  const from = order.indexOf(anchor);
  const to = order.indexOf(target);
  if (from < 0 || to < 0) return base;
  const range = order.slice(Math.min(from, to), Math.max(from, to) + 1);
  return mode === 'select'
    ? [...base, ...range.filter((id) => !base.includes(id))]
    : base.filter((id) => !range.includes(id));
};
