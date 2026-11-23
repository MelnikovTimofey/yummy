import type { Prisma } from './generated/prisma/client';

// `npm run db:clean` (#115) перед заливкой прод-табаков: каталог и демо-контент.
// В отличие от wipeStorage (#391) операционные данные остаются — иначе после
// очистки нечем войти. Дети раньше родителей: MixComponent и ShelfItem держат
// Restrict на табак, Delivery — на поставщика.
type Table = {
  model: Prisma.ModelName;
  label: string;
  count: () => Promise<number>;
  wipe: () => Promise<Prisma.BatchPayload>;
};

const tables = (db: Prisma.TransactionClient): Table[] => [
  { model: 'GuestFavorite', label: 'избранное гостей', count: () => db.guestFavorite.count(), wipe: () => db.guestFavorite.deleteMany() },
  { model: 'SmokeCtaEvent', label: 'smoke-события', count: () => db.smokeCtaEvent.count(), wipe: () => db.smokeCtaEvent.deleteMany() },
  { model: 'MixRating', label: 'рейтинги миксов', count: () => db.mixRating.count(), wipe: () => db.mixRating.deleteMany() },
  { model: 'RailMix', label: 'связи рейл↔микс', count: () => db.railMix.count(), wipe: () => db.railMix.deleteMany() },
  { model: 'MixComponent', label: 'состав миксов', count: () => db.mixComponent.count(), wipe: () => db.mixComponent.deleteMany() },
  { model: 'Rail', label: 'рейлы', count: () => db.rail.count(), wipe: () => db.rail.deleteMany() },
  { model: 'Mix', label: 'миксы', count: () => db.mix.count(), wipe: () => db.mix.deleteMany() },
  { model: 'ShelfItem', label: 'полка', count: () => db.shelfItem.count(), wipe: () => db.shelfItem.deleteMany() },
  { model: 'DeliveryLine', label: 'строки поставок', count: () => db.deliveryLine.count(), wipe: () => db.deliveryLine.deleteMany() },
  { model: 'Delivery', label: 'поставки', count: () => db.delivery.count(), wipe: () => db.delivery.deleteMany() },
  { model: 'SupplierItem', label: 'артикулы поставщиков', count: () => db.supplierItem.count(), wipe: () => db.supplierItem.deleteMany() },
  { model: 'Supplier', label: 'поставщики', count: () => db.supplier.count(), wipe: () => db.supplier.deleteMany() },
  { model: 'TobaccoAnalog', label: 'аналоги табаков', count: () => db.tobaccoAnalog.count(), wipe: () => db.tobaccoAnalog.deleteMany() },
  { model: 'Tobacco', label: 'табаки', count: () => db.tobacco.count(), wipe: () => db.tobacco.deleteMany() },
  { model: 'FlavorProfileCatalog', label: 'каталог профилей вкуса', count: () => db.flavorProfileCatalog.count(), wipe: () => db.flavorProfileCatalog.deleteMany() },
  { model: 'FlavorCatalog', label: 'каталог вкусов', count: () => db.flavorCatalog.count(), wipe: () => db.flavorCatalog.deleteMany() },
  { model: 'FlavorTagCatalog', label: 'каталог мета-тегов', count: () => db.flavorTagCatalog.count(), wipe: () => db.flavorTagCatalog.deleteMany() },
  { model: 'SourceTagMapping', label: 'source-tag маппинги', count: () => db.sourceTagMapping.count(), wipe: () => db.sourceTagMapping.deleteMany() },
];

export const demoContentModels = tables({} as Prisma.TransactionClient).map((table) => table.model);

// Не чистятся: операционные данные и учётки гостей с их собственными событиями
// (события «Намиксуй» хранят снимок состава без FK на табак).
export const keptModels: Prisma.ModelName[] = [
  'StaffAccount',
  'DailyAccessCode',
  'IntroCard',
  'TelegramOperator',
  'TelegramRecipient',
  'TelegramAutomationState',
  'AuditEvent',
  'GuestAccount',
  'GuestLoginCode',
  'CustomMixSmokeEvent',
];

export const countDemoContent = async (db: Prisma.TransactionClient) => {
  const counts: Record<string, number> = {};
  for (const table of tables(db)) {
    counts[table.label] = await table.count();
  }
  return counts;
};

export const wipeDemoContent = async (db: Prisma.TransactionClient) => {
  const deleted: Record<string, number> = {};
  for (const table of tables(db)) {
    deleted[table.label] = (await table.wipe()).count;
  }
  return deleted;
};
