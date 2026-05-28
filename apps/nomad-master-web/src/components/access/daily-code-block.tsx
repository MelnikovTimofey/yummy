import { useState } from 'react';
import type {
  DailyAccessCodeRecord,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
} from '@/contracts';
import { useCountdown, useTimeProgress } from '@/hooks/use-countdown';
import type { DailyCodeRotateStatus } from '@/hooks/use-daily-code';
import { formatDateTimeDisplay } from './format-date-time';
import { TelegramBotStatusBlock } from './telegram-bot-status-block';
import type { AccessLoadStatus, AccessRoleStatus } from './types';

type RotationMode = 'auto' | 'manual';

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
  const countdown = useCountdown(currentDailyCode?.endsAt ?? '');
  const progress = useTimeProgress(
    currentDailyCode?.startsAt ?? '',
    currentDailyCode?.endsAt ?? '',
  );
  const [copied, setCopied] = useState(false);
  const [rotationMode, setRotationMode] = useState<RotationMode>('auto');

  const code = currentDailyCode?.codeValue ?? '';
  const statusActive = currentDailyCode?.active ?? false;
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
    <article className="daily-code-card" aria-label="Daily code и статус Telegram-бота">
      <div className="daily-code-card__left">
        <div className="daily-code-hero__head">
          <p className="eyebrow daily-code-hero__eyebrow mono">Текущий daily code</p>
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
            {isRotating ? 'Генерируем…' : 'Ротировать сейчас'}
          </button>
          <span className="daily-code-hero__spacer" />
          <kbd className="daily-code-hero__kbd" aria-hidden="true">⌘C</kbd>
        </div>

        {currentDailyCode?.endsAt ? (
          <div className="daily-code-progress" aria-live="polite">
            <div className="daily-code-progress__labels">
              <span className="daily-code-progress__expires">
                Истекает {formatDateTimeDisplay(currentDailyCode.endsAt)}
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
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </span>
          <div className="daily-code-rotation__text">
            <p className="daily-code-rotation__title">
              {rotationMode === 'auto' ? 'Автоматическая ротация' : 'Ручная ротация'}
            </p>
            <p className="daily-code-rotation__sub">
              {rotationMode === 'auto' ? 'Каждый день в 00:00' : 'Без расписания — только вручную'}
            </p>
          </div>
          <div className="daily-code-rotation__chips" role="tablist" aria-label="Режим ротации">
            <button
              type="button"
              className={
                rotationMode === 'auto'
                  ? 'rotation-chip rotation-chip--active'
                  : 'rotation-chip'
              }
              onClick={() => setRotationMode('auto')}
              aria-pressed={rotationMode === 'auto'}
            >
              Авто
            </button>
            <button
              type="button"
              className={
                rotationMode === 'manual'
                  ? 'rotation-chip rotation-chip--active'
                  : 'rotation-chip'
              }
              onClick={() => setRotationMode('manual')}
              aria-pressed={rotationMode === 'manual'}
            >
              Вручную
            </button>
          </div>
        </div>

        {dailyCodesStatus === 'loading' ? <p className="meta-line daily-code-hero__error">Загружаем daily code…</p> : null}
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
