import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  clearMedicalRecordsCache,
} from '../../src/services/students/medicalRecordsService';

describe('Medical Records Service & Validation Layer (P2-24)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearMedicalRecordsCache();
  });

  it('rejects missing studentId or emergency phone', async () => {
    const resNoStudent = await createMedicalRecord({
      studentId: '',
      emergencyPhone: '+225 01020304',
    });
    expect(resNoStudent.success).toBe(false);
    expect(resNoStudent.error).toContain('identifiant élève');

    const resNoPhone = await createMedicalRecord({
      studentId: 'st-01',
      emergencyPhone: '',
    });
    expect(resNoPhone.success).toBe(false);
    expect(resNoPhone.error).toContain('d\'urgence');
  });

  it('rejects invalid blood types', async () => {
    const resBadBlood = await createMedicalRecord({
      studentId: 'st-01',
      emergencyPhone: '+225 01020304',
      bloodType: 'Z+' as any,
    });
    expect(resBadBlood.success).toBe(false);
    expect(resBadBlood.error).toContain('Groupe sanguin invalide');
  });

  it('successfully creates and retrieves medical record with valid blood type and allergies', async () => {
    const created = await createMedicalRecord({
      studentId: 'st-med-1',
      bloodType: 'O+',
      emergencyPhone: '+225 07080910',
      allergies: 'Arachides, Pénicilline',
      knownDiseases: 'Asthme léger',
      treatments: 'Ventoline au besoin',
      referringDoctor: 'Dr. Kouadio',
    });

    expect(created.success).toBe(true);
    expect(created.data?.id).toBeDefined();
    expect(created.data?.bloodType).toBe('O+');

    const fetched = await getMedicalRecord('st-med-1');
    expect(fetched.success).toBe(true);
    expect(fetched.data?.allergies).toBe('Arachides, Pénicilline');
    expect(fetched.data?.referringDoctor).toBe('Dr. Kouadio');
  });

  it('updates medical record and validates updated blood type', async () => {
    const created = await createMedicalRecord({
      studentId: 'st-med-2',
      bloodType: 'A+',
      emergencyPhone: '+225 05050505',
    });

    const updateBad = await updateMedicalRecord(created.data!.id!, {
      bloodType: 'INVALID' as any,
    });
    expect(updateBad.success).toBe(false);

    const updateGood = await updateMedicalRecord(created.data!.id!, {
      bloodType: 'AB+',
      allergies: 'Lactose',
    });
    expect(updateGood.success).toBe(true);

    const fetched = await getMedicalRecord('st-med-2');
    expect(fetched.data?.bloodType).toBe('AB+');
    expect(fetched.data?.allergies).toBe('Lactose');
  });

  it('returns a default blank medical record when none exists yet', async () => {
    const fetched = await getMedicalRecord('st-unregistered');
    expect(fetched.success).toBe(true);
    expect(fetched.data?.studentId).toBe('st-unregistered');
    expect(fetched.data?.bloodType).toBeUndefined();
  });
});
