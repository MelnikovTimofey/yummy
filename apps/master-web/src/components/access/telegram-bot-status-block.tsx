import type {
  DailyAccessCodeRecord,
  TelegramAutomationStateRecord,
} from '@/contracts';
import { formatTelegramAutomationHealth } from '@/contracts';
import type { AccessRoleStatus } from './types';
import { RowsSkeleton } from '@/components/ui/loading';

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

export const TelegramBotStatusBlock = ({
  telegramAutomationState,
  telegramAutomationStateStatus,
  telegramAutomationStateError,
  dailyCodes,
}: TelegramBotStatusBlockProps) => {
  const heartbeatIso = telegramAutomationState?.lastHeartbeatAt ?? '';
  const badge = healthBadgeClass(telegramAutomationState?.health, heartbeatIso);

  const history = dailyCodes.slice(0, 5);

  return (
    <section className="bot-status" aria-label="Статус Telegram-бота">
      <header className="bot-status__head">
        <div className="bot-status__title">
          <p className="bot-status__name">Telegram-бот</p>
          <p className="bot-status__heartbeat">
            {heartbeatIso
              ? `На связи ${relativeFromNow(heartbeatIso)}, в ${formatTimeOnly(heartbeatIso)}`
              : 'Ещё не выходил на связь'}
          </p>
        </div>
        <span className={badge.className}>{badge.label}</span>
      </header>

      {telegramAutomationStateStatus === 'loading' && !telegramAutomationState ? (
        <RowsSkeleton label="Загружаем статус бота" rows={2} />
      ) : null}
      {telegramAutomationStateStatus === 'error' ? (
        <p className="error-text bot-status__notice">{telegramAutomationStateError}</p>
      ) : null}
      {telegramAutomationStateStatus === 'forbidden' ? (
        <p className="meta-line bot-status__notice">{telegramAutomationStateError}</p>
      ) : null}

      <article className="bot-status__history">
        <div className="bot-status__history__head">
          <p className="bot-status__history-title">Последние коды</p>
        </div>
        {history.length === 0 ? (
          <p className="meta-line">История пуста</p>
        ) : (
          <ul className="bot-status__history__list">
            {history.map((item) => (
              <li className="bot-status__history__row" key={item.id}>
                <span className="mono bot-status__history__code">{item.codeValue}</span>
                <span className="bot-status__history__day">{formatDayShort(item.startsAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
};
