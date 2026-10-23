// «24 октября в 06:00» — срок кода смены (#348).
export const formatDayTime = (value: string) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return '—';
  }

  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${day} в ${time}`;
};
