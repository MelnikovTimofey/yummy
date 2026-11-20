Poster inside a horizontally scrolling Витрина shelf. The shelf header (Literata 19px, kind icon on the left, `chevron-right` on the right) opens the full rail screen; the poster opens the mix sheet.

```jsx
<div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 20px', scrollSnapType: 'x proximity', scrollPaddingInline: 20 }}>
  <ShowcaseCard name="Тропики" profiles={['fruity','dessert']} rating={4.5} onClick={open} />
</div>
```

Fixed 156×92 — about two posters per phone width, the third peeks from the edge. With a flavour photo (#592) the photo fills the whole poster, a charcoal gradient darkens the bottom under the name (cream text ≥ 4.5:1), no profile tint and no glyph; the compact rating stays top-right. Without a photo: glyph 28 top-left over the profile-tinted surface. No rating when the mix has no guest ratings, the name does not move, the name clamps to two lines, a 2px signature runs along the bottom edge. No flavours on the poster: they live in the mix sheet.
