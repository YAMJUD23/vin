import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAgeOption,
  resolveBrandInfo,
  calculateRecommendedPrice,
  buildDeterministicListing,
  exportBatchToCsv,
  type BatchGarmentItem,
} from './vintedEngine';

test('getAgeOption maps standard French kids age labels to cm sizes and Vinted tags', () => {
  const threeYears = getAgeOption('3 ans');
  assert.equal(threeYears.shortLabel, '3A');
  assert.equal(threeYears.sizeCm, '98 cm');
  assert.equal(threeYears.vintedTag, '3ans');
});

test('resolveBrandInfo differentiates premium brands from budget brands', () => {
  const jacadi = resolveBrandInfo('Jacadi');
  const kiabi = resolveBrandInfo('Kiabi');
  assert.equal(jacadi.tier, 'premium');
  assert.equal(kiabi.tier, 'eco');
  assert.ok(jacadi.multiplier > kiabi.multiplier);
});

test('calculateRecommendedPrice computes bundle total price and per-piece price for 6-item and 8-item lots', () => {
  const bundle6 = calculateRecommendedPrice({
    brand: 'Petit Bateau',
    condition: 'Très bon état',
    category: 'Lot complet multi-pièces (Hauts + Bas)',
    age: '3 ans',
    bundleCount: 6,
  });

  assert.ok(bundle6.recommendedPrice > 10);
  assert.ok(bundle6.pricePerPiece > 1.5);
  assert.ok(bundle6.recommendedPrice < bundle6.unitValueSum); // Bundle discount applied
});

test('buildDeterministicListing generates numbered itemized list for a 6-garment bundle', () => {
  const customItems = [
    'Pull marinière rayé bleu marine et blanc',
    'Salopette velours côtelé camel',
    'T-shirt blanc 100% coton',
    'Gilet maille tricot vert sauge',
    'Jean droit brut confortable',
    'Sweat molleton beige chiné',
  ];

  const listing = buildDeterministicListing({
    age: '3 ans',
    brand: 'Petit Bateau / Zara',
    condition: 'Très bon état',
    category: 'Lot complet multi-pièces (Hauts + Bas)',
    bundleCount: 6,
    bundleItemsList: customItems,
  });

  assert.ok(listing.title.includes('LOT 6 habits 3 ans (98 cm)'));
  assert.equal(listing.bundleCount, 6);
  assert.equal(listing.bundleItemsList.length, 6);
  assert.ok(listing.description.includes('1. Pull marinière rayé bleu marine et blanc'));
  assert.ok(listing.description.includes('6. Sweat molleton beige chiné'));
  assert.ok(listing.hashtags.includes('#lot3ans'));
});

test('exportBatchToCsv outputs bundle count, price per piece, and itemized list', () => {
  const listing = buildDeterministicListing({
    age: '18 mois',
    brand: 'Jacadi / Cyrillus',
    condition: 'Très bon état',
    category: 'Lot Robes / Salopettes / Ensembles',
    bundleCount: 8,
  });

  const item: BatchGarmentItem = {
    id: 'lot-8',
    originalImageUrl: '/sample.jpg',
    fileName: 'lot_8_habits_18mois.jpg',
    age: '18 mois',
    brand: 'Jacadi / Cyrillus',
    condition: 'Très bon état',
    category: 'Lot Robes / Salopettes / Ensembles',
    bundleCount: 8,
    status: 'ready',
    listing,
    createdAt: 1700000000000,
    detourageStrength: 65,
  };

  const csv = exportBatchToCsv([item]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('"Nb Articles dans le Lot"'));
  assert.ok(lines[1].includes('"8"'));
});
