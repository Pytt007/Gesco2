import { test, expect } from '@playwright/test';

test.describe('GESCO Authentication & Navigation Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Intercepter et simuler l'API Supabase Auth pour le Login
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'mock-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'admin@gesco.local',
            user_metadata: {
              username: 'admin',
              full_name: 'Directeur Général',
              role: 'ADMIN_GENERALE',
              avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin'
            }
          }
        }),
      });
    });

    // Intercepter et simuler les profils Supabase
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-user-id',
            username: 'admin',
            role: 'ADMIN_GENERALE',
            full_name: 'Directeur Général',
            created_at: '2026-07-19T00:00:00Z'
          }
        ]),
      });
    });

    // Intercepter et simuler les paramètres de l'école (school_settings)
    await page.route('**/rest/v1/school_settings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-school-id',
            school_name: 'Mon École',
            director_name: 'Directeur Général',
            logo: '/logo-light.png',
            email: 'admin@gesco-v1.local',
            phone: '+22500000000',
            address: 'Abidjan',
            role_permissions: {}
          }
        ]),
      });
    });

    // Intercepter les requêtes de session au chargement
    await page.route('**/auth/v1/user', async (route) => {
      // Simuler l'absence de session au départ
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unauthorized' }),
      });
    });

    // Ouvrir la page de connexion
    await page.goto('/');
  });

  test('should display login screen and error notifications on invalid submit', async ({ page }) => {
    // Vérifier les éléments de base du login
    await expect(page.locator('h2')).toContainText('Connexion');
    
    // Soumettre le formulaire vide
    await page.click('button[type="submit"]');

    // Vérifier l'apparition de la notification d'erreur (Toast)
    const toast = page.locator('.bg-red-500, .border-red-500, :text("Veuillez remplir")');
    await expect(toast.first()).toBeVisible();
  });

  test('should successfully login and navigate to dashboard with mock auth', async ({ page }) => {
    // Remplir les identifiants de test
    await page.fill('input[placeholder*="admin"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'admin123');

    // Mettre à jour l'intercepteur de session pour simuler un utilisateur connecté au rechargement / polling
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-user-id',
          aud: 'authenticated',
          email: 'admin@gesco.local',
          user_metadata: {
            username: 'admin',
            full_name: 'Directeur Général',
            role: 'ADMIN_GENERALE'
          }
        }),
      });
    });

    // Cliquer sur Connexion
    await page.click('button[type="submit"]');

    // Attendre la redirection / affichage du Dashboard
    const welcomeHeader = page.locator('h1:has-text("Bonjour")');
    await expect(welcomeHeader).toBeVisible({ timeout: 10000 });
    await expect(welcomeHeader).toContainText('Directeur Général');

    // Vérifier la présence des cartes métriques sur le Dashboard
    await expect(page.locator('text="Élèves actifs"')).toBeVisible();
    await expect(page.locator('text="Taux de Recouvrement"')).toBeVisible();

    // Helper pour naviguer gérant le menu mobile
    const navigateTo = async (menuLabel: string) => {
      const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
      if (isMobile) {
        await page.click('svg.lucide-menu, button:has(svg.lucide-menu)');
        await expect(page.locator('aside')).toBeVisible();
      }
      await page.click(`button:has-text("${menuLabel}")`);
    };

    // Cliquer sur le lien "Élèves" de la Sidebar et vérifier la transition de page
    await navigateTo('Élèves');
    await expect(page.locator('h1:has-text("Gestion des Élèves")')).toBeVisible();

    // Cliquer sur le lien "Trésorerie" ou "Dépenses" et vérifier l'affichage des cartes financières
    await navigateTo('Dépenses');
    await expect(page.locator('h2:has-text("Aperçu de la Trésorerie")')).toBeVisible();
    await expect(page.locator('p:has-text("Compte Courant")')).toBeVisible();

    // Se déconnecter
    await navigateTo('Déconnexion');
    await page.click('.fixed button:has-text("Déconnexion")');
    await expect(page.locator('h2')).toContainText('Connexion');
  });

  test('should support mobile responsive views', async ({ page }) => {
    // Redimensionner à un écran de téléphone (simulateur)
    await page.setViewportSize({ width: 375, height: 812 });

    // Remplir les identifiants
    await page.fill('input[placeholder*="admin"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'admin123');

    // Mock session active
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-user-id',
          user_metadata: { username: 'admin', full_name: 'Directeur Général', role: 'ADMIN_GENERALE' }
        }),
      });
    });

    await page.click('button[type="submit"]');

    // Vérifier que le menu mobile se comporte correctement
    const welcomeHeader = page.locator('h1:has-text("Bonjour")');
    await expect(welcomeHeader).toBeVisible();

    // Sur mobile, la sidebar doit être masquée ou repliée
    const sidebar = page.locator('aside');
    if (await sidebar.isVisible()) {
      // Si visible, elle doit être repliée (vérifier la classe ou attribut de repli)
      await expect(sidebar).toHaveClass(/translate-x-full|-translate-x-full/);
    }
  });
});
