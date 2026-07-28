import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStaff,
  updateStaff,
  archiveStaff,
  restoreStaff,
  getStaffById,
  getStaffByEmployeeNumber,
  listStaff,
  searchStaff,
} from '../../src/services/staff/staffService';
import {
  listPositions,
  createPosition,
  updatePosition,
  archivePosition,
} from '../../src/services/staff/staffPositionsService';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  archiveDepartment,
} from '../../src/services/staff/staffDepartmentsService';
import {
  createContract,
  updateContract,
  renewContract,
  terminateContract,
  getCurrentContract,
  getContractHistory,
} from '../../src/services/staff/staffContractsService';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
} from '../../src/services/staff/staffDocumentsService';

describe('Staff Module Services Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('staffService CRUD & Search', () => {
    it('createStaff creates employee with homogeneous ServiceResponse format', async () => {
      const res = await createStaff({
        firstName: 'Emmanuel',
        lastName: 'Kassi',
        gender: 'Masculin',
        role: 'Enseignant',
        phonePrimary: '+225 0707070707',
        email: 'emmanuel.kassi@example.com',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.firstName).toBe('Emmanuel');
      expect(res.data?.status).toBe('Actif');
    });

    it('createStaff rejects missing required fields', async () => {
      const res1 = await createStaff({ firstName: '', lastName: '' });
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('obligatoire');

      const res2 = await createStaff({ firstName: 'Jean', lastName: 'Kouassi', phonePrimary: '' });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('téléphone');
    });

    it('updateStaff updates existing staff member properties and handles invalid IDs', async () => {
      const createRes = await createStaff({
        firstName: 'Solange',
        lastName: 'Bamba',
        phonePrimary: '+225 0101010101',
      });
      const staffId = createRes.data!.id;

      const updateRes = await updateStaff(staffId, { phoneSecondary: '+225 0202020202' });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.phoneSecondary).toBe('+225 0202020202');

      const invalidRes = await updateStaff('', { phoneSecondary: '123' });
      expect(invalidRes.success).toBe(false);
    });

    it('archiveStaff and restoreStaff manage soft delete state', async () => {
      const createRes = await createStaff({
        firstName: 'Marc',
        lastName: 'Yao',
        phonePrimary: '+225 0303030303',
      });
      const staffId = createRes.data!.id;

      const archiveRes = await archiveStaff(staffId);
      expect(archiveRes.success).toBe(true);

      const staffRes = await getStaffById(staffId);
      expect(staffRes.data?.status).toBe('Archivé');

      const restoreRes = await restoreStaff(staffId);
      expect(restoreRes.success).toBe(true);

      const restored = await getStaffById(staffId);
      expect(restored.data?.status).toBe('Actif');

      const invalidArchive = await archiveStaff('');
      expect(invalidArchive.success).toBe(false);

      const invalidRestore = await restoreStaff('');
      expect(invalidRestore.success).toBe(false);
    });

    it('listStaff and searchStaff return paginated results', async () => {
      const res = await listStaff({ page: 1, pageSize: 10 });
      expect(res.success).toBe(true);
      expect(res.data?.staffMembers).toBeDefined();
      expect(res.data?.page).toBe(1);

      const searchRes = await searchStaff({ searchQuery: 'Kassi' });
      expect(searchRes.success).toBe(true);
      expect(Array.isArray(searchRes.data?.staffMembers)).toBe(true);
    });

    it('getStaffByEmployeeNumber resolves employee by registration code and handles missing ID', async () => {
      const createRes = await createStaff({
        employeeNumber: 'EMP-9999',
        firstName: 'TestCode',
        lastName: 'Staff',
        phonePrimary: '+225 999999',
      });
      const res = await getStaffByEmployeeNumber('EMP-9999');
      expect(res.success).toBe(true);
      expect(res.data?.firstName).toBe('TestCode');

      const missingRes = await getStaffByEmployeeNumber('');
      expect(missingRes.success).toBe(false);

      const notFoundRes = await getStaffByEmployeeNumber('EMP-UNKNOWN-99');
      expect(notFoundRes.success).toBe(false);

      const getByIdMissing = await getStaffById('');
      expect(getByIdMissing.success).toBe(false);
    });
  });

  describe('staffPositionsService & staffDepartmentsService', () => {
    it('manages positions list and CRUD actions with validations', async () => {
      const listRes = await listPositions();
      expect(listRes.success).toBe(true);
      expect(listRes.data?.length).toBeGreaterThan(0);

      const createRes = await createPosition({ title: 'Chef de Travaux', hierarchyLevel: 7 });
      expect(createRes.success).toBe(true);

      const updateRes = await updatePosition(createRes.data!.id, { hierarchyLevel: 8 });
      expect(updateRes.success).toBe(true);

      const archiveRes = await archivePosition(createRes.data!.id);
      expect(archiveRes.success).toBe(true);

      const errCreate = await createPosition({ title: '' });
      expect(errCreate.success).toBe(false);

      const errUpdate = await updatePosition('', { title: 'X' });
      expect(errUpdate.success).toBe(false);

      const errArchive = await archivePosition('');
      expect(errArchive.success).toBe(false);
    });

    it('manages departments list and CRUD actions with validations', async () => {
      const listRes = await listDepartments();
      expect(listRes.success).toBe(true);
      expect(listRes.data?.length).toBeGreaterThan(0);

      const createRes = await createDepartment({ name: 'Service Informatique', code: 'IT' });
      expect(createRes.success).toBe(true);

      const updateRes = await updateDepartment(createRes.data!.id, { description: 'Gestion réseau' });
      expect(updateRes.success).toBe(true);

      const archiveRes = await archiveDepartment(createRes.data!.id);
      expect(archiveRes.success).toBe(true);

      const errCreate = await createDepartment({ name: '' });
      expect(errCreate.success).toBe(false);

      const errUpdate = await updateDepartment('', { name: 'X' });
      expect(errUpdate.success).toBe(false);

      const errArchive = await archiveDepartment('');
      expect(errArchive.success).toBe(false);
    });
  });

  describe('staffContractsService & staffDocumentsService', () => {
    it('manages staff contracts lifecycle and validates parameters', async () => {
      const createRes = await createContract({
        staffId: 'stf-100',
        contractType: 'CDD',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        baseSalary: 300000,
      });
      expect(createRes.success).toBe(true);
      const contractId = createRes.data!.id;

      const renewRes = await renewContract(contractId, '2027-12-31', 350000);
      expect(renewRes.success).toBe(true);
      expect(renewRes.data?.status).toBe('RENOUVELÉ');

      const currentRes = await getCurrentContract('stf-100');
      expect(currentRes.success).toBe(true);

      const historyRes = await getContractHistory('stf-100');
      expect(historyRes.success).toBe(true);

      const termRes = await terminateContract(contractId, '2026-06-30', 'Démission');
      expect(termRes.success).toBe(true);

      const err1 = await createContract({ staffId: '', startDate: '2026-01-01' });
      expect(err1.success).toBe(false);

      const err2 = await createContract({ staffId: 'stf-1', startDate: '' });
      expect(err2.success).toBe(false);

      const errUpdate = await updateContract('', {});
      expect(errUpdate.success).toBe(false);

      const errRenew = await renewContract('', '2027-01-01');
      expect(errRenew.success).toBe(false);

      const errTerm = await terminateContract('', '2027-01-01');
      expect(errTerm.success).toBe(false);

      const errCurr = await getCurrentContract('');
      expect(errCurr.success).toBe(false);

      const errHist = await getContractHistory('');
      expect(errHist.success).toBe(false);
    });

    it('manages staff documents upload and deletion with validations', async () => {
      const uploadRes = await uploadDocument({
        staffId: 'stf-100',
        docName: 'Contrat de Travail 2026',
        docType: 'Contrat',
        storagePath: 'staff/docs/contract_100.pdf',
        fileSize: 102400,
      });
      expect(uploadRes.success).toBe(true);

      const listRes = await listDocuments('stf-100');
      expect(listRes.success).toBe(true);
      expect(listRes.data?.length).toBeGreaterThan(0);

      const deleteRes = await deleteDocument(uploadRes.data!.id!);
      expect(deleteRes.success).toBe(true);

      const errUpload = await uploadDocument({ staffId: '', docName: '', storagePath: '', docType: 'Autre' });
      expect(errUpload.success).toBe(false);

      const errList = await listDocuments('');
      expect(errList.success).toBe(false);

      const errDelete = await deleteDocument('');
      expect(errDelete.success).toBe(false);
    });
  });
});
