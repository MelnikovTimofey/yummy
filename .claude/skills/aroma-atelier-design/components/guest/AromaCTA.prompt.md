One oxblood primary action per guest screen — the only button that ever reads as filled.

```jsx
<AromaCTA pulse onClick={choose}>Покурить</AromaCTA>
<AromaCTA disabled>Уже в карточке</AromaCTA>
```

- `pulse` runs the `aroma-ember` ring animation (respects `prefers-reduced-motion`); use it on the single next step, never on two CTAs at once.
- Copy is uppercase Russian, imperative, no period: «Покурить», «Далее», «Показать подбор», «Готово».
- Never place two AromaCTA side by side — pair it with a ghost button (`.aroma-mix-sheet-ghost` pattern) on the left.
