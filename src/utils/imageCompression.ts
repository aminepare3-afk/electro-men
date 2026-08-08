/**
 * Redimensionne et compresse une image côté navigateur avant envoi,
 * pour éviter de stocker/transférer des photos de plusieurs Mo.
 * Retourne une data URL JPEG compressée.
 */
export function compressImage(file: File, maxWidth = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string); // repli : image non compressée
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Génère à la fois une image "pleine résolution" (pour la fiche produit)
 * et une miniature très légère (pour les grilles/cartes/carrousel),
 * afin que la page catalogue ne télécharge jamais plus que nécessaire.
 */
export async function compressImageWithThumbnail(
  file: File
): Promise<{ full: string; thumbnail: string }> {
  const [full, thumbnail] = await Promise.all([
    compressImage(file, 1000, 0.75),
    compressImage(file, 320, 0.6),
  ]);
  return { full, thumbnail };
}
