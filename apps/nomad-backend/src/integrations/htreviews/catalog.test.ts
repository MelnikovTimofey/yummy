import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchHtReviewsCatalogSnapshot } from './catalog';

const htmlResponse = (body: string) =>
  new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });

const buildBrandPage = (brandSlug: string, brandName: string, tobaccoName: string, tobaccoSlug: string) => `
  <div class="tobacco_list_items" data-count="1">
    <div class="tobacco_list_item " data-id="190397">
      <a class="tobacco_list_item_image" href="https://htreviews.org/tobaccos/${brandSlug}/main/${tobaccoSlug}">
        <img data-src="https://htreviews.org/uploads/${tobaccoSlug}.webp" alt="${tobaccoName}">
      </a>
      <div class="tobacco_list_item_name">
        <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/${brandSlug}/main/${tobaccoSlug}">
          <span>${tobaccoName}</span>
        </a>
        <a class="tobacco_list_item_brand_slug" href="https://htreviews.org/tobaccos/${brandSlug}">
          <span>${brandName}</span>
        </a>
        <a class="tobacco_list_item_line_slug" href="https://htreviews.org/tobaccos/${brandSlug}/main">
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

test('fetchHtReviewsCatalogSnapshot extends brand discovery via paginated getData results', async (t) => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  globalThis.fetch = (async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    fetchCalls.push(url);

    switch (url) {
      case 'https://htreviews.org/tobaccos':
      case 'https://htreviews.org/tobaccos/new':
      case 'https://htreviews.org/tobaccos/lines':
        return htmlResponse('<div class="tobacco_list_items"></div>');
      case 'https://htreviews.org/tobaccos/brands':
        return htmlResponse(`
          <div class="tobacco_list_wrapper" data-active="1" data-type="position">
            <div class="tobacco_list_items" data-target="5" data-offset="20" data-count="21">
              <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/musthave"><span>MUSTHAVE</span></a>
            </div>
          </div>
          <div class="tobacco_list_wrapper" data-active="0" data-type="others">
            <div class="tobacco_list_items" data-target="5" data-offset="20" data-count="21">
              <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/darkside"><span>DARKSIDE</span></a>
            </div>
          </div>
        `);
      case 'https://htreviews.org/getData?action=brands&r=position&s=rating&d=desc&o=20':
        return jsonResponse([
          {
            slug: 'overdose',
            name: 'Overdose',
          },
        ]);
      case 'https://htreviews.org/getData?action=brands&r=position&s=rating&d=desc&o=40':
      case 'https://htreviews.org/getData?action=brands&r=others&s=rating&d=desc&o=20':
        return jsonResponse([]);
      case 'https://htreviews.org/tobaccos/musthave':
        return htmlResponse(buildBrandPage('musthave', 'MUSTHAVE', 'Earl Grey', 'earl-grey'));
      case 'https://htreviews.org/tobaccos/darkside':
        return htmlResponse(buildBrandPage('darkside', 'DARKSIDE', 'Supernova', 'supernova'));
      case 'https://htreviews.org/tobaccos/overdose':
        return htmlResponse(buildBrandPage('overdose', 'Overdose', 'Kashmir Citrus', 'kashmir-citrus'));
      default:
        throw new Error(`Unexpected fetch url in test: ${url}`);
    }
  }) as typeof globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const snapshot = await fetchHtReviewsCatalogSnapshot({
    fetchDetails: false,
    delayMs: 0,
    requestTimeoutMs: 100,
  });

  assert.equal(snapshot.brandCount, 3);
  assert.equal(snapshot.items.length, 3);
  assert.ok(
    snapshot.items.some((item) => item.manufacturer === 'Overdose' && item.name === 'Kashmir Citrus'),
  );
  assert.ok(
    fetchCalls.includes('https://htreviews.org/getData?action=brands&r=position&s=rating&d=desc&o=20'),
  );
});
