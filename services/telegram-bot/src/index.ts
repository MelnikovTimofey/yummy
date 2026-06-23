import { loadConfig } from './config';
import { NomadBackendClient } from './backend';
import { NomadTelegramBot } from './bot';
import { JsonStateStore } from './storage';
import { TelegramClient } from './telegram';

export const createBot = () => {
  const config = loadConfig();
  const backend = new NomadBackendClient(config);
  const telegram = new TelegramClient(config.telegramBotToken, config.telegramApiBaseUrl);
  const stateStore = new JsonStateStore(config.statePath);

  return new NomadTelegramBot({
    config,
    backend,
    telegram,
    stateStore,
  });
};

export const main = async () => {
  const bot = createBot();

  const shutdown = () => {
    bot.stop();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await bot.start();
};

if (require.main === module) {
  void main().catch((error) => {
    console.error('[nomad-telegram-bot] fatal error', error);
    process.exit(1);
  });
}
