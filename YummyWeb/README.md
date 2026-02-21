# YummyWeb (MVP mobile web)

Mobile-first web клиент для MVP с app-like интерфейсом.

## Запуск

```bash
cd YummyWeb
npm install
npm run dev
```

По умолчанию API: `http://localhost:3001`.

Чтобы переопределить:

```bash
echo "VITE_API_BASE_URL=http://<ваш-host>:3001" > .env.local
```

## Что реализовано в этом этапе

- каркас мобильного web-приложения;
- нижняя таб-навигация в порядке из PRD;
- safe-area адаптация (`env(safe-area-inset-*)`);
- базовый auth flow (magic link + ввод token);
- рабочий экран `Миксы` с загрузкой данных и оценок из backend API.

## Как войти

1. На экране авторизации введите e-mail и нажмите `Отправить magic link`.
2. Откройте Mailpit (`http://localhost:8025`), скопируйте `token` из ссылки.
3. Вставьте token в поле `Token из письма` и нажмите `Войти`.
