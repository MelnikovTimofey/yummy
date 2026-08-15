Stands in for product imagery: three blurred, screen-blended orbs in the mix's flavour-profile colours.

```jsx
<ProfileGlyph profiles={mix.flavorProfiles} size={64} />
```

- Sizes in use upstream: 44 (catalog/showcase rows), 56 (default), 60 (rail rows), 64 (recommendation hero), 72 (mix sheet), 96 (smoke confirmation).
- Always `aria-hidden` — it is decoration; the mix name carries the meaning.
- Never replace with an emoji, icon or photo.
