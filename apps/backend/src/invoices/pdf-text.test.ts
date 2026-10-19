import assert from 'node:assert/strict';
import test from 'node:test';
import { extractTextItems } from './pdf-text';

const buildPdf = (content: string) => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
};

test('extractTextItems returns positioned text items per page', async () => {
  const pages = await extractTextItems(buildPdf('BT /F1 12 Tf 100 700 Td (Itogo:) Tj 80 0 Td ( ) Tj 20 0 Td (1550,00) Tj ET'));
  assert.equal(pages.length, 1);
  assert.deepEqual(
    pages[0].map(({ str, x, y, h }) => ({ str, x, y, h })),
    [
      { str: 'Itogo:', x: 100, y: 700, h: 12 },
      { str: '1550,00', x: 200, y: 700, h: 12 },
    ],
  );
  assert.ok(pages[0][0].w > 0);
});

test('extractTextItems returns empty pages for a PDF without a text layer', async () => {
  assert.deepEqual(await extractTextItems(buildPdf('')), [[]]);
});
