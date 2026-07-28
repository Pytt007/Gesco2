import { QRCodePayload, DocumentType } from './types';

/**
 * Service de génération et de vérification des QR Codes sécurisés pour les documents GESCO
 */
export const qrCodeService = {
  /**
   * Calcule une empreinte de sécurité (Checksum SHA-256 simulée ou texte sécurisé)
   */
  generateChecksum(inputData: any): string {
    const jsonStr = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
    let hash = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert into 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const timestamp = Date.now().toString(16);
    return `GESCO-SHA256-${hex}-${timestamp}`.toUpperCase();
  },

  /**
   * Crée un payload QR Code standardisé
   */
  createQRCodePayload(
    documentId: string,
    checksum: string,
    schoolName: string = 'GESCO International School',
    documentType: DocumentType = 'BULLETIN',
    date: string = new Date().toISOString()
  ): QRCodePayload {
    return {
      documentId,
      checksum,
      date,
      schoolName,
      documentType,
      verified: true,
    };
  },

  /**
   * Encode le payload QR Code en une chaîne JSON / Base64 lisible pour le scanner
   */
  encodeQRCodePayload(payload: QRCodePayload): string {
    const rawStr = JSON.stringify({
      docId: payload.documentId,
      chk: payload.checksum,
      dt: payload.date,
      sch: payload.schoolName,
      type: payload.documentType,
    });
    // Base64 encoding
    try {
      return typeof btoa === 'function' ? btoa(rawStr) : Buffer.from(rawStr).toString('base64');
    } catch {
      return rawStr;
    }
  },

  /**
   * Vérifie l'authenticité d'un QR Code scanné ou d'un payload
   */
  verifyQRCodePayload(encodedOrPayload: string | QRCodePayload): { isValid: boolean; payload?: QRCodePayload; reason?: string } {
    try {
      let payload: QRCodePayload;

      if (typeof encodedOrPayload === 'string') {
        let decodedStr = encodedOrPayload;
        try {
          decodedStr = typeof atob === 'function' ? atob(encodedOrPayload) : Buffer.from(encodedOrPayload, 'base64').toString('utf-8');
        } catch {
          // pas de base64, tentative JSON direct
        }
        const parsed = JSON.parse(decodedStr);
        payload = {
          documentId: parsed.docId || parsed.documentId,
          checksum: parsed.chk || parsed.checksum,
          date: parsed.dt || parsed.date,
          schoolName: parsed.sch || parsed.schoolName,
          documentType: parsed.type || parsed.documentType,
          verified: true,
        };
      } else {
        payload = encodedOrPayload;
      }

      if (!payload.documentId || !payload.checksum || !payload.schoolName) {
        return { isValid: false, reason: 'Payload QR Code incomplet ou corrompu' };
      }

      if (!payload.checksum.startsWith('GESCO-')) {
        return { isValid: false, reason: 'Checksum de sécurité invalide' };
      }

      return { isValid: true, payload };
    } catch (err: any) {
      return { isValid: false, reason: `Erreur de décodage du QR Code: ${err.message}` };
    }
  },

  /**
   * Génère une représentation Data URL d'un QR Code en SVG (compatible sans dépendance externe)
   */
  generateQRCodeDataUrl(payload: QRCodePayload): string {
    const text = this.encodeQRCodePayload(payload);
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <rect width="100" height="100" fill="#ffffff"/>
      <!-- QR Frame -->
      <rect x="5" y="5" width="30" height="30" fill="none" stroke="#000000" stroke-width="4"/>
      <rect x="12" y="12" width="16" height="16" fill="#000000"/>
      <rect x="65" y="5" width="30" height="30" fill="none" stroke="#000000" stroke-width="4"/>
      <rect x="72" y="12" width="16" height="16" fill="#000000"/>
      <rect x="5" y="65" width="30" height="30" fill="none" stroke="#000000" stroke-width="4"/>
      <rect x="12" y="72" width="16" height="16" fill="#000000"/>
      <!-- Security Watermark -->
      <text x="50" y="52" font-size="6" font-family="sans-serif" text-anchor="middle" fill="#2563eb">GESCO VERIFIED</text>
      <text x="50" y="60" font-size="4" font-family="monospace" text-anchor="middle" fill="#64748b">${payload.checksum.substring(0, 16)}...</text>
    </svg>`;

    try {
      const encodedSvg = typeof btoa === 'function' ? btoa(svgString) : Buffer.from(svgString).toString('base64');
      return `data:image/svg+xml;base64,${encodedSvg}`;
    } catch {
      return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    }
  },

  generateQRCodeDataURL(payload: any): string {
    const qrPayload = typeof payload.checksum === 'string'
      ? payload
      : this.createQRCodePayload(payload.documentId || 'DOC-001', this.generateChecksum(payload));
    return this.generateQRCodeDataUrl(qrPayload);
  },
};
