The one text input in the guest app: the daily code the мастер зала tells the guest.

```jsx
<AccessCodeInput value={code} onChange={setCode} />
```

Strips non-digits, caps at 4 characters. No filled field, no border box — a single hairline underline that turns `--accent-hover` on focus.
