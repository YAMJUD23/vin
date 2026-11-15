import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Sparkles,
  Eye,
  Sliders,
  RefreshCw,
  Tag,
  Plus,
  Trash2,
  ListChecks,
} from 'lucide-react';
import {
  AGE_OPTIONS,
  BACKGROUND_PRESETS,
  CONDITION_OPTIONS,
  GARMENT_CATEGORIES,
  formatListingForClipboard,
  getAgeOption,
  type BackgroundPresetId,
  type BadgePosition,
  type BadgeStyle,
  type BatchGarmentItem,
  type ConditionKey,
  type GarmentCategory,
} from '../utils/vintedEngine';

interface StudioInspectorProps {
  item: BatchGarmentItem;
  backgroundPreset: BackgroundPresetId;
  setBackgroundPreset: (preset: BackgroundPresetId) => void;
  badgePosition: BadgePosition;
  setBadgePosition: (pos: BadgePosition) => void;
  badgeStyle: BadgeStyle;
  setBadgeStyle: (style: BadgeStyle) => void;
  showBrandOnPhoto: boolean;
  setShowBrandOnPhoto: (show: boolean) => void;
  onUpdateItem: (
    id: string,
    updates: Partial<
      Pick<
        BatchGarmentItem,
        | 'age'
        | 'brand'
        | 'condition'
        | 'category'
        | 'bundleCount'
        | 'customNotes'
        | 'detourageStrength'
      >
    > & {
      customTitle?: string;
      customDescription?: string;
      customPrice?: number;
      bundleItemsList?: string[];
    }
  ) => void;
  onRunGeminiAnalysis: (item: BatchGarmentItem) => void;
  onMarkCopied: (id: string) => void;
  isAnalyzingId: string | null;
}

export const StudioInspector: React.FC<StudioInspectorProps> = ({
  item,
  backgroundPreset,
  setBackgroundPreset,
  badgePosition,
  setBadgePosition,
  badgeStyle,
  setBadgeStyle,
  showBrandOnPhoto,
  setShowBrandOnPhoto,
  onUpdateItem,
  onRunGeminiAnalysis,
  onMarkCopied,
  isAnalyzingId,
}) => {
  const [compareOriginal, setCompareOriginal] = useState(false);
  const [copiedField, setCopiedField] = useState<'all' | 'title' | 'desc' | null>(null);

  const ageOpt = getAgeOption(item.age);
  const displayPhotoUrl =
    compareOriginal || !item.cleanedImageUrl ? item.originalImageUrl : item.cleanedImageUrl;

  const copyText = async (text: string, type: 'all' | 'title' | 'desc') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedField(type);
    onMarkCopied(item.id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadPhoto = () => {
    const link = document.createElement('a');
    link.href = item.cleanedImageUrl || item.originalImageUrl;
    const safeBrand = (item.brand || 'lot').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeAge = ageOpt.vintedTag;
    link.download = `vinted_lot_${item.listing.bundleCount}_habits_${safeBrand}_${safeAge}_propre.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMobileShareListing = async () => {
    const fullText = formatListingForClipboard(item);
    await copyText(fullText, 'all');
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.listing.title,
          text: item.listing.description,
        });
      } catch {
        // Ignore share cancellation
      }
    }
  };

  const handleArticleLineChange = (index: number, newValue: string) => {
    const updatedList = [...item.listing.bundleItemsList];
    updatedList[index] = newValue;
    onUpdateItem(item.id, {
      bundleItemsList: updatedList,
      bundleCount: updatedList.length,
    });
  };

  const handleAddArticleLine = () => {
    const updatedList = [
      ...item.listing.bundleItemsList,
      `Article #${item.listing.bundleItemsList.length + 1} (${item.brand}) — Taille ${item.age}`,
    ];
    onUpdateItem(item.id, {
      bundleItemsList: updatedList,
      bundleCount: updatedList.length,
    });
  };

  const handleRemoveArticleLine = (index: number) => {
    if (item.listing.bundleItemsList.length <= 1) return;
    const updatedList = item.listing.bundleItemsList.filter((_, idx) => idx !== index);
    onUpdateItem(item.id, {
      bundleItemsList: updatedList,
      bundleCount: updatedList.length,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="text-xs text-slate-500">
            Lot sélectionné · {item.listing.bundleCount} habits · {item.brand} · {item.age} (
            {ageOpt.sizeCm}) · {item.condition}
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-0.5">
            Atelier Photo Globale du Lot ({item.listing.bundleCount} articles) & Description Détaillée
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onRunGeminiAnalysis(item)}
            disabled={isAnalyzingId === item.id}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isAnalyzingId === item.id ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isAnalyzingId === item.id
              ? 'Détection des articles en cours...'
              : 'Détecter les articles par IA Vision'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPhoto}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger photo du lot
          </button>

          <button
            type="button"
            onClick={handleMobileShareListing}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedField === 'all' ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-400" />
                Annonce du lot copiée !
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copier toute l’annonce du lot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-column studio split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 5 columns: Studio Cleaned Global Bundle Photo Preview + Controls */}
        <div className="xl:col-span-5 space-y-4">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <img
              src={displayPhotoUrl}
              alt={`${item.listing.title} - ${compareOriginal ? 'Photo originale' : 'Photo globale du lot propre avec âge'}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />

            <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCompareOriginal(!compareOriginal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900/85 text-white rounded-lg backdrop-blur-xs hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                {compareOriginal ? 'Retour à la Photo du Lot Propre' : 'Comparer avec l’originale'}
              </button>
            </div>
          </div>

          {/* Studio Photo Controls */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-700" />
                Réglages Photo Globale & Badge Lot/Âge
              </span>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBrandOnPhoto}
                  onChange={(e) => setShowBrandOnPhoto(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                Afficher marques sur photo
              </label>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-500 mb-1">
                Fond neutre studio
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {BACKGROUND_PRESETS.map((preset) => {
                  const active = backgroundPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setBackgroundPreset(preset.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-white border-slate-900 text-slate-900 shadow-2xs'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="inspector-badge-pos"
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Position du badge « LOT + ÂGE »
                </label>
                <select
                  id="inspector-badge-pos"
                  value={badgePosition}
                  onChange={(e) => setBadgePosition(e.target.value as BadgePosition)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800"
                >
                  <option value="top-right">Coin Haut-Droit (Recommandé)</option>
                  <option value="bottom-right">Coin Bas-Droit</option>
                  <option value="top-left">Coin Haut-Gauche</option>
                  <option value="bottom-bar">Bandeau Bas Complet</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="inspector-badge-style"
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Style de l’étiquette
                </label>
                <select
                  id="inspector-badge-style"
                  value={badgeStyle}
                  onChange={(e) => setBadgeStyle(e.target.value as BadgeStyle)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800"
                >
                  <option value="dark-boutique">Boutique Anthracite</option>
                  <option value="cream-label">Étiquette Crème Clair</option>
                  <option value="teal-vinted">Pastille Vert Émeraude</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                <label htmlFor="detourage-slider">
                  Harmonisation du fond neutre autour du lot
                </label>
                <span className="font-mono tabular-nums font-medium">
                  {item.detourageStrength}%
                </span>
              </div>
              <input
                id="detourage-slider"
                type="range"
                min={0}
                max={95}
                step={5}
                value={item.detourageStrength}
                onChange={(e) =>
                  onUpdateItem(item.id, { detourageStrength: Number(e.target.value) })
                }
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right 7 columns: Bundle Metadata + Itemized 5-10 Articles List + Price + Description */}
        <div className="xl:col-span-7 space-y-5">
          {/* Quick Edit Row for this Lot's Count, Age, Brand, Condition */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <div>
              <label
                htmlFor="item-edit-count"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Nb d’habits du lot
              </label>
              <select
                id="item-edit-count"
                value={item.listing.bundleCount}
                onChange={(e) =>
                  onUpdateItem(item.id, { bundleCount: Number(e.target.value) })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-md text-slate-900"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map((n) => (
                  <option key={n} value={n}>
                    Lot de {n} habits
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="item-edit-age"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Âge (sur photo)
              </label>
              <select
                id="item-edit-age"
                value={item.age}
                onChange={(e) => onUpdateItem(item.id, { age: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-900"
              >
                {AGE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label} ({opt.sizeCm})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="item-edit-brand"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Marque(s) du lot
              </label>
              <input
                id="item-edit-brand"
                type="text"
                value={item.brand}
                onChange={(e) => onUpdateItem(item.id, { brand: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="item-edit-condition"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                État général
              </label>
              <select
                id="item-edit-condition"
                value={item.condition}
                onChange={(e) =>
                  onUpdateItem(item.id, { condition: e.target.value as ConditionKey })
                }
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-900"
              >
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.key}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Itemized List of the 5 to 10 Articles in the Bundle */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-teal-700" />
                  Détail des {item.listing.bundleItemsList.length} articles présents sur la photo globale
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chaque ligne est automatiquement numérotée et intégrée dans votre description Vinted.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddArticleLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un article au lot
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {item.listing.bundleItemsList.map((articleLine, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-xs font-mono font-bold text-teal-800 tabular-nums text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    aria-label={`Article ${idx + 1} du lot`}
                    value={articleLine}
                    onChange={(e) => handleArticleLineChange(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveArticleLine(idx)}
                    aria-label={`Retirer l'article ${idx + 1}`}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bundle Price Advisor Box */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-teal-700" />
                  Prix Conseillé du Lot ({item.listing.bundleCount} pièces) & Prix de revient / habit
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.listing.pricing.rationale}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-3">
              <div>
                <span className="block text-xs text-slate-500">Prix du lot conseillé</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    aria-label="Prix du lot conseillé en euros"
                    value={item.listing.pricing.recommendedPrice}
                    onChange={(e) =>
                      onUpdateItem(item.id, { customPrice: Number(e.target.value) })
                    }
                    className="w-24 px-2 py-1 text-base font-mono font-semibold text-teal-800 bg-teal-50/70 border border-teal-200 rounded tabular-nums"
                  />
                  <span className="text-sm font-mono font-semibold text-teal-800">€</span>
                </div>
              </div>

              <div>
                <span className="block text-xs text-slate-500">Soit par vêtement</span>
                <span className="block text-base font-mono font-semibold text-slate-900 tabular-nums mt-1">
                  {item.listing.pricing.pricePerPiece.toFixed(2).replace('.', ',')} € / pièce
                </span>
              </div>

              <div>
                <span className="block text-xs text-slate-500">Lot vente rapide (-18%)</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-mono font-semibold text-slate-800 tabular-nums">
                    {item.listing.pricing.fastSalePrice.toFixed(2).replace('.', ',')} €
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateItem(item.id, {
                        customPrice: item.listing.pricing.fastSalePrice,
                      })
                    }
                    className="text-[11px] font-medium text-teal-700 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="inspector-vinted-title"
                className="text-xs font-semibold text-slate-800"
              >
                Titre Vinted du Lot
              </label>
              <button
                type="button"
                onClick={() => copyText(item.listing.title, 'title')}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedField === 'title' ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Titre copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copier le titre
                  </>
                )}
              </button>
            </div>
            <input
              id="inspector-vinted-title"
              type="text"
              value={item.listing.title}
              onChange={(e) => onUpdateItem(item.id, { customTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Generated Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="inspector-vinted-desc"
                className="text-xs font-semibold text-slate-800"
              >
                Description complète du lot (avec liste numérotée des {item.listing.bundleCount} articles)
              </label>
              <button
                type="button"
                onClick={() => copyText(item.listing.description, 'desc')}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedField === 'desc' ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Description copiée
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copier la description
                  </>
                )}
              </button>
            </div>
            <textarea
              id="inspector-vinted-desc"
              rows={11}
              value={item.listing.description}
              onChange={(e) => onUpdateItem(item.id, { customDescription: e.target.value })}
              className="w-full px-3 py-2.5 text-xs leading-relaxed bg-white border border-slate-300 rounded-lg text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
