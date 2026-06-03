import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
  // vite preview блокирует чужой Host (allowedHosts). В проде фронт за Caddy,
  // который шлёт Host прод-домена — разрешаем его через NOMAD_ALLOWED_HOSTS
  // (читается при старте preview). Fallback true — для локального запуска.
  preview: {
    host: '0.0.0.0',
    allowedHosts: process.env.NOMAD_ALLOWED_HOSTS
      ? process.env.NOMAD_ALLOWED_HOSTS.split(',')
      : true,
  },
});
