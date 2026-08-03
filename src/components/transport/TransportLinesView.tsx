import React, { useState } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { useTransportLines } from '../../hooks/transport/useTransportLines';
import {
  TransportLine, TransportLineInput, TransportLineStatus,
  TransportVehicle, TransportVehicleInput,
  TransportDriver, TransportDriverInput,
} from '../../services/transport/types';
import { useAcademicYears } from '../../hooks/academic';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  Bus, Plus, Edit2, Archive, RefreshCw, AlertCircle, CheckCircle2,
  Users, MapPin, Phone, Car, Shield, Calendar, TrendingUp, X, BarChart3,
} from 'lucide-react';

// ─── Statut Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TransportLineStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:         { label: '🟢 Active',         color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  SUSPENDED:      { label: '🟡 Suspendue',       color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  OUT_OF_SERVICE: { label: '🔴 Hors service',    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  ARCHIVED:       { label: '🗄️ Archivée',        color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
};

// ─── Modal Ligne ─────────────────────────────────────────────────────────────

interface LineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: TransportLineInput) => Promise<any>;
  initialData: TransportLine | null;
  vehicles: TransportVehicle[];
  drivers: TransportDriver[];
  academicYearId: string;
  existingNames: string[];
}

const LineModal: React.FC<LineModalProps> = ({
  isOpen, onClose, onSave, initialData, vehicles, drivers, academicYearId, existingNames,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [zone, setZone] = useState(initialData?.zone || '');
  const [vehicleId, setVehicleId] = useState(initialData?.vehicleId || '');
  const [driverId, setDriverId] = useState(initialData?.driverId || '');
  const [annualFee, setAnnualFee] = useState(initialData ? String(initialData.annualFee) : '');
  const [periodsCount, setPeriodsCount] = useState(initialData?.periodsCount ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setZone(initialData?.zone || '');
      setVehicleId(initialData?.vehicleId || (vehicles[0]?.id ?? ''));
      setDriverId(initialData?.driverId || (drivers[0]?.id ?? ''));
      setAnnualFee(initialData ? String(initialData.annualFee) : '');
      setPeriodsCount(initialData?.periodsCount ?? 3);
      setError(null);
    }
  }, [isOpen, initialData, vehicles, drivers]);

  if (!isOpen) return null;

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const fee = parseFloat(annualFee) || 0;
  const perPeriod = periodsCount > 0 ? Math.round(fee / periodsCount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation nom unique
    const otherNames = initialData
      ? existingNames.filter((n) => n.toLowerCase() !== initialData.name.toLowerCase())
      : existingNames;
    if (otherNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())) {
      setError(`Une ligne nommée "${name}" existe déjà.`);
      return;
    }

    setSaving(true);
    const result = await onSave({
      name: name.trim(),
      zone: zone.trim(),
      vehicleId,
      driverId,
      annualFee: fee,
      periodsCount,
      academicYearId,
    });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error || 'Erreur inconnue.');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 16 }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 580, borderRadius: 16, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bus size={22} color="white" />
            <h5 style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: '1.0625rem' }}>
              {initialData ? 'Modifier la ligne' : 'Nouvelle ligne de transport'}
            </h5>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
            {error && (
              <div className="alert alert-danger text-sm p-2" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Nom de la ligne *</label>
                <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Ligne Cocody" required />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm">Zone desservie *</label>
                <input className="form-control" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex : Cocody, Angré, Riviera" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Véhicule *</label>
                <select className="form-select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  <option value="">— Sélectionner —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.licensePlate} ({v.capacity} places)
                    </option>
                  ))}
                </select>
                {selectedVehicle && (
                  <p className="text-xs text-muted mt-1">
                    {selectedVehicle.brand} {selectedVehicle.model} · {selectedVehicle.capacity} places
                  </p>
                )}
              </div>
              <div>
                <label className="form-label fw-semibold text-sm">Chauffeur *</label>
                <select className="form-select" value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
                  <option value="">— Sélectionner —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.phone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Tarif annuel (FCFA) *</label>
                <input type="number" className="form-control" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)} min={0} step={1000} placeholder="Ex : 250000" required />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm">Nb. périodes</label>
                <select className="form-select" value={periodsCount} onChange={(e) => setPeriodsCount(Number(e.target.value))}>
                  {[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n} période{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            {fee > 0 && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px' }}>
                <p className="text-xs fw-semibold text-primary mb-2 d-flex align-items-center gap-1"><BarChart3 size={14} /> Calcul automatique</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span>Tarif annuel :</span><strong>{fee.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginTop: 4 }}>
                  <span>Par période ({periodsCount}) :</span><strong style={{ color: '#0369a1' }}>≈ {perPeriod.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                {selectedVehicle && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginTop: 4 }}>
                    <span>Capacité véhicule :</span><strong>{selectedVehicle.capacity} places</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="btn btn-primary fw-semibold" disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal Véhicule ───────────────────────────────────────────────────────────

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: TransportVehicleInput) => Promise<any>;
  initialData: TransportVehicle | null;
}

const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [form, setForm] = useState({ name: '', brand: '', model: '', licensePlate: '', capacity: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && initialData) {
      setForm({ name: initialData.name, brand: initialData.brand, model: initialData.model, licensePlate: initialData.licensePlate, capacity: String(initialData.capacity) });
    } else if (isOpen) {
      setForm({ name: '', brand: '', model: '', licensePlate: '', capacity: '' });
    }
    setError(null);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await onSave({ ...form, capacity: Number(form.capacity) });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error || 'Erreur.');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)' }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 460, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Car size={18} color="white" />
            <h6 style={{ margin: 0, fontWeight: 700, color: 'white' }}>{initialData ? 'Modifier le véhicule' : 'Nouveau véhicule'}</h6>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'grid', gap: 14 }}>
            {error && <div className="alert alert-danger text-sm p-2" style={{ borderRadius: 8 }}><AlertCircle size={14} className="me-2" />{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Nom *</label>
                <input className="form-control" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Bus 01" required />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm">Immatriculation *</label>
                <input className="form-control" value={form.licensePlate} onChange={(e) => setForm((f) => ({ ...f, licensePlate: e.target.value }))} placeholder="CI-1234-AB" required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Marque</label>
                <input className="form-control" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Mercedes" />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm">Modèle</label>
                <input className="form-control" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Sprinter 516" />
              </div>
            </div>
            <div>
              <label className="form-label fw-semibold text-sm">Capacité (places) *</label>
              <input type="number" className="form-control" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} min={1} placeholder="25" required />
            </div>
          </div>
          <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="btn btn-primary btn-sm fw-semibold" disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />...</> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal Chauffeur ──────────────────────────────────────────────────────────

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: TransportDriverInput) => Promise<any>;
  initialData: TransportDriver | null;
}

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) { setName(initialData?.name || ''); setPhone(initialData?.phone || ''); setError(null); }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await onSave({ name: name.trim(), phone: phone.trim() });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error || 'Erreur.');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)' }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={18} color="white" />
            <h6 style={{ margin: 0, fontWeight: 700, color: 'white' }}>{initialData ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}</h6>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'grid', gap: 14 }}>
            {error && <div className="alert alert-danger text-sm p-2" style={{ borderRadius: 8 }}><AlertCircle size={14} className="me-2" />{error}</div>}
            <div>
              <label className="form-label fw-semibold text-sm">Nom complet *</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : KOUAMÉ Brou Félix" required />
            </div>
            <div>
              <label className="form-label fw-semibold text-sm">Téléphone *</label>
              <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" required />
            </div>
          </div>
          <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="btn btn-primary btn-sm fw-semibold" disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />...</> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Vue principale : Lignes de Transport ─────────────────────────────────────

type SubView = 'LINES' | 'VEHICLES' | 'DRIVERS';

export const TransportLinesView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const confirm = useConfirm();

  const {
    lines, vehicles, drivers, loading, error, fetchAll,
    createLine, updateLine, setLineStatus,
    createVehicle, updateVehicle, deleteVehicle,
    createDriver, updateDriver, deleteDriver,
  } = useTransportLines(schoolYear);

  const [subView, setSubView] = useState<SubView>('LINES');
  const [lineModal, setLineModal] = useState(false);
  const [editingLine, setEditingLine] = useState<TransportLine | null>(null);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);
  const [driverModal, setDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<TransportDriver | null>(null);

  const existingLineNames = lines.map((l) => l.name);

  const totalCapacity = lines.reduce((s, l) => s + l.vehicleCapacity, 0);
  const totalEnrolled = lines.reduce((s, l) => s + l.enrolledCount, 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const handleSaveLine = async (input: TransportLineInput) => {
    if (editingLine) return updateLine(editingLine.id, input);
    return createLine(input);
  };

  const handleStatusChange = async (line: TransportLine, status: TransportLineStatus) => {
    const labels: Record<TransportLineStatus, string> = {
      ACTIVE: 'réactiver', SUSPENDED: 'suspendre', OUT_OF_SERVICE: 'mettre hors service', ARCHIVED: 'archiver',
    };
    const isConfirmed = await confirm({
      title: 'Modification statut de ligne',
      message: `Voulez-vous ${labels[status]} la ligne "${line.name}" ?`,
      confirmText: 'Oui, confirmer',
      cancelText: 'Annuler',
      variant: 'warning',
    });
    if (isConfirmed) {
      await setLineStatus(line.id, status);
    }
  };

  const NAV_TABS: { id: SubView; label: string; icon: React.ReactNode }[] = [
    { id: 'LINES', label: `Lignes (${lines.length})`, icon: <Bus size={15} /> },
    { id: 'VEHICLES', label: `Véhicules (${vehicles.length})`, icon: <Car size={15} /> },
    { id: 'DRIVERS', label: `Chauffeurs (${drivers.length})`, icon: <Shield size={15} /> },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Transport scolaire
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Gestion des lignes, véhicules et chauffeurs. Calcul automatique des places et du taux d'occupation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline-secondary text-sm fw-semibold"
            onClick={fetchAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
          {subView === 'LINES' && (
            <button
              className="btn btn-primary fw-semibold"
              onClick={() => { setEditingLine(null); setLineModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
            >
              <Plus size={15} /> Nouvelle ligne
            </button>
          )}
          {subView === 'VEHICLES' && (
            <button
              className="btn btn-primary fw-semibold"
              onClick={() => { setEditingVehicle(null); setVehicleModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
            >
              <Plus size={15} /> Nouveau véhicule
            </button>
          )}
          {subView === 'DRIVERS' && (
            <button
              className="btn btn-primary fw-semibold"
              onClick={() => { setEditingDriver(null); setDriverModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
            >
              <Plus size={15} /> Nouveau chauffeur
            </button>
          )}
        </div>
      </div>

      {/* Sélecteur année + KPIs globaux Colorés */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Sélecteur année */}
        <div
          className="card shadow-sm"
          style={{
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 20px -4px rgba(30, 41, 59, 0.35)',
          }}
        >
          <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#ffffff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🟢 Année Scolaire Active</p>
              <div style={{ fontWeight: 900, color: '#ffffff', fontSize: '0.9375rem' }}>{schoolYear}</div>
            </div>
          </div>
        </div>

        {/* KPIs Colorés SaaS */}
        {[
          { label: 'Lignes actives', value: lines.filter((l) => l.status === 'ACTIVE').length, icon: <Bus size={18} color="#ffffff" />, gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', shadow: 'rgba(37, 99, 235, 0.35)' },
          { label: 'Capacité totale', value: `${totalCapacity}`, icon: <Car size={18} color="#ffffff" />, gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', shadow: 'rgba(2, 132, 199, 0.35)', suffix: ' places' },
          { label: 'Élèves inscrits', value: `${totalEnrolled}`, icon: <Users size={18} color="#ffffff" />, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.35)', suffix: ' élèves' },
          { label: "Taux d'occupation", value: `${avgOccupancy}%`, icon: <TrendingUp size={18} color="#ffffff" />, gradient: avgOccupancy >= 90 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : avgOccupancy >= 70 ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', shadow: 'rgba(139, 92, 246, 0.35)' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="card shadow-sm card-hover"
            style={{
              borderRadius: 14,
              background: kpi.gradient,
              color: '#ffffff',
              border: 'none',
              boxShadow: `0 8px 20px -4px ${kpi.shadow}`,
            }}
          >
            <div className="card-body p-3" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255, 255, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.35rem', color: '#ffffff', lineHeight: 1 }}>
                  {kpi.value}{kpi.suffix ? <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9, marginLeft: 3 }}>{kpi.suffix}</span> : ''}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {error && (
        <div className="alert alert-danger text-sm p-3 mb-3" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Sous-navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 20 }}>
        {NAV_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubView(t.id)}
            className={`btn btn-sm ${subView === t.id ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet LINES ── */}
      {subView === 'LINES' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {loading ? (
            <div className="text-center py-5 text-muted">Chargement...</div>
          ) : lines.length === 0 ? (
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <Bus size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: '0 0 16px', fontWeight: 600 }}>Aucune ligne de transport configurée</p>
              <button className="btn btn-primary fw-semibold" onClick={() => { setEditingLine(null); setLineModal(true); }}>
                <Plus size={14} className="me-1" /> Ajouter une ligne
              </button>
            </div>
          ) : (
            lines.map((line) => {
              const stCfg = STATUS_CONFIG[line.status];
              const pct = line.vehicleCapacity > 0 ? Math.round((line.enrolledCount / line.vehicleCapacity) * 100) : 0;
              const pctColor = pct >= 95 ? '#dc2626' : pct >= 75 ? '#d97706' : '#16a34a';

              return (
                <div key={line.id} className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  {/* Barre colorée selon statut */}
                  <div style={{ height: 4, background: stCfg.color }} />
                  <div className="card-body p-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      {/* Infos principales */}
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bus size={22} color="white" />
                          </div>
                          <div>
                            <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1.0625rem' }}>{line.name}</h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                              <MapPin size={13} /> {line.zone}
                            </div>
                          </div>
                          <span style={{ background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.border}`, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, marginLeft: 'auto' }}>
                            {stCfg.label}
                          </span>
                        </div>

                        {/* Détails en grille */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                            <p className="text-xs text-muted mb-1 fw-semibold">CHAUFFEUR</p>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{line.driverName}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                              <Phone size={11} /> {line.driverPhone}
                            </div>
                          </div>
                          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                            <p className="text-xs text-muted mb-1 fw-semibold">VÉHICULE</p>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{line.vehicleName}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{line.vehicleLicensePlate}</p>
                          </div>
                          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                            <p className="text-xs text-muted mb-1 fw-semibold">TARIF</p>
                            <p style={{ margin: 0, fontWeight: 700, color: '#2563eb', fontSize: '0.9375rem' }}>
                              {line.annualFee.toLocaleString('fr-FR')} FCFA
                            </p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{line.periodsCount} période{line.periodsCount > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </div>

                      {/* Jauges */}
                      <div style={{ width: 180, flexShrink: 0 }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto' }}>
                            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 90, height: 90 }}>
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                              <circle
                                cx="18" cy="18" r="15.9" fill="none"
                                stroke={pctColor} strokeWidth="2.5"
                                strokeDasharray={`${pct} ${100 - pct}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: pctColor }}>{pct}%</span>
                            </div>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Taux d'occupation</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 700, color: '#0369a1', fontSize: '1.1rem' }}>{line.enrolledCount}</p>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b' }}>inscrits</p>
                          </div>
                          <div style={{ background: line.availableSeats === 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 700, color: line.availableSeats === 0 ? '#dc2626' : '#16a34a', fontSize: '1.1rem' }}>{line.availableSeats}</p>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b' }}>dispo</p>
                          </div>
                          <div style={{ gridColumn: '1/-1', background: '#f8fafc', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{line.vehicleCapacity} places totales</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-outline-primary fw-semibold"
                        onClick={() => { setEditingLine(line); setLineModal(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8 }}
                      >
                        <Edit2 size={13} /> Modifier
                      </button>
                      {line.status !== 'ACTIVE' ? (
                        <button
                          className="btn btn-sm btn-success fw-semibold"
                          onClick={() => handleStatusChange(line, 'ACTIVE')}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8 }}
                        >
                          <CheckCircle2 size={13} /> Réactiver
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-warning fw-semibold"
                          onClick={() => handleStatusChange(line, 'SUSPENDED')}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8 }}
                        >
                          <AlertCircle size={13} /> Suspendre
                        </button>
                      )}
                      {line.status !== 'ARCHIVED' && (
                        <button
                          className="btn btn-sm btn-outline-danger fw-semibold"
                          onClick={() => handleStatusChange(line, 'ARCHIVED')}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8 }}
                        >
                          <Archive size={13} /> Archiver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Onglet VEHICLES ── */}
      {subView === 'VEHICLES' && (
        <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  {['Nom', 'Marque / Modèle', 'Immatriculation', 'Capacité', 'Actions'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: i === 3 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-5 text-muted">Aucun véhicule enregistré.</td></tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v.id}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Car size={16} color="#2563eb" />
                          </div>
                          <span style={{ fontWeight: 600 }}>{v.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#475569' }}>{v.brand} {v.model}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}>
                          {v.licensePlate}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ background: '#f0f9ff', color: '#0369a1', padding: '3px 12px', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 700 }}>
                          {v.capacity} places
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingVehicle(v); setVehicleModal(true); }}><Edit2 size={13} /></button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={async () => {
                              const isConfirmed = await confirm({
                                title: 'Supprimer le véhicule',
                                message: `Supprimer le véhicule "${v.name}" ?`,
                                confirmText: 'Oui, supprimer',
                                cancelText: 'Annuler',
                                variant: 'danger',
                              });
                              if (isConfirmed) deleteVehicle(v.id);
                            }}
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Onglet DRIVERS ── */}
      {subView === 'DRIVERS' && (
        <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  {['Nom', 'Téléphone', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-5 text-muted">Aucun chauffeur enregistré.</td></tr>
                ) : (
                  drivers.map((d) => (
                    <tr key={d.id}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                            {d.name.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{d.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                          <Phone size={14} /> {d.phone}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingDriver(d); setDriverModal(true); }}><Edit2 size={13} /></button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={async () => {
                              const isConfirmed = await confirm({
                                title: 'Supprimer le chauffeur',
                                message: `Supprimer le chauffeur "${d.name}" ?`,
                                confirmText: 'Oui, supprimer',
                                cancelText: 'Annuler',
                                variant: 'danger',
                              });
                              if (isConfirmed) deleteDriver(d.id);
                            }}
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <LineModal
        isOpen={lineModal}
        onClose={() => setLineModal(false)}
        onSave={handleSaveLine}
        initialData={editingLine}
        vehicles={vehicles}
        drivers={drivers}
        academicYearId={schoolYear}
        existingNames={existingLineNames}
      />
      <VehicleModal
        isOpen={vehicleModal}
        onClose={() => setVehicleModal(false)}
        onSave={editingVehicle ? (i) => updateVehicle(editingVehicle.id, i) : createVehicle}
        initialData={editingVehicle}
      />
      <DriverModal
        isOpen={driverModal}
        onClose={() => setDriverModal(false)}
        onSave={editingDriver ? (i) => updateDriver(editingDriver.id, i) : createDriver}
        initialData={editingDriver}
      />
    </div>
  );
};
