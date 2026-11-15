export type ConditionKey =
  | 'Neuf avec étiquette'
  | 'Neuf sans étiquette'
  | 'Très bon état'
  | 'Bon état'
  | 'Satisfaisant';

export type GarmentCategory =
  | 'Lot complet multi-pièces (Hauts + Bas)'
  | 'Lot Hauts / Pulls / T-shirts'
  | 'Lot Pantalons / Jeans / Shorts'
  | 'Lot Robes / Salopettes / Ensembles'
  | 'Lot Bodies / Pyjamas / Dors-bien'
  | 'Manteau / Doudoune / Pilote'
  | 'Pull / Gilet / Sweat / Marinière'
  | 'Robe / Salopette / Ensemble';

export type BackgroundPresetId = 'studio-white' | 'natural-linen' | 'pearl-gray' | 'warm-ivory';

export type BadgePosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-bar';

export type BadgeStyle = 'dark-boutique' | 'cream-label' | 'teal-vinted';

export interface AgeOption {
  label: string;
  shortLabel: string;
  sizeCm: string;
  vintedTag: string;
}

export interface BrandInfo {
  name: string;
  tier: 'premium' | 'mid-plus' | 'standard' | 'eco';
  tierLabel: string;
  multiplier: number;
}

export interface PriceRecommendation {
  recommendedPrice: number; // Total lot price
  pricePerPiece: number; // Price per garment inside the lot
  fastSalePrice: number; // Quick turnover total lot price (-20%)
  unitValueSum: number; // Value if sold individually
  estimatedNewPrice: number;
  brandTierLabel: string;
  rationale: string;
}

export interface GeneratedVintedListing {
  title: string;
  description: string;
  hashtags: string[];
  category: GarmentCategory;
  bundleCount: number;
  bundleItemsList: string[];
  detectedColor: string;
  detectedMaterial: string;
  season: string;
  visualHighlights: string;
  pricing: PriceRecommendation;
}

export interface BatchGarmentItem {
  id: string;
  originalImageUrl: string;
  cleanedImageUrl?: string;
  fileName: string;
  age: string;
  brand: string;
  condition: ConditionKey;
  category: GarmentCategory;
  bundleCount: number;
  customNotes?: string;
  status: 'pending' | 'processing' | 'ready' | 'copied' | 'error';
  listing: GeneratedVintedListing;
  createdAt: number;
  detourageStrength: number; // 0 to 100
}

export const AGE_OPTIONS: AgeOption[] = [
  { label: 'Naissance', shortLabel: '0M', sizeCm: '50 cm', vintedTag: 'naissance' },
  { label: '1 mois', shortLabel: '1M', sizeCm: '54 cm', vintedTag: '1mois' },
  { label: '3 mois', shortLabel: '3M', sizeCm: '60 cm', vintedTag: '3mois' },
  { label: '6 mois', shortLabel: '6M', sizeCm: '67 cm', vintedTag: '6mois' },
  { label: '9 mois', shortLabel: '9M', sizeCm: '71 cm', vintedTag: '9mois' },
  { label: '12 mois', shortLabel: '12M', sizeCm: '74 cm', vintedTag: '12mois' },
  { label: '18 mois', shortLabel: '18M', sizeCm: '81 cm', vintedTag: '18mois' },
  { label: '24 mois', shortLabel: '24M', sizeCm: '86 cm', vintedTag: '24mois' },
  { label: '3 ans', shortLabel: '3A', sizeCm: '98 cm', vintedTag: '3ans' },
  { label: '4 ans', shortLabel: '4A', sizeCm: '104 cm', vintedTag: '4ans' },
  { label: '5 ans', shortLabel: '5A', sizeCm: '110 cm', vintedTag: '5ans' },
  { label: '6 ans', shortLabel: '6A', sizeCm: '116 cm', vintedTag: '6ans' },
  { label: '8 ans', shortLabel: '8A', sizeCm: '128 cm', vintedTag: '8ans' },
  { label: '10 ans', shortLabel: '10A', sizeCm: '140 cm', vintedTag: '10ans' },
  { label: '12 ans', shortLabel: '12A', sizeCm: '152 cm', vintedTag: '12ans' },
  { label: '14 ans', shortLabel: '14A', sizeCm: '164 cm', vintedTag: '14ans' },
];

export const CONDITION_OPTIONS: {
  key: ConditionKey;
  multiplier: number;
  vintedDesc: string;
}[] = [
  {
    key: 'Neuf avec étiquette',
    multiplier: 1.35,
    vintedDesc: 'Articles neufs avec étiquette d’origine, jamais portés, aucun défaut.',
  },
  {
    key: 'Neuf sans étiquette',
    multiplier: 1.18,
    vintedDesc: 'Articles neufs ou comme neufs (uniquement lavés), état irréprochable.',
  },
  {
    key: 'Très bon état',
    multiplier: 1.0,
    vintedDesc: 'Très bon état général sur l’ensemble du lot, portés avec soin, ni tache ni trou.',
  },
  {
    key: 'Bon état',
    multiplier: 0.78,
    vintedDesc: 'Bon état général, lot idéal pour le quotidien, l’école ou la crèche.',
  },
  {
    key: 'Satisfaisant',
    multiplier: 0.55,
    vintedDesc: 'État correct, parfait en lot de rechange pour la crèche ou les activités.',
  },
];

export const GARMENT_CATEGORIES: {
  category: GarmentCategory;
  baseUnitPrice: number;
  avgNewUnitPrice: number;
}[] = [
  { category: 'Lot complet multi-pièces (Hauts + Bas)', baseUnitPrice: 4.5, avgNewUnitPrice: 22 },
  { category: 'Lot Hauts / Pulls / T-shirts', baseUnitPrice: 4.0, avgNewUnitPrice: 19 },
  { category: 'Lot Pantalons / Jeans / Shorts', baseUnitPrice: 4.8, avgNewUnitPrice: 24 },
  { category: 'Lot Robes / Salopettes / Ensembles', baseUnitPrice: 5.8, avgNewUnitPrice: 28 },
  { category: 'Lot Bodies / Pyjamas / Dors-bien', baseUnitPrice: 3.2, avgNewUnitPrice: 15 },
  { category: 'Manteau / Doudoune / Pilote', baseUnitPrice: 11.0, avgNewUnitPrice: 45 },
  { category: 'Pull / Gilet / Sweat / Marinière', baseUnitPrice: 6.5, avgNewUnitPrice: 26 },
  { category: 'Robe / Salopette / Ensemble', baseUnitPrice: 8.0, avgNewUnitPrice: 32 },
];

export const BRAND_CATALOG: BrandInfo[] = [
  // Premium & Créateurs
  { name: 'Bonpoint', tier: 'premium', tierLabel: 'Luxe & Créateur', multiplier: 2.2 },
  { name: 'Tartine et Chocolat', tier: 'premium', tierLabel: 'Luxe & Créateur', multiplier: 1.95 },
  { name: 'Bonton', tier: 'premium', tierLabel: 'Premium Enfant', multiplier: 1.8 },
  { name: 'Jacadi', tier: 'premium', tierLabel: 'Premium Enfant', multiplier: 1.7 },
  { name: 'Cyrillus', tier: 'premium', tierLabel: 'Premium Enfant', multiplier: 1.55 },
  { name: 'Petit Bateau', tier: 'premium', tierLabel: 'Iconique & Recherché', multiplier: 1.45 },
  { name: 'Catimini', tier: 'premium', tierLabel: 'Premium Enfant', multiplier: 1.5 },
  { name: 'Ralph Lauren Kids', tier: 'premium', tierLabel: 'Premium Enfant', multiplier: 1.75 },
  // Milieu de gamme supérieur
  { name: 'Boden / Mini Boden', tier: 'mid-plus', tierLabel: 'Milieu de gamme +', multiplier: 1.35 },
  { name: 'Sergent Major', tier: 'mid-plus', tierLabel: 'Milieu de gamme +', multiplier: 1.15 },
  { name: 'Vertbaudet', tier: 'mid-plus', tierLabel: 'Milieu de gamme +', multiplier: 1.12 },
  { name: 'Zara Kids', tier: 'mid-plus', tierLabel: 'Tendance & Recherché', multiplier: 1.18 },
  { name: 'Okaïdi / Obaïbi', tier: 'mid-plus', tierLabel: 'Classique Enfant', multiplier: 1.05 },
  { name: "Bout'chou (Monoprix)", tier: 'mid-plus', tierLabel: 'Milieu de gamme +', multiplier: 1.18 },
  { name: 'DPAM (Du Pareil au Même)', tier: 'mid-plus', tierLabel: 'Classique Enfant', multiplier: 1.08 },
  { name: 'Absorba', tier: 'mid-plus', tierLabel: 'Spécialiste Bébé', multiplier: 1.12 },
  // Standard / Courant
  { name: "Tape à l'Œil (TAO)", tier: 'standard', tierLabel: 'Courant Vinted', multiplier: 0.95 },
  { name: 'H&M Kids', tier: 'standard', tierLabel: 'Courant Vinted', multiplier: 0.92 },
  { name: 'Orchestra', tier: 'standard', tierLabel: 'Courant Vinted', multiplier: 0.9 },
  { name: 'Name It / Next', tier: 'standard', tierLabel: 'Courant Vinted', multiplier: 0.95 },
  { name: 'Mix Marques (Zara, Okaïdi, H&M)', tier: 'standard', tierLabel: 'Lot Mix Marques', multiplier: 1.0 },
  // Économique
  { name: 'Kiabi', tier: 'eco', tierLabel: 'Petit Prix / Lot', multiplier: 0.75 },
  { name: 'Tex Baby / In Extenso', tier: 'eco', tierLabel: 'Petit Prix / Lot', multiplier: 0.7 },
  { name: 'Lupilu (Lidl)', tier: 'eco', tierLabel: 'Petit Prix / Lot', multiplier: 0.68 },
  { name: 'Mix Crèche / Quotidien', tier: 'eco', tierLabel: 'Lot Économique', multiplier: 0.72 },
];

export const BACKGROUND_PRESETS: {
  id: BackgroundPresetId;
  name: string;
  hex: string;
  innerHex: string;
  borderHex: string;
  description: string;
}[] = [
  {
    id: 'studio-white',
    name: 'Blanc Studio',
    hex: '#F4F6F8',
    innerHex: '#FFFFFF',
    borderHex: '#E2E8F0',
    description: 'Fond blanc pur lumineux type catalogue e-commerce',
  },
  {
    id: 'natural-linen',
    name: 'Lin Naturel',
    hex: '#EFEAE2',
    innerHex: '#F9F6F1',
    borderHex: '#E2D9CC',
    description: 'Fond beige sablé chaleureux très apprécié sur Vinted',
  },
  {
    id: 'pearl-gray',
    name: 'Gris Perle',
    hex: '#E8ECEF',
    innerHex: '#F4F6F8',
    borderHex: '#CBD5E1',
    description: 'Idéal pour faire ressortir un lot de vêtements clairs',
  },
  {
    id: 'warm-ivory',
    name: 'Ivoire Doux',
    hex: '#F6F2EB',
    innerHex: '#FFFDF9',
    borderHex: '#E6DEC8',
    description: 'Atmosphère douce style boutique enfantine',
  },
];

export function getAgeOption(ageInput: string): AgeOption {
  const normalized = ageInput.trim().toLowerCase();
  const exact = AGE_OPTIONS.find(
    (opt) =>
      opt.label.toLowerCase() === normalized ||
      opt.shortLabel.toLowerCase() === normalized ||
      opt.vintedTag.toLowerCase() === normalized
  );
  if (exact) return exact;

  return {
    label: ageInput.trim() || '3 ans',
    shortLabel: (ageInput.trim() || '3A').toUpperCase().slice(0, 6),
    sizeCm: 'Taille standard',
    vintedTag: (ageInput.trim() || '3ans').toLowerCase().replace(/\s+/g, ''),
  };
}

export function resolveBrandInfo(brandName: string): BrandInfo {
  const cleaned = brandName.trim().toLowerCase();
  if (!cleaned) {
    return { name: 'Mix Marques', tier: 'standard', tierLabel: 'Lot Mix Marques', multiplier: 0.95 };
  }

  const match = BRAND_CATALOG.find(
    (b) =>
      b.name.toLowerCase() === cleaned ||
      b.name.toLowerCase().includes(cleaned) ||
      cleaned.includes(b.name.toLowerCase().split(' ')[0])
  );

  if (match) {
    return { ...match, name: brandName.trim() };
  }

  return {
    name: brandName.trim(),
    tier: 'standard',
    tierLabel: 'Marque Standard',
    multiplier: 1.0,
  };
}

export function roundToHalfEuro(value: number): number {
  const clamped = Math.max(2.0, value);
  return Math.round(clamped * 2) / 2;
}

export function calculateRecommendedPrice(params: {
  brand: string;
  condition: ConditionKey;
  category: GarmentCategory;
  age?: string;
  bundleCount?: number;
}): PriceRecommendation {
  const count = Math.max(1, params.bundleCount ?? 6);
  const brandInfo = resolveBrandInfo(params.brand);
  const conditionInfo =
    CONDITION_OPTIONS.find((c) => c.key === params.condition) ?? CONDITION_OPTIONS[2];
  const categoryInfo =
    GARMENT_CATEGORIES.find((c) => c.category === params.category) ?? GARMENT_CATEGORIES[0];

  const ageMultiplier =
    params.age && (params.age.includes('ans') || params.age.includes('24')) ? 1.06 : 1.0;

  const singleUnitPrice =
    categoryInfo.baseUnitPrice * brandInfo.multiplier * conditionInfo.multiplier * ageMultiplier;

  const unitValueSum = roundToHalfEuro(singleUnitPrice * count);

  // Progressive Vinted bundle discount: 5-10 item lots get a 22% to 30% discount vs individual units
  const bundleDiscountFactor =
    count === 1 ? 1.0 : count <= 4 ? 0.82 : count <= 7 ? 0.76 : 0.7;

  const recommendedPrice = roundToHalfEuro(singleUnitPrice * count * bundleDiscountFactor);
  const pricePerPiece = Number((recommendedPrice / count).toFixed(2));
  const fastSalePrice = roundToHalfEuro(Math.max(3.0, recommendedPrice * 0.82));
  const estimatedNewPrice = Math.round(
    categoryInfo.avgNewUnitPrice * brandInfo.multiplier * count
  );

  const rationale =
    count > 1
      ? `Lot de ${count} pièces « ${brandInfo.name} » (${brandInfo.tierLabel}) en ${params.condition} : ${recommendedPrice.toFixed(2).replace('.', ',')} € le lot complet soit ${pricePerPiece.toFixed(2).replace('.', ',')} €/pièce (valeur neuve du lot ~${estimatedNewPrice} €).`
      : `Pièce « ${brandInfo.name} » (${brandInfo.tierLabel}) en ${params.condition} (valeur neuve ~${estimatedNewPrice} €).`;

  return {
    recommendedPrice,
    pricePerPiece,
    fastSalePrice,
    unitValueSum,
    estimatedNewPrice,
    brandTierLabel: brandInfo.tierLabel,
    rationale,
  };
}

export function generateDefaultBundleItems(
  count: number,
  category: GarmentCategory,
  brand: string,
  age: string
): string[] {
  const safeCount = Math.max(1, Math.min(15, count));
  const templatesByCat: Record<string, string[]> = {
    'Lot complet multi-pièces (Hauts + Bas)': [
      `Pull / Marinière en maille coton doux (${brand})`,
      `Salopette ou pantalon confortable taille ajustable`,
      `T-shirt manches longues 100% coton`,
      `Gilet / Cardigan boutonné de mi-saison`,
      `Jean souple ou pantalon en toile`,
      `Sweat-shirt molletonné doux`,
      `Blouse ou chemise légère à col soigné`,
      `Pantalon legging ou jogging souple`,
      `T-shirt imprimé en coton bio`,
      `Gilet sans manches ou veste douce`,
    ],
    'Lot Robes / Salopettes / Ensembles': [
      `Robe imprimée fleurie à manches longues (${brand})`,
      `Robe col Claudine en popeline de coton`,
      `Cardigan tricot maille torsadée assorti`,
      `Blouse brodée à col festonné`,
      `Gilet matelassé sans manches réversible`,
      `Legging côtelé doux assorti`,
      `Body à col volanté en coton`,
      `Body manches courtes maille côtelée`,
      `Salopette courte en velours souple`,
      `Ensemble tunique + bloomer assorti`,
    ],
    'Lot Bodies / Pyjamas / Dors-bien': [
      `Pyjama dors-bien en velours tout doux (${brand})`,
      `Pyjama 2 pièces en coton bio`,
      `Body manches longues croisé devant`,
      `Body manches longues à pressions entrejambe`,
      `Body manches courtes uni 100% coton`,
      `Body manches courtes à petit motif`,
      `Gigoteuse ou surpyjama chaud`,
      `Lot de bavoirs / chaussons assortis`,
      `Pyjama léger été en jersey coton`,
      `Body col américain extensible`,
    ],
  };

  const pool =
    templatesByCat[category] || templatesByCat['Lot complet multi-pièces (Hauts + Bas)'];

  return Array.from({ length: safeCount }, (_, i) => {
    const base = pool[i % pool.length];
    return `${base} — Taille ${age}`;
  });
}

export function generateHashtags(params: {
  age: string;
  brand: string;
  category: GarmentCategory;
  bundleCount?: number;
}): string[] {
  const ageOpt = getAgeOption(params.age);
  const count = params.bundleCount ?? 6;
  const brandSlug = params.brand
    .split('/')[0]
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  const tags = [
    `#lot${ageOpt.vintedTag}`,
    `#${ageOpt.vintedTag}`,
    `#lotvetements${ageOpt.vintedTag}`,
    `#lot${count}pieces`,
    `#enfant${ageOpt.vintedTag}`,
    brandSlug ? `#${brandSlug}` : '#modeenfant',
    brandSlug ? `#lot${brandSlug}` : '#dressingbebe',
    '#vintedenfant',
    '#bonplanvinted',
  ];

  return Array.from(new Set(tags));
}

export function buildDeterministicListing(params: {
  age: string;
  brand: string;
  condition: ConditionKey;
  category?: GarmentCategory;
  bundleCount?: number;
  bundleItemsList?: string[];
  pieceName?: string;
  detectedColor?: string;
  detectedMaterial?: string;
  season?: string;
  visualHighlights?: string;
  customNotes?: string;
}): GeneratedVintedListing {
  const category = params.category ?? 'Lot complet multi-pièces (Hauts + Bas)';
  const count = Math.max(1, params.bundleCount ?? 6);
  const ageOpt = getAgeOption(params.age);
  const brandClean = params.brand.trim() || 'Mix Marques';
  const color = params.detectedColor?.trim() || 'Tons coordonnés & intemporels';
  const material = params.detectedMaterial?.trim() || 'Coton doux, maille & velours';
  const season = params.season?.trim() || 'Toutes saisons / Mi-saison';
  const highlights =
    params.visualHighlights?.trim() ||
    'Lot complet parfaitement coordonné, idéal pour habiller votre enfant à petit prix par pièce';

  const itemsList =
    params.bundleItemsList && params.bundleItemsList.length > 0
      ? params.bundleItemsList
      : generateDefaultBundleItems(count, category, brandClean, ageOpt.label);

  const effectiveCount = itemsList.length || count;

  const condObj =
    CONDITION_OPTIONS.find((c) => c.key === params.condition) ?? CONDITION_OPTIONS[2];

  const pricing = calculateRecommendedPrice({
    brand: brandClean,
    condition: params.condition,
    category,
    age: ageOpt.label,
    bundleCount: effectiveCount,
  });

  const hashtags = generateHashtags({
    age: ageOpt.label,
    brand: brandClean,
    category,
    bundleCount: effectiveCount,
  });

  const titlePrefix =
    effectiveCount > 1
      ? `LOT ${effectiveCount} habits ${ageOpt.label} (${ageOpt.sizeCm})`
      : params.pieceName?.trim() || category.split('/')[0].trim();

  const title =
    effectiveCount > 1
      ? `${titlePrefix} - ${brandClean} - ${params.condition}`
      : `${titlePrefix} ${brandClean} - ${ageOpt.label} (${ageOpt.sizeCm}) - ${params.condition}`;

  const numberedArticles = itemsList
    .map((line, idx) => `${idx + 1}. ${line}`)
    .join('\n');

  const notesLine = params.customNotes?.trim()
    ? `\n• Précision : ${params.customNotes.trim()}`
    : '';

  const description = [
    `Grand lot de ${effectiveCount} vêtements enfant taille ${ageOpt.label} (équivalent ${ageOpt.sizeCm}) — Marque(s) : ${brandClean}.`,
    `Prix mini : revient à seulement ${pricing.pricePerPiece.toFixed(2).replace('.', ',')} € par vêtement !`,
    '',
    `Détail des ${effectiveCount} articles visibles sur la photo globale :`,
    numberedArticles,
    '',
    `Caractéristiques du lot :`,
    `• Taille : ${ageOpt.label} (${ageOpt.sizeCm})`,
    `• Marque(s) : ${brandClean} (${pricing.brandTierLabel})`,
    `• État général : ${params.condition} — ${condObj.vintedDesc}`,
    `• Couleurs & Matières : ${color} · ${material}`,
    `• Saison : ${season}`,
    `• Atout du lot : ${highlights}${notesLine}`,
    '',
    `Maison non-fumeur, linge propre lavé avec lessive douce hypoallergénique.`,
    `Envoi rapide et soigné sous 24/48h (1 seul frais de port pour les ${effectiveCount} pièces !).`,
    `D'autres lots de 5 à 10 habits classés par âge sont disponibles dans mon dressing (${hashtags[0]}).`,
    '',
    hashtags.join(' '),
  ].join('\n');

  return {
    title,
    description,
    hashtags,
    category,
    bundleCount: effectiveCount,
    bundleItemsList: itemsList,
    detectedColor: color,
    detectedMaterial: material,
    season,
    visualHighlights: highlights,
    pricing,
  };
}

export function formatListingForClipboard(item: BatchGarmentItem): string {
  return [
    `TITRE DU LOT VINTED :`,
    item.listing.title,
    ``,
    `PRIX DU LOT CONSEILLÉ : ${item.listing.pricing.recommendedPrice.toFixed(2).replace('.', ',')} € (soit ${item.listing.pricing.pricePerPiece.toFixed(2).replace('.', ',')} €/pièce · Vente rapide : ${item.listing.pricing.fastSalePrice.toFixed(2).replace('.', ',')} €)`,
    ``,
    `DESCRIPTION COMPLÈTE DES ${item.listing.bundleCount} ARTICLES :`,
    item.listing.description,
  ].join('\n');
}

export function exportBatchToCsv(items: BatchGarmentItem[]): string {
  const headers = [
    'ID',
    'Fichier',
    'Titre du Lot Vinted',
    'Nb Articles dans le Lot',
    'Age',
    'Taille CM',
    'Marques',
    'Etat',
    'Prix du Lot Conseille (EUR)',
    'Prix par Piece (EUR)',
    'Prix Vente Rapide (EUR)',
    'Liste des Articles du Lot',
    'Hashtags',
    'Description Complete',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map((item) => {
    const ageOpt = getAgeOption(item.age);
    return [
      item.id,
      item.fileName,
      item.listing.title,
      item.listing.bundleCount,
      item.age,
      ageOpt.sizeCm,
      item.brand,
      item.condition,
      item.listing.pricing.recommendedPrice.toFixed(2),
      item.listing.pricing.pricePerPiece.toFixed(2),
      item.listing.pricing.fastSalePrice.toFixed(2),
      item.listing.bundleItemsList.join(' ; '),
      item.listing.hashtags.join(' '),
      item.listing.description.replace(/\n/g, ' | '),
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headers.map(escapeCsv).join(','), ...rows].join('\n');
}
