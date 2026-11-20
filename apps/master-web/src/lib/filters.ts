// Подпись чипа-атрибута в панели фильтров (#464): по названию значения видно,
// что выбрано, а при нескольких — сколько.
export const attributeChipLabel = (title: string, selected: string[], format: (value: string) => string = (value) => value) => {
  if (!selected.length) return title;
  if (selected.length === 1) return format(selected[0]);
  return `${title}: ${selected.length}`;
};
