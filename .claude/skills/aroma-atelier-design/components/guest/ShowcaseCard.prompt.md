Card inside a horizontally scrolling Витрина rail (rails: Редакция / Мастера / Выбор гостей).

```jsx
<div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 4px' }}>
  <ShowcaseCard name="Тропики" profiles={['fruity','dessert']} flavors={['банан','манго']} rating={4.5} onClick={open} />
</div>
```

Fixed 196px width, name reserves two lines so cards in a rail align. End every rail with the dashed «Все» affordance (64px wide) that opens the full rail screen.
