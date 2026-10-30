export type ProfileOption = {
  value: string;
  label: string;
};

// Порядок — тот же, в котором профили показываются гостю в онбординге.
export const profileOptions: ProfileOption[] = [
  { value: 'spicy', label: 'Пряный' },
  { value: 'dessert', label: 'Десертный' },
  { value: 'tobacco', label: 'Табачный' },
  { value: 'minty', label: 'Мятный' },
  { value: 'fruity', label: 'Фруктовый' },
  { value: 'floral_herbal', label: 'Цветочно-травяной' },
  { value: 'citrus', label: 'Цитрусовый' },
  { value: 'berry', label: 'Ягодный' },
  { value: 'perfume', label: 'Парфюмный' },
  { value: 'beverage', label: 'Напитки' },
  { value: 'gastro', label: 'Гастро' },
];

// «Сладкий», «Кислый» и «Свежий» сняты с выбора (#182): своего источника в
// htreviews у них нет. Подписи остаются для вкусов, сохранённых гостями раньше.
export const profileLabelMap: Record<string, string> = {
  ...Object.fromEntries(profileOptions.map((item) => [item.value, item.label])),
  sweet: 'Сладкий',
  sour: 'Кислый',
  fresh: 'Свежий',
};
