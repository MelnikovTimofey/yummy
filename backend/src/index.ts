import { buildApp } from './app';
import { config } from './config';

const app = buildApp();

app
  .listen({ port: config.port, host: '0.0.0.0' })
  .catch((error) => {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  });
