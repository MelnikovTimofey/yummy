## Этот файл для человека

Текущее состояние каталога (на 23 февраля 2026):
- Для табаков и миксов используется HookahPortal как test-source.
- Добавлен локальный JSON-кеш:
  - `services/catalog-updater/cache/hookahportal/tobaccos.json`
  - `services/catalog-updater/cache/hookahportal/mixes.json`
- Последний импорт в БД после полной очистки каталога:
  - `Manufacturer=69`
  - `Tobacco=2528`
  - `Mix=508`
  - `MixComponent=1652`
- Автор всех импортированных миксов: `hookahportal`.

Что важно помнить:
1. Источник HookahPortal включается только при `CATALOG_ALLOW_TEST_SOURCES=true`.
2. `local-seed` сейчас используется только для табаков (без миксов).
3. Часть миксов отбрасывается валидатором (некорректные пропорции/компоненты).

Следующие шаги:
1. Добавить команду `npm run cache:refresh:hookahportal`.
2. Добавить команду `npm run catalog:refresh:from-cache`.
3. Сохранить отчёт о последнем импорте (JSON артефакт со stats/issues).
4. Решить стратегию для миксов с суммой пропорций != 100 (нормализация или soft-skip).
