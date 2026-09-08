
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { printHtml } from '../services/printService';
import { MOCK_FEE_CONFIGS, PREDEFINED_CLASS_NAMES } from '../constants';
import { TrendingUp, TrendingDown, Download, Plus, CreditCard, Search, Settings, X, Trash2, Edit2, FileSpreadsheet, UserPlus, Save, Printer, Camera, Calendar, ChevronDown } from 'lucide-react';
import { FeeConfiguration, SchoolFeeRecord, Student, NotificationType, ActivityLog } from '../types';
import * as XLSX from '@e965/xlsx';

interface ScolarityProps {
  records: SchoolFeeRecord[];
  setRecords: React.Dispatch<React.SetStateAction<SchoolFeeRecord[]>>;
  students?: Student[];
  setStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
  addNotification: (type: NotificationType, message: string) => void;
  addLog: (action: string, details: string, module: ActivityLog['module'], type: ActivityLog['type']) => void;
  schoolName: string;
  schoolLogo: string;
  schoolYear?: string; // FIX m4 — pour afficher l'année correcte sur les reçus
  classes?: any[];
  setClasses?: React.Dispatch<React.SetStateAction<any[]>>;
  // FIX M3 — Configs tarifs maintenant persistées depuis App.tsx
  feeConfigs?: FeeConfiguration[];
  setFeeConfigs?: React.Dispatch<React.SetStateAction<any[]>>;
  // Needed for cascade delete cleanup of orphan subscriptions
  setCanteenSubscriptions?: React.Dispatch<React.SetStateAction<any[]>>;
  setTransportSubscriptions?: React.Dispatch<React.SetStateAction<any[]>>;
  filterMode?: 'all' | 'late' | 'paid';
  setFilterMode?: (mode: 'all' | 'late' | 'paid') => void;
  currentUserRole?: string;
}

// Liste des niveaux pour la configuration des tarifs
const SCHOOL_LEVELS = [
  "Garderie",
  "Ptesection",
  "Moysection",
  "Grdsection",
  "CP1",
  "CP2",
  "CE1",
  "CE2",
  "CM1",
  "CM2"
];

const Scolarity: React.FC<ScolarityProps> = ({ records, setRecords, students, setStudents, addNotification, addLog, schoolName, schoolLogo, schoolYear, classes, setClasses, setCanteenSubscriptions, setTransportSubscriptions, feeConfigs: feeConfigsProp, setFeeConfigs: setFeeConfigsProp, filterMode = 'all', setFilterMode = (_mode: 'all' | 'late' | 'paid') => {}, currentUserRole }) => {

  // FIX M3 — feeConfigs maintenant géré par App.tsx (persisté en localStorage).
  // On utilise un state local uniquement si les props ne sont pas disponibles (fallback).
  const [localFeeConfigs, setLocalFeeConfigs] = useState<FeeConfiguration[]>(MOCK_FEE_CONFIGS);
  const feeConfigs = (feeConfigsProp && feeConfigsProp.length > 0) ? feeConfigsProp as FeeConfiguration[] : localFeeConfigs;
  const setFeeConfigs = (updater: any) => {
    if (setFeeConfigsProp) {
      setFeeConfigsProp(updater);
    } else {
      setLocalFeeConfigs(updater);
    }
  };

  // Initialisation unique : si feeConfigs vides en localStorage, charger MOCK_FEE_CONFIGS
  useEffect(() => {
    if (setFeeConfigsProp && feeConfigsProp && feeConfigsProp.length === 0) {
      setFeeConfigsProp(MOCK_FEE_CONFIGS);
    }
  }, []);

  // --- HELPERS POUR VERSEMENTS ---
  const getInstallmentData = (val: any) => {
    if (typeof val === 'number') {
      return { amount: val, date: '', method: '' };
    }
    return {
      amount: val?.amount || 0,
      date: val?.date || '',
      method: val?.method || ''
    };
  };

  // --- HELPER: Moteur de Calcul Financier ---
  const calculateStudentFinancials = (
    gradeName: string,
    registrationPaid: number,
    installments: Record<string, any>,
    discountPercent: number,
    customTuition?: number, // Optionnel: pour forcer un montant manuel
    customRegistration?: number // Optionnel
  ) => {
    // 1. Trouver la configuration de tarif correspondante
    const config = feeConfigs.find(c => gradeName === c.grade) ||
      feeConfigs.find(c => gradeName.startsWith(c.grade));

    const sumInstallments = (insts: Record<string, any>) => {
      return Object.values(insts).reduce((acc, curr) => {
        const amt = typeof curr === 'number' ? curr : (curr?.amount || 0);
        return acc + amt;
      }, 0);
    };

    // Si aucune config trouvée (classe inconnue ou "Non assigné"), on met tout à 0
    // Cela évite l'ajout "automatique" de montants si la classe est vide dans l'import
    if (!config) {
      const totalPaidCheck = registrationPaid + sumInstallments(installments);
      return {
        initialTuition: customTuition || 0,
        initialRegistration: customRegistration || 0,
        initialAmount: (customTuition || 0) + (customRegistration || 0),
        discountAmount: 0,
        netDue: (customTuition || 0) + (customRegistration || 0),
        totalPaid: totalPaidCheck,
        totalTuition: customTuition || 0,
        remainingGlobal: Math.max(0, ((customTuition || 0) + (customRegistration || 0)) - totalPaidCheck)
      };
    }

    // 2. Déterminer les montants théoriques (Base)
    const baseTuition = customTuition !== undefined ? customTuition : config.tuitionAmount;
    const baseRegistration = customRegistration !== undefined ? customRegistration : config.registrationAmount;

    // 3. Calculs
    const initialAmount = baseTuition + baseRegistration; // Total Global Théorique

    // La remise s'applique généralement sur la scolarité, pas l'inscription
    const discountAmount = (baseTuition * discountPercent) / 100;

    const netDue = initialAmount - discountAmount; // Ce que l'élève doit payer au final

    // Somme des versements
    const totalInstallments = sumInstallments(installments);
    const totalPaid = registrationPaid + totalInstallments;

    const remainingGlobal = Math.max(0, netDue - totalPaid);

    // Partie Scolarité seule (pour l'affichage)
    const netTuitionDue = baseTuition - discountAmount;
    // const totalTuitionPaid = Math.max(0, totalPaid - baseRegistration); 

    return {
      initialTuition: baseTuition,
      initialRegistration: baseRegistration,
      initialAmount,
      discountAmount,
      netDue,
      totalPaid,
      totalTuition: netTuitionDue, // Montant scolarité net à payer
      remainingGlobal
    };
  };

  // --- CALCULS KPI DYNAMIQUES ---
  const totalPaidGlobal = records.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalExpected = records.reduce((acc, curr) => acc + curr.netDue, 0);
  const totalRemaining = totalExpected - totalPaidGlobal;
  const recoveryRate = totalExpected > 0 ? Math.round((totalPaidGlobal / totalExpected) * 100) : 0;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Toutes');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'recent'>('alpha');

  // États pour la configuration des tarifs UI
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // État pour le formulaire d'AJOUT de tarifs
  const [newConfig, setNewConfig] = useState({
    grade: SCHOOL_LEVELS[0],
    tuitionAmount: '',
    registrationAmount: ''
  });

  // État pour la MODIFICATION de tarifs
  const [isEditConfigModalOpen, setIsEditConfigModalOpen] = useState(false);
  const [configToEdit, setConfigToEdit] = useState<FeeConfiguration | null>(null);
  const [editConfigForm, setEditConfigForm] = useState({
    grade: '',
    tuitionAmount: '',
    registrationAmount: ''
  });

  // États pour l'ajout manuel d'élève
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    class: PREDEFINED_CLASS_NAMES[0],
    registrationDate: new Date().toISOString().split('T')[0],
    registrationPaid: '0',
    registrationMethod: 'Mobile Money',
    discount: '0',
    age: '',
    photo: '',
    gender: 'Masculin',
    parentName: '',
    parentPhone: '',
    emergencyContact: '',
    address: '',
    medicalInfo: '',
    status: 'Actif'
  });

  const studentPhotoInputRef = useRef<HTMLInputElement>(null);

  // État pour l'édition d'un enregistrement existant
  const [editingRecord, setEditingRecord] = useState<SchoolFeeRecord | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'Toutes' || record.class === selectedClass;
    
    let matchesStatus = true;
    if (filterMode === 'late') {
      matchesStatus = record.remainingGlobal > 0;
    } else if (filterMode === 'paid') {
      matchesStatus = record.remainingGlobal <= 0;
    }
    
    return matchesSearch && matchesClass && matchesStatus;
  }).sort((a, b) => {
    if (sortOrder === 'recent') {
      const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
      const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;

      const getTimestampFromId = (id: string): number => {
        const match = id.match(/\d{10,13}/);
        return match ? parseInt(match[0], 10) : 0;
      };
      const tsA = getTimestampFromId(a.id);
      const tsB = getTimestampFromId(b.id);
      if (tsB !== tsA) return tsB - tsA;
    }
    return a.studentName.toLowerCase().localeCompare(b.studentName.toLowerCase());
  });

  // Effet pour mettre à jour tous les dossiers existants si les tarifs configurés changent (migration automatique)
  useEffect(() => {
    let updated = false;
    const newRecords = records.map(record => {
      const config = feeConfigs.find(c => record.class === c.grade) ||
        feeConfigs.find(c => record.class.startsWith(c.grade));
      if (config) {
        if (record.initialTuition !== config.tuitionAmount || record.initialRegistration !== config.registrationAmount) {
          const financials = calculateStudentFinancials(
            record.class,
            record.registration,
            record.installments,
            record.discount,
            config.tuitionAmount,
            config.registrationAmount
          );
          updated = true;
          return {
            ...record,
            ...financials
          };
        }
      }
      return record;
    });

    if (updated) {
      setRecords(newRecords);
    }
  }, [feeConfigs]);

  const uniqueClasses = ['Toutes', ...Array.from(new Set(records.map(r => r.class))).sort()];

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' CFA';
  };

  // --- ACTIONS TABLEAU ---

  const handlePrintInvoice = (record: SchoolFeeRecord) => {


    const today = new Date().toLocaleDateString('fr-FR');
    // BUG-016 FIX: Use 8 timestamp digits + 4 random hex chars to eliminate collision risk
    const invoiceNumber = `REC-${Date.now().toString().slice(-8)}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

    // Construction des lignes de paiement
    let paymentRows = '';

    if (record.registration > 0) {
      const regMethodStr = (record as any).registrationMethod ? ` - via ${(record as any).registrationMethod}` : ' - via Mobile Money';
      paymentRows += `
        <tr>
            <td>Inscription${regMethodStr}</td>
            <td style="text-align:right">${record.registration.toLocaleString()} CFA</td>
        </tr>`;
    }

    Object.entries(record.installments).forEach(([key, value]) => {
      const { amount, date, method } = getInstallmentData(value);
      if (amount > 0) {
        const dateStr = date ? ` (le ${new Date(date).toLocaleDateString('fr-FR')})` : '';
        const methodStr = method ? ` - via ${method}` : '';
        paymentRows += `
            <tr>
                <td>Versement ${key.toUpperCase()}${dateStr}${methodStr}</td>
                <td style="text-align:right">${amount.toLocaleString()} CFA</td>
            </tr>`;
      }
    });

    const htmlContent = `
      <html>
        <head>
          <title>Reçu - ${record.studentName}</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2563EB; padding-bottom: 20px; }
            .logo { max-height: 80px; margin-bottom: 15px; display: inline-block; }
            .header h1 { color: #2563EB; margin: 0; font-size: 24px; text-transform: uppercase; margin-bottom: 5px; }
            .header h2 { margin: 5px 0; font-size: 20px; color: #333; font-weight: bold; }
            .header p { margin: 5px 0; font-size: 14px; color: #666; }
            
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-box { width: 45%; }
            .info-label { font-size: 12px; text-transform: uppercase; color: #888; font-weight: bold; }
            .info-value { font-size: 16px; font-weight: bold; margin-top: 5px; }

            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background-color: #f3f4f6; padding: 12px; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #ddd; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            
            .totals { margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .totals-row.final { font-size: 18px; font-weight: bold; color: #2563EB; }

            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
            .stamp-area { margin-top: 40px; text-align: right; padding-right: 40px; }
            .stamp-box { display: inline-block; width: 150px; height: 80px; border: 2px dashed #ccc; text-align: center; line-height: 80px; color: #ccc; font-weight: bold; transform: rotate(-5deg); }
          </style>
        </head>
        <body>
          <div class="header">
            ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo École" class="logo" />` : ''}
            <h1>REÇU DE PAIEMENT</h1>
            <h2>${schoolName}</h2>
            <p>Année Scolaire ${schoolYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}</p>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Élève</div>
              <div class="info-value">${record.studentName}</div>
              <div style="margin-top:5px; font-size:14px;">Classe: ${record.class}</div>
            </div>
            <div class="info-box" style="text-align:right;">
              <div class="info-label">Réçu N°</div>
              <div class="info-value">${invoiceNumber}</div>
              <div style="margin-top:5px; font-size:14px;">Date: ${today}</div>
            </div>
          </div>

          <h3>Détail des versements effectués</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows || '<tr><td colspan="2" style="text-align:center; font-style:italic;">Aucun paiement enregistré</td></tr>'}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Montant Total Dû (Annuel):</span>
              <span>${record.netDue.toLocaleString()} CFA</span>
            </div>
            <div class="totals-row">
              <span>Total Versé à ce jour:</span>
              <span>${record.totalPaid.toLocaleString()} CFA</span>
            </div>
            <div class="totals-row final">
              <span>Reste à Payer:</span>
              <span>${record.remainingGlobal.toLocaleString()} CFA</span>
            </div>
          </div>

          <div class="stamp-area">
             <div class="stamp-box">CACHET & SIGNATURE</div>
          </div>

          <div class="footer">
            <p>Ce document est une preuve de paiement générée électroniquement.</p>
            <p>Merci de votre confiance.</p>
          </div>
        </body>
      </html>
    `;

    printHtml(htmlContent);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteId(id);
  };

  const executeDelete = () => {
    if (deleteId) {
      const recordToDelete = records.find(r => r.id === deleteId);
      const deletedStudentId = recordToDelete?.studentId;

      // 1. Remove the fee record
      setRecords(prev => prev.filter(r => r.id !== deleteId));

      if (deletedStudentId) {
        // 2. Remove from global students list
        if (setStudents) {
          setStudents(prev => prev.filter(s => s.id !== deletedStudentId));
        }
        // 3. FIX – cascade: remove orphan canteen subscriptions
        if (setCanteenSubscriptions) {
          setCanteenSubscriptions(prev => prev.filter((sub: any) => sub.studentId !== deletedStudentId));
        }
        // 4. FIX – cascade: remove orphan transport subscriptions
        if (setTransportSubscriptions) {
          setTransportSubscriptions(prev => prev.filter((sub: any) => sub.studentId !== deletedStudentId));
        }
      }

      addNotification('success', 'Dossier élève supprimé avec succès.');
      addLog(
        'Suppression Dossier',
        `Suppression du dossier et désinscription de ${recordToDelete?.studentName} (Classe: ${recordToDelete?.class})`,
        'Scolarité',
        'delete',
        `Dossier financier de scolarité actif. Payé: ${recordToDelete?.totalPaid} CFA. Restant: ${recordToDelete?.remainingGlobal} CFA`,
        undefined
      );
      setDeleteId(null);
    }
  };

  const handleEditRecord = (record: SchoolFeeRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingRecord(JSON.parse(JSON.stringify(record)));
  };

  // Effet pour mettre à jour les montants théoriques si la classe change lors de l'édition
  useEffect(() => {
    if (editingRecord) {
      const financials = calculateStudentFinancials(
        editingRecord.class,
        editingRecord.registration, // Montant payé inscription
        editingRecord.installments,
        editingRecord.discount,
        // On ne passe pas de custom montant ici pour forcer le recalcul basé sur la config de la classe
        // SAUF si on veut permettre l'override manuel dans le futur. Pour l'instant, on force la config.
      );

      // On met à jour les montants théoriques seulement si la classe a changé par rapport à la config
      // Pour éviter de boucler, on compare simplement si le montant théorique est différent
      if (financials.initialTuition !== editingRecord.initialTuition || financials.initialRegistration !== editingRecord.initialRegistration) {
        setEditingRecord(prev => prev ? ({
          ...prev,
          initialTuition: financials.initialTuition,
          initialRegistration: financials.initialRegistration
        }) : null);
      }
    }
  }, [editingRecord?.class]);

  const handleSaveEdit = () => {
    if (!editingRecord) return;

    // Recalcul complet final avant sauvegarde
    const financials = calculateStudentFinancials(
      editingRecord.class,
      editingRecord.registration,
      editingRecord.installments,
      editingRecord.discount,
      editingRecord.initialTuition, // On respecte ce qui est affiché dans le formulaire (qui a pu être mis à jour par l'effet)
      editingRecord.initialRegistration
    );

    // Validation anti-erreur : Vérifier si le montant payé est supérieur au montant dû
    if (financials.totalPaid > financials.netDue) {
      addNotification('error', `Le montant versé (${financials.totalPaid.toLocaleString()}) dépasse le montant dû (${financials.netDue.toLocaleString()}). Corrigez les valeurs.`);
      return; // Bloquer
    }

    const updatedRecord: SchoolFeeRecord = {
      ...editingRecord,
      ...financials
    };

    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));

    // Sync Student Status & Name
    // BUG-011 FIX: retrieve existing student to preserve firstName/lastName (avoids re-splitting compound names)
    // BUG-001 FIX: use 'En attente' (not 'En retard') when no payment has been made yet
    if (setStudents && updatedRecord.studentId) {
      setStudents(prev => prev.map(s => {
        if (s.id === updatedRecord.studentId) {
          // Determine name split: prefer keeping existing student fields,
          // only update if the studentName in the record differs meaningfully
          const fullName = updatedRecord.studentName.trim();
          const existingFullName = `${s.lastName.toUpperCase()} ${s.firstName}`.trim();
          let newFirstName = s.firstName;
          let newLastName = s.lastName;
          if (fullName !== existingFullName) {
            // Re-split only if the name actually changed, using first uppercase word(s) as last name
            const parts = fullName.split(' ').filter(Boolean);
            if (parts.length > 1) {
              // Find where the uppercase prefix ends to split NOM vs Prénom
              let lastUpperIdx = 0;
              for (let i = 0; i < parts.length; i++) {
                if (parts[i] === parts[i].toUpperCase()) lastUpperIdx = i;
                else break;
              }
              newLastName = parts.slice(0, lastUpperIdx + 1).join(' ');
              newFirstName = parts.slice(lastUpperIdx + 1).join(' ');
              if (!newFirstName) {
                newFirstName = parts[parts.length - 1];
                newLastName = parts.slice(0, parts.length - 1).join(' ');
              }
            } else {
              newLastName = fullName;
              newFirstName = '';
            }
          }
          return {
            ...s,
            firstName: newFirstName,
            lastName: newLastName.toUpperCase(),
            grade: updatedRecord.class,
            feesStatus: updatedRecord.remainingGlobal <= 0 ? 'Payé' : (updatedRecord.totalPaid > 0 ? 'Partiel' : 'En attente')
          };
        }
        return s;
      }));
    }
    const originalRecord = records.find(r => r.id === updatedRecord.id);
    addNotification('success', 'Modifications enregistrées.');
    addLog(
      'Mise à jour Dossier',
      `Modification des informations financières pour ${updatedRecord.studentName}`,
      'Scolarité',
      'update',
      originalRecord ? `Classe: ${originalRecord.class}, Remise: ${originalRecord.discount}%, Payé: ${originalRecord.totalPaid} CFA, Restant: ${originalRecord.remainingGlobal} CFA` : undefined,
      `Classe: ${updatedRecord.class}, Remise: ${updatedRecord.discount}%, Payé: ${updatedRecord.totalPaid} CFA, Restant: ${updatedRecord.remainingGlobal} CFA`
    );
    setEditingRecord(null);
  };

  const updateInstallmentField = (key: string, field: 'amount' | 'date' | 'method', val: string) => {
    if (!editingRecord) return;
    
    const currentInst = getInstallmentData(editingRecord.installments[key as keyof typeof editingRecord.installments]);
    
    let updatedVal: any;
    if (field === 'amount') {
      const amt = parseFloat(val) || 0;
      updatedVal = {
        amount: amt,
        date: amt > 0 ? (currentInst.date || new Date().toISOString().split('T')[0]) : '',
        method: amt > 0 ? (currentInst.method || 'Mobile Money') : ''
      };
    } else if (field === 'date') {
      updatedVal = {
        ...currentInst,
        date: val
      };
    } else if (field === 'method') {
      updatedVal = {
        ...currentInst,
        method: val
      };
    }

    setEditingRecord({
      ...editingRecord,
      installments: {
        ...editingRecord.installments,
        [key]: updatedVal
      }
    });
  };

  // --- GESTION DES CONFIGURATIONS (TARIFS) ---

  const handleAddConfig = () => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (!newConfig.grade || !newConfig.tuitionAmount || !newConfig.registrationAmount) {
      addNotification('error', 'Veuillez remplir tous les champs.');
      return;
    }

    const tuition = parseInt(newConfig.tuitionAmount) || 0;
    const registration = parseInt(newConfig.registrationAmount) || 0;

    const filtered = feeConfigs.filter(c => c.grade !== newConfig.grade);
    const newItem: FeeConfiguration = {
      id: Date.now().toString(),
      grade: newConfig.grade,
      tuitionAmount: tuition,
      registrationAmount: registration,
      installmentCount: 8
    };
    setFeeConfigs([...filtered, newItem]);
    addNotification('success', 'Nouveau tarif configuré.');
    addLog('Config Tarif', `Ajout d'un tarif pour ${newConfig.grade}`, 'Scolarité', 'create');
    setNewConfig({ grade: SCHOOL_LEVELS[0], tuitionAmount: '', registrationAmount: '' });
  };

  const openEditConfigModal = (config: FeeConfiguration) => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    setConfigToEdit(config);
    setEditConfigForm({
      grade: config.grade,
      tuitionAmount: config.tuitionAmount.toString(),
      registrationAmount: config.registrationAmount.toString()
    });
    setIsEditConfigModalOpen(true);
  };

  const handleUpdateConfig = () => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (!configToEdit) return;
    const tuition = parseInt(editConfigForm.tuitionAmount) || 0;
    const registration = parseInt(editConfigForm.registrationAmount) || 0;

    setFeeConfigs(prev => prev.map(c =>
      c.id === configToEdit.id
        ? { ...c, grade: editConfigForm.grade, tuitionAmount: tuition, registrationAmount: registration }
        : c
    ));
    addNotification('success', 'Tarif mis à jour.');
    addLog('Config Tarif', `Mise à jour du tarif pour ${editConfigForm.grade}`, 'Scolarité', 'update');
    setIsEditConfigModalOpen(false);
    setConfigToEdit(null);
  };

  const confirmDeleteConfig = (id: string) => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    setDeleteConfigId(id);
  };

  const executeDeleteConfig = () => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (deleteConfigId) {
      const deleted = feeConfigs.find(c => c.id === deleteConfigId);
      setFeeConfigs(feeConfigs.filter(c => c.id !== deleteConfigId));
      addNotification('success', 'Tarif supprimé.');
      addLog('Config Tarif', `Suppression du tarif pour ${deleted?.grade}`, 'Scolarité', 'delete');
      setDeleteConfigId(null);
    }
  };

  // --- GESTION AJOUT MANUEL ÉLÈVE ---

  const handleStudentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewStudent(prev => ({ ...prev, photo: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAddManualStudent = () => {
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.class) {
      addNotification('error', 'Veuillez remplir les informations obligatoires (Nom, Prénom, Classe).');
      return;
    }

    const studentId = `S-${Date.now()}`;
    const name = `${newStudent.lastName.toUpperCase()} ${newStudent.firstName}`;
    const grade = newStudent.class;
    const registrationPaid = parseInt(newStudent.registrationPaid) || 0;
    const discountVal = parseFloat(newStudent.discount) || 0;
    const installments = {
      v1: { amount: 0, date: '', method: '' },
      v2: { amount: 0, date: '', method: '' },
      v3: { amount: 0, date: '', method: '' },
      v4: { amount: 0, date: '', method: '' },
      v5: { amount: 0, date: '', method: '' },
      v6: { amount: 0, date: '', method: '' },
      v7: { amount: 0, date: '', method: '' },
      v8: { amount: 0, date: '', method: '' }
    };

    // Utilisation du moteur de calcul
    const financials = calculateStudentFinancials(grade, registrationPaid, installments, discountVal);

    // Validation anti-erreur pour nouveau dossier
    if (financials.totalPaid > financials.netDue) {
      addNotification('error', 'Montant invalide : Le paiement est supérieur au montant dû pour cette classe.');
      return;
    }

    // BUG-017 FIX: Warn if no fee configuration found for this class
    if (financials.initialTuition === 0 && financials.initialRegistration === 0) {
      addNotification('warning', `Aucun tarif configuré pour la classe "${grade}". Le dossier sera créé avec des montants à 0. Pensez à configurer les tarifs dans l'onglet "Tarifs".`);
    }


    const newRecord: SchoolFeeRecord = {
      id: `F-${studentId}`,
      studentId: studentId,
      studentName: name,
      class: grade,
      registration: registrationPaid,
      registrationMethod: newStudent.registrationMethod || 'Mobile Money',
      registrationDate: newStudent.registrationDate || new Date().toISOString().split('T')[0],
      installments: installments,
      discount: discountVal,
      ...financials
    };

    setRecords(prev => [newRecord, ...prev]);

    if (setStudents) {
      const newStudentEntry: Student = {
        id: studentId,
        matricule: `MAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, // Generate Matricule
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        grade: grade,
        status: newStudent.status as 'Actif' | 'Inactif',
        feesStatus: financials.remainingGlobal <= 0 ? 'Payé' : (financials.totalPaid > 0 ? 'Partiel' : 'En attente'),
        attendance: 100,
        joinDate: newStudent.registrationDate || new Date().toISOString().split('T')[0],
        parentName: newStudent.parentName || 'Non renseigné',
        parentPhone: newStudent.parentPhone || '',
        emergencyContact: newStudent.emergencyContact || '',
        address: newStudent.address || '',
        medicalInfo: newStudent.medicalInfo || '',
        gender: newStudent.gender as 'Masculin' | 'Féminin',
        photo: newStudent.photo || (newStudent.gender === 'Féminin' 
          ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&skinColor=9e563b&hairColor=000000' 
          : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&skinColor=9e563b&hairColor=000000'),
        age: parseInt(newStudent.age) || undefined,
      };
      setStudents(prev => [newStudentEntry, ...prev]);
    }

    // Auto-create class if it doesn't exist
    if (classes && setClasses && !classes.find(c => c.name === grade)) {
      const newClass = {
        id: `CLS-${Date.now()}`,
        name: grade,
        teacherId: '',
        studentCount: 1,
        capacity: 30,
        level: grade.replace(/[0-9]/g, '').split(' ')[0] || grade,
        room: 'Non assignée',
        subjects: [],
        schedule: [],
        description: `Classe de ${grade} (Créée automatiquement)`
      };
      setClasses(prev => [...prev, newClass]);
      addNotification('info', `Classe "${grade}" créée automatiquement.`);
    }

    addNotification('success', 'Dossier élève créé avec succès.');
    addLog(
      'Nouveau Dossier',
      `Inscription de ${name} en ${grade}`,
      'Scolarité',
      'create',
      undefined,
      `Dossier créé (Montant inscription: ${registrationPaid} CFA, Remise: ${discountVal}%, Scolarité nette: ${financials.netDue} CFA)`
    );
    setIsStudentModalOpen(false);
    setNewStudent({
      firstName: '',
      lastName: '',
      class: PREDEFINED_CLASS_NAMES[0],
      registrationDate: new Date().toISOString().split('T')[0],
      registrationPaid: '0',
      registrationMethod: 'Mobile Money',
      discount: '0',
      age: '',
      photo: '',
      gender: 'Masculin',
      parentName: '',
      parentPhone: '',
      emergencyContact: '',
      address: '',
      medicalInfo: '',
      status: 'Actif'
    });
  };

  const handleDownloadTemplate = () => {
    const headers = [{ "Nom": "DUPONT", "Prenom": "Jean", "Classe": "CP1 A", "Payé Inscription": 50000, "V1": 0, "V2": 0, "V3": 0, "Remise (%)": 0 }];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modele_Import");
    XLSX.writeFile(wb, "modele_import_scolarite.xlsx");
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const mockEvent = {
          target: {
            files: [file]
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(mockEvent);
      } else {
        addNotification('error', 'Veuillez déposer un fichier Excel (.xlsx ou .xls) valide.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result;
      if (!arrayBuffer) return;

      try {
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data.length) {
          addNotification('warning', 'Le fichier semble vide.');
          return;
        }

        // Créer une map des enregistrements existants pour détection facile
        // Clé: Nom nettoyé en minuscule
        const existingRecordsMap = new Map<string, SchoolFeeRecord>();
        records.forEach(r => existingRecordsMap.set(r.studentName.toLowerCase().trim(), r));

        const updatedRecordsMap = new Map<string, SchoolFeeRecord>(existingRecordsMap);
        const newStudents: Student[] = [];
        let updatedCount = 0;
        let createdCount = 0;

        data.forEach((row, idx) => {
          const keys = Object.keys(row);

          // Detection des colonnes Nom/Prénom
          const combinedKey = keys.find(k => /nom.*prenom/i.test(k) || /nom.*&.*prenom/i.test(k) || /fullname/i.test(k) || k.toLowerCase() === 'eleve');
          const lastNameKey = keys.find(k => /^nom$/i.test(k) || /^lastname$/i.test(k) || /nom de famille/i.test(k));
          const firstNameKey = keys.find(k => /prenom/i.test(k) || /firstname/i.test(k));

          let lastName = '';
          let firstName = '';

          if (combinedKey) {
            const full = String(row[combinedKey] || '').trim();
            const parts = full.split(' ');
            if (parts.length > 1) {
              lastName = parts[0];
              firstName = parts.slice(1).join(' ');
            } else {
              lastName = full;
              firstName = '';
            }
          } else {
            const lVal = lastNameKey ? row[lastNameKey] : '';
            const fVal = firstNameKey ? row[firstNameKey] : '';
            lastName = String(lVal || 'Inconnu');
            firstName = String(fVal || '');
            // Nettoyage doublon nom/prénom
            if (lastName && firstName && lastName.toLowerCase().trim() === firstName.toLowerCase().trim()) {
              firstName = '';
            }
          }

          const formattedName = `${lastName.toUpperCase()} ${firstName}`.trim();
          const normalizedNameKey = formattedName.toLowerCase();

          // Ignore les lignes sans nom
          if (!formattedName || formattedName === 'INCONNU') return;

          const findKey = (search: string[]) => keys.find(k => search.some(s => k.toLowerCase().includes(s)));

          // Classe
          let className = String(row[findKey(['classe', 'grade', 'niveau']) || ''] || '').trim();
          if (!className || className === 'undefined') {
            className = 'Non assigné'; // Valeur par défaut explicite pour "Pas de classe"
          }

          const paidRegistration = Number(row[findKey(['payé inscription', 'inscrp', 'registration']) || '']) || 0;
          const discountVal = Number(row[findKey(['remise', 'discount']) || '']) || 0;
          
          // FIX – Detection of gender column with explicit ambiguity warning
          const genderKey = keys.find(k => /sexe/i.test(k) || /genre/i.test(k) || /gender/i.test(k) || /sex/i.test(k));
          let parsedGender: 'Masculin' | 'Féminin' | undefined = undefined;
          if (genderKey) {
            const rawGender = String(row[genderKey] || '').toLowerCase().trim();
            if (rawGender.startsWith('f') || rawGender.includes('fille') || rawGender.includes('fem') || rawGender.includes('girl')) {
              parsedGender = 'Féminin';
            } else if (rawGender.startsWith('m') || rawGender.includes('garçon') || rawGender.includes('garcon') || rawGender.includes('boy') || rawGender.includes('male') || rawGender.includes('masc')) {
              parsedGender = 'Masculin';
            } else if (rawGender !== '') {
              // Value present but unrecognisable – warn once per import rather than silently defaulting
              addNotification('warning', `Import : Valeur de genre non reconnue "${row[genderKey]}" (ligne ${idx + 2}). Genre laissé non spécifié.`);
            }
            // Empty string → leave undefined (no silent default)
          }

          const customTuitionKey = findKey(['montant scolarité', 'scolarite', 'tuition']);
          const customRegKey = findKey(['montant inscription', 'regamount']);

          const customTuition = customTuitionKey ? Number(row[customTuitionKey]) : undefined;
          const customRegistration = customRegKey ? Number(row[customRegKey]) : undefined;

          const getVal = (vKey: string) => Number(row[findKey([vKey]) || ''] || 0);
          const installments = {
            v1: { amount: getVal('v1'), date: '', method: '' },
            v2: { amount: getVal('v2'), date: '', method: '' },
            v3: { amount: getVal('v3'), date: '', method: '' },
            v4: { amount: getVal('v4'), date: '', method: '' },
            v5: { amount: getVal('v5'), date: '', method: '' },
            v6: { amount: getVal('v6'), date: '', method: '' },
            v7: { amount: getVal('v7'), date: '', method: '' },
            v8: { amount: getVal('v8'), date: '', method: '' },
          };

          // Calcul dynamique
          const financials = calculateStudentFinancials(className, paidRegistration, installments, discountVal, customTuition, customRegistration);

          // Check if exists to Update (Overwrite) or Create
          const existingRecord = updatedRecordsMap.get(normalizedNameKey);
          const studentId = existingRecord ? existingRecord.studentId : `IMP-${Date.now()}-${idx}`;

          const recordToSave: SchoolFeeRecord = {
            id: existingRecord ? existingRecord.id : `F-${studentId}`,
            studentId: studentId,
            studentName: formattedName,
            class: className,
            registration: paidRegistration,
            registrationMethod: 'Mobile Money',
            registrationDate: new Date().toISOString().split('T')[0],
            installments: installments,
            discount: discountVal,
            ...financials
          };

          updatedRecordsMap.set(normalizedNameKey, recordToSave);

          if (existingRecord) {
            updatedCount++;
          } else {
            createdCount++;
            // Add to students list as well if new
            newStudents.push({
              id: studentId || '',
              matricule: `MAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, // Generate Matricule
              firstName: firstName,
              lastName: lastName,
              grade: className,
              status: 'Actif',
              feesStatus: financials.remainingGlobal <= 0 ? 'Payé' : (financials.totalPaid > 0 ? 'Partiel' : 'En attente'),
              attendance: 100,
              joinDate: new Date().toISOString().split('T')[0],
              parentName: 'Importé',
              parentPhone: '',
              address: '',
              gender: parsedGender,
              // Assign gendered avatar only when gender is known; if undefined, default to neutral (boy avatar as placeholder)
              photo: parsedGender === 'Féminin' 
                ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&skinColor=9e563b&hairColor=000000' 
                : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&skinColor=9e563b&hairColor=000000'
            });
          }
        });

        // Convert Map back to array
        const finalRecords = Array.from(updatedRecordsMap.values());
        setRecords(finalRecords);

        // Update Students List : Merge new students with existing, potentially updating existing students' class/status
        if (setStudents) {
          setStudents(prevStudents => {
            const updatedStudents = [...prevStudents];
            // Update existing students class/status based on import
            finalRecords.forEach(rec => {
              const idx = updatedStudents.findIndex(s => s.id === rec.studentId);
              if (idx >= 0) {
                updatedStudents[idx] = {
                  ...updatedStudents[idx],
                  grade: rec.class,
                  feesStatus: rec.remainingGlobal <= 0 ? 'Payé' : (rec.totalPaid > 0 ? 'Partiel' : 'En attente')
                };
              }
            });
            return [...updatedStudents, ...newStudents];
          });
        }

        // Auto-create classes for imported students
        if (classes && setClasses) {
          const newClassesToCreate: any[] = [];
          const existingClassNames = new Set(classes.map(c => c.name));
          // Also track classes we are about to create to avoid duplicates in the same batch
          const newlyCreatedNames = new Set<string>();

          newStudents.forEach(s => {
            if (!existingClassNames.has(s.grade) && !newlyCreatedNames.has(s.grade) && s.grade !== 'Non assigné') {
              newlyCreatedNames.add(s.grade);
              newClassesToCreate.push({
                id: `CLS-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: s.grade,
                teacherId: '',
                studentCount: 0, // Will be updated by the system or next render
                capacity: 30,
                level: s.grade.replace(/[0-9]/g, '').split(' ')[0] || s.grade,
                room: 'Non assignée',
                subjects: [],
                schedule: [],
                description: `Classe de ${s.grade} (Importée)`
              });
            }
          });

          if (newClassesToCreate.length > 0) {
            setClasses(prev => [...prev, ...newClassesToCreate]);
            addNotification('info', `${newClassesToCreate.length} nouvelle(s) classe(s) créée(s) automatiquement.`);
          }
        }

        addNotification('success', `Import terminé : ${createdCount} créés, ${updatedCount} mis à jour.`);
        addLog('Import Excel', `Importation : ${createdCount} ajouts, ${updatedCount} mises à jour`, 'Scolarité', 'create');

      } catch (error) {
        console.error(error);
        addNotification('error', "Erreur lors de l'importation. Vérifiez le format du fichier.");
        addLog('Erreur Import', 'Échec import Excel', 'Scolarité', 'warning');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="card-premium-pattern card-premium-green p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl"><TrendingUp size={20} /></div>
            <span className="font-bold text-sm uppercase tracking-wide opacity-80">TOTAL DÉJÀ PAYÉ</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatMoney(totalPaidGlobal)}</p>
        </div>
        <div className="card-premium-pattern card-premium-rose p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl"><TrendingDown size={20} /></div>
            <span className="font-bold text-sm uppercase tracking-wide opacity-80">RESTE À RECOUVRER</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatMoney(totalRemaining)}</p>
        </div>
        <div className="card-premium-pattern card-premium-blue p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl"><CreditCard size={20} /></div>
            <span className="font-bold text-sm uppercase tracking-wide opacity-80">TAUX DE RECOUVREMENT</span>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold tracking-tight">{recoveryRate}%</p>
            <div className="mb-2 h-2.5 flex-1 bg-white/20 rounded-full overflow-hidden max-w-[120px]">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(recoveryRate, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Financial Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 flex flex-col transition-colors flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-200/60 dark:border-gray-700 flex flex-col gap-3.5 shrink-0 bg-white dark:bg-gray-800 z-20 rounded-t-2xl">
          {/* Row 1: Title & Search Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap flex items-center gap-2 mr-2">
              <FileSpreadsheet className="text-green-600" /> Grand Livre
            </h2>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 hidden sm:block"></div>
            <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select 
              className="px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors font-medium" 
              value={
                selectedClass !== 'Toutes' ? `class:${selectedClass}` :
                filterMode !== 'all' ? `status:${filterMode}` :
                sortOrder !== 'alpha' ? `sort:${sortOrder}` : 'all'
              } 
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('class:')) {
                  const cls = val.replace('class:', '');
                  setSelectedClass(cls);
                  setFilterMode('all');
                } else if (val.startsWith('status:')) {
                  const st = val.replace('status:', '') as 'all' | 'late' | 'paid';
                  setSelectedClass('Toutes');
                  setFilterMode(st);
                } else if (val.startsWith('sort:')) {
                  const s = val.replace('sort:', '') as 'alpha' | 'recent';
                  setSortOrder(s);
                } else {
                  setSelectedClass('Toutes');
                  setFilterMode('all');
                }
              }}
            >
              <option value="all">Tous les élèves (Toutes les classes)</option>
              <optgroup label="Filtrer par statut de paiement">
                <option value="status:late">Statut : Non soldés (Frais en retard)</option>
                <option value="status:paid">Statut : Soldés (Payé total)</option>
              </optgroup>
              <optgroup label="Filtrer par classe">
                {uniqueClasses.filter(c => c !== 'Toutes').map(c => (
                  <option key={c} value={`class:${c}`}>Classe : {c}</option>
                ))}
              </optgroup>
              <optgroup label="Trier par">
                <option value="sort:alpha">Trier : Nom (A-Z)</option>
                <option value="sort:recent">Trier : Plus récent</option>
              </optgroup>
            </select>
          </div>

          {/* Row 2: Action Buttons (Fully visible on dedicated row) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full pt-2 border-t border-slate-100 dark:border-gray-700/60">
            <button onClick={() => setIsStudentModalOpen(true)} className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors font-semibold shadow-sm shadow-blue-500/30">
              <Plus size={16} /> Inscrire élève
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 mx-1 hidden sm:block"></div>
            <button onClick={handleDownloadTemplate} className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors font-medium">
              <Download size={16} /> Modèle
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 hover:border-green-300 transition-colors font-medium dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50">
              <FileSpreadsheet size={16} /> Importer
            </button>
            {currentUserRole === 'ADMIN_GENERALE' && (
              <button onClick={() => setIsSettingsOpen(true)} className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors font-medium">
                <Settings size={16} /> Tarifs
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div 
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={handleFileDrop}
          className="flex-1 overflow-auto relative rounded-b-2xl transition-all border-2 border-transparent hover:border-dashed hover:border-green-400/50 hover:bg-green-50/5 dark:hover:bg-green-950/5 custom-scrollbar"
        >
          <table className="w-full min-w-[1250px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-40 shadow-sm">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 top-0 z-50 bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-600 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.05)]">Nom & Prénom</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 sticky top-0 z-40 bg-gray-50 dark:bg-gray-700/50">Matricule</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 sticky top-0 z-40 bg-gray-50 dark:bg-gray-700/50">Classe</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-right sticky top-0 z-40 bg-gray-50 dark:bg-gray-700/50">Montant Initial</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-center bg-blue-50/50 dark:bg-blue-900/10 sticky top-0 z-40">INSCRP</th>
                {['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'].map(v => (
                  <th key={v} className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-center sticky top-0 z-40 bg-gray-50 dark:bg-gray-700/50">{v}</th>
                ))}
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-center sticky top-0 z-40 bg-gray-50 dark:bg-gray-700/50">Remise</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-right bg-gray-100 dark:bg-gray-700 sticky top-0 z-40">Total Scolarité</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-right bg-green-50 dark:bg-green-900/10 sticky top-0 z-40">Déjà Payé</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-right bg-red-50 dark:bg-red-900/10 sticky top-0 z-40">Restant Global</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 text-center bg-gray-50 dark:bg-gray-800 sticky top-0 right-0 z-50 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-12 text-center text-gray-400"><div className="flex flex-col items-center gap-2"><Search size={32} className="opacity-20" /><p>Aucun élève trouvé.</p></div></td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="p-4 text-sm font-bold text-gray-800 dark:text-white sticky left-0 z-30 bg-white dark:bg-gray-800 border-r border-slate-200/60 dark:border-gray-700 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.05)] transition-colors">{record.studentName}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 font-mono">{students?.find(s => s.id === record.studentId)?.matricule || '-'}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{record.class}</td>
                    <td className="p-4 text-sm text-right text-gray-600 dark:text-gray-300 border-r border-gray-50 dark:border-gray-700 font-medium tabular-nums">{record.initialAmount.toLocaleString()}</td>
                    <td className="p-4 text-sm text-right border-r border-gray-50 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/5"><span className={`px-2 py-1 rounded-md ${record.registration > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>{record.registration > 0 ? record.registration.toLocaleString() : '-'}</span></td>
                    {[record.installments.v1, record.installments.v2, record.installments.v3, record.installments.v4, record.installments.v5, record.installments.v6, record.installments.v7, record.installments.v8].map((instVal, idx) => {
                      const { amount, date, method } = getInstallmentData(instVal);
                      return (
                        <td key={idx} className="p-4 text-sm text-center border-r border-gray-50 dark:border-gray-700">
                          {amount > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                {amount.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
                                {method || 'Mobile Money'}
                              </span>
                              {date && (
                                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                                  {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-200 dark:text-gray-700">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4 text-sm text-center">{record.discount > 0 ? <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">-{record.discount}%</span> : <span className="text-gray-300">-</span>}</td>
                    <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200 text-right bg-gray-50/50 dark:bg-gray-700/30 tabular-nums">{record.totalTuition.toLocaleString()}</td>
                    <td className="p-4 text-sm font-bold text-green-600 dark:text-green-400 text-right bg-green-50/30 dark:bg-green-900/10 tabular-nums">{record.totalPaid.toLocaleString()}</td>
                    <td className="p-4 text-sm font-bold text-red-600 dark:text-red-400 text-right bg-red-50/30 dark:bg-red-900/10 tabular-nums">{record.remainingGlobal.toLocaleString()}</td>
                    <td className="p-4 sticky right-0 z-30 bg-white dark:bg-gray-800 border-l border-slate-200/60 dark:border-gray-700 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)] transition-colors">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(record); }} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors shadow-sm relative z-10" title="Imprimer Reçu"><Printer size={16} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(record); }} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors shadow-sm relative z-10" title="Télécharger le reçu (PDF)"><Download size={16} /></button>
                        <button type="button" onClick={(e) => handleEditRecord(record, e)} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors shadow-sm relative z-10" title="Modifier"><Edit2 size={16} /></button>
                        <button type="button" onClick={(e) => handleDeleteClick(record.id, e)} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shadow-sm relative z-10" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      {/* EDIT RECORD MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200/60 dark:border-gray-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Edit2 size={20} className="text-blue-600" /> Modifier Dossier</h2>

              {/* Message d'erreur inline */}
              {calculateStudentFinancials(editingRecord.class, editingRecord.registration, editingRecord.installments, editingRecord.discount, editingRecord.initialTuition, editingRecord.initialRegistration).totalPaid > calculateStudentFinancials(editingRecord.class, editingRecord.registration, editingRecord.installments, editingRecord.discount, editingRecord.initialTuition, editingRecord.initialRegistration).netDue && (
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded text-xs font-bold ml-4">
                  Montant versé supérieur au dû !
                </div>
              )}

              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-auto"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nom de l'élève (NOM Prénom)</label>
                  <input 
                    type="text"
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none hover:border-gray-300 dark:hover:border-gray-500 transition-all font-semibold" 
                    value={editingRecord.studentName} 
                    onChange={(e) => setEditingRecord({ ...editingRecord, studentName: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Classe</label>
                  <div className="relative">
                    <select className="w-full p-3 pr-10 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none appearance-none cursor-pointer" value={editingRecord.class} onChange={(e) => setEditingRecord({ ...editingRecord, class: e.target.value })}>
                      {PREDEFINED_CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 mb-4">
                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 uppercase">Paiements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">DATE INSCRIPTION</label>
                    <input type="date" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none cursor-pointer text-xs" value={editingRecord.registrationDate || new Date().toISOString().split('T')[0]} onChange={(e) => setEditingRecord({ ...editingRecord, registrationDate: e.target.value })} />
                  </div>
                  <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">INSCRIPTION (Payé)</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none" value={editingRecord.registration} onChange={(e) => setEditingRecord({ ...editingRecord, registration: parseFloat(e.target.value) || 0 })} /></div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">MOYEN INSCRIPTION</label>
                    <select className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none cursor-pointer text-xs" value={editingRecord.registrationMethod || 'Mobile Money'} onChange={(e) => setEditingRecord({ ...editingRecord, registrationMethod: e.target.value })}>
                      <option value="Espèces">Espèces</option>
                      <option value="Mobile Money">Mobile Money</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">REMISE (%)</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none" value={editingRecord.discount} onChange={(e) => setEditingRecord({ ...editingRecord, discount: parseFloat(e.target.value) || 0 })} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">SCOLARITÉ (Théorique)</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none" value={editingRecord.initialTuition} onChange={(e) => setEditingRecord({ ...editingRecord, initialTuition: parseFloat(e.target.value) || 0 })} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">INSCRIPTION (Théorique)</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none" value={editingRecord.initialRegistration} onChange={(e) => setEditingRecord({ ...editingRecord, initialRegistration: parseFloat(e.target.value) || 0 })} /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(editingRecord.installments).map(([key, val]) => {
                  const { amount, date, method } = getInstallmentData(val);
                  return (
                    <div key={key} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-slate-200/60 dark:border-gray-700/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{key}</span>
                        {amount > 0 && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Montant</label>
                        <input 
                          type="number" 
                          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30" 
                          placeholder="0"
                          value={amount || ''} 
                          onChange={(e) => updateInstallmentField(key, 'amount', e.target.value)} 
                        />
                      </div>
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div>
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Date</label>
                            <div className="relative">
                              <input 
                                type="date" 
                                className="w-full pl-8 pr-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-300 dark:hover:border-gray-500 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:opacity-0"
                                value={date || new Date().toISOString().split('T')[0]} 
                                onChange={(e) => updateInstallmentField(key, 'date', e.target.value)} 
                              />
                              <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Moyen</label>
                            <div className="relative">
                              <select 
                                className="w-full pl-8 pr-7 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 hover:border-gray-300 dark:hover:border-gray-500 transition-all cursor-pointer appearance-none"
                                value={method || 'Mobile Money'} 
                                onChange={(e) => updateInstallmentField(key, 'method', e.target.value)}
                              >
                                <option value="Espèces">Espèces</option>
                                <option value="Mobile Money">Mobile Money</option>
                              </select>
                              <CreditCard size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setEditingRecord(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
              <button onClick={handleSaveEdit} className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30"><Save size={18} /> Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200/60 dark:border-gray-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><UserPlus size={20} className="text-primary" /> Nouveau Dossier d'Inscription</h2>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Photo Upload */}
              <div className="flex justify-center">
                <div 
                  onClick={() => studentPhotoInputRef.current?.click()}
                  className="w-40 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-gray-50/50 dark:bg-gray-800/50 relative overflow-hidden"
                >
                   {newStudent.photo ? (
                      <img src={newStudent.photo} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                   ) : (
                      <>
                          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full mb-2">
                              <Camera size={24} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300 text-center px-2 font-medium">Cliquez pour modifier</span>
                      </>
                   )}
                   <input type="file" ref={studentPhotoInputRef} className="hidden" accept="image/*" onChange={handleStudentPhotoUpload} />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nom de famille</label>
                  <input type="text" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: DOUMBIA" value={newStudent.lastName} onChange={e => setNewStudent({ ...newStudent, lastName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Prénom</label>
                  <input type="text" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Seydou" value={newStudent.firstName} onChange={e => setNewStudent({ ...newStudent, firstName: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Date d'inscription</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full p-3 pl-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white text-sm cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                      value={newStudent.registrationDate || new Date().toISOString().split('T')[0]} 
                      onChange={e => setNewStudent({ ...newStudent, registrationDate: e.target.value })} 
                    />
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Payé Inscription (CFA)</label>
                  <input type="number" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="0" value={newStudent.registrationPaid} onChange={e => setNewStudent({ ...newStudent, registrationPaid: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Moyen Inscription</label>
                  <div className="relative">
                    <select className="w-full p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white cursor-pointer appearance-none text-sm" value={newStudent.registrationMethod || 'Mobile Money'} onChange={e => setNewStudent({ ...newStudent, registrationMethod: e.target.value })}>
                      <option value="Espèces">Espèces</option>
                      <option value="Mobile Money">Mobile Money</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Remise (%)</label>
                  <input type="number" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="0" value={newStudent.discount} onChange={e => setNewStudent({ ...newStudent, discount: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Âge</label>
                  <input type="number" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: 6" value={newStudent.age} onChange={e => setNewStudent({ ...newStudent, age: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Classe</label>
                  <div className="relative">
                    <select className="w-full p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white cursor-pointer appearance-none" value={newStudent.class} onChange={e => setNewStudent({ ...newStudent, class: e.target.value })}>
                      {PREDEFINED_CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Genre (Sexe)</label>
                  <div className="relative">
                    <select className="w-full p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white cursor-pointer appearance-none" value={newStudent.gender} onChange={e => setNewStudent({ ...newStudent, gender: e.target.value })}>
                      <option value="Masculin">Masculin (Garçon)</option>
                      <option value="Féminin">Féminin (Fille)</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Statut</label>
                  <div className="relative">
                    <select className="w-full p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white cursor-pointer appearance-none" value={newStudent.status} onChange={e => setNewStudent({ ...newStudent, status: e.target.value })}>
                      <option value="Actif">Actif</option>
                      <option value="Inactif">Inactif</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nom du parent/tuteur</label>
                <input type="text" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Nom complet du tuteur" value={newStudent.parentName} onChange={e => setNewStudent({ ...newStudent, parentName: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Téléphone du parent</label>
                  <input type="tel" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Téléphone du parent" value={newStudent.parentPhone} onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Contact d'urgence</label>
                  <input type="tel" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Contact d'urgence" value={newStudent.emergencyContact} onChange={e => setNewStudent({ ...newStudent, emergencyContact: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Adresse</label>
                <input type="text" className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Adresse complète" value={newStudent.address} onChange={e => setNewStudent({ ...newStudent, address: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Informations médicales (optionnel)</label>
                <textarea className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white resize-none" rows={3} placeholder="Informations de santé importantes, allergies..." value={newStudent.medicalInfo} onChange={e => setNewStudent({ ...newStudent, medicalInfo: e.target.value })}></textarea>
              </div>

            </div>
            
            <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsStudentModalOpen(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg transition-all">Annuler</button>
              <button onClick={handleAddManualStudent} className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"><Save size={18} /> Créer le dossier</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center">
            <h2 className="text-xl font-bold dark:text-white mb-4">Confirmer suppression</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Cette action supprimera également l'élève de la liste principale.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded dark:text-gray-300">Annuler</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIG MODAL */}
      {deleteConfigId && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center">
            <h2 className="text-xl font-bold dark:text-white mb-4">Supprimer ce tarif ?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Cette action supprimera la configuration de tarif pour cette classe.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfigId(null)} className="px-4 py-2 border rounded dark:text-gray-300">Annuler</button>
              <button onClick={executeDeleteConfig} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL (TARIFS) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200/60 dark:border-gray-700 relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gestion des Tarifs</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configurez les frais de scolarité et d'inscription par niveau</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            {/* List */}
            <div className="p-6 max-h-[50vh] overflow-y-auto bg-white dark:bg-gray-800">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[500px] text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Niveau</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Scolarité</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Inscription</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Total</th>
                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {feeConfigs.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucun tarif configuré</td></tr>
                    )}
                    {feeConfigs.map((config) => (
                      <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="p-4 font-bold text-gray-800 dark:text-white">{config.grade}</td>
                        <td className="p-4 text-right tabular-nums text-gray-600 dark:text-gray-300">{config.tuitionAmount.toLocaleString()}</td>
                        <td className="p-4 text-right tabular-nums text-gray-600 dark:text-gray-300">{config.registrationAmount.toLocaleString()}</td>
                        <td className="p-4 text-right font-bold text-primary dark:text-blue-400 tabular-nums">{(config.tuitionAmount + config.registrationAmount).toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openEditConfigModal(config)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Modifier">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => confirmDeleteConfig(config.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Supprimer">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer / Add Form Only */}
            <div className="p-6 bg-gray-50/50 dark:bg-gray-900/30 border-t border-slate-200/60 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Plus size={16} /> Ajouter une nouvelle configuration
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <select
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={newConfig.grade}
                  onChange={(e) => setNewConfig({ ...newConfig, grade: e.target.value })}
                >
                  {SCHOOL_LEVELS.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>

                <input
                  type="number"
                  placeholder="Scolarité (FCFA)"
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none text-sm"
                  value={newConfig.tuitionAmount}
                  onChange={(e) => setNewConfig({ ...newConfig, tuitionAmount: e.target.value })}
                />

                <input
                  type="number"
                  placeholder="Inscription (FCFA)"
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none text-sm"
                  value={newConfig.registrationAmount}
                  onChange={(e) => setNewConfig({ ...newConfig, registrationAmount: e.target.value })}
                />
              </div>
              <button
                onClick={handleAddConfig}
                className="w-full mt-3 py-2.5 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm"
              >
                Ajouter
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 flex justify-end border-t border-slate-200/60 dark:border-gray-700">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                Fermer
              </button>
            </div>

            {/* NESTED EDIT MODAL (POPUP ON POPUP) */}
            {isEditConfigModalOpen && (
              <div className="absolute inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 animate-in fade-in zoom-in duration-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Edit2 size={18} className="text-blue-600" /> Modifier le tarif
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Niveau</label>
                      <select
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                        value={editConfigForm.grade}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, grade: e.target.value })}
                      >
                        {SCHOOL_LEVELS.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Scolarité (FCFA)</label>
                      <input
                        type="number"
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none"
                        value={editConfigForm.tuitionAmount}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, tuitionAmount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Inscription (FCFA)</label>
                      <input
                        type="number"
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none"
                        value={editConfigForm.registrationAmount}
                        onChange={(e) => setEditConfigForm({ ...editConfigForm, registrationAmount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200/60 dark:border-gray-700">
                    <button
                      onClick={() => setIsEditConfigModalOpen(false)}
                      className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleUpdateConfig}
                      className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                      Mettre à jour
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Scolarity;
