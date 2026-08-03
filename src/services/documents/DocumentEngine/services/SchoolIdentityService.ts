// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: School Identity Service
// Service unique fournissant l'identité dynamique de l'établissement sans aucun hardcoding
// ─────────────────────────────────────────────────────────────────────────────

import { fetchSchoolInfo, fetchSchoolYearsList } from '../../../settings/settingsService';

export interface SchoolIdentityData {
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  website?: string;
  motto?: string;
  currency: string;
  themePrimaryColor?: string;
  themeAccentColor?: string;
  principalName?: string;
  stampUrl?: string;
  signatureUrl?: string;
  currentSchoolYear: string;
}

const DEFAULT_IDENTITY: SchoolIdentityData = {
  name: 'ÉTABLISSEMENT EXCELLENCE GESCO',
  logoUrl: undefined,
  address: 'Avenue de l\'Éducation, Quartier Résidentiel',
  phone: '+225 07 00 00 00 00',
  email: 'contact@gesco-ecole.ci',
  city: 'Abidjan',
  country: 'Côte d\'Ivoire',
  website: 'www.gesco.ci',
  motto: 'Discipline — Excellence — Succès',
  currency: 'FCFA',
  themePrimaryColor: '#132644',
  themeAccentColor: '#f59e0b',
  principalName: 'M. le Directeur Général',
  stampUrl: undefined,
  signatureUrl: undefined,
  currentSchoolYear: '2026-2027',
};

class SchoolIdentityService {
  private cachedIdentity: SchoolIdentityData | null = null;

  /**
   * Récupère dynamiquement l'identité de l'établissement depuis les Paramètres
   */
  async getSchoolIdentity(): Promise<SchoolIdentityData> {
    try {
      const schoolInfo = await fetchSchoolInfo();
      const schoolYears = await fetchSchoolYearsList();

      const activeYear = schoolYears.find((y) => y.isActive)?.label || '2026-2027';

      this.cachedIdentity = {
        name: schoolInfo.name || DEFAULT_IDENTITY.name,
        logoUrl: schoolInfo.logoUrl,
        address: schoolInfo.address || DEFAULT_IDENTITY.address,
        phone: schoolInfo.phone || DEFAULT_IDENTITY.phone,
        email: schoolInfo.email || DEFAULT_IDENTITY.email,
        city: schoolInfo.city || DEFAULT_IDENTITY.city,
        country: schoolInfo.country || DEFAULT_IDENTITY.country,
        website: (schoolInfo as any).website || DEFAULT_IDENTITY.website,
        motto: (schoolInfo as any).motto || DEFAULT_IDENTITY.motto,
        currency: schoolInfo.currency || DEFAULT_IDENTITY.currency,
        themePrimaryColor: (schoolInfo as any).themePrimaryColor || DEFAULT_IDENTITY.themePrimaryColor,
        themeAccentColor: (schoolInfo as any).themeAccentColor || DEFAULT_IDENTITY.themeAccentColor,
        principalName: (schoolInfo as any).principalName || DEFAULT_IDENTITY.principalName,
        stampUrl: (schoolInfo as any).stampUrl,
        signatureUrl: (schoolInfo as any).signatureUrl,
        currentSchoolYear: activeYear,
      };

      return this.cachedIdentity;
    } catch {
      return DEFAULT_IDENTITY;
    }
  }

  /**
   * Récupère l'identité depuis le cache ou synchrone par défaut
   */
  getSchoolIdentitySync(): SchoolIdentityData {
    return this.cachedIdentity || DEFAULT_IDENTITY;
  }
}

export const schoolIdentityService = new SchoolIdentityService();
