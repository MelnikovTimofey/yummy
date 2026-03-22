import 'dotenv/config';

const backendUrl = process.env.NOMAD_BACKEND_URL ?? 'http://localhost:3021';
const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);

const message = hasToken
  ? `Nomad Telegram Bot scaffold. Backend: ${backendUrl}`
  : `Nomad Telegram Bot scaffold without TELEGRAM_BOT_TOKEN. Backend: ${backendUrl}`;

console.log(message);
