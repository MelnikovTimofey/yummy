import type { MixEditorComponentInput } from '@/components/mixes/mix-catalog-view';

const parsePercent = (value: string) => {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const toPercentString = (value: number) => String(value);

// Equal split с распределением остатка — из прототипа rebalanceTo100.
export const rebalanceTo100 = (components: MixEditorComponentInput[]): MixEditorComponentInput[] => {
  if (!components.length) return components;
  const eq = Math.floor(100 / components.length);
  const rem = 100 - eq * components.length;
  return components.map((component, index) => ({
    ...component,
    proportion: toPercentString(eq + (index < rem ? 1 : 0)),
  }));
};

// Пересчёт долей при изменении одного компонента — пропорционально
// распределяем оставшиеся 100 - X% между остальными, с минимумом 1%.
export const redistributeAround = (
  components: MixEditorComponentInput[],
  changedKey: string,
  nextPercent: number,
): MixEditorComponentInput[] => {
  const idx = components.findIndex((c) => c.key === changedKey);
  if (idx === -1) return components;
  const clamped = Math.max(1, Math.min(99, Math.round(nextPercent)));
  const updated = components.map((c, i) =>
    i === idx ? { ...c, proportion: toPercentString(clamped) } : c,
  );
  const others = updated.filter((_, i) => i !== idx);
  if (!others.length) {
    return [{ ...updated[idx], proportion: toPercentString(100) }];
  }
  const remaining = Math.max(0, 100 - clamped);
  const othersTotal = others.reduce((s, c) => s + parsePercent(c.proportion), 0) || 1;
  const balanced = updated.map((c, i) => {
    if (i === idx) return c;
    const share = parsePercent(c.proportion) / othersTotal;
    return { ...c, proportion: toPercentString(Math.max(1, Math.round(remaining * share))) };
  });
  // Нормализуем до 100 — остаток отдаём первому компоненту, который не редактировался.
  const sum = balanced.reduce((s, c) => s + parsePercent(c.proportion), 0);
  const diff = 100 - sum;
  if (diff !== 0) {
    const correctIdx = balanced.findIndex((_, i) => i !== idx);
    if (correctIdx !== -1) {
      balanced[correctIdx] = {
        ...balanced[correctIdx],
        proportion: toPercentString(parsePercent(balanced[correctIdx].proportion) + diff),
      };
    }
  }
  return balanced;
};

// Из прототипа ProportionBar.useEffect.move — перераспределение при
// перетаскивании ручки между сегментами idx и idx+1.
export const resizeFromHandle = (
  components: MixEditorComponentInput[],
  handleIndex: number,
  newPercentAtHandle: number,
): MixEditorComponentInput[] => {
  if (handleIndex < 0 || handleIndex >= components.length - 1) return components;
  const before = components
    .slice(0, handleIndex)
    .reduce((s, c) => s + parsePercent(c.proportion), 0);
  const after = components
    .slice(handleIndex + 1)
    .reduce((s, c) => s + parsePercent(c.proportion), 0);
  const next = newPercentAtHandle - before;
  if (next < 1 || after < components.length - handleIndex - 1) return components;
  const taken = next;
  const remaining = 100 - before - taken;
  const rest = components.slice(handleIndex + 1);
  const restTotal = rest.reduce((s, c) => s + parsePercent(c.proportion), 0) || 1;
  const updated = components.map((c, i) => {
    if (i < handleIndex) return c;
    if (i === handleIndex) return { ...c, proportion: toPercentString(taken) };
    const share = parsePercent(c.proportion) / restTotal;
    return { ...c, proportion: toPercentString(Math.max(1, Math.round(remaining * share))) };
  });
  const sum = updated.reduce((s, c) => s + parsePercent(c.proportion), 0);
  const diff = 100 - sum;
  if (diff !== 0) {
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      proportion: toPercentString(parsePercent(updated[updated.length - 1].proportion) + diff),
    };
  }
  return updated;
};

export const componentPercent = (component: MixEditorComponentInput) =>
  parsePercent(component.proportion);

export const componentsTotal = (components: MixEditorComponentInput[]) =>
  components.reduce((sum, c) => sum + parsePercent(c.proportion), 0);
