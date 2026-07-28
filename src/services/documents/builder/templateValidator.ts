import { TemplateBlock, ValidationResult, ValidationError, BlockCode } from './types';
import { DocumentType } from '../types';

/**
 * Service de validation des modèles et des configurations de blocs
 */
export const templateValidator = {
  /**
   * Valide l'intégrité structurelle des blocs d'un modèle
   */
  validateTemplate(blocks: TemplateBlock[], documentType: DocumentType = 'BULLETIN'): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const visibleBlocks = blocks.filter((b) => b.visible).sort((a, b) => a.displayOrder - b.displayOrder);

    // 1. Détection des doublons interdits
    const singleInstanceBlocks: BlockCode[] = ['HEADER', 'RESULTS_TABLE', 'FOOTER', 'QR_CODE', 'SIGNATURES'];
    const counts: Record<string, number> = {};

    visibleBlocks.forEach((b) => {
      counts[b.blockCode] = (counts[b.blockCode] || 0) + 1;
    });

    singleInstanceBlocks.forEach((code) => {
      if (counts[code] && counts[code] > 1) {
        errors.push({
          type: 'DUPLICATE',
          blockCode: code,
          message: `Le bloc "${code}" ne peut pas être présent plusieurs fois dans un document.`,
          severity: 'error',
        });
      }
    });

    // 2. Détection des blocs obligatoires manquants par type de document
    const mandatoryByDocType: Record<string, BlockCode[]> = {
      BULLETIN: ['HEADER', 'SCHOOL_INFORMATION', 'STUDENT_INFORMATION', 'RESULTS_TABLE', 'SIGNATURES', 'FOOTER'],
      SCHOOL_RECEIPT: ['HEADER', 'SCHOOL_INFORMATION', 'STUDENT_INFORMATION', 'SIGNATURES', 'FOOTER'],
      CANTEEN_RECEIPT: ['HEADER', 'SCHOOL_INFORMATION', 'STUDENT_INFORMATION', 'SIGNATURES', 'FOOTER'],
      TRANSPORT_RECEIPT: ['HEADER', 'SCHOOL_INFORMATION', 'STUDENT_INFORMATION', 'SIGNATURES', 'FOOTER'],
      CERTIFICATE: ['HEADER', 'SCHOOL_INFORMATION', 'STUDENT_INFORMATION', 'SIGNATURES', 'FOOTER'],
      ATTESTATION: ['HEADER', 'SCHOOL_INFORMATION', 'STUDENT_INFORMATION', 'SIGNATURES', 'FOOTER'],
      ATTENDANCE_LIST: ['HEADER', 'SCHOOL_INFORMATION', 'SIGNATURES', 'FOOTER'],
      REPORT: ['HEADER', 'SCHOOL_INFORMATION', 'FOOTER'],
    };

    const requiredCodes = mandatoryByDocType[documentType] || mandatoryByDocType.BULLETIN;
    requiredCodes.forEach((code) => {
      if (!counts[code] || counts[code] === 0) {
        errors.push({
          type: 'MISSING_MANDATORY',
          blockCode: code,
          message: `Le bloc obligatoire "${code}" est absent pour un document de type ${documentType}.`,
          severity: 'error',
        });
      }
    });

    // 3. Détection des ordres incohérents
    const headerIdx = visibleBlocks.findIndex((b) => b.blockCode === 'HEADER' || b.blockCode === 'LOGO');
    const footerIdx = visibleBlocks.findIndex((b) => b.blockCode === 'FOOTER');
    const resultsIdx = visibleBlocks.findIndex((b) => b.blockCode === 'RESULTS_TABLE');
    const signaturesIdx = visibleBlocks.findIndex((b) => b.blockCode === 'SIGNATURES');

    if (headerIdx !== -1 && footerIdx !== -1 && footerIdx < headerIdx) {
      errors.push({
        type: 'INCONSISTENT_ORDER',
        blockCode: 'FOOTER',
        message: 'Le bloc Pied de Page (FOOTER) doit impérativement se situer après l’en-tête (HEADER).',
        severity: 'error',
      });
    }

    if (resultsIdx !== -1 && signaturesIdx !== -1 && signaturesIdx < resultsIdx) {
      warnings.push({
        type: 'INCONSISTENT_ORDER',
        blockCode: 'SIGNATURES',
        message: 'Il est vivement recommandé d’insérer le bloc Signatures après le Tableau des Notes.',
        severity: 'warning',
      });
    }

    // 4. Détection des configurations invalides
    visibleBlocks.forEach((b) => {
      const cfg = b.configuration || {};

      if (cfg.fontSize && typeof cfg.fontSize === 'string' && (cfg.fontSize.startsWith('-') || cfg.fontSize === '0px')) {
        errors.push({
          type: 'INVALID_CONFIGURATION',
          blockId: b.id,
          blockCode: b.blockCode,
          message: `Taille de police invalide (${cfg.fontSize}) pour le bloc "${b.blockName}".`,
          severity: 'error',
        });
      }

      if (cfg.width && typeof cfg.width === 'string' && cfg.width.startsWith('-')) {
        errors.push({
          type: 'INVALID_CONFIGURATION',
          blockId: b.id,
          blockCode: b.blockCode,
          message: `Largeur invalide (${cfg.width}) pour le bloc "${b.blockName}".`,
          severity: 'error',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};
