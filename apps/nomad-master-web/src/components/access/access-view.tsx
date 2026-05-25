import type {
  AuditEventRecord,
  DailyAccessCodeRecord,
  StaffAccountRecord,
  StaffUser,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
} from '@/contracts';
import { AuditBlock } from './audit-block';
import { DailyCodeBlock } from './daily-code-block';
import { OperatorsBlock } from './operators-block';
import { StaffBlock } from './staff-block';
import type {
  AccessLoadStatus,
  AccessRoleStatus,
  AccessSaveStatus,
  StaffAccountEditorState,
  TelegramOperatorEditorState,
} from './types';
import type { Dispatch, FormEvent, SetStateAction } from 'react';

type AccessViewProps = {
  user: StaffUser | null;

  dailyCodes: DailyAccessCodeRecord[];
  dailyCodesStatus: AccessLoadStatus;
  dailyCodesError: string;

  telegramAutomationState: TelegramAutomationStateRecord | null;
  telegramAutomationStateStatus: AccessRoleStatus;
  telegramAutomationStateError: string;

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

  auditEvents: AuditEventRecord[];
  auditEventsStatus: AccessRoleStatus;
  auditEventsError: string;
};

export const AccessView = (props: AccessViewProps) => {
  const {
    user,
    dailyCodes,
    dailyCodesStatus,
    dailyCodesError,
    telegramAutomationState,
    telegramAutomationStateStatus,
    telegramAutomationStateError,
    telegramOperators,
    telegramOperatorsStatus,
    telegramOperatorsError,
    staffAccounts,
    auditEvents,
    onResetTelegramOperatorEditor,
    setTelegramOperatorDialogOpen,
  } = props;

  const currentDailyCode = dailyCodes.find((item) => item.active) ?? dailyCodes[0] ?? null;
  const activeOperators = telegramOperators.filter((item) => item.active);
  const linkedOperatorsCount = activeOperators.filter((item) => item.linkedChatId).length;
  const activeStaffAccounts = staffAccounts.filter((account) => account.active).length;
  const adminAccountsCount = staffAccounts.filter((account) => account.role === 'admin').length;

  return (
    <section className="card">
      <div className="section-head section-head--surface section-head--surface-split">
        <div className="ops-surface__intro">
          <p className="eyebrow">Доступ</p>
          <h2>Daily code и Telegram allowlist</h2>
          <p className="meta-line">Telegram-доступ, daily code и staff-учётки.</p>
        </div>
        <div className="summary-grid summary-grid--nested ops-surface__stats">
          <article className="metric-card ops-surface__stat">
            <p className="metric-label">Активный код</p>
            <p className="metric-value metric-value--compact">{currentDailyCode?.codeValue || 'Нет кода'}</p>
            <p className="meta-line">Текущее окно выдачи для смены.</p>
          </article>
          <article className="metric-card ops-surface__stat">
            <p className="metric-label">Активный список</p>
            <p className="metric-value metric-value--compact">{activeOperators.length}</p>
            <p className="meta-line">Привязанных чатов: {linkedOperatorsCount}</p>
          </article>
          <article className="metric-card ops-surface__stat">
            <p className="metric-label">Staff accounts</p>
            <p className="metric-value metric-value--compact">{activeStaffAccounts}</p>
            <p className="meta-line">Admin: {adminAccountsCount}</p>
          </article>
          <article className="metric-card ops-surface__stat">
            <p className="metric-label">Аудит</p>
            <p className="metric-value metric-value--compact">{auditEvents.length}</p>
            <p className="meta-line">Последние операции staff/admin.</p>
          </article>
        </div>
      </div>

      <div className="ops-toolbar ops-toolbar--split">
        <div className="info-banner info-banner--ops">
          Оператор получает код только через Telegram-бота после привязки контакта.
        </div>
        <div className="section-actions">
          <span className="status-chip">Telegram flow</span>
          {user?.role === 'admin' ? (
            <button
              className="primary-button primary-button--inline"
              type="button"
              onClick={() => {
                onResetTelegramOperatorEditor();
                setTelegramOperatorDialogOpen(true);
              }}
            >
              Новый оператор
            </button>
          ) : null}
        </div>
      </div>

      <DailyCodeBlock
        currentDailyCode={currentDailyCode}
        dailyCodes={dailyCodes}
        dailyCodesStatus={dailyCodesStatus}
        dailyCodesError={dailyCodesError}
        telegramAutomationState={telegramAutomationState}
        telegramAutomationStateStatus={telegramAutomationStateStatus}
        telegramAutomationStateError={telegramAutomationStateError}
        telegramOperators={telegramOperators}
        telegramOperatorsStatus={telegramOperatorsStatus}
        telegramOperatorsError={telegramOperatorsError}
        activeOperatorsCount={activeOperators.length}
        linkedOperatorsCount={linkedOperatorsCount}
      />

      <OperatorsBlock
        telegramOperators={props.telegramOperators}
        telegramOperatorsStatus={props.telegramOperatorsStatus}
        telegramOperatorsError={props.telegramOperatorsError}
        telegramOperatorEditor={props.telegramOperatorEditor}
        telegramOperatorSaveStatus={props.telegramOperatorSaveStatus}
        telegramOperatorSaveError={props.telegramOperatorSaveError}
        telegramOperatorToggleId={props.telegramOperatorToggleId}
        telegramOperatorDialogOpen={props.telegramOperatorDialogOpen}
        setTelegramOperatorDialogOpen={props.setTelegramOperatorDialogOpen}
        setTelegramOperatorEditor={props.setTelegramOperatorEditor}
        onSelectTelegramOperator={props.onSelectTelegramOperator}
        onResetTelegramOperatorEditor={props.onResetTelegramOperatorEditor}
        onSubmitTelegramOperator={props.onSubmitTelegramOperator}
        onToggleTelegramOperatorActive={props.onToggleTelegramOperatorActive}
        onClearTelegramOperatorLink={props.onClearTelegramOperatorLink}
        onDeleteTelegramOperator={props.onDeleteTelegramOperator}
      />

      <StaffBlock
        staffAccounts={props.staffAccounts}
        staffAccountsStatus={props.staffAccountsStatus}
        staffAccountsError={props.staffAccountsError}
        staffAccountEditor={props.staffAccountEditor}
        staffAccountSaveStatus={props.staffAccountSaveStatus}
        staffAccountSaveError={props.staffAccountSaveError}
        staffAccountToggleId={props.staffAccountToggleId}
        setStaffAccountEditor={props.setStaffAccountEditor}
        onSelectStaffAccount={props.onSelectStaffAccount}
        onResetStaffAccountEditor={props.onResetStaffAccountEditor}
        onSubmitStaffAccount={props.onSubmitStaffAccount}
        onToggleStaffAccountActive={props.onToggleStaffAccountActive}
        onDeleteStaffAccount={props.onDeleteStaffAccount}
      />

      <AuditBlock
        auditEvents={props.auditEvents}
        auditEventsStatus={props.auditEventsStatus}
        auditEventsError={props.auditEventsError}
      />
    </section>
  );
};
