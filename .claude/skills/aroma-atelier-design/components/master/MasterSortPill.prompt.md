Server-side sort selector for Инвентаризация / Миксы toolbars.

```jsx
<MasterSortPill value={sort} onChange={setSort} options={[
  { key: 'name', label: 'По названию' },
  { key: 'updatedAt', label: 'По изменению' },
  { key: 'popularity', label: 'По популярности' },
]} />
```

Sort direction is a separate control upstream. Labels start with «По …».
