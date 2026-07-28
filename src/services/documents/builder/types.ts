/**
 * Types pour le Template Builder GESCO Document Engine
 */

export type BlockCode =
  | 'LOGO'
  | 'HEADER'
  | 'SCHOOL_INFORMATION'
  | 'STUDENT_INFORMATION'
  | 'PARENT_INFORMATION'
  | 'CLASS_INFORMATION'
  | 'ASSESSMENT_INFORMATION'
  | 'RESULTS_TABLE'
  | 'AVERAGE'
  | 'RANK'
  | 'MENTION'
  | 'APPRECIATION'
  | 'DECISION'
  | 'SIGNATURES'
  | 'DIRECTOR_SIGNATURE'
  | 'TEACHER_SIGNATURE'
  | 'STAMP'
  | 'QR_CODE'
  | 'FOOTER'
  | 'CUSTOM_TEXT'
  | 'CUSTOM_TABLE'
  | 'CUSTOM_IMAGE';

export type BlockCategory = 'HEADER' | 'IDENTITY' | 'ACADEMIC' | 'SUMMARY' | 'VALIDATION' | 'SECURITY' | 'CUSTOM';

export interface BlockConfiguration {
  width?: string;
  height?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  marginTop?: string;
  marginBottom?: string;
  padding?: string;
  border?: string;
  borderRadius?: string;
  showCondition?: string; // Expression d'affichage conditionnel (ex: "average >= 10")
  customTitle?: string;
  customText?: string;
  layout?: 'grid' | 'flex' | 'stacked' | 'horizontal';
  [key: string]: any;
}

export interface DocumentBlock {
  id: string;
  code: BlockCode;
  name: string;
  category: BlockCategory;
  description?: string;
  icon?: string;
  isMandatory: boolean;
  defaultConfiguration: BlockConfiguration;
  createdAt?: string;
}

export interface TemplateBlock {
  id: string;
  templateId: string;
  blockId: string;
  blockCode: BlockCode;
  blockName: string;
  displayOrder: number;
  visible: boolean;
  configuration: BlockConfiguration;
  createdAt?: string;
  updatedAt?: string;
}

export type ValidationErrorType = 'INCONSISTENT_ORDER' | 'MISSING_MANDATORY' | 'DUPLICATE' | 'INVALID_CONFIGURATION';

export interface ValidationError {
  type: ValidationErrorType;
  blockCode?: BlockCode;
  blockId?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
