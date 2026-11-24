import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { LanguageMode } from '../types/studio';

interface PWAInstallButtonProps {
  lang: LanguageMode;
  variant?: 'compact' | 'prominent';
  showAlreadyInstalledState?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  variant = 'compact',
  showAlreadyInstalledState = false,
}) => {
  const { isInstallable, isInstalled, isNativeApp, isIOS, isAndroid, isInIframe, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled || isNativeApp) {
    if (!showAlreadyInstalledState) {
      return null;
    }
    return (
      <div className="min-h-[48px] w-full px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 font-semibold text-sm flex items-center justify-center gap-2 text-center">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>
          {isNativeApp
            ? lang === 'te'
              ? 'Android యాప్‌లో నడుస్తోంది'
              : 'Running Inside Installed Android App'
            : lang === 'te'
              ? 'యాప్ మీ ఫోన్‌లో ఇప్పటికే ఇన్‌స్టాల్ అయింది'
              : 'App Already Installed on This Device'}
        </span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';

  const buttonLabel = isIOS
    ? lang === 'te'
      ? 'iPhone లో ఇన్‌స్టాల్ (Install App)'
      : 'Install App on iOS'
    : lang === 'te'
      ? variant === 'prominent'
        ? 'యాప్ ఇన్‌స్టాల్ చేయండి (INSTALL APP)'
        : 'యాప్ ఇన్‌స్టాల్'
      : variant === 'prominent'
        ? 'INSTALL APP'
        : 'Install App';

  return (
    <>
      <button
        type="button"
        onClick={() => void handleInstallClick()}
        className={
          variant === 'prominent'
            ? `min-h-[48px] w-full px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors shadow-sm ${
                isInstallable
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950'
              }`
            : `min-h-[34px] px-3 py-1 rounded-lg font-medium text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isInstallable
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                  : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
              }`
        }
      >
        <Smartphone
          className={
            variant === 'prominent'
              ? 'w-4 h-4 shrink-0'
              : 'w-3.5 h-3.5 text-emerald-500 shrink-0'
          }
        />
        <span>{buttonLabel}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'te' ? 'యాప్ ఇన్‌స్టాల్ విధానం' : 'How to Install App'}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/15 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isIOS
                  ? lang === 'te'
                    ? 'iPhone / iPad లో ఇన్‌స్టాల్ చేయండి'
                    : 'Install on iPhone / iPad'
                  : lang === 'te'
                    ? 'Android / Chrome లో యాప్ ఇన్‌స్టాల్ చేయండి'
                    : 'Install on Android Chrome / Desktop'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed list-decimal list-inside">
                <li>
                  {lang === 'te'
                    ? 'Safari బ్రౌజర్ దిగువన ఉన్న Share బటన్ నొక్కండి.'
                    : 'Tap the Share button in the Safari toolbar.'}
                </li>
                <li>
                  {lang === 'te'
                    ? 'కిందికి స్క్రోల్ చేసి "Add to Home Screen" ఎంచుకోండి.'
                    : 'Scroll down and tap "Add to Home Screen".'}
                </li>
                <li>
                  {lang === 'te'
                    ? 'కుడి పైభాగంలో Add నొక్కితే హోమ్ స్క్రీన్‌పై లోగో వస్తుంది.'
                    : 'Tap Add — AI VIDEO MAKER PRO appears on your Home Screen.'}
                </li>
              </ol>
            ) : isInIframe ? (
              <div className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  {lang === 'te'
                    ? 'బ్రౌజర్ సెక్యూరిటీ కారణంగా Preview ఫ్రేమ్ లోపల నుండి నేరుగా ఇన్‌స్టాల్ ప్రాంప్ట్ రాదు. ముందుగా కొత్త Chrome ట్యాబ్‌లో తెరిచి ఆపై ఇన్‌స్టాల్ చేయండి:'
                    : 'Browsers block app installation inside embedded previews. Open the app in a direct Chrome tab first, then install:'}
                </p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>
                    {lang === 'te'
                      ? 'కింది "కొత్త ట్యాబ్‌లో తెరవండి" బటన్ నొక్కండి.'
                      : 'Tap "Open in Browser Tab" below.'}
                  </li>
                  <li>
                    {lang === 'te'
                      ? 'Chrome ⋮ మెనూ → "Install app" లేదా "Add to Home screen" నొక్కండి.'
                      : 'Open Chrome ⋮ menu → tap "Install app" or "Add to Home screen".'}
                  </li>
                </ol>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[42px] w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{lang === 'te' ? 'కొత్త ట్యాబ్‌లో తెరవండి' : 'Open in Browser Tab'}</span>
                </a>
              </div>
            ) : (
              <ol className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed list-decimal list-inside">
                <li>
                  {isAndroid
                    ? lang === 'te'
                      ? 'Android Chrome కుడి పైభాగంలో ఉన్న ⋮ (మూడు చుక్కలు) మెనూ నొక్కండి.'
                      : 'Tap the ⋮ (three dots) menu at the top right of Android Chrome.'
                    : lang === 'te'
                      ? 'బ్రౌజర్ అడ్రస్ బార్‌లోని Install ఐకాన్ లేదా ⋮ మెనూ నొక్కండి.'
                      : 'Click the Install icon in the address bar or open the ⋮ browser menu.'}
                </li>
                <li>
                  {lang === 'te'
                    ? '"Install app" లేదా "Add to Home screen" ఎంచుకోండి.'
                    : 'Select "Install app" or "Add to Home screen".'}
                </li>
                <li>
                  {lang === 'te'
                    ? 'ఇన్‌స్టాల్ నిర్ధారించగానే AI VIDEO MAKER PRO ఐకాన్ హోమ్ స్క్రీన్‌లో యాడ్ అవుతుంది.'
                    : 'Confirm installation to add the AI VIDEO MAKER PRO icon to your Home Screen.'}
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              {lang === 'te' ? 'సరే / మూసివేయండి' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
