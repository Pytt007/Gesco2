import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  documentEngine,
  templateEngine,
  qrCodeService,
  pdfRenderer,
  documentHistoryService,
  DocumentType,
  DocumentGenerationOptions,
} from '../../src/services/documents';

describe('Document Engine Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('QR Code & Security Service (qrCodeService)', () => {
    it('generates unique SHA-256 style checksums for documents', () => {
      const checksum1 = qrCodeService.generateChecksum({ test: 1 });
      const checksum2 = qrCodeService.generateChecksum({ test: 2 });

      expect(checksum1).toContain('GESCO-SHA256-');
      expect(checksum2).toContain('GESCO-SHA256-');
      expect(checksum1).not.toEqual(checksum2);
    });

    it('creates, encodes and verifies QR Code payloads', () => {
      const payload = qrCodeService.createQRCodePayload(
        'doc-12345',
        'GESCO-SHA256-ABCDEF-123',
        'Collège Moderne GESCO',
        'BULLETIN'
      );

      expect(payload.documentId).toBe('doc-12345');
      expect(payload.documentType).toBe('BULLETIN');
      expect(payload.schoolName).toBe('Collège Moderne GESCO');

      const encoded = qrCodeService.encodeQRCodePayload(payload);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(10);

      const verifyResult = qrCodeService.verifyQRCodePayload(encoded);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.payload?.documentId).toBe('doc-12345');
      expect(verifyResult.payload?.schoolName).toBe('Collège Moderne GESCO');
    });

    it('rejects invalid or corrupted QR Code payloads', () => {
      const invalidResult = qrCodeService.verifyQRCodePayload('invalid-base64-json');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.reason).toBeDefined();

      const corruptChecksumResult = qrCodeService.verifyQRCodePayload({
        documentId: 'doc-99',
        checksum: 'INVALID_PREFIX_123',
        date: new Date().toISOString(),
        schoolName: 'GESCO School',
        documentType: 'CERTIFICATE',
      });
      expect(corruptChecksumResult.isValid).toBe(false);
    });

    it('generates a valid SVG Data URL for QR Code rendering', () => {
      const payload = qrCodeService.createQRCodePayload('doc-001', 'GESCO-SHA256-1234', 'GESCO', 'SCHOOL_RECEIPT');
      const dataUrl = qrCodeService.generateQRCodeDataUrl(payload);

      expect(dataUrl).toContain('data:image/svg+xml;');
      expect(dataUrl.length).toBeGreaterThan(50);
    });
  });

  describe('Template Engine (templateEngine)', () => {
    it('returns default templates and titles for all 8 document types', () => {
      const templates = templateEngine.getDefaultTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(8);

      const docTypes: DocumentType[] = [
        'BULLETIN',
        'SCHOOL_RECEIPT',
        'CANTEEN_RECEIPT',
        'TRANSPORT_RECEIPT',
        'CERTIFICATE',
        'ATTESTATION',
        'ATTENDANCE_LIST',
        'REPORT',
      ];

      docTypes.forEach((docType) => {
        const title = templateEngine.getDocumentTitle(docType);
        expect(title).toBeDefined();
        expect(title.length).toBeGreaterThan(3);

        const sections = templateEngine.getDefaultSections('tmpl-test', docType);
        expect(sections.length).toBeGreaterThan(0);
        // Assert sections are sorted by displayOrder
        for (let i = 0; i < sections.length - 1; i++) {
          expect(sections[i].displayOrder).toBeLessThanOrEqual(sections[i + 1].displayOrder);
        }
      });
    });

    it('compiles a document with dynamic sections, data and QR Code', () => {
      const options: DocumentGenerationOptions = {
        documentType: 'BULLETIN',
        entityType: 'STUDENT',
        entityId: 'st-101',
        generatedBy: 'Teacher Marie',
        data: {
          studentName: 'KOUASSI Jean',
          matricule: 'MAT-2026-001',
          className: 'CM2 A',
          average: 16.5,
          rank: '1er',
          schoolName: 'École Primaire GESCO',
          subjects: [
            { name: 'Mathématiques', score: 18, maxScore: 20, coeff: 3, appreciation: 'Excellent' },
            { name: 'Français', score: 15, maxScore: 20, coeff: 3, appreciation: 'Très bon' },
          ],
        },
      };

      const compiled = templateEngine.compileDocument(options);

      expect(compiled.title).toBe('BULLETIN DE NOTES');
      expect(compiled.documentType).toBe('BULLETIN');
      expect(compiled.checksum).toContain('GESCO-SHA256-');
      expect(compiled.fullHtml).toContain('KOUASSI Jean');
      expect(compiled.fullHtml).toContain('MAT-2026-001');
      expect(compiled.fullHtml).toContain('Mathématiques');
      expect(compiled.fullHtml).toContain('18');
      expect(compiled.fullHtml).toContain('QR Code');
    });

    it('renders receipt and attendance list sections correctly', () => {
      const receiptHtml = templateEngine.renderSectionHtml(
        { id: 'sec-1', templateId: 't1', sectionType: 'RECEIPT_DETAILS', displayOrder: 10, configuration: {} },
        { paymentLabel: 'Frais de Cantine T1', reference: 'REC-8819', amountPaid: '50 000 FCFA' }
      );
      expect(receiptHtml).toContain('Frais de Cantine T1');
      expect(receiptHtml).toContain('50 000 FCFA');

      const attendanceHtml = templateEngine.renderSectionHtml(
        { id: 'sec-2', templateId: 't1', sectionType: 'ATTENDANCE_TABLE', displayOrder: 10, configuration: {} },
        { students: [{ matricule: 'MAT-01', name: 'KONAN Marie' }] }
      );
      expect(attendanceHtml).toContain('KONAN Marie');
      expect(attendanceHtml).toContain('PRÉSENT');
    });
  });

  describe('Document Engine Core (documentEngine)', () => {
    it('generates a complete document, renders PDF and records history', async () => {
      const options: DocumentGenerationOptions = {
        documentType: 'SCHOOL_RECEIPT',
        entityType: 'PAYMENT',
        entityId: 'pay-901',
        generatedBy: 'Agent Caisse',
        data: {
          studentName: 'YAPO Paul',
          amountPaid: '100 000 FCFA',
          paymentMethod: 'Orange Money',
          schoolName: 'GESCO High School',
        },
      };

      const result = await documentEngine.generateDocument(options);

      expect(result.compiled).toBeDefined();
      expect(result.pdfResult.dataUrl).toContain('data:text/html;');
      expect(result.pdfResult.byteSize).toBeGreaterThan(100);
      expect(result.historyRecord.id).toBeDefined();
      expect(result.historyRecord.checksum).toBe(result.compiled.checksum);
    });

    it('previews a document without saving to history', async () => {
      const options: DocumentGenerationOptions = {
        documentType: 'CERTIFICATE',
        entityType: 'STUDENT',
        entityId: 'st-505',
        generatedBy: 'Secrétariat',
        data: { studentName: 'BAMBA Aminata' },
      };

      const preview = await documentEngine.previewDocument(options);
      expect(preview.title).toBe('CERTIFICAT DE SCOLARITÉ');
      expect(preview.fullHtml).toContain('BAMBA Aminata');
    });

    it('duplicates a template and increments versions without removing original', async () => {
      const defaultTemplates = await documentEngine.getTemplates();
      const original = defaultTemplates[0];

      const duplicated = await documentEngine.duplicateTemplate(
        original.id,
        'BULLETIN_CUSTOM_V2',
        'Bulletin Personnalisé CP1'
      );

      expect(duplicated.id).not.toBe(original.id);
      expect(duplicated.code).toBe('BULLETIN_CUSTOM_V2');
      expect(duplicated.version).toBe(1);
      expect(duplicated.isDefault).toBe(false);

      const versioned = await documentEngine.createTemplateVersion(duplicated.id, {
        description: 'Version révisée avec logo agrandi',
      });

      expect(versioned.version).toBe(2);
      expect(versioned.description).toBe('Version révisée avec logo agrandi');

      const archiveSuccess = await documentEngine.archiveTemplate(versioned.id);
      expect(archiveSuccess).toBe(true);

      const archivedTemplate = await documentEngine.getTemplateById(versioned.id);
      expect(archivedTemplate?.isActive).toBe(false);

      // Testing error cases
      await expect(documentEngine.duplicateTemplate('invalid-id', 'C1', 'N1')).rejects.toThrow();
      await expect(documentEngine.createTemplateVersion('invalid-id', {})).rejects.toThrow();
      const nonExistentArchive = await documentEngine.archiveTemplate('invalid-id');
      expect(nonExistentArchive).toBe(false);
    });

    it('handles downloadPDF and print calls on documentEngine façade', async () => {
      const options: DocumentGenerationOptions = {
        documentType: 'TRANSPORT_RECEIPT',
        entityType: 'STUDENT',
        entityId: 'st-trans-1',
        generatedBy: 'Transport Agent',
        data: { amountPaid: '25 000 FCFA' },
      };

      await expect(documentEngine.downloadPDF(options, 'receipt.html')).resolves.not.toThrow();
      await expect(documentEngine.print(options)).resolves.not.toThrow();
    });
  });

  describe('Document History Service (documentHistoryService)', () => {
    it('logs and retrieves document generation history with filters', async () => {
      const record = await documentHistoryService.logGeneration({
        templateId: 'tmpl-bulletin-default',
        documentType: 'ATTESTATION',
        entityType: 'STUDENT',
        entityId: 'st-777',
        generatedBy: 'Admin Péda',
        checksum: 'GESCO-SHA256-TEST-777',
      });

      expect(record.id).toBeDefined();

      const history = await documentHistoryService.getHistory({ entityId: 'st-777', documentType: 'ATTESTATION', entityType: 'STUDENT' });
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].checksum).toBe('GESCO-SHA256-TEST-777');

      const foundByChecksum = await documentHistoryService.getByChecksum('GESCO-SHA256-TEST-777');
      expect(foundByChecksum).toBeDefined();
      expect(foundByChecksum?.entityId).toBe('st-777');

      const foundById = await documentHistoryService.getById(record.id);
      expect(foundById?.id).toBe(record.id);

      const notFoundChecksum = await documentHistoryService.getByChecksum('NON_EXISTENT');
      expect(notFoundChecksum).toBeNull();
      const notFoundId = await documentHistoryService.getById('NON_EXISTENT');
      expect(notFoundId).toBeNull();
    });
  });

  describe('PDF Renderer Service (pdfRenderer)', () => {
    it('renders HTML to PDF blob and data URL', async () => {
      const options: DocumentGenerationOptions = {
        documentType: 'REPORT',
        entityType: 'SYSTEM',
        entityId: 'sys-01',
        generatedBy: 'Proviseur',
        data: { reportTitle: 'Rapport Annuel 2025-2026' },
      };

      const compiled = templateEngine.compileDocument(options);
      const pdfRes = await pdfRenderer.renderToPDF(compiled);

      expect(pdfRes.blob).toBeDefined();
      expect(pdfRes.byteSize).toBeGreaterThan(0);
      expect(pdfRes.dataUrl).toContain('data:text/html');
    });

    it('triggers print and download handlers without throwing errors', async () => {
      const options: DocumentGenerationOptions = {
        documentType: 'ATTENDANCE_LIST',
        entityType: 'CLASSROOM',
        entityId: 'cls-cp1',
        generatedBy: 'Surveillant',
        data: { className: 'CP1 B' },
      };

      const compiled = templateEngine.compileDocument(options);

      expect(() => pdfRenderer.printHtml(compiled.fullHtml)).not.toThrow();
      expect(() => pdfRenderer.downloadDocument(compiled, 'test_doc.html')).not.toThrow();
    });
  });
});
