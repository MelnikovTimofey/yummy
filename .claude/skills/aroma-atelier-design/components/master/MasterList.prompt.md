Operational table — the core of every Мастер module.

```jsx
<MasterList
  onRowClick={openEditor}
  columns={[
    { key: 'name', label: 'ТАБАК', width: 'minmax(0,2fr)' },
    { key: 'manufacturer', label: 'ПРОИЗВОДИТЕЛЬ' },
    { key: 'stock', label: 'НАЛИЧИЕ', width: '120px', render: (r) => <MasterToggle checked={r.inStock} label="В наличии" /> },
  ]}
  rows={items}
/>
```

- Header labels are uppercase tracked sans 10.5px (weight 500); first column is the primary cell (500 weight).
- Rows are 44px min, hover `--bg-elevated`, selected `--accent-soft`; the whole row opens the drawer editor.
- Paginate (page + pageSize) rather than rendering the whole catalogue; abbreviate to a handful of rows in mockups.
