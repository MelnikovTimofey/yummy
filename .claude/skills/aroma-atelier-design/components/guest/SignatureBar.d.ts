/** Hairline flavour signature under a mix name — 3px in rows, 4px in sheets, 6px on the hero. */
export interface SignatureBarProps {
  profiles: string[];
  height?: number;
  radius?: number;
}
export function SignatureBar(props: SignatureBarProps): JSX.Element | null;
