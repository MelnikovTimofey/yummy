## Contour

- [ ] `Nomad`

## Bounded Context

Опишите один bounded context, который закрывает этот PR.

## Touched Paths

Перечислите изменённые Nomad-пути:

- `apps/aroma-web/...`
- `apps/master-web/...`
- `apps/backend/...`
- `services/telegram-bot/...`
- `docs/process paths`, если были затронуты

## Write Scope

Опишите фактический write scope и что осталось вне него.

## Checks Run

Перечислите только реально выполненные команды:

```bash
# example
cd apps/backend && npm test
cd apps/backend && npm run build
```

## Docs Updated

Отметьте, какие документы были обновлены:

- [ ] `CLAUDE.md`
- [ ] `.claude/` (агенты или скиллы)
- [ ] `README.md`
- [ ] `no docs changes required`

## Risks / Human Review Needed

Опишите:

1. какие риски остались;
2. нужен ли `Human Review`;
3. попадает ли PR в одну из категорий:
   - schema/auth/env/runtime
   - public contract
   - process / workflow / skills
   - incomplete verification
