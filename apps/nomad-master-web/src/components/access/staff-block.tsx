import type { Dispatch, FormEvent, SetStateAction } from 'react';
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
}: StaffBlockProps) => (
  <div className="manager-layout manager-layout--stacked manager-layout--spaced ops-management-grid">
    <aside className="entity-list">
      {staffAccountsStatus === 'forbidden' ? (
        <article className="entity-card entity-card--muted ops-surface__card">
          <p className="entity-kicker">Учётные записи</p>
          <h3>Только для admin</h3>
          <p className="meta-line">{staffAccountsError || 'У вас нет доступа к управлению учётными записями.'}</p>
        </article>
      ) : (
        staffAccounts.map((account) => (
          <article
            className={[
              'entity-card',
              'ops-surface__card',
              staffAccountEditor.id === account.id ? 'entity-card--active' : '',
            ].filter(Boolean).join(' ')}
            key={account.id}
          >
            <div className="entity-card__head">
              <div>
                <p className="entity-kicker">Master staff account</p>
                <h3>{account.name}</h3>
              </div>
              <span className={account.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                {account.active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
            <div className="chip-row">
              <span className="chip">{account.login}</span>
              <span className="chip">{account.role === 'admin' ? 'admin' : 'nomad'}</span>
            </div>
            <div className="entity-card__actions entity-card__actions--wrap">
              <button className="secondary-button secondary-button--inline" type="button" onClick={() => onSelectStaffAccount(account)}>
                Редактировать
              </button>
              <button
                className="secondary-button secondary-button--inline"
                type="button"
                onClick={() => void onToggleStaffAccountActive(account)}
                disabled={staffAccountToggleId === account.id}
              >
                {staffAccountToggleId === account.id ? 'Сохраняем...' : account.active ? 'Деактивировать' : 'Активировать'}
              </button>
              <button
                className="secondary-button secondary-button--inline secondary-button--danger"
                type="button"
                onClick={() => void onDeleteStaffAccount(account)}
                disabled={staffAccountToggleId === account.id}
              >
                {staffAccountToggleId === account.id ? 'Удаляем...' : 'Удалить'}
              </button>
            </div>
          </article>
        ))
      )}

      {staffAccountsStatus !== 'forbidden' && !staffAccounts.length && staffAccountsStatus !== 'loading' ? (
        <p className="meta-line">Пока нет сотрудников.</p>
      ) : null}
    </aside>

    <article className="editor-card ops-editor">
      <div className="entity-card__head">
        <div>
          <p className="entity-kicker">{staffAccountEditor.id ? 'Редактирование сотрудника' : 'Новый сотрудник'}</p>
          <h3>{staffAccountEditor.id ? staffAccountEditor.name || 'Без имени' : 'Создать сотрудника'}</h3>
        </div>
        <span className="status-chip">{staffAccountEditor.role === 'admin' ? 'admin' : 'nomad'}</span>
      </div>

      {staffAccountsStatus === 'loading' ? <p className="meta-line">Загружаем сотрудников...</p> : null}
      {staffAccountsStatus === 'error' ? <p className="error-text">{staffAccountsError}</p> : null}
      {staffAccountsStatus === 'forbidden' ? <p className="meta-line">{staffAccountsError}</p> : null}

      {staffAccountsStatus !== 'forbidden' ? (
        <form className="admin-form" onSubmit={onSubmitStaffAccount}>
          <div className="form-grid form-grid--two">
            <label className="field">
              <span className="field-label">Логин</span>
              <input
                className="text-input"
                value={staffAccountEditor.login}
                onChange={(event) => setStaffAccountEditor((current) => ({ ...current, login: event.target.value }))}
                autoComplete="username"
                placeholder="nomad"
              />
            </label>

            <label className="field">
              <span className="field-label">Имя</span>
              <input
                className="text-input"
                value={staffAccountEditor.name}
                onChange={(event) => setStaffAccountEditor((current) => ({ ...current, name: event.target.value }))}
                autoComplete="name"
                placeholder="Кальянный мастер"
              />
            </label>

            <label className="field">
              <span className="field-label">Роль</span>
              <select
                className="select-input"
                value={staffAccountEditor.role}
                onChange={(event) =>
                  setStaffAccountEditor((current) => ({
                    ...current,
                    role: event.target.value as StaffUser['role'],
                  }))
                }
              >
                <option value="admin">admin</option>
                <option value="nomad">nomad</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Пароль {staffAccountEditor.id ? '(необязательно)' : '(обязательно)'}</span>
              <input
                className="text-input"
                type="password"
                value={staffAccountEditor.password}
                onChange={(event) => setStaffAccountEditor((current) => ({ ...current, password: event.target.value }))}
                autoComplete="new-password"
                placeholder="Оставьте пустым, если не менять"
              />
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={staffAccountEditor.active}
                onChange={(event) => setStaffAccountEditor((current) => ({ ...current, active: event.target.checked }))}
              />
              <span>Активен</span>
            </label>
          </div>

          {staffAccountSaveError ? <p className="error-text">{staffAccountSaveError}</p> : null}

          <div className="form-actions">
            <button
              type="submit"
              className="btn"
              data-variant="primary"
              disabled={staffAccountSaveStatus === 'loading'}
            >
              {staffAccountSaveStatus === 'loading'
                ? 'Сохраняем...'
                : staffAccountEditor.id
                  ? 'Сохранить сотрудника'
                  : 'Создать сотрудника'}
            </button>
            <button
              type="button"
              className="btn"
              data-variant="ghost"
              onClick={onResetStaffAccountEditor}
            >
              Сбросить форму
            </button>
            {staffAccountEditor.id ? (
              <button
                type="button"
                className="btn"
                data-variant="danger"
                onClick={() =>
                  void onDeleteStaffAccount({
                    id: staffAccountEditor.id,
                    login: staffAccountEditor.login,
                    name: staffAccountEditor.name,
                    role: staffAccountEditor.role,
                    active: staffAccountEditor.active,
                  })
                }
                disabled={staffAccountToggleId === staffAccountEditor.id}
              >
                {staffAccountToggleId === staffAccountEditor.id ? 'Удаляем...' : 'Удалить сотрудника'}
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="forbidden-panel">
          <p className="meta-line">Staff accounts недоступны для вашей роли.</p>
        </div>
      )}
    </article>
  </div>
);
