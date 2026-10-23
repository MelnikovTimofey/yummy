import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHATS_NEW,
  hasUnseen,
  latestRelease,
  markSeen,
  readSeen,
  seenStorageKey,
  slideImage,
  stepSlide,
  swipeStep,
  type WhatsNewRelease,
} from './whats-new';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
};

const brokenStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

const release = (id: string): WhatsNewRelease => ({ id, label: id, slides: [{ title: 't', text: 'x', list: ['a'] }] });

test('последний выпуск — первый в списке; выпусков нет — null', () => {
  assert.equal(latestRelease([release('new'), release('old')])?.id, 'new');
  assert.equal(latestRelease([]), null);
  assert.equal(latestRelease()?.id, '2026-10-purchase');
});

test('непросмотрено, пока сохранённый id не совпал с последним выпуском', () => {
  const releases = [release('new'), release('old')];
  assert.equal(hasUnseen(null, releases), true);
  assert.equal(hasUnseen('old', releases), true);
  assert.equal(hasUnseen('new', releases), false);
  assert.equal(hasUnseen(null, []), false);
});

test('ключ хранилища — по логину', () => {
  assert.equal(seenStorageKey('admin'), 'atelier.whatsNew.seen.admin');
  assert.notEqual(seenStorageKey('admin'), seenStorageKey('atelier'));
});

test('отметка «просмотрено» читается для того же логина и не протекает к другому', () => {
  const storage = memoryStorage();
  assert.equal(readSeen('admin', storage), null);
  markSeen('admin', '2026-10-inventory', storage);
  assert.equal(readSeen('admin', storage), '2026-10-inventory');
  assert.equal(storage.data.get('atelier.whatsNew.seen.admin'), '2026-10-inventory');
  assert.equal(readSeen('atelier', storage), null);
});

test('хранилище недоступно — «не просмотрено» и без исключений', () => {
  assert.equal(readSeen('admin', brokenStorage), null);
  assert.doesNotThrow(() => markSeen('admin', 'x', brokenStorage));
  assert.equal(readSeen('admin', null), null);
  assert.doesNotThrow(() => markSeen('admin', 'x', null));
});

test('листание не выходит за первый и последний слайд', () => {
  assert.equal(stepSlide(0, -1, 6), 0);
  assert.equal(stepSlide(0, 1, 6), 1);
  assert.equal(stepSlide(5, 1, 6), 5);
  assert.equal(stepSlide(3, -1, 6), 2);
});

test('свайп: влево — следующий, вправо — предыдущий, короткий или вертикальный — ничего', () => {
  assert.equal(swipeStep(-80, 5), 1);
  assert.equal(swipeStep(80, -10), -1);
  assert.equal(swipeStep(-30, 0), 0);
  assert.equal(swipeStep(-60, 120), 0);
});

test('картинка слайда: на телефоне — imagePhone, если есть; contain — только где указано', () => {
  const desk = { title: 't', text: 'x', image: '/a.jpg', imagePhone: '/a-phone.jpg' };
  assert.deepEqual(slideImage(desk, false), { src: '/a.jpg', contain: false });
  assert.deepEqual(slideImage(desk, true), { src: '/a-phone.jpg', contain: false });
  assert.deepEqual(slideImage({ title: 't', text: 'x', image: '/b.jpg' }, true), { src: '/b.jpg', contain: false });
  assert.deepEqual(slideImage({ title: 't', text: 'x', image: '/c.jpg', contain: true }, false), { src: '/c.jpg', contain: true });
  assert.equal(slideImage({ title: 't', text: 'x', list: ['a'] }, false), null);
});

test('данные выпусков целостны: id уникальны, у каждого слайда картинка или список', () => {
  const ids = WHATS_NEW.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of WHATS_NEW) {
    assert.ok(item.label.trim(), `${item.id}: нет label`);
    assert.ok(item.slides.length > 0, `${item.id}: нет слайдов`);
    for (const slide of item.slides) {
      assert.ok(slide.title.trim(), `${item.id}: слайд без заголовка`);
      const hasImage = 'image' in slide && Boolean(slide.image);
      const hasList = 'list' in slide && slide.list.length > 0;
      assert.ok(hasImage !== hasList, `${item.id} «${slide.title}»: нужна либо картинка, либо список`);
      if ('image' in slide) {
        assert.ok(slide.text?.trim(), `${item.id} «${slide.title}»: у снимка нужен текст`);
        assert.ok(slide.image.startsWith(`/whats-new/${item.id}/`), `${slide.image}: не в папке выпуска`);
        if (slide.imagePhone) assert.ok(slide.imagePhone.startsWith(`/whats-new/${item.id}/`));
      }
    }
  }
});

// Канон #348: без middot, тире между частями фразы, кавычек вокруг названий, «≈» и многоточий.
test('тексты выпусков по канону: без ·, —, «», ≈ и …', () => {
  for (const item of WHATS_NEW) {
    for (const slide of item.slides) {
      const lines = [slide.title, slide.text ?? '', slide.action?.label ?? '', ...('list' in slide ? slide.list : [])];
      for (const line of lines) assert.doesNotMatch(line, /[·—«»≈~…→]/, `${item.id}: ${line}`);
    }
  }
});

test('последний выпуск — прогноз вместо количества, закупка и несколько табаков сразу', () => {
  const latest = WHATS_NEW[0];
  assert.equal(latest.id, '2026-10-purchase');
  assert.equal(latest.label, '22 октября');
  assert.deepEqual(latest.slides.map((slide) => slide.title), [
    'Заказ без количества',
    'Закупка и отметка пробы',
    'Несколько табаков сразу',
  ]);
  const [slide, purchase, bulk] = latest.slides;
  // #333: выбор на полке и на телефоне, ссылка — на полку.
  assert.deepEqual(bulk.action, { label: 'Открыть полку', tab: 'shelf' });
  assert.ok('list' in bulk && bulk.list.some((line) => line.includes('Shift')) && bulk.list.some((line) => line.includes('Выбрать')));
  assert.deepEqual(purchase.action, { label: 'Открыть закупку', tab: 'shelf', view: 'purchase' });
  assert.ok('list' in purchase && purchase.list.some((line) => line.includes('Зашло')));
  assert.ok(!/шаг|± ?50/i.test(JSON.stringify(purchase)));
  assert.deepEqual(slide.action, { label: 'Открыть заказ', tab: 'shelf', view: 'reorder' });
  assert.ok('list' in slide && slide.list.some((line) => line.includes('Бюджет на табак')));
  // Количество к заказу больше не предлагаем — в тексте ни «шага», ни «сколько заказать» от сервиса.
  assert.ok(!/шаг|± ?50/i.test(JSON.stringify(slide)));
});

test('выпуск «Полка в граммах»: один слайд со ссылкой на полку', () => {
  const latest = WHATS_NEW.find((item) => item.id === '2026-10-grams')!;
  assert.equal(latest.id, '2026-10-grams');
  assert.equal(latest.label, '21 октября');
  assert.deepEqual(latest.slides.map((slide) => slide.title), ['Полка в граммах']);
  const [slide] = latest.slides;
  assert.deepEqual(slide.action, { label: 'Открыть полку', tab: 'shelf' });
  assert.ok(!/банк/i.test(slide.text ?? ''));
});

test('гостевой выпуск: кабинет, подбор, рилсы и ещё изменения, без кнопки раздела', () => {
  const latest = WHATS_NEW.find((item) => item.id === '2026-10-guest')!;
  assert.equal(latest.id, '2026-10-guest');
  assert.deepEqual(
    latest.slides.map((slide) => slide.title),
    ['Кабинет гостя', 'Подбор для вошедшего гостя', 'Рилсы', 'Ещё изменения'],
  );
  // Гостевые экраны в «Мастере» не открыть — кнопки раздела нет.
  assert.ok(latest.slides.every((slide) => !slide.action));
  // Снимки телефона гостя — целиком, без обрезки.
  assert.ok(latest.slides.every((slide) => !('image' in slide) || slide.contain));
});

test('выпуск инвентаря — 21 октября, 6 слайдов как в мокапе', () => {
  const first = WHATS_NEW.find((item) => item.id === '2026-10-inventory')!;
  assert.equal(first.label, '21 октября');
  assert.deepEqual(
    first.slides.map((slide) => slide.title),
    ['Полка вместо раздела Табаки', 'Поставки из счёта', 'К заказу и прогноз', 'Идеи для закупки', 'Полка на телефоне', 'Ещё изменения'],
  );
  assert.deepEqual(
    first.slides.map((slide) => slide.action && [slide.action.label, slide.action.tab, slide.action.view ?? null]),
    [
      ['Открыть полку', 'shelf', null],
      ['Открыть поставки', 'deliveries', null],
      ['Открыть заказ', 'shelf', 'reorder'],
      ['Открыть идеи', 'catalog', 'ideas'],
      undefined,
      undefined,
    ],
  );
  const phone = first.slides[4];
  assert.ok('image' in phone && phone.image.endsWith('shelf-phone.jpg') && phone.contain);
  const shelf = first.slides[0];
  assert.ok('image' in shelf && shelf.imagePhone?.endsWith('shelf-phone.jpg'));
  const last = first.slides[5];
  assert.ok('list' in last && last.list.length === 4);
});
