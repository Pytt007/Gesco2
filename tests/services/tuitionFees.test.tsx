import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { tuitionFeesService, clearFeeSchedulesStore } from '../../src/services/finance/tuitionFeesService';
import { useTuitionFees } from '../../src/hooks/finance/useTuitionFees';
import { TuitionFeesConfigView } from '../../src/components/finance/TuitionFeesConfigView';
import { ToastProvider } from '../../src/context/ToastContext';
import { SchoolYearProvider } from '../../src/context/SchoolYearContext';
import { AllProviders } from '../testUtils';

describe('Tuition Fees Module Layer (Configuration des frais de scolarité)', () => {
  beforeEach(() => {
    clearFeeSchedulesStore();
  });

  describe('Tuition Fees Service (tuitionFeesService)', () => {
    it('returns default school levels schedules sorted in order (PS to CM2)', async () => {
      const schedules = await tuitionFeesService.getSchedulesByYear('ay-2026');
      expect(schedules.length).toBe(9);

      const codes = schedules.map((s) => s.levelCode);
      expect(codes).toEqual(['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2']);

      // Check auto calculation of total annual fee
      schedules.forEach((s) => {
        expect(s.totalAnnualFee).toBe(s.registrationFee + s.tuitionFee);
      });
    });

    it('creates a new level fee schedule and calculates total annual fee automatically', async () => {
      // Archive existing CP1 level for year ay-2030 to allow creating a new custom schedule
      const list = await tuitionFeesService.getSchedulesByYear('ay-2030');
      const cp1 = list.find((s) => s.levelCode === 'CP1');
      if (cp1) {
        await tuitionFeesService.archiveSchedule(cp1.id);
      }

      const res = await tuitionFeesService.createSchedule({
        academicYearId: 'ay-2030',
        levelCode: 'CP1',
        registrationFee: 75000,
        tuitionFee: 350000,
        allowFixedDiscount: true,
        allowPercentDiscount: true,
        maxDiscountPercent: 25,
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.totalAnnualFee).toBe(425000);
      expect(res.data?.allowFixedDiscount).toBe(true);
      expect(res.data?.allowPercentDiscount).toBe(true);
    });

    it('rejects negative registration or tuition fee amounts', async () => {
      const res1 = await tuitionFeesService.createSchedule({
        academicYearId: 'ay-2030',
        levelCode: 'CE1',
        registrationFee: -1000,
        tuitionFee: 200000,
      });
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('négatifs');

      const res2 = await tuitionFeesService.createSchedule({
        academicYearId: 'ay-2030',
        levelCode: 'CE1',
        registrationFee: 50000,
        tuitionFee: -5000,
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('négatifs');
    });

    it('prevents duplicate level fee schedules for the same academic year', async () => {
      const res = await tuitionFeesService.createSchedule({
        academicYearId: 'ay-2026',
        levelCode: 'CP1',
        registrationFee: 60000,
        tuitionFee: 300000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Un tarif existe déjà pour le niveau CP1');
    });

    it('updates existing schedule and recalculates annual total', async () => {
      const list = await tuitionFeesService.getSchedulesByYear('ay-2026');
      const target = list[0]; // PS

      const updateRes = await tuitionFeesService.updateSchedule(target.id, {
        registrationFee: 55000,
        tuitionFee: 260000,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.registrationFee).toBe(55000);
      expect(updateRes.data?.tuitionFee).toBe(260000);
      expect(updateRes.data?.totalAnnualFee).toBe(315000);
    });

    it('archives a fee schedule cleanly', async () => {
      const list = await tuitionFeesService.getSchedulesByYear('ay-2026');
      const target = list[list.length - 1]; // CM2

      const archiveRes = await tuitionFeesService.archiveSchedule(target.id);
      expect(archiveRes.success).toBe(true);

      const updatedList = await tuitionFeesService.getSchedulesByYear('ay-2026');
      expect(updatedList.some((s) => s.id === target.id)).toBe(false);
    });

    it('duplicates fee schedules from previous academic year to active year', async () => {
      const dupRes = await tuitionFeesService.duplicatePreviousYearSchedules('ay-2026', 'ay-2028');
      expect(dupRes.success).toBe(true);
      expect(dupRes.data?.length).toBeGreaterThan(0);

      const targetList = await tuitionFeesService.getSchedulesByYear('ay-2028');
      expect(targetList.length).toBe(dupRes.data?.length);
    });
  });

  describe('Tuition Fees React Hook Layer (useTuitionFees)', () => {
    it('loads schedules, computes grand totals, and handles creation and updates reactively', async () => {
      const { result } = renderHook(() => useTuitionFees('ay-2026'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.schedules.length).toBeGreaterThan(0);
      expect(result.current.grandTotals.totalAnnual).toBeGreaterThan(0);

      let success = false;
      await act(async () => {
        success = await result.current.updateFeeSchedule(result.current.schedules[0].id, {
          registrationFee: 50000,
          tuitionFee: 300000,
        });
      });

      expect(success).toBe(true);
      expect(result.current.schedules[0].totalAnnualFee).toBe(350000);
    });
  });

  describe('Tuition Fees UI Component Layer (TuitionFeesConfigView)', () => {
    it('renders title, academic year selector, level rows and duplicate button', async () => {
      render(
        <AllProviders>
          <TuitionFeesConfigView />
        </AllProviders>
      );

      expect(screen.getByText('Configuration des frais de scolarité')).toBeInTheDocument();
      expect(screen.getByText(/Dupliquer les tarifs/i)).toBeInTheDocument();
      expect(screen.getByText('Ajouter un tarif')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('PS')).toBeInTheDocument();
        expect(screen.getByText('CP1')).toBeInTheDocument();
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      // Assert auto annual total calculation presence
      expect(screen.getAllByText(/FCFA/i).length).toBeGreaterThan(0);
    });
  });
});
