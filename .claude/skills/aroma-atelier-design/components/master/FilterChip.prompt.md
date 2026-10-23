Filter toggle in a Мастер toolbar row.

```jsx
<FilterChip active count={3} onClick={open}>Заканчивается</FilterChip>
<FilterChip onClick={open}>Производитель</FilterChip>
```

`count` only on status filters, where the number is the information (Полка: «Заканчивается 3»). Attribute filters and Доступ filters carry no numbers.

Filter groups sit in a rigid desktop grid — never let them stretch into equal-height empty blocks. Always offer «Сбросить» next to the group row.
