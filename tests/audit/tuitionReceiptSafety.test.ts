import { describe, expect, it, vi } from 'vitest';
import { tuitionPaymentService } from '../../src/services/finance/tuitionPaymentService';
import type { StudentFinancialEnrollment, TuitionPaymentRecord } from '../../src/services/finance/types';

vi.mock('../../src/services/settings/settingsService', () => ({
  fetchSchoolInfo: async () => ({ name: '<script>alert(1)</script>', logoUrl: 'javascript:alert(1)', phone: '01&02' }),
}));
vi.mock('../../src/services/documents/qrCodeService', () => ({
  qrCodeService: { generateChecksum: async () => 'checksum', generateQRCodeDataURL: async () => 'data:image/png;base64,AAAA' },
}));

describe('Printable tuition receipt', () => {
  it('escapes record values and rejects unsafe image URLs', async () => {
    const payment = {
      receiptNumber: 'REC-1', amount: 1000, paymentDate: '2026-10-09', paymentMode: 'CASH', recordedBy: '<img src=x onerror=alert(1)>',
    } as TuitionPaymentRecord;
    const enrollment = {
      studentId: 'student-1', studentName: '<script>alert(2)</script>', matricule: 'G-001',
      academicYearId: 'year-1', className: 'CM1 & A', parentSponsor: '<b>Parent</b>', remainingBalance: 0,
    } as StudentFinancialEnrollment;

    const receipt = await tuitionPaymentService.generateReceiptData(payment, enrollment);
    expect(receipt.htmlContent).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(receipt.htmlContent).toContain('CM1 &amp; A');
    expect(receipt.htmlContent).toContain('&lt;b&gt;Parent&lt;/b&gt;');
    expect(receipt.htmlContent).not.toContain('<script>');
    expect(receipt.htmlContent).not.toContain('javascript:');
    expect(receipt.htmlContent).not.toContain('<img src=x onerror=alert(1)>');
    expect(receipt.htmlContent).toContain('src="data:image/png;base64,AAAA"');
  });
});
