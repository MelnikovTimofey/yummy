One bordeaux primary action per guest screen — the only button that ever reads as filled.

```jsx
<AromaCTA pulse onClick={choose}>Покурить</AromaCTA>
<AromaCTA disabled>Уже в карточке</AromaCTA>
```

- `pulse` runs the `aroma-ember` ring animation (respects `prefers-reduced-motion`). It belongs to one button in the whole guest app: «Покурить» in the mix sheet. Every other CTA is still.
- Copy is uppercase Russian, imperative, no period: «Покурить», «Далее», «Показать подбор», «Готово». This and the Мастер table heads are the only uppercase in the system; secondary buttons are sentence case.
- Never place two AromaCTA side by side — pair it with a ghost button (`.aroma-mix-sheet-ghost` pattern) on the left.
