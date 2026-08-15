Мастер's only navigation: 5 module tabs in a sticky glass bar (Дашборд, Табаки, Миксы, Рейлы, Доступ).

```jsx
<MasterTopBar
  active={tab}
  onChange={setTab}
  items={[{ id: 'dashboard', label: 'Дашборд' }, { id: 'inventory', label: 'Табаки' }, { id: 'mixes', label: 'Миксы' }, { id: 'rails', label: 'Рейлы' }, { id: 'access', label: 'Доступ' }]}
  userName="admin" userRole="admin" onOpenCommandPalette={open} onSignOut={out}
/>
```

Arrow keys move between tabs upstream. Never reintroduce a wide sidebar — the width belongs to the tables.
