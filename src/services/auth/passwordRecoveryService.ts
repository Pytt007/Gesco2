import { supabase, usernameToEmail } from '../common/supabaseClient';

export async function requestPasswordRecovery(identifier: string): Promise<void> {
  const value = identifier.trim().toLowerCase();
  if (!value) throw new Error('Saisissez votre identifiant admin ou votre adresse e-mail.');
  if (value !== 'admin' && (!value.includes('@') || value.endsWith('@gesco-v1.local'))) {
    throw new Error('Pour un compte sans adresse e-mail, contactez l’administration.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(usernameToEmail(value), {
    redirectTo: new URL('/reset-password', window.location.origin).href,
  });
  if (error) throw new Error('La demande n’a pas pu être envoyée. Réessayez dans quelques instants.');
}

export async function completePasswordRecovery(token: string, newPassword: string): Promise<void> {
  if (!token) throw new Error('Le lien de récupération est absent ou expiré. Demandez un nouveau lien.');
  if (newPassword.length < 12 || newPassword.length > 128) {
    throw new Error('Le mot de passe doit contenir entre 12 et 128 caractères.');
  }
  const { error } = await supabase.auth.getBetterAuthInstance().resetPassword({ token, newPassword });
  if (error) throw new Error('Le mot de passe n’a pas été modifié. Vérifiez votre connexion ou demandez un nouveau lien.');
}
