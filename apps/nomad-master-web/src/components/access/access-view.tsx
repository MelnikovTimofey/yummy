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
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow } from '@/components/shell/master-stats-row';
import type { DailyCodeRotateStatus } from '@/hooks/use-daily-code';
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
  dailyCodeRotateStatus: DailyCodeRotateStatus;
  dailyCodeRotateError: string;
  onRotateDailyCode: () => void | Promise<void>;

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
    dailyCodeRotateStatus,
    dailyCodeRotateError,
    onRotateDailyCode,
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
  const pendingOperatorsCount = activeOperators.length - linkedOperatorsCount;
  const activeStaffAccounts = staffAccounts.filter((account) => account.active).length;
  // adminAccountsCount раньше отдавался в caption «admin: N». В mockup-варианте
  // под Master-учётками — «с доступом в систему», без отдельного admin-счётчика.

  const dailyCodeHint = (() => {
    if (!currentDailyCode?.endsAt) {
      return 'окно не задано';
    }
    const end = new Date(currentDailyCode.endsAt);
    if (Number.isNaN(end.getTime())) {
      return 'окно не задано';
    }
    return `до ${new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(end)}`;
  })();

  return (
    <section className="card">
      <MasterPageHeader
        eyebrow="ДОСТУП"
        title="Daily code и staff"
        subtitle="Управление гостевым кодом, операторами Telegram-бота и учётками Master."
        meta="/staff/audit/events"
        actions={
          user?.role === 'admin' ? (
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
          ) : null
        }
      />

      <MasterStatsRow
        tiles={[
          {
            label: 'Активный код',
            value: currentDailyCode?.codeValue ?? 'Нет кода',
            hint: dailyCodeHint,
            tone: 'mono',
          },
          {
            label: 'Операторы',
            value: activeOperators.length,
            hint:
              pendingOperatorsCount > 0
                ? `+${pendingOperatorsCount} ждут привязки`
                : activeOperators.length > 0
                  ? 'все привязаны'
                  : 'нет активных',
            tone: 'success',
          },
          {
            label: 'Master-учётки',
            value: activeStaffAccounts,
            hint: 'с доступом в систему',
            tone: 'success',
          },
          {
            label: 'События за сутки',
            value: auditEvents.length,
            hint: 'в журнале',
          },
        ]}
      />

      <DailyCodeBlock
        helper="Оператор получает код только через Telegram-бота после привязки контакта."
        currentDailyCode={currentDailyCode}
        dailyCodes={dailyCodes}
        dailyCodesStatus={dailyCodesStatus}
        dailyCodesError={dailyCodesError}
        rotateStatus={dailyCodeRotateStatus}
        rotateError={dailyCodeRotateError}
        onRotate={onRotateDailyCode}
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
