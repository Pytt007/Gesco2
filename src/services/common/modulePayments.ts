import { supabase } from './supabaseClient';

export type ModulePaymentKind = 'CANTEEN' | 'TRANSPORT';

type UpdatedBalance = { totalPaid: number; remainingBalance: number; netAmountDue: number };

export async function recordModulePayment<T extends { id: string }>(kind: ModulePaymentKind, payment: T): Promise<UpdatedBalance> {
  const { data, error } = await supabase.rpc('record_module_payment', { p_module: kind, p_payment: payment });
  if (error || !data) throw new Error(error?.message || 'Paiement non confirmé par Neon.');
  return data as UpdatedBalance;
}

export async function readModulePayments<T extends { status: string }>(kind: ModulePaymentKind, enrollmentId: string): Promise<T[]> {
  const { data, error } = await supabase.from('module_payments').select('data,status')
    .eq('module', kind).eq('enrollment_id', enrollmentId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({ ...row.data, status: row.status } as T));
}

export async function cancelModulePayment(kind: ModulePaymentKind, id: string, reason = ''): Promise<void> {
  const { data, error } = await supabase.rpc('cancel_module_payment', { p_module: kind, p_id: id, p_reason: reason });
  if (error || !data) throw new Error(error?.message || 'Annulation non confirmée par Neon.');
}
