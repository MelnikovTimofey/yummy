import { prisma } from './db';
import { ShelfNotFoundError, ShelfValidationError, type ShelfActor } from './shelf';
import { getAvailableMixCatalog } from './state';

// Мастер ведёт список аналогов табака (#480, PRD §9.3 п.6). Связь взаимная: новый
// аналог получает этот табак в конец своего списка, убранный теряет его. Порядок
// у каждого табака свой, аналог аналога сам аналогом не становится.

const parseAnalogs = (tobaccoId: string, value: unknown) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new ShelfValidationError('analogs: список id табаков');
  }
  const ids = value.map((item: string) => item.trim());
  if (new Set(ids).size !== ids.length) throw new ShelfValidationError('analogs: табак указан дважды');
  if (ids.includes(tobaccoId)) throw new ShelfValidationError('analogs: табак не может быть аналогом сам себе');
  return ids;
};

const statusesOf = async () => new Map((await getAvailableMixCatalog()).map((mix) => [mix.id, mix]));

export const setAnalogs = async (actor: ShelfActor, tobaccoId: string, value: unknown) => {
  const analogs = parseAnalogs(tobaccoId, value);
  const item = await prisma.shelfItem.findUnique({ where: { tobaccoId }, include: { tobacco: { select: { manufacturer: true, name: true } } } });
  if (!item) throw new ShelfNotFoundError(`Табака ${tobaccoId} нет на полке`);
  if ((await prisma.tobacco.count({ where: { id: { in: analogs } } })) !== analogs.length) {
    throw new ShelfValidationError('analogs: такого табака нет в каталоге');
  }

  const before = await statusesOf();
  await prisma.$transaction(async (tx) => {
    const current = (await tx.tobaccoAnalog.findMany({ where: { tobaccoId }, orderBy: { sortOrder: 'asc' } })).map((link) => link.analogId);
    const removed = current.filter((id) => !analogs.includes(id));

    await tx.tobaccoAnalog.deleteMany({ where: { tobaccoId } });
    await tx.tobaccoAnalog.createMany({ data: analogs.map((analogId, sortOrder) => ({ tobaccoId, analogId, sortOrder })) });
    await tx.tobaccoAnalog.deleteMany({ where: { tobaccoId: { in: removed }, analogId: tobaccoId } });

    for (const analogId of analogs.filter((id) => !current.includes(id))) {
      const back = await tx.tobaccoAnalog.findMany({ where: { tobaccoId: analogId }, select: { analogId: true, sortOrder: true } });
      if (back.some((link) => link.analogId === tobaccoId)) continue;
      const sortOrder = back.reduce((max, link) => Math.max(max, link.sortOrder + 1), 0);
      await tx.tobaccoAnalog.create({ data: { tobaccoId: analogId, analogId: tobaccoId, sortOrder } });
    }

    await tx.auditEvent.create({
      data: {
        actorLogin: actor.login,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'update',
        entityType: 'shelf',
        entityId: tobaccoId,
        entityLabel: `${item.tobacco.manufacturer} · ${item.tobacco.name}`,
        details: JSON.stringify({ analogs: { before: current, after: analogs } }),
      },
    });
  });
  const after = await statusesOf();

  // Для тоста: миксы, которые из «блокирован» стали «с заменой».
  return [...after.values()]
    .filter((mix) => mix.status === 'substituted' && before.get(mix.id)?.status === 'blocked')
    .map((mix) => ({ id: mix.id, name: mix.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
};
