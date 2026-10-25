Guest-side chip for flavour filters and mix tags — the only multi-select control in the guest app.

```jsx
<AromaChip profile="citrus" active onClick={toggle}>Цитрусовый</AromaChip>
<AromaChip tier="lg" profile="berry" active>Ягодный</AromaChip>
<AromaChip>клубника</AromaChip>
```

- Chip labels stay sentence case (profiles) or raw lowercase flavour notes ("клубника") — uppercase belongs to `.aroma-caps` and the CTA only.
- Horizontal chip rails scroll with hidden scrollbars; chips never wrap inside a rail.
- В активном состоянии точка профиля осветляется (62% профильного цвета + кремовый) и получает чёткое тёмное кольцо в 1px — размытых гало под точкой не делать, они мутнят заливку.
- Active state = deep wine fill with cream ink (`--guest-chip-bg-on` / `--guest-chip-ink-on`) at weight 600, plus a light hairline border — never oxblood text on a wine tint, that reads washed out.
