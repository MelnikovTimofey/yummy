The mix recipe, shown in the mix sheet and the smoke-confirmation card.

```jsx
<CompositionStack components={[
  { id: '1', name: 'Wildberry', manufacturer: 'Darkside', proportion: 40 },
  { id: '2', name: 'Red Tea', manufacturer: 'Darkside', proportion: 50 },
  { id: '3', name: 'Supernova', manufacturer: 'Darkside', proportion: 10 },
]} />
```

- Manufacturer is uppercase micro-caps, tobacco name is normal weight, share is oxblood and tabular.
- Shares are Russian-formatted (`40%`, `12,5%`); components sort by share descending.
- Colours come from `--composition-*` (a data ramp), not from the flavour-profile colours.
