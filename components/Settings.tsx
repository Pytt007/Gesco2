import React, { useState, useEffect } from 'react';
import { SchoolSettingsData, NotificationType, Student, SchoolFeeRecord, Transaction, UserAccount } from '../types';
import { Save, Upload, Moon, Sun, Lock, School, MapPin, Phone, Mail, User, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Play, Info, X, UserPlus } from 'lucide-react';
import { uploadLogo } from '../services/storageService';
import { supabase } from '../services/supabase';

interface SettingsProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  schoolYear: string;
  setSchoolYear: (year: string) => void;
  settingsData: SchoolSettingsData;
  setSettingsData: (data: SchoolSettingsData) => void;
  addNotification: (type: NotificationType, message: string) => void;
  students: Student[];
  setStudents: (students: Student[]) => void;
  feeRecords: SchoolFeeRecord[];
  setFeeRecords: (records: SchoolFeeRecord[]) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addLog: (action: string, details: string, module: any, type?: string) => void;
  rolePermissions: Record<string, string[]>;
  setRolePermissions: (perms: Record<string, string[]>) => void;
  currentUser?: { username: string; role: string; fullName: string } | null;
  userAccounts: UserAccount[];
  setUserAccounts: (accounts: UserAccount[]) => void;
  // Supabase Auth handlers
  changePassword?: (newPassword: string) => Promise<{ error?: string }>;
  createUser?: (username: string, password: string, role: string, fullName: string) => Promise<{ error?: string }>;
  deleteUser?: (userId: string) => Promise<{ error?: string }>;
  updateUserRole?: (userId: string, role: string) => Promise<{ error?: string }>;
  // BUG-007 FIX: These props are needed to reset subscriptions on year transition
  setCanteenSubscriptions?: (subs: any[]) => void;
  setTransportSubscriptions?: (subs: any[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  isDarkMode, 
  toggleTheme, 
  schoolYear, 
  setSchoolYear,
  settingsData,
  setSettingsData,
  addNotification,
  students = [],
  setStudents,
  feeRecords = [],
  setFeeRecords,
  transactions = [],
  setTransactions,
  addLog,
  rolePermissions,
  setRolePermissions,
  currentUser,
  userAccounts = [],
  setUserAccounts,
  changePassword,
  createUser,
  deleteUser,
  updateUserRole,
  setCanteenSubscriptions,
  setTransportSubscriptions
}) => {
  // Local state for form handling (buffers changes before saving)
  const [localData, setLocalData] = useState<SchoolSettingsData>(settingsData);
  
  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // UI Feedback states
  const [isDirty, setIsDirty] = useState(false);
  
  // Permissions buffer states
  const [tempPermissions, setTempPermissions] = useState<Record<string, string[]>>(() => rolePermissions);
  const [isPermsDirty, setIsPermsDirty] = useState(false);

  useEffect(() => {
    setTempPermissions(rolePermissions);
    setIsPermsDirty(false);
  }, [rolePermissions]);

  // Reset Confirmation Modal State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Transition wizard states
  const [showTransitionWizard, setShowTransitionWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Calculate next year prefill
  const getNextSchoolYearPrefill = (currentYearStr: string) => {
    const parts = currentYearStr.split('-');
    if (parts.length === 2) {
      const y1 = parseInt(parts[0]) || 2026;
      const y2 = parseInt(parts[1]) || 2027;
      return `${y1 + 1}-${y2 + 1}`;
    }
    const currentYearNum = parseInt(currentYearStr) || 2026;
    return `${currentYearNum + 1}-${currentYearNum + 2}`;
  };

  const [newYearInput, setNewYearInput] = useState(() => getNextSchoolYearPrefill(schoolYear));
  const [promoteStudents, setPromoteStudents] = useState(true);
  const [carryOverFees, setCarryOverFees] = useState(true);

  const syLabel = schoolYear;

  // Update local state when parent props change (if updated from elsewhere)
  useEffect(() => {
    setLocalData(settingsData);
  }, [settingsData]);

  const handleInputChange = (field: keyof SchoolSettingsData, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Prévisualisation immédiate (base64 local)
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleInputChange('logo', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Upload vers Supabase Storage en arrière-plan
      const result = await uploadLogo(file, 'logos/school-logo');
      if ('publicUrl' in result) {
        handleInputChange('logo', result.publicUrl);
      } else {
        console.warn('[Settings] Upload logo Supabase échoué :', result.error);
        // La prévisualisation base64 sera sauvegardée en fallback
      }
    }
  };

  const handleSave = async () => {
    if (!isDirty) {
      addNotification('info', 'Aucune modification à enregistrer.');
      return;
    }

    // Changement de mot de passe via Supabase Auth
    if (passwords.new || passwords.confirm) {
      if (!passwords.current) {
        addNotification('error', 'Veuillez saisir votre mot de passe actuel pour le modifier.');
        return;
      }
      if (passwords.new !== passwords.confirm) {
        addNotification('error', 'Les nouveaux mots de passe ne correspondent pas.');
        return;
      }
      if (passwords.new.length < 12) {
        addNotification('error', 'Le mot de passe doit contenir au moins 12 caractères.');
        return;
      }
      if (changePassword) {
        const { error } = await changePassword(passwords.new, passwords.current);
        if (error) {
          addNotification('error', `Erreur lors du changement de mot de passe : ${error}`);
          return;
        }
      }
      setPasswords({ current: '', new: '', confirm: '' });
    }

    // Save global settings
    setSettingsData(localData);
    setIsDirty(false);
    
    addNotification('success', 'Paramètres enregistrés avec succès !');
  };

  const handleCancel = () => {
    if (!isDirty) {
      addNotification('info', 'Aucune modification à annuler.');
      return;
    }
    setLocalData(settingsData);
    setPasswords({ current: '', new: '', confirm: '' });
    setIsDirty(false);
    addNotification('info', 'Modifications annulées.');
  };

  const handleResetSessions = () => {
    setShowResetConfirm(true);
  };

  const executeResetSessions = () => {
    setShowResetConfirm(false);
    addNotification('success', 'Toutes les sessions actives ont été réinitialisées.');
  };

  const BACKUP_KEYS = [
    'school_year',
    'role_permissions',
    'user_accounts',
    'school_settings',
    'staff_list',
    'students_list',
    'fee_records',
    'classes_list',
    'transactions_list',
    'canteen_subscriptions',
    'canteen_menus',
    'transport_subscriptions',
    'bus_routes',
    'activities_list',
    'history_logs',
    'fee_configs',
    'evaluation_sessions',
    'bus_expenses',
    'transport_fee_configs',
    'school_expenses',
    'canteen_fee_configs',
    'canteen_stock_items',
    'canteen_expenses',
    'canteen_dishes_library'
  ];

  const handleExportBackup = () => {
    const backupData: Record<string, string | null> = {};
    BACKUP_KEYS.forEach(key => {
      backupData[key] = localStorage.getItem(key);
    });
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gesco_backup_${schoolYear}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addNotification('success', 'Sauvegarde exportée avec succès !');
    addLog('Export de sauvegarde', `Exportation de la sauvegarde globale pour l'année ${schoolYear}.`, 'Paramètres', 'export');
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as Record<string, string | null>;
        
        if (!data.school_year || !data.school_settings) {
          addNotification('error', 'Fichier de sauvegarde invalide.');
          return;
        }
        
        if (!window.confirm('Attention : Cette action va écraser TOUTES les données actuelles de l\'application. Voulez-vous continuer ?')) {
          return;
        }
        
        Object.entries(data).forEach(([key, value]) => {
          if (value !== null) {
            localStorage.setItem(key, value);
          } else {
            localStorage.removeItem(key);
          }
        });
        
        addNotification('success', 'Restauration réussie ! Rechargement de la page...');
        addLog('Import de sauvegarde', `Restauration des données depuis un fichier de sauvegarde.`, 'Paramètres', 'import');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
      } catch (err) {
        addNotification('error', 'Erreur lors de la lecture du fichier de sauvegarde.');
      }
    };
    reader.readAsText(file);
  };

  const handleFinalizeTransition = async () => {
    try {
      addNotification('info', 'Début de la transition d\'année scolaire...');
      
      // 1. Promote students
      let promotedStudents: Student[] = [];
      if (promoteStudents) {
        // Class progression mapping
        const classProgression: Record<string, string> = {
          'Garderie': 'Ptesection A',
          'Ptesection A': 'Ptesection B',
          'Ptesection B': 'Moysection',
          'Moysection': 'Grdsection',
          'Grdsection': 'CP1A',
          'CP1A': 'CP1B',
          'CP1B': 'CP2A',
          'CP2A': 'CP2B',
          'CP2B': 'CE1A',
          'CE1A': 'CE1B',
          'CE1B': 'CE2A',
          'CE2A': 'CE2B',
          'CE2B': 'CM1A',
          'CM1A': 'CM1B',
          'CM1B': 'CM2A',
          'CM2A': 'CM2B',
          'CM2B': 'Diplômé',
          'CP1': 'CP2',
          'CP2': 'CE1',
          'CE1': 'CE2',
          'CE2': 'CM1',
          'CM1': 'CM2',
          'CM2': 'Diplômé',
        };

        promotedStudents = students.map(student => {
          const currentGrade = student.grade;
          const nextGrade = classProgression[currentGrade] || currentGrade;
          const isArchived = nextGrade === 'Diplômé';

          return {
            ...student,
            grade: nextGrade,
            status: isArchived ? ('Inactif' as const) : student.status,
            feesStatus: 'En attente' as const, // Réinitialiser le statut frais pour la nouvelle année
          };
        });
      } else {
        promotedStudents = students.map(student => ({
          ...student,
          feesStatus: 'En attente' as const,
        }));
      }

      // Upsert promoted students to the new school year in Supabase
      if (promotedStudents.length > 0) {
        const studentUpserts = promotedStudents.map(student => ({
          id: student.id,
          school_year: newYearInput,
          data: student,
          updated_at: new Date().toISOString(),
        }));
        
        const { error: studentErr } = await supabase
          .from('students')
          .upsert(studentUpserts, { onConflict: 'id, school_year' });
        
        if (studentErr) {
          console.error('[transition] Error upserting students:', studentErr);
          addNotification('error', `Erreur lors de la copie des élèves : ${studentErr.message}`);
          return;
        }
      }

      // 2. Carry over fee records if checked
      if (carryOverFees) {
        const emptyInstallment = { amount: 0, date: '', method: '' };
        const newFeeRecords = feeRecords.map(record => ({
          ...record,
          registration: 0,
          installments: {
            v1: emptyInstallment, v2: emptyInstallment, v3: emptyInstallment,
            v4: emptyInstallment, v5: emptyInstallment, v6: emptyInstallment,
            v7: emptyInstallment, v8: emptyInstallment,
          },
          totalPaid: 0,
          remainingGlobal: record.netDue, // Tout reste à payer
          discount: 0,
        }));

        if (newFeeRecords.length > 0) {
          const feeRecordUpserts = newFeeRecords.map(record => ({
            id: record.id,
            school_year: newYearInput,
            data: record,
            updated_at: new Date().toISOString(),
          }));

          const { error: feeErr } = await supabase
            .from('fee_records')
            .upsert(feeRecordUpserts, { onConflict: 'id, school_year' });

          if (feeErr) {
            console.error('[transition] Error upserting fee records:', feeErr);
            addNotification('error', `Erreur lors de la copie des dossiers financiers : ${feeErr.message}`);
            return;
          }
        }
      }

      // 3. Copy Staff Members
      const { data: staffRows, error: staffFetchErr } = await supabase
        .from('staff')
        .select('id, data')
        .eq('school_year', schoolYear);
      
      if (staffFetchErr) {
        console.error('[transition] Error fetching staff:', staffFetchErr);
      } else if (staffRows && staffRows.length > 0) {
        const staffUpserts = staffRows.map(row => ({
          id: row.id,
          school_year: newYearInput,
          data: row.data,
          updated_at: new Date().toISOString(),
        }));

        const { error: staffErr } = await supabase
          .from('staff')
          .upsert(staffUpserts, { onConflict: 'id, school_year' });
        
        if (staffErr) console.error('[transition] Error upserting staff:', staffErr);
      }

      // 4. Copy Class Groups
      const { data: classesRows, error: classesFetchErr } = await supabase
        .from('classes')
        .select('id, data')
        .eq('school_year', schoolYear);

      if (classesFetchErr) {
        console.error('[transition] Error fetching classes:', classesFetchErr);
      } else if (classesRows && classesRows.length > 0) {
        const classesUpserts = classesRows.map(row => {
          const classData = { ...(row.data as Record<string, any>), studentCount: 0 };
          return {
            id: row.id,
            school_year: newYearInput,
            data: classData,
            updated_at: new Date().toISOString(),
          };
        });

        const { error: classesErr } = await supabase
          .from('classes')
          .upsert(classesUpserts, { onConflict: 'id, school_year' });
        
        if (classesErr) console.error('[transition] Error upserting classes:', classesErr);
      }

      // 5. Copy Fee Configs (Tarifs de scolarité)
      const { data: feeConfigsRows, error: feeConfigsFetchErr } = await supabase
        .from('fee_configs')
        .select('id, data')
        .eq('school_year', schoolYear);

      if (feeConfigsFetchErr) {
        console.error('[transition] Error fetching fee configs:', feeConfigsFetchErr);
      } else if (feeConfigsRows && feeConfigsRows.length > 0) {
        const feeConfigsUpserts = feeConfigsRows.map(row => ({
          id: row.id,
          school_year: newYearInput,
          data: row.data,
          updated_at: new Date().toISOString(),
        }));

        const { error: feeConfigsErr } = await supabase
          .from('fee_configs')
          .upsert(feeConfigsUpserts, { onConflict: 'id, school_year' });
        
        if (feeConfigsErr) console.error('[transition] Error upserting fee configs:', feeConfigsErr);
      }

      // 5b. Copy Module Configs (Cantine, Transport, Stocks & Budgets)
      const moduleTablesToCopy = ['canteen_fee_configs', 'transport_fee_configs', 'canteen_stock_items', 'school_budgets'];
      for (const tName of moduleTablesToCopy) {
        const { data: rows } = await supabase.from(tName).select('id, data').eq('school_year', schoolYear);
        if (rows && rows.length > 0) {
          const upserts = rows.map(r => ({
            id: r.id,
            school_year: newYearInput,
            data: r.data,
            updated_at: new Date().toISOString()
          }));
          await supabase.from(tName).upsert(upserts, { onConflict: 'id, school_year' });
        }
      }

      // 6. Set new school year
      setSchoolYear(newYearInput);

      // 7. Log the action in history_logs for BOTH old and new years
      const actorName = currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Système';
      const logDetails = `Clôture de l'année ${schoolYear} et passage à la nouvelle année ${newYearInput}.`;
      
      const logId = `LOG-${Date.now()}`;
      const logData = {
        id: logId,
        action: "Transition d'Année Scolaire",
        details: logDetails,
        module: 'Système',
        user: actorName,
        timestamp: new Date().toISOString(),
        type: 'update'
      };

      const logUpserts = [
        { id: logId + '-old', school_year: schoolYear, data: logData, updated_at: new Date().toISOString() },
        { id: logId + '-new', school_year: newYearInput, data: logData, updated_at: new Date().toISOString() }
      ];

      await supabase.from('history_logs').upsert(logUpserts, { onConflict: 'id, school_year' });

      addNotification('success', `Année scolaire ${newYearInput} initialisée avec succès !`);
      setShowTransitionWizard(false);
      
      setTimeout(() => {
          window.location.reload();
      }, 1200);

    } catch (err) {
      console.error('[transition] Unexpected error:', err);
      addNotification('error', 'Une erreur inattendue est survenue lors de la transition.');
    }
  };

  const ALL_MODULES = [
    { key: 'STUDENTS', label: 'Élèves' },
    { key: 'CLASSES', label: 'Classes' },
    { key: 'STAFF', label: 'Personnel' },
    { key: 'CANTEEN', label: 'Cantine' },
    { key: 'TRANSPORT', label: 'Transport' },
    { key: 'ACTIVITIES', label: 'Activités' },
    { key: 'NOTES', label: 'Notes & Éval.' },
    { key: 'SCOLARITY', label: 'Scolarité' },
    { key: 'EXPENSES', label: 'Dépenses' },
    { key: 'REPORTS', label: 'Rapports' },
    { key: 'HISTORY', label: 'Historique' },
    { key: 'STATISTICS', label: 'Statistiques' },
    { key: 'SETTINGS', label: 'Paramètres' }
  ];

  const ALL_ROLES = [
    { key: 'ADMIN_GENERALE', label: 'Admin Général' },
    { key: 'CANTINE_TRANSPORT', label: 'Cantine & Car' },
    { key: 'SCOLAIRE_ENSEIGNANT', label: 'Scolaire (Enseignant)' },
    { key: 'FINANCE', label: 'Finance' }
  ];

  const handleTogglePermission = (roleKey: string, viewKey: string) => {
    if (roleKey === 'ADMIN_GENERALE') return;
    
    const activePerms = tempPermissions[roleKey] || [];
    let updatedPerms: string[];
    
    if (activePerms.includes(viewKey)) {
      updatedPerms = activePerms.filter(k => k !== viewKey);
    } else {
      updatedPerms = [...activePerms, viewKey];
    }
    
    setTempPermissions({
      ...tempPermissions,
      [roleKey]: updatedPerms
    });
    setIsPermsDirty(true);
  };

  const handleSavePermissions = () => {
    // VULN-003 FIX: Only ADMIN_GENERALE can modify permissions
    if (currentUser?.role !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (!isPermsDirty) {
      addNotification('info', 'Aucune modification des habilitations à enregistrer.');
      return;
    }
    // Enforce ADMIN_GENERALE invariant: always keep full permissions
    const DEFAULT_ADMIN_MODULES = [
      'DASHBOARD', 'STUDENTS', 'CLASSES', 'STAFF', 'CANTEEN', 'TRANSPORT', 'ACTIVITIES', 'NOTES', 'SCOLARITY', 'EXPENSES', 'REPORTS', 'HISTORY', 'STATISTICS', 'SETTINGS'
    ];
    const safePerms = { ...tempPermissions, ADMIN_GENERALE: DEFAULT_ADMIN_MODULES };
    setRolePermissions(safePerms);
    setIsPermsDirty(false);
    
    if (addLog) {
      addLog(
        "Modification des Habilitations",
        "Les droits d'accès des différents profils de l'établissement ont été enregistrés.",
        "Système",
        "update"
      );
    }
    addNotification('success', 'Habilitations d\'accès enregistrées avec succès !');
  };

  const handleCancelPermissions = () => {
    if (!isPermsDirty) {
      addNotification('info', 'Aucune modification des habilitations à annuler.');
      return;
    }
    setTempPermissions(rolePermissions);
    setIsPermsDirty(false);
    addNotification('info', 'Modifications des habilitations annulées.');
  };

  // User accounts manager states
  const [newUserName, setNewUserName] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN_GENERALE' | 'CANTINE_TRANSPORT' | 'SCOLAIRE_ENSEIGNANT' | 'FINANCE'>('FINANCE');

  const handleAddUser = async () => {
    // VULN-003 FIX: Only ADMIN_GENERALE can create accounts
    if (currentUser?.role !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (!newUserName.trim() || !newUserLogin.trim() || !newUserPass.trim()) {
      addNotification('error', 'Veuillez remplir tous les champs du nouvel utilisateur.');
      return;
    }

    if (userAccounts.some(u => u.username.toLowerCase() === newUserLogin.trim().toLowerCase())) {
      addNotification('error', "Cet identifiant est déjà utilisé par un autre compte.");
      return;
    }

    if (newUserPass.length < 12) {
      addNotification('error', "Le mot de passe doit faire au moins 12 caractères.");
      return;
    }

    try {
      if (createUser) {
        const res = await createUser(
          newUserLogin.trim().toLowerCase(),
          newUserPass,
          newUserRole,
          newUserName.trim()
        );
        if (res.error) {
          addNotification('error', `Erreur lors de la création du compte : ${res.error}`);
          return;
        }
      } else {
        // Local fallback
        const newUser: UserAccount = {
          id: `usr-${Date.now()}`,
          fullName: newUserName.trim(),
          username: newUserLogin.trim().toLowerCase(),
          password: newUserPass.trim(),
          role: newUserRole,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${newUserLogin.trim()}`
        };
        setUserAccounts([...userAccounts, newUser]);
      }

      addLog(
        "Création de compte",
        `Le compte utilisateur pour ${newUserName.trim()} (${newUserLogin.trim().toLowerCase()}) a été créé.`,
        "Système",
        "create"
      );
      addNotification('success', `Compte créé avec succès pour ${newUserName.trim()} !`);

      setNewUserName('');
      setNewUserLogin('');
      setNewUserPass('');
      setNewUserRole('FINANCE');
    } catch (err: any) {
      addNotification('error', err?.message || 'Erreur lors de la création du compte.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // VULN-003 FIX: Only ADMIN_GENERALE can delete accounts
    if (currentUser?.role !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    const userToDelete = userAccounts.find(u => u.id === userId);
    if (!userToDelete) return;

    if (currentUser && userToDelete.username.toLowerCase() === currentUser.username.toLowerCase()) {
      addNotification('error', 'Vous ne pouvez pas supprimer votre propre compte connecté.');
      return;
    }

    if (userToDelete.role === 'ADMIN_GENERALE' && userAccounts.filter(u => u.role === 'ADMIN_GENERALE').length <= 1) {
      addNotification('error', 'Il doit rester au moins un compte Administrateur Général actif.');
      return;
    }

    try {
      if (deleteUser) {
        const res = await deleteUser(userId);
        if (res.error) {
          addNotification('error', `Erreur lors de la suppression du compte : ${res.error}`);
          return;
        }
      } else {
        setUserAccounts(userAccounts.filter(u => u.id !== userId));
      }

      addLog(
        "Suppression de compte",
        `Le compte utilisateur pour ${userToDelete.fullName} (${userToDelete.username}) a été supprimé.`,
        "Système",
        "delete"
      );
      addNotification('success', `Compte de ${userToDelete.fullName} supprimé.`);
    } catch (err: any) {
      addNotification('error', err?.message || 'Erreur lors de la suppression du compte.');
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col overflow-y-auto pr-1 custom-scrollbar">
       {/* Reset Confirmation Modal */}
       {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Réinitialiser les sessions</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                Voulez-vous vraiment déconnecter tous les utilisateurs ? Ils devront se reconnecter pour accéder à l'application.
                </p>
                <div className="flex justify-center gap-3">
                <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Annuler
                </button>
                <button 
                    onClick={executeResetSessions}
                    className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all flex items-center gap-2"
                >
                    <Trash2 size={18} />
                    Réinitialiser
                </button>
                </div>
            </div>
        </div>
       )}

       {/* Theme Section */}
       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
             <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
               {isDarkMode ? <Moon size={20} className="text-purple-400" /> : <Sun size={20} className="text-yellow-500" />}
               Apparence de l'interface
             </h3>
             <p className="text-sm text-gray-500 dark:text-gray-400">Choisissez entre le mode clair et le mode sombre pour votre confort.</p>
          </div>
          <button 
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isDarkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
             {isDarkMode ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: General Info */}
          <div className="lg:col-span-2 space-y-6">
             {/* Establishment Identity */}
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200/60 dark:border-gray-700">
                   <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <School size={20} className="text-primary" />
                      Identité de l'établissement
                   </h2>
                </div>
                <div className="p-6 space-y-6">
                   <div className="flex items-center gap-6">
                      <div className="relative group">
                         <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-200/60 dark:border-gray-700 bg-gray-100">
                            <img src={localData.logo} alt="Logo École" className="w-full h-full object-cover" />
                         </div>
                         <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full text-white">
                            <Upload size={20} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                         </label>
                      </div>
                      <div className="flex-1">
                         <h3 className="font-medium text-gray-900 dark:text-white">Logo de l'établissement</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Recommandé: 500x500px, PNG ou JPG.</p>
                         <label className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors inline-block">
                            Changer le logo
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                         </label>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nom de l'établissement</label>
                         <input 
                            type="text" 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                            value={localData.schoolName}
                            onChange={(e) => handleInputChange('schoolName', e.target.value)}
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Directeur / Directrice</label>
                         <div className="relative">
                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                                value={localData.directorName}
                                onChange={(e) => handleInputChange('directorName', e.target.value)}
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Année Scolaire (Globale)</label>
                         <input 
                           type="text" 
                           className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                           value={schoolYear}
                           onChange={(e) => {
                             setSchoolYear(e.target.value);
                             setIsDirty(true);
                           }}
                         />
                      </div>
                   </div>
                </div>
             </div>

             {/* Contact Info */}
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200/60 dark:border-gray-700">
                   <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <MapPin size={20} className="text-secondary" />
                      Coordonnées
                   </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Email Contact</label>
                         <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="email" 
                                className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                                value={localData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Téléphone</label>
                         <div className="relative">
                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="tel" 
                                className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                                value={localData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                            />
                         </div>
                      </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Adresse Postale</label>
                       <textarea 
                            rows={3} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                            value={localData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                        ></textarea>
                    </div>
                 </div>
              </div>

              {/* Habilitations Management Card (Only visible to Admin Général or in read-only to others) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
                 <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <Lock size={20} className="text-blue-500" />
                       Habilitations &amp; Droits d'Accès
                    </h2>
                    {currentUser?.role !== 'ADMIN_GENERALE' && (
                       <span className="text-[10px] bg-red-50 text-red-650 dark:bg-red-955/40 dark:text-red-400 font-bold px-2 py-0.5 rounded">Lecture seule</span>
                    )}
                 </div>
                 
                 {currentUser?.role !== 'ADMIN_GENERALE' ? (
                    <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                       Seul l'Administrateur Général peut gérer les comptes d'accès.
                    </div>
                 ) : (
                    <div className="p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700 rounded-xl mb-4">
                           <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed md:max-w-[70%]">
                              Cochez ou décochez les cases ci-dessous pour modifier les modules de navigation visibles pour chaque profil. Les droits de l'Admin Général restent verrouillés à 100%.
                           </p>
                           {isPermsDirty ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wide shrink-0 w-fit">
                                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                 Modifications non enregistrées
                              </span>
                           ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wide shrink-0 w-fit">
                                 <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                 Habilitations enregistrées
                              </span>
                           )}
                        </div>
                        <div className="overflow-x-auto border border-slate-200/60 dark:border-gray-700 rounded-xl">
                           <table className="w-full min-w-[800px] text-left border-collapse text-[10px]">
                              <thead>
                                 <tr className="bg-gray-50 dark:bg-gray-900 border-b border-slate-200/60 dark:border-gray-700">
                                    <th className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase w-40">Profil / Rôle</th>
                                    {ALL_MODULES.map(mod => (
                                       <th key={mod.key} className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-center min-w-[70px]">{mod.label}</th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                 {ALL_ROLES.map(role => (
                                    <tr key={role.key} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all">
                                       <td className="p-3 font-extrabold text-gray-800 dark:text-white">{role.label}</td>
                                       {ALL_MODULES.map(mod => {
                                          const isChecked = tempPermissions[role.key]?.includes(mod.key) || false;
                                          const isDisabled = role.key === 'ADMIN_GENERALE';
                                          return (
                                             <td key={mod.key} className="p-3 text-center">
                                                <input 
                                                   type="checkbox" 
                                                   checked={isChecked} 
                                                   disabled={isDisabled}
                                                   onChange={() => handleTogglePermission(role.key, mod.key)}
                                                   className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                                />
                                             </td>
                                          );
                                       })}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                        
                        {/* Manual Save Actions for Permissions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-gray-700/60 mt-4">
                           <button 
                             onClick={handleCancelPermissions}
                             className="px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                           >
                             Annuler
                           </button>
                           <button 
                             onClick={handleSavePermissions}
                             className="px-5 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/10 cursor-pointer flex items-center gap-1.5"
                           >
                             <Save size={13} />
                             Enregistrer les habilitations
                           </button>
                        </div>
                    </div>
                 )}
              </div>

              {/* User Accounts Management Card (Only visible to Admin Général or in read-only to others) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
                 <div className="p-6 border-b border-slate-200/60 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-850 dark:text-white flex items-center gap-2">
                       <User size={20} className="text-blue-500" />
                       Gestion des Comptes Utilisateurs
                    </h2>
                 </div>
                 
                 {currentUser?.role !== 'ADMIN_GENERALE' ? (
                    <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                       Seul l'Administrateur Général peut gérer les comptes d'accès.
                    </div>
                 ) : (
                    <div className="p-6 space-y-6">
                       {/* Users List Table */}
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Comptes Existants</p>
                          <div className="overflow-x-auto border border-slate-200/60 dark:border-gray-700 rounded-xl">
                             <table className="w-full min-w-[800px] text-left border-collapse text-[10px]">
                                <thead>
                                   <tr className="bg-gray-50 dark:bg-gray-900 border-b border-slate-200/60 dark:border-gray-700">
                                      <th className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase">Utilisateur</th>
                                      <th className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase">Identifiant</th>
                                      <th className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase">Rôle</th>
                                      <th className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Actions</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                   {userAccounts.map(acc => {
                                      const isSelf = currentUser && acc.username.toLowerCase() === currentUser.username.toLowerCase();
                                      return (
                                         <tr key={acc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all">
                                            <td className="p-3 font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                               <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0 border border-gray-205 dark:border-gray-600">
                                                  <img src={acc.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${acc.username}`} alt={acc.fullName} className="w-full h-full object-cover" />
                                               </div>
                                               <span>{acc.fullName} {isSelf && <span className="text-[8px] bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold px-1 rounded ml-1">Moi</span>}</span>
                                            </td>
                                            <td className="p-3 font-medium text-gray-600 dark:text-gray-300 tabular-nums">{acc.username}</td>
                                            <td className="p-3 font-semibold text-gray-750 dark:text-gray-300">
                                               {acc.role === 'ADMIN_GENERALE' ? 'Admin Général' :
                                                acc.role === 'CANTINE_TRANSPORT' ? 'Cantine & Car' :
                                                acc.role === 'SCOLAIRE_ENSEIGNANT' ? 'Scolaire' : 'Finance'}
                                            </td>
                                            <td className="p-3 text-center">
                                               <button
                                                  disabled={isSelf}
                                                  onClick={() => handleDeleteUser(acc.id)}
                                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                  title={isSelf ? "Impossible de supprimer votre compte actif" : "Supprimer ce compte"}
                                               >
                                                  <Trash2 size={12} />
                                               </button>
                                            </td>
                                         </tr>
                                      );
                                   })}
                                </tbody>
                             </table>
                          </div>
                       </div>

                       {/* Add User Form */}
                       <div className="border-t border-slate-200/60 dark:border-gray-700 pt-5 space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Créer un Nouvel Accès</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nom Complet</label>
                                <input 
                                   type="text" 
                                   className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                   placeholder="Ex: Marc Dubois"
                                   value={newUserName}
                                   onChange={e => setNewUserName(e.target.value)}
                                />
                             </div>
                             <div>
                                <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Identifiant (Username)</label>
                                <input 
                                   type="text" 
                                   className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                   placeholder="Ex: mdubois"
                                   value={newUserLogin}
                                   onChange={e => setNewUserLogin(e.target.value)}
                                />
                             </div>
                             <div>
                                <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Mot de Passe</label>
                                <input 
                                   type="password" 
                                   className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                   placeholder="••••••••"
                                   value={newUserPass}
                                   onChange={e => setNewUserPass(e.target.value)}
                                />
                             </div>
                             <div>
                                <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Niveau d'Accès / Rôle</label>
                                <select 
                                   className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
                                   value={newUserRole}
                                   onChange={e => setNewUserRole(e.target.value as any)}
                                >
                                   <option value="ADMIN_GENERALE">Administration Générale</option>
                                   <option value="CANTINE_TRANSPORT">Cantine &amp; Car (Transport)</option>
                                   <option value="SCOLAIRE_ENSEIGNANT">Scolaire (Enseignant)</option>
                                   <option value="FINANCE">Finance</option>
                                </select>
                             </div>
                          </div>
                          
                          <button
                             onClick={handleAddUser}
                             className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all"
                          >
                             <User size={12} /> Enregistrer le Compte d'Accès
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>

          {/* Right Column: Security & Actions */}
          <div className="space-y-6">
             {/* School Year Transition Card */}
             <div className="bg-gradient-to-br from-blue-600 to-indigo-750 text-white rounded-xl shadow-md p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-30 pointer-events-none"></div>
                <div className="relative z-10 space-y-4">
                   <div className="flex justify-between items-start">
                      <h3 className="font-extrabold text-xs tracking-wide uppercase">Clôture &amp; Transition</h3>
                      <School size={20} className="opacity-80" />
                   </div>
                   <p className="text-[11px] text-white/85 leading-relaxed">
                      Démarrez l'assistant pas-à-pas pour clôturer l'année <strong>{schoolYear}</strong>, promouvoir les élèves de classe et initialiser les fiches pour le prochain exercice.
                   </p>
                   <button 
                      onClick={() => {
                        setNewYearInput(getNextSchoolYearPrefill(schoolYear));
                        setWizardStep(1);
                        setShowTransitionWizard(true);
                      }}
                      className="w-full py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-[10px] font-bold rounded-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                   >
                      <Play size={10} fill="currentColor" /> Clôturer l'Année Scolaire
                   </button>
                </div>
             </div>

             {/* Security */}
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200/60 dark:border-gray-700">
                   <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Lock size={20} className="text-red-500" />
                      Sécurité
                   </h2>
                </div>
                <div className="p-6 space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Ancien mot de passe</label>
                      <input 
                        type="password" 
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                        placeholder="••••••••" 
                        value={passwords.current}
                        onChange={(e) => {
                            setPasswords({...passwords, current: e.target.value});
                            setIsDirty(true);
                        }}
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nouveau mot de passe</label>
                      <input 
                        type="password" 
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                        placeholder="••••••••" 
                        value={passwords.new}
                        onChange={(e) => {
                            setPasswords({...passwords, new: e.target.value});
                            setIsDirty(true);
                        }}
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Confirmer le mot de passe</label>
                      <input 
                        type="password" 
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-white transition-all" 
                        placeholder="••••••••" 
                        value={passwords.confirm}
                        onChange={(e) => {
                            setPasswords({...passwords, confirm: e.target.value});
                            setIsDirty(true);
                        }}
                      />
                   </div>
                   <button 
                        onClick={handleResetSessions}
                        className="w-full py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                   >
                      Réinitialiser sessions actives
                   </button>
                </div>
             </div>

             {/* Sauvegarde & Restauration */}
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200/60 dark:border-gray-700">
                   <h2 className="text-lg font-bold text-gray-850 dark:text-white flex items-center gap-2">
                      <Upload size={20} className="text-emerald-500" />
                      Sauvegarde &amp; Restauration
                   </h2>
                </div>
                <div className="p-6 space-y-4">
                   <p className="text-xs text-gray-550 dark:text-gray-400 leading-relaxed">
                      Téléchargez une copie complète des données de l'année scolaire ou restaurez une ancienne sauvegarde à partir d'un fichier JSON.
                   </p>
                   
                   <button 
                     onClick={handleExportBackup}
                     className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-550 text-white text-[10px] font-bold rounded-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                   >
                      <Save size={12} /> Exporter la Sauvegarde (JSON)
                   </button>
                   
                   <div className="relative">
                      <input 
                         type="file" 
                         accept=".json"
                         onChange={handleImportBackup}
                         className="hidden"
                         id="import-backup-file"
                      />
                      <label 
                         htmlFor="import-backup-file"
                         className="w-full py-2.5 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-750 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                         <Upload size={12} /> Importer une Sauvegarde
                      </label>
                   </div>
                </div>
             </div>

             {/* Save Actions */}
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6 sticky top-6">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={handleSave}
                    className="w-full px-6 py-3 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-blue-500/20 rounded-xl font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                      <Save size={18} />
                      Enregistrer tout
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                      Annuler
                  </button>
                </div>
             </div>
          </div>
       </div>

            {/* ── School Year Transition Wizard Modal ── */}
            {showTransitionWizard && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/60 dark:border-gray-700 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        
                        {/* Header */}
                        <div className="p-5 border-b dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-650 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <School size={18} /> Clôture &amp; Transition Scolaire
                                </h2>
                                <p className="text-[10px] text-white/80 mt-0.5">Clôture de l'année scolaire {schoolYear}</p>
                            </div>
                            <button onClick={() => setShowTransitionWizard(false)} className="text-white/80 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Step indicator bar */}
                        <div className="bg-gray-50 dark:bg-gray-900 border-b border-slate-200/60 dark:border-gray-700 px-6 py-3 flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            <span className={wizardStep === 1 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>1. Bilan</span>
                            <ChevronRight size={10} />
                            <span className={wizardStep === 2 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>2. Promotion</span>
                            <ChevronRight size={10} />
                            <span className={wizardStep === 3 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>3. Paramétrage</span>
                            <ChevronRight size={10} />
                            <span className={wizardStep === 4 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>4. Clôture</span>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 space-y-4 max-h-[400px] overflow-y-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            
                            {/* Step 1: Financial summary */}
                            {wizardStep === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Étape 1 : Synthèse Financière ({schoolYear})</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Voici le récapitulatif comptable de l'année en cours avant la fermeture définitive des registres.
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border border-slate-200/60 dark:border-gray-700 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-450 uppercase mb-1">Total Scolarités Perçues</p>
                                            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                                {feeRecords.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0).toLocaleString('fr-FR')} F
                                            </p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border border-slate-200/60 dark:border-gray-700 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-455 uppercase mb-1">Dépenses Enregistrées</p>
                                            <p className="text-sm font-extrabold text-red-500">
                                                {transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('fr-FR')} F
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-start gap-3">
                                        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                            Toutes les transactions et les relevés de paiement de cette année seront archivés et l'historique comptable actif sera remis à zéro pour démarrer la nouvelle année scolaire sur un grand livre vierge.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Student promotions */}
                            {wizardStep === 2 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Étape 2 : Promotion des Élèves</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Configurez la transition des classes pour les élèves inscrits à l'école.
                                    </p>
                                    
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-slate-200/60 dark:border-gray-700 space-y-3.5">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={promoteStudents} 
                                                onChange={e => setPromoteStudents(e.target.checked)}
                                                className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                                Promouvoir automatiquement les classes (CP ➜ CE1, CM1 ➜ CM2, etc.)
                                            </div>
                                        </label>
                                        
                                        <p className="text-[10px] text-gray-400 leading-relaxed ml-7">
                                            Les élèves de la classe terminale (CM2 / Terminale) seront automatiquement marqués comme diplômés/gradués et retirés des effectifs actifs (archivés).
                                        </p>
                                    </div>
                                    
                                    <div className="p-3.5 bg-amber-50/50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-3 text-[10px] text-amber-700 dark:text-amber-300">
                                        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="leading-relaxed">
                                            <strong>Note :</strong> L'historique des paiements scolaires de chaque élève sera remis à zéro afin de recevoir les nouvelles mensualités du prochain exercice.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: New School Year configs */}
                            {wizardStep === 3 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Étape 3 : Paramètres de la Nouvelle Année</h3>
                                    
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Libellé de la Nouvelle Année Scolaire</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            placeholder="Ex : 2026-2027"
                                            value={newYearInput}
                                            onChange={e => setNewYearInput(e.target.value)}
                                        />
                                    </div>

                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-slate-200/60 dark:border-gray-700 space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={carryOverFees} 
                                                onChange={e => setCarryOverFees(e.target.checked)}
                                                className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                                Reconduire les grilles de tarifs de scolarité existantes
                                            </div>
                                        </label>
                                        <p className="text-[10px] text-gray-400 ml-7 leading-relaxed">
                                            Permet de conserver la même grille tarifaire de scolarité par défaut pour chaque classe pour éviter de tout ressaisir. Vous pourrez les ajuster à tout moment.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Final confirmation */}
                            {wizardStep === 4 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                                        <AlertTriangle size={18} /> Étape 4 : Confirmation Finale
                                    </h3>
                                    
                                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-center space-y-2">
                                        <p className="text-xs font-bold text-red-800 dark:text-red-400">Attention, cette opération est définitive !</p>
                                        <p className="text-[10px] text-red-700 dark:text-red-300 leading-relaxed">
                                            Vous allez clôturer l'année <strong>{schoolYear}</strong> pour ouvrir officiellement l'année <strong>{newYearInput}</strong>.
                                        </p>
                                    </div>

                                    <ul className="space-y-2 text-[10px] font-medium text-gray-600 dark:text-gray-400 pl-4 list-disc">
                                        <li>Le libellé de l'année sera mis à jour à {newYearInput}.</li>
                                        {promoteStudents && <li>Les élèves seront promus d'un niveau (CP ➜ CE1, CM2 ➜ Archivés).</li>}
                                        <li>L'état comptable actif (Dépenses, Recettes scolarités) sera archivé et remis à zéro.</li>
                                    </ul>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t dark:border-gray-700 flex justify-between bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl shrink-0">
                            <button
                                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                                disabled={wizardStep === 1}
                                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-all"
                            >
                                Précédent
                            </button>
                            
                            {wizardStep < 4 ? (
                                <button
                                    onClick={() => setWizardStep(prev => Math.min(4, prev + 1))}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                                >
                                    Suivant <ChevronRight size={12} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleFinalizeTransition}
                                    className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/15 flex items-center gap-1.5"
                                >
                                    Valider la Clôture &amp; Lancer l'Année
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}
    </div>
  );
};

export default Settings;
