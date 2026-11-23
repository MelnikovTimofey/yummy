Server-side sort selector for Инвентаризация / Миксы toolbars.

```jsx
<MasterSortPill value={sort} onChange={setSort} options={[
  { key: 'name', label: 'По названию' },
  { key: 'updatedAt', label: 'По изменению' },
  { key: 'popularity', label: 'По популярности' },
]} />
```

Labels start with «По …». The pill shows only the field («По спросу ⌄»), the popover picks only the field.

Server-side direction (Каталог, Миксы) is a separate 28×28 mini-button right next to the pill, same surface and border: lucide `ArrowDown` for descending, `ArrowUp` for ascending; click flips the direction and keeps the field. Its `aria-label`/`title` names the current direction: «Направление сортировки: по убыванию». Picking another field resets direction to the field's natural one. Lists without direction (Полка) show the pill alone. On phones the pill is not in the toolbar: sorting lives in the «Фильтры» sheet.
