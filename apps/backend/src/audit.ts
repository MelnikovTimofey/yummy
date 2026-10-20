import { prisma } from './db';
import { ensureAppState } from './state';
import type { StaffRole, StaffUser } from './auth';

export type AuditEntityType =
  | 'daily-code'
  | 'staff-account'
  | 'telegram-operator'
  | 'telegram-recipient'
  | 'mix'
  | 'rail'
  | 'inventory'
  | 'shelf'
  | 'pack'
  | 'delivery';

const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'toggle',
  'archive',
  // Полка (src/shelf.ts).
  'mark-empty',
  'undo-empty',
  'mark',
  'open',
  'add-pack',
  'write-off',
  'stop',
  'add',
  'remove',
  'settings',
  // Поставки (src/deliveries.ts).
  'accept',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEventView = {
  id: string;
  actorLogin: string;
  actorName: string;
  actorRole: StaffRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type AuditEventInput = {
  actor: StaffUser;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
};

const isAuditEntityType = (value: string): value is AuditEntityType =>
  value === 'daily-code'
  || value === 'staff-account'
  || value === 'telegram-operator'
  || value === 'telegram-recipient'
  || value === 'mix'
  || value === 'rail'
  || value === 'inventory'
  || value === 'shelf'
  || value === 'pack'
  || value === 'delivery';

const isAuditAction = (value: string): value is AuditAction => (AUDIT_ACTIONS as readonly string[]).includes(value);

const parseDetails = (value: string | null) => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const mapAuditEvent = (record: {
  id: string;
  actorLogin: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  details: string | null;
  createdAt: Date;
}): AuditEventView => ({
  id: record.id,
  actorLogin: record.actorLogin,
  actorName: record.actorName,
  actorRole: record.actorRole === 'admin' ? 'admin' : 'master',
  action: isAuditAction(record.action) ? record.action : 'update',
  entityType: isAuditEntityType(record.entityType) ? record.entityType : 'inventory',
  entityId: record.entityId,
  entityLabel: record.entityLabel,
  details: parseDetails(record.details),
  createdAt: record.createdAt.toISOString(),
});

export const recordAuditEvent = async (payload: AuditEventInput) => {
  await ensureAppState();

  const created = await prisma.auditEvent.create({
    data: {
      actorLogin: payload.actor.login,
      actorName: payload.actor.name,
      actorRole: payload.actor.role,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityLabel: payload.entityLabel?.trim() || payload.entityId,
      details: JSON.stringify(payload.details ?? {}),
    },
  });

  return mapAuditEvent(created);
};

export const listAuditEvents = async (limit = 40) => {
  await ensureAppState();

  const records = await prisma.auditEvent.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.max(1, Math.min(limit, 200)),
  });

  return records.map(mapAuditEvent);
};
