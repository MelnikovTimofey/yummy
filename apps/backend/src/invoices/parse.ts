import type { TextItem, TextPage } from './types';

export type InvoiceLine = {
  n: number;
  article?: string;
  name: string;
  qty: number;
  unit: string;
  priceKop: number;
  sumKop: number;
};

export type InvoiceSupplier = { name: string; inn: string | null };

export type ParsedInvoice =
  | {
      kind: 'ok';
      format: 'a' | 'b';
      supplier: InvoiceSupplier;
      number: string | null;
      date: string | null;
      lines: InvoiceLine[];
      totalKop: number | null;
      linesSumKop: number;
      sumMatches: boolean;
    }
  | { kind: 'no-text' }
  | { kind: 'unknown-format' };

type Column = 'n' | 'article' | 'name' | 'qty' | 'unit' | 'price' | 'sum';

type InvoiceFormat = {
  format: 'a' | 'b';
  header: Array<[label: string, column: Column]>;
  supplier: (pages: TextPage[]) => InvoiceSupplier;
};

type HeaderCell = { column: Column; x: number };
type Header = { y: number; cells: HeaderCell[] };
type Cell = { item: TextItem; column: Column };

const SAME_ROW = 2;
// В формате B номер строки стоит посередине переносов названия, а первая строка названия
// бывает чуть выше номера — полоса строки начинается немного выше якоря.
const ROW_OVERHANG = 5;

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const TITLE = /^сч[её]т(?:\s+на\s+оплату)?\s*№\s*(\S+)\s+от\s+(.+?)(?:\s*г\.?)?$/i;

const text = (item: TextItem) => item.str.trim();

const joinText = (items: TextItem[]) => items.map(text).join(' ').replace(/\s+/g, ' ').trim();

const sameRow = (a: TextItem, b: TextItem) => Math.abs(a.y - b.y) <= SAME_ROW;

const rowRightOf = (page: TextPage, label: TextItem) =>
  page.filter((item) => item !== label && sameRow(item, label) && item.x > label.x).sort((a, b) => a.x - b.x);

const parseKop = (value: string) => {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.replace(/\s/g, ''));
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '0').padEnd(2, '0')) : null;
};

const parseQty = (value: string) => (/^\d+(?:[.,]\d+)?$/.test(value) ? Number(value.replace(',', '.')) : null);

const pad = (value: number) => String(value).padStart(2, '0');

const parseDate = (value: string) => {
  const numeric = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (numeric) {
    return `${numeric[3]}-${pad(Number(numeric[2]))}-${pad(Number(numeric[1]))}`;
  }
  const verbal = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(value);
  const month = verbal ? MONTHS.indexOf(verbal[2].toLowerCase()) + 1 : 0;
  return verbal && month ? `${verbal[3]}-${pad(month)}-${pad(Number(verbal[1]))}` : null;
};

const findInn = (value: string) => /ИНН\s*(\d{12}|\d{10})(?!\d)/.exec(value)?.[1] ?? null;

const supplierFromLabel = (pages: TextPage[]): InvoiceSupplier => {
  for (const page of pages) {
    const label = page.find((item) => text(item) === 'Поставщик:');
    if (label) {
      const value = joinText(rowRightOf(page, label));
      return { name: value.split(/,\s*ИНН/)[0].trim(), inn: findInn(value) };
    }
  }
  return { name: '', inn: null };
};

const supplierFromLetterhead = (pages: TextPage[]): InvoiceSupplier => {
  const page = pages.find((items) => items.length > 0) ?? [];
  const top = page.reduce<TextItem | null>((best, item) => (!best || item.y > best.y ? item : best), null);
  const topRow = top ? page.filter((item) => sameRow(item, top)).sort((a, b) => a.x - b.x) : [];
  const innItem = [...page].sort((a, b) => b.y - a.y).find((item) => findInn(item.str));
  return { name: joinText(topRow), inn: innItem ? findInn(innItem.str) : null };
};

const FORMATS: InvoiceFormat[] = [
  {
    format: 'a',
    header: [
      ['№', 'n'],
      ['Артикул', 'article'],
      ['Товары (работы, услуги)', 'name'],
      ['Количество', 'qty'],
      ['Цена', 'price'],
      ['Сумма', 'sum'],
    ],
    supplier: supplierFromLabel,
  },
  {
    format: 'b',
    header: [
      ['№', 'n'],
      ['Наименование товара', 'name'],
      ['Цена', 'price'],
      ['Кол-во', 'qty'],
      ['Ед. изм.', 'unit'],
      ['Сумма', 'sum'],
    ],
    supplier: supplierFromLetterhead,
  },
];

const findHeader = (page: TextPage, format: InvoiceFormat): Header | null => {
  for (const anchor of page) {
    if (text(anchor) !== format.header[0][0]) {
      continue;
    }
    const row = page.filter((item) => sameRow(item, anchor));
    const cells: HeaderCell[] = [];
    for (const [label, column] of format.header) {
      const cell = row.find((item) => text(item) === label);
      if (!cell) {
        break;
      }
      cells.push({ column, x: cell.x });
    }
    if (cells.length === format.header.length) {
      return { y: anchor.y, cells: cells.sort((a, b) => a.x - b.x) };
    }
  }
  return null;
};

// Заголовки отцентрованы над колонками, а текст в ячейках прижат влево или вправо,
// поэтому элемент относится к самой правой колонке, чей заголовок начинается левее его правого края.
const columnOf = (header: Header, item: TextItem) => {
  let column: Column | null = null;
  for (const cell of header.cells) {
    if (cell.x <= item.x + item.w) {
      column = cell.column;
    }
  }
  return column;
};

const toLine = (n: number, cells: Cell[]): InvoiceLine => {
  const inColumn = (column: Column) =>
    cells
      .filter((cell) => cell.column === column)
      .map((cell) => cell.item)
      .sort((a, b) => b.y - a.y || a.x - b.x);

  // Артикул — одно слово; короткое название, не дотянувшееся до своего заголовка, попадает в колонку артикула.
  const [article, ...nameOverflow] = inColumn('article');
  const qtyItems = inColumn('qty');
  const qtyNumbers = qtyItems.filter((item) => parseQty(text(item)) !== null);
  const unitItems = inColumn('unit');

  return {
    n,
    ...(article ? { article: text(article) } : {}),
    name: joinText([...nameOverflow, ...inColumn('name')]),
    qty: parseQty(joinText(qtyNumbers)) ?? 0,
    unit: joinText(unitItems.length ? unitItems : qtyItems.filter((item) => !qtyNumbers.includes(item))),
    priceKop: parseKop(joinText(inColumn('price'))) ?? 0,
    sumKop: parseKop(joinText(inColumn('sum'))) ?? 0,
  };
};

const tableLines = (page: TextPage, header: Header, bottomY: number) => {
  const body: Cell[] = [];
  for (const item of page) {
    const column = item.y < header.y - SAME_ROW && item.y > bottomY ? columnOf(header, item) : null;
    if (column) {
      body.push({ item, column });
    }
  }

  const anchors = body
    .filter((cell) => cell.column === 'n' && /^\d+$/.test(text(cell.item)))
    .sort((a, b) => b.item.y - a.item.y);

  return anchors.map((anchor, index) => {
    const top = anchor.item.y + ROW_OVERHANG;
    const bottom = index + 1 < anchors.length ? anchors[index + 1].item.y + ROW_OVERHANG : bottomY;
    const cells = body.filter((cell) => cell.item.y <= top && cell.item.y > bottom);
    return toLine(Number(text(anchor.item)), cells);
  });
};

const findTotal = (page: TextPage) => {
  const label = page.find((item) => text(item) === 'Итого:');
  if (!label) {
    return null;
  }
  for (const item of rowRightOf(page, label)) {
    const kop = parseKop(text(item));
    if (kop !== null) {
      return { y: label.y, kop };
    }
  }
  return null;
};

const findTitle = (pages: TextPage[]) => {
  for (const page of pages) {
    for (const item of page) {
      const match = TITLE.exec(text(item));
      if (match) {
        return { number: match[1], date: parseDate(match[2]) };
      }
    }
  }
  return { number: null, date: null };
};

export const parseInvoice = (pages: TextPage[]): ParsedInvoice => {
  if (!pages.some((page) => page.some((item) => text(item)))) {
    return { kind: 'no-text' };
  }

  const format = FORMATS.find((candidate) => pages.some((page) => findHeader(page, candidate)));
  if (!format) {
    return { kind: 'unknown-format' };
  }

  const lines: InvoiceLine[] = [];
  let totalKop: number | null = null;
  for (const page of pages) {
    const header = findHeader(page, format);
    const total = findTotal(page);
    if (total) {
      totalKop = total.kop;
    }
    if (header) {
      lines.push(...tableLines(page, header, total?.y ?? Number.NEGATIVE_INFINITY));
    }
  }

  const linesSumKop = lines.reduce((sum, line) => sum + line.sumKop, 0);
  return {
    kind: 'ok',
    format: format.format,
    supplier: format.supplier(pages),
    ...findTitle(pages),
    lines,
    totalKop,
    linesSumKop,
    sumMatches: totalKop === linesSumKop,
  };
};
