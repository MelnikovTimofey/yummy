2–3 equal-width uppercase segments — a switch between equal views inside one screen.

Not the guest app's main navigation: since #168 that is the bottom icon bar (Подбор · Витрина · Каталог · Миксер, see `ui_kits/aroma-guest`).

```jsx
<SegmentNav
  value={tab}
  onChange={setTab}
  items={[{ id: 'recommendations', label: 'Подбор' }, { id: 'showcase', label: 'Витрина' }, { id: 'catalog', label: 'Каталог' }]}
/>
```

- Max 3 segments; labels are one word where possible.
- Active segment is quiet — graphite fill, cream ink and a 2px bordeaux mark at the bottom. Solid accent is reserved for `AromaCTA`, so navigation never competes with the primary action.
