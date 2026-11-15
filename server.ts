import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildDeterministicListing,
  calculateRecommendedPrice,
  type ConditionKey,
  type GarmentCategory,
} from './src/utils/vintedEngine.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(getGenAIClient()),
    });
  });

  app.post('/api/analyze-garment', async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/jpeg',
        age = '3 ans',
        brand = 'Petit Bateau / Zara',
        condition = 'Très bon état',
        categoryHint,
        bundleCount = 6,
        customNotes = '',
      } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        age?: string;
        brand?: string;
        condition?: ConditionKey;
        categoryHint?: GarmentCategory;
        bundleCount?: number;
        customNotes?: string;
      };

      const ai = getGenAIClient();

      if (!ai || !imageBase64) {
        const fallback = buildDeterministicListing({
          age,
          brand,
          condition: condition || 'Très bon état',
          category: categoryHint,
          bundleCount,
          customNotes,
        });
        return res.json({
          listing: fallback,
          source: 'smart-catalog',
        });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

      const basePricing = calculateRecommendedPrice({
        brand,
        condition: condition || 'Très bon état',
        category: categoryHint || 'Lot complet multi-pièces (Hauts + Bas)',
        age,
        bundleCount,
      });

      const prompt = `Tu es un expert en vente de LOTS de vêtements enfant (5 à 10 habits par photo) sur Vinted France.
Analyse cette photo globale d'un lot de vêtements enfant avec les informations suivantes :
- Âge / Taille du lot : ${age}
- Marque(s) indiquée(s) : ${brand}
- État : ${condition}
- Nombre d'articles annoncé dans le lot : environ ${bundleCount} pièces
${customNotes ? `- Précision vendeur : ${customNotes}` : ''}

Instructions importantes :
1. Observe tous les vêtements présents sur cette photo globale (de gauche à droite et de haut en bas).
2. Liste chaque vêtement individuellement dans "bundleItemsList" (ex: "Pull marinière rayé bleu marine et blanc en maille coton", "Salopette en velours côtelé camel à bretelles", "T-shirt col rond blanc 100% coton", etc.). S'il y a entre 5 et 10 vêtements sur la photo, décris chacun d'eux précisément.
3. Indique le nombre exact d'articles détectés dans "detectedCount".
4. Rédige un titre de lot Vinted ultra-attractif (ex: "LOT 6 habits ${age} - ${brand} - ${condition}") et une description complète prête à copier-coller incluant la liste numérotée de tous les articles du lot et le prix de revient par pièce.
5. Propose un prix conseillé global pour le lot en euros (base indicative : ${basePricing.recommendedPrice} € pour le lot complet).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedCount: {
                type: Type.INTEGER,
                description: 'Nombre de vêtements visibles dans le lot sur la photo',
              },
              bundleItemsList: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: 'Description individuelle de chacun des 5 à 10 vêtements visibles sur la photo',
              },
              detectedColor: {
                type: Type.STRING,
                description: 'Palette de couleurs dominante du lot',
              },
              detectedMaterial: {
                type: Type.STRING,
                description: 'Matières principales observées dans le lot',
              },
              season: {
                type: Type.STRING,
                description: 'Saison idéale du lot',
              },
              visualHighlights: {
                type: Type.STRING,
                description: 'Points forts visuels du lot',
              },
              title: {
                type: Type.STRING,
                description: 'Titre optimisé Vinted pour le lot',
              },
              recommendedPrice: {
                type: Type.NUMBER,
                description: 'Prix conseillé total du lot en euros',
              },
            },
            required: [
              'detectedCount',
              'bundleItemsList',
              'detectedColor',
              'detectedMaterial',
              'season',
              'visualHighlights',
              'title',
              'recommendedPrice',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const itemsArray =
        Array.isArray(parsed.bundleItemsList) && parsed.bundleItemsList.length > 0
          ? parsed.bundleItemsList
          : undefined;
      const finalCount = itemsArray ? itemsArray.length : parsed.detectedCount || bundleCount;

      const baseListing = buildDeterministicListing({
        age,
        brand,
        condition: condition || 'Très bon état',
        category: categoryHint || 'Lot complet multi-pièces (Hauts + Bas)',
        bundleCount: finalCount,
        bundleItemsList: itemsArray,
        detectedColor: parsed.detectedColor,
        detectedMaterial: parsed.detectedMaterial,
        season: parsed.season,
        visualHighlights: parsed.visualHighlights,
        customNotes,
      });

      const aiPrice =
        typeof parsed.recommendedPrice === 'number' && parsed.recommendedPrice >= 3
          ? Math.round(parsed.recommendedPrice * 2) / 2
          : baseListing.pricing.recommendedPrice;

      const pricePerPiece = Number((aiPrice / Math.max(1, finalCount)).toFixed(2));

      const finalListing = {
        ...baseListing,
        title: parsed.title || baseListing.title,
        pricing: {
          ...baseListing.pricing,
          recommendedPrice: aiPrice,
          pricePerPiece,
          fastSalePrice: Math.max(3, Math.round(aiPrice * 0.82 * 2) / 2),
        },
      };

      return res.json({
        listing: finalListing,
        source: 'gemini-vision',
      });
    } catch (error) {
      const {
        age = '3 ans',
        brand = 'Petit Bateau / Zara',
        condition = 'Très bon état',
        categoryHint,
        bundleCount = 6,
        customNotes = '',
      } = req.body || {};

      const fallback = buildDeterministicListing({
        age,
        brand,
        condition,
        category: categoryHint,
        bundleCount,
        customNotes,
      });

      return res.json({
        listing: fallback,
        source: 'smart-catalog-fallback',
        warning: error instanceof Error ? error.message : 'Fallback catalogue utilisé',
      });
    }
  });

  app.post('/api/beautify-photo', async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/jpeg',
        bundleCount = 6,
      } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        bundleCount?: number;
      };

      const ai = getGenAIClient();
      if (!ai || !imageBase64) {
        return res.status(400).json({
          ok: false,
          error: 'Image ou clé IA manquante',
        });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

      // Use gemini-4-hydrogen Vision to detect exact garment bounding boxes & labels
      // so the studio engine can isolate, center, and number every piece cleanly (#1 to #N)
      const visionPrompt = `Tu es un directeur artistique photo spécialisé dans la mise en valeur de lots de vêtements enfant sur Vinted.
Observe cette photo contenant environ ${bundleCount} vêtements enfant.
Repère chaque vêtement individuellement (de gauche à droite et de haut en bas) et renvoie pour chacun :
- Ses coordonnées normalisées entre 0 et 1 (ymin, xmin, ymax, xmax) englobant le vêtement.
- Son nom court (max 20 caractères, ex: "Marinière coton", "Salopette camel", "Cardigan maille", "T-shirt blanc").
Indique aussi si les vêtements semblent mal alignés ou froissés ("needsGridAlignment": true si une présentation en Grille Catalogue Alignée #1 à #N mettra mieux les habits en valeur).`;

      const visionResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            { text: visionPrompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              needsGridAlignment: {
                type: Type.BOOLEAN,
              },
              garmentBoxes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ymin: { type: Type.NUMBER },
                    xmin: { type: Type.NUMBER },
                    ymax: { type: Type.NUMBER },
                    xmax: { type: Type.NUMBER },
                    label: { type: Type.STRING },
                  },
                  required: ['ymin', 'xmin', 'ymax', 'xmax', 'label'],
                },
              },
            },
            required: ['needsGridAlignment', 'garmentBoxes'],
          },
        },
      });

      const parsed = JSON.parse((visionResponse.text ?? '{}').trim());
      return res.json({
        ok: true,
        needsGridAlignment: Boolean(parsed.needsGridAlignment),
        garmentBoxes: Array.isArray(parsed.garmentBoxes) ? parsed.garmentBoxes : [],
        source: 'gemini-vision-studio',
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Erreur de mise en valeur IA',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier Vinted Kids server running on http://localhost:${PORT}`);
  });
}

startServer();
