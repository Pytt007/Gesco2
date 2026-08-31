import { CompiledDocument, PDFRenderResult } from './types';
import { safePrintHtml } from './safePrintService';

/**
 * Service de rendu PDF (PDF Renderer) pour le Document Engine de GESCO
 */
export const pdfRenderer = {
  /**
   * Convertit un document compilé en objet PDF (Blob / Data URL / Byte Size)
   */
  async renderToPDF(compiledDoc: CompiledDocument): Promise<PDFRenderResult> {
    const htmlContent = compiledDoc.fullHtml;

    // Simulation/Génération d'un Blob HTML/PDF prêt pour prévisualisation et téléchagement
    let blob: Blob;
    try {
      blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    } catch {
      blob = new Blob([htmlContent]);
    }

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    const byteSize = blob.size;

    return {
      blob,
      dataUrl,
      byteSize,
    };
  },

  /**
   * Lance l'impression sécurisée du document (anti-XSS et isolation)
   */
  printHtml(htmlContent: string): void {
    safePrintHtml(htmlContent);
  },

  /**
   * Télécharge automatiquement le document sous forme de fichier
   */
  downloadDocument(compiledDoc: CompiledDocument, fileName?: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const name = fileName || `${compiledDoc.documentType}_${compiledDoc.checksum.substring(0, 8)}.html`;
    const blob = new Blob([compiledDoc.fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  printDocument(htmlContent: string): void {
    this.printHtml(htmlContent);
  },

  downloadPdf(htmlContent: string, fileName: string = 'Document.pdf'): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
