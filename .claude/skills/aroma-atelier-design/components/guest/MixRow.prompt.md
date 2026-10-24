Tappable mix row, opens the mix sheet. The same row in every guest list: Подбор, Каталог, подборки, «Для вас», кабинет. Glyph is always 44.

```jsx
<MixRow name="Морозная ягода" profiles={['berry','fresh']} flavors={['земляника','лесные ягоды']} rating={4.6} onClick={open} />
<MixRow name="Космокола" profiles={['sweet']} rating={4.3} />
<MixRow name="Тропики" profiles={['fruity','dessert']} rating={null} />
```

Flavours are joined by commas, at most three. A 3px `SignatureBar` sits under the name.

`rating={null}` — the mix has no guest ratings, the row shows no pill (see `RatingPill`).

Rows are 8px apart in a grid; the whole row is the hit target. Hover only lifts the border to `--accent-border`, no elevation change.
