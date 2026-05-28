import { useMemo, useState } from 'react';
import type { AuditEventRecord } from '@/contracts';
import { formatAuditAction, formatAuditEntityType } from '@/contracts';
import type { AccessRoleStatus } from './types';

type AuditBlockProps = {
  auditEvents: AuditEventRecord[];
  auditEventsStatus: AccessRoleStatus;
  auditEventsError: string;
};

type AuditFilter = 'all' | 'system' | 'people';

const SYSTEM_ENTITY_TYPES: ReadonlySet<AuditEventRecord['entityType']> = new Set([
  'daily-code',
  'telegram-recipient',
]);

const isSystemEvent = (event: AuditEventRecord) => SYSTEM_ENTITY_TYPES.has(event.entityType);

const DateIcon = ({ entityType }: { entityType: AuditEventRecord['entityType'] }) => {
  const common = {
    className: 'lucide',
    width: 13,
    height: 13,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (entityType) {
    case 'daily-code':
    case 'telegram-operator':
    case 'telegram-recipient':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    case 'staff-account':
      return (
        <svg {...common}>
          <polyline points="9 10 4 15 9 20" />
          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        </svg>
      );
    case 'mix':
      return (
        <svg {...common}>
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case 'rail':
      return (
        <svg {...common}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case 'inventory':
      return (
        <svg {...common}>
          <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
          <path d="m7 16.5-4.74-2.85" />
          <path d="m7 16.5 5-3" />
          <path d="M7 16.5v5.17" />
          <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

const FilterIcon = () => (
  <svg className="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </svg>
);

const dayKey = (iso: string): string => {
  if (!iso) return 'без даты';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'без даты';
  return d.toISOString().slice(0, 10);
};

const formatDayLong = (iso: string): string => {
  if (!iso) return 'Без даты';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(d);
};

const formatTime = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const buildMessage = (event: AuditEventRecord): string => {
  const action = formatAuditAction(event.action).toLowerCase();
  const entity = formatAuditEntityType(event.entityType).toLowerCase();
  const label = event.entityLabel || event.entityId;
  return `${action.charAt(0).toUpperCase()}${action.slice(1)} ${entity}: ${label}`;
};

export const AuditBlock = ({ auditEvents, auditEventsStatus, auditEventsError }: AuditBlockProps) => {
  const [filter, setFilter] = useState<AuditFilter>('all');

  const visible = useMemo(() => {
    if (filter === 'all') return auditEvents;
    return auditEvents.filter((event) =>
      filter === 'system' ? isSystemEvent(event) : !isSystemEvent(event),
    );
  }, [auditEvents, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, { iso: string; events: AuditEventRecord[] }>();
    for (const event of visible) {
      const key = dayKey(event.createdAt);
      const bucket = map.get(key) ?? { iso: event.createdAt, events: [] };
      bucket.events.push(event);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [visible]);

  return (
    <section className="card access-card" aria-label="Журнал изменений">
      <header className="access-card__head">
        <div>
          <p className="eyebrow access-card__eyebrow">Журнал изменений</p>
          <p className="access-card__title-serif">Что происходило в системе</p>
        </div>
        {auditEventsStatus !== 'forbidden' ? (
          <div className="access-card__head-actions">
            {(
              [
                ['all', 'Все'],
                ['system', 'Система'],
                ['people', 'Люди'],
              ] as Array<[AuditFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="chip"
                data-active={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
            <button className="btn" data-variant="ghost" data-size="sm" type="button">
              <FilterIcon />
              /staff/audit/events
            </button>
          </div>
        ) : null}
      </header>

      {auditEventsStatus === 'loading' ? (
        <p className="access-card__empty meta-line">Загружаем журнал изменений…</p>
      ) : null}
      {auditEventsStatus === 'error' ? (
        <p className="access-card__empty error-text">{auditEventsError}</p>
      ) : null}
      {auditEventsStatus === 'forbidden' ? (
        <p className="access-card__forbidden meta-line">
          {auditEventsError || 'Журнал изменений доступен только для admin.'}
        </p>
      ) : null}

      {auditEventsStatus === 'ready' && !visible.length ? (
        <p className="access-card__empty meta-line">
          {auditEvents.length === 0 ? 'Пока нет записей аудита.' : 'Под фильтр ничего не подошло.'}
        </p>
      ) : null}

      {auditEventsStatus !== 'forbidden' && groups.length ? (
        <div className="access-audit__scroll">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="access-audit__day">{formatDayLong(group.iso)}</div>
              {group.events.map((event) => (
                <div className="access-audit__row" key={event.id}>
                  <div className="access-audit__icon" aria-hidden="true">
                    <DateIcon entityType={event.entityType} />
                  </div>
                  <div className="access-audit__body">
                    <div className="access-audit__title">{buildMessage(event)}</div>
                    <div className="access-audit__meta">
                      <span className="mono">{formatTime(event.createdAt)}</span>
                      <span className="access-audit__sep">·</span>
                      <span>{event.actorName || event.actorLogin || event.actorRole}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};
