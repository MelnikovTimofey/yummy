Average guest rating, right-aligned in every mix row and card head.

```jsx
<RatingPill rating={4.6} count={128} />
<RatingPill rating={4.2} style={{ marginLeft: 'auto' }} />
```

Always formats as `4,6` (comma) — Russian locale. One star glyph only; never a 5-star row outside the rating control inside the mix sheet.
