/**
 * Tests unitaires — Calculs financiers de l'application GESCO
 * Vérifie les formules clés : frais de scolarité, remises, paiements partiels,
 * statuts de paiement, et calculs de solde.
 * Ces calculs sont critiques pour l'intégrité comptable de l'établissement.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  canteenPaymentService,
  clearCanteenPaymentsStore,
} from '../src/services/canteen/canteenPaymentService';
import {
  transportPaymentService,
  clearTransportPaymentsStore,
} from '../src/services/transport/transportPaymentService';

// ─── Helpers répliqués depuis la logique métier ────────────────────────────────

const calculateTotalWithDiscount = (base: number, discountPercent: number): number => {
  if (discountPercent < 0 || discountPercent > 100) throw new Error('Remise invalide');
  return base * (1 - discountPercent / 100);
};

const getPaymentStatus = (paid: number, total: number): 'Payé' | 'Partiel' | 'Non payé' => {
  if (total <= 0) throw new Error('Total invalide');
  if (paid >= total) return 'Payé';
  if (paid > 0) return 'Partiel';
  return 'Non payé';
};

const calculateRemaining = (total: number, paid: number): number => {
  return Math.max(0, total - paid);
};

const calculateInstalment = (total: number, months: number): number => {
  if (months <= 0) throw new Error('Nombre de mois invalide');
  return total / months;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Calculs de remises', () => {
  it('applique une remise de 0% correctement', () => {
    expect(calculateTotalWithDiscount(1000, 0)).toBe(1000);
  });

  it('applique une remise de 10%', () => {
    expect(calculateTotalWithDiscount(1000, 10)).toBe(900);
  });

  it('applique une remise de 100%', () => {
    expect(calculateTotalWithDiscount(1000, 100)).toBe(0);
  });

  it('rejette une remise négative', () => {
    expect(() => calculateTotalWithDiscount(1000, -5)).toThrow('Remise invalide');
  });

  it('rejette une remise supérieure à 100%', () => {
    expect(() => calculateTotalWithDiscount(1000, 110)).toThrow('Remise invalide');
  });

  it('calcule correctement pour des montants décimaux', () => {
    expect(calculateTotalWithDiscount(333.33, 15)).toBeCloseTo(283.33, 1);
  });
});

describe('Statuts de paiement', () => {
  it('retourne "Payé" quand le paiement est complet', () => {
    expect(getPaymentStatus(1000, 1000)).toBe('Payé');
  });

  it('retourne "Payé" quand le paiement dépasse le total (overpayment)', () => {
    expect(getPaymentStatus(1100, 1000)).toBe('Payé');
  });

  it('retourne "Partiel" quand il y a un paiement incomplet', () => {
    expect(getPaymentStatus(500, 1000)).toBe('Partiel');
  });

  it('retourne "Non payé" quand rien n\'a été payé', () => {
    expect(getPaymentStatus(0, 1000)).toBe('Non payé');
  });

  it('rejette un total invalide (0)', () => {
    expect(() => getPaymentStatus(0, 0)).toThrow('Total invalide');
  });

  it('rejette un total négatif', () => {
    expect(() => getPaymentStatus(0, -100)).toThrow('Total invalide');
  });
});

describe('Calcul des soldes restants', () => {
  it('calcule correctement le solde restant', () => {
    expect(calculateRemaining(1000, 400)).toBe(600);
  });

  it('retourne 0 si le paiement est complet', () => {
    expect(calculateRemaining(1000, 1000)).toBe(0);
  });

  it('retourne 0 si le paiement dépasse le total (pas de négatif)', () => {
    expect(calculateRemaining(1000, 1200)).toBe(0);
  });

  it('gère le cas initial sans aucun paiement', () => {
    expect(calculateRemaining(750, 0)).toBe(750);
  });
});

describe('Calcul des mensualités', () => {
  it('divise correctement sur 10 mois', () => {
    expect(calculateInstalment(1000, 10)).toBe(100);
  });

  it('divise correctement sur 12 mois', () => {
    expect(calculateInstalment(1200, 12)).toBe(100);
  });

  it('gère les montants non divisibles', () => {
    expect(calculateInstalment(1000, 3)).toBeCloseTo(333.33, 2);
  });

  it('rejette 0 mois', () => {
    expect(() => calculateInstalment(1000, 0)).toThrow('Nombre de mois invalide');
  });

  it('rejette un nombre de mois négatif', () => {
    expect(() => calculateInstalment(1000, -1)).toThrow('Nombre de mois invalide');
  });
});

describe('Paiements en ligne — Cantine & Transport', () => {
  beforeEach(() => {
    clearCanteenPaymentsStore();
    clearTransportPaymentsStore();
  });

  it('refuse un paiement cantine hors ligne sans le mettre en attente localement', async () => {
    vi.spyOn(canteenPaymentService, 'isOnline').mockReturnValue(false);
    const payRes = await canteenPaymentService.recordPayment({
      enrollmentId: 'enrollment-canteen',
      amount: 15000,
      paymentDate: '2026-09-10',
      paymentMode: 'CASH',
    });
    expect(payRes.success).toBe(false);
    expect(payRes.error).toMatch(/Connexion Internet requise/);
    expect(canteenPaymentService.getPendingSyncCount()).toBe(0);
    expect(canteenPaymentService.getPendingPayments()).toEqual([]);
  });

  it('refuse un paiement transport hors ligne sans le mettre en attente localement', async () => {
    vi.spyOn(transportPaymentService, 'isOnline').mockReturnValue(false);
    const payRes = await transportPaymentService.recordPayment({
      enrollmentId: 'enrollment-transport',
      amount: 20000,
      paymentDate: '2026-09-12',
      paymentMode: 'ORANGE_MONEY',
    });
    expect(payRes.success).toBe(false);
    expect(payRes.error).toMatch(/Connexion Internet requise/);
    expect(transportPaymentService.getPendingSyncCount()).toBe(0);
    expect(transportPaymentService.getPendingPayments()).toEqual([]);
  });
});
