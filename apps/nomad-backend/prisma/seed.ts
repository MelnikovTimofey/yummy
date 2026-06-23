import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { getNomadDailyCodeWindow } from '../src/daily-code';

process.env.DATABASE_URL ??= 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public';

const prisma = new PrismaClient();

const createSecretHash = (secret: string, salt: string) =>
  crypto.scryptSync(secret, salt, 64).toString('hex');

const introCards = [
  {
    id: 'intro-age-check',
    step: 1,
    title: 'Подтвердите возраст',
    description: 'Перед началом сценария гость подтверждает, что ему есть 18 лет.',
    bullets: ['Это быстрый gate до доступа к рекомендациям.', 'Дальше понадобится daily code от staff.'],
  },
  {
    id: 'intro-code-check',
    step: 2,
    title: 'Введите daily code',
    description: 'Код меняется каждый день и позволяет открыть гостевой сценарий без авторизации.',
    bullets: ['Код сообщает кальянный мастер или официант.', 'Код приходит staff через Telegram.'],
  },
  {
    id: 'intro-onboarding',
    step: 3,
    title: 'Выберите вкус',
    description: 'Быстрый онбординг помогает подобрать микс под профиль и вкусы гостя.',
    bullets: ['Можно выбрать несколько профилей.', 'Рекомендации учитывают наличие табаков.'],
  },
  {
    id: 'intro-mix-card',
    step: 4,
    title: 'Покажите микс мастеру',
    description: 'Карточка микса открывается после кнопки выбора и сразу готова для показа staff.',
    bullets: ['Гость видит состав микса и рейтинг.', 'Мастер получает понятную карточку без лишних шагов.'],
  },
] as const;

const staffAccounts = [
  {
    id: 'staff-admin',
    login: 'admin',
    password: 'admin',
    passwordSalt: 'seed:staff-admin',
    name: 'Admin',
    role: 'admin',
    active: true,
  },
  {
    id: 'staff-nomad',
    login: 'nomad',
    password: 'nomad',
    passwordSalt: 'seed:staff-nomad',
    name: 'Nomad Staff',
    role: 'master',
    active: true,
  },
] as const;

const dailyAccessCodes = [
  {
    id: 'daily-code-default',
    code: '1234',
    codeValue: '1234',
    codeSalt: 'seed:daily-code-default',
    codeLabel: 'Базовый daily code',
    active: true,
  },
] as const;

const telegramRecipients = [] as const;

const tobaccos = [
  {
    id: 'tobacco-citrus-breeze',
    manufacturer: 'Nomad Reserve',
    name: 'Citrus Breeze',
    description: 'Свежий цитрусовый профиль.',
    flavorProfiles: ['fresh', 'citrus'],
    flavors: ['лимон', 'грейпфрут', 'лайм'],
    flavorTags: ['fresh'],
    inStock: true,
  },
  {
    id: 'tobacco-berry-oasis',
    manufacturer: 'Nomad Reserve',
    name: 'Berry Oasis',
    description: 'Мягкая ягодная сладость.',
    flavorProfiles: ['berry', 'sweet'],
    flavors: ['малина', 'черника'],
    flavorTags: ['berry'],
    inStock: true,
  },
  {
    id: 'tobacco-desert-honey',
    manufacturer: 'Nomad Reserve',
    name: 'Desert Honey',
    description: 'Десертный акцент с мёдом и ванилью.',
    flavorProfiles: ['dessert', 'sweet'],
    flavors: ['мед', 'ваниль'],
    flavorTags: ['dessert'],
    inStock: true,
  },
  {
    id: 'tobacco-spice-route',
    manufacturer: 'Nomad Reserve',
    name: 'Spice Route',
    description: 'Пряный табачный профиль.',
    flavorProfiles: ['spicy', 'tobacco'],
    flavors: ['корица', 'кардамон'],
    flavorTags: ['spicy'],
    inStock: true,
  },
  {
    id: 'tobacco-mint-veil',
    manufacturer: 'Nomad Reserve',
    name: 'Mint Veil',
    description: 'Чистая мята и прохлада.',
    flavorProfiles: ['fresh'],
    flavors: ['мята'],
    flavorTags: ['minty'],
    inStock: true,
  },
  {
    id: 'tobacco-peach-silk',
    manufacturer: 'Nomad Reserve',
    name: 'Peach Silk',
    description: 'Сладкий персиковый профиль.',
    flavorProfiles: ['sweet'],
    flavors: ['персик'],
    flavorTags: ['fruity'],
    inStock: false,
  },
] as const;

const mixes = [
  {
    id: 'mix-citrus-scout',
    name: 'Цитрусовый караван',
    description: 'Свежий микс с ярким лимонно-мятным акцентом.',
    flavorProfiles: ['fresh', 'citrus'],
    flavors: ['лимон', 'мята'],
    flavorTags: ['fresh'],
    available: true,
    popularity: 92,
    baseAvgRating: 4.8,
  },
  {
    id: 'mix-berry-dawn',
    name: 'Ягодный рассвет',
    description: 'Мягкая ягодная сладость с холодным хвостом.',
    flavorProfiles: ['berry', 'sweet'],
    flavors: ['малина', 'черника'],
    flavorTags: ['berry'],
    available: true,
    popularity: 85,
    baseAvgRating: 4.7,
  },
  {
    id: 'mix-silk-road',
    name: 'Шёлковый путь',
    description: 'Десертный микс с мёдом и ванилью.',
    flavorProfiles: ['dessert', 'sweet'],
    flavors: ['мед', 'ваниль'],
    flavorTags: ['dessert'],
    available: true,
    popularity: 78,
    baseAvgRating: 4.6,
  },
  {
    id: 'mix-amber-bazaar',
    name: 'Янтарный базар',
    description: 'Пряно-табачный профиль с теплым послевкусием.',
    flavorProfiles: ['spicy', 'tobacco'],
    flavors: ['корица', 'кардамон'],
    flavorTags: ['spicy'],
    available: true,
    popularity: 74,
    baseAvgRating: 4.5,
  },
  {
    id: 'mix-peach-mirage',
    name: 'Персиковый мираж',
    description: 'Сладкий фруктовый микс, который сейчас недоступен по наличию.',
    flavorProfiles: ['sweet'],
    flavors: ['персик'],
    flavorTags: ['fruity'],
    available: true,
    popularity: 81,
    baseAvgRating: 4.4,
  },
] as const;

const mixComponents = [
  { mixId: 'mix-citrus-scout', tobaccoId: 'tobacco-citrus-breeze', proportion: 60, sortOrder: 0 },
  { mixId: 'mix-citrus-scout', tobaccoId: 'tobacco-mint-veil', proportion: 40, sortOrder: 1 },
  { mixId: 'mix-berry-dawn', tobaccoId: 'tobacco-berry-oasis', proportion: 65, sortOrder: 0 },
  { mixId: 'mix-berry-dawn', tobaccoId: 'tobacco-mint-veil', proportion: 35, sortOrder: 1 },
  { mixId: 'mix-silk-road', tobaccoId: 'tobacco-desert-honey', proportion: 60, sortOrder: 0 },
  { mixId: 'mix-silk-road', tobaccoId: 'tobacco-berry-oasis', proportion: 40, sortOrder: 1 },
  { mixId: 'mix-amber-bazaar', tobaccoId: 'tobacco-spice-route', proportion: 55, sortOrder: 0 },
  { mixId: 'mix-amber-bazaar', tobaccoId: 'tobacco-desert-honey', proportion: 45, sortOrder: 1 },
  { mixId: 'mix-peach-mirage', tobaccoId: 'tobacco-peach-silk', proportion: 70, sortOrder: 0 },
  { mixId: 'mix-peach-mirage', tobaccoId: 'tobacco-mint-veil', proportion: 30, sortOrder: 1 },
] as const;

const rails = [
  {
    id: 'rail-statistical-top',
    name: 'Статистический топ',
    description: 'Миксы, которые выбирают чаще всего и лучше оценивают гости.',
    type: 'statistical',
    active: true,
    isSystem: true,
  },
  {
    id: 'rail-prepared-fresh-line',
    name: 'Свежая линия',
    description: 'Цитрус, мята и лёгкая прохлада для быстрого выбора.',
    type: 'prepared',
    active: true,
    isSystem: false,
  },
  {
    id: 'rail-prepared-sweet-line',
    name: 'Сладкая линия',
    description: 'Десертные и мягкие сочетания для спокойного вечера.',
    type: 'prepared',
    active: true,
    isSystem: false,
  },
  {
    id: 'rail-curated-evening-choice',
    name: 'Вечерний выбор',
    description: 'Ручная подборка для позднего визита в Nomad.',
    type: 'curated',
    active: false,
    isSystem: false,
  },
] as const;

const railMixes = [
  { railId: 'rail-statistical-top', mixId: 'mix-citrus-scout', sortOrder: 0 },
  { railId: 'rail-statistical-top', mixId: 'mix-berry-dawn', sortOrder: 1 },
  { railId: 'rail-statistical-top', mixId: 'mix-silk-road', sortOrder: 2 },
  { railId: 'rail-prepared-fresh-line', mixId: 'mix-citrus-scout', sortOrder: 0 },
  { railId: 'rail-prepared-fresh-line', mixId: 'mix-berry-dawn', sortOrder: 1 },
  { railId: 'rail-prepared-sweet-line', mixId: 'mix-silk-road', sortOrder: 0 },
  { railId: 'rail-prepared-sweet-line', mixId: 'mix-peach-mirage', sortOrder: 1 },
  { railId: 'rail-curated-evening-choice', mixId: 'mix-amber-bazaar', sortOrder: 0 },
] as const;

async function main() {
  const currentCodeWindow = getNomadDailyCodeWindow();

  await prisma.smokeCtaEvent.deleteMany();
  await prisma.mixRating.deleteMany();
  await prisma.railMix.deleteMany();
  await prisma.mixComponent.deleteMany();
  await prisma.rail.deleteMany();
  await prisma.mix.deleteMany();
  await prisma.tobacco.deleteMany();
  await prisma.introCard.deleteMany();
  await prisma.dailyAccessCode.deleteMany();
  await prisma.telegramRecipient.deleteMany();
  await prisma.telegramOperator.deleteMany();
  await prisma.telegramAutomationState.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.staffAccount.deleteMany();

  await prisma.staffAccount.createMany({
    data: staffAccounts.map((account) => ({
      id: account.id,
      login: account.login,
      passwordHash: createSecretHash(account.password, account.passwordSalt),
      passwordSalt: account.passwordSalt,
      name: account.name,
      role: account.role,
      active: account.active,
    })),
    skipDuplicates: true,
  });

  await prisma.dailyAccessCode.createMany({
    data: dailyAccessCodes.map((code) => ({
      id: code.id,
      codeValue: code.code,
      codeHash: createSecretHash(code.code, code.codeSalt),
      codeSalt: code.codeSalt,
      codeLabel: code.codeLabel,
      active: code.active,
      startsAt: currentCodeWindow.startsAt,
      endsAt: currentCodeWindow.endsAt,
    })),
    skipDuplicates: true,
  });

  await prisma.telegramRecipient.createMany({
    data: telegramRecipients,
  });

  await prisma.telegramOperator.createMany({
    data: [
      {
        id: 'telegram-operator-anna',
        name: 'Анна',
        phone: '+79991234567',
        active: true,
        linkedChatId: null,
        linkedTelegramUserId: null,
        linkedUsername: null,
        linkedDisplayName: null,
        linkedAt: null,
        lastCodeRequestedAt: null,
      },
      {
        id: 'telegram-operator-ilya',
        name: 'Илья',
        phone: '+79997654321',
        active: true,
        linkedChatId: null,
        linkedTelegramUserId: null,
        linkedUsername: null,
        linkedDisplayName: null,
        linkedAt: null,
        lastCodeRequestedAt: null,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.introCard.createMany({
    data: introCards.map((card) => ({
      id: card.id,
      step: card.step,
      title: card.title,
      description: card.description,
      bullets: JSON.stringify(card.bullets),
    })),
    skipDuplicates: true,
  });

  await prisma.tobacco.createMany({
    data: tobaccos.map((tobacco) => ({
      id: tobacco.id,
      manufacturer: tobacco.manufacturer,
      name: tobacco.name,
      description: tobacco.description,
      flavorProfiles: JSON.stringify(tobacco.flavorProfiles),
      flavors: JSON.stringify(tobacco.flavors),
      flavorTags: JSON.stringify(tobacco.flavorTags),
      inStock: tobacco.inStock,
    })),
    skipDuplicates: true,
  });

  await prisma.mix.createMany({
    data: mixes.map((mix) => ({
      id: mix.id,
      name: mix.name,
      description: mix.description,
      flavorProfiles: JSON.stringify(mix.flavorProfiles),
      flavors: JSON.stringify(mix.flavors),
      flavorTags: JSON.stringify(mix.flavorTags),
      available: mix.available,
      popularity: mix.popularity,
      baseAvgRating: mix.baseAvgRating,
    })),
    skipDuplicates: true,
  });

  await prisma.mixComponent.createMany({
    data: mixComponents.map((component) => ({
      mixId: component.mixId,
      tobaccoId: component.tobaccoId,
      proportion: component.proportion,
      sortOrder: component.sortOrder,
    })),
    skipDuplicates: true,
  });

  await prisma.rail.createMany({
    data: rails.map((rail) => ({
      id: rail.id,
      name: rail.name,
      description: rail.description,
      type: rail.type,
      active: rail.active,
      isSystem: rail.isSystem,
    })),
    skipDuplicates: true,
  });

  await prisma.railMix.createMany({
    data: railMixes.map((railMix) => ({
      railId: railMix.railId,
      mixId: railMix.mixId,
      sortOrder: railMix.sortOrder,
    })),
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
