// ─────────────────────────────────────────────────────────────────────────────
// GESCO — PermissionsManager / PermissionTree.tsx
// Colonne de droite : arbre repliable de permissions granulaires par module et action
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Search, CheckSquare, Square, Shield,
  Check, AlertTriangle, Filter, Eye, Lock
} from 'lucide-react';
import { MODULES_META } from '../../../constants/rbac';
import type { RoleDefinition, ModuleId } from '../../../types/permissions';

interface PermissionTreeProps {
  role: RoleDefinition;
  onToggleModule: (moduleId: ModuleId) => void;
  onToggleAction: (moduleId: ModuleId, action: string) => void;
  onSetAllActions: (moduleId: ModuleId, value: boolean) => void;
  isAdmin: boolean;
}

export default function PermissionTree({
  role,
  onToggleModule,
  onToggleAction,
  onSetAllActions,
  isAdmin,
}: PermissionTreeProps) {
  const [search, setSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const toggleCollapse = (modId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Filtrer les modules et actions selon la recherche
  const filteredModules = MODULES_META.filter((mod) => {
    if (!search.trim()) return true;
    const matchMod = mod.label.toLowerCase().includes(search.toLowerCase());
    const matchAct = mod.actions.some((a) => a.label.toLowerCase().includes(search.toLowerCase()));
    return matchMod || matchAct;
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden' }}>

      {/* En-tête du rôle sélectionné */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: `1px solid ${role.color}30`,
          background: `linear-gradient(135deg, ${role.color}08, ${role.color}15)`,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>{role.emoji}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{role.label}</h3>
                <span className="badge" style={{ background: role.color, color: '#ffffff', borderRadius: 12, padding: '3px 10px', fontSize: '0.725rem', fontWeight: 700 }}>
                  {role.isSystem ? 'Système' : 'Personnalisé'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>{role.description}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Barre de recherche d'actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <Search size={15} color="#64748b" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer les permissions..."
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8125rem', width: 180, color: '#0f172a' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Arbre des modules */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
        {filteredModules.map((mod) => {
          const modId = mod.id as ModuleId;
          const perm = role.permissions?.[modId] || { enabled: false, actions: {} };
          const isCollapsed = Boolean(collapsedModules[modId]);

          // Compter les actions actives
          const activeActionsCount = mod.actions.filter((a) => perm.actions?.[a.id]).length;
          const totalActionsCount = mod.actions.length;
          const isAllActive = activeActionsCount === totalActionsCount;
          const isSomeActive = activeActionsCount > 0 && !isAllActive;

          return (
            <div
              key={mod.id}
              className="card shadow-sm"
              style={{
                borderRadius: 14,
                border: perm.enabled ? `1px solid ${mod.color}40` : '1px solid #e2e8f0',
                overflow: 'hidden',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Header du module (accordéon) */}
              <div
                style={{
                  padding: '12px 16px',
                  background: perm.enabled ? `${mod.color}0a` : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderBottom: !isCollapsed ? '1px solid #f1f5f9' : 'none',
                }}
                onClick={() => toggleCollapse(modId)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm p-0"
                    style={{ color: '#64748b' }}
                  >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <span style={{ fontSize: '1.25rem' }}>{mod.emoji}</span>
                  <div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: perm.enabled ? '#0f172a' : '#64748b' }}>
                      {mod.label}
                    </span>
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 700, color: activeActionsCount > 0 ? mod.color : '#94a3b8' }}>
                      ({activeActionsCount}/{totalActionsCount} actions)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
                  {/* Toggle tout sélectionner / tout désélectionner */}
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onSetAllActions(modId, !isAllActive)}
                      style={{ fontSize: '0.75rem', fontWeight: 700, color: mod.color, padding: '3px 8px', borderRadius: 6 }}
                    >
                      {isAllActive ? 'Tout décocher' : 'Tout cocher'}
                    </button>
                  )}

                  {/* Toggle Accès Module principal */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      cursor: isAdmin ? 'pointer' : 'default',
                      color: perm.enabled ? mod.color : '#64748b',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={perm.enabled}
                      onChange={() => isAdmin && onToggleModule(modId)}
                      disabled={!isAdmin}
                      style={{ accentColor: mod.color, width: 16, height: 16 }}
                    />
                    Accès Module
                  </label>
                </div>
              </div>

              {/* Corps du module (liste des actions) */}
              {!isCollapsed && (
                <div style={{ padding: '14px 18px', background: '#ffffff' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {mod.actions.map((act) => {
                      const isChecked = Boolean(perm.actions?.[act.id]);
                      return (
                        <label
                          key={act.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: isChecked ? `1px solid ${mod.color}30` : '1px solid #f1f5f9',
                            background: isChecked ? `${mod.color}08` : '#fafafa',
                            cursor: isAdmin ? 'pointer' : 'default',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => isAdmin && onToggleAction(modId, act.id)}
                            disabled={!isAdmin}
                            style={{ accentColor: mod.color, width: 15, height: 15 }}
                          />
                          <span style={{ fontSize: '0.8125rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#0f172a' : '#64748b' }}>
                            {act.label}
                          </span>
                          {act.dangerous && (
                            <span style={{ fontSize: '0.625rem', color: '#dc2626', fontWeight: 800, marginLeft: 'auto' }}>
                              ⚠️
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Badges de restrictions le cas échéant */}
                  {perm.restrictions && Object.keys(perm.restrictions).length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: '#64748b' }}>Restrictions actives :</span>
                      {perm.restrictions.ownClassOnly && (
                        <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>🔒 Uniquement ses classes</span>
                      )}
                      {perm.restrictions.ownSubjectOnly && (
                        <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>🔒 Uniquement ses matières</span>
                      )}
                      {perm.restrictions.readOnly && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>👁️ Lecture seule</span>
                      )}
                      {perm.restrictions.noTariffEdit && (
                        <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>🚫 Modification tarifs interdite</span>
                      )}
                      {perm.restrictions.noPaymentDelete && (
                        <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>🚫 Suppression paiements interdite</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
