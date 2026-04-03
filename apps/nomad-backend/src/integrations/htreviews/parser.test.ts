import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCatalogEntryUrls, parseBrandIndexPage, parseBrandPage, parseTobaccoPage } from './parser';
import { buildNomadTaxonomyCandidate } from './taxonomy';

test('parseBrandIndexPage returns deduplicated brand refs', () => {
  const html = `
    <div class="tobacco_list_items">
      <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/musthave"><span>MUSTHAVE</span></a>
      <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/musthave"><span>MUSTHAVE</span></a>
      <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/darkside"><span>DARKSIDE</span></a>
    </div>
  `;

  const brands = parseBrandIndexPage(html, 'https://htreviews.org');
  assert.deepEqual(
    brands.map((item) => ({ slug: item.slug, name: item.name })),
    [
      { slug: 'musthave', name: 'MUSTHAVE' },
      { slug: 'darkside', name: 'DARKSIDE' },
    ],
  );
});

test('parseBrandPage extracts tobacco summaries from brand listing', () => {
  const html = `
    <div class="tobacco_list_items" data-count="1">
      <div class="tobacco_list_item " data-id="190397">
        <a class="tobacco_list_item_image" href="https://htreviews.org/tobaccos/musthave/main/earl-grey">
          <img data-src="https://htreviews.org/uploads/earl-grey.webp" alt="Earl Grey">
        </a>
        <div class="tobacco_list_item_name">
          <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/musthave/main/earl-grey">
            <span>Earl Grey</span>
            <span>Эрл Грей</span>
          </a>
          <a class="tobacco_list_item_brand_slug" href="https://htreviews.org/tobaccos/musthave">
            <span>MUSTHAVE</span>
          </a>
          <a class="tobacco_list_item_line_slug" href="https://htreviews.org/tobaccos/musthave/main">
            <span>Основная</span>
          </a>
        </div>
        <div class="list_item_rating"><span>4.7</span></div>
        <div class="list_item_ratings_count"><span>237</span></div>
        <div class="list_item_reviews"><span>208</span></div>
        <div class="list_item_stats"><span>20.7k</span></div>
      </div>
    </div>
  `;

  const items = parseBrandPage(html, 'https://htreviews.org');
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    sourceNumericId: '190397',
    name: 'Earl Grey',
    alias: 'Эрл Грей',
    url: 'https://htreviews.org/tobaccos/musthave/main/earl-grey',
    imageUrl: 'https://htreviews.org/uploads/earl-grey.webp',
    brand: {
      name: 'MUSTHAVE',
      slug: 'musthave',
      url: 'https://htreviews.org/tobaccos/musthave',
    },
    line: {
      name: 'Основная',
      slug: 'main',
      url: 'https://htreviews.org/tobaccos/musthave/main',
    },
    rating: 4.7,
    ratingsCount: 237,
    reviewsCount: 208,
    viewsCount: 20700,
  });
});

test('extractCatalogEntryUrls separates brand, line and tobacco URLs', () => {
  const html = `
    <a href="/tobaccos/new">Новые вкусы</a>
    <a href="https://htreviews.org/tobaccos/musthave">MUSTHAVE</a>
    <a href="https://htreviews.org/tobaccos/musthave/main">Основная</a>
    <a href="https://htreviews.org/tobaccos/musthave/main/earl-grey">Earl Grey</a>
    <a href="https://htreviews.org/tobaccos/musthave/main/earl-grey">Earl Grey</a>
    <a href="/tobaccos/black-burn">Black Burn</a>
    <a href="/tobaccos/black-burn/black-burn-main">Основная</a>
  `;

  const links = extractCatalogEntryUrls(html, 'https://htreviews.org');

  assert.deepEqual(links.brandUrls, [
    'https://htreviews.org/tobaccos/musthave',
    'https://htreviews.org/tobaccos/black-burn',
  ]);
  assert.deepEqual(links.lineUrls, [
    'https://htreviews.org/tobaccos/musthave/main',
    'https://htreviews.org/tobaccos/black-burn/black-burn-main',
  ]);
  assert.deepEqual(links.tobaccoUrls, ['https://htreviews.org/tobaccos/musthave/main/earl-grey']);
});

test('parseTobaccoPage extracts detail metadata and tags', () => {
  const html = `
    <div class="object_card_title">
      <h1>Overdose</h1>
      <span>Овердоз</span>
    </div>
    <div class="object_card_discr"><span>Кислинка и лайм.</span></div>
    <a class="object_card_tag" href="https://htreviews.org/tobaccos?r=flavor&t=11">Лайм</a>
    <a class="object_card_tag" href="https://htreviews.org/tobaccos?r=flavor&t=29">Лимон</a>
    <div class="object_info_item"><span>Бренд</span><span></span><span><a href="https://htreviews.org/tobaccos/black-burn">Black Burn</a></span></div>
    <div class="object_info_item"><span>Линейка</span><span></span><span><a href="https://htreviews.org/tobaccos/black-burn/black-burn-main">Основная</a></span></div>
    <div class="object_info_item"><span>Страна</span><span></span><span>Россия</span></div>
    <div class="object_info_item"><span><span>Крепость официальная</span></span><span></span><span>Средняя</span></div>
    <div class="object_info_item"><span><span>Крепость по оценкам</span></span><span></span><span>Средняя</span></div>
    <div class="object_info_item"><span><span>Статус</span></span><span></span><span>Выпускается</span></div>
    <div class="object_info_item"><span>HtreviewsID</span><span></span><span>htr162314</span></div>
    <div class="object_info_item"><span>Добавлен на сайт</span><span></span><span>05.08.2021</span></div>
    <div class="reviews_list" hx-get="https://htreviews.org/htmx/load/reviews_object?id=162314&object=tobacco"></div>
    <script type="application/ld+json">
      {
        "@context":"http://schema.org",
        "@type":"Product",
        "name":"Overdose",
        "image":"https://htreviews.org/uploads/objects/overdose.webp",
        "url":"https://htreviews.org/tobaccos/black-burn/black-burn-main/overdose",
        "aggregateRating": {
          "ratingValue":"4",
          "reviewCount":"71"
        }
      }
    </script>
  `;

  const item = parseTobaccoPage(html, 'https://htreviews.org', 'https://htreviews.org/tobaccos/black-burn/black-burn-main/overdose');
  assert.equal(item.name, 'Overdose');
  assert.equal(item.alias, 'Овердоз');
  assert.equal(item.brand.name, 'Black Burn');
  assert.equal(item.line.name, 'Основная');
  assert.equal(item.country, 'Россия');
  assert.equal(item.officialStrength, 'Средняя');
  assert.equal(item.communityStrength, 'Средняя');
  assert.equal(item.status, 'Выпускается');
  assert.equal(item.htreviewsId, 'htr162314');
  assert.equal(item.addedAt, '05.08.2021');
  assert.deepEqual(item.rawTags, ['Лайм', 'Лимон']);
  assert.equal(item.sourceNumericId, '162314');
  assert.equal(item.reviewCount, 71);
});

test('parseTobaccoPage derives community strength from description scale when field is absent', () => {
  const html = `
    <div class="object_card_title">
      <h1>Криолло 98</h1>
    </div>
    <div class="object_card_discr"><span>Табак выращен в Никарагуа, урожай 2020 года, 4 года выдержки. Крепость высокая, 5/5. Роза вкуса: имбирь, тёмный шоколад, кожа.</span></div>
    <div class="object_info_item"><span>Бренд</span><span></span><span><a href="https://htreviews.org/tobaccos/dogma">Догма</a></span></div>
    <div class="object_info_item"><span>Линейка</span><span></span><span><a href="https://htreviews.org/tobaccos/dogma/cigar-monosort">Сигарный моносорт</a></span></div>
    <div class="object_info_item"><span><span>Крепость официальная</span></span><span></span><span>Крепкая</span></div>
    <script type="application/ld+json">
      {
        "@context":"http://schema.org",
        "@type":"Product",
        "name":"Криолло 98",
        "url":"https://htreviews.org/tobaccos/dogma/cigar-monosort/criollo-98"
      }
    </script>
  `;

  const item = parseTobaccoPage(html, 'https://htreviews.org', 'https://htreviews.org/tobaccos/dogma/cigar-monosort/criollo-98');
  assert.equal(item.communityStrength, 'Крепкая');
});

test('buildNomadTaxonomyCandidate separates profiles, flavors and meta tags', () => {
  const candidate = buildNomadTaxonomyCandidate(['Лимон', 'Мята', 'Чай', 'Виски', 'Сыр']);
  assert.deepEqual(candidate.flavorProfiles, ['citrus', 'floral_herbal', 'fresh', 'fruity', 'minty', 'sour']);
  assert.deepEqual(candidate.flavorTags, ['напитки', 'охлаждающий', 'редкие']);
  assert.deepEqual(candidate.flavors, ['виски', 'лимон', 'мята', 'сыр', 'чай']);
});

test('buildNomadTaxonomyCandidate keeps creamy notes in flavors while deriving dessert profile', () => {
  const candidate = buildNomadTaxonomyCandidate(['Сливочный']);
  assert.deepEqual(candidate.flavorProfiles, ['dessert', 'sweet']);
  assert.deepEqual(candidate.flavors, ['сливочный']);
  assert.deepEqual(candidate.flavorTags, []);
});
