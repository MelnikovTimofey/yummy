const COMPOSITION_RAMP_SIZE = 5;

// Цвет доли — по позиции компонента в составе: сегмент полосы пропорций и
// метка строки состава совпадают, а соседние доли не сливаются.
export const compositionColor = (index: number) =>
  `var(--composition-${(index % COMPOSITION_RAMP_SIZE) + 1})`;
