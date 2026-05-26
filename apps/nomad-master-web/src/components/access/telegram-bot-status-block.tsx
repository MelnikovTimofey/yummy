import type {
  DailyAccessCodeRecord,
  TelegramAutomationStateRecord,
} from '@/contracts';
import { formatTelegramAutomationHealth } from '@/contracts';
import { formatDateTimeDisplay } from './format-date-time';
import type { AccessRoleStatus } from './types';

type TelegramBotStatusBlockProps = {
  telegramAutomationState: TelegramAutomationStateRecord | null;
  telegramAutomationStateStatus: AccessRoleStatus;
  telegramAutomationStateError: string;
  dailyCodes: DailyAccessCodeRecord[];
};

const HEARTBEAT_FRESH_MS = 5 * 60 * 1000;

const relativeFromNow = (iso: string): string => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diffMs = Date.now() - t;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} д назад`;
};

const formatTimeOnly = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatDayShort = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const healthBadgeClass = (
  health: TelegramAutomationStateRecord['health'] | undefined,
  heartbeatIso: string | undefined,
): { className: string; label: string } => {
  if (health === 'healthy') {
    const t = heartbeatIso ? new Date(heartbeatIso).getTime() : NaN;
    const stale = !Number.isNaN(t) && Date.now() - t > HEARTBEAT_FRESH_MS;
    if (stale) {
      return { className: 'bot-status__badge bot-status__badge--warn', label: 'устаревает' };
    }
    return { className: 'bot-status__badge bot-status__badge--ok', label: 'норма' };
  }
  if (health === 'stale') return { className: 'bot-status__badge bot-status__badge--warn', label: 'устаревает' };
  if (health === 'error') return { className: 'bot-status__badge bot-status__badge--err', label: 'ошибка' };
  return { className: 'bot-status__badge bot-status__badge--unknown', label: formatTelegramAutomationHealth(health ?? 'unknown') };
};

const initialOf = (name: string): string => {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
};

export const TelegramBotStatusBlock = ({
  telegramAutomationState,
  telegramAutomationStateStatus,
  telegramAutomationStateError,
  dailyCodes,
}: TelegramBotStatusBlockProps) => {
  const heartbeatIso = telegramAutomationState?.lastHeartbeatAt ?? '';
  const badge = healthBadgeClass(telegramAutomationState?.health, heartbeatIso);

  const lastRequestOperator = telegramAutomationState?.lastRequestOperatorName ?? '';
  const lastRequestAt = telegramAutomationState?.lastRequestAt ?? '';
  const lastRequestChat = telegramAutomationState?.lastRequestChatId ?? '';

  const history = dailyCodes.slice(0, 5);

  return (
    <section className="bot-status" aria-label="Статус Telegram-бота">
      <header className="bot-status__head">
        <span className="bot-status__shield" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 4.5 3.4 8.5 8 9 4.6-.5 8-4.5 8-9V6l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <div className="bot-status__title">
          <p className="bot-status__name">Telegram-бот</p>
          <p className="bot-status__heartbeat">
            Heartbeat {formatTimeOnly(heartbeatIso)} · {relativeFromNow(heartbeatIso)}
          </p>
        </div>
        <span className={badge.className}>{badge.label}</span>
      </header>

      {telegramAutomationStateStatus === 'loading' ? (
        <p className="meta-line bot-status__notice">Загружаем статус бота…</p>
      ) : null}
      {telegramAutomationStateStatus === 'error' ? (
        <p className="error-text bot-status__notice">{telegramAutomationStateError}</p>
      ) : null}
      {telegramAutomationStateStatus === 'forbidden' ? (
        <p className="meta-line bot-status__notice">{telegramAutomationStateError}</p>
      ) : null}

      <article className="bot-status__last-request">
        <p className="eyebrow">Последний запрос кода</p>
        {lastRequestOperator || lastRequestAt ? (
          <div className="bot-status__last-request__row">
            <span className="bot-status__avatar" aria-hidden="true">{initialOf(lastRequestOperator || '—')}</span>
            <div className="bot-status__last-request__body">
              <p className="bot-status__last-request__name">{lastRequestOperator || 'Оператор не указан'}</p>
              <p className="bot-status__last-request__meta mono">
                {lastRequestChat ? `${lastRequestChat} · ` : ''}{formatTimeOnly(lastRequestAt)}
              </p>
            </div>
            <span className="bot-status__tag bot-status__tag--info mono">/code</span>
          </div>
        ) : (
          <p className="meta-line">Запросов ещё не было</p>
        )}
      </article>

      <article className="bot-status__history">
        <div className="bot-status__history__head">
          <p className="eyebrow">История окон</p>
          <span className="mono bot-status__history__counter">{history.length} последних</span>
        </div>
        {history.length === 0 ? (
          <p className="meta-line">История пуста</p>
        ) : (
          <ul className="bot-status__history__list">
            {history.map((item) => (
              <li className="bot-status__history__row" key={item.id}>
                <span className="mono bot-status__history__code">{item.codeValue}</span>
                <span className="bot-status__history__day">{formatDayShort(item.startsAt)}</span>
                <span className="mono bot-status__history__count">
                  — <span className="bot-status__history__count-label">подтв.</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
};
