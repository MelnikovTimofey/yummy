import { useState } from 'react';
import type {
  CurrentDailyCode,
  DailyAccessCodeRecord,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
} from '@/contracts';
import { useCountdown, useTimeProgress } from '@/hooks/use-countdown';
import type { DailyCodeRotateStatus } from '@/hooks/use-daily-code';
import { formatDateTimeDisplay } from './format-date-time';
import { TelegramBotStatusBlock } from './telegram-bot-status-block';
import type { AccessLoadStatus, AccessRoleStatus } from './types';

type DailyCodeBlockProps = {
  currentDailyCode: CurrentDailyCode;
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

const progressClass = (urgency: 'fresh' | 'soon' | 'expired') => {
  if (urgency === 'expired') return 'daily-code-progress__fill daily-code-progress__fill--expired';
  if (urgency === 'soon') return 'daily-code-progress__fill daily-code-progress__fill--soon';
  return 'daily-code-progress__fill';
};

const CopyIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

const ClockIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

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
}: DailyCodeBlockProps) => {
  const activeCode = currentDailyCode.state === 'active' ? currentDailyCode.code : null;
  const countdown = useCountdown(activeCode?.endsAt ?? '');
  const progress = useTimeProgress(activeCode?.startsAt ?? '', activeCode?.endsAt ?? '');
  const [copied, setCopied] = useState(false);

  const code = activeCode?.codeValue ?? '';
  const statusActive = currentDailyCode.state === 'active';
  const statusLabel =
    currentDailyCode.state === 'active'
      ? 'Действует'
      : currentDailyCode.state === 'expired'
        ? 'Истёк'
        : 'Нет кода';
  const isRotating = rotateStatus === 'rotating';

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // visible code is the fallback
    }
  };

  return (
    <article className="card daily-code-card" aria-label="Код смены и статус Telegram-бота">
      <div className="daily-code-card__left">
        <div className="daily-code-hero__head">
          <p className="eyebrow">Код смены</p>
          <span
            className={
              statusActive
                ? 'daily-code-hero__status'
                : 'daily-code-hero__status daily-code-hero__status--inactive'
            }
          >
            <span className="status-pill__dot daily-code-hero__status-dot" />
            <span>{statusLabel}</span>
          </span>
        </div>

        <p
          className={
            code
              ? 'mono daily-code-hero__code'
              : 'mono daily-code-hero__code daily-code-hero__code--empty'
          }
        >
          {code || 'Нет действующего кода'}
        </p>

        <div className="daily-code-hero__actions">
          <button
            type="button"
            className="btn"
            onClick={handleCopy}
            disabled={!code}
          >
            <CopyIcon />
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>
          <button
            type="button"
            className="btn"
            data-variant="ghost"
            onClick={() => {
              void onRotate();
            }}
            disabled={isRotating}
          >
            <RefreshIcon />
            {isRotating ? 'Выпускаем…' : 'Выпустить новый код'}
          </button>
        </div>

        {currentDailyCode.state === 'expired' ? (
          <p className="daily-code-progress__expires">
            Код {currentDailyCode.code.codeValue} истёк {formatDateTimeDisplay(currentDailyCode.code.endsAt)}.
          </p>
        ) : null}

        {activeCode ? (
          <div className="daily-code-progress" aria-live="polite">
            <div className="daily-code-progress__labels">
              <span className="daily-code-progress__expires">
                Истекает {formatDateTimeDisplay(activeCode.endsAt)}
              </span>
              <span className="mono daily-code-progress__remaining">
                {countdown.expired ? 'истёк' : `осталось ${countdown.remaining}`}
              </span>
            </div>
            <div className="daily-code-progress__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <div className={progressClass(countdown.urgency)} style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="daily-code-rotation">
          <span className="daily-code-rotation__icon" aria-hidden="true">
            <ClockIcon />
          </span>
          <div className="daily-code-rotation__text">
            <p className="daily-code-rotation__title">Новый код каждые сутки</p>
            <p className="daily-code-rotation__sub">Выпускает Telegram-бот в 00:00 МСК.</p>
          </div>
        </div>

        {dailyCodesStatus === 'loading' ? <p className="meta-line daily-code-hero__error">Загружаем код смены…</p> : null}
        {dailyCodesError ? <p className="error-text daily-code-hero__error">{dailyCodesError}</p> : null}
        {rotateError ? <p className="error-text daily-code-hero__error">{rotateError}</p> : null}
      </div>

      <div className="daily-code-card__right">
        <TelegramBotStatusBlock
          telegramAutomationState={telegramAutomationState}
          telegramAutomationStateStatus={telegramAutomationStateStatus}
          telegramAutomationStateError={telegramAutomationStateError}
          dailyCodes={dailyCodes}
        />
      </div>
    </article>
  );
};
