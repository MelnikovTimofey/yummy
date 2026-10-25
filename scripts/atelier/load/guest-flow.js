// Нагрузочный прогон гостевого потока Арома Ателье (#154). Запуск и параметры — README.md рядом.
import http from 'k6/http';
import exec from 'k6/execution';
import { sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3021').replace(/\/$/, '');
const CODE = __ENV.ATELIER_CODE;
const SESSIONS = Number(__ENV.SESSIONS || 240);
const DURATION_MIN = Number(__ENV.DURATION_MIN || 15);
const BURST_SESSIONS = Number(__ENV.BURST_SESSIONS || 40);
const BURST_AT_MIN = Number(__ENV.BURST_AT_MIN || 7);
const MIXER_SHARE = Number(__ENV.MIXER_SHARE || 0.5);
// Доля сессий со входом в кабинет (#239): бота подменяет вызов confirm с ключом автоматизации.
const LOGIN_SHARE = Number(__ENV.LOGIN_SHARE || 0);
// Пул учёток: вернувшийся гость копит историю, и «Для вас» выходит из холодного режима (MIN_FOR_YOU_PICKS = 3).
const LOGIN_GUESTS = Number(__ENV.LOGIN_GUESTS || 30);
const AUTOMATION_KEY = __ENV.ATELIER_AUTOMATION_KEY;
const THINK_MAX_S = Number(__ENV.THINK_MAX_S || 5);
const OUT_DIR = (__ENV.OUT_DIR || '.').replace(/\/$/, '');

// По этому имени остатки прогона находятся в CustomMixSmokeEvent, если cleanup что-то пропустил.
const MIX_NAME = 'k6 #154';
// Гостевой клиент обрывает запрос через 8 с (requestTimeoutMs в aroma-web).
const GUEST_TIMEOUT_MS = 8000;

if (!CODE) {
  throw new Error('Нужен код дня: ATELIER_CODE=<код> k6 run ...');
}
if (LOGIN_SHARE > 0 && !AUTOMATION_KEY) {
  throw new Error('Для LOGIN_SHARE нужен ATELIER_AUTOMATION_KEY');
}

// Учётки прогона узнаются по префиксу Telegram id — их удаляет cleanup.mjs.
const LOAD_TELEGRAM_PREFIX = '999000';

const ENDPOINTS = [
  'POST /guest/access-code/verify',
  'GET /guest/intro/cards',
  'GET /guest/onboarding/options',
  'GET /guest/catalog/mixes',
  'GET /guest/home/rails',
  'POST /guest/onboarding/recommendations',
  'PUT /guest/me/onboarding',
  'GET /guest/me/for-you',
  'POST /guest/events/smoke-cta',
  'GET /guest/mixer/palette',
  'POST /guest/mixer/evaluate',
  'POST /guest/events/custom-mix-smoke',
  'POST /guest/auth/telegram/start',
  'POST /guest/auth/telegram/status',
  'GET /guest/me',
  'GET /guest/me/favorites',
  'GET /guest/me/history',
  'PUT /guest/me/favorites/mixes',
];

const serverErrors = new Rate('server_errors');
const guestTimeouts = new Rate('guest_timeouts');
const forYouPersonal = new Rate('for_you_personal');

const thresholds = { server_errors: ['rate==0'], guest_timeouts: ['rate==0'] };
// Порог по каждому эндпоинту нужен ещё и затем, чтобы k6 посчитал по нему p95/p99 в итогах.
for (const name of ENDPOINTS) {
  thresholds[`http_req_duration{name:${name}}`] = ['p(95)<1000'];
  thresholds[`server_errors{name:${name}}`] = ['rate==0'];
}

const arrivals = (rate, timeUnit, duration, extra = {}) => ({
  executor: 'constant-arrival-rate',
  rate,
  timeUnit,
  duration,
  preAllocatedVUs: 30,
  maxVUs: 300,
  gracefulStop: '2m',
  ...extra,
});

export const options = {
  scenarios: {
    steady: arrivals(SESSIONS, `${DURATION_MIN}m`, `${DURATION_MIN}m`),
    burst: arrivals(BURST_SESSIONS, '1m', '1m', { startTime: `${BURST_AT_MIN}m` }),
  },
  thresholds,
  summaryTrendStats: ['count', 'med', 'p(95)', 'p(99)', 'max'],
};

const JSON_HEADERS = { 'content-type': 'application/json' };

const track = (name, res) => {
  serverErrors.add(res.status === 0 || res.status >= 500, { name });
  guestTimeouts.add(res.status === 0 || res.timings.duration > GUEST_TIMEOUT_MS, { name });
  return res;
};

const request = (method, path, body, { token, name = `${method} ${path.split('?')[0]}` } = {}) => {
  const headers = body === undefined ? {} : { ...JSON_HEADERS };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const params = { headers, tags: { name } };
  return { method, url: `${BASE_URL}${path}`, body: body === undefined ? null : JSON.stringify(body), params, name };
};

const send = (method, path, body, opts) => {
  const req = request(method, path, body, opts);
  return track(req.name, http.request(req.method, req.url, req.body, req.params));
};

// Клиент после ввода кода грузит экраны параллельно (App.tsx: intro, options+catalog, rails, catalog).
const sendBatch = (reqs) => {
  const responses = http.batch(reqs.map(({ method, url, body, params }) => [method, url, body, params]));
  return responses.map((res, index) => track(reqs[index].name, res));
};

const readJson = (res, field) => {
  if (res.status < 200 || res.status >= 300) {
    return null;
  }
  try {
    return field ? res.json(field) : res.json();
  } catch {
    return null;
  }
};

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (items) => items[randInt(0, items.length - 1)];
const pickSome = (items, min, max) => {
  const pool = [...items];
  const count = Math.min(randInt(min, max), pool.length);
  const result = [];
  while (result.length < count) {
    result.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
  }
  return result;
};
const think = () => sleep(1 + Math.random() * Math.max(THINK_MAX_S - 1, 0));

// Доли кратны 5, не меньше 5, в сумме 100 — как требует parseBowlInput.
const randomShares = (count) => {
  const shares = Array(count).fill(1);
  for (let left = 20 - count; left > 0; left -= 1) {
    shares[randInt(0, count - 1)] += 1;
  }
  return shares.map((units) => units * 5);
};

const randomBowl = (tobaccos) => {
  const chosen = pickSome(tobaccos, 1, 3);
  const shares = randomShares(chosen.length);
  return chosen.map((tobacco, index) => ({ tobaccoId: tobacco.id, proportion: shares[index] }));
};

const randomSwipes = (tobaccos) =>
  Array.from({ length: randInt(5, 30) }, () => ({
    turn: randInt(0, 2),
    tobaccoId: pick(tobaccos).id,
    direction: Math.random() < 0.5 ? 'left' : 'right',
  }));

export function setup() {
  const res = http.post(`${BASE_URL}/guest/access-code/verify`, JSON.stringify({ code: CODE }), {
    headers: JSON_HEADERS,
    tags: { name: 'setup' },
  });
  if (res.status !== 200) {
    exec.test.abort(`Код дня не принят: ${res.status} ${res.body}`);
  }
}

// Вход через бота: старт, подтверждение «ботом», 1–3 опроса статуса, /guest/me.
const login = () => {
  think();
  const started = readJson(send('POST', '/guest/auth/telegram/start', { consent: true }));
  if (!started) {
    return null;
  }
  const telegramId = `${LOAD_TELEGRAM_PREFIX}${100000 + randInt(1, LOGIN_GUESTS)}`;
  for (let poll = randInt(0, 2); poll > 0; poll -= 1) {
    send('POST', '/guest/auth/telegram/status', { code: started.code, secret: started.pollSecret });
    sleep(2);
  }
  http.post(`${BASE_URL}/automation/guest-login/confirm`, JSON.stringify({ code: started.code, telegramId }), {
    headers: { ...JSON_HEADERS, 'x-atelier-automation-key': AUTOMATION_KEY },
    tags: { name: 'bot confirm' },
  });
  const token = readJson(send('POST', '/guest/auth/telegram/status', { code: started.code, secret: started.pollSecret }), 'token');
  if (!token) {
    return null;
  }
  send('GET', '/guest/me', undefined, { token });
  // Избранное — один раз за визит, из него сердечко на карточках (App.tsx).
  send('GET', '/guest/me/favorites', undefined, { token });
  return token;
};

// Холодный режим отдаёт items, как подбор онбординга; личный — карточки трёх слотов.
const forYouMixes = (forYou) => {
  if (!forYou) {
    return [];
  }
  forYouPersonal.add(forYou.mode !== 'cold');
  if (forYou.mode === 'cold') {
    return forYou.items || [];
  }
  return [...forYou.fresh, ...forYou.sidestep, ...forYou.again].map((card) => card.mix);
};

export default function () {
  const access = send('POST', '/guest/access-code/verify', { code: CODE });
  if (access.status !== 200) {
    return;
  }

  const [, options, catalog] = sendBatch([
    request('GET', '/guest/intro/cards'),
    request('GET', '/guest/onboarding/options'),
    request('GET', '/guest/catalog/mixes'),
    request('GET', '/guest/home/rails'),
    request('GET', '/guest/catalog/mixes'),
  ]);

  // Вход до подбора — как «Уже были у нас?» на знакомстве; дальше все запросы гостя с токеном.
  const token = Math.random() < LOGIN_SHARE ? login() : null;

  const profiles = readJson(options, 'profiles') || [];
  const flavors = readJson(options, 'flavors') || [];
  let recommended = [];
  if (profiles.length || flavors.length) {
    for (let attempt = randInt(1, 3); attempt > 0; attempt -= 1) {
      think();
      const likedProfiles = pickSome(profiles, 1, 3);
      const likedFlavors = pickSome(flavors, likedProfiles.length ? 0 : 1, 2);
      const taste = { likedProfiles, likedFlavors };
      if (token) {
        // У вошедшего вкусы уходят в кабинет, а Подбор — это «Для вас» (submitPlan в aroma-web).
        send('PUT', '/guest/me/onboarding', taste, { token });
        recommended = forYouMixes(readJson(send('GET', '/guest/me/for-you', undefined, { token })));
      } else {
        recommended = readJson(send('POST', '/guest/onboarding/recommendations', taste), 'items') || [];
      }
    }
  }

  const mixes = recommended.length ? recommended.slice(0, 3) : readJson(catalog, 'items') || [];
  if (mixes.length) {
    think();
    const mix = pick(mixes);
    const event = readJson(send('POST', '/guest/events/smoke-cta', { mixId: mix.id }, { token }));
    if (event) {
      console.log(`created SmokeCtaEvent ${event.mixId} ${event.recordedAt}`);
    }
    if (token) {
      think();
      send('GET', '/guest/me/history', undefined, { token });
      send('PUT', `/guest/me/favorites/mixes/${mix.id}`, undefined, { token, name: 'PUT /guest/me/favorites/mixes' });
    }
  }

  if (Math.random() >= MIXER_SHARE) {
    return;
  }

  think();
  const tobaccos = readJson(send('GET', '/guest/mixer/palette'), 'tobaccos') || [];
  if (!tobaccos.length) {
    return;
  }

  let bowl = [];
  for (let attempt = randInt(1, 3); attempt > 0; attempt -= 1) {
    think();
    bowl = randomBowl(tobaccos);
    send('POST', '/guest/mixer/evaluate', { components: bowl });
  }

  think();
  const smoke = send(
    'POST',
    '/guest/events/custom-mix-smoke',
    { components: bowl, name: MIX_NAME, swipes: randomSwipes(tobaccos) },
    { token },
  );
  const event = readJson(smoke);
  if (event) {
    console.log(`created CustomMixSmokeEvent ${event.id}`);
  }
}

const ms = (value) => (value === undefined ? '—' : Math.round(value).toString());
const pct = (rate) => `${(100 * rate).toFixed(2)} %`;

export function handleSummary(data) {
  const metric = (name) => (data.metrics[name] ? data.metrics[name].values : {});
  const rows = ENDPOINTS.filter((name) => metric(`http_req_duration{name:${name}}`).count).map((name) => {
    const duration = metric(`http_req_duration{name:${name}}`);
    const cells = [duration.count, ms(duration.med), ms(duration['p(95)']), ms(duration['p(99)']), ms(duration.max)];
    return `| \`${name}\` | ${cells.join(' | ')} | ${metric(`server_errors{name:${name}}`).passes || 0} |`;
  });
  const requests = metric('http_reqs');
  const report = [
    `Сессий: ${metric('iterations').count || 0}, одновременно сессий до ${metric('vus').max || 0}`,
    `Запросов: ${requests.count || 0} (${(requests.rate || 0).toFixed(1)} в секунду в среднем)`,
    `5xx и обрывы: ${pct(metric('server_errors').rate || 0)}, дольше ${GUEST_TIMEOUT_MS / 1000} с: ${pct(metric('guest_timeouts').rate || 0)}`,
    `«Для вас» в личном режиме: ${pct(metric('for_you_personal').rate || 0)} из ${metric('for_you_personal').passes + metric('for_you_personal').fails || 0}`,
    '',
    '| Эндпоинт | Запросов | p50, мс | p95, мс | p99, мс | max, мс | 5xx |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows,
  ].join('\n');

  return { stdout: `${report}\n`, [`${OUT_DIR}/summary.json`]: JSON.stringify(data, null, 2) };
}
