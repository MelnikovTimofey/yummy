Opens every Мастер screen: mono eyebrow → 36px serif title → one-line lead, actions on the right.

```jsx
<MasterPageHeader
  eyebrow="МЕНЕДЖЕР МИКСОВ"
  title="Каталог миксов"
  subtitle="Состав, наличие и видимость на витрине."
  meta="Актуально"
  actions={<MasterButton variant="primary">Новый микс</MasterButton>}
/>
```

Subtitles are one plain sentence with a period. Never stack two headers on one screen.
