/**
 * GESCO — Service Sécurisé d'Impression Documentaire
 * Assainit le contenu HTML contre les attaques XSS et gère
 * l'impression de façon isolée et robuste sans fuite mémoire.
 */

/**
 * Assainit une chaîne HTML pour l'impression en neutralisant les scripts et injections
 */
export function sanitizeHtmlForPrint(html: string): string {
  if (!html) return '';

  // 1. Suppression des balises script et de leur contenu
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Suppression des gestionnaires d'événements inline (onload, onclick, onerror, onmouseover...)
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*[^ >]+/gi, '');

  // 3. Neutralisation des protocoles javascript: dans les liens ou images
  sanitized = sanitized.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'src=""');

  return sanitized;
}

/**
 * Imprime un document HTML de manière sécurisée via une popup protégée ou une iframe isolée
 */
export function safePrintHtml(htmlContent: string, documentTitle: string = 'Document GESCO'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const safeContent = sanitizeHtmlForPrint(htmlContent);

  // Injection d'une iframe invisible pour une impression sans blocage popup
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.title = documentTitle;
  
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(safeContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Fallback popup si l'iframe est restreinte
        const popup = window.open('', '_blank');
        if (popup) {
          popup.document.open();
          popup.document.write(safeContent);
          popup.document.close();
          popup.focus();
          setTimeout(() => {
            try {
              popup.print();
            } catch {}
          }, 300);
        }
      } finally {
        // Nettoyage de l'iframe après déclenchement
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch {}
        }, 60000);
      }
    }, 350);
  }
}
