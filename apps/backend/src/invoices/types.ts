// Координаты — из transform текстового элемента pdfjs: x слева направо, y снизу вверх.
export type TextItem = { str: string; x: number; y: number; w: number; h: number };
export type TextPage = TextItem[];
