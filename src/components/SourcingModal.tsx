import React, { useState, useEffect } from 'react';
import { X, Send, Image as ImageIcon, CheckCircle2, ShieldCheck, Globe, Upload } from 'lucide-react';

interface SourcingModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillMpn?: string;
  prefillName?: string;
}

export const SourcingModal: React.FC<SourcingModalProps> = ({
  isOpen,
  onClose,
  prefillMpn = '',
  prefillName = '',
}) => {
  const [componentNameOrMpn, setComponentNameOrMpn] = useState(prefillMpn || prefillName || '');
  const [quantityNeeded, setQuantityNeeded] = useState(10);
  const [customerName, setCustomerName] = useState('');
  const [phoneWhatsApp, setPhoneWhatsApp] = useState('');
  const [estimatedBudgetFcfa, setEstimatedBudgetFcfa] = useState('');
  const [descriptionOrLink, setDescriptionOrLink] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (prefillMpn || prefillName) {
      setComponentNameOrMpn(prefillMpn ? `${prefillMpn} - ${prefillName}` : prefillName);
    }
  }, [prefillMpn, prefillName]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentNameOrMpn || !phoneWhatsApp) return;

    // Create formatted WhatsApp message targeting +226 67 31 46 05
    const msg = encodeURIComponent(
      `Bonjour ELECTRO MEN (+226 67 31 46 05),\n\n*DEMANDE DE COMPOSANT SUR-MESURE*\n\n` +
        `👤 Client : ${customerName || 'Client ELECTRO MEN'}\n` +
        `📱 WhatsApp : ${phoneWhatsApp}\n` +
        `⚡ Composant/MPN : ${componentNameOrMpn}\n` +
        `📦 Quantité souhaitée : ${quantityNeeded} unités\n` +
        `💰 Budget estimé : ${estimatedBudgetFcfa ? estimatedBudgetFcfa + ' FCFA' : 'Non spécifié'}\n` +
        `📝 Détails/Lien : ${descriptionOrLink || 'Aucun'}\n\n` +
        `Merci de vérifier la disponibilité et de me transmettre le devis !`
    );

    const whatsappUrl = `https://wa.me/22667314605?text=${msg}`;
    setSubmitted(true);

    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-cyan-700 font-bold block uppercase tracking-wider">
                COMMANDE SUR-MESURE / SOURCING INTERNATIONAL
              </span>
              <h2 className="text-lg font-bold text-slate-900 font-mono uppercase">
                Commander un composant spécifique sur-mesure
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submitted ? (
          <div className="p-8 text-center space-y-4 font-mono">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Demande Transmise par WhatsApp !</h3>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              Votre demande pour <strong className="text-amber-800">{componentNameOrMpn}</strong> a été formatée et redirigée vers WhatsApp <strong className="text-emerald-700">+226 67 31 46 05</strong>.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase"
            >
              Fermer la fenêtre
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 font-sans">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                ELECTRO MEN importe directement vos composants sur commande sous 7 à 14 jours. Remplissez cette fiche pour recevoir votre cotation au Burkina Faso.
              </span>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-semibold mb-1">
                  Nom ou Référence MPN du Composant <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: STM32F407VGT6, PCA9685, Transistor 2N3055..."
                  value={componentNameOrMpn}
                  onChange={(e) => setComponentNameOrMpn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 font-mono focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-semibold mb-1">
                  Quantité Souhaitée <span className="text-amber-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 font-mono focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-semibold mb-1">
                  Votre Nom ou Entreprise
                </label>
                <input
                  type="text"
                  placeholder="Ex: Moussa Ouédraogo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-semibold mb-1">
                  Numéro WhatsApp <span className="text-amber-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: +226 70 00 00 00"
                  value={phoneWhatsApp}
                  onChange={(e) => setPhoneWhatsApp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 font-mono focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-semibold mb-1">
                  Budget Global estimé (FCFA)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 25 000 FCFA"
                  value={estimatedBudgetFcfa}
                  onChange={(e) => setEstimatedBudgetFcfa(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 font-mono focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-semibold mb-1">
                  Lien Web / Fiche Technique ou Description Spécifique
                </label>
                <input
                  type="text"
                  placeholder="Collez l'URL de la fiche ou spécifications"
                  value={descriptionOrLink}
                  onChange={(e) => setDescriptionOrLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Photo Attachment Preview */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 font-semibold mb-1">
                Joindre une Photo du Composant (Optionnel)
              </label>
              <div className="flex items-center gap-4">
                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer text-xs font-mono text-slate-700 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>Choisir un fichier...</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>

                {imagePreview && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-amber-500">
                    <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm font-mono uppercase flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Send className="w-5 h-5" />
                <span>Envoyer la Demande sur WhatsApp (+226 67 31 46 05)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
