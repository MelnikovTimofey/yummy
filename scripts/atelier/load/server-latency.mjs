#!/usr/bin/env node
// Серверное время ответа по эндпоинтам из JSON-логов Fastify (responseTime), без сети до генератора.
//   ssh atelier-prod 'cd /opt/atelier && docker compose -f docker-compose.prod.yml --env-file .env \
//     logs --no-log-prefix --since <начало UTC> --until <конец UTC> backend' | node server-latency.mjs
import { createInterface } from 'node:readline';

const urls = new Map();
const byRoute = new Map();

for await (const line of createInterface({ input: process.stdin })) {
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    continue;
  }

  if (entry.msg === 'incoming request') {
    urls.set(entry.reqId, `${entry.req.method} ${entry.req.url.split('?')[0]}`);
  } else if (entry.msg === 'request completed' && urls.has(entry.reqId)) {
    const route = urls.get(entry.reqId);
    urls.delete(entry.reqId);
    if (!route.includes(' /guest/')) {
      continue;
    }
    const stats = byRoute.get(route) ?? { times: [], errors: 0 };
    stats.times.push(entry.responseTime);
    stats.errors += entry.res.statusCode >= 500 ? 1 : 0;
    byRoute.set(route, stats);
  }
}

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
const ms = (value) => value.toFixed(0);

console.log('| Эндпоинт | Запросов | p50, мс | p95, мс | p99, мс | max, мс | 5xx |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for (const [route, { times, errors }] of [...byRoute].sort(([a], [b]) => a.localeCompare(b))) {
  const sorted = times.sort((a, b) => a - b);
  const cells = [0.5, 0.95, 0.99].map((q) => ms(quantile(sorted, q)));
  console.log(`| \`${route}\` | ${sorted.length} | ${cells.join(' | ')} | ${ms(sorted.at(-1))} | ${errors} |`);
}
