import { TemplateBlock } from './types';
import { layoutEngine } from './layoutEngine';
import { qrCodeService } from '../qrCodeService';

/**
 * Moteur de prévisualisation (Preview Engine)
 * Rendu HTML dynamique et réactif sans génération de fichier PDF.
 */
export const previewEngine = {
  /**
   * Rendu HTML spécifique à chaque type de bloc
   */
  renderBlockContent(block: TemplateBlock, data: Record<string, any>): string {
    const cfg = block.configuration || {};

    switch (block.blockCode) {
      case 'LOGO':
        return `<div style="text-align: ${cfg.alignment || 'center'};">
          <div style="display: inline-block; width: ${cfg.width || '80px'}; height: ${cfg.width || '80px'}; background: #e2e8f0; border-radius: 50%; line-height: ${cfg.width || '80px'}; text-align: center; color: #64748b; font-size: 11px; font-weight: bold;">[LOGO]</div>
        </div>`;

      case 'HEADER':
        return `<div style="text-align: ${cfg.alignment || 'center'}; margin-bottom: 12px;">
          <div style="font-weight: bold; font-size: 13px; color: #475569;">RÉPUBLIQUE DE CÔTE D’IVOIRE</div>
          <div style="font-size: 11px; color: #64748b;">Ministère de l’Éducation Nationale</div>
          <h2 style="margin: 8px 0 0 0; font-size: ${cfg.fontSize || '18px'}; color: ${cfg.color || '#1e3a8a'}; font-weight: ${cfg.fontWeight || 'bold'}; text-transform: uppercase;">
            ${cfg.customTitle || data.documentTitle || 'BULLETIN DE NOTES'}
          </h2>
        </div>`;

      case 'SCHOOL_INFORMATION':
        return `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: ${cfg.fontSize || '12px'}; color: ${cfg.color || '#475569'}; padding: 8px; background: #f8fafc; border-radius: 4px;">
          <div><strong>Établissement :</strong> ${data.schoolName || 'GESCO School'}</div>
          <div><strong>Code École :</strong> ${data.schoolCode || 'CI-ABJ-001'}</div>
          <div><strong>Ville :</strong> ${data.city || 'Abidjan'}</div>
          <div><strong>Téléphone :</strong> ${data.phone || '+225 07 00 00 00 00'}</div>
        </div>`;

      case 'STUDENT_INFORMATION':
        return `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: ${cfg.fontSize || '13px'}; padding: ${cfg.padding || '10px'}; background: ${cfg.backgroundColor || '#eff6ff'}; border-radius: ${cfg.borderRadius || '6px'};">
          <div><strong>Matricule :</strong> ${data.matricule || '—'}</div>
          <div><strong>Élève :</strong> <strong>${data.studentName || '—'}</strong></div>
          <div><strong>Classe :</strong> ${data.className || '—'}</div>
          <div><strong>Né(e) le :</strong> ${data.birthDate || '—'}</div>
        </div>`;

      case 'PARENT_INFORMATION':
        return `<div style="font-size: ${cfg.fontSize || '12px'}; color: ${cfg.color || '#334155'}; padding: 6px; background: #f1f5f9; border-radius: 4px; margin-top: 6px;">
          <strong>Tuteur Légal :</strong> ${data.parentName || '—'} (${data.parentPhone || '—'})
        </div>`;

      case 'CLASS_INFORMATION':
        return `<div style="font-size: ${cfg.fontSize || '12px'}; padding: 6px; background: #f8fafc; border-radius: 4px;">
          <strong>Classe :</strong> ${data.className || '—'} | <strong>Effectif :</strong> ${data.totalStudents || 0} élèves | <strong>Prof. Principal :</strong> ${data.headTeacher || '—'}
        </div>`;

      case 'ASSESSMENT_INFORMATION':
        return `<div style="font-size: ${cfg.fontSize || '12px'}; font-weight: 500; color: #475569; margin-bottom: 8px;">
          Période : ${data.periodName || 'Trimestre 1'} | Année Scolaire : ${data.academicYear || '2025-2026'}
        </div>`;

      case 'RESULTS_TABLE': {
        const subjects = data.subjects || [
          { name: 'Mathématiques', score: 16, coeff: 3, appreciation: 'Très bien' },
          { name: 'Français', score: 14, coeff: 3, appreciation: 'Bien' },
          { name: 'Sciences', score: 15, coeff: 2, appreciation: 'Bon travail' },
        ];

        return `<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: ${cfg.fontSize || '13px'};">
          <thead>
            <tr style="background: #1e293b; color: #ffffff;">
              <th style="padding: 6px 8px; text-align: left;">Matière</th>
              <th style="padding: 6px 8px; text-align: center;">Note / 20</th>
              ${cfg.showCoeff !== false ? '<th style="padding: 6px 8px; text-align: center;">Coeff</th>' : ''}
              <th style="padding: 6px 8px; text-align: left;">Appréciation du Professeur</th>
            </tr>
          </thead>
          <tbody>
            ${subjects
              .map(
                (s: any) => `<tr style="border-bottom: ${cfg.border || '1px solid #cbd5e1'};">
              <td style="padding: 6px 8px;"><strong>${s.name}</strong></td>
              <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${s.score !== null ? s.score : 'N.C'}</td>
              ${cfg.showCoeff !== false ? `<td style="padding: 6px 8px; text-align: center;">${s.coeff || 1}</td>` : ''}
              <td style="padding: 6px 8px;">${s.appreciation || '-'}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>`;
      }

      case 'AVERAGE':
        return `<div style="font-size: ${cfg.fontSize || '16px'}; font-weight: ${cfg.fontWeight || 'bold'}; color: ${cfg.color || '#2563eb'};">
          Moyenne Générale : ${data.average || '15.00'} / 20
        </div>`;

      case 'RANK':
        return `<div style="font-size: ${cfg.fontSize || '16px'}; font-weight: ${cfg.fontWeight || 'bold'}; color: ${cfg.color || '#0d9488'};">
          Rang : ${data.rank || '1er'} / ${data.totalStudents || 25}
        </div>`;

      case 'MENTION':
        return `<div style="font-size: ${cfg.fontSize || '14px'}; font-weight: 500; color: #d97706;">
          Distinction : ${data.mention || 'TABLEAU D’HONNEUR'}
        </div>`;

      case 'APPRECIATION':
        return `<div style="font-size: ${cfg.fontSize || '13px'}; background: ${cfg.backgroundColor || '#f8fafc'}; padding: ${cfg.padding || '8px'}; border-radius: 4px; border-left: 3px solid #3b82f6;">
          <strong>Appréciation du Conseil :</strong> ${data.appreciation || 'Très bon travail ce trimestre. Poursuivez ainsi.'}
        </div>`;

      case 'DECISION':
        return `<div style="font-size: ${cfg.fontSize || '15px'}; font-weight: ${cfg.fontWeight || 'bold'}; color: ${cfg.color || '#16a34a'}; padding: 6px; background: #f0fdf4; border-radius: 4px;">
          Décision Pédagogique : ${data.decision || 'ADMIS EN CLASSE SUPÉRIEURE'}
        </div>`;

      case 'SIGNATURES':
      case 'DIRECTOR_SIGNATURE':
      case 'TEACHER_SIGNATURE':
        return `<div style="display: flex; justify-content: space-between; margin-top: 24px;">
          <div style="width: 45%; text-align: center; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 12px; font-weight: bold;">
            ${cfg.customTitle || 'Le Professeur Principal'}
          </div>
          <div style="width: 45%; text-align: center; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 12px; font-weight: bold;">
            Le Chef d’Établissement & Sceau
          </div>
        </div>`;

      case 'STAMP':
        return `<div style="text-align: center; color: #94a3b8; font-size: 11px; font-style: italic;">
          [Emplacement Sceau Officiel]
        </div>`;

      case 'QR_CODE': {
        const payload = qrCodeService.createQRCodePayload('preview-doc', 'GESCO-SHA256-PREVIEW', data.schoolName || 'GESCO', 'BULLETIN');
        const qrSvg = qrCodeService.generateQRCodeDataUrl(payload);
        return `<div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
          <span style="font-size: 10px; color: #64748b;">Authenticité GESCO Verified</span>
          <img src="${qrSvg}" width="${cfg.width || '60px'}" height="${cfg.height || '60px'}" alt="QR Code"/>
        </div>`;
      }

      case 'FOOTER':
        return `<div style="text-align: ${cfg.alignment || 'center'}; font-size: ${cfg.fontSize || '11px'}; color: ${cfg.color || '#94a3b8'}; margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 6px;">
          GESCO - Page 1/1 - Généré le ${new Date().toLocaleDateString('fr-FR')} - ${cfg.customText || 'Document officiel.'}
        </div>`;

      case 'CUSTOM_TEXT':
        return `<div style="font-size: ${cfg.fontSize || '13px'}; color: ${cfg.color || '#334155'};">
          ${cfg.customText || data.customText || 'Texte personnalisé.'}
        </div>`;

      case 'CUSTOM_TABLE':
        return `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #f1f5f9;"><th style="padding: 4px 8px; border: 1px solid #cbd5e1;">Désignation</th><th style="padding: 4px 8px; border: 1px solid #cbd5e1;">Valeur</th></tr>
          <tr><td style="padding: 4px 8px; border: 1px solid #cbd5e1;">Exemple 1</td><td style="padding: 4px 8px; border: 1px solid #cbd5e1;">100</td></tr>
        </table>`;

      case 'CUSTOM_IMAGE':
        return `<div style="text-align: center; background: #f8fafc; padding: 20px; color: #94a3b8; font-size: 12px;">[IMAGE PERSONNALISÉE]</div>`;

      default:
        return `<div style="padding: 6px; background: #f8fafc;">[Bloc : ${block.blockCode}]</div>`;
    }
  },

  /**
   * Construit le document HTML complet de prévisualisation dynamique à partir des blocs ordonnés
   */
  buildHtmlPreview(blocks: TemplateBlock[], data: Record<string, any> = {}, options: { title?: string } = {}): string {
    const sortedBlocks = [...blocks].filter((b) => b.visible).sort((a, b) => a.displayOrder - b.displayOrder);

    const renderedBlocksHtml = sortedBlocks
      .map((block) => {
        const innerContent = this.renderBlockContent(block, data);
        return layoutEngine.generateBlockWrapper(block, innerContent, data);
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${options.title || 'Prévisualisation Document'}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; line-height: 1.4; background: #ffffff; }
    .gesco-block { margin-bottom: 12px; }
  </style>
</head>
<body>
  ${renderedBlocksHtml}
</body>
</html>`;
  },
};
