import 'dotenv/config';
import { prisma } from '../src/db';
import { archiveOffListTobaccos } from '../src/integrations/htreviews/sync';

// Разовое сужение каталога до списка брендов клиента (#519, docs/atelier/prod-operations.md §6).
// Без --apply только считает: что уйдёт в архив, по брендам.
async function main() {
  const apply = process.argv.includes('--apply');
  const brandUrls = (process.env.HTREVIEWS_BRAND_URLS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!brandUrls.length) {
    throw new Error('HTREVIEWS_BRAND_URLS пуст: без списка брендов в архив ушёл бы весь каталог htreviews');
  }

  const before = await prisma.tobacco.count({ where: { archived: false } });
  const offList = await archiveOffListTobaccos(brandUrls, { apply });
  const byBrand = new Map<string, number>();
  for (const record of offList) {
    byBrand.set(record.manufacturer, (byBrand.get(record.manufacturer) ?? 0) + 1);
  }
  const top = Array.from(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 20);

  console.log(`[archive-off-list] brands=${brandUrls.length} activeBefore=${before} offList=${offList.length} apply=${apply}`);
  console.log(`[archive-off-list] top brands: ${top.map(([name, count]) => `${name}=${count}`).join(', ')}`);
  if (apply) {
    console.log(`[archive-off-list] activeAfter=${await prisma.tobacco.count({ where: { archived: false } })}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
