const codeDay = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' });
const codeTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

// «06:00 31 октября» — конец окна кода смены по Москве (#456).
export const formatCodeDeadline = (endsAt: string) => {
  const date = new Date(endsAt);
  if (!endsAt || Number.isNaN(date.getTime())) {
    return '—';
  }

  return `${codeTime.format(date)} ${codeDay.format(date)}`;
};
