export type StockStatus = 'IN_STOCK' | 'ON_DEMAND' | 'OUT_OF_STOCK';

export interface Product {
  id: string;
  name: string;
  mpn: string; // Manufacturer Part Number / Reference (e.g., STM32F103C8T6, NE555)
  category: string;
  priceFcfa: number;
  stock: number;
  status: StockStatus;
  description: string;
  specifications: Record<string, string>;
  datasheetUrl?: string;
  imageUrl: string;
  isPopular?: boolean;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
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
