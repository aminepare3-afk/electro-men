/**
 * Partage du contenu via l'API native (Web Share) si disponible,
 * sinon copie le lien dans le presse-papiers.
 * Retourne 'shared', 'copied', ou 'failed'.
 */
export async function shareContent(title: string, text: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({ title, text, url });
      return 'shared';
    } catch (e) {
      // Utilisateur a annulé ou erreur — on n'affiche rien de plus
      return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (e) {
    return 'failed';
  }
}
