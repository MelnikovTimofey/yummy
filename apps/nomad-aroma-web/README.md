# Nomad Aroma Web

Гостевой mobile-first frontend для продукта `Арома Ателье`.

## Назначение

Этот пакет отвечает за клиентский сценарий гостя Nomad:

1. `18+` gate;
2. ввод daily code;
3. подтверждение доступа;
4. знакомство;
5. онбординг;
6. рекомендации, главная, каталог и карточка микса.

## Локальный запуск

```bash
cd apps/nomad-aroma-web
npm install
npm run dev
```

По умолчанию frontend слушает `5174`.

API задаётся через `VITE_API_BASE_URL`.

## Стадия

Текущая стадия: Phase 1 guest flow.
