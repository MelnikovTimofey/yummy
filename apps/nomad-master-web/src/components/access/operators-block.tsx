import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { TelegramOperatorRecord } from '@/contracts';
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

type FilterKey = 'all' | 'active' | 'pending' | 'inactive';

const OPERATORS_GRID = '32px minmax(180px, 1.2fr) 160px minmax(180px, 1fr) 120px 56px 110px';

const initialOf = (value: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
};

const relativeFromIso = (iso: string): string => {
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

const PlusIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const SearchIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const LinkIcon = () => (
  <svg className="lucide" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const EditIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const MoreIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const filterPredicate = (operator: TelegramOperatorRecord, key: FilterKey) => {
  switch (key) {
    case 'active':
      return operator.active && Boolean(operator.linkedChatId);
    case 'pending':
      return operator.active && !operator.linkedChatId;
    case 'inactive':
      return !operator.active;
    default:
      return true;
  }
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
}: OperatorsBlockProps) => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(
    () => ({
      all: telegramOperators.length,
      active: telegramOperators.filter((item) => filterPredicate(item, 'active')).length,
      pending: telegramOperators.filter((item) => filterPredicate(item, 'pending')).length,
      inactive: telegramOperators.filter((item) => filterPredicate(item, 'inactive')).length,
    }),
    [telegramOperators],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return telegramOperators.filter((item) => {
      if (!filterPredicate(item, filter)) return false;
      if (!q) return true;
      const hay = [item.name, item.phone, item.linkedUsername, item.linkedDisplayName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [telegramOperators, filter, query]);

  const openNewDialog = () => {
    onResetTelegramOperatorEditor();
    setTelegramOperatorDialogOpen(true);
  };

  return (
    <>
      <section className="card access-card" aria-label="Telegram-операторы">
        <header className="access-card__head">
          <div>
            <p className="eyebrow access-card__eyebrow">Telegram-операторы</p>
            <p className="access-card__title-serif">Сотрудники с доступом к боту</p>
          </div>
          {telegramOperatorsStatus !== 'forbidden' ? (
            <button
              className="btn"
              data-variant="primary"
              type="button"
              onClick={openNewDialog}
            >
              <PlusIcon />
              Добавить оператора
            </button>
          ) : null}
        </header>

        {telegramOperatorsStatus === 'forbidden' ? (
          <p className="access-card__forbidden meta-line">
            {telegramOperatorsError || 'Allowlist Telegram доступен только для admin.'}
          </p>
        ) : (
          <>
            <div className="access-toolbar">
              <label className="input access-toolbar__search">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Имя, телефон или @username"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {(
                [
                  ['all', 'Все', counts.all],
                  ['active', 'Активны', counts.active],
                  ['pending', 'Ждут привязки', counts.pending],
                  ['inactive', 'Выключены', counts.inactive],
                ] as Array<[FilterKey, string, number]>
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className="chip"
                  data-active={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <span className="chip__count">{count}</span>
                </button>
              ))}
            </div>

            <div className="list__head access-list__head" style={{ gridTemplateColumns: OPERATORS_GRID }}>
              <div />
              <div>Оператор</div>
              <div>Телефон</div>
              <div>Telegram</div>
              <div>Последний код</div>
              <div style={{ textAlign: 'center' }}>Вкл.</div>
              <div style={{ textAlign: 'right' }}>Действия</div>
            </div>

            {telegramOperatorsStatus === 'loading' && !telegramOperators.length ? (
              <p className="access-card__empty meta-line">Загружаем операторов…</p>
            ) : null}

            {visible.length === 0 && telegramOperatorsStatus !== 'loading' ? (
              <p className="access-card__empty meta-line">
                {telegramOperators.length === 0
                  ? 'Пока нет операторов в списке.'
                  : 'Под фильтр ничего не подошло.'}
              </p>
            ) : null}

            {visible.map((operator) => {
              const isLinked = Boolean(operator.linkedChatId);
              const busy = telegramOperatorToggleId === operator.id;
              return (
                <div
                  key={operator.id}
                  className="list__row access-list__row"
                  style={{ gridTemplateColumns: OPERATORS_GRID }}
                >
                  <div>
                    <div
                      className={isLinked ? 'access-avatar access-avatar--accent' : 'access-avatar'}
                      aria-hidden="true"
                    >
                      {initialOf(operator.name)}
                    </div>
                  </div>
                  <div className="cell-primary">
                    <div>
                      <div>{operator.name || '—'}</div>
                      {operator.linkedDisplayName ? (
                        <div className="cell-primary__sub">{operator.linkedDisplayName}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="cell-meta mono access-cell-phone">{operator.phone || '—'}</div>
                  <div>
                    <div className="access-tg-cell">
                      {isLinked ? (
                        <>
                          <span className="tag" data-tone="success">привязан</span>
                          {operator.linkedUsername ? (
                            <span className="mono access-tg-cell__handle">
                              @{operator.linkedUsername.replace(/^@/, '')}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="tag" data-tone="warning">ждёт /start</span>
                          <span className="chip access-tg-cell__hint" aria-hidden="true">
                            <LinkIcon />
                            Ссылка на бота
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="cell-meta access-cell-last">
                    {operator.lastCodeRequestedAt ? (
                      relativeFromIso(operator.lastCodeRequestedAt)
                    ) : (
                      <span className="access-cell-last__empty">—</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={operator.active}
                      aria-label={operator.active ? 'Активен' : 'Выключен'}
                      title={operator.active ? 'Активен' : 'Выключен'}
                      className={`toggle ${operator.active ? 'toggle--on' : 'toggle--off'}`}
                      onClick={() => void onToggleTelegramOperatorActive(operator)}
                      disabled={busy}
                    >
                      <span className="toggle__track" aria-hidden="true">
                        <span className="toggle__thumb" />
                      </span>
                    </button>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Редактировать"
                      aria-label="Редактировать"
                      onClick={() => {
                        onSelectTelegramOperator(operator);
                        setTelegramOperatorDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Удалить"
                      aria-label="Удалить"
                      onClick={() => void onDeleteTelegramOperator(operator)}
                      disabled={busy}
                    >
                      <TrashIcon />
                    </button>
                    {isLinked ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Сбросить привязку"
                        aria-label="Сбросить привязку"
                        onClick={() => void onClearTelegramOperatorLink(operator)}
                        disabled={busy}
                      >
                        <MoreIcon />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            <footer className="access-hint-row" aria-hidden="true">
              <LinkIcon />
              <span><strong>1.</strong> Добавь оператора</span>
              <span className="access-hint-row__arrow">→</span>
              <span><strong>2.</strong> Оператор пишет боту и шлёт контакт</span>
              <span className="access-hint-row__arrow">→</span>
              <span><strong>3.</strong> Бот привязывает chat по номеру</span>
              <span className="access-hint-row__arrow">→</span>
              <span><strong>4.</strong> Команда /code выдаёт актуальный код</span>
            </footer>
          </>
        )}
      </section>

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
};
