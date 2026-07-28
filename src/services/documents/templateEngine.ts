import { DocumentTemplate, TemplateSection, DocumentType, DocumentGenerationOptions, CompiledDocument } from './types';
import { qrCodeService } from './qrCodeService';

/**
 * Moteur de modèles de documents (Template Engine)
 * Fusionne dynamiquement : Données Métier + Modèle de Document + Sections Ordonnées
 */
export const templateEngine = {
  /**
   * Modèles de documents par défaut du système
   */
  getDefaultTemplates(): DocumentTemplate[] {
    return [
      {
        id: 'tmpl-bulletin-default',
        code: 'BULLETIN_STANDARD',
        name: 'Bulletin Trimestriel Standard',
        category: 'ACADEMIC',
        description: 'Modèle officiel de bulletin scolaire avec moyennes, rangs et appréciation du conseil.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'tmpl-receipt-school',
        code: 'SCHOOL_RECEIPT_STANDARD',
        name: 'Reçu de Scolarité Standard',
        category: 'FINANCE',
        description: 'Reçu officiel de paiement des frais de scolarité.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'tmpl-receipt-canteen',
        code: 'CANTEEN_RECEIPT_STANDARD',
        name: 'Reçu de Cantine Standard',
        category: 'FINANCE',
        description: 'Reçu de paiement des prestations de cantine scolaire.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'tmpl-receipt-transport',
        code: 'TRANSPORT_RECEIPT_STANDARD',
        name: 'Reçu de Transport Standard',
        category: 'FINANCE',
        description: 'Reçu de paiement du service de transport scolaire.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'tmpl-certificate-standard',
        code: 'CERTIFICATE_STANDARD',
        name: 'Certificat de Scolarité Standard',
        category: 'ADMINISTRATIVE',
        description: 'Document officiel attestant de l’inscription régulière de l’élève.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'tmpl-attestation-standard',
        code: 'ATTESTATION_STANDARD',
        name: 'Attestation de Réussite / Fréquentation',
        category: 'ADMINISTRATIVE',
        description: 'Attestation officielle délivrée par le chef d’établissement.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'tmpl-attendance-list',
        code: 'ATTENDANCE_LIST_STANDARD',
        name: 'Liste d’Émargement / Présences',
        category: 'REPORT',
        description: 'Fiche d’appel et de présence de la classe.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'tmpl-report-standard',
        code: 'REPORT_STANDARD',
        name: 'Rapport Général d’Évaluation',
        category: 'REPORT',
        description: 'Rapport synthétique d’établissement.',
        version: 1,
        schoolId: null,
        isDefault: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
  },

  /**
   * Sections par défaut d'un modèle en fonction de son type
   */
  getDefaultSections(templateId: string, documentType: DocumentType): TemplateSection[] {
    const baseSections: TemplateSection[] = [
      {
        id: `sec-header-${templateId}`,
        templateId,
        sectionType: 'HEADER',
        displayOrder: 10,
        configuration: { showLogo: true, title: this.getDocumentTitle(documentType) },
      },
      {
        id: `sec-school-${templateId}`,
        templateId,
        sectionType: 'SCHOOL_INFO',
        displayOrder: 20,
        configuration: { layout: 'horizontal' },
      },
    ];

    if (documentType === 'BULLETIN') {
      baseSections.push(
        { id: `sec-student-${templateId}`, templateId, sectionType: 'STUDENT_INFO', displayOrder: 30, configuration: {} },
        { id: `sec-grades-${templateId}`, templateId, sectionType: 'GRADES_TABLE', displayOrder: 40, configuration: { showCoeff: true } },
        { id: `sec-stats-${templateId}`, templateId, sectionType: 'STATISTICS', displayOrder: 50, configuration: {} },
        { id: `sec-sig-${templateId}`, templateId, sectionType: 'SIGNATURES', displayOrder: 60, configuration: {} },
        { id: `sec-qr-${templateId}`, templateId, sectionType: 'QR_CODE', displayOrder: 70, configuration: { position: 'right' } }
      );
    } else if (documentType.endsWith('_RECEIPT')) {
      baseSections.push(
        { id: `sec-student-${templateId}`, templateId, sectionType: 'STUDENT_INFO', displayOrder: 30, configuration: {} },
        { id: `sec-receipt-${templateId}`, templateId, sectionType: 'RECEIPT_DETAILS', displayOrder: 40, configuration: {} },
        { id: `sec-sig-${templateId}`, templateId, sectionType: 'SIGNATURES', displayOrder: 50, configuration: {} },
        { id: `sec-qr-${templateId}`, templateId, sectionType: 'QR_CODE', displayOrder: 60, configuration: { position: 'bottom' } }
      );
    } else if (documentType === 'ATTENDANCE_LIST') {
      baseSections.push(
        { id: `sec-attendance-${templateId}`, templateId, sectionType: 'ATTENDANCE_TABLE', displayOrder: 30, configuration: {} },
        { id: `sec-sig-${templateId}`, templateId, sectionType: 'SIGNATURES', displayOrder: 40, configuration: {} }
      );
    } else {
      baseSections.push(
        { id: `sec-student-${templateId}`, templateId, sectionType: 'STUDENT_INFO', displayOrder: 30, configuration: {} },
        { id: `sec-sig-${templateId}`, templateId, sectionType: 'SIGNATURES', displayOrder: 40, configuration: {} },
        { id: `sec-qr-${templateId}`, templateId, sectionType: 'QR_CODE', displayOrder: 50, configuration: {} }
      );
    }

    baseSections.push({
      id: `sec-footer-${templateId}`,
      templateId,
      sectionType: 'FOOTER',
      displayOrder: 100,
      configuration: { note: 'GESCO - Document officiel sécurisé par empreinte numérique.' },
    });

    return baseSections.sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Titre lisible du type de document
   */
  getDocumentTitle(docType: DocumentType): string {
    switch (docType) {
      case 'BULLETIN':
        return 'BULLETIN DE NOTES';
      case 'SCHOOL_RECEIPT':
        return 'REÇU DE SCOLARITÉ';
      case 'CANTEEN_RECEIPT':
        return 'REÇU DE CANTINE';
      case 'TRANSPORT_RECEIPT':
        return 'REÇU DE TRANSPORT';
      case 'CERTIFICATE':
        return 'CERTIFICAT DE SCOLARITÉ';
      case 'ATTESTATION':
        return 'ATTESTATION DE RÉUSSITE';
      case 'ATTENDANCE_LIST':
        return 'LISTE D’ÉMARGEMENT ET DE PRÉSENCE';
      case 'REPORT':
        return 'RAPPORT D’ÉVALUATION';
      default:
        return 'DOCUMENT OFFICIEL';
    }
  },

  /**
   * Compile un document en fusionnant Modèle + Sections Ordonnées + Données Métier
   */
  compileDocument(
    options: DocumentGenerationOptions,
    customTemplate?: DocumentTemplate,
    customSections?: TemplateSection[]
  ): CompiledDocument {
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const schoolName = options.schoolName || options.data.schoolName || 'ÉTABLISSEMENT EXEMPLE GESCO';

    const defaultTmpl = this.getDefaultTemplates().find((t) => t.category === this.mapDocTypeToCategory(options.documentType)) || this.getDefaultTemplates()[0];
    const template = customTemplate || defaultTmpl;
    const sections = customSections && customSections.length > 0
      ? customSections.sort((a, b) => a.displayOrder - b.displayOrder)
      : this.getDefaultSections(template.id, options.documentType);

    const checksum = qrCodeService.generateChecksum({
      documentId,
      type: options.documentType,
      entityId: options.entityId,
      data: options.data,
    });

    const qrCodePayload = qrCodeService.createQRCodePayload(documentId, checksum, schoolName, options.documentType);
    const qrCodeDataUrl = qrCodeService.generateQRCodeDataUrl(qrCodePayload);

    const renderedSections = sections.map((sec) => ({
      sectionType: sec.sectionType,
      displayOrder: sec.displayOrder,
      renderedHtml: this.renderSectionHtml(sec, options.data, qrCodePayload, qrCodeDataUrl, options.documentType),
      configuration: sec.configuration,
    }));

    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${this.getDocumentTitle(options.documentType)}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; line-height: 1.5; font-size: 14px; }
    .document-header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
    .document-title { font-size: 20px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin: 0; }
    .school-name { font-size: 16px; font-weight: 600; color: #3b82f6; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .info-item { display: flex; font-size: 13px; }
    .info-label { font-weight: bold; width: 140px; color: #475569; }
    .info-value { color: #0f172a; flex: 1; }
    table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    table.data-table th { background: #1e293b; color: #ffffff; padding: 8px 10px; font-size: 12px; text-align: left; font-weight: 600; border: 1px solid #334155; }
    table.data-table td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 13px; }
    table.data-table tr:nth-child(even) { background-color: #f8fafc; }
    .signatures-block { display: flex; justify-content: space-between; margin-top: 40px; margin-bottom: 20px; }
    .signature-box { width: 45%; text-align: center; border-top: 1px dashed #94a3b8; padding-top: 8px; font-size: 13px; font-weight: bold; }
    .qr-container { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .document-footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 8px; }
  </style>
</head>
<body>
  ${renderedSections.map((s) => s.renderedHtml).join('\n')}
</body>
</html>`;

    return {
      title: this.getDocumentTitle(options.documentType),
      documentType: options.documentType,
      templateVersion: template.version,
      sections: renderedSections,
      qrCodePayload,
      fullHtml,
      checksum,
    };
  },

  /**
   * Rend le code HTML d'une section spécifique avec injection de données
   */
  renderSectionHtml(
    section: TemplateSection,
    data: Record<string, any>,
    qrCodePayload?: any,
    qrCodeDataUrl?: string,
    docType: DocumentType = 'BULLETIN'
  ): string {
    const title = this.getDocumentTitle(docType);

    switch (section.sectionType) {
      case 'HEADER':
        return `<div class="document-header">
          <div class="school-name">${data.schoolName || 'ÉTABLISSEMENT EXEMPLE GESCO'}</div>
          <h1 class="document-title">${title}</h1>
          ${data.academicYear ? `<div style="font-size: 12px; color: #64748b;">Année Scolaire : ${data.academicYear}</div>` : ''}
        </div>`;

      case 'SCHOOL_INFO':
        return `<div class="info-grid">
          <div class="info-item"><span class="info-label">Établissement :</span><span class="info-value">${data.schoolName || 'GESCO School'}</span></div>
          <div class="info-item"><span class="info-label">Ville / Pays :</span><span class="info-value">${data.city || 'Abidjan, Côte d’Ivoire'}</span></div>
          <div class="info-item"><span class="info-label">Téléphone :</span><span class="info-value">${data.phone || '+225 07 00 00 00 00'}</span></div>
          <div class="info-item"><span class="info-label">Code Établissement :</span><span class="info-value">${data.schoolCode || 'CI-ABJ-001'}</span></div>
        </div>`;

      case 'STUDENT_INFO':
        return `<div class="info-grid" style="background: #eff6ff; border-color: #bfdbfe;">
          <div class="info-item"><span class="info-label">Matricule :</span><span class="info-value" style="font-weight: bold;">${data.matricule || 'MAT-2026-001'}</span></div>
          <div class="info-item"><span class="info-label">Élève :</span><span class="info-value" style="font-weight: bold;">${data.studentName || 'KOUASSI Jean'}</span></div>
          <div class="info-item"><span class="info-label">Classe :</span><span class="info-value">${data.className || 'CM2 A'}</span></div>
          <div class="info-item"><span class="info-label">Date de Naissance :</span><span class="info-value">${data.birthDate || '12/05/2014'}</span></div>
        </div>`;

      case 'GRADES_TABLE': {
        const subjects = data.subjects || [
          { name: 'Mathématiques', score: 16, maxScore: 20, coeff: 3, appreciation: 'Très bien' },
          { name: 'Français', score: 14, maxScore: 20, coeff: 3, appreciation: 'Bien' },
          { name: 'Sciences', score: 15, maxScore: 20, coeff: 2, appreciation: 'Bon travail' },
        ];

        return `<table class="data-table">
          <thead>
            <tr>
              <th>Matière</th>
              <th style="text-align: center;">Note / 20</th>
              <th style="text-align: center;">Coeff.</th>
              <th style="text-align: center;">Total</th>
              <th>Appréciation du Professeur</th>
            </tr>
          </thead>
          <tbody>
            ${subjects
              .map(
                (s: any) => `<tr>
              <td><strong>${s.name}</strong></td>
              <td style="text-align: center; font-weight: bold;">${s.score !== null ? s.score : 'N.C'}</td>
              <td style="text-align: center;">${s.coeff || 1}</td>
              <td style="text-align: center;">${s.score !== null ? s.score * (s.coeff || 1) : '-'}</td>
              <td>${s.appreciation || '-'}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>`;
      }

      case 'STATISTICS':
        return `<div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-around; text-align: center;">
          <div><div style="font-size: 11px; color: #64748b;">Moyenne Générale</div><div style="font-size: 18px; font-weight: bold; color: #2563eb;">${data.average || '15.00'} / 20</div></div>
          <div><div style="font-size: 11px; color: #64748b;">Rang</div><div style="font-size: 18px; font-weight: bold; color: #0d9488;">${data.rank || '1er'} / ${data.totalStudents || '25'}</div></div>
          <div><div style="font-size: 11px; color: #64748b;">Décision du Conseil</div><div style="font-size: 16px; font-weight: bold; color: #16a34a;">${data.decision || 'TABLEAU D’HONNEUR'}</div></div>
        </div>`;

      case 'RECEIPT_DETAILS':
        return `<table class="data-table">
          <thead>
            <tr>
              <th>Désignation de la prestation</th>
              <th>Référence Paiment</th>
              <th>Mode de Règlement</th>
              <th style="text-align: right;">Montant Réglé</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${data.paymentLabel || 'Frais de scolarité Trimestre 1'}</strong></td>
              <td>${data.reference || 'REC-2026-9921'}</td>
              <td>${data.paymentMethod || 'Espèces / Orange Money'}</td>
              <td style="text-align: right; font-weight: bold; color: #16a34a;">${data.amountPaid || '150 000 FCFA'}</td>
            </tr>
          </tbody>
        </table>`;

      case 'ATTENDANCE_TABLE':
        return `<table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Matricule</th>
              <th>Nom & Prénom</th>
              <th style="text-align: center;">Présence</th>
              <th>Signature / Émargement</th>
            </tr>
          </thead>
          <tbody>
            ${(data.students || [
              { matricule: 'MAT-001', name: 'KOUASSI Jean' },
              { matricule: 'MAT-002', name: 'KONAN Marie' },
            ])
              .map(
                (st: any, i: number) => `<tr>
              <td>${i + 1}</td>
              <td>${st.matricule}</td>
              <td><strong>${st.name}</strong></td>
              <td style="text-align: center;">[  ] PRÉSENT</td>
              <td style="border-bottom: 1px solid #cbd5e1;"></td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>`;

      case 'SIGNATURES':
        return `<div class="signatures-block">
          <div class="signature-box">Le Titulaire / Parent</div>
          <div class="signature-box">Le Chef d’Établissement & Sceau</div>
        </div>`;

      case 'QR_CODE':
        return `<div class="qr-container">
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Document Sécurisé GESCO</div>
            <div style="font-family: monospace;">Empreinte : ${qrCodePayload?.checksum?.substring(0, 20) || 'VERIFIED'}</div>
          </div>
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code Sécurité" width="70" height="70" style="border: 1px solid #cbd5e1; padding: 2px; border-radius: 4px;"/>` : ''}
        </div>`;

      case 'FOOTER':
        return `<div class="document-footer">
          GESCO Management System - Page 1 / 1 - Document édité le ${new Date().toLocaleDateString('fr-FR')} - ${section.configuration?.note || 'Authenticité vérifiable par QR Code.'}
        </div>`;

      default:
        return `<div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 10px;">Section : ${section.sectionType}</div>`;
    }
  },

  /**
   * Détermine la catégorie d'un type de document
   */
  mapDocTypeToCategory(docType: DocumentType): any {
    if (docType === 'BULLETIN') return 'ACADEMIC';
    if (docType.endsWith('_RECEIPT')) return 'FINANCE';
    if (docType === 'ATTENDANCE_LIST' || docType === 'REPORT') return 'REPORT';
    return 'ADMINISTRATIVE';
  },
};
