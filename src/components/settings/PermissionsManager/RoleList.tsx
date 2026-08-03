// ─────────────────────────────────────────────────────────────────────────────
// GESCO — PermissionsManager / RoleList.tsx
// Colonne de gauche : liste des rôles, sélection, actions CRUD (Créer, Dupliquer, Renommer, Supprimer, Export, Import)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Shield, Plus, Copy, Edit2, Trash2, Download, Upload, RotateCcw,
  Check, X, FileSpreadsheet, FileCode
} from 'lucide-react';
import type { RoleDefinition } from '../../../types/permissions';

interface RoleListProps {
  roles: RoleDefinition[];
  selectedRoleId: string;
  onSelectRole: (id: string) => void;
  onAddRole: (role: Omit<RoleDefinition, 'isSystem'>) => void;
  onDuplicateRole: (roleId: string, newLabel: string) => void;
  onRenameRole: (roleId: string, newLabel: string) => void;
  onDeleteRole: (roleId: string) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (jsonStr: string) => { error?: string };
  onReset: () => void;
  isAdmin: boolean;
}

export default function RoleList({
  roles,
  selectedRoleId,
  onSelectRole,
  onAddRole,
  onDuplicateRole,
  onRenameRole,
  onDeleteRole,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  onReset,
  isAdmin,
}: RoleListProps) {
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const [newRoleForm, setNewRoleForm] = useState({
    id: '',
    label: '',
    emoji: '👤',
    description: '',
    color: '#6366f1',
  });

  const [dupLabel, setDupLabel] = useState('');
  const [renameLabel, setRenameLabel] = useState('');

  // Import Ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenDuplicate = (role: RoleDefinition) => {
    setDupLabel(`${role.label} (Copie)`);
    setShowDuplicateModal(true);
  };

  const handleOpenRename = (role: RoleDefinition) => {
    setRenameLabel(role.label);
    setShowRenameModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportJSON(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '320px', flexShrink: 0 }}>
      {/* Entête Liste Rôles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} className="text-primary" /> Rôles Utilisateurs
        </h4>
        {isAdmin && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setNewRoleForm({
                id: `CUSTOM_${Date.now()}`,
                label: '',
                emoji: '👤',
                description: '',
                color: '#6366f1',
              });
              setShowCreateModal(true);
            }}
            style={{ borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={14} /> Nouveau
          </button>
        )}
      </div>

      {/* Liste des rôles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        {roles.map((role) => {
          const isSelected = role.id === selectedRoleId;
          return (
            <div
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: isSelected ? `2px solid ${role.color}` : '1px solid #e2e8f0',
                background: isSelected ? `${role.color}0d` : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <span style={{ fontSize: '1.25rem' }}>{role.emoji}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: isSelected ? role.color : '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {role.label}
                  </div>
                  <div style={{ fontSize: '0.71875rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {role.isSystem ? 'Rôle Système' : 'Rôle Personnalisé'}
                  </div>
                </div>
              </div>

              {isSelected && isAdmin && (
                <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-sm p-1"
                    title="Dupliquer"
                    onClick={() => handleOpenDuplicate(role)}
                    style={{ color: '#64748b' }}
                  >
                    <Copy size={13} />
                  </button>
                  {!role.isSystem && (
                    <>
                      <button
                        className="btn btn-ghost btn-sm p-1"
                        title="Renommer"
                        onClick={() => handleOpenRename(role)}
                        style={{ color: '#64748b' }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm p-1"
                        title="Supprimer"
                        onClick={() => onDeleteRole(role.id)}
                        style={{ color: '#dc2626' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions de Bas de Colonne : Import/Export & Réinitialiser */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onExportJSON}
            style={{ flex: 1, borderRadius: 8, fontSize: '0.75rem', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            title="Exporter la matrice en JSON"
          >
            <FileCode size={13} /> JSON
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onExportCSV}
            style={{ flex: 1, borderRadius: 8, fontSize: '0.75rem', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            title="Exporter la matrice en CSV"
          >
            <FileSpreadsheet size={13} /> CSV
          </button>
          {isAdmin && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => fileInputRef.current?.click()}
              style={{ flex: 1, borderRadius: 8, fontSize: '0.75rem', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              title="Importer un fichier JSON"
            >
              <Upload size={13} /> Importer
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </div>

        {isAdmin && (
          <button
            className="btn btn-sm btn-ghost text-muted"
            onClick={onReset}
            style={{ borderRadius: 8, fontSize: '0.75rem', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <RotateCcw size={13} /> Réinitialiser par défaut
          </button>
        )}
      </div>

      {/* Modal Nouveau Rôle */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: 400, borderRadius: 16 }}>
            <div className="modal-header">
              <h3>Créer un Rôle Personnalisé</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newRoleForm.label.trim()) return;
              onAddRole({
                ...newRoleForm,
                permissions: selectedRole ? JSON.parse(JSON.stringify(selectedRole.permissions)) : ({} as any),
              });
              setShowCreateModal(false);
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nom du rôle *</label>
                  <input
                    className="form-input"
                    value={newRoleForm.label}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, label: e.target.value })}
                    placeholder="ex: Assistant Comptable"
                    required
                  />
                </div>
                {/* Sélecteur d'Emoji & Couleur Design System */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Emoji selector */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>
                      Icône / Emoji
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['👤', '👨‍💼', '👩‍💼', '💰', '👨‍🏫', '🍽️', '🚌', '⚙️', '🎓', '🏫', '🛡️', '📊'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewRoleForm({ ...newRoleForm, emoji })}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: newRoleForm.emoji === emoji ? '2px solid #6366f1' : '1px solid #e2e8f0',
                            background: newRoleForm.emoji === emoji ? '#ede9fe' : '#f8fafc',
                            fontSize: '1.125rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Palette de Couleurs */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>
                      Couleur du Rôle
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      {[
                        { hex: '#6366f1', name: 'Indigo' },
                        { hex: '#0284c7', name: 'Bleu' },
                        { hex: '#16a34a', name: 'Vert' },
                        { hex: '#f59e0b', name: 'Ambre' },
                        { hex: '#ea580c', name: 'Orange' },
                        { hex: '#dc2626', name: 'Rouge' },
                        { hex: '#7c3aed', name: 'Violet' },
                        { hex: '#0f172a', name: 'Ardoise' },
                      ].map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setNewRoleForm({ ...newRoleForm, color: color.hex })}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            background: color.hex,
                            border: newRoleForm.color === color.hex ? '3px solid #ffffff' : 'none',
                            outline: newRoleForm.color === color.hex ? `2px solid ${color.hex}` : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            transition: 'transform 0.15s ease',
                          }}
                          title={color.name}
                        >
                          {newRoleForm.color === color.hex && '✓'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    className="form-input"
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                    placeholder="Rôle et responsabilités..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer le rôle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dupliquer Rôle */}
      {showDuplicateModal && selectedRole && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDuplicateModal(false)}>
          <div className="modal" style={{ maxWidth: 380, borderRadius: 16 }}>
            <div className="modal-header">
              <h3>Dupliquer le Rôle</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDuplicateModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!dupLabel.trim()) return;
              onDuplicateRole(selectedRole.id, dupLabel);
              setShowDuplicateModal(false);
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                  Créer un nouveau rôle avec les mêmes permissions que <strong>{selectedRole.label}</strong>.
                </p>
                <div className="form-group">
                  <label className="form-label">Nouveau Nom *</label>
                  <input
                    className="form-input"
                    value={dupLabel}
                    onChange={(e) => setDupLabel(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDuplicateModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Dupliquer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Renommer Rôle */}
      {showRenameModal && selectedRole && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRenameModal(false)}>
          <div className="modal" style={{ maxWidth: 380, borderRadius: 16 }}>
            <div className="modal-header">
              <h3>Renommer le Rôle</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRenameModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!renameLabel.trim()) return;
              onRenameRole(selectedRole.id, renameLabel);
              setShowRenameModal(false);
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Libellé du Rôle *</label>
                  <input
                    className="form-input"
                    value={renameLabel}
                    onChange={(e) => setRenameLabel(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRenameModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
