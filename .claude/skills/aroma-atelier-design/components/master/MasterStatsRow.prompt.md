Four operational numbers under the page header — the shift's state at a glance.

```jsx
<MasterStatsRow tiles={[
  { label: 'В НАЛИЧИИ', value: '1 204', hint: 'из 11 505 табаков' },
  { label: 'ВИДЕН ГОСТЮ', value: 15, hint: 'миксов на витрине', tone: 'success' },
  { label: 'ЗАБЛОКИРОВАНО', value: 3, hint: 'режет наличие', tone: 'warning' },
  { label: 'КОД СМЕНЫ', value: '4821', tone: 'code' },
]} />
```

Exactly 4 tiles reads best; global KPIs live only on Дашборд, module stats live in that module's header.
