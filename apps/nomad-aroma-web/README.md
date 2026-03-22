# Nomad Aroma Web

Гостевой mobile-first frontend для продукта `Арома Ателье`.

## Назначение

Этот пакет отвечает за клиентский сценарий гостя Nomad:

1. `18+` gate;
2. ввод daily code;
3. подтверждение доступа;
4. знакомство;
5. онбординг;
6. рекомендации, главная, каталог и карточка микса;
7. фиксация `Покурить` как события аналитики лаунжа.

## Локальный запуск

```bash
cd apps/nomad-aroma-web
npm install
npm run dev
```

По умолчанию frontend слушает `5174`.

API задаётся через `VITE_API_BASE_URL`.

## Стадия

Текущая стадия: Phase 2 onboarding + recommendations flow.
