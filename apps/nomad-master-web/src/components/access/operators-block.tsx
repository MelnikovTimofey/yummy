import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { TelegramOperatorRecord } from '@/contracts';
import { formatDateTimeDisplay } from './format-date-time';
import type { AccessRoleStatus, AccessSaveStatus, TelegramOperatorEditorState } from './types';

type OperatorsBlockProps = {
  telegramOperators: TelegramOperatorRecord[];
  telegramOperatorsStatus: AccessRoleStatus;
  telegramOperatorsError: string;
  telegramOperatorEditor: TelegramOperatorEditorState;
  telegramOperatorSaveStatus: AccessSaveStatus;
  telegramOperatorSaveError: string;
  telegramOperatorToggleId: string;
  telegramOperatorDialogOpen: boolean;
  setTelegramOperatorDialogOpen: (open: boolean) => void;
  setTelegramOperatorEditor: Dispatch<SetStateAction<TelegramOperatorEditorState>>;
  onSelectTelegramOperator: (operator: TelegramOperatorRecord) => void;
  onResetTelegramOperatorEditor: () => void;
  onSubmitTelegramOperator: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onToggleTelegramOperatorActive: (operator: TelegramOperatorRecord) => void | Promise<void>;
  onClearTelegramOperatorLink: (operator: TelegramOperatorRecord) => void | Promise<void>;
  onDeleteTelegramOperator: (operator: TelegramOperatorRecord) => void | Promise<void>;
};

export const OperatorsBlock = ({
  telegramOperators,
  telegramOperatorsStatus,
  telegramOperatorsError,
  telegramOperatorEditor,
  telegramOperatorSaveStatus,
  telegramOperatorSaveError,
  telegramOperatorToggleId,
  telegramOperatorDialogOpen,
  setTelegramOperatorDialogOpen,
  setTelegramOperatorEditor,
  onSelectTelegramOperator,
  onResetTelegramOperatorEditor,
  onSubmitTelegramOperator,
  onToggleTelegramOperatorActive,
  onClearTelegramOperatorLink,
  onDeleteTelegramOperator,
}: OperatorsBlockProps) => (
  <>
    <div className="manager-layout manager-layout--single manager-layout--spaced ops-management-grid">
      <aside className="entity-list">
        {telegramOperatorsStatus === 'forbidden' ? (
          <article className="entity-card entity-card--muted ops-surface__card">
            <p className="entity-kicker">Telegram доступ</p>
            <h3>Только для admin</h3>
            <p className="meta-line">{telegramOperatorsError || 'У вас нет доступа к управлению списком.'}</p>
          </article>
        ) : (
          telegramOperators.map((operator) => (
            <article
              className={[
                'entity-card',
                'ops-surface__card',
                telegramOperatorEditor.id === operator.id ? 'entity-card--active' : '',
              ].filter(Boolean).join(' ')}
              key={operator.id}
            >
              <div className="entity-card__head">
                <div>
                  <p className="entity-kicker">Telegram доступ</p>
                  <h3>{operator.name}</h3>
                </div>
                <span className={operator.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                  {operator.active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <div className="chip-row">
                <span className="chip">{operator.phone}</span>
                <span className="chip">{operator.linkedChatId ? 'Чат привязан' : 'Ждёт привязку'}</span>
              </div>
              <p className="meta-line">Чат: {operator.linkedChatId || 'ещё не привязан'}</p>
              <p className="meta-line">Последний запрос: {formatDateTimeDisplay(operator.lastCodeRequestedAt)}</p>
              <div className="entity-card__actions entity-card__actions--wrap">
                <button
                  className="secondary-button secondary-button--inline"
                  type="button"
                  onClick={() => {
                    onSelectTelegramOperator(operator);
                    setTelegramOperatorDialogOpen(true);
                  }}
                >
                  Редактировать
                </button>
                <button
                  className="secondary-button secondary-button--inline"
                  type="button"
                  onClick={() => void onToggleTelegramOperatorActive(operator)}
                  disabled={telegramOperatorToggleId === operator.id}
                >
                  {telegramOperatorToggleId === operator.id ? 'Сохраняем...' : operator.active ? 'Деактивировать' : 'Активировать'}
                </button>
                {operator.linkedChatId ? (
                  <button
                    className="secondary-button secondary-button--inline secondary-button--danger"
                    type="button"
                    onClick={() => void onClearTelegramOperatorLink(operator)}
                    disabled={telegramOperatorToggleId === operator.id}
                  >
                    {telegramOperatorToggleId === operator.id ? 'Сбрасываем...' : 'Сбросить привязку'}
                  </button>
                ) : null}
                <button
                  className="secondary-button secondary-button--inline secondary-button--danger"
                  type="button"
                  onClick={() => void onDeleteTelegramOperator(operator)}
                  disabled={telegramOperatorToggleId === operator.id}
                >
                  {telegramOperatorToggleId === operator.id ? 'Удаляем...' : 'Удалить'}
                </button>
              </div>
            </article>
          ))
        )}

        {telegramOperatorsStatus !== 'forbidden' && !telegramOperators.length && telegramOperatorsStatus !== 'loading' ? (
          <p className="meta-line">Пока нет операторов в списке.</p>
        ) : null}
      </aside>
    </div>

    <Dialog
      open={telegramOperatorDialogOpen}
      onOpenChange={(open) => {
        setTelegramOperatorDialogOpen(open);
        if (!open) {
          onResetTelegramOperatorEditor();
        }
      }}
    >
      <DialogContent className="telegram-operator-dialog">
        <DialogHeader>
          <DialogTitle>
            {telegramOperatorEditor.id
              ? telegramOperatorEditor.name || 'Редактирование оператора'
              : 'Новый оператор Telegram'}
          </DialogTitle>
          <DialogDescription>
            После сохранения оператор привязывает контакт через бота.
          </DialogDescription>
        </DialogHeader>

        {telegramOperatorsStatus === 'forbidden' ? (
          <div className="forbidden-panel">
            <p className="meta-line">Telegram allowlist недоступен для вашей роли.</p>
          </div>
        ) : (
          <form className="admin-form" onSubmit={onSubmitTelegramOperator}>
            <div className="form-grid form-grid--two">
              <label className="field">
                <span className="field-label">Имя оператора</span>
                <input
                  className="text-input"
                  value={telegramOperatorEditor.name}
                  onChange={(event) => setTelegramOperatorEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Анна"
                />
              </label>

              <label className="field">
                <span className="field-label">Телефон</span>
                <input
                  className="text-input"
                  type="tel"
                  value={telegramOperatorEditor.phone}
                  onChange={(event) => setTelegramOperatorEditor((current) => ({ ...current, phone: event.target.value }))}
                  autoComplete="tel"
                  placeholder="+7 999 123-45-67"
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={telegramOperatorEditor.active}
                  onChange={(event) => setTelegramOperatorEditor((current) => ({ ...current, active: event.target.checked }))}
                />
                <span>Активен</span>
              </label>
            </div>

            {telegramOperatorSaveError ? <p className="error-text">{telegramOperatorSaveError}</p> : null}

            <div className="form-actions">
              <button className="primary-button primary-button--inline" type="submit" disabled={telegramOperatorSaveStatus === 'loading'}>
                {telegramOperatorSaveStatus === 'loading'
                  ? 'Сохраняем...'
                  : telegramOperatorEditor.id
                    ? 'Сохранить доступ'
                    : 'Добавить в список'}
              </button>
              <button
                className="secondary-button secondary-button--inline"
                type="button"
                onClick={() => {
                  setTelegramOperatorDialogOpen(false);
                  onResetTelegramOperatorEditor();
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  </>
);
