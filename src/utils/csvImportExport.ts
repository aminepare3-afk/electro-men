import { Product, StockStatus } from '../types';

// ---- Colonnes du fichier (français, compatible Excel/Sheets/LibreOffice) ----
const HEADERS = [
  'ID',
  'Nom',
  'MPN',
  'Categorie',
  'Prix FCFA',
  'Reduction %',
  'Stock',
  'Statut',
  'Description',
  'Fiche Technique URL',
  'Photos (separees par ;)',
  'Video URL',
  'Vedette (Oui/Non)',
] as const;

const STATUS_TO_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'En Stock',
  ON_DEMAND: 'Sur Commande',
  OUT_OF_STOCK: 'Epuise',
};

const LABEL_TO_STATUS: Record<string, StockStatus> = {
  'en stock': 'IN_STOCK',
  'in_stock': 'IN_STOCK',
  'stock': 'IN_STOCK',
  'sur commande': 'ON_DEMAND',
  'on_demand': 'ON_DEMAND',
  'epuise': 'OUT_OF_STOCK',
  'épuisé': 'OUT_OF_STOCK',
  'out_of_stock': 'OUT_OF_STOCK',
};

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Génère et déclenche le téléchargement du catalogue actuel au format CSV. */
export function exportProductsToCsv(products: Product[]) {
  const rows = [HEADERS.join(',')];

  for (const p of products) {
    const row = [
      p.id,
      p.name,
      p.mpn,
      p.category,
      String(p.priceFcfa),
      p.discountPercent ? String(p.discountPercent) : '',
      String(p.stock),
      STATUS_TO_LABEL[p.status] || 'En Stock',
      p.description || '',
      p.datasheetUrl || '',
      (p.images || []).join(';'),
      p.videoUrl || '',
      p.isPopular ? 'Oui' : 'Non',
    ].map((v) => csvEscape(String(v ?? '')));
    rows.push(row.join(','));
  }

  const csvContent = '\uFEFF' + rows.join('\r\n'); // BOM pour un bon affichage des accents dans Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `electro-men-catalogue-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Parse une ligne CSV en tenant compte des guillemets/virgules échappées. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

export interface ParsedImportResult {
  validProducts: Product[];
  errors: string[]; // messages d'erreur par ligne invalide
  updatedCount: number; // lignes avec un ID existant (mise à jour)
  createdCount: number; // lignes sans ID (nouveau produit)
}

/** Lit un fichier CSV (texte) et retourne les produits valides + les erreurs de validation. */
export function parseProductsCsv(fileText: string): ParsedImportResult {
  // Retire le BOM éventuel et gère les fins de ligne Windows/Mac/Unix
  const cleanText = fileText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { validProducts: [], errors: ['Le fichier est vide.'], updatedCount: 0, createdCount: 0 };
  }

  const headerCells = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  const colIndex = (needle: string) => headerCells.findIndex((h) => h.includes(needle));
  const idx = {
    id: colIndex('id'),
    name: colIndex('nom'),
    mpn: colIndex('mpn'),
    category: colIndex('categ'),
    price: colIndex('prix'),
    discount: colIndex('reduction') !== -1 ? colIndex('reduction') : colIndex('réduction'),
    stock: colIndex('stock'),
    status: colIndex('statut'),
    description: colIndex('description'),
    datasheet: colIndex('fiche'),
    images: colIndex('photo'),
    video: colIndex('video') !== -1 ? colIndex('video') : colIndex('vidéo'),
    popular: colIndex('vedette'),
  };

  if (idx.name === -1 || idx.mpn === -1 || idx.price === -1) {
    return {
      validProducts: [],
      errors: [
        'Colonnes obligatoires manquantes. Le fichier doit contenir au minimum : Nom, MPN, Prix FCFA. Utilisez le bouton "Télécharger un modèle" pour le format exact.',
      ],
      updatedCount: 0,
      createdCount: 0,
    };
  }

  const validProducts: Product[] = [];
  const errors: string[] = [];
  let updatedCount = 0;
  let createdCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const get = (index: number) => (index >= 0 && index < cells.length ? cells[index].trim() : '');

    const name = get(idx.name);
    const mpn = get(idx.mpn);
    const priceRaw = get(idx.price);

    if (!name || !mpn || !priceRaw) {
      errors.push(`Ligne ${i + 1} : ignorée (Nom, MPN ou Prix manquant).`);
      continue;
    }

    const priceFcfa = parseInt(priceRaw.replace(/[^\d]/g, ''), 10);
    if (isNaN(priceFcfa) || priceFcfa < 0) {
      errors.push(`Ligne ${i + 1} : prix invalide ("${priceRaw}").`);
      continue;
    }

    const existingId = get(idx.id);
    const id = existingId || `prod-import-${Date.now()}-${i}`;
    if (existingId) updatedCount++;
    else createdCount++;

    const discountRaw = get(idx.discount).replace(/[^\d]/g, '');
    const discountPercent = discountRaw ? Math.min(parseInt(discountRaw, 10), 95) : undefined;

    const stockRaw = get(idx.stock).replace(/[^\d]/g, '');
    const stock = stockRaw ? parseInt(stockRaw, 10) : 0;

    const statusLabel = get(idx.status).toLowerCase();
    const status: StockStatus = LABEL_TO_STATUS[statusLabel] || 'IN_STOCK';

    const imagesRaw = get(idx.images);
    const images = imagesRaw
      ? imagesRaw.split(';').map((s) => s.trim()).filter(Boolean)
      : ['https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80'];

    const popularRaw = get(idx.popular).toLowerCase();
    const isPopular = popularRaw === 'oui' || popularRaw === 'yes' || popularRaw === 'true' || popularRaw === '1';

    validProducts.push({
      id,
      name,
      mpn: mpn.toUpperCase(),
      category: get(idx.category) || 'Circuits Intégrés (IC)',
      priceFcfa,
      discountPercent,
      stock,
      status,
      description: get(idx.description),
      specifications: {},
      datasheetUrl: get(idx.datasheet) || undefined,
      images,
      videoUrl: get(idx.video) || undefined,
      isPopular,
      createdAt: new Date().toISOString(),
    });
  }

  return { validProducts, errors, updatedCount, createdCount };
}

/** Télécharge un fichier CSV modèle vide (avec un exemple) pour guider le remplissage. */
export function downloadCsvTemplate() {
  const example = [
    'exemple-001',
    'Circuit Timer Precision',
    'NE555P',
    'Circuits Intégrés (IC)',
    '250',
    '10',
    '150',
    'En Stock',
    'Timer haute précision pour temporisation.',
    'https://exemple.com/datasheet.pdf',
    'https://exemple.com/photo1.jpg;https://exemple.com/photo2.jpg',
    '',
    'Non',
  ].map((v) => csvEscape(v));

  const csvContent = '\uFEFF' + [HEADERS.join(','), example.join(',')].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modele-import-electro-men.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
