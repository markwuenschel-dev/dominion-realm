/** Minimal ambient types for build-time PDF generation (pdfkit has no bundled types). */
declare module 'pdfkit' {
  interface PDFDocument {
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    moveDown(n?: number): this;
    font(name: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, options?: object): this;
    addPage(): this;
    end(): void;
  }

  interface PDFDocumentOptions {
    size?: string;
    margins?: { top: number; bottom: number; left: number; right: number };
    info?: Record<string, unknown>;
  }

  const PDFDocument: {
    new (options?: PDFDocumentOptions): PDFDocument;
  };
  export default PDFDocument;
}
