import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Smartphone,
  Camera,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import {
  BRAND_CATALOG,
  buildDeterministicListing,
  exportBatchToCsv,
  type BackgroundPresetId,
  type BadgePosition,
  type BadgeStyle,
  type BatchGarmentItem,
  type ConditionKey,
  type GarmentCategory,
} from './utils/vintedEngine';
import {
  renderCleanStudioPhoto,
  renderMultiPhotoBundleCollage,
} from './utils/studioCanvas';
import { INITIAL_SAMPLE_ITEMS } from './utils/sampleBatchData';
import { BatchIntakeBar } from './components/BatchIntakeBar';
import { BatchQueueGrid } from './components/BatchQueueGrid';
import { StudioInspector } from './components/StudioInspector';
import {
  MobileAccessModal,
  DEV_MOBILE_URL,
  SHARED_MOBILE_URL,
} from './components/MobileAccessModal';

export default function App() {
  const [items, setItems] = useState<BatchGarmentItem[]>(INITIAL_SAMPLE_ITEMS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_SAMPLE_ITEMS[0].id);

  // Default settings for 5-10 garment bundles
  const [defaultBundleCount, setDefaultBundleCount] = useState<number>(6);
  const [defaultAge, setDefaultAge] = useState<string>('3 ans');
  const [defaultBrand, setDefaultBrand] = useState<string>('Petit Bateau / Zara');
  const [defaultCondition, setDefaultCondition] = useState<ConditionKey>('Très bon état');
  const [defaultCategory, setDefaultCategory] = useState<GarmentCategory>(
    'Lot complet multi-pièces (Hauts + Bas)'
  );
  const [customNotes, setCustomNotes] = useState<string>('');

  // Global Studio Photo Settings (Neutral background + LOT & AGE badge on every photo)
  const [backgroundPreset, setBackgroundPreset] =
    useState<BackgroundPresetId>('studio-white');
  const [badgePosition, setBadgePosition] = useState<BadgePosition>('top-right');
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>('dark-boutique');
  const [showBrandOnPhoto, setShowBrandOnPhoto] = useState<boolean>(true);

  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [copiedMobileUrl, setCopiedMobileUrl] = useState<'dev' | 'shared' | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Re-render studio photos whenever studio preset/badge settings change
  useEffect(() => {
    let cancelled = false;
    async function refreshAllStudioPhotos() {
      const updated = await Promise.all(
        items.map(async (item) => {
          try {
            const cleanedImageUrl = await renderCleanStudioPhoto({
              imageSrc: item.originalImageUrl,
              age: item.age,
              brand: item.brand,
              bundleCount: item.listing.bundleCount,
              condition: item.condition,
              backgroundPreset,
              badgePosition,
              badgeStyle,
              showBrandOnPhoto,
              detourageStrength: item.detourageStrength,
            });
            return { ...item, cleanedImageUrl };
          } catch {
            return item;
          }
        })
      );
      if (!cancelled) {
        setItems(updated);
      }
    }
    refreshAllStudioPhotos();
    return () => {
      cancelled = true;
    };
  }, [backgroundPreset, badgePosition, badgeStyle, showBrandOnPhoto]);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  const handleCopyMobileUrl = async (type: 'dev' | 'shared' = 'dev') => {
    const urlToCopy = type === 'dev' ? DEV_MOBILE_URL : SHARED_MOBILE_URL;
    try {
      await navigator.clipboard.writeText(urlToCopy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = urlToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedMobileUrl(type);
    showToast(
      type === 'dev'
        ? 'Lien Direct (ais-dev) copié ! Ouvrez-le sur votre téléphone connecté à yassine.belahmar23@gmail.com.'
        : 'Lien Partagé (ais-pre) copié ! Pensez à activer le bouton « Share » en haut à droite d’AI Studio.'
    );
    setTimeout(() => setCopiedMobileUrl(null), 2400);
  };

  const callGeminiAnalyze = async (
    imageDataUrl: string,
    age: string,
    brand: string,
    condition: ConditionKey,
    categoryHint: GarmentCategory,
    bundleCount: number,
    notes: string
  ) => {
    try {
      const response = await fetch('/api/analyze-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: 'image/jpeg',
          age,
          brand,
          condition,
          categoryHint,
          bundleCount,
          customNotes: notes,
        }),
      });
      if (!response.ok) {
        throw new Error('Erreur API');
      }
      const data = await response.json();
      return data.listing;
    } catch {
      return buildDeterministicListing({
        age,
        brand,
        condition,
        category: categoryHint,
        bundleCount,
        customNotes: notes,
      });
    }
  };

  // Handle global bundle photo upload OR multi-photo collage assembly
  const handleFilesSelected = async (
    fileList: FileList | File[],
    mode: 'global-photo' | 'collage' = 'global-photo'
  ) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setIsProcessingBatch(true);

    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          })
      )
    );

    if (mode === 'collage' && dataUrls.length >= 2) {
      const count = Math.min(10, dataUrls.length);
      showToast(
        `Assemblage de ${count} photos en 1 Planche Globale Numérotée (#1 à #${count})...`
      );
      const collageUrl = await renderMultiPhotoBundleCollage(dataUrls, {
        age: defaultAge,
        brand: defaultBrand,
        bundleCount: count,
        condition: defaultCondition,
        backgroundPreset,
        badgePosition,
        badgeStyle,
        showBrandOnPhoto,
        detourageStrength: 0,
      });

      const listing = await callGeminiAnalyze(
        collageUrl,
        defaultAge,
        defaultBrand,
        defaultCondition,
        defaultCategory,
        count,
        customNotes
      );

      const newCollageItem: BatchGarmentItem = {
        id: `collage-${Date.now()}`,
        originalImageUrl: collageUrl,
        cleanedImageUrl: collageUrl,
        fileName: `planche_lot_${count}_habits_${defaultAge.replace(/\s+/g, '')}.jpg`,
        age: defaultAge,
        brand: defaultBrand || 'Mix Marques',
        condition: defaultCondition,
        category: defaultCategory,
        bundleCount: count,
        customNotes,
        status: 'ready',
        listing,
        createdAt: Date.now(),
        detourageStrength: 0,
      };

      setItems((prev) => [newCollageItem, ...prev]);
      setSelectedId(newCollageItem.id);
      setIsProcessingBatch(false);
      showToast(
        `Planche globale de ${count} habits (#1 à #${count}) créée avec description détaillée !`
      );
      return;
    }

    // Standard mode: Each photo is a Global Photo of a 5-10 item bundle!
    showToast(
      `Analyse de votre photo globale de lot (${defaultBundleCount} habits · ${defaultAge})...`
    );

    const createdItems: BatchGarmentItem[] = [];

    for (let i = 0; i < dataUrls.length; i++) {
      const dataUrl = dataUrls[i];
      const file = files[i];
      const detourageStrength = 62;

      const listing = await callGeminiAnalyze(
        dataUrl,
        defaultAge,
        defaultBrand,
        defaultCondition,
        defaultCategory,
        defaultBundleCount,
        customNotes
      );

      const finalCount = listing.bundleCount || defaultBundleCount;

      const cleanedImageUrl = await renderCleanStudioPhoto({
        imageSrc: dataUrl,
        age: defaultAge,
        brand: defaultBrand,
        bundleCount: finalCount,
        condition: defaultCondition,
        backgroundPreset,
        badgePosition,
        badgeStyle,
        showBrandOnPhoto,
        detourageStrength,
      });

      const newItem: BatchGarmentItem = {
        id: `bundle-${Date.now()}-${i}`,
        originalImageUrl: dataUrl,
        cleanedImageUrl,
        fileName: file.name,
        age: defaultAge,
        brand: defaultBrand || 'Mix Marques',
        condition: defaultCondition,
        category: listing.category || defaultCategory,
        bundleCount: finalCount,
        customNotes,
        status: 'ready',
        listing,
        createdAt: Date.now(),
        detourageStrength,
      };

      createdItems.push(newItem);
    }

    setItems((prev) => [...createdItems, ...prev]);
    if (createdItems.length > 0) {
      setSelectedId(createdItems[0].id);
    }
    setIsProcessingBatch(false);
    showToast(
      `Lot de ${defaultBundleCount} habits (${defaultAge}) mis au propre avec liste détaillée des articles !`
    );
  };

  // Simulate adding a new 5-10 garment bundle with current settings
  const handleSimulateBurstLot = async () => {
    setIsProcessingBatch(true);
    const isBabyStyle =
      defaultAge.includes('mois') || defaultCategory.includes('Robes');
    const src = isBabyStyle
      ? '/src/assets/images/lot_8_habits_18mois_1794745095625.jpg'
      : '/src/assets/images/lot_6_habits_3ans_1794745093611.jpg';

    const cleanedImageUrl = await renderCleanStudioPhoto({
      imageSrc: src,
      age: defaultAge,
      brand: defaultBrand,
      bundleCount: defaultBundleCount,
      condition: defaultCondition,
      backgroundPreset,
      badgePosition,
      badgeStyle,
      showBrandOnPhoto,
      detourageStrength: 62,
    });

    const listing = buildDeterministicListing({
      age: defaultAge,
      brand: defaultBrand,
      condition: defaultCondition,
      category: defaultCategory,
      bundleCount: defaultBundleCount,
      customNotes,
    });

    const newItem: BatchGarmentItem = {
      id: `sim-bundle-${Date.now()}`,
      originalImageUrl: src,
      cleanedImageUrl,
      fileName: `photo_globale_lot_${defaultBundleCount}_habits_${defaultAge.replace(/\s+/g, '')}.jpg`,
      age: defaultAge,
      brand: defaultBrand,
      condition: defaultCondition,
      category: defaultCategory,
      bundleCount: defaultBundleCount,
      customNotes,
      status: 'ready',
      listing,
      createdAt: Date.now(),
      detourageStrength: 62,
    };

    setItems((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
    setIsProcessingBatch(false);
    showToast(
      `Nouveau lot de ${defaultBundleCount} habits (${defaultAge} · ${defaultBrand}) généré avec description des ${defaultBundleCount} articles !`
    );
  };

  // Update individual bundle item and re-render its studio photo + listing
  const handleUpdateItem = async (
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
  ) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const nextAge = updates.age ?? target.age;
    const nextBrand = updates.brand ?? target.brand;
    const nextCondition = updates.condition ?? target.condition;
    const nextCategory = updates.category ?? target.category;
    const nextCount = updates.bundleCount ?? target.listing.bundleCount;
    const nextNotes = updates.customNotes ?? target.customNotes;
    const nextDetourage = updates.detourageStrength ?? target.detourageStrength;
    const nextItemsList =
      updates.bundleItemsList ??
      (updates.bundleCount !== undefined &&
      updates.bundleCount !== target.listing.bundleItemsList.length
        ? undefined // Let buildDeterministicListing resize the list to match new count
        : target.listing.bundleItemsList);

    const needsPhotoRerender =
      updates.age !== undefined ||
      updates.brand !== undefined ||
      updates.condition !== undefined ||
      updates.bundleCount !== undefined ||
      updates.detourageStrength !== undefined;

    const needsListingRebuild =
      updates.age !== undefined ||
      updates.brand !== undefined ||
      updates.condition !== undefined ||
      updates.category !== undefined ||
      updates.bundleCount !== undefined ||
      updates.bundleItemsList !== undefined ||
      updates.customNotes !== undefined;

    let nextListing = needsListingRebuild
      ? buildDeterministicListing({
          age: nextAge,
          brand: nextBrand,
          condition: nextCondition,
          category: nextCategory,
          bundleCount: nextCount,
          bundleItemsList: nextItemsList,
          detectedColor: target.listing.detectedColor,
          detectedMaterial: target.listing.detectedMaterial,
          season: target.listing.season,
          visualHighlights: target.listing.visualHighlights,
          customNotes: nextNotes,
        })
      : { ...target.listing };

    if (updates.customTitle !== undefined) {
      nextListing = { ...nextListing, title: updates.customTitle };
    }
    if (updates.customDescription !== undefined) {
      nextListing = { ...nextListing, description: updates.customDescription };
    }
    if (updates.customPrice !== undefined && !Number.isNaN(updates.customPrice)) {
      const p = Math.max(2, updates.customPrice);
      const c = Math.max(1, nextListing.bundleCount);
      nextListing = {
        ...nextListing,
        pricing: {
          ...nextListing.pricing,
          recommendedPrice: p,
          pricePerPiece: Number((p / c).toFixed(2)),
          fastSalePrice: Math.max(2, Math.round(p * 0.82 * 2) / 2),
        },
      };
    }

    let cleanedImageUrl = target.cleanedImageUrl;
    if (needsPhotoRerender) {
      try {
        cleanedImageUrl = await renderCleanStudioPhoto({
          imageSrc: target.originalImageUrl,
          age: nextAge,
          brand: nextBrand,
          bundleCount: nextListing.bundleCount,
          condition: nextCondition,
          backgroundPreset,
          badgePosition,
          badgeStyle,
          showBrandOnPhoto,
          detourageStrength: nextDetourage,
        });
      } catch {
        // Keep previous cleanedImageUrl on error
      }
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              age: nextAge,
              brand: nextBrand,
              condition: nextCondition,
              category: nextCategory,
              bundleCount: nextListing.bundleCount,
              customNotes: nextNotes,
              detourageStrength: nextDetourage,
              cleanedImageUrl,
              listing: nextListing,
            }
          : item
      )
    );
  };

  const handleRunGeminiAnalysis = async (item: BatchGarmentItem) => {
    setIsAnalyzingId(item.id);
    try {
      const cleanedDataUrl =
        item.cleanedImageUrl ||
        (await renderCleanStudioPhoto({
          imageSrc: item.originalImageUrl,
          age: item.age,
          brand: item.brand,
          bundleCount: item.listing.bundleCount,
          condition: item.condition,
          backgroundPreset,
          badgePosition,
          badgeStyle,
          showBrandOnPhoto,
          detourageStrength: item.detourageStrength,
        }));

      const newListing = await callGeminiAnalyze(
        cleanedDataUrl,
        item.age,
        item.brand,
        item.condition,
        item.category,
        item.listing.bundleCount,
        item.customNotes || ''
      );

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, bundleCount: newListing.bundleCount, listing: newListing }
            : it
        )
      );
      showToast(
        `Les ${newListing.bundleCount} articles du lot « ${item.brand} (${item.age}) » ont été détaillés !`
      );
    } finally {
      setIsAnalyzingId(null);
    }
  };

  const handleAnalyzeAllBatch = async () => {
    setIsProcessingBatch(true);
    showToast(`Mise à jour des photos et descriptions sur ${items.length} lots...`);
    const updated = await Promise.all(
      items.map(async (item) => {
        const cleanedImageUrl = await renderCleanStudioPhoto({
          imageSrc: item.originalImageUrl,
          age: item.age,
          brand: item.brand,
          bundleCount: item.listing.bundleCount,
          condition: item.condition,
          backgroundPreset,
          badgePosition,
          badgeStyle,
          showBrandOnPhoto,
          detourageStrength: item.detourageStrength,
        });
        const listing = buildDeterministicListing({
          age: item.age,
          brand: item.brand,
          condition: item.condition,
          category: item.category,
          bundleCount: item.listing.bundleCount,
          bundleItemsList: item.listing.bundleItemsList,
          detectedColor: item.listing.detectedColor,
          detectedMaterial: item.listing.detectedMaterial,
          season: item.listing.season,
          visualHighlights: item.listing.visualHighlights,
          customNotes: item.customNotes,
        });
        return { ...item, cleanedImageUrl, listing };
      })
    );
    setItems(updated);
    setIsProcessingBatch(false);
    showToast(`Vos ${updated.length} lots sont propres, étiquetés et prêts pour Vinted !`);
  };

  const handleExportCsv = () => {
    const csvContent = exportBatchToCsv(items);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lots_vinted_enfant_${items.length}_lots.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Catalogue CSV des lots exporté !`);
  };

  const handleDownloadAllPhotos = () => {
    items.slice(0, 10).forEach((item, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.cleanedImageUrl || item.originalImageUrl;
        const safeBrand = (item.brand || 'lot').toLowerCase().replace(/[^a-z0-9]/g, '_');
        link.download = `vinted_lot_${idx + 1}_${item.listing.bundleCount}habits_${safeBrand}_${item.age.replace(/\s+/g, '')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 180);
    });
    showToast(`Téléchargement des photos globales de lots lancé !`);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (selectedId === id && next.length > 0) {
        setSelectedId(next[0].id);
      }
      return next;
    });
  };

  const handleMarkCopied = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'copied' } : i))
    );
  };

  const selectedItem = items.find((i) => i.id === selectedId) || items[0];

  // Metrics for the 500 clothes goal via 5-10 item bundles
  const totalClothesCovered = items.reduce(
    (sum, i) => sum + (i.listing.bundleCount || 1),
    0
  );
  const totalEstimatedRevenue = items.reduce(
    (sum, i) => sum + i.listing.pricing.recommendedPrice,
    0
  );
  const totalFastSaleRevenue = items.reduce(
    (sum, i) => sum + i.listing.pricing.fastSalePrice,
    0
  );
  const avgLotPrice = items.length > 0 ? totalEstimatedRevenue / items.length : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 pb-20 md:pb-0">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          Atelier Vinted Kids
        </a>

        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#mode-rafale"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Créer un Lot (5–10 habits)
          </a>
          <a
            href="#file-batch"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Mes Lots ({items.length})
          </a>
          <a
            href="#inspecteur-studio"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Détail des Articles
          </a>
          <a
            href="#bareme-prix"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Barème Lots
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileModalOpen(true)}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Utiliser sur mon portable
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Toast feedback banner if active */}
        {statusBanner && (
          <div
            role="status"
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-4"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              {statusBanner}
            </span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Direct Mobile Link + 500 Clothes in Bundles Summary Section */}
        <section
          aria-label="Progression Objectif 500 Habits Enfant en Lots"
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Studio Lots Vinted — 5 à 10 Habits par Photo Globale
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Pour écouler vos 500 habits en ~70 annonces : prenez 1 photo globale de 5 à 10 vêtements du même âge, l’application met la photo au propre, inscrit « LOT + ÂGE » dessus et rédige la liste détaillée de chaque article.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileModalOpen(true)}
                className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-teal-700" />
                QR Code & Lien Portable
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                Exporter CSV
              </button>
            </div>
          </div>

          {/* Direct Copyable Mobile URL Box (Both Dev & Shared URLs + Explanation) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="block text-xs font-bold text-slate-900">
                    Accès Mobile — Pourquoi le lien peut bloquer et quel lien utiliser sur votre téléphone :
                  </span>
                  <p className="text-xs text-slate-600">
                    • <strong>Lien 1 (Direct Session Active)</strong> : fonctionne tout de suite si Safari/Chrome sur votre portable est connecté au compte Google <strong>yassine.belahmar23@gmail.com</strong>.
                    <br />• <strong>Lien 2 (Public Partagé)</strong> : ne fonctionne <em>que</em> si vous cliquez d’abord sur le bouton <strong>« Share / Partager »</strong> (ou <strong>« Deploy »</strong>) tout en haut à droite de Google AI Studio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileModalOpen(true)}
                className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-900 bg-white border border-teal-300 hover:bg-teal-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-teal-700" />
                Afficher les 2 QR Codes
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {/* Link 1: Dev URL */}
              <div className="bg-white border border-teal-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-teal-900">
                    Lien 1 — Direct (avec compte Google yassine.belahmar23@gmail.com) :
                  </span>
                  <a
                    href={DEV_MOBILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-mono text-teal-700 hover:underline truncate mt-0.5"
                  >
                    {DEV_MOBILE_URL}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyMobileUrl('dev')}
                  className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedMobileUrl === 'dev' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copier Lien 1
                    </>
                  )}
                </button>
              </div>

              {/* Link 2: Shared URL */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Lien 2 — Public (après clic sur « Share » en haut à droite d’AI Studio) :
                  </span>
                  <a
                    href={SHARED_MOBILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-mono text-slate-700 hover:underline truncate mt-0.5"
                  >
                    {SHARED_MOBILE_URL}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyMobileUrl('shared')}
                  className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedMobileUrl === 'shared' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-400" /> Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copier Lien 2
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 4-column KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
            <div>
              <span className="block text-xs text-slate-500">
                Habits couverts en lots (Objectif 500)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                  {totalClothesCovered} / 500
                </span>
                <span className="text-xs text-teal-700 font-medium font-mono tabular-nums">
                  ({items.length} lots)
                </span>
              </div>
            </div>

            <div>
              <span className="block text-xs text-slate-500">
                Valeur totale estimée des lots
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-teal-800 tabular-nums">
                  {totalEstimatedRevenue.toFixed(2).replace('.', ',')} €
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  (Rapide : {totalFastSaleRevenue.toFixed(0)} €)
                </span>
              </div>
            </div>

            <div>
              <span className="block text-xs text-slate-500">Prix moyen par lot (5–10 pièces)</span>
              <span className="block text-xl font-mono font-bold text-slate-900 tabular-nums mt-1">
                {avgLotPrice.toFixed(2).replace('.', ',')} €
              </span>
            </div>

            <div>
              <span className="block text-xs text-slate-500">
                Annonces évitées grâce aux lots
              </span>
              <span className="block text-xl font-mono font-bold text-slate-900 tabular-nums mt-1">
                -{Math.max(0, totalClothesCovered - items.length)} annonces
              </span>
            </div>
          </div>
        </section>

        {/* Section 1: Mode Lots 5 to 10 items */}
        <div id="mode-rafale">
          <BatchIntakeBar
            defaultAge={defaultAge}
            setDefaultAge={setDefaultAge}
            defaultBrand={defaultBrand}
            setDefaultBrand={setDefaultBrand}
            defaultCondition={defaultCondition}
            setDefaultCondition={setDefaultCondition}
            defaultCategory={defaultCategory}
            setDefaultCategory={setDefaultCategory}
            defaultBundleCount={defaultBundleCount}
            setDefaultBundleCount={setDefaultBundleCount}
            customNotes={customNotes}
            setCustomNotes={setCustomNotes}
            onFilesSelected={handleFilesSelected}
            onSimulateBurstLot={handleSimulateBurstLot}
            isProcessingBatch={isProcessingBatch}
            fileInputRef={fileInputRef}
            cameraInputRef={cameraInputRef}
          />
        </div>

        {/* Section 2: Batch Queue Grid / Table */}
        <div id="file-batch">
          <BatchQueueGrid
            items={items}
            selectedId={selectedItem?.id || ''}
            onSelectItem={(id) => setSelectedId(id)}
            onDeleteItem={handleDeleteItem}
            onMarkCopied={handleMarkCopied}
            onExportCsv={handleExportCsv}
            onDownloadAllPhotos={handleDownloadAllPhotos}
            onAnalyzeAllBatch={handleAnalyzeAllBatch}
            isProcessingBatch={isProcessingBatch}
            onTriggerUpload={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Section 3: Studio Photo & Itemized Bundle Listing Inspector */}
        {selectedItem && (
          <div id="inspecteur-studio">
            <StudioInspector
              item={selectedItem}
              backgroundPreset={backgroundPreset}
              setBackgroundPreset={setBackgroundPreset}
              badgePosition={badgePosition}
              setBadgePosition={setBadgePosition}
              badgeStyle={badgeStyle}
              setBadgeStyle={setBadgeStyle}
              showBrandOnPhoto={showBrandOnPhoto}
              setShowBrandOnPhoto={setShowBrandOnPhoto}
              onUpdateItem={handleUpdateItem}
              onRunGeminiAnalysis={handleRunGeminiAnalysis}
              onMarkCopied={handleMarkCopied}
              isAnalyzingId={isAnalyzingId}
            />
          </div>
        )}

        {/* Section 4: Brand Tier & Bundle Strategy Reference */}
        <section
          id="bareme-prix"
          aria-label="Barème des lots enfant Vinted"
          className="bg-white border border-slate-200 rounded-2xl p-5"
        >
          <div className="pb-4 mb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                03. Barème des Marques & Astuces pour Photographier vos Lots de 5 à 10 Habits
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Touchez une marque ci-dessous pour l’appliquer à votre prochain lot.
              </p>
            </div>
            <span className="text-xs text-slate-500 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              Remise lot (-22% à -30%) calculée automatiquement
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                tier: 'premium',
                title: 'Lots Marques Premium (4,50 € à 7 €/pièce)',
                desc: 'Regroupez par 5 ou 6 pièces coordonnées : très recherché par les parents qui veulent habiller leur enfant d’un coup.',
              },
              {
                tier: 'mid-plus',
                title: 'Lots Milieu de Gamme + (3 € à 4,50 €/pièce)',
                desc: 'Disposez 6 à 8 habits en 2 rangées bien à plat (ex: 3 hauts en haut, 3 bas en bas) pour que tout soit lisible.',
              },
              {
                tier: 'standard',
                title: 'Lots Quotidien / École (2 € à 3 €/pièce)',
                desc: 'Parfait en lots de 7 à 10 pièces du même âge : un seul colis à préparer au lieu de 10 !',
              },
              {
                tier: 'eco',
                title: 'Lots Crèche & Basiques (1,50 € à 2,20 €/pièce)',
                desc: 'Regroupez bodies, pyjamas et t-shirts par 8 ou 10 : vente quasi immédiate sur Vinted.',
              },
            ].map((group) => {
              const brands = BRAND_CATALOG.filter((b) => b.tier === group.tier);
              return (
                <div
                  key={group.tier}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">{group.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {group.desc}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
                    {brands.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => {
                          setDefaultBrand(b.name);
                          showToast(`Marque du lot définie sur « ${b.name} »`);
                        }}
                        className={`px-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
                          defaultBrand === b.name
                            ? 'bg-teal-700 text-white font-medium'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Mobile Ergonomic Bottom Action Bar (Thumb Zone, <= 15% mobile viewport height) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 h-11 rounded-xl bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-transform cursor-pointer"
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Photo Lot {defaultBundleCount} habits ({defaultAge})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileModalOpen(true)}
          aria-label="Ouvrir le lien et QR Code mobile"
          className="h-11 w-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Link & QR Code Modal */}
      <MobileAccessModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onTriggerCamera={() => cameraInputRef.current?.click()}
      />

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <span>Atelier Vinted Kids — Spécialiste Lots de 5 à 10 Vêtements Enfant</span>
        <span>Photo Globale au Propre · Badge « LOT + ÂGE » · Liste détaillée des articles</span>
      </footer>
    </div>
  );
}
