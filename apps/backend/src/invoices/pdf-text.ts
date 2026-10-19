import { pathToFileURL } from 'node:url';
import type { TextPage } from './types';

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

// pdfjs-dist 4 поставляется только как ESM, а tsc в CommonJS переписал бы import() в require().
const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<PdfJs>;

let pdfjs: Promise<PdfJs> | null = null;
const loadPdfJs = () => {
  pdfjs ??= importEsm(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
  return pdfjs;
};

const round = (value: number) => Math.round(value * 100) / 100;

export const extractTextItems = async (buffer: Uint8Array): Promise<TextPage[]> => {
  const { getDocument } = await loadPdfJs();
  const document = await getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;

  try {
    const pages: TextPage[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: TextPage = [];
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) {
          continue;
        }
        items.push({
          str: item.str,
          x: round(item.transform[4]),
          y: round(item.transform[5]),
          w: round(item.width),
          h: round(item.height),
        });
      }
      pages.push(items);
    }
    return pages;
  } finally {
    await document.destroy();
  }
};
