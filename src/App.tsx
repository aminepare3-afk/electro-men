import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Hero3D } from './components/Hero3D';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SourcingModal } from './components/SourcingModal';
import { CartDrawer } from './components/CartDrawer';
import { CompareModal } from './components/CompareModal';
import { CompareFloatingBar } from './components/CompareFloatingBar';
import { AdminPanel } from './components/AdminPanel';
import { Product, CartItem } from './types';
import { INITIAL_PRODUCTS, CATEGORIES, DEMO_SAMPLE_PRODUCTS } from './data/initialData';
import { Logo } from './components/Logo';
import { InstallPwaButton } from './components/InstallPwaButton';
import { Send, Phone, MapPin, Globe, ShieldCheck, Zap, Cpu, Sparkles, Plus, ArrowLeft } from 'lucide-react';

export default function App() {
  // LocalStorage Persistence for Products
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('ELECTRO_MEN_PRODUCTS');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erreur lecture localStorage products:', e);
    }
    return INITIAL_PRODUCTS; // Default empty array as requested
  });

  // LocalStorage Persistence for Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ELECTRO_MEN_CART');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erreur lecture localStorage cart:', e);
    }
    return [];
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);

  // Modal / Drawer States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSourcingOpen, setIsSourcingOpen] = useState(false);
  const [sourcingMpnInfo, setSourcingMpnInfo] = useState<{ mpn: string; name: string; category: string; priceEst?: number } | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Comparison State
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const handleToggleCompare = (product: Product) => {
    setCompareProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 2) {
        // Replace second item if already 2 selected
        return [prev[0], product];
      }
      return [...prev, product];
    });
  };

  const handleRemoveFromCompare = (productId: string) => {
    setCompareProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleClearCompare = () => {
    setCompareProducts([]);
    setIsCompareModalOpen(false);
  };

  const handleSelectProductForSlot = (slotIndex: number, newProduct: Product) => {
    setCompareProducts((prev) => {
      const next = [...prev];
      next[slotIndex] = newProduct;
      return next;
    });
  };

  // Detect exact /admin path or #admin hash on mount and route changes
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || hash === '#admin' || hash === '#/admin') {
        setIsAdminOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    checkAdminRoute();

    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);

    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, []);

  // Sync Products to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('ELECTRO_MEN_PRODUCTS', JSON.stringify(products));
    } catch (e) {
      console.error('Erreur sauvegarde localStorage products:', e);
    }
  }, [products]);

  // Sync Cart to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('ELECTRO_MEN_CART', JSON.stringify(cart));
    } catch (e) {
      console.error('Erreur sauvegarde localStorage cart:', e);
    }
  }, [cart]);

  // Cart Operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Admin Product Operations — synced with Supabase via /api/products
  const [dbError, setDbError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
        setDbError(null);
      } else {
        // Base de données non configurée : on garde le cache local en attendant
        setDbError(json.error || null);
      }
    } catch (e) {
      console.error('Erreur chargement produits distants:', e);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Deep-link: open a specific product if the URL contains ?produit=<id> (shared link)
  useEffect(() => {
    if (products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('produit');
    if (productId) {
      const match = products.find((p) => p.id === productId);
      if (match) {
        setSelectedProduct(match);
      }
    }
  }, [products]);

  const handleAddProduct = async (newProduct: Product, adminPassword: string) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: newProduct, adminPassword }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProducts();
      } else {
        alert(json.error || "Erreur lors de l'ajout du produit.");
      }
    } catch (e) {
      alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product, adminPassword: string) => {
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: updatedProduct, adminPassword }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProducts();
      } else {
        alert(json.error || "Erreur lors de la modification du produit.");
      }
    } catch (e) {
      alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  const handleDeleteProduct = async (productId: string, adminPassword: string) => {
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, adminPassword }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProducts();
      } else {
        alert(json.error || "Erreur lors de la suppression du produit.");
      }
    } catch (e) {
      alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  const handleClearAllProducts = async (adminPassword: string) => {
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true, adminPassword }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProducts();
      } else {
        alert(json.error || "Erreur lors de la suppression.");
      }
    } catch (e) {
      alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  const handleBulkImportProducts = async (
    importedProducts: Product[],
    adminPassword: string
  ): Promise<{ success: boolean; error?: string; imported?: number }> => {
    try {
      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: importedProducts, adminPassword }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProducts();
        return { success: true, imported: json.imported };
      }
      return { success: false, error: json.error || "Erreur lors de l'import." };
    } catch (e) {
      return { success: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' };
    }
  };

  const handleLoadDemoProducts = () => {
    setProducts(DEMO_SAMPLE_PRODUCTS);
  };

  // Open Custom Sourcing Modal with optional prefilled MPN
  const handleOpenSourcingForMpn = (mpnInfo: { mpn: string; name: string; category: string; priceEst?: number }) => {
    setSourcingMpnInfo(mpnInfo);
    setIsSourcingOpen(true);
  };

  // Filtered Products Calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Toutes les catégories' || p.category === selectedCategory;

      const cleanQuery = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !cleanQuery ||
        p.name.toLowerCase().includes(cleanQuery) ||
        p.mpn.toLowerCase().includes(cleanQuery) ||
        p.category.toLowerCase().includes(cleanQuery) ||
        p.description.toLowerCase().includes(cleanQuery);

      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Featured products for the Hero showcase: promotions first, then "vedette" items, most recent first
  const featuredProducts = useMemo(() => {
    return [...products]
      .filter((p) => p.isPopular || (p.discountPercent && p.discountPercent > 0))
      .sort((a, b) => {
        const aPromo = a.discountPercent && a.discountPercent > 0 ? 1 : 0;
        const bPromo = b.discountPercent && b.discountPercent > 0 ? 1 : 0;
        if (aPromo !== bPromo) return bPromo - aPromo;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 6);
  }, [products]);

  // Handle Search Input (triggers admin mode if 'admin' or '/admin' is typed)
  const handleSearchChange = (query: string) => {
    const clean = query.trim().toLowerCase();
    if (
      clean === 'admin' ||
      clean === '/admin' ||
      clean === 'admin/' ||
      clean === '/admin/' ||
      clean === '#admin' ||
      clean === '?admin'
    ) {
      setIsAdminOpen(true);
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSearchQuery(query);
    }
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.pathname.toLowerCase().includes('admin')) {
      window.history.replaceState({}, '', '/');
    }
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHeroSearch = () => {
    const el = document.getElementById('hero-search');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector('input');
      if (input) (input as HTMLInputElement).focus();
    }
  };

  // Dedicated Standalone Admin View (No storefront elements shown)
  if (isAdminOpen) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
        {/* Independent Admin Header */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="cursor-pointer" onClick={handleCloseAdmin}>
              <Logo size="md" />
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 font-mono text-xs uppercase font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Espace Administration Dédié
            </span>
          </div>

          <button
            onClick={handleCloseAdmin}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs uppercase font-bold flex items-center gap-2 border border-slate-300 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600" />
            <span>Retourner à la Boutique</span>
          </button>
        </header>

        {/* Independent Admin Panel Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <AdminPanel
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onClearAllProducts={handleClearAllProducts}
            onBulkImportProducts={handleBulkImportProducts}
            onClose={handleCloseAdmin}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Header Navbar */}
      <Navbar
        cart={cart}
        compareCount={compareProducts.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenCompare={() => setIsCompareModalOpen(true)}
        onOpenSourcingModal={() => {
          setSourcingMpnInfo(undefined);
          setIsSourcingOpen(true);
        }}
        onScrollToSearch={scrollToHeroSearch}
      />

      {/* 3D Motion Hero Banner + Search */}
      <Hero3D
        onOpenSourcingModal={() => {
          setSourcingMpnInfo(undefined);
          setIsSourcingOpen(true);
        }}
        onExploreClick={scrollToCatalog}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={scrollToCatalog}
        featuredProducts={featuredProducts}
        featuredLoading={productsLoading}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* Main Catalogue Grid Section */}
      <main id="catalog-section" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold font-mono uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-amber-600" />
              <span>Catalogue des Composants ({filteredProducts.length})</span>
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              {selectedCategory === 'Toutes les catégories'
                ? 'Affichage de tous les composants disponibles'
                : `Filtre actif : ${selectedCategory}`}
            </p>
          </div>

          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-64 pl-3.5 pr-8 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-slate-900 text-sm font-sans focus:outline-none appearance-none cursor-pointer shadow-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {productsLoading && filteredProducts.length === 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm animate-pulse">
                <div className="h-44 bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-1/2 bg-slate-200 rounded" />
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-5 w-1/3 bg-slate-200 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 font-mono space-y-4 shadow-sm">
            <Cpu className="w-16 h-16 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">
              {searchQuery
                ? `"${searchQuery}" n'est pas disponible pour l'instant.`
                : 'Aucun composant trouvé dans cette sélection.'}
            </h3>
            <p className="text-slate-600 text-xs max-w-md mx-auto">
              Contactez notre service pour une commande sur-mesure et nous nous chargeons de vous le procurer.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() =>
                  handleOpenSourcingForMpn({
                    mpn: searchQuery,
                    name: searchQuery,
                    category: selectedCategory,
                  })
                }
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Commander {searchQuery ? `"${searchQuery}"` : 'ce composant'} sur-mesure via WhatsApp</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isCompared={compareProducts.some((p) => p.id === product.id)}
                onToggleCompare={handleToggleCompare}
                onAddToCart={(p) => handleAddToCart(p, 1)}
                onOrderNow={(p) => {
                  handleAddToCart(p, 1);
                  setIsCartOpen(true);
                }}
                onSelectProduct={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        )}

        {/* Custom Sourcing CTA Banner - Below Catalogue */}
        <div className="mt-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold font-mono uppercase tracking-wide flex items-center justify-center sm:justify-start gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span>Composant introuvable dans le catalogue ?</span>
            </h3>
            <p className="text-slate-300 text-sm mt-1">
              Faites une demande de commande sur-mesure, nous le sourçons pour vous.
            </p>
          </div>
          <button
            onClick={() => {
              setSourcingMpnInfo(undefined);
              setIsSourcingOpen(true);
            }}
            className="shrink-0 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase flex items-center gap-2 shadow-sm transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Demande de Commande Sur-Mesure</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-600 py-12 px-4 sm:px-6 lg:px-8 font-sans mt-16 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          <div className="md:col-span-7 space-y-4">
            <Logo size="lg" />
            <p className="text-xs leading-relaxed text-slate-600 max-w-xl">
              ELECTRO MEN est votre partenaire de confiance au Burkina Faso pour la vente directe de composants électroniques originaux (microcontrôleurs, circuits intégrés, capteurs) et le sourcing sur-mesure sur commande.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-800 font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Garantie Qualité & Authenticité des composants</span>
            </div>
          </div>

          <div className="md:col-span-5 space-y-3 font-mono text-xs">
            <h4 className="text-slate-900 font-bold uppercase tracking-wider text-sm border-b border-slate-200 pb-2">
              Contact & WhatsApp
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Direct : <strong className="text-emerald-700">+226 65 48 47 38</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Ouagadougou & Expédition dans tout le Burkina Faso</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Globe className="w-4 h-4 text-cyan-600" />
                <span>Importation & Service Commande Sur-Mesure</span>
              </div>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center text-[11px] font-mono text-slate-500 gap-2">
          <span>© {new Date().getFullYear()} ELECTRO MEN — Tous droits réservés.</span>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onOrderNow={(p, qty) => {
          handleAddToCart(p, qty);
          setIsCartOpen(true);
        }}
      />

      <SourcingModal
        isOpen={isSourcingOpen}
        onClose={() => setIsSourcingOpen(false)}
        prefillMpn={sourcingMpnInfo?.mpn}
        prefillName={sourcingMpnInfo?.name}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onAddToCart={handleAddToCart}
      />

      <CompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        compareProducts={compareProducts}
        allProducts={products.length > 0 ? products : DEMO_SAMPLE_PRODUCTS}
        onRemoveFromCompare={handleRemoveFromCompare}
        onSelectCompareProduct={handleSelectProductForSlot}
        onAddToCart={(p) => handleAddToCart(p, 1)}
      />

      <CompareFloatingBar
        compareProducts={compareProducts}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        onRemoveFromCompare={handleRemoveFromCompare}
        onClearCompare={handleClearCompare}
      />

      <InstallPwaButton />

    </div>
  );
}
