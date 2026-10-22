// Тумблер полки: «Держим постоянно», «Стоп для гостей».
export const ShelfToggle = ({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className={`toggle ${checked ? 'toggle--on' : 'toggle--off'}`}
    onClick={() => onChange(!checked)}
  >
    <span className="toggle__track" aria-hidden="true">
      <span className="toggle__thumb" />
    </span>
  </button>
);
