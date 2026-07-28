/**
 * GESCO Document Engine Types
 */

export type DocumentType =
  | 'BULLETIN'
  | 'SCHOOL_RECEIPT'
  | 'CANTEEN_RECEIPT'
  | 'TRANSPORT_RECEIPT'
  | 'CERTIFICATE'
  | 'ATTESTATION'
  | 'ATTENDANCE_LIST'
  | 'REPORT';

export type TemplateCategory = 'ACADEMIC' | 'FINANCE' | 'ADMINISTRATIVE' | 'REPORT';

export type SectionType =
  | 'HEADER'
  | 'SCHOOL_INFO'
  | 'STUDENT_INFO'
  | 'GRADES_TABLE'
  | 'STATISTICS'
  | 'SIGNATURES'
  | 'QR_CODE'
  | 'FOOTER'
  | 'RECEIPT_DETAILS'
  | 'ATTENDANCE_TABLE'
  | 'CUSTOM_TEXT';

export interface DocumentTemplate {
  id: string;
  code: string;
  name: string;
  category: TemplateCategory;
  description?: string;
  version: number;
  schoolId?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSection {
  id: string;
  templateId: string;
  sectionType: SectionType;
  displayOrder: number;
  configuration: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  documentType: DocumentType;
  entityType: 'STUDENT' | 'CLASSROOM' | 'PAYMENT' | 'USER' | 'SYSTEM';
  entityId: string;
  generatedBy: string;
  generatedAt: string;
  pdfUrl?: string | null;
  checksum: string;
}

export interface QRCodePayload {
  documentId: string;
  checksum: string;
  date: string;
  schoolName: string;
  documentType: DocumentType;
  verified?: boolean;
}

export interface DocumentGenerationOptions {
  templateId?: string;
  documentType: DocumentType;
  entityType: 'STUDENT' | 'CLASSROOM' | 'PAYMENT' | 'USER' | 'SYSTEM';
  entityId: string;
  generatedBy: string;
  data: Record<string, any>;
  schoolName?: string;
}

export interface CompiledDocument {
  title: string;
  documentType: DocumentType;
  templateVersion: number;
  sections: Array<{
    sectionType: SectionType;
    displayOrder: number;
    renderedHtml: string;
    configuration: Record<string, any>;
  }>;
  qrCodePayload: QRCodePayload;
  fullHtml: string;
  checksum: string;
}

export interface PDFRenderResult {
  blob: Blob | null;
  dataUrl: string;
  byteSize: number;
}
