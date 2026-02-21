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
- экраны-заглушки для дальнейшей интеграции API.
