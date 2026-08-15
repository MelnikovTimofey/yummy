/**
 * Daily access-code field on the guest gate — digits only, 4 chars, underline-only chrome.
 *
 * @startingPoint section="Арома Ателье" subtitle="18+ gate and daily code entry" viewport="430x680"
 */
export interface AccessCodeInputProps {
  value: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: string;
  maxLength?: number;
  id?: string;
}
export function AccessCodeInput(props: AccessCodeInputProps): JSX.Element;
