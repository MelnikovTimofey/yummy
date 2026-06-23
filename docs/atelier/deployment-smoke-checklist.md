# Арома Ателье — Deployment Smoke Checklist

## 1. Когда запускать

Этот checklist выполнять:

1. после первого production deploy;
2. после изменения backend auth / automation;
3. после изменения Telegram bot runtime;
4. после критических infra-изменений.

## 2. Backend

1. Проверить health:

```bash
curl -sS https://api.nomad.example/health
```

Ожидается:

1. `status=ok`
2. корректный `service`

2. Проверить automation access:

```bash
curl -sS \
  -H 'x-nomad-automation-key: <automation-key>' \
  https://api.nomad.example/automation/daily-code/current
```

Ожидается:

1. ответ без `401`
2. валидное окно daily code

## 3. Aroma Atelier

1. Открыть guest frontend.
2. Пройти `18+`.
3. Ввести актуальный daily code.
4. Проверить загрузку знакомства.
5. Проверить, что рекомендации открываются после онбординга.
6. Проверить, что карточка микса открывается после `Выбрать`.

## 4. Master

1. Открыть `Мастер`.
2. Войти под admin.
3. Проверить загрузку:
   - дашборда
   - кодов доступа
   - staff accounts
   - Telegram-чатов
4. Убедиться, что CRUD-экраны открываются без client-side ошибок.

## 5. Telegram bot

1. Проверить, что process жив:
   - `systemctl status nomad-telegram-bot`
   - или `pm2 status`
2. Проверить, что bot может достучаться до Telegram API.
3. Проверить `/whoami`.
4. Проверить `/code`.
5. Проверить `/rotate` в разрешённом чате.
6. Убедиться, что новый code появился в backend.

## 6. Bootstrap admin

1. Если production admin ещё не заведён, выполнить:

```bash
cd apps/backend
NOMAD_BOOTSTRAP_ADMIN_LOGIN=nomad-admin \
NOMAD_BOOTSTRAP_ADMIN_NAME="Nomad Admin" \
NOMAD_BOOTSTRAP_ADMIN_PASSWORD='<secret>' \
DATABASE_URL='postgresql://...' \
npm run bootstrap:admin
```

2. После этого проверить login через `Мастер`.

## 7. Stop conditions

Останавливать rollout и переводить в incident/rollback режим, если:

1. backend отдаёт `401` на automation endpoint при корректном ключе;
2. Telegram bot не стартует или циклически рестартует;
3. guest flow не доходит до карточки микса;
4. admin login невозможен после deploy;
5. daily code rotate ломает текущий доступ.
