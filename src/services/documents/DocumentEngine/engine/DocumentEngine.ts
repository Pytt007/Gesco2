// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: Master Engine
// Le moteur unique générant TOUS les documents de l'établissement
// ─────────────────────────────────────────────────────────────────────────────

import { schoolIdentityService, SchoolIdentityData } from '../services/SchoolIdentityService';
import { createDocumentTheme, DocumentThemeTokens } from '../theme/DocumentTheme';
import { documentTypography } from '../typography/DocumentTypography';
import { renderDocumentHeader } from '../components/DocumentHeader';
import { renderDocumentFooter } from '../components/DocumentFooter';
import { qrCodeService } from '../../qrCodeService';

export type EnterpriseDocumentType =
  | 'BULLETIN'
  | 'RELEVÉ'
  | 'REÇU'
  | 'FACTURE'
  | 'ATTESTATION'
  | 'CERTIFICAT'
  | 'CARTE_ÉLÈVE'
  | 'BADGE'
  | 'RAPPORT'
  | 'ÉTAT_FINANCIER'
  | 'JOURNAL'
  | 'LISTE'
  | 'EMPLOI_DU_TEMPS';

export interface DocumentGenerationPayload {
  documentType: EnterpriseDocumentType;
  title: string;
  subtitle?: string;
  entityId?: string;
  meta?: Record<string, string>;
  data: Record<string, any>;
  sectionsHtml: string;
  generatedBy?: string;
  enableQRCode?: boolean;
}

export interface CompiledEnterpriseDocument {
  id: string;
  documentType: EnterpriseDocumentType;
  title: string;
  fullHtml: string;
  checksum: string;
  qrCodeDataUrl?: string;
  generatedAt: string;
  schoolIdentity: SchoolIdentityData;
}

export class DocumentEngine {
  /**
   * Compile un document Enterprise complet en appliquant le Document Master unique
   */
  async compileDocument(payload: DocumentGenerationPayload): Promise<CompiledEnterpriseDocument> {
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const generatedAt = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // 1. Chargement dynamique de l'identité de l'établissement (Zero hardcoding)
    const schoolIdentity = await schoolIdentityService.getSchoolIdentity();

    // 2. Initialisation du Thème Master
    const theme = createDocumentTheme(schoolIdentity.themePrimaryColor, schoolIdentity.themeAccentColor);

    // 3. Calcul de la sécurité et QR Code
    const checksum = qrCodeService.generateChecksum({
      documentId,
      type: payload.documentType,
      entityId: payload.entityId || documentId,
      data: payload.data,
    });

    let qrCodeDataUrl: string | undefined;
    if (payload.enableQRCode !== false) {
      const qrPayload = qrCodeService.createQRCodePayload(documentId, checksum, schoolIdentity.name, payload.documentType as any);
      qrCodeDataUrl = qrCodeService.generateQRCodeDataUrl(qrPayload);
    }

    // 4. Génération du Header Master
    const headerHtml = renderDocumentHeader({
      title: payload.title,
      subtitle: payload.subtitle,
      schoolIdentity,
      meta: payload.meta,
      theme,
    });

    // 5. Génération du Footer Master
    const footerHtml = renderDocumentFooter({
      schoolIdentity,
      generatedAt,
      generatedBy: payload.generatedBy || 'GESCO Enterprise',
      version: 'v1.0.0 Enterprise',
      qrCodeDataUrl,
      checksum,
      theme,
    });

    // 6. Assemblage du Document Master unique
    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${payload.title} — ${schoolIdentity.name}</title>
  <style>
    @page {
      margin: 0;
      size: A4 portrait;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: ${theme.text} !important;
      background-color: ${theme.background} !important;
      margin: 0;
      padding: 0;
      font-size: ${documentTypography.body.fontSize};
      line-height: ${documentTypography.body.lineHeight};
      -webkit-font-smoothing: antialiased;
    }

    .master-content-body {
      padding: 24px 36px;
      min-height: calc(100vh - 220px);
    }
  </style>
</head>
<body>
  <!-- MASTER HEADER -->
  ${headerHtml}

  <!-- MASTER CONTENT -->
  <div class="master-content-body">
    ${payload.sectionsHtml}
  </div>

  <!-- MASTER FOOTER -->
  ${footerHtml}
</body>
</html>`;

    return {
      id: documentId,
      documentType: payload.documentType,
      title: payload.title,
      fullHtml,
      checksum,
      qrCodeDataUrl,
      generatedAt,
      schoolIdentity,
    };
  }
}

export const documentEngineEnterprise = new DocumentEngine();
