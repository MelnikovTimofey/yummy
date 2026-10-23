const codeDay = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' });

// «23 октября» — день кода смены. Окно кончается в полночь по Москве, поэтому
// берём последнюю миллисекунду окна (#381).
export const formatCodeDay = (endsAt: string) => {
  const date = new Date(endsAt);
  if (!endsAt || Number.isNaN(date.getTime())) {
    return '—';
  }

  return codeDay.format(new Date(date.getTime() - 1));
};
