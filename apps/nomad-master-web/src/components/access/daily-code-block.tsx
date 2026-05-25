import type {
  DailyAccessCodeRecord,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
} from '@/contracts';
import { formatTelegramAutomationHealth } from '@/contracts';
import { formatDateTimeDisplay } from './format-date-time';
import type { AccessLoadStatus, AccessRoleStatus } from './types';

type DailyCodeBlockProps = {
  currentDailyCode: DailyAccessCodeRecord | null;
  dailyCodes: DailyAccessCodeRecord[];
  dailyCodesStatus: AccessLoadStatus;
  dailyCodesError: string;
  telegramAutomationState: TelegramAutomationStateRecord | null;
  telegramAutomationStateStatus: AccessRoleStatus;
  telegramAutomationStateError: string;
  telegramOperators: TelegramOperatorRecord[];
  telegramOperatorsStatus: AccessRoleStatus;
  telegramOperatorsError: string;
  activeOperatorsCount: number;
  linkedOperatorsCount: number;
};

export const DailyCodeBlock = ({
  currentDailyCode,
  dailyCodes,
  dailyCodesStatus,
  dailyCodesError,
  telegramAutomationState,
  telegramAutomationStateStatus,
  telegramAutomationStateError,
  telegramOperators,
  telegramOperatorsStatus,
  telegramOperatorsError,
  activeOperatorsCount,
  linkedOperatorsCount,
}: DailyCodeBlockProps) => (
  <>
    <div className="summary-grid summary-grid--nested">
      <article className="metric-card automation-card ops-surface__card">
        <p className="metric-label">Текущий daily code</p>
        <p className="metric-value metric-value--compact">{currentDailyCode?.codeValue || 'Нет активного кода'}</p>
        <p className="meta-line">Подпись: {currentDailyCode?.codeLabel || 'Не задано'}</p>
        <p className="meta-line">Начало: {formatDateTimeDisplay(currentDailyCode?.startsAt || '')}</p>
        <p className="meta-line">Окончание: {formatDateTimeDisplay(currentDailyCode?.endsAt || '')}</p>
        <p className="meta-line">История окон: {dailyCodes.length}</p>
        {dailyCodesStatus === 'loading' ? <p className="meta-line">Загружаем daily code...</p> : null}
        {dailyCodesError ? <p className="error-text">{dailyCodesError}</p> : null}
      </article>

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
