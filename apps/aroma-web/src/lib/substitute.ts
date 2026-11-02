// Табак с полки вместо закончившегося компонента микса (#483, PRD §8.7 п.2).
// Гость видит его бренд и название, пропорция остаётся у исходного компонента.

export type ComponentSubstitute = { tobaccoId: string; manufacturer: string; name: string };

export const readSubstitute = (value: unknown): ComponentSubstitute | null => {
  if (typeof value !== 'object' || value === null) return null;
  const { tobaccoId, manufacturer, name } = value as Record<string, unknown>;
  if (typeof manufacturer !== 'string' || typeof name !== 'string' || !name) return null;
  return { tobaccoId: typeof tobaccoId === 'string' ? tobaccoId : '', manufacturer, name };
};

export const showSubstitute = <T extends { manufacturer: string; name: string }>(
  component: T,
  substitute: ComponentSubstitute | null | undefined,
) =>
  substitute
    ? { ...component, manufacturer: substitute.manufacturer, name: substitute.name, substituted: true }
    : { ...component, substituted: false };
