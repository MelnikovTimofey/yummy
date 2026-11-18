Three blurred, screen-blended orbs in the mix's flavour-profile colours. Where a mix has a flavour photo (#592: row 44, recommendation hero 64, showcase poster, mix sheet header) the photo takes its place; the glyph is the fallback there and stays as is on the smoke confirmation and in the Mixer.

```jsx
<ProfileGlyph profiles={mix.flavorProfiles} size={64} />
```

- Sizes in use upstream: 44 (catalog/showcase rows), 56 (default), 60 (rail rows), 64 (recommendation hero), 72 (mix sheet), 96 (smoke confirmation).
- Always `aria-hidden` — it is decoration; the mix name carries the meaning.
- Never replace with an emoji or icon. Swap for a photo only in the five places of the canon (readme, «Фото вкусов»).
- Only where it shows the profiles of a concrete mix or tobacco. Never as an illustration of an empty screen, a sign-in prompt or an invitation (no hard-coded `['berry','citrus','minty']`).
