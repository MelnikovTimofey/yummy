import { useState } from 'react';
import type {
  DailyAccessCodeRecord,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
} from '@/contracts';
import { formatTelegramAutomationHealth } from '@/contracts';
import { useCountdown } from '@/hooks/use-countdown';
import type { DailyCodeRotateStatus } from '@/hooks/use-daily-code';
import { formatDateTimeDisplay } from './format-date-time';
import type { AccessLoadStatus, AccessRoleStatus } from './types';

type DailyCodeBlockProps = {
  currentDailyCode: DailyAccessCodeRecord | null;
  dailyCodes: DailyAccessCodeRecord[];
  dailyCodesStatus: AccessLoadStatus;
  dailyCodesError: string;
  rotateStatus: DailyCodeRotateStatus;
  rotateError: string;
  onRotate: () => void | Promise<void>;
  telegramAutomationState: TelegramAutomationStateRecord | null;
  telegramAutomationStateStatus: AccessRoleStatus;
  telegramAutomationStateError: string;
  telegramOperators: TelegramOperatorRecord[];
  telegramOperatorsStatus: AccessRoleStatus;
  telegramOperatorsError: string;
  activeOperatorsCount: number;
  linkedOperatorsCount: number;
};

const countdownClass = (urgency: 'fresh' | 'soon' | 'expired') => {
  if (urgency === 'expired') return 'daily-code-hero__countdown daily-code-hero__countdown--expired';
  if (urgency === 'soon') return 'daily-code-hero__countdown daily-code-hero__countdown--soon';
  return 'daily-code-hero__countdown';
};

export const DailyCodeBlock = ({
  currentDailyCode,
  dailyCodes,
  dailyCodesStatus,
  dailyCodesError,
  rotateStatus,
  rotateError,
  onRotate,
  telegramAutomationState,
  telegramAutomationStateStatus,
  telegramAutomationStateError,
  telegramOperators,
  telegramOperatorsStatus,
  telegramOperatorsError,
  activeOperatorsCount,
  linkedOperatorsCount,
}: DailyCodeBlockProps) => {
  const countdown = useCountdown(currentDailyCode?.endsAt ?? '');
  const [copied, setCopied] = useState(false);

  const code = currentDailyCode?.codeValue ?? '';

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore — copy fallback is the visible code itself
    }
  };

  const statusActive = currentDailyCode?.active ?? false;
  const isRotating = rotateStatus === 'rotating';

  return (
    <>
      <article className="daily-code-hero" aria-label="Текущий daily code">
        <div className="daily-code-hero__head">
          <p className="daily-code-hero__eyebrow">Текущий daily code</p>
          <span
            className={
              statusActive
                ? 'daily-code-hero__status'
                : 'daily-code-hero__status daily-code-hero__status--inactive'
            }
          >
            <span className="daily-code-hero__status-dot" />
            {statusActive ? 'Активен' : 'Нет активного кода'}
          </span>
        </div>

        <p
          className={
            code
              ? 'daily-code-hero__code'
              : 'daily-code-hero__code daily-code-hero__code--empty'
          }
        >
          {code || 'Нет активного кода'}
        </p>

        {currentDailyCode?.codeLabel ? (
          <p className="daily-code-hero__label">Подпись: {currentDailyCode.codeLabel}</p>
        ) : null}

        {currentDailyCode?.endsAt ? (
          <p className={countdownClass(countdown.urgency)} aria-live="polite">
            {countdown.expired
              ? 'Истёк'
              : countdown.urgency === 'soon'
                ? `Скоро истечёт — ~${countdown.remaining} осталось`
                : `~${countdown.remaining} осталось`}
          </p>
        ) : null}

        <div className="daily-code-hero__meta">
          {currentDailyCode?.startsAt ? (
            <span>Начало: {formatDateTimeDisplay(currentDailyCode.startsAt)}</span>
          ) : null}
          {currentDailyCode?.endsAt ? (
            <span>Окончание: {formatDateTimeDisplay(currentDailyCode.endsAt)}</span>
          ) : null}
          <span>История окон: {dailyCodes.length}</span>
        </div>

        <div className="daily-code-hero__actions">
          <button
            type="button"
            className="secondary-button secondary-button--inline"
            onClick={handleCopy}
            disabled={!code}
          >
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>
          <button
            type="button"
            className="primary-button primary-button--inline"
            onClick={() => {
              void onRotate();
            }}
            disabled={isRotating}
          >
            {isRotating ? 'Генерируем…' : 'Сгенерировать новый'}
          </button>
          <button
            type="button"
            className="secondary-button secondary-button--inline"
            disabled
            title="Бэк пока не поддерживает автоповорот daily code"
          >
            Автоповорот
          </button>
        </div>

        {dailyCodesStatus === 'loading' ? <p className="meta-line daily-code-hero__error">Загружаем daily code…</p> : null}
        {dailyCodesError ? <p className="error-text daily-code-hero__error">{dailyCodesError}</p> : null}
        {rotateError ? <p className="error-text daily-code-hero__error">{rotateError}</p> : null}
      </article>

      <div className="summary-grid summary-grid--nested">
        <article className="metric-card automation-card ops-surface__card">
          <p className="metric-label">Состояние бота</p>
          <p className="metric-value metric-value--compact">
            {formatTelegramAutomationHealth(telegramAutomationState?.health ?? 'unknown')}
          </p>
          <div className="chip-row">
            <span
              className={
                telegramAutomationState?.health === 'healthy'
                  ? 'stock-pill stock-pill--in'
                  : telegramAutomationState?.health === 'unknown'
                    ? 'status-chip'
                    : 'stock-pill stock-pill--out'
              }
            >
              {telegramAutomationState?.health ?? 'unknown'}
            </span>
          </div>
          <p className="meta-line">Heartbeat: {formatDateTimeDisplay(telegramAutomationState?.lastHeartbeatAt ?? '')}</p>
          <p className="meta-line">Последнее обновление: {formatDateTimeDisplay(telegramAutomationState?.updatedAt ?? '')}</p>
          <p className="meta-line">Последняя ошибка: {telegramAutomationState?.lastErrorMessage || 'нет'}</p>
          {telegramAutomationStateStatus === 'loading' ? <p className="meta-line">Загружаем статус бота...</p> : null}
          {telegramAutomationStateStatus === 'error' ? <p className="error-text">{telegramAutomationStateError}</p> : null}
          {telegramAutomationStateStatus === 'forbidden' ? <p className="meta-line">{telegramAutomationStateError}</p> : null}
        </article>

        <article className="metric-card automation-card ops-surface__card">
          <p className="metric-label">Последний запрос кода</p>
          <p className="meta-line">Время: {formatDateTimeDisplay(telegramAutomationState?.lastRequestAt ?? '')}</p>
          <p className="meta-line">Оператор: {telegramAutomationState?.lastRequestOperatorName || 'Не было запросов'}</p>
          <p className="meta-line">Телефон: {telegramAutomationState?.lastRequestPhone || 'Не указано'}</p>
          <p className="meta-line">Чат: {telegramAutomationState?.lastRequestChatId || 'Не указан'}</p>
          <p className="meta-line">Код: {telegramAutomationState?.lastRequestCodeValue || currentDailyCode?.codeValue || 'Не указан'}</p>
        </article>

        <article className="metric-card automation-card ops-surface__card">
          <p className="metric-label">Allowlist</p>
          <p className="meta-line">Активных номеров: {activeOperatorsCount}</p>
          <p className="meta-line">Привязанных чатов: {linkedOperatorsCount}</p>
          <p className="meta-line">Ждут привязку: {Math.max(activeOperatorsCount - linkedOperatorsCount, 0)}</p>
          <p className="meta-line">Всего записей: {telegramOperators.length}</p>
          {telegramOperatorsStatus === 'loading' ? <p className="meta-line">Загружаем список...</p> : null}
          {telegramOperatorsStatus === 'error' ? <p className="error-text">{telegramOperatorsError}</p> : null}
          {telegramOperatorsStatus === 'forbidden' ? <p className="meta-line">{telegramOperatorsError}</p> : null}
        </article>
      </div>

      <article className="editor-card ops-editor">
        <div className="entity-card__head">
          <div>
            <p className="entity-kicker">Как это работает</p>
            <h3>Сценарий выдачи кода</h3>
          </div>
          <span className="status-chip">Автоматический daily code</span>
        </div>
        <div className="audit-list ops-flow-list">
          {[
            '1. Администратор добавляет оператора по имени и телефону.',
            '2. Оператор впервые пишет боту и жмёт "Поделиться контактом".',
            '3. Бот привязывает текущий chat id к номеру из списка.',
            '4. После привязки оператор получает актуальный daily code через /code.',
          ].map((item) => (
            <article className="entity-card entity-card--compact ops-surface__card" key={item}>
              <p className="meta-line">{item}</p>
            </article>
          ))}
        </div>
      </article>
    </>
  );
};
