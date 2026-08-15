Tappable mix row — opens the mix sheet. Used in Каталог (glyph 44), рейл (glyph 60) and Подбор (no glyph, with signature).

```jsx
<MixRow name="Морозная ягода" profiles={['berry','fresh']} flavors={['земляника','лесные ягоды']} rating={4.6} onClick={open} />
<MixRow name="Космокола" profiles={['sweet']} rating={4.3} showGlyph={false} showSignature />
```

Rows are 8px apart in a grid; the whole row is the hit target. Hover only lifts the border to `rgba(176,74,62,0.40)` — no elevation change.
