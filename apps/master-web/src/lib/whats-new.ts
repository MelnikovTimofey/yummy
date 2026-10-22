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

type SlideCopy = { title: string; text: string; action?: WhatsNewAction };

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
        title: '«К заказу» без количества',
        text: 'Сколько заказать, решаете вы. «К заказу» показывает, когда табак закончится и сколько его уходит в месяц, а в заявке для поставщика — только названия.',
        list: [
          'В списке — всё, что закончится до следующей поставки: интервал считается сам по принятым счетам',
          'Расход — в граммах в месяц; под остатком видно, прогноз это или указал мастер',
          'Бюджет на табак в настройках полки — на дашборде видно, сколько съедает база и сколько остаётся на пробы',
          'Под каждой настройкой полки — что она значит и на что влияет',
        ],
        action: { label: 'Открыть «К заказу»', tab: 'shelf', view: 'reorder' },
      },
      {
        title: '«Закупка» и отметка пробы',
        text: 'Третий вид на «Полке» — «Закупка»: что держать постоянно, что докупить и что лежит — по расходу точки. Выбор гостей в приложении показан для справки — это только часть заказов.',
        list: [
          'База: сколько уходит в месяц и во что обходится; что берут часто, но не держим, и что держим зря',
          'Что закончилось за 3 дня и быстрее, что лежит и сколько в нём денег, какие вкусы расходятся больше, чем есть на полке',
          'Пробы: как быстро расходятся новинки и ваша отметка «Зашло / Не зашло» — в карточке и на телефоне',
          'Без бюджета видно, сколько стоит база в месяц; с бюджетом — сколько остаётся на пробы',
        ],
        action: { label: 'Открыть «Закупку»', tab: 'shelf', view: 'purchase' },
      },
    ],
  },
  {
    id: '2026-10-grams',
    label: '21 октября',
    slides: [
      {
        title: 'Полка в граммах',
        text: 'У табака на полке теперь остаток в граммах: сколько пришло, сколько осталось и на сколько дней хватит.',
        list: [
          '«Осталось…» — долей от того, что было после прихода, или точно в граммах',
          '«Закончился» — одной кнопкой',
        ],
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
        text: 'Гость может войти через Telegram — по желанию, без телефона и рассылок. В кабинете история «Покурить» и избранное: сердечко на карточке микса. Мастер кабинет не видит, без входа всё работает как прежде.',
        image: guest('cabinet.jpg'),
        contain: true,
      },
      {
        title: '«Для вас» на «Подборе»',
        text: 'Вошедшему гостю подбор предлагает миксы по его выборам, оценкам и избранному. Засиделся на одном вкусе — рядом «Шаг в сторону».',
        image: guest('for-you.jpg'),
        contain: true,
      },
      {
        title: 'Рилсы',
        text: 'Миксы короткими сценами по вкусам: лента «Рилсы» в нижней панели и полоса над «Подбором». Листается вверх, «Покурить» — прямо из рилса.',
        image: guest('reels.jpg'),
        contain: true,
      },
      {
        title: 'И по мелочи',
        text: 'То, что не тянет на отдельный слайд, но пригодится в смене.',
        list: [
          'Каталог каждую ночь сверяется с htreviews по брендам с полки, раз в неделю — целиком; новинки на полку сами не встают',
          '«Сладкий», «Кислый», «Свежий» больше не предлагаются гостю и не ставятся табаку',
          'Счета разбираются точнее: BLANSH — линейка AHF Tobacco, «Бабл Гам» и «Баблгам», «Пинк Ми» → Pink Me',
          'Полка на телефоне: все действия с банкой и настройки полки',
          'Гость видит ошибки по-русски и по делу, а не ответ сервера',
        ],
      },
    ],
  },
  {
    id: '2026-10-inventory',
    label: '21 октября',
    slides: [
      {
        title: 'Полка вместо «Табаков»',
        text: 'Банки на полке, расход и «хватит до» по каждому табаку. Закончилась банка — одна кнопка и 10 секунд на отмену.',
        image: inventory('shelf.jpg'),
        imagePhone: inventory('shelf-phone.jpg'),
        action: { label: 'Открыть полку', tab: 'shelf' },
      },
      {
        title: 'Поставки из счёта',
        text: 'PDF счёта поставщика превращается в банки на полке. Строки сопоставляются с каталогом, следующий счёт того же поставщика разбирается сам.',
        image: inventory('deliveries.jpg'),
        action: { label: 'Открыть поставки', tab: 'deliveries' },
      },
      {
        title: 'К заказу и прогноз',
        text: 'Что закончится до следующей поставки, сколько заказать и готовый текст для поставщика. На дашборде — прогноз расхода на сегодня и траты.',
        image: inventory('reorder.jpg'),
        action: { label: 'Открыть «К заказу»', tab: 'shelf', view: 'reorder' },
      },
      {
        title: 'Идеи для закупки',
        text: 'В «Каталоге» — табаки не с полки по рейтингу и просмотрам htreviews. Понравилось — «В план», и табак появится в «К заказу».',
        image: inventory('ideas.jpg'),
        action: { label: 'Открыть идеи', tab: 'catalog', view: 'ideas' },
      },
      {
        title: 'Полка на телефоне',
        text: '«Закончилась» и остаток банки — прямо у стойки, с телефона.',
        image: inventory('shelf-phone.jpg'),
        contain: true,
      },
      {
        title: 'И по мелочи',
        text: 'То, что не тянет на отдельный слайд, но пригодится в смене.',
        list: [
          'Каталог отделён от полки — наличие больше не тумблер',
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
