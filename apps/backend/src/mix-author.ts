import { prisma } from './db';

// Автор микса (#491): сотрудник, который завёл микс. Только для персонала: гостевые
// ответы отдают MixView как есть, поэтому автора в MixView нет — его подмешивают здесь.

export type MixAuthor = { id: string; name: string };

export const loadMixAuthors = async (ids?: string[]) =>
  new Map(
    (
      await prisma.mix.findMany({
        ...(ids ? { where: { id: { in: ids } } } : {}),
        select: { id: true, author: { select: { id: true, name: true } } },
      })
    ).map((mix) => [mix.id, mix.author]),
  );

export const withAuthor = async <T extends { id: string }>(mix: T) => ({
  ...mix,
  author: (await loadMixAuthors([mix.id])).get(mix.id) ?? null,
});

export const authorIdOf = async (login: string) =>
  (await prisma.staffAccount.findUnique({ where: { login }, select: { id: true } }))?.id ?? null;
