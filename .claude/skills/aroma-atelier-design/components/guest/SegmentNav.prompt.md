The guest app's only navigation — 2–3 equal-width uppercase segments under the wordmark.

```jsx
<SegmentNav
  value={tab}
  onChange={setTab}
  items={[{ id: 'recommendations', label: 'Подбор' }, { id: 'showcase', label: 'Витрина' }, { id: 'catalog', label: 'Каталог' }]}
/>
```

- Max 3 segments; labels are one word where possible.
- Active segment is oxblood with cream ink — the same fill as `AromaCTA`, so never show an active segment and a pulsing CTA in the same viewport band.
