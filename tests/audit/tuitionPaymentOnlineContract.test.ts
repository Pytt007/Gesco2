import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: { rpc: state.rpc },
}));

import { tuitionPaymentService } from '../../src/services/finance/tuitionPaymentService';

describe('Tuition payments require a confirmed Neon transaction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    state.rpc.mockReset();
  });

  it('refuses an offline payment without creating a receipt or calling Neon', async () => {
    vi.spyOn(tuitionPaymentService, 'isOnline').mockReturnValue(false);
    const receipt = vi.spyOn(tuitionPaymentService, 'generateReceiptData');

    const result = await tuitionPaymentService.recordPayment({
      requestId: 'payment-1', enrollmentId: 'enrollment-1', amount: 10000,
      paymentDate: '2026-10-09', paymentMode: 'CASH',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connexion Internet requise');
    expect(state.rpc).not.toHaveBeenCalled();
    expect(receipt).not.toHaveBeenCalled();
  });

  it('does not confirm a payment when Neon rejects or omits the transaction result', async () => {
    const receipt = vi.spyOn(tuitionPaymentService, 'generateReceiptData');
    const input = { requestId: 'payment-2', enrollmentId: 'enrollment-1', amount: 10000,
      paymentDate: '2026-10-09', paymentMode: 'CASH' as const };

    state.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Écriture refusée' } });
    expect(await tuitionPaymentService.recordPayment(input)).toMatchObject({ success: false, error: 'Écriture refusée' });

    state.rpc.mockResolvedValueOnce({ data: { payment: { id: 'payment-2' } }, error: null });
    expect((await tuitionPaymentService.recordPayment(input)).success).toBe(false);
    expect(receipt).not.toHaveBeenCalled();
  });

  it('uses one server transaction and returns success only after its acknowledgment', async () => {
    const payment = { id: 'payment-3', receiptNumber: 'REC-2026-00000001', amount: 10000,
      paymentDate: '2026-10-09', paymentMode: 'CASH' };
    const enrollment = { id: 'enrollment-1', academicYearId: '2026-2027' };
    state.rpc.mockResolvedValueOnce({ data: { payment, enrollment }, error: null });
    vi.spyOn(tuitionPaymentService, 'generateReceiptData').mockResolvedValue({
      receiptNumber: payment.receiptNumber, academicYear: '2026-2027',
    } as any);

    const result = await tuitionPaymentService.recordPayment({
      requestId: 'payment-3', enrollmentId: 'enrollment-1', amount: 10000,
      paymentDate: '2026-10-09', paymentMode: 'CASH',
    });

    expect(state.rpc).toHaveBeenCalledWith('record_tuition_payment', {
      p_request_id: 'payment-3',
      p_input: expect.objectContaining({ enrollmentId: 'enrollment-1', amount: 10000 }),
    });
    expect(result).toMatchObject({ success: true, data: { payment, receipt: { receiptNumber: payment.receiptNumber } } });
  });

  it('does not confirm cancellation when offline, rejected, false, or interrupted', async () => {
    vi.spyOn(tuitionPaymentService, 'isOnline').mockReturnValue(false);
    expect((await tuitionPaymentService.cancelPayment('payment-3')).success).toBe(false);
    expect(state.rpc).not.toHaveBeenCalled();

    vi.restoreAllMocks();
    state.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await tuitionPaymentService.cancelPayment('payment-3')).success).toBe(false);

    state.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Accès refusé' } });
    expect(await tuitionPaymentService.cancelPayment('payment-3')).toMatchObject({ success: false, error: 'Accès refusé' });

    state.rpc.mockRejectedValueOnce(new Error('Réseau indisponible'));
    expect(await tuitionPaymentService.cancelPayment('payment-3')).toMatchObject({ success: false, error: 'Réseau indisponible' });

    state.rpc.mockResolvedValueOnce({ data: true, error: null });
    expect(await tuitionPaymentService.cancelPayment('payment-3', 'Direction', 'Erreur de saisie')).toMatchObject({ success: true, data: true });
  });
});
