import type { WorkspaceTab } from '../components/shell/workspace-tabs';

// «Что нового» (#226, design/design_handoff_whats_new): выпуски со слайдами,
// новый — первым. Крупная фича при релизе добавляет свои слайды новым выпуском;
// картинки — в public/whats-new/<id>/.

export type WhatsNewAction = {
  label: string;
  tab: WorkspaceTab;
  // Вид внутри вкладки: «К заказу» и «Закупка» на полке, «Идеи для закупки» в каталоге.
  view?: 'reorder' | 'purchase' | 'ideas';
};

type SlideCopy = { title: string; text?: string; action?: WhatsNewAction };

export type WhatsNewSlide = SlideCopy &
  ({ image: string; imagePhone?: string; contain?: boolean } | { list: string[] });

export type WhatsNewRelease = { id: string; label: string; slides: WhatsNewSlide[] };

const inventory = (file: string) => `/whats-new/2026-10-inventory/${file}`;
const guest = (file: string) => `/whats-new/2026-10-guest/${file}`;

export const WHATS_NEW: WhatsNewRelease[] = [
  {
    id: '2026-10-purchase',
    label: '22 октября',
    slides: [
      {
        title: 'Заказ без количества',
        text: 'Сколько заказать, решаете вы. В заказе видно, когда табак закончится и сколько его уходит за месяц. В заявке для поставщика только названия.',
        list: [
          'В заказе всё, что закончится до следующей поставки. Интервал поставок считается сам по принятым счетам',
          'Расход показан в граммах за месяц. Под остатком видно, прогноз это или число от мастера',
          'Бюджет на табак задают в настройках полки. На дашборде видно, сколько уходит на базу и сколько остаётся на пробы',
          'Под каждой настройкой полки написано, на что она влияет',
        ],
        action: { label: 'Открыть заказ', tab: 'shelf', view: 'reorder' },
      },
      {
        title: 'Закупка и отметка пробы',
        text: 'На полке появился третий вид, Закупка. По расходу точки видно, что держать постоянно, что докупить и что лежит без движения. Выбор гостей в приложении показан для справки, это только часть заказов.',
        list: [
          'База: сколько табака уходит за месяц и сколько это стоит. Отдельно видно, что берут часто, но не держим, и что держим зря',
          'Что закончилось за 3 дня или быстрее, что лежит и сколько в нём денег, какие вкусы расходятся больше, чем есть на полке',
          'Пробы: как быстро расходятся новинки. Отметку Зашло или Не зашло ставят в карточке табака и на телефоне',
          'Без бюджета видно, сколько стоит база за месяц. С бюджетом видно, сколько остаётся на пробы',
        ],
        action: { label: 'Открыть закупку', tab: 'shelf', view: 'purchase' },
      },
      {
        title: 'Несколько табаков сразу',
        text: 'После смены не нужно отмечать каждую строку отдельно. Отметьте табаки галочками и нажмите Закончились внизу. Отменить можно всё одним нажатием.',
        list: [
          'Shift и клик выделяют диапазон строк, X выделяет строку, Esc снимает выделение',
          'Табаки, которые уже закончились или стоят в плане, пропускаются. Их число видно в уведомлении вместе со скрытыми миксами',
          'Для выбранных можно включить Стоп для гостей и Держим постоянно',
          'На телефоне нажмите Выбрать в шапке полки и касайтесь карточек',
        ],
        action: { label: 'Открыть полку', tab: 'shelf' },
      },
    ],
  },
  {
    id: '2026-10-grams',
    label: '21 октября',
    slides: [
      {
        title: 'Полка в граммах',
        text: 'Остаток табака на полке теперь в граммах, рядом видно, на сколько дней его хватит.',
        list: ['Остаток указывают долей от прихода или точно в граммах', 'Пустую банку отмечают одной кнопкой'],
        action: { label: 'Открыть полку', tab: 'shelf' },
      },
    ],
  },
  {
    id: '2026-10-guest',
    label: '21 октября',
    slides: [
      {
        title: 'Кабинет гостя',
        text: 'Гость может войти через Telegram, если захочет. Телефон не нужен, рассылок нет. В кабинете история выборов и избранное, мастер кабинет не видит. Без входа всё работает как прежде.',
        image: guest('cabinet.jpg'),
        contain: true,
      },
      {
        title: 'Подбор для вошедшего гостя',
        text: 'Вошедшему гостю подбор предлагает миксы по его выборам, оценкам и избранному. Если гость берёт одно и то же, рядом появится подборка с другими вкусами.',
        image: guest('for-you.jpg'),
        contain: true,
      },
      {
        title: 'Рилсы',
        text: 'Миксы короткими сценами по вкусам: лента в нижней панели и полоса над подбором. Ленту листают вверх, выбрать микс можно прямо в рилсе.',
        image: guest('reels.jpg'),
        contain: true,
      },
      {
        title: 'Ещё изменения',
        list: [
          'Каталог каждую ночь сверяется с htreviews по брендам с полки, а раз в неделю целиком. Новинки сами на полку не попадают',
          'Категории сладкий, кислый и свежий больше не предлагаются гостю и не ставятся табаку',
          'Счета разбираются точнее: BLANSH распознаётся как линейка AHF Tobacco, разные написания одного вкуса сводятся к одному',
          'На телефоне доступны все действия с банкой и настройки полки',
          'Ошибки гость видит на русском и понятными словами',
        ],
      },
    ],
  },
  {
    id: '2026-10-inventory',
    label: '21 октября',
    slides: [
      {
        title: 'Полка вместо раздела Табаки',
        text: 'На полке видны остаток, расход и дата, до которой табака хватит. Пустую банку отмечают одной кнопкой, отменить можно в течение 10 секунд.',
        image: inventory('shelf.jpg'),
        imagePhone: inventory('shelf-phone.jpg'),
        action: { label: 'Открыть полку', tab: 'shelf' },
      },
      {
        title: 'Поставки из счёта',
        text: 'PDF счёта поставщика превращается в приход на полке. Строки сопоставляются с каталогом, следующий счёт того же поставщика разбирается сам.',
        image: inventory('deliveries.jpg'),
        action: { label: 'Открыть поставки', tab: 'deliveries' },
      },
      {
        title: 'К заказу и прогноз',
        text: 'Видно, что закончится до следующей поставки и сколько заказать. Текст заказа для поставщика готов сразу. Прогноз расхода и траты теперь на дашборде.',
        image: inventory('reorder.jpg'),
        action: { label: 'Открыть заказ', tab: 'shelf', view: 'reorder' },
      },
      {
        title: 'Идеи для закупки',
        text: 'В каталоге собраны табаки, которых нет на полке, с рейтингом и просмотрами htreviews. Кнопка В план добавляет табак в заказ.',
        image: inventory('ideas.jpg'),
        action: { label: 'Открыть идеи', tab: 'catalog', view: 'ideas' },
      },
      {
        title: 'Полка на телефоне',
        text: 'Пустые банки и остаток можно отмечать с телефона у стойки.',
        image: inventory('shelf-phone.jpg'),
        contain: true,
      },
      {
        title: 'Ещё изменения',
        list: [
          'Каталог и полка теперь раздельны, тумблера наличия больше нет',
          'Стоп для гостей: табак есть, но гостю не предлагается',
          'Настройки полки: граммовка чаши и срок поставки',
          'Ссылка на htreviews в карточке табака',
        ],
      },
    ],
  },
];

export const latestRelease = (releases: WhatsNewRelease[] = WHATS_NEW): WhatsNewRelease | null => releases[0] ?? null;

export const hasUnseen = (lastSeenId: string | null, releases: WhatsNewRelease[] = WHATS_NEW) => {
  const latest = latestRelease(releases);
  return latest !== null && latest.id !== lastSeenId;
};

// «Прочитано» — на логин и устройство; на сервере не храним.
export const seenStorageKey = (login: string) => `atelier.whatsNew.seen.${login}`;

type SeenStorage = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };

// Доступ к localStorage сам может бросить (приватный режим, запрет cookies).
const browserStorage = (): SeenStorage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const readSeen = (login: string, storage: SeenStorage | null = browserStorage()) => {
  try {
    return storage?.getItem(seenStorageKey(login)) ?? null;
  } catch {
    return null;
  }
};

export const markSeen = (login: string, id: string, storage: SeenStorage | null = browserStorage()) => {
  try {
    storage?.setItem(seenStorageKey(login), id);
  } catch {
    // Не сохранилось — точка останется гореть, окно при этом работает.
  }
};

export const stepSlide = (index: number, delta: number, count: number) =>
  Math.min(Math.max(index + delta, 0), count - 1);

const SWIPE_PX = 50;

// Сдвиг пальца → шаг по слайдам: влево — следующий, вправо — предыдущий.
export const swipeStep = (dx: number, dy: number) => {
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
};

// Снимок по умолчанию — cover от левого верхнего угла; contain — только где указано.
export const slideImage = (slide: WhatsNewSlide, isPhone: boolean) => {
  if (!('image' in slide)) return null;
  return { src: (isPhone && slide.imagePhone) || slide.image, contain: Boolean(slide.contain) };
};
