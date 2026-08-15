/** Mix identity mark — no photography anywhere in the guest app, this stands in for it. */
export interface ProfileGlyphProps {
  /** Flavour-profile ids; only the first three are drawn. */
  profiles: string[];
  /** Square size in px. 44 rows, 56 default, 64 hero, 72 sheet, 96 confirmation. */
  size?: number;
}
export function ProfileGlyph(props: ProfileGlyphProps): JSX.Element;
