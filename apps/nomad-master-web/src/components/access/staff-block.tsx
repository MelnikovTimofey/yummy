import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StaffAccountRecord, StaffUser } from '@/contracts';
import type { AccessRoleStatus, AccessSaveStatus, StaffAccountEditorState } from './types';

type StaffBlockProps = {
  staffAccounts: StaffAccountRecord[];
  staffAccountsStatus: AccessRoleStatus;
  staffAccountsError: string;
  staffAccountEditor: StaffAccountEditorState;
  staffAccountSaveStatus: AccessSaveStatus;
  staffAccountSaveError: string;
  staffAccountToggleId: string;
  setStaffAccountEditor: Dispatch<SetStateAction<StaffAccountEditorState>>;
  onSelectStaffAccount: (account: StaffAccountRecord) => void;
  onResetStaffAccountEditor: () => void;
  onSubmitStaffAccount: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onToggleStaffAccountActive: (account: StaffAccountRecord) => void | Promise<void>;
  onDeleteStaffAccount: (account: StaffAccountRecord) => void | Promise<void>;
};

const STAFF_GRID = '32px minmax(160px, 1fr) minmax(120px, 0.8fr) 110px 140px 56px 80px';

const initialOf = (value: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
};

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

const PlusIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export const StaffBlock = ({
  staffAccounts,
  staffAccountsStatus,
  staffAccountsError,
  staffAccountEditor,
  staffAccountSaveStatus,
  staffAccountSaveError,
  staffAccountToggleId,
  setStaffAccountEditor,
  onSelectStaffAccount,
  onResetStaffAccountEditor,
  onSubmitStaffAccount,
  onToggleStaffAccountActive,
  onDeleteStaffAccount,
}: StaffBlockProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (staffAccountSaveStatus === 'ready' && dialogOpen) {
      setDialogOpen(false);
    }
  }, [staffAccountSaveStatus, dialogOpen]);

  const openNewDialog = () => {
    onResetStaffAccountEditor();
    setDialogOpen(true);
  };

  const openEditDialog = (account: StaffAccountRecord) => {
    onSelectStaffAccount(account);
    setDialogOpen(true);
  };

  return (
    <>
      <section className="card access-card" aria-label="Master-учётки">
        <header className="access-card__head">
          <div>
            <p className="eyebrow access-card__eyebrow">Master-учётки</p>
            <p className="access-card__title-serif">Доступ к Nomad Master</p>
          </div>
          {staffAccountsStatus !== 'forbidden' ? (
            <button
              className="btn"
              data-variant="primary"
              type="button"
              onClick={openNewDialog}
            >
              <PlusIcon />
              Создать сотрудника
            </button>
          ) : null}
        </header>

        {staffAccountsStatus === 'forbidden' ? (
          <p className="access-card__forbidden meta-line">
            {staffAccountsError || 'Раздел сотрудников доступен только для admin.'}
          </p>
        ) : (
          <>
            <div className="list__head access-list__head" style={{ gridTemplateColumns: STAFF_GRID }}>
              <div />
              <div>Имя</div>
              <div>Логин</div>
              <div>Роль</div>
              <div>Последний вход</div>
              <div style={{ textAlign: 'center' }}>Вкл.</div>
              <div style={{ textAlign: 'right' }}>Действия</div>
            </div>

            {staffAccountsStatus === 'loading' && !staffAccounts.length ? (
              <p className="access-card__empty meta-line">Загружаем сотрудников…</p>
            ) : null}

            {staffAccountsStatus === 'ready' && !staffAccounts.length ? (
              <p className="access-card__empty meta-line">Пока нет сотрудников.</p>
            ) : null}

            {staffAccounts.map((account) => {
              const busy = staffAccountToggleId === account.id;
              const isAdmin = account.role === 'admin';
              return (
                <div
                  key={account.id}
                  className="list__row access-list__row"
                  style={{ gridTemplateColumns: STAFF_GRID }}
                >
                  <div>
                    <div
                      className={
                        isAdmin
                          ? 'access-avatar access-avatar--square access-avatar--gradient'
                          : 'access-avatar access-avatar--square'
                      }
                      aria-hidden="true"
                    >
                      {initialOf(account.name || account.login)}
                    </div>
                  </div>
                  <div className="cell-primary">{account.name || '—'}</div>
                  <div className="cell-meta mono access-cell-login">{account.login || '—'}</div>
                  <div>
                    {isAdmin ? (
                      <span className="tag" data-tone="accent">admin</span>
                    ) : (
                      <span className="tag">staff</span>
                    )}
                  </div>
                  <div className="cell-meta access-cell-last">
                    <span className="access-cell-last__empty">—</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={account.active}
                      aria-label={account.active ? 'Активен' : 'Выключен'}
                      title={account.active ? 'Активен' : 'Выключен'}
                      className={`toggle ${account.active ? 'toggle--on' : 'toggle--off'}`}
                      onClick={() => void onToggleStaffAccountActive(account)}
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
                      onClick={() => openEditDialog(account)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Удалить"
                      aria-label="Удалить"
                      onClick={() => void onDeleteStaffAccount(account)}
                      disabled={busy}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            onResetStaffAccountEditor();
          }
        }}
      >
        <DialogContent className="operator-dialog">
          <DialogHeader className="operator-dialog__head">
            <p className="operator-dialog__eyebrow">
              {staffAccountEditor.id ? 'Редактирование сотрудника' : 'Новый сотрудник'}
            </p>
            <DialogTitle className="operator-dialog__title">
              {staffAccountEditor.id
                ? staffAccountEditor.name || 'Без имени'
                : 'Создать сотрудника'}
            </DialogTitle>
            <DialogDescription className="operator-dialog__sub">
              <strong>Admin</strong> может управлять всем — каталогом, staff-учётками, daily code и журналом.
            </DialogDescription>
          </DialogHeader>

          {staffAccountsStatus === 'forbidden' ? (
            <div className="empty">Staff accounts недоступны для вашей роли.</div>
          ) : (
            <form className="operator-dialog__form" onSubmit={onSubmitStaffAccount}>
              <div className="operator-dialog__body">
                <div className="operator-dialog__active-row">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={staffAccountEditor.active}
                    className={`toggle ${staffAccountEditor.active ? 'toggle--on' : 'toggle--off'}`}
                    onClick={() =>
                      setStaffAccountEditor((current) => ({ ...current, active: !current.active }))
                    }
                    aria-label="Активен"
                  >
                    <span className="toggle__track" aria-hidden="true">
                      <span className="toggle__thumb" />
                    </span>
                  </button>
                  <span className="operator-dialog__active-hint">
                    {staffAccountEditor.active ? 'Сможет войти в Master' : 'Доступ закрыт'}
                  </span>
                </div>

                <div className="operator-dialog__field">
                  <label className="operator-dialog__label">Имя</label>
                  <div className="input input--lg">
                    <input
                      value={staffAccountEditor.name}
                      onChange={(event) =>
                        setStaffAccountEditor((current) => ({ ...current, name: event.target.value }))
                      }
                      autoComplete="name"
                      placeholder="Кальянный мастер"
                    />
                  </div>
                </div>

                <div className="operator-dialog__field">
                  <label className="operator-dialog__label">Логин</label>
                  <div className="input">
                    <input
                      value={staffAccountEditor.login}
                      onChange={(event) =>
                        setStaffAccountEditor((current) => ({ ...current, login: event.target.value }))
                      }
                      autoComplete="username"
                      placeholder="nomad"
                    />
                  </div>
                </div>

                <div className="operator-dialog__field">
                  <label className="operator-dialog__label">Роль</label>
                  <div className="operator-dialog__role-switch" role="radiogroup" aria-label="Роль">
                    {(['admin', 'nomad'] as const).map((roleKey) => {
                      const active = staffAccountEditor.role === roleKey;
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className="chip"
                          data-active={active}
                          onClick={() =>
                            setStaffAccountEditor((current) => ({
                              ...current,
                              role: roleKey as StaffUser['role'],
                            }))
                          }
                        >
                          {roleKey === 'admin' ? 'Admin' : 'Staff'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="operator-dialog__field">
                  <label className="operator-dialog__label">
                    Пароль {staffAccountEditor.id ? '(необязательно)' : '(обязательно)'}
                  </label>
                  <div className="input">
                    <input
                      type="password"
                      value={staffAccountEditor.password}
                      onChange={(event) =>
                        setStaffAccountEditor((current) => ({ ...current, password: event.target.value }))
                      }
                      autoComplete="new-password"
                      placeholder="Оставьте пустым, если не менять"
                    />
                  </div>
                </div>

                {staffAccountSaveError ? (
                  <p className="operator-dialog__error">{staffAccountSaveError}</p>
                ) : null}
              </div>

              <footer className="operator-dialog__foot">
                {staffAccountEditor.id ? (
                  <button
                    type="button"
                    className="btn"
                    data-variant="ghost"
                    onClick={() => {
                      void onDeleteStaffAccount({
                        id: staffAccountEditor.id,
                        login: staffAccountEditor.login,
                        name: staffAccountEditor.name,
                        role: staffAccountEditor.role,
                        active: staffAccountEditor.active,
                      });
                    }}
                    disabled={staffAccountToggleId === staffAccountEditor.id}
                  >
                    Удалить
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn"
                  data-variant="ghost"
                  onClick={() => {
                    setDialogOpen(false);
                    onResetStaffAccountEditor();
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn"
                  data-variant="primary"
                  disabled={staffAccountSaveStatus === 'loading'}
                >
                  {staffAccountSaveStatus === 'loading'
                    ? 'Сохраняем...'
                    : staffAccountEditor.id
                      ? 'Сохранить'
                      : 'Создать'}
                </button>
              </footer>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
