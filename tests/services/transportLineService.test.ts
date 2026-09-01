import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  transportLineService,
  transportEnrollmentService,
  clearTransportLineStore,
  clearTransportEnrollmentStore,
  transportVehicleService,
  transportDriverService,
} from '../../src/services/transport';

describe('Transport Line Capacity & Enrollment Control (P2-14)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    clearTransportLineStore();
    clearTransportEnrollmentStore();

    // S'assurer qu'un véhicule à petite capacité (2 places) et un chauffeur existent
    await transportVehicleService.create({
      name: 'Mini Navette VIP',
      licensePlate: '1234-AB-01',
      capacity: 2,
      model: 'Toyota Hiace',
    });

    await transportDriverService.create({
      name: 'Mamadou Kone',
      phone: '0707070707',
      licenseNumber: 'PERMIS-B-999',
    });
  });

  it('enforces vehicle capacity and blocks overcapacity enrollments', async () => {
    const vehicles = await transportVehicleService.getAll();
    const miniBus = vehicles.find((v) => v.name === 'Mini Navette VIP')!;
    const drivers = await transportDriverService.getAll();
    const driver = drivers[0];

    // 1. Créer une ligne avec ce mini bus (capacité = 2)
    const lineRes = await transportLineService.createLine({
      name: 'Ligne Express Cocody',
      zone: 'Cocody Riviera',
      vehicleId: miniBus.id,
      driverId: driver.id,
      annualFee: 150000,
      academicYearId: 'ay-2026',
    });

    expect(lineRes.success).toBe(true);
    const line = lineRes.data!;
    expect(line.vehicleCapacity).toBe(2);
    expect(line.availableSeats).toBe(2);
    expect(line.occupancyRate).toBe(0);

    // 2. Inscrire le 1er élève
    const enr1 = await transportEnrollmentService.createEnrollment({
      studentId: 'st-01',
      studentName: 'Élève 1',
      matricule: 'MAT-01',
      className: '6ème A',
      lineId: line.id,
      academicYearId: 'ay-2026',
    });
    expect(enr1.success).toBe(true);

    const lineAfter1 = transportLineService.getById(line.id)!;
    expect(lineAfter1.enrolledCount).toBe(1);
    expect(lineAfter1.availableSeats).toBe(1);
    expect(lineAfter1.occupancyRate).toBe(50);

    // 3. Inscrire le 2ème élève (saturation)
    const enr2 = await transportEnrollmentService.createEnrollment({
      studentId: 'st-02',
      studentName: 'Élève 2',
      matricule: 'MAT-02',
      className: '6ème B',
      lineId: line.id,
      academicYearId: 'ay-2026',
    });
    expect(enr2.success).toBe(true);

    const lineAfter2 = transportLineService.getById(line.id)!;
    expect(lineAfter2.enrolledCount).toBe(2);
    expect(lineAfter2.availableSeats).toBe(0);
    expect(lineAfter2.occupancyRate).toBe(100);

    // 4. Tentative d'inscription d'un 3ème élève (doit échouer pour surcapacité)
    const enr3 = await transportEnrollmentService.createEnrollment({
      studentId: 'st-03',
      studentName: 'Élève 3',
      matricule: 'MAT-03',
      className: '5ème A',
      lineId: line.id,
      academicYearId: 'ay-2026',
    });
    expect(enr3.success).toBe(false);
    expect(enr3.error).toContain("plus de places disponibles");

    // 5. Annuler la 1ère inscription -> libération de la place
    const cancelRes = await transportEnrollmentService.cancelEnrollment(enr1.data!.id);
    expect(cancelRes.success).toBe(true);

    const lineAfterCancel = transportLineService.getById(line.id)!;
    expect(lineAfterCancel.enrolledCount).toBe(1);
    expect(lineAfterCancel.availableSeats).toBe(1);
    expect(lineAfterCancel.occupancyRate).toBe(50);

    // 6. L'inscription du 3ème élève devient maintenant possible
    const enr3Retry = await transportEnrollmentService.createEnrollment({
      studentId: 'st-03',
      studentName: 'Élève 3',
      matricule: 'MAT-03',
      className: '5ème A',
      lineId: line.id,
      academicYearId: 'ay-2026',
    });
    expect(enr3Retry.success).toBe(true);
  });

  it('rejects vehicle change in updateLine if new vehicle capacity is smaller than current enrollments', async () => {
    const vehicles = await transportVehicleService.getAll();
    const miniBus = vehicles.find((v) => v.name === 'Mini Navette VIP')!;
    const drivers = await transportDriverService.getAll();
    const driver = drivers[0];

    // Créer un véhicule encore plus petit (1 place)
    const microBusRes = await transportVehicleService.create({
      name: 'Micro Navette',
      licensePlate: '5678-CD-02',
      capacity: 1,
      model: 'Peugeot 208',
    });
    const microBus = microBusRes.data!;

    const lineRes = await transportLineService.createLine({
      name: 'Ligne Yopougon',
      zone: 'Yopougon Maroc',
      vehicleId: miniBus.id,
      driverId: driver.id,
      annualFee: 120000,
      academicYearId: 'ay-2026',
    });
    const line = lineRes.data!;

    // Inscrire 2 élèves sur la ligne
    await transportEnrollmentService.createEnrollment({
      studentId: 'st-10',
      studentName: 'Élève 10',
      matricule: 'MAT-10',
      className: '6ème A',
      lineId: line.id,
      academicYearId: 'ay-2026',
    });
    await transportEnrollmentService.createEnrollment({
      studentId: 'st-11',
      studentName: 'Élève 11',
      matricule: 'MAT-11',
      className: '6ème B',
      lineId: line.id,
      academicYearId: 'ay-2026',
    });

    // Tenter de changer vers le micro-bus (1 place alors qu'il y a 2 inscrits)
    const updateRes = await transportLineService.updateLine(line.id, {
      vehicleId: microBus.id,
    });

    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toContain('est inférieure au nombre d\'élèves déjà inscrits');
  });

  describe('Transport Stops & Routes Sequencing (P2-27)', () => {
    it('adds ordered stops and validates 24h pickup and dropoff times', async () => {
      const vehicles = await transportVehicleService.getAll();
      const drivers = await transportDriverService.getAll();

      const lineRes = await transportLineService.createLine({
        name: 'Ligne Plateau-Marcory',
        zone: 'Plateau, Marcory',
        vehicleId: vehicles[0].id,
        driverId: drivers[0].id,
        annualFee: 180000,
        academicYearId: 'ay-2026',
      });
      const lineId = lineRes.data!.id;

      // 1. Ajouter le 1er arrêt
      const stop1 = await transportLineService.addStop(lineId, {
        name: 'Arrêt Carrefour Solibra',
        orderIndex: 1,
        pickupTime: '06:45',
        dropoffTime: '16:30',
        zone: 'Marcory',
      });
      expect(stop1.success).toBe(true);
      expect(stop1.data?.orderIndex).toBe(1);

      // 2. Ajouter le 2ème arrêt
      const stop2 = await transportLineService.addStop(lineId, {
        name: 'Arrêt Immeuble CCIA',
        orderIndex: 2,
        pickupTime: '07:15',
        dropoffTime: '17:00',
        zone: 'Plateau',
      });
      expect(stop2.success).toBe(true);

      // 3. Récupérer les arrêts ordonnés
      const stopsRes = await transportLineService.getStops(lineId);
      expect(stopsRes.success).toBe(true);
      expect(stopsRes.data?.length).toBe(2);
      expect(stopsRes.data?.[0].name).toBe('Arrêt Carrefour Solibra');
      expect(stopsRes.data?.[1].name).toBe('Arrêt Immeuble CCIA');
    });

    it('rejects invalid stop time formats or negative orderIndex', async () => {
      const vehicles = await transportVehicleService.getAll();
      const drivers = await transportDriverService.getAll();

      const lineRes = await transportLineService.createLine({
        name: 'Ligne Test Validation',
        zone: 'Zone Test',
        vehicleId: vehicles[0].id,
        driverId: drivers[0].id,
        annualFee: 100000,
        academicYearId: 'ay-2026',
      });
      const lineId = lineRes.data!.id;

      // Nom manquant
      const noName = await transportLineService.addStop(lineId, {
        name: '',
        orderIndex: 1,
      });
      expect(noName.success).toBe(false);

      // Ordre <= 0
      const badOrder = await transportLineService.addStop(lineId, {
        name: 'Arrêt Invalide',
        orderIndex: 0,
      });
      expect(badOrder.success).toBe(false);

      // Heure invalide
      const badTime = await transportLineService.addStop(lineId, {
        name: 'Arrêt Heure Invalide',
        orderIndex: 1,
        pickupTime: '25:99',
      });
      expect(badTime.success).toBe(false);
      expect(badTime.error).toContain('Format d\'heure de ramassage invalide');
    });

    it('updates and removes stops maintaining route consistency', async () => {
      const vehicles = await transportVehicleService.getAll();
      const drivers = await transportDriverService.getAll();

      const lineRes = await transportLineService.createLine({
        name: 'Ligne Modif Arrêt',
        zone: 'Zone Modif',
        vehicleId: vehicles[0].id,
        driverId: drivers[0].id,
        annualFee: 100000,
        academicYearId: 'ay-2026',
      });
      const lineId = lineRes.data!.id;

      const stop1 = await transportLineService.addStop(lineId, {
        name: 'Arrêt A',
        orderIndex: 1,
      });
      const stop2 = await transportLineService.addStop(lineId, {
        name: 'Arrêt B',
        orderIndex: 2,
      });

      // Mise à jour
      const updateRes = await transportLineService.updateStop(lineId, stop1.data!.id, {
        name: 'Arrêt A Modifié',
        pickupTime: '06:50',
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('Arrêt A Modifié');

      // Suppression
      const removeRes = await transportLineService.removeStop(lineId, stop2.data!.id);
      expect(removeRes.success).toBe(true);

      const remainingStops = await transportLineService.getStops(lineId);
      expect(remainingStops.data?.length).toBe(1);
      expect(remainingStops.data?.[0].id).toBe(stop1.data!.id);
    });
  });
});
