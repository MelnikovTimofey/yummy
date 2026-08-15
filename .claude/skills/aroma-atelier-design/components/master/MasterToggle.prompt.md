Binary operational state — in stock / out of stock, rail active, operator enabled.

```jsx
<MasterToggle checked={item.inStock} onChange={toggle} label="В наличии" />
```

Toggles apply immediately (optimistic), no Save button; pair with a status word next to it («В наличии» / «Нет в наличии»).
