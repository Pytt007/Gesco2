import { DocumentBlock, BlockCode, BlockCategory } from './types';
import { supabase } from '../../common/supabaseClient';

const defaultBlocksCatalog: DocumentBlock[] = [
  {
    id: 'blk-logo',
    code: 'LOGO',
    name: 'Logo Établissement',
    category: 'HEADER',
    description: 'Emblème ou logo officiel de l’école',
    icon: 'image',
    isMandatory: false,
    defaultConfiguration: { width: '80px', alignment: 'center', marginBottom: '10px' },
  },
  {
    id: 'blk-header',
    code: 'HEADER',
    name: 'En-tête de Document',
    category: 'HEADER',
    description: 'Titre principal, ministère, pays et sous-titres',
    icon: 'layout',
    isMandatory: true,
    defaultConfiguration: { fontSize: '18px', color: '#1e3a8a', alignment: 'center', fontWeight: 'bold' },
  },
  {
    id: 'blk-school-info',
    code: 'SCHOOL_INFORMATION',
    name: 'Informations École',
    category: 'IDENTITY',
    description: 'Coordonnées, adresse, téléphone, code école',
    icon: 'building',
    isMandatory: true,
    defaultConfiguration: { fontSize: '12px', layout: 'grid', color: '#475569' },
  },
  {
    id: 'blk-student-info',
    code: 'STUDENT_INFORMATION',
    name: 'Informations Élève',
    category: 'IDENTITY',
    description: 'Nom, prénom, matricule, classe, date de naissance',
    icon: 'user',
    isMandatory: true,
    defaultConfiguration: { fontSize: '13px', backgroundColor: '#eff6ff', borderRadius: '6px', padding: '10px' },
  },
  {
    id: 'blk-parent-info',
    code: 'PARENT_INFORMATION',
    name: 'Informations Parents',
    category: 'IDENTITY',
    description: 'Nom du tuteur, contact d’urgence',
    icon: 'users',
    isMandatory: false,
    defaultConfiguration: { fontSize: '12px', color: '#334155' },
  },
  {
    id: 'blk-class-info',
    code: 'CLASS_INFORMATION',
    name: 'Informations Classe',
    category: 'IDENTITY',
    description: 'Nom de la classe, effectif, professeur principal',
    icon: 'book-open',
    isMandatory: false,
    defaultConfiguration: { fontSize: '12px' },
  },
  {
    id: 'blk-assessment-info',
    code: 'ASSESSMENT_INFORMATION',
    name: 'Infos Évaluation / Session',
    category: 'ACADEMIC',
    description: 'Type de composition, trimestre, année scolaire',
    icon: 'calendar',
    isMandatory: false,
    defaultConfiguration: { fontSize: '12px', alignment: 'left' },
  },
  {
    id: 'blk-results-table',
    code: 'RESULTS_TABLE',
    name: 'Tableau des Notes',
    category: 'ACADEMIC',
    description: 'Grille détaillée des matières, coefficients, notes et appréciation',
    icon: 'table',
    isMandatory: true,
    defaultConfiguration: { border: '1px solid #cbd5e1', showCoeff: true, fontSize: '13px' },
  },
  {
    id: 'blk-average',
    code: 'AVERAGE',
    name: 'Moyenne Générale',
    category: 'SUMMARY',
    description: 'Moyenne calculée de l’élève',
    icon: 'award',
    isMandatory: false,
    defaultConfiguration: { fontSize: '16px', fontWeight: 'bold', color: '#2563eb' },
  },
  {
    id: 'blk-rank',
    code: 'RANK',
    name: 'Rang de l’Élève',
    category: 'SUMMARY',
    description: 'Classement dans la classe',
    icon: 'trending-up',
    isMandatory: false,
    defaultConfiguration: { fontSize: '16px', fontWeight: 'bold', color: '#0d9488' },
  },
  {
    id: 'blk-mention',
    code: 'MENTION',
    name: 'Mention / Distinctions',
    category: 'SUMMARY',
    description: 'Encouragements, Félicitations, Blâme',
    icon: 'star',
    isMandatory: false,
    defaultConfiguration: { fontSize: '14px', fontWeight: '500' },
  },
  {
    id: 'blk-appreciation',
    code: 'APPRECIATION',
    name: 'Appréciation Générale',
    category: 'SUMMARY',
    description: 'Bilan global du travail et de la conduite',
    icon: 'message-square',
    isMandatory: false,
    defaultConfiguration: { fontSize: '13px', backgroundColor: '#f8fafc', padding: '8px' },
  },
  {
    id: 'blk-decision',
    code: 'DECISION',
    name: 'Décision Pédagogique',
    category: 'SUMMARY',
    description: 'Décision de passage, redoublement ou conseil',
    icon: 'check-circle',
    isMandatory: false,
    defaultConfiguration: { fontSize: '15px', fontWeight: 'bold', color: '#16a34a' },
  },
  {
    id: 'blk-signatures',
    code: 'SIGNATURES',
    name: 'Bloc Signatures',
    category: 'VALIDATION',
    description: 'Zone réservée aux signatures et sceaux',
    icon: 'edit-3',
    isMandatory: true,
    defaultConfiguration: { layout: 'horizontal', marginTop: '30px' },
  },
  {
    id: 'blk-director-sig',
    code: 'DIRECTOR_SIGNATURE',
    name: 'Signature Directeur',
    category: 'VALIDATION',
    description: 'Emplacement signature du chef d’établissement',
    icon: 'pen-tool',
    isMandatory: false,
    defaultConfiguration: { customTitle: 'Le Chef d’Établissement' },
  },
  {
    id: 'blk-teacher-sig',
    code: 'TEACHER_SIGNATURE',
    name: 'Signature Professeur',
    category: 'VALIDATION',
    description: 'Emplacement signature du professeur principal',
    icon: 'pen-tool',
    isMandatory: false,
    defaultConfiguration: { customTitle: 'Le Professeur Principal' },
  },
  {
    id: 'blk-stamp',
    code: 'STAMP',
    name: 'Sceau Officiel',
    category: 'VALIDATION',
    description: 'Tampon officiel de l’établissement',
    icon: 'shield',
    isMandatory: false,
    defaultConfiguration: { width: '100px' },
  },
  {
    id: 'blk-qr-code',
    code: 'QR_CODE',
    name: 'QR Code de Sécurité',
    category: 'SECURITY',
    description: 'Code QR d’authentification et de vérification par checksum',
    icon: 'qr-code',
    isMandatory: true,
    defaultConfiguration: { position: 'right', width: '70px', height: '70px' },
  },
  {
    id: 'blk-footer',
    code: 'FOOTER',
    name: 'Pied de Page',
    category: 'SECURITY',
    description: 'Bas de page avec numéro, date d’édition et mentions légales',
    icon: 'type',
    isMandatory: true,
    defaultConfiguration: { fontSize: '11px', color: '#94a3b8', alignment: 'center', marginTop: '20px' },
  },
  {
    id: 'blk-custom-text',
    code: 'CUSTOM_TEXT',
    name: 'Texte Personnalisé',
    category: 'CUSTOM',
    description: 'Zone de texte libre configurable',
    icon: 'align-left',
    isMandatory: false,
    defaultConfiguration: { customText: 'Saisissez votre texte ici...', fontSize: '13px' },
  },
  {
    id: 'blk-custom-table',
    code: 'CUSTOM_TABLE',
    name: 'Tableau Personnalisé',
    category: 'CUSTOM',
    description: 'Tableau de données sur mesure',
    icon: 'grid',
    isMandatory: false,
    defaultConfiguration: { columns: ['Désignation', 'Valeur'] },
  },
  {
    id: 'blk-custom-image',
    code: 'CUSTOM_IMAGE',
    name: 'Image / Filigrane',
    category: 'CUSTOM',
    description: 'Illustration ou image personnalisée',
    icon: 'image',
    isMandatory: false,
    defaultConfiguration: { width: '100%' },
  },
];

/**
 * Service de gestion du Catalogue des Blocs
 */
export const blockService = {
  /**
   * Obtient tous les blocs disponibles (depuis Supabase ou catalogue par défaut)
   */
  async getBlocks(): Promise<DocumentBlock[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('document_blocks').select('*');
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            category: d.category,
            description: d.description,
            icon: d.icon,
            isMandatory: d.is_mandatory,
            defaultConfiguration: d.default_configuration || {},
            createdAt: d.created_at,
          }));
        }
      }
    } catch {
      // Fallback local
    }
    return [...defaultBlocksCatalog];
  },

  /**
   * Recherche un bloc par son code
   */
  getBlockByCode(code: BlockCode): DocumentBlock | undefined {
    return defaultBlocksCatalog.find((b) => b.code === code);
  },

  /**
   * Recherche un bloc par son ID
   */
  getBlockById(id: string): DocumentBlock | undefined {
    return defaultBlocksCatalog.find((b) => b.id === id || b.code === id);
  },

  /**
   * Filtre les blocs par catégorie
   */
  getBlocksByCategory(category: BlockCategory): DocumentBlock[] {
    return defaultBlocksCatalog.filter((b) => b.category === category);
  },

  /**
   * Obtient la liste des blocs obligatoires
   */
  getMandatoryBlocks(): DocumentBlock[] {
    return defaultBlocksCatalog.filter((b) => b.isMandatory);
  },
};
