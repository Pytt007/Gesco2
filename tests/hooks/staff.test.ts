import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaff } from '../../src/hooks/staff/useStaff';
import { useStaffMember } from '../../src/hooks/staff/useStaffMember';
import { useStaffContracts } from '../../src/hooks/staff/useStaffContracts';
import { useStaffDocuments } from '../../src/hooks/staff/useStaffDocuments';
import { useStaffPositions } from '../../src/hooks/staff/useStaffPositions';
import { useStaffDepartments } from '../../src/hooks/staff/useStaffDepartments';

describe('Staff Module Hooks Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useStaff', () => {
    it('initializes reactive state, search filters and exposes CRUD actions', async () => {
      const { result } = renderHook(() => useStaff());

      expect(result.current.staffMembers).toBeDefined();
      expect(result.current.page).toBe(1);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.statusFilter).toBe('Actif');

      let createOk = false;
      await act(async () => {
        createOk = await result.current.create({
          firstName: 'HookStaff',
          lastName: 'Test',
          phonePrimary: '+225 01010101',
        });
      });

      expect(createOk).toBe(true);
      expect(result.current.staffMembers.length).toBeGreaterThan(0);

      const targetId = result.current.staffMembers[0].id;

      let updateOk = false;
      await act(async () => {
        updateOk = await result.current.update(targetId, { phoneSecondary: '+225 999999' });
      });
      expect(updateOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        archiveOk = await result.current.archive(targetId);
      });
      expect(archiveOk).toBe(true);

      let restoreOk = false;
      await act(async () => {
        restoreOk = await result.current.restore(targetId);
      });
      expect(restoreOk).toBe(true);
    });

    it('updates filters, sorting and pagination state', async () => {
      const { result } = renderHook(() => useStaff());

      act(() => {
        result.current.setSearchQuery('Kassi');
        result.current.setPage(2);
        result.current.setStatusFilter('Inactif');
        result.current.setSortBy('firstName');
        result.current.setSortOrder('desc');
      });

      expect(result.current.searchQuery).toBe('Kassi');
      expect(result.current.page).toBe(2);
      expect(result.current.statusFilter).toBe('Inactif');
      expect(result.current.sortBy).toBe('firstName');
      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('useStaffMember', () => {
    it('loads single staff member record and allows update/archive/restore', async () => {
      const { result: listHook } = renderHook(() => useStaff());

      let staffId = '';
      await act(async () => {
        await listHook.current.create({
          firstName: 'SingleStaff',
          lastName: 'Test',
          phonePrimary: '+225 02020202',
        });
      });
      staffId = listHook.current.staffMembers[0].id;

      const { result: memberHook } = renderHook(() => useStaffMember(staffId));

      await act(async () => {
        await memberHook.current.refresh();
      });

      expect(memberHook.current.staffMember).toBeDefined();

      let updateOk = false;
      await act(async () => {
        updateOk = await memberHook.current.update({ email: 'single@example.com' });
      });

      expect(updateOk).toBe(true);
      expect(memberHook.current.staffMember?.email).toBe('single@example.com');

      let archiveOk = false;
      await act(async () => {
        archiveOk = await memberHook.current.archive();
      });
      expect(archiveOk).toBe(true);

      let restoreOk = false;
      await act(async () => {
        restoreOk = await memberHook.current.restore();
      });
      expect(restoreOk).toBe(true);
    });
  });

  describe('useStaffContracts & useStaffDocuments', () => {
    it('manages contracts lifecycle and history', async () => {
      const staffId = 'stf-hook-test-contract';
      const { result: contractHook } = renderHook(() => useStaffContracts(staffId));

      await act(async () => {
        await contractHook.current.refresh();
      });

      expect(contractHook.current.currentContract).toBeDefined();

      let createOk = false;
      await act(async () => {
        createOk = await contractHook.current.createContract({
          staffId,
          contractType: 'CDD',
          startDate: '2026-01-01',
          baseSalary: 200000,
        });
      });
      expect(createOk).toBe(true);

      let updateOk = false;
      await act(async () => {
        if (contractHook.current.currentContract?.id) {
          updateOk = await contractHook.current.updateContract(
            contractHook.current.currentContract.id,
            { baseSalary: 210000 }
          );
        }
      });
      expect(updateOk).toBe(true);

      let renewOk = false;
      await act(async () => {
        if (contractHook.current.currentContract?.id) {
          renewOk = await contractHook.current.renewContract(
            contractHook.current.currentContract.id,
            '2027-01-01',
            220000
          );
        }
      });
      expect(renewOk).toBe(true);

      let terminateOk = false;
      await act(async () => {
        if (contractHook.current.currentContract?.id) {
          terminateOk = await contractHook.current.terminateContract(
            contractHook.current.currentContract.id,
            '2026-12-31',
            'Fin de contrat'
          );
        }
      });
      expect(terminateOk).toBe(true);
    });

    it('manages document list, upload and deletion', async () => {
      const staffId = 'stf-hook-test-doc';
      const { result: docHook } = renderHook(() => useStaffDocuments(staffId));

      await act(async () => {
        await docHook.current.refresh();
      });

      let uploadOk = false;
      await act(async () => {
        uploadOk = await docHook.current.uploadDocument({
          staffId,
          docName: 'CV 2026',
          docType: 'CV',
          storagePath: 'staff/docs/cv_2026.pdf',
        });
      });
      expect(uploadOk).toBe(true);

      expect(docHook.current.documents.length).toBeGreaterThan(0);

      let deleteOk = false;
      await act(async () => {
        const docId = docHook.current.documents[0]?.id;
        if (docId) {
          deleteOk = await docHook.current.deleteDocument(docId);
        }
      });
      expect(deleteOk).toBe(true);
    });
  });

  describe('useStaffPositions & useStaffDepartments', () => {
    it('manages positions list and CRUD', async () => {
      const { result: posHook } = renderHook(() => useStaffPositions());

      await act(async () => {
        await posHook.current.refresh();
      });

      expect(posHook.current.positions.length).toBeGreaterThan(0);

      let createOk = false;
      await act(async () => {
        createOk = await posHook.current.createPosition({ title: 'Adjoint Pédagogique', hierarchyLevel: 8 });
      });
      expect(createOk).toBe(true);

      let updateOk = false;
      await act(async () => {
        const id = posHook.current.positions[0]?.id;
        if (id) updateOk = await posHook.current.updatePosition(id, { hierarchyLevel: 9 });
      });
      expect(updateOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        const id = posHook.current.positions[0]?.id;
        if (id) archiveOk = await posHook.current.archivePosition(id);
      });
      expect(archiveOk).toBe(true);
    });

    it('manages departments list and CRUD', async () => {
      const { result: deptHook } = renderHook(() => useStaffDepartments());

      await act(async () => {
        await deptHook.current.refresh();
      });

      expect(deptHook.current.departments.length).toBeGreaterThan(0);

      let createOk = false;
      await act(async () => {
        createOk = await deptHook.current.createDepartment({ name: 'Laboratoire Sciences', code: 'LAB' });
      });
      expect(createOk).toBe(true);

      let updateOk = false;
      await act(async () => {
        const id = deptHook.current.departments[0]?.id;
        if (id) updateOk = await deptHook.current.updateDepartment(id, { description: 'Recherche' });
      });
      expect(updateOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        const id = deptHook.current.departments[0]?.id;
        if (id) archiveOk = await deptHook.current.archiveDepartment(id);
      });
      expect(archiveOk).toBe(true);
    });
  });
});
