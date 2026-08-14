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
