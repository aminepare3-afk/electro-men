import { Product } from '../types';

// Default empty catalogue as requested by user ("supp tout les produits qui sont la actu j'ai encore rien mis")
export const INITIAL_PRODUCTS: Product[] = [];

export const CATEGORIES = [
  'Toutes les catégories',
  'Microcontrôleurs & Cartes',
  'Capteurs & Modules',
  'Circuits Intégrés (IC)',
  'Transistors & Diodes',
  'Passifs (Résistances/Condensateurs)',
  'Alimentation & Régulateurs',
  'Relais & Interrupteurs',
  'Connecteurs & Affichage'
];

export const DEMO_SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-stm32-01',
    name: 'Carte Microcontrôleur STM32F103C8T6 ARM Cortex-M3 (Blue Pill)',
    mpn: 'STM32F103C8T6',
    category: 'Microcontrôleurs & Cartes',
    priceFcfa: 2500,
    stock: 25,
    status: 'IN_STOCK',
    description: 'Carte de développement 32-bit haute performance ARM Cortex-M3 72MHz, 64KB Flash, 20KB SRAM avec port Micro-USB.',
    specifications: {
      'Cœur': 'ARM 32-bit Cortex-M3',
      'Fréquence': '72 MHz',
      'Mémoire Flash': '64 KB',
      'SRAM': '20 KB',
      'Tension': '2.0V - 3.6V',
      'Interfaces': '2x SPI, 2x I2C, 3x USART, USB, CAN'
    },
    datasheetUrl: 'https://www.st.com/resource/en/datasheet/stm32f103c8.pdf',
    images: ['https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80'],
    isPopular: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-esp32-02',
    name: 'Module NodeMCU ESP32 Wi-Fi + Bluetooth CP2102',
    mpn: 'ESP32-WROOM-32D',
    category: 'Microcontrôleurs & Cartes',
    priceFcfa: 4500,
    stock: 40,
    status: 'IN_STOCK',
    description: 'Système sur puce double cœur 240MHz avec Wi-Fi 802.11 b/g/n et Bluetooth V4.2 BR/EDR et BLE intégrés.',
    specifications: {
      'Cœur': 'Xtensa Dual-Core 32-bit LX6',
      'Horloge': '240 MHz',
      'Wi-Fi': '802.11 b/g/n (802.11n up to 150 Mbps)',
      'Bluetooth': 'v4.2 BR/EDR and BLE',
      'Flash': '4MB'
    },
    datasheetUrl: 'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32d_esp32-wroom-32u_datasheet_en.pdf',
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'],
    isPopular: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-ne555-03',
    name: 'Circuit Intégré Timer Precision NE555P DIP-8',
    mpn: 'NE555P',
    category: 'Circuits Intégrés (IC)',
    priceFcfa: 250,
    stock: 150,
    status: 'IN_STOCK',
    description: 'Timer haute précision pour temporisation et oscillateur monostable ou astable. Format DIP-8 standard.',
    specifications: {
      'Boîtier': 'DIP-8',
      'Tension Alimentation': '4.5V à 16V',
      'Courant Sortie': '200 mA',
      'Plage Température': '0°C à 70°C'
    },
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/ne555.pdf',
    images: ['https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80'],
    isPopular: false,
    createdAt: new Date().toISOString()
  }
];
