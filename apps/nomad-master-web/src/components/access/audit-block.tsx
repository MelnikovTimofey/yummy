import type { AuditEventRecord } from '@/contracts';
import { formatAuditAction, formatAuditEntityType } from '@/contracts';
import { formatDateTimeDisplay } from './format-date-time';
import type { AccessRoleStatus } from './types';

type AuditBlockProps = {
  auditEvents: AuditEventRecord[];
  auditEventsStatus: AccessRoleStatus;
  auditEventsError: string;
};

export const AuditBlock = ({ auditEvents, auditEventsStatus, auditEventsError }: AuditBlockProps) => (
  <article className="editor-card ops-table-shell">
    <div className="entity-card__head">
      <div>
        <p className="entity-kicker">Журнал изменений</p>
        <h3>Последние staff-операции</h3>
      </div>
      <span className="status-chip">/staff/audit/events</span>
    </div>

    {auditEventsStatus === 'loading' ? <p className="meta-line">Загружаем журнал изменений...</p> : null}
    {auditEventsStatus === 'error' ? <p className="error-text">{auditEventsError}</p> : null}
    {auditEventsStatus === 'forbidden' ? <p className="meta-line">{auditEventsError}</p> : null}

    {auditEventsStatus === 'ready' && !auditEvents.length ? (
      <p className="meta-line">Пока нет записей аудита.</p>
    ) : null}

    {auditEventsStatus !== 'forbidden' && auditEvents.length ? (
      <div className="audit-list">
        {auditEvents.map((event) => (
          <article className="entity-card entity-card--compact ops-surface__card" key={event.id}>
            <div className="entity-card__head">
              <div>
                <p className="entity-kicker">
                  {formatAuditEntityType(event.entityType)} · {formatAuditAction(event.action)}
                </p>
                <h3>{event.entityLabel || event.entityId}</h3>
              </div>
              <span className="status-chip">{event.actorRole}</span>
            </div>
            <p className="meta-line">
              {event.actorName || event.actorLogin} ({event.actorLogin}) · {formatDateTimeDisplay(event.createdAt)}
            </p>
            <div className="chip-row">
              <span className="chip">{event.entityType}</span>
              <span className="chip">{event.action}</span>
              <span className="chip">{event.entityId}</span>
            </div>
          </article>
        ))}
      </div>
    ) : null}
  </article>
);
