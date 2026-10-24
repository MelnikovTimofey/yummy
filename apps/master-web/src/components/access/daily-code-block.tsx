import { useState } from 'react';
import type {
  CurrentDailyCode,
  DailyAccessCodeRecord,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
} from '@/contracts';
import { useCountdown, useTimeProgress } from '@/hooks/use-countdown';
import type { DailyCodeRotateStatus } from '@/hooks/use-daily-code';
import { formatCodeDay } from './format-date-time';
import { TelegramBotStatusBlock } from './telegram-bot-status-block';
import type { AccessLoadStatus, AccessRoleStatus } from './types';
import { BusyLabel, SmokeLoading } from '@/components/ui/loading';

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
          <p className="daily-code-hero__title">Код смены</p>
          <span
            className={
              statusActive
                ? 'daily-code-hero__status'
                : 'daily-code-hero__status daily-code-hero__status--inactive'
            }
          >
            <span className="status-pill__dot daily-code-hero__status-dot" aria-hidden="true" />
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
            aria-busy={isRotating || undefined}
          >
            <BusyLabel busy={isRotating}>Выпустить новый код</BusyLabel>
          </button>
        </div>

        {currentDailyCode.state === 'expired' ? (
          <p className="daily-code-progress__expires">
            Код {currentDailyCode.code.codeValue} действовал {formatCodeDay(currentDailyCode.code.endsAt)}.
          </p>
        ) : null}

        {activeCode ? (
          <div className="daily-code-progress" aria-live="polite">
            <div className="daily-code-progress__labels">
              <span className="daily-code-progress__expires">
                До конца {formatCodeDay(activeCode.endsAt)}
              </span>
              <span className="daily-code-progress__remaining">
                {countdown.expired ? countdown.remaining : `Осталось ${countdown.remaining}`}
              </span>
            </div>
            <div className="daily-code-progress__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <div className={progressClass(countdown.urgency)} style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <p className="daily-code-rotation">
          Код меняется каждый день в полночь по московскому времени, операторы получают его в боте командой /code.
        </p>

        {dailyCodesStatus === 'loading' ? <SmokeLoading label="Загружаем код смены" /> : null}
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
