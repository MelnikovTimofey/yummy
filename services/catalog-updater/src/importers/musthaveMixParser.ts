export type MustHaveMixComponent = {
  manufacturer: string;
  tobacco: string;
  proportion: number;
};

export type MustHaveParsedMix = {
  name: string;
  description: string;
  components: MustHaveMixComponent[];
};

export const stripHtml = (html: string) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  return withoutScripts.replace(/<[^>]+>/g, '\n');
};

export const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»');

const isYearLine = (line: string) => /^(19|20)\d{2}$/.test(line);

const extractLines = (html: string) =>
  decodeHtml(stripHtml(html))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const extractMix = (html: string, id: number): MustHaveParsedMix | null => {
  const lines = extractLines(html);

  const idLineIndex = lines.findIndex((line) => line.includes(`#ID ${id}`));
  if (idLineIndex < 0) {
    return null;
  }

  const name = lines[idLineIndex - 1] ?? lines[idLineIndex + 1];
  if (!name || isYearLine(name) || name.includes('#ID')) {
    return null;
  }

  const yearIndex = lines.findIndex(isYearLine);
  const description =
    yearIndex >= 0 && lines[yearIndex + 2]
      ? lines[yearIndex + 2]
      : lines.find((line) => line.length > 10 && !line.includes('#ID')) ?? '';

  const components: MustHaveMixComponent[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (!/^\d{1,3}%$/.test(lines[i])) {
      continue;
    }

    const proportion = Number(lines[i].replace('%', ''));
    const tobacco = lines[i - 1];
    if (!tobacco || /^\d+$/.test(tobacco)) {
      continue;
    }

    if (tobacco.toLowerCase().includes('musthave')) {
      continue;
    }

    components.push({ manufacturer: 'MUSTHAVE', tobacco, proportion });
  }

  const unique = new Map<string, MustHaveMixComponent>();
  for (const component of components) {
    unique.set(component.tobacco, component);
  }

  return {
    name,
    description,
    components: Array.from(unique.values()),
  };
};
