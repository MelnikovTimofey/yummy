// Ответ на запрос списка переустанавливает фильтры, сортировку и мету из
// payload'а. Без отсечения устаревших ответов запоздавший запрос возвращает
// поверхность к состоянию, из которого он был отправлен, — так дебаунс поиска
// откатывал только что выбранный фильтр наличия (#60).

export type LatestRequestGuard = {
  start: () => number;
  isStale: (ticket: number) => boolean;
};

export const createLatestRequestGuard = (): LatestRequestGuard => {
  let latest = 0;

  return {
    start: () => {
      latest += 1;
      return latest;
    },
    isStale: (ticket) => ticket !== latest,
  };
};
