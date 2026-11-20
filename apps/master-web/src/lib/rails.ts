export const pluralizeMixCount = (count: number) => {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'миксов';
  const last = count % 10;
  if (last === 1) return 'микс';
  if (last >= 2 && last <= 4) return 'микса';
  return 'миксов';
};

// Подвал карточки рейла на телефоне (#shot=rails).
export const formatRailMixCount = (count: number) =>
  count ? `${count} ${pluralizeMixCount(count)}` : 'пусто';
