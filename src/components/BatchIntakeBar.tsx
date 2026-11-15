import React, { useRef, useState } from 'react';
import { Upload, Sparkles, Layers, Camera, Check, Grid } from 'lucide-react';
import {
  AGE_OPTIONS,
  BRAND_CATALOG,
  CONDITION_OPTIONS,
  GARMENT_CATEGORIES,
  calculateRecommendedPrice,
  type ConditionKey,
  type GarmentCategory,
} from '../utils/vintedEngine';

interface BatchIntakeBarProps {
  defaultAge: string;
  setDefaultAge: (age: string) => void;
  defaultBrand: string;
  setDefaultBrand: (brand: string) => void;
  defaultCondition: ConditionKey;
  setDefaultCondition: (cond: ConditionKey) => void;
  defaultCategory: GarmentCategory;
  setDefaultCategory: (cat: GarmentCategory) => void;
  defaultBundleCount: number;
  setDefaultBundleCount: (count: number) => void;
  customNotes: string;
  setCustomNotes: (notes: string) => void;
  onFilesSelected: (files: FileList | File[], mode: 'global-photo' | 'collage') => void;
  onSimulateBurstLot: () => void;
  isProcessingBatch: boolean;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  cameraInputRef?: React.RefObject<HTMLInputElement | null>;
}

const QUICK_AGES = ['6 mois', '12 mois', '18 mois', '24 mois', '3 ans', '4 ans', '6 ans', '8 ans'];
const QUICK_COUNTS = [5, 6, 7, 8, 9, 10];
const QUICK_BRANDS = [
  'Petit Bateau / Zara',
  'Jacadi / Cyrillus',
  'Mix Marques (Zara, Okaïdi, H&M)',
  'Sergent Major / Vertbaudet',
  'Okaïdi / Obaïbi',
  'Kiabi / TAO',
  'Petit Bateau',
  'Jacadi',
];

export const BatchIntakeBar: React.FC<BatchIntakeBarProps> = ({
  defaultAge,
  setDefaultAge,
  defaultBrand,
  setDefaultBrand,
  defaultCondition,
  setDefaultCondition,
  defaultCategory,
  setDefaultCategory,
  defaultBundleCount,
  setDefaultBundleCount,
  customNotes,
  setCustomNotes,
  onFilesSelected,
  onSimulateBurstLot,
  isProcessingBatch,
  fileInputRef: externalRef,
  cameraInputRef: externalCameraRef,
}) => {
  const internalRef = useRef<HTMLInputElement | null>(null);
  const internalCamRef = useRef<HTMLInputElement | null>(null);
  const collageInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalRef || internalRef;
  const cameraRef = externalCameraRef || internalCamRef;
  const [isDragging, setIsDragging] = useState(false);

  const livePricePreview = calculateRecommendedPrice({
    brand: defaultBrand || 'Petit Bateau / Zara',
    condition: defaultCondition,
    category: defaultCategory,
    age: defaultAge,
    bundleCount: defaultBundleCount,
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files, 'global-photo');
    }
  };

  return (
    <section
      aria-label="Création de Lots de 5 à 10 habits"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            01. Mode Lots (5 à 10 habits sur 1 Photo Globale)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Étalez 5 à 10 vêtements du même âge à plat et prenez 1 photo globale : l’application met le lot au propre, inscrit « LOT {defaultBundleCount} HABITS · {defaultAge.toUpperCase()} » sur la photo et détaille chaque article dans la description.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="text-left sm:text-right">
            <span className="block text-xs text-slate-500">
              Prix conseillé du lot ({defaultBundleCount} pièces)
            </span>
            <span className="text-sm font-mono font-semibold text-teal-800 tabular-nums">
              {livePricePreview.recommendedPrice.toFixed(2).replace('.', ',')} € le lot (soit{' '}
              {livePricePreview.pricePerPiece.toFixed(2).replace('.', ',')} €/pièce)
            </span>
          </div>
          <button
            type="button"
            onClick={onSimulateBurstLot}
            disabled={isProcessingBatch}
            className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5 text-teal-700" />
            Simuler un lot de {defaultBundleCount} habits ({defaultAge})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 columns: Bundle Count + Age + Brand + Condition */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Row 1: Number of articles in the bundle photo (5 to 10) + Age */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-800">
                  1. Nb d’habits sur la photo
                </span>
                <span className="text-xs font-mono font-semibold text-teal-800 tabular-nums">
                  {defaultBundleCount} pièces
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_COUNTS.map((cnt) => {
                  const active = defaultBundleCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setDefaultBundleCount(cnt)}
                      className={`min-h-[40px] px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                        active
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cnt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-7">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="batch-age-select"
                  className="text-xs font-semibold text-slate-800"
                >
                  2. Âge du lot (inscrit sur la photo)
                </label>
                <span className="text-xs text-teal-800 font-mono font-semibold tabular-nums">
                  {defaultAge}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_AGES.slice(0, 6).map((age) => {
                  const active = defaultAge === age;
                  return (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setDefaultAge(age)}
                      className={`min-h-[40px] px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {age}
                    </button>
                  );
                })}
                <select
                  id="batch-age-select"
                  aria-label="Choisir un autre âge enfant"
                  value={defaultAge}
                  onChange={(e) => setDefaultAge(e.target.value)}
                  className="min-h-[40px] px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {AGE_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label} ({opt.sizeCm})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Brand & Condition Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="batch-brand-input"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                3. Marque principale ou Mix Marques du lot
              </label>
              <input
                id="batch-brand-input"
                list="vinted-kids-brands"
                type="text"
                value={defaultBrand}
                onChange={(e) => setDefaultBrand(e.target.value)}
                placeholder="Ex: Petit Bateau / Zara, Jacadi, Mix Marques..."
                className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <datalist id="vinted-kids-brands">
                {BRAND_CATALOG.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.tierLabel}
                  </option>
                ))}
              </datalist>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {QUICK_BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setDefaultBrand(b)}
                    className={`min-h-[30px] px-2 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      defaultBrand.toLowerCase() === b.toLowerCase()
                        ? 'bg-teal-700 text-white font-semibold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="batch-condition-select"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  4. État général du lot
                </label>
                <select
                  id="batch-condition-select"
                  value={defaultCondition}
                  onChange={(e) => setDefaultCondition(e.target.value as ConditionKey)}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {CONDITION_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="batch-category-select"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Type de lot
                </label>
                <select
                  id="batch-category-select"
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value as GarmentCategory)}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {GARMENT_CATEGORIES.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label
              htmlFor="batch-notes-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Précision facultative sur le lot (ex: saison, marques détaillées...)
            </label>
            <input
              id="batch-notes-input"
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ex: Lot automne-hiver complet, 2 pulls + 2 pantalons + 2 t-shirts..."
              className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>

        {/* Right 5 columns: Global Lot Photo Capture & Multi-Photo Collage Assembler */}
        <div className="lg:col-span-5 flex flex-col">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex-1 flex flex-col items-center justify-center text-center p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-colors ${
              isDragging
                ? 'border-teal-600 bg-teal-50/60'
                : 'border-teal-600/40 bg-teal-50/25 hover:bg-teal-50/40'
            }`}
          >
            {/* Global bundle photo gallery input */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFilesSelected(e.target.files, 'global-photo');
                  e.target.value = '';
                }
              }}
              className="hidden"
              id="batch-photo-upload-input"
            />

            {/* Direct Smartphone Rear Camera Input for Global Lot Photo */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFilesSelected(e.target.files, 'global-photo');
                  e.target.value = '';
                }
              }}
              className="hidden"
              id="mobile-camera-capture-input"
            />

            {/* Multi-photo Collage Input (combines 5-10 separate photos into 1 global numbered photo) */}
            <input
              ref={collageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFilesSelected(e.target.files, 'collage');
                  e.target.value = '';
                }
              }}
              className="hidden"
              id="collage-photo-upload-input"
            />

            <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center mb-3 shadow-xs">
              <Camera className="w-6 h-6" />
            </div>

            <p className="text-sm font-bold text-slate-900">
              Photographiez vos {defaultBundleCount} habits étalés ensemble
            </p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">
              Badge sur la photo :{' '}
              <span className="font-semibold text-slate-900">
                LOT {defaultBundleCount} HABITS · {defaultAge.toUpperCase()}
              </span>
            </p>

            <div className="mt-4 w-full flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="w-full sm:flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  Prendre 1 Photo Globale du Lot
                </button>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-teal-700" />
                  Importer photo(s) de lot
                </button>
              </div>

              <button
                type="button"
                onClick={() => collageInputRef.current?.click()}
                className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-900 bg-white/90 border border-teal-200 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5 text-teal-700" />
                Ou assembler 5 à 10 photos séparées en 1 Planche Globale Numérotée (#1 à #10)
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 w-full flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-teal-700" /> Fond neutre studio
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-teal-700" /> « LOT {defaultBundleCount} HABITS · {defaultAge} »
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" /> Liste des {defaultBundleCount} articles
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
