Opens every Мастер screen: 36px serif title, actions on the right.

```jsx
<MasterPageHeader
  title="Каталог миксов"
  meta="Обновлено в 14:05"
  actions={<MasterButton variant="primary">Новый микс</MasterButton>}
/>
<MasterPageHeader
  title="Доступ"
  subtitle="Код меняется каждый понедельник, операторы получают его командой /code."
/>
```

No eyebrow above the title. A subtitle only when it tells something the title and the actions don't — never a summary of the screen («Состав, наличие и видимость на витрине.»). Never stack two headers on one screen.
