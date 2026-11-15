import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Trash2,
  Search,
  Sparkles,
  FileSpreadsheet,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  AGE_OPTIONS,
  formatListingForClipboard,
  getAgeOption,
  type BatchGarmentItem,
} from '../utils/vintedEngine';

interface BatchQueueGridProps {
  items: BatchGarmentItem[];
  selectedId: string;
  onSelectItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onMarkCopied: (id: string) => void;
  onExportCsv: () => void;
  onDownloadAllPhotos: () => void;
  onAnalyzeAllBatch: () => void;
  isProcessingBatch: boolean;
  onTriggerUpload: () => void;
}

export const BatchQueueGrid: React.FC<BatchQueueGridProps> = ({
  items,
  selectedId,
  onSelectItem,
  onDeleteItem,
  onMarkCopied,
  onExportCsv,
  onDownloadAllPhotos,
  onAnalyzeAllBatch,
  isProcessingBatch,
  onTriggerUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'COPIED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.age.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.listing.bundleItemsList.some((line) =>
        line.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesAge = ageFilter === 'ALL' || item.age === ageFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'COPIED' && item.status === 'copied') ||
      (statusFilter === 'READY' && item.status !== 'copied');

    return matchesSearch && matchesAge && matchesStatus;
  });

  const totalClothesCount = items.reduce((sum, i) => sum + (i.listing.bundleCount || 1), 0);

  const handleQuickCopy = async (e: React.MouseEvent, item: BatchGarmentItem) => {
    e.stopPropagation();
    const text = formatListingForClipboard(item);
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
    setCopiedId(item.id);
    onMarkCopied(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleQuickDownload = (e: React.MouseEvent, item: BatchGarmentItem) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = item.cleanedImageUrl || item.originalImageUrl;
    const ageOpt = getAgeOption(item.age);
    const safeBrand = (item.brand || 'lot').toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `vinted_lot_${item.listing.bundleCount}_habits_${safeBrand}_${ageOpt.vintedTag}_propre.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presentAges = Array.from(new Set(items.map((i) => i.age)));

  return (
    <section
      aria-label="Catalogue de vos Lots Vinted"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            02. Vos Lots Prêts à Publier ({items.length} lots · {totalClothesCount} habits couverts)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chaque lot regroupe 5 à 10 habits sur 1 photo globale propre avec l’inventaire complet prêt à coller sur Vinted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAnalyzeAllBatch}
            disabled={isProcessingBatch || items.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isProcessingBatch ? 'Traitement des lots...' : 'Régénérer tous les lots'}
          </button>

          <button
            type="button"
            onClick={onDownloadAllPhotos}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger photos des lots ({items.length})
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exporter CSV ({totalClothesCount} habits)
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Rechercher par marque, âge ou article du lot"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par marque, âge, article..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <select
            aria-label="Filtrer par âge"
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="ALL">Tous les âges ({items.length} lots)</option>
            {AGE_OPTIONS.map((opt) => {
              const count = items.filter((i) => i.age === opt.label).length;
              if (count === 0 && !presentAges.includes(opt.label)) return null;
              return (
                <option key={opt.label} value={opt.label}>
                  {opt.label} ({count} lot{count > 1 ? 's' : ''})
                </option>
              );
            })}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('READY')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'READY'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              À publier ({items.filter((i) => i.status !== 'copied').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COPIED')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'COPIED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Copiés ({items.filter((i) => i.status === 'copied').length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Vue grille photos de lots"
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grille Lots
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-label="Vue tableau haute densité"
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tableau Rapide
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-sm font-semibold text-slate-800">
            Aucun lot ne correspond à ce filtre
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Prenez une photo globale de 5 à 10 vêtements ou réinitialisez vos filtres.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setAgeFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Afficher tous les lots ({items.length})
              </button>
            ) : (
              <button
                type="button"
                onClick={onTriggerUpload}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 cursor-pointer"
              >
                Photographier mon premier lot
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View of Global Bundle Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => {
            const isSelected = item.id === selectedId;
            const ageOpt = getAgeOption(item.age);
            const isCopied = copiedId === item.id || item.status === 'copied';

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(item.id);
                  }
                }}
                aria-label={`Sélectionner ${item.listing.title}`}
                className={`group rounded-2xl border transition-all flex flex-col sm:flex-row overflow-hidden text-left cursor-pointer ${
                  isSelected
                    ? 'border-slate-900 ring-2 ring-slate-900/10 bg-white'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {/* Left: Cleaned Global Bundle Photo with LOT + AGE Badge */}
                <div className="relative sm:w-56 aspect-square bg-slate-100 border-b sm:border-b-0 sm:border-r border-slate-100 overflow-hidden shrink-0">
                  <img
                    src={item.cleanedImageUrl || item.originalImageUrl}
                    alt={item.listing.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain transition-transform duration-150 group-hover:scale-[1.02]"
                  />
                </div>

                {/* Right: Itemized Bundle Summary & Actions */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3 min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">
                        Lot {item.listing.bundleCount} pièces · {item.age} ({ageOpt.sizeCm})
                      </span>
                      <span className="font-mono font-bold text-base text-teal-800 tabular-nums shrink-0">
                        {item.listing.pricing.recommendedPrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">
                      {item.listing.title}
                    </h3>

                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                      Soit {item.listing.pricing.pricePerPiece.toFixed(2).replace('.', ',')} €/pièce · Vente rapide :{' '}
                      {item.listing.pricing.fastSalePrice.toFixed(2).replace('.', ',')} €
                    </p>

                    {/* Preview of itemized articles inside the lot */}
                    <ul className="mt-2.5 space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                      {item.listing.bundleItemsList.slice(0, 4).map((line, idx) => (
                        <li key={idx} className="truncate">
                          <span className="font-mono text-slate-400 mr-1">{idx + 1}.</span>
                          {line}
                        </li>
                      ))}
                      {item.listing.bundleItemsList.length > 4 && (
                        <li className="text-[11px] font-medium text-teal-700">
                          + {item.listing.bundleItemsList.length - 4} autres articles décrits dans l’annonce...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleQuickCopy(e, item)}
                      className={`flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isCopied
                          ? 'bg-teal-50 text-teal-800'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Lot copié !
                        </>
                      ) : item.status === 'copied' ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Re-copier le lot
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copier l’annonce du lot
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickDownload(e, item)}
                      aria-label={`Télécharger la photo propre de ${item.listing.title}`}
                      className="min-h-[38px] px-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      aria-label={`Supprimer ${item.listing.title}`}
                      className="min-h-[38px] px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Photo du Lot</th>
                <th className="py-2.5 px-3">Titre du Lot Vinted</th>
                <th className="py-2.5 px-3">Nb Pièces</th>
                <th className="py-2.5 px-3">Âge / Taille</th>
                <th className="py-2.5 px-3 text-right">Prix Lot (€/pièce)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredItems.map((item) => {
                const ageOpt = getAgeOption(item.age);
                const isSelected = item.id === selectedId;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-3">
                      <img
                        src={item.cleanedImageUrl || item.originalImageUrl}
                        alt={item.listing.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded object-contain bg-slate-100 border border-slate-200"
                      />
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 max-w-xs truncate">
                      {item.listing.title}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                      {item.listing.bundleCount} habits
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono tabular-nums">
                      {item.age} ({ageOpt.sizeCm})
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-teal-800 tabular-nums whitespace-nowrap">
                      {item.listing.pricing.recommendedPrice.toFixed(2).replace('.', ',')} € (
                      {item.listing.pricing.pricePerPiece.toFixed(2).replace('.', ',')} €/p)
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleQuickCopy(e, item)}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                        >
                          {copiedId === item.id ? 'Copié !' : 'Copier'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleQuickDownload(e, item)}
                          aria-label={`Télécharger photo propre ${item.listing.title}`}
                          className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
