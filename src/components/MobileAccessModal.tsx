import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Copy,
  Check,
  Download,
  Share2,
  X,
  ExternalLink,
  Camera,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const DEV_MOBILE_URL =
  'https://ais-dev-7qeivg2zx3cogclkcxmoln-594560326915.europe-west3.run.app';

export const SHARED_MOBILE_URL =
  'https://ais-pre-7qeivg2zx3cogclkcxmoln-594560326915.europe-west3.run.app';

interface MobileAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerCamera: () => void;
}

export const MobileAccessModal: React.FC<MobileAccessModalProps> = ({
  isOpen,
  onClose,
  onTriggerCamera,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [selectedLinkType, setSelectedLinkType] = useState<'dev' | 'shared'>('dev');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const activeUrl =
    selectedLinkType === 'dev' ? DEV_MOBILE_URL : SHARED_MOBILE_URL;

  useEffect(() => {
    QRCode.toDataURL(activeUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [activeUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async (urlToCopy = activeUrl) => {
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
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Atelier Vinted Kids — Studio Lots 5 à 10 Habits',
          text: 'Lien direct pour photographier mes lots de 5 à 10 habits et générer les annonces Vinted :',
          url: activeUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink(activeUrl);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="mobile-modal-title" className="text-base font-bold text-slate-900">
                Ouvrir l’Application sur votre Téléphone
              </h2>
              <p className="text-xs text-slate-500">
                2 liens disponibles selon comment votre téléphone est connecté
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre d'accès mobile"
            className="min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Why the link might block + 2-Step Fix */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-800 space-y-1">
              <p className="font-bold text-slate-900">
                Pourquoi le lien ne s’ouvrait pas sur votre portable ?
              </p>
              <p>
                Par sécurité, Google AI Studio bloque l’accès mobile tant que l’une de ces 2 conditions n’est pas remplie :
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>
                  <strong>Option A (Immédiate — Lien 1 ci-dessous)</strong> : Utilisez le lien <code>ais-dev</code> sur votre téléphone en étant connecté à votre compte Google (<strong>YAMJUD23</strong>) dans Safari ou Chrome.
                </li>
                <li>
                  <strong>Option B (Lien public sans connexion — Lien 2 ci-dessous)</strong> : Cliquez d’abord sur le bouton <strong>« Partager / Share »</strong> (ou <strong>« Déployer / Deploy »</strong>) tout en haut à droite de la page Google AI Studio sur votre ordinateur pour déverrouiller le lien public <code>ais-pre</code>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Selector between Link 1 (Dev Direct) and Link 2 (Shared Pre) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedLinkType('dev')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedLinkType === 'dev'
                ? 'bg-teal-50/80 border-teal-700 ring-1 ring-teal-700'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Lien 1 : Direct (ais-dev)
              </span>
              <ShieldCheck className="w-4 h-4 text-teal-700" />
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Actif immédiatement avec votre compte (YAMJUD23)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedLinkType('shared')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedLinkType === 'shared'
                ? 'bg-teal-50/80 border-teal-700 ring-1 ring-teal-700'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Lien 2 : Partagé (ais-pre)
              </span>
              <Share2 className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Actif après avoir cliqué sur « Share / Partager » en haut à droite d’AI Studio
            </p>
          </button>
        </div>

        {/* Direct Link & QR Code */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="sm:col-span-5 flex flex-col items-center justify-center bg-white p-3 rounded-xl border border-slate-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code pour ouvrir Atelier Vinted Kids sur mobile"
                referrerPolicy="no-referrer"
                className="w-36 h-36 object-contain"
              />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                QR Code...
              </div>
            )}
            <span className="text-[11px] font-medium text-slate-500 mt-1.5 text-center">
              QR Code ({selectedLinkType === 'dev' ? 'Lien 1 Direct' : 'Lien 2 Partagé'})
            </span>
          </div>

          <div className="sm:col-span-7 space-y-3">
            <div>
              <span className="block text-xs font-semibold text-slate-800">
                {selectedLinkType === 'dev'
                  ? 'Lien 1 — Session directe (recommandé) :'
                  : 'Lien 2 — Lien partagé public :'}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {selectedLinkType === 'dev'
                  ? 'Ouvrez ce lien dans Chrome ou Safari (session YAMJUD23) :'
                  : 'Assurez-vous d’avoir activé le bouton « Share » en haut à droite d’AI Studio :'}
              </p>
            </div>

            <div className="p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-teal-800 break-all select-all">
              {activeUrl}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyLink(activeUrl)}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" /> Lien copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copier ce lien
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Envoyer
              </button>

              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir
              </a>
            </div>
          </div>
        </div>

        {/* PWA Home Screen Installation */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Installer l’application sur mon écran d’accueil
            </button>
          )}

          {!isInstalled && !isInstallable && (
            <button
              type="button"
              onClick={() => setShowIOSInstructions(!showIOSInstructions)}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-teal-700" />
              {isIOS
                ? 'Installer sur mon iPhone (Ajouter sur l’écran d’accueil)'
                : 'Astuce : Ajouter l’icône sur l’écran d’accueil du téléphone'}
            </button>
          )}

          {showIOSInstructions && (
            <div className="w-full p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                Pour avoir l’application comme une vraie app sur votre téléphone :
              </p>
              <p>
                • <strong>Sur iPhone (Safari)</strong> : appuyez sur le bouton <strong>Partager</strong> en bas, puis sur <strong>« Sur l’écran d’accueil »</strong>.
              </p>
              <p>
                • <strong>Sur Android (Chrome)</strong> : appuyez sur le menu <strong>⋮</strong> en haut à droite, puis sur <strong>« Installer l’application »</strong>.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onTriggerCamera();
            }}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            Tester la prise de photo d’un lot maintenant
          </button>
        </div>
      </div>
    </div>
  );
};
