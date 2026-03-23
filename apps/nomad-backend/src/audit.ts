import { prisma } from './db';
import { ensureNomadState } from './state';
import type { StaffRole, StaffUser } from './auth';

export type AuditEntityType =
  | 'daily-code'
  | 'staff-account'
  | 'telegram-recipient'
  | 'mix'
  | 'rail'
  | 'inventory';

export type AuditAction = 'create' | 'update' | 'delete' | 'toggle';

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
  || value === 'telegram-recipient'
  || value === 'mix'
  || value === 'rail'
  || value === 'inventory';

const isAuditAction = (value: string): value is AuditAction =>
  value === 'create' || value === 'update' || value === 'delete' || value === 'toggle';

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
  actorRole: record.actorRole === 'admin' ? 'admin' : 'nomad',
  action: isAuditAction(record.action) ? record.action : 'update',
  entityType: isAuditEntityType(record.entityType) ? record.entityType : 'inventory',
  entityId: record.entityId,
  entityLabel: record.entityLabel,
  details: parseDetails(record.details),
  createdAt: record.createdAt.toISOString(),
});

export const recordAuditEvent = async (payload: AuditEventInput) => {
  await ensureNomadState();

  const created = await prisma.nomadAuditEvent.create({
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
  await ensureNomadState();

  const records = await prisma.nomadAuditEvent.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.max(1, Math.min(limit, 200)),
  });

  return records.map(mapAuditEvent);
};
