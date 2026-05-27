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
                  className="btn"
                  data-size="sm"
                  type="button"
                  onClick={() => {
                    onSelectTelegramOperator(operator);
                    setTelegramOperatorDialogOpen(true);
                  }}
                >
                  Редактировать
                </button>
                <button
                  className="btn"
                  data-size="sm"
                  type="button"
                  onClick={() => void onToggleTelegramOperatorActive(operator)}
                  disabled={telegramOperatorToggleId === operator.id}
                >
                  {telegramOperatorToggleId === operator.id ? 'Сохраняем...' : operator.active ? 'Деактивировать' : 'Активировать'}
                </button>
                {operator.linkedChatId ? (
                  <button
                    className="btn"
                    data-variant="danger"
                    data-size="sm"
                    type="button"
                    onClick={() => void onClearTelegramOperatorLink(operator)}
                    disabled={telegramOperatorToggleId === operator.id}
                  >
                    {telegramOperatorToggleId === operator.id ? 'Сбрасываем...' : 'Сбросить привязку'}
                  </button>
                ) : null}
                <button
                  className="btn"
                    data-variant="danger"
                    data-size="sm"
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
      <DialogContent className="operator-dialog">
        <DialogHeader className="operator-dialog__head">
          <p className="operator-dialog__eyebrow">
            {telegramOperatorEditor.id ? 'Редактирование' : 'Новый оператор'}
          </p>
          <DialogTitle className="operator-dialog__title">
            {telegramOperatorEditor.id
              ? telegramOperatorEditor.name || 'Редактирование оператора'
              : 'Добавить оператора'}
          </DialogTitle>
          <DialogDescription className="operator-dialog__sub">
            После сохранения оператор привязывает контакт через бота.
          </DialogDescription>
        </DialogHeader>

        {telegramOperatorsStatus === 'forbidden' ? (
          <div className="empty">Telegram allowlist недоступен для вашей роли.</div>
        ) : (
          <form className="operator-dialog__form" onSubmit={onSubmitTelegramOperator}>
            <div className="operator-dialog__body">
              <div className="operator-dialog__active-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={telegramOperatorEditor.active}
                  className={`toggle ${telegramOperatorEditor.active ? 'toggle--on' : 'toggle--off'}`}
                  onClick={() =>
                    setTelegramOperatorEditor((current) => ({ ...current, active: !current.active }))
                  }
                  aria-label="Активен"
                >
                  <span className="toggle__track" aria-hidden="true">
                    <span className="toggle__thumb" />
                  </span>
                </button>
                <span className="operator-dialog__active-hint">
                  {telegramOperatorEditor.active ? 'Получит код по запросу' : 'Не получит код'}
                </span>
              </div>

              <div className="operator-dialog__field">
                <label className="operator-dialog__label">Имя оператора</label>
                <div className="input input--lg">
                  <input
                    value={telegramOperatorEditor.name}
                    onChange={(event) =>
                      setTelegramOperatorEditor((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Анна"
                  />
                </div>
              </div>

              <div className="operator-dialog__field">
                <label className="operator-dialog__label">Телефон</label>
                <div className="input">
                  <input
                    type="tel"
                    value={telegramOperatorEditor.phone}
                    onChange={(event) =>
                      setTelegramOperatorEditor((current) => ({ ...current, phone: event.target.value }))
                    }
                    autoComplete="tel"
                    placeholder="+7 999 123-45-67"
                  />
                </div>
              </div>

              {telegramOperatorSaveError ? (
                <p className="operator-dialog__error">{telegramOperatorSaveError}</p>
              ) : null}
            </div>

            <footer className="operator-dialog__foot">
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                onClick={() => {
                  setTelegramOperatorDialogOpen(false);
                  onResetTelegramOperatorEditor();
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn"
                data-variant="primary"
                disabled={telegramOperatorSaveStatus === 'loading'}
              >
                {telegramOperatorSaveStatus === 'loading'
                  ? 'Сохраняем...'
                  : telegramOperatorEditor.id
                    ? 'Сохранить'
                    : 'Добавить'}
              </button>
            </footer>
          </form>
        )}
      </DialogContent>
    </Dialog>
  </>
);
