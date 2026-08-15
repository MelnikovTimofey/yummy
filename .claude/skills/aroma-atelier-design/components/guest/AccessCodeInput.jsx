// Daily-code field: no box, one hairline underline, huge tracked serif digits.
export function AccessCodeInput({ value, onChange, label = 'Код мастера', hint = 'Спросите у мастера зала — действует до 06:00.', maxLength = 4, id = 'guest-access-code' }) {
  return (
    <div style={{ display: 'grid', gap: 0 }}>
      <label htmlFor={id} className="aroma-caps" style={{ textAlign: 'left' }}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        spellCheck={false}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))}
        style={{
          width: '100%',
          marginTop: 8,
          background: 'transparent',
          border: 0,
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 0',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 40,
          letterSpacing: '0.32em',
          textAlign: 'center',
          textTransform: 'uppercase',
          outline: 'none',
          caretColor: 'var(--accent-hover)',
        }}
      />
      {hint ? <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', fontSize: 11.5, lineHeight: 1.4, textAlign: 'center' }}>{hint}</p> : null}
    </div>
  );
}
