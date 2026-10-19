Average guest rating, right-aligned in every mix row and card head.

```jsx
<RatingPill rating={4.6} count={128} />
<RatingPill rating={4.2} style={{ marginLeft: 'auto' }} />
```

Always formats as `4,6` (comma) — Russian locale. One star glyph only; never a 5-star row outside the rating control inside the mix sheet.

**No guest ratings — no pill.** When a mix has `ratingsCount === 0`, its `avgRating` is the master's base value (4,5 by default), not a guest average, so the pill is not rendered at all — no `★ 4,5`, no `★ —`, no placeholder. This holds on every guest screen: Подбор, Витрина poster, подборка, Каталог, the similar mix in Миксер. Pass `rating={null}` to `MixRow` / `ShowcaseCard`. The guest's first rating makes the pill appear right away.

```jsx
{mix.ratingsCount > 0 ? <RatingPill rating={mix.avgRating} /> : null}
<MixRow name={mix.name} rating={mix.ratingsCount ? mix.avgRating : null} />
```
