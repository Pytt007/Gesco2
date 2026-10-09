import { supabase } from './supabase';
type UploadLogoResult = { publicUrl: string } | { error: string };
/** Small logos are stored in Neon and embedded, with a strict image/size limit. */
export async function uploadLogo(file: File, path = 'logos/school-logo'): Promise<UploadLogoResult> {
  try {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Formats acceptés : PNG, JPEG et WebP.');
    if (file.size > 1024 * 1024) throw new Error('Le logo doit peser moins de 1 Mo.');
    const publicUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
      reader.readAsDataURL(file);
    });
    const { error } = await supabase.from('school_settings').upsert({ id: `asset:${path}`, data: { url: publicUrl } });
    if (error) throw new Error(error.message);
    return { publicUrl };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Enregistrement du logo impossible.' }; }
}
export async function deleteStorageFile(path: string): Promise<void> {
  const { error } = await supabase.from('school_settings').delete().eq('id', `asset:${path}`);
  if (error) throw new Error(error.message);
}
