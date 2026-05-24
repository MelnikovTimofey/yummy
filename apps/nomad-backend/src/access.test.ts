import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { config } from './config';
import { resetNomadState } from './state';

const login = async (app: ReturnType<typeof buildApp>, loginName: string, password: string) => {
  const response = await app.inject({
    method: 'POST',
    url: '/staff/auth/login',
    payload: {
      login: loginName,
      password,
    },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as { accessToken: string };
  return body.accessToken;
};

test.beforeEach(async () => {
  await resetNomadState();
});

test('daily codes CRUD is available to admin and nomad', async () => {
  const app = buildApp();

  try {
    const adminToken = await login(app, 'admin', 'admin');
    const nomadToken = await login(app, 'nomad', 'nomad');

    for (const token of [adminToken, nomadToken]) {
      const list = await app.inject({
        method: 'GET',
        url: '/staff/access/daily-codes',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      assert.equal(list.statusCode, 200);
      const listBody = list.json() as { items: Array<{ codeValue: string; codeLabel: string }> };
      assert.equal(listBody.items[0].codeValue, 'NMD7');
      assert.equal(listBody.items[0].codeLabel, 'Базовый daily code');
    }

    const created = await app.inject({
      method: 'POST',
      url: '/staff/access/daily-codes',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
      payload: {
        codeValue: 'NOMAD-2027',
        codeLabel: 'Вечерний код',
        active: false,
      },
    });

    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as {
      item: { id: string; codeValue: string; codeLabel: string; active: boolean };
    };
    assert.equal(createdBody.item.codeValue, 'NOMAD-2027');
    assert.equal(createdBody.item.codeLabel, 'Вечерний код');
    assert.equal(createdBody.item.active, false);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/staff/access/daily-codes/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        codeValue: 'NOMAD-2028',
        codeLabel: 'Обновлённый код',
        active: true,
      },
    });

    assert.equal(updated.statusCode, 200);
    const updatedBody = updated.json() as {
      item: { id: string; codeValue: string; codeLabel: string; active: boolean };
    };
    assert.equal(updatedBody.item.id, createdBody.item.id);
    assert.equal(updatedBody.item.codeValue, 'NOMAD-2028');
    assert.equal(updatedBody.item.codeLabel, 'Обновлённый код');
    assert.equal(updatedBody.item.active, true);

    const verify = await app.inject({
      method: 'POST',
      url: '/guest/access-code/verify',
      payload: {
        code: 'NOMAD-2028',
      },
    });

    assert.equal(verify.statusCode, 200);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/staff/access/daily-codes/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(deleted.statusCode, 204);

    const listAfterDelete = await app.inject({
      method: 'GET',
      url: '/staff/access/daily-codes',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(listAfterDelete.statusCode, 200);
    const listAfterDeleteBody = listAfterDelete.json() as { items: Array<{ id: string }> };
    assert.equal(listAfterDeleteBody.items.some((item) => item.id === createdBody.item.id), false);
  } finally {
    await app.close();
  }
});

test('staff accounts CRUD is admin-only', async () => {
  const app = buildApp();

  try {
    const adminToken = await login(app, 'admin', 'admin');
    const nomadToken = await login(app, 'nomad', 'nomad');

    const forbidden = await app.inject({
      method: 'GET',
      url: '/staff/access/accounts',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
    });

    assert.equal(forbidden.statusCode, 403);

    const list = await app.inject({
      method: 'GET',
      url: '/staff/access/accounts',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(list.statusCode, 200);
    const listBody = list.json() as {
      items: Array<{ login: string; name: string; role: string; active: boolean; passwordHash?: string }>;
    };

    assert.equal(listBody.items.length >= 2, true);
    assert.equal(listBody.items.some((item) => item.passwordHash), false);

    const created = await app.inject({
      method: 'POST',
      url: '/staff/access/accounts',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        login: 'bartender',
        name: 'Bartender',
        role: 'nomad',
        password: 'bartender',
        active: true,
      },
    });

    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as {
      item: { id: string; login: string; name: string; role: string; active: boolean };
    };
    assert.equal(createdBody.item.login, 'bartender');
    assert.equal(createdBody.item.role, 'nomad');
    assert.equal(createdBody.item.active, true);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/staff/access/accounts/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Senior Bartender',
        role: 'admin',
        active: false,
        password: 'new-secret',
      },
    });

    assert.equal(updated.statusCode, 200);
    const updatedBody = updated.json() as {
      item: { id: string; login: string; name: string; role: string; active: boolean };
    };
    assert.equal(updatedBody.item.id, createdBody.item.id);
    assert.equal(updatedBody.item.name, 'Senior Bartender');
    assert.equal(updatedBody.item.role, 'admin');
    assert.equal(updatedBody.item.active, false);

    const disabledLogin = await app.inject({
      method: 'POST',
      url: '/staff/auth/login',
      payload: {
        login: 'bartender',
        password: 'new-secret',
      },
    });

    assert.equal(disabledLogin.statusCode, 401);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/staff/access/accounts/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(deleted.statusCode, 204);

    const listAfterDelete = await app.inject({
      method: 'GET',
      url: '/staff/access/accounts',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(listAfterDelete.statusCode, 200);
    const listAfterDeleteBody = listAfterDelete.json() as { items: Array<{ id: string }> };
    assert.equal(listAfterDeleteBody.items.some((item) => item.id === createdBody.item.id), false);
  } finally {
    await app.close();
  }
});

test('telegram recipients CRUD is admin-only', async () => {
  const app = buildApp();

  try {
    const adminToken = await login(app, 'admin', 'admin');
    const nomadToken = await login(app, 'nomad', 'nomad');

    const forbidden = await app.inject({
      method: 'GET',
      url: '/staff/access/telegram-recipients',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
    });

    assert.equal(forbidden.statusCode, 403);

    const list = await app.inject({
      method: 'GET',
      url: '/staff/access/telegram-recipients',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(list.statusCode, 200);
    assert.deepEqual((list.json() as { items: unknown[] }).items, []);

    const created = await app.inject({
      method: 'POST',
      url: '/staff/access/telegram-recipients',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        chatId: '362223626',
        label: 'Тестовый чат',
        scope: 'broadcast',
        active: true,
      },
    });

    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as {
      item: { id: string; chatId: string; label: string; scope: string; active: boolean };
    };
    assert.equal(createdBody.item.chatId, '362223626');
    assert.equal(createdBody.item.scope, 'broadcast');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/staff/access/telegram-recipients/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        chatId: '362223626',
        label: 'Основной чат',
        scope: 'rotate',
        active: false,
      },
    });

    assert.equal(updated.statusCode, 200);
    const updatedBody = updated.json() as {
      item: { id: string; label: string; scope: string; active: boolean };
    };
    assert.equal(updatedBody.item.id, createdBody.item.id);
    assert.equal(updatedBody.item.label, 'Основной чат');
    assert.equal(updatedBody.item.scope, 'rotate');
    assert.equal(updatedBody.item.active, false);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/staff/access/telegram-recipients/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(deleted.statusCode, 204);

    const listAfterDelete = await app.inject({
      method: 'GET',
      url: '/staff/access/telegram-recipients',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(listAfterDelete.statusCode, 200);
    assert.equal((listAfterDelete.json() as { items: Array<{ id: string }> }).items.length, 0);
  } finally {
    await app.close();
  }
});

test('telegram operators CRUD is admin-only', async () => {
  const app = buildApp();

  try {
    const adminToken = await login(app, 'admin', 'admin');
    const nomadToken = await login(app, 'nomad', 'nomad');

    const forbidden = await app.inject({
      method: 'GET',
      url: '/staff/access/telegram-operators',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
    });

    assert.equal(forbidden.statusCode, 403);

    const created = await app.inject({
      method: 'POST',
      url: '/staff/access/telegram-operators',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Марат',
        phone: '+7 (999) 111-22-33',
        active: true,
      },
    });

    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as {
      item: { id: string; name: string; phone: string; active: boolean; linkedChatId: string | null };
    };
    assert.equal(createdBody.item.name, 'Марат');
    assert.equal(createdBody.item.phone, '+79991112233');
    assert.equal(createdBody.item.linkedChatId, null);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/staff/access/telegram-operators/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Марат Nomad',
        phone: '+7 999 111-22-33',
        active: false,
      },
    });

    assert.equal(updated.statusCode, 200);
    const updatedBody = updated.json() as {
      item: { id: string; name: string; phone: string; active: boolean };
    };
    assert.equal(updatedBody.item.id, createdBody.item.id);
    assert.equal(updatedBody.item.name, 'Марат Nomad');
    assert.equal(updatedBody.item.phone, '+79991112233');
    assert.equal(updatedBody.item.active, false);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/staff/access/telegram-operators/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(deleted.statusCode, 204);
  } finally {
    await app.close();
  }
});

test('telegram automation state is admin-only on staff side', async () => {
  const app = buildApp();

  try {
    const adminToken = await login(app, 'admin', 'admin');
    const nomadToken = await login(app, 'nomad', 'nomad');

    await app.inject({
      method: 'POST',
      url: '/automation/telegram/state/report',
      headers: {
        'x-nomad-automation-key': config.automationKey,
      },
      payload: {
        event: 'heartbeat',
      },
    });

    const forbidden = await app.inject({
      method: 'GET',
      url: '/staff/access/telegram-automation-state',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
    });

    assert.equal(forbidden.statusCode, 403);

    const allowed = await app.inject({
      method: 'GET',
      url: '/staff/access/telegram-automation-state',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(allowed.statusCode, 200);
    const body = allowed.json() as {
      item: {
        health: 'unknown' | 'healthy' | 'stale' | 'error';
        lastHeartbeatAt: string | null;
      };
    };

    assert.equal(body.item.health, 'healthy');
    assert.ok(body.item.lastHeartbeatAt);
  } finally {
    await app.close();
  }
});

test('audit trail stores staff-sensitive mutations and is admin-only', async () => {
  const app = buildApp();

  try {
    const adminToken = await login(app, 'admin', 'admin');
    const nomadToken = await login(app, 'nomad', 'nomad');

    const inventoryUpdate = await app.inject({
      method: 'PATCH',
      url: '/staff/inventory/tobaccos/tobacco-peach-silk',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
      payload: {
        inStock: true,
      },
    });

    assert.equal(inventoryUpdate.statusCode, 200);

    const codeCreate = await app.inject({
      method: 'POST',
      url: '/staff/access/daily-codes',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
      payload: {
        codeValue: 'NOMAD-AUDIT',
        codeLabel: 'Audit code',
        active: true,
      },
    });

    assert.equal(codeCreate.statusCode, 201);

    const forbidden = await app.inject({
      method: 'GET',
      url: '/staff/audit/events',
      headers: {
        authorization: `Bearer ${nomadToken}`,
      },
    });

    assert.equal(forbidden.statusCode, 403);

    const allowed = await app.inject({
      method: 'GET',
      url: '/staff/audit/events?limit=10',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(allowed.statusCode, 200);
    const body = allowed.json() as {
      items: Array<{
        actorLogin: string;
        action: string;
        entityType: string;
        entityId: string;
        entityLabel: string;
        details: Record<string, unknown>;
      }>;
    };

    assert.equal(body.items.length >= 2, true);
    assert.equal(body.items.some((item) => item.actorLogin === 'nomad' && item.entityType === 'inventory' && item.action === 'toggle'), true);
    assert.equal(body.items.some((item) => item.actorLogin === 'nomad' && item.entityType === 'daily-code' && item.action === 'create'), true);

    const inventoryEvent = body.items.find((item) => item.entityType === 'inventory');
    assert.equal(inventoryEvent?.entityId, 'tobacco-peach-silk');
    assert.equal(inventoryEvent?.details.toInStock, true);
  } finally {
    await app.close();
  }
});
