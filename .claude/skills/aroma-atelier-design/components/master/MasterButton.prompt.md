The console's button — use for every staff action in Мастер.

```jsx
<MasterButton variant="primary">Сохранить</MasterButton>
<MasterButton size="sm">Открыть</MasterButton>
<MasterButton variant="danger">Удалить</MasterButton>
<MasterButton variant="ghost" icon={<i data-lucide="plus" />}>Новый микс</MasterButton>
```

- One `primary` per screen; destructive actions are outlined (`danger`), never a filled red button.
- Labels are short Russian imperatives, sentence case: «Сохранить», «Открыть», «Вернуть в наличие».
- Press state is a 1px downward shift, no scale.
