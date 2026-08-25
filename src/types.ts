export type StockStatus = 'IN_STOCK' | 'ON_DEMAND' | 'OUT_OF_STOCK';

export interface Product {
  id: string;
  name: string;
  mpn: string; // Manufacturer Part Number / Reference (e.g., STM32F103C8T6, NE555)
  category: string;
  priceFcfa: number;
  discountPercent?: number; // 0-100, promotion optionnelle définie par l'admin
  stock: number;
  status: StockStatus;
  description: string;
  specifications: Record<string, string>;
  datasheetUrl?: string;
  images: string[]; // 1 à 6+ photos (pleine résolution, pour la fiche produit)
  thumbnails?: string[]; // versions légères des mêmes photos, pour les grilles/cartes
  videoUrl?: string; // Vidéo de présentation optionnelle (lien direct ou YouTube/Vimeo)
  isPopular?: boolean;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'new' | 'contacted' | 'confirmed' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  mpn: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  totalFcfa: number;
  subtotalFcfa?: number;
  deliveryFee?: number;
  customerName: string;
  phone: string;
  email?: string;
  city: string;
  neighborhood: string;
  deliveryMethod: string;
  notes: string;
  latitude?: number;
  longitude?: number;
  addressText?: string;
  paymentMethod?: 'cash' | 'orange_money' | 'moov_money';
  paymentReference?: string;
  status: OrderStatus;
  createdAt: string;
}

export interface PastOrder {
  id: string;
  date: string;
  totalFcfa: number;
  customerName?: string;
  phone?: string;
  city?: string;
  neighborhood?: string;
  items: CartItem[];
}

export type OperationStatus = 'open' | 'funded' | 'in_progress' | 'closed' | 'cancelled';

/**
 * Une opération d'importation financée par des participants.
 * TODO(backend): ce type doit correspondre à la table `operations` en base
 * une fois le schéma financement participatif créé (voir plan d'étapes).
 * Tant que ce backend n'existe pas, les opérations créées ici sont stockées
 * localement (brouillon admin) et ne représentent pas des fonds réellement engagés.
 */
export interface Operation {
  id: string;
  reference: string; // ex: OP-2026-A4X
  title: string;
  description?: string;
  targetAmountFcfa: number;
  collectedAmountFcfa: number; // TODO(backend): doit provenir de la somme des participations réelles
  status: OperationStatus;
  startDate: string;
  endDate?: string;
  participantsCount: number; // TODO(backend): doit provenir du compte réel des participations
  createdAt: string;
}

export type ImportOrderStatus = 'draft' | 'ordered' | 'in_transit' | 'customs' | 'received' | 'cancelled';

/**
 * Une commande d'importation auprès d'un fournisseur, rattachée (optionnellement) à une opération.
 * TODO(backend): table `import_orders` + `import_costs`, avec réception qui vient incrémenter
 * le stock produit réel (table `products`) une fois validée côté serveur.
 */
export interface ImportOrder {
  id: string;
  reference: string; // ex: IMP-2026-A4X
  operationId?: string; // lien optionnel vers une Operation
  supplierName: string;
  productDescription: string;
  quantity: number;
  purchasePriceFcfa: number; // prix d'achat total
  transportFeeFcfa: number;
  customsFeeFcfa: number;
  taxFeeFcfa: number;
  otherFeesFcfa: number;
  status: ImportOrderStatus;
  orderDate: string;
  expectedReceptionDate?: string;
  receivedDate?: string;
  createdAt: string;
}

export type WithdrawalStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';

/**
 * TODO(backend): table `withdrawals`, liée à un compte participant réel (table `participants`)
 * et à un `wallet` avec solde vérifié côté serveur avant toute approbation.
 * Le frontend ne doit JAMAIS décider qu'un retrait est valide — uniquement afficher
 * l'état renvoyé par le backend et déclencher les actions (approuver/refuser), qui sont
 * elles-mêmes revalidées côté serveur.
 */
export interface WithdrawalRequest {
  id: string;
  participantName: string;
  amountFcfa: number;
  method: string; // ex: "Mobile Money", "Virement bancaire"
  requestedAt: string;
  status: WithdrawalStatus;
}

export interface CustomSourcingRequest {
  id: string;
  customerName: string;
  phoneWhatsApp: string;
  componentNameOrMpn: string;
  quantityNeeded: number;
  estimatedBudgetFcfa?: number;
  descriptionOrLink?: string;
  imageUrl?: string;
  status: 'PENDING' | 'QUOTED' | 'ORDERED' | 'FULFILLED';
  createdAt: string;
}
