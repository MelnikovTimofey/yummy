Filter toggle in a Мастер toolbar row.

```jsx
<FilterChip active count={3} onClick={open}>Производитель</FilterChip>
<FilterChip onClick={open}>Вкусы</FilterChip>
```

Filter groups sit in a rigid desktop grid — never let them stretch into equal-height empty blocks. Always offer «Сбросить» next to the group row.
