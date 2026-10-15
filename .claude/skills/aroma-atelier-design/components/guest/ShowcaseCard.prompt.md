Poster inside a horizontally scrolling Витрина shelf. The shelf header (Literata 19px, kind icon on the left, `chevron-right` on the right) opens the full rail screen; the poster opens the mix sheet.

```jsx
<div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 20px', scrollSnapType: 'x proximity', scrollPaddingInline: 20 }}>
  <ShowcaseCard name="Тропики" profiles={['fruity','dessert']} rating={4.5} onClick={open} />
</div>
```

Fixed 156×92 — about two posters per phone width, the third peeks from the edge. Glyph 28 and a compact rating on top, the name clamps to two lines, a 2px signature runs along the bottom edge. No flavours on the poster: they live in the mix sheet.
