import type { Prisma } from './generated/prisma/client';

// Дети раньше родителей: MixComponent, ShelfItem и Delivery держат FK с Restrict.
// Общая очистка test-reset и prisma seed (#391): новую модель добавлять сюда.
export const wipeStorage = async (tx: Prisma.TransactionClient) => {
  await tx.guestLoginCode.deleteMany();
  await tx.guestFavorite.deleteMany();
  await tx.smokeCtaEvent.deleteMany();
  await tx.customMixSmokeEvent.deleteMany();
  await tx.mixRating.deleteMany();
  await tx.guestAccount.deleteMany();
  await tx.railMix.deleteMany();
  await tx.mixComponent.deleteMany();
  await tx.rail.deleteMany();
  await tx.mix.deleteMany();
  await tx.shelfItem.deleteMany();
  await tx.deliveryLine.deleteMany();
  await tx.delivery.deleteMany();
  await tx.supplierItem.deleteMany();
  await tx.supplier.deleteMany();
  await tx.tobacco.deleteMany();
  await tx.introCard.deleteMany();
  await tx.dailyAccessCode.deleteMany();
  await tx.telegramRecipient.deleteMany();
  await tx.telegramOperator.deleteMany();
  await tx.telegramAutomationState.deleteMany();
  await tx.auditEvent.deleteMany();
  await tx.staffAccount.deleteMany();
};
