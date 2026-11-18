Tappable mix row, opens the mix sheet. The same row in every guest list: Подбор, Каталог, подборки, «Для вас», кабинет. The thumbnail is always 44: the flavour photo of the mix (#592, `mixPhotoSrc(photo, '132')`), or `ProfileGlyph` when no flavour is recognised, the mix was built by the guest or the photo fails to load. Same size, same radius, the row never shifts.

```jsx
<MixRow name="Морозная ягода" profiles={['berry','fresh']} flavors={['земляника','лесные ягоды']} rating={4.6} onClick={open} />
<MixRow name="Космокола" profiles={['sweet']} rating={4.3} />
<MixRow name="Тропики" profiles={['fruity','dessert']} rating={null} />
```

Flavours are joined by commas, at most three. A 3px `SignatureBar` sits under the name.

`rating={null}` — the mix has no guest ratings, the row shows no pill (see `RatingPill`).

Rows are 8px apart in a grid; the whole row is the hit target. Hover only lifts the border to `--accent-border`, no elevation change.
