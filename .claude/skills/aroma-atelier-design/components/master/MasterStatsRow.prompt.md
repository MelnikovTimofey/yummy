Four operational numbers under the Дашборд header — the shift's state at a glance.

```jsx
<MasterStatsRow tiles={[
  { label: 'В наличии', value: '1 204', hint: 'из 11 505 табаков' },
  { label: 'Видно гостю', value: 15, hint: 'миксов', tone: 'success' },
  { label: 'Заблокировано', value: 3, tone: 'warning' },
  { label: 'Код смены', value: '4821', tone: 'code' },
]} />
```

Дашборд only. Module screens (Полка, Поставки) don't repeat their numbers as tiles: the counts already live in the status filter chips and the rows. Labels are sentence case; a hint only when it adds a fact.
