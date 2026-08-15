repo: MelnikovTimofey/yummy
branch: main
path: apps

## Last sync

date: 2026-08-14T14:20:27Z

### Updated in this project

- Tokens rebuilt from the Film Noir palette (PRD §12) plus the guest brass/atmosphere layer.
- 28 components extracted: 14 guest primitives, 14 Мастер console primitives.
- 22 foundation specimen cards (Colors, Type, Spacing, Brand).
- Two UI kits recreated: гостевое приложение и консоль Мастера.
- Monospace removed entirely: the meta role (eyebrows, table heads, codes, kbd) is IBM Plex Sans via --font-meta (500 + tracking + tabular-nums).
- Brand decisions applied locally: brass CTA/segment/rating repainted to oxblood (PRD §12); original «Дым» logo authored (no logo upstream); Gelasio + Mulish canonised as guest families.

## Screen map

| Project file | Built from |
|---|---|
| `packages/design-tokens/{colors,typography,spacing,radius,elevation,motion}.css` (реэкспорт — `tokens/*.css`) | `PRD.md` §12, `apps/aroma-web/src/styles.css`, `apps/master-web/src/styles.css` |
| `packages/design-tokens/profile-colors.css` | `apps/aroma-web/src/lib/profile-color.ts`, `apps/aroma-web/src/App.tsx` (COMPOSITION_PALETTE) |
| `packages/design-tokens/guest-surface.css` | `apps/aroma-web/src/styles.css`, `apps/aroma-web/src/components/aroma/{CTA,Chip,SegmentNav,RatingPill}.tsx` |
| `packages/design-tokens/fonts.css` | `apps/aroma-web/src/styles.css` (`--font-display`, `--font-body`), `apps/master-web/src/styles.css` (fontsource imports) |
| `components/guest/*` | `apps/aroma-web/src/components/aroma/*`, `apps/aroma-web/src/components/ui/*`, `apps/aroma-web/src/styles.css` |
| `components/master/*` | `apps/master-web/src/components/shell/*`, `apps/master-web/src/components/ui/*`, `apps/master-web/src/styles.css` |
| `ui_kits/aroma-guest/*` | `apps/aroma-web/src/App.tsx`, `apps/aroma-web/src/styles.css`, `docs/data/top-20-mixes.md` |
| `ui_kits/master/*` | `apps/master-web/src/App.tsx`, `apps/master-web/src/components/{auth,dashboard,inventory,mixes,rails,access,shell}/*`, `apps/master-web/src/styles.css` |
| `assets/logo-master-mark.svg` | `apps/master-web/public/favicon.svg` |
| `assets/logo-mark*.svg`, `assets/logo-lockup.svg`, `assets/favicon.svg` | authored here — no logo exists upstream |
| `guidelines/iconography.card.html` | `apps/*/components.json` (`iconLibrary: lucide`), `apps/master-web/src/components/shell/workspace-tabs.ts` |
