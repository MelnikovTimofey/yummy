Onboarding profile picker tile (extracted from aroma-web's `.aroma-profile-card`).

```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
  <ProfileCard profile="sweet" label="Сладкий" active onClick={toggle} />
  <ProfileCard profile="citrus" label="Цитрусовый" onClick={toggle} />
</div>
```

Multi-select, no confirmation per tap; 52px min height keeps the target thumb-safe.
