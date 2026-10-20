import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestError, guestErrorText } from './request-error';

// Гость не видит служебный `error` backend (#267): текст выбирает клиент по статусу.
test('guestErrorText берёт текст по статусу ответа', () => {
  const text = guestErrorText(new RequestError(401), { 401: 'Код не подошёл. Уточните его у мастера зала.' });

  assert.equal(text, 'Код не подошёл. Уточните его у мастера зала.');
});

test('guestErrorText без своего текста для статуса даёт общий русский фолбэк', () => {
  assert.equal(guestErrorText(new RequestError(500)), 'Не получилось. Попробуйте ещё раз.');
  assert.equal(guestErrorText(new Error('Mix not found')), 'Не получилось. Попробуйте ещё раз.');
});

test('guestErrorText сохраняет текст про связь, когда ответа нет', () => {
  const offline = new RequestError(0, 'Нет связи с Ателье. Попробуйте ещё раз.');

  assert.equal(guestErrorText(offline, { 404: 'другое' }), 'Нет связи с Ателье. Попробуйте ещё раз.');
});
