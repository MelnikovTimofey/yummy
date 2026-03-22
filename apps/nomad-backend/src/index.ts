import { buildApp } from './app';
import { config } from './config';

const app = buildApp();

app.listen({ host: config.host, port: config.port }).catch((error) => {
  app.log.error(error, 'Failed to start Nomad backend');
  process.exit(1);
});
