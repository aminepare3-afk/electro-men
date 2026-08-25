import React, { useEffect, useState } from 'react';
import { FileBarChart, Download, ShoppingCart, Ship, Briefcase, Users } from 'lucide-react';
import { Product, Order } from '../types';
import { exportProductsToCsv, exportOrdersToCsv, exportRowsToCsv } from '../utils/csvImportExport';
import { getOperations } from '../services/operationsService';
import { getImportOrders } from '../services/importOrdersService';

interface ReportsPanelProps {
  products: Product[];
  orders: Order[];
}

const ReportRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onExport: () => void;
  disabled?: boolean;
}> = ({ icon, title, description, onExport, disabled }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
    <button
      onClick={onExport}
      disabled={disabled}
      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 font-mono text-xs uppercase font-bold py-2 px-3 rounded-lg transition-colors shrink-0"
    >
      <Download className="w-3.5 h-3.5" />
      CSV
    </button>
  </div>
);

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ products, orders }) => {
  const [operationsCount, setOperationsCount] = useState(0);
  const [importsCount, setImportsCount] = useState(0);

  useEffect(() => {
    getOperations().then((ops) => setOperationsCount(ops.length));
    getImportOrders().then((imps) => setImportsCount(imps.length));
  }, []);

  const exportSalesReport = () => {
    const headers = ['Date', 'N° commande', 'Client', 'Total FCFA', 'Statut'];
    const rows = orders.map((o) => [
      new Date(o.createdAt).toLocaleDateString('fr-FR'),
      o.orderNumber,
      o.customerName,
      o.totalFcfa,
      o.status,
    ]);
    exportRowsToCsv('electro-men-rapport-ventes', headers, rows);
  };

  const exportOperationsReport = async () => {
    const ops = await getOperations();
    const headers = ['Référence', 'Titre', 'Statut', 'Montant cible', 'Montant collecté', 'Participants', 'Date début'];
    const rows = ops.map((o) => [o.reference, o.title, o.status, o.targetAmountFcfa, o.collectedAmountFcfa, o.participantsCount, o.startDate]);
    exportRowsToCsv('electro-men-rapport-operations', headers, rows);
  };

  const exportImportsReport = async () => {
    const imps = await getImportOrders();
    const headers = ['Référence', 'Fournisseur', 'Produit', 'Quantité', 'Achat', 'Transport', 'Douane', 'Taxes', 'Statut'];
    const rows = imps.map((i) => [
      i.reference,
      i.supplierName,
      i.productDescription,
      i.quantity,
      i.purchasePriceFcfa,
      i.transportFeeFcfa,
      i.customsFeeFcfa,
      i.taxFeeFcfa,
      i.status,
    ]);
    exportRowsToCsv('electro-men-rapport-importations', headers, rows);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-amber-600" />
          Rapports
        </h2>
        <p className="text-sm text-slate-500">Exports CSV basés sur les données actuellement disponibles.</p>
      </div>

      <div className="flex flex-col gap-3">
        <ReportRow
          icon={<ShoppingCart className="w-4 h-4" />}
          title="Rapport des ventes"
          description={`${orders.length} commande(s) — données réelles`}
          onExport={exportSalesReport}
          disabled={orders.length === 0}
        />
        <ReportRow
          icon={<Download className="w-4 h-4" />}
          title="Catalogue produits"
          description={`${products.length} produit(s) — export existant réutilisé`}
          onExport={() => exportProductsToCsv(products)}
          disabled={products.length === 0}
        />
        <ReportRow
          icon={<Briefcase className="w-4 h-4" />}
          title="Rapport des opérations"
          description={`${operationsCount} opération(s) — brouillon local`}
          onExport={exportOperationsReport}
          disabled={operationsCount === 0}
        />
        <ReportRow
          icon={<Ship className="w-4 h-4" />}
          title="Rapport d'importation"
          description={`${importsCount} commande(s) d'importation — brouillon local`}
          onExport={exportImportsReport}
          disabled={importsCount === 0}
        />
        <ReportRow
          icon={<Users className="w-4 h-4" />}
          title="Rapport financier / participants"
          description="Nécessite le backend financement (ledger, comptes participants)"
          onExport={() => {}}
          disabled
        />
      </div>
    </div>
  );
};
