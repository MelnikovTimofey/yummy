Search and form field for Мастер.

```jsx
<MasterInput icon={<i data-lucide="search" />} placeholder="Поиск по названию или производителю" value={q} onChange={setQ} />
<MasterInput size="lg" placeholder="admin" />
```

Focus = accent border + 3px `--accent-soft` ring. Search fields are debounced upstream; never fire a request per keystroke.
