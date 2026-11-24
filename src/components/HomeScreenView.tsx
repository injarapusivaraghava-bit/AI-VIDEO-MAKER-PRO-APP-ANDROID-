import React, { useState } from 'react';
import {
  Clapperboard,
  Smartphone,
  Image as ImageIcon,
  Mic,
  BookOpen,
  Gamepad2,
  Sparkles,
  Bot,
  FolderKanban,
  ArrowRight,
  CheckCircle2,
  Server,
  HardDrive,
  Download,
  FileJson,
  Loader2,
  Film,
  PackageCheck,
  Share2,
  Copy,
  Check,
  Info,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  APP_LOGO_URL,
  AndroidProjectStatusInfo,
  ApkStatusInfo,
  LanguageMode,
  SavedAssetItem,
  UsageStats,
  VideoProject,
} from '../types/studio';
import { PWAInstallButton } from './PWAInstallButton';
import { detectBestVideoExportCodec, getWhatsAppShareUrl } from '../utils/shareUtils';
import { AiServiceConnectionState, resolveApiUrl } from '../utils/apiClient';

interface HomeScreenViewProps {
  lang: LanguageMode;
  usageStats: UsageStats;
  projectCount: number;
  gameCount: number;
  apkStatus: ApkStatusInfo | null;
  androidProjectStatus: AndroidProjectStatusInfo | null;
  aiServiceStatus: AiServiceConnectionState;
  currentProject: VideoProject;
  assets: SavedAssetItem[];
  isExportingVideo: boolean;
  exportProgress: number;
  onDownloadVideo: () => Promise<void>;
  onDownloadProject: (project?: VideoProject) => void;
  onStartLongVideo: () => void;
  onStartShortsVideo: () => void;
  onOpenTool: (
    tool: 'video' | 'auto' | 'photo' | 'audio' | 'game' | 'story' | 'assistant' | 'drive'
  ) => void;
  onOpenProjects: () => void;
  onOpenAdmin?: () => void;
}

export const HomeScreenView: React.FC<HomeScreenViewProps> = ({
  lang,
  usageStats,
  projectCount,
  gameCount,
  apkStatus,
  androidProjectStatus,
  aiServiceStatus,
  currentProject,
  assets,
  isExportingVideo,
  exportProgress,
  onDownloadVideo,
  onDownloadProject,
  onStartLongVideo,
  onStartShortsVideo,
  onOpenTool,
  onOpenProjects,
  onOpenAdmin,
}) => {
  const latestPhoto = assets.find((a) => a.type === 'photo' && Boolean(a.dataUrl));
  const latestAudioAsset = assets.find((a) => a.type === 'audio' && Boolean(a.dataUrl));
  const sceneWithAudio = currentProject.scenes.find((s) => Boolean(s.audioBase64));

  const readyAudioUrl = latestAudioAsset?.dataUrl
    ? latestAudioAsset.dataUrl
    : sceneWithAudio?.audioBase64
      ? `data:${sceneWithAudio.audioMimeType || 'audio/wav'};base64,${sceneWithAudio.audioBase64}`
      : null;

  const readyAudioLabel = latestAudioAsset?.title
    ? latestAudioAsset.title
    : sceneWithAudio?.title || 'AI Voiceover';

  const videoCodecExt = detectBestVideoExportCodec().ext.toUpperCase();
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [apkNoticeHighlighted, setApkNoticeHighlighted] = useState(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';

  const sharedWebUrl = (() => {
    const defaultPublicUrl = 'https://ais-pre-aycbu3rqtejs6igwe3cvgw-130060079220.asia-southeast1.run.app';
    if (typeof window === 'undefined') return defaultPublicUrl;
    const { protocol, hostname, origin } = window.location;
    if (
      (protocol === 'https:' || protocol === 'http:') &&
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1'
    ) {
      return origin;
    }
    return defaultPublicUrl;
  })();

  const liveApkShareUrl =
    apkStatus?.available && apkStatus.downloadUrl
      ? apkStatus.downloadUrl.startsWith('http')
        ? apkStatus.downloadUrl
        : `${sharedWebUrl}${apkStatus.downloadUrl.startsWith('/') ? '' : '/'}${apkStatus.downloadUrl}`
      : null;

  const promoAppLink = liveApkShareUrl || sharedWebUrl;

  const promoShareMessage = [
    '🎬 AI VIDEO MAKER PRO',
    '',
    'వీడియో, ఫోటో, ఆడియో, AI కథలు, Shorts, Long Videos, AI Game Creation అన్నీ ఒకే యాప్లో!',
    '',
    liveApkShareUrl ? '📥 యాప్ APK డౌన్లోడ్:' : '📥 యాప్ ఓపెన్ / ఇన్‌స్టాల్ లింక్:',
    promoAppLink,
    '',
    'AI VIDEO MAKER PRO – Create Everything with AI!',
  ].join('\n');

  const handleCopyPromo = async () => {
    try {
      await navigator.clipboard.writeText(promoShareMessage);
      setCopiedPromo(true);
      setTimeout(() => setCopiedPromo(false), 2000);
    } catch {}
  };

  const scrollToApkSection = () => {
    const el = document.getElementById('apk-download-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUnbuiltApkButtonClick = () => {
    setApkNoticeHighlighted(true);
    const buildBox = document.getElementById('apk-build-guide-box');
    if (buildBox) {
      buildBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const quickTools = [
    {
      id: 'video' as const,
      icon: <Clapperboard className="w-5 h-5 text-amber-500" />,
      titleTe: 'AI వీడియో మేకర్ & ఎడిటర్',
      titleEn: 'AI Video Maker & Editor',
      descTe: 'కట్, ట్రిమ్, స్ప్లిట్, మెర్జ్, రొటేట్, క్రాప్, స్లో/ఫాస్ట్ మోషన్, సబ్టైటిల్స్ & MP4.',
      descEn: 'Cut, trim, split, merge, rotate, crop, slow/fast motion, 9:16 / 16:9 / 1:1 & MP4 export.',
    },
    {
      id: 'auto' as const,
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      titleTe: 'AI ఆటోమేటిక్ వీడియో క్రియేటర్',
      titleEn: 'AI Automatic Creator',
      descTe: 'ఒకే ప్రాంప్ట్ తో కథ, సీన్లు, AI వాయిస్, సంగీతం & టైమ్‌లైన్ ఆటోమేటిక్ తయారీ.',
      descEn: 'One prompt builds Story, Scenes, Image Prompts, Telugu/English Voice & Timeline.',
    },
    {
      id: 'photo' as const,
      icon: <ImageIcon className="w-5 h-5 text-sky-500" />,
      titleTe: 'AI ఫొటో, పోస్టర్ & కొలాజ్',
      titleEn: 'AI Photo, Poster & Collage',
      descTe: 'SVG ఆర్ట్, ఫొటో ఎడిటర్, కొలాజ్, బ్యాక్‌గ్రౌండ్ మార్పు, థంబ్‌నెయిల్స్ & లోగో.',
      descEn: 'Vector-to-PNG art, collages, BG replace, YouTube thumbnails & App logo stamp.',
    },
    {
      id: 'audio' as const,
      icon: <Mic className="w-5 h-5 text-emerald-500" />,
      titleTe: 'AI వాయిస్, ఆడియో & SFX',
      titleEn: 'AI Voice, Audio & SFX',
      descTe: 'తెలుగు/ఇంగ్లీష్ మేల్/ఫిమేల్ వాయిస్, మైక్ రికార్డ్, వీడియో ఆడియో ఎక్స్‌ట్రాక్ట్.',
      descEn: 'Telugu & English AI voices, mic rec, video-to-audio extract, EQ & SFX pad.',
    },
    {
      id: 'game' as const,
      icon: <Gamepad2 className="w-5 h-5 text-rose-500" />,
      titleTe: 'AI 2D గేమ్ మేకర్ స్టూడియో',
      titleEn: 'AI Game Maker Studio',
      descTe: 'రేసింగ్, ప్లాట్‌ఫారమ్, పజిల్ & క్విజ్ గేమ్‌లు సృష్టించి ఇక్కడే ఆడండి & సేవ్ చేయండి.',
      descEn: 'Create & play 2D Racing, Platformer, Puzzle & Quiz games and export HTML.',
    },
    {
      id: 'story' as const,
      icon: <BookOpen className="w-5 h-5 text-violet-500" />,
      titleTe: 'తెలుగు & ఇంగ్లీష్ కథల స్టూడియో',
      titleEn: 'AI Story Studio',
      descTe: 'పిల్లల, కార్టూన్, యాక్షన్, కామెడీ, పల్లెటూరి & నీతి కథలతో వీడియో చేయండి.',
      descEn: 'Kids, Cartoon, Action, Comedy & Moral stories with one-click video conversion.',
    },
    {
      id: 'assistant' as const,
      icon: <Bot className="w-5 h-5 text-cyan-500" />,
      titleTe: 'AI క్రియేటర్ అసిస్టెంట్',
      titleEn: 'AI Assistant & Planner',
      descTe: 'వీడియో, ఆడియో లేదా గేమ్ ప్లాన్ కోసం తెలుగు/ఇంగ్లీష్ లో సహాయం పొందండి.',
      descEn: 'Ask workflow questions in Telugu or English and jump straight into any tool.',
    },
    {
      id: 'drive' as const,
      icon: <HardDrive className="w-5 h-5 text-amber-500" />,
      titleTe: 'Google Drive క్లౌడ్ స్టోరేజ్',
      titleEn: 'Google Drive Cloud Sync',
      descTe: 'వీడియోలు, ఫొటోలు & వాయిస్ ఫైళ్లను Drive నుండి ఇంపోర్ట్ / సేవ్ చేయండి.',
      descEn: 'Import photos/audio from Google Drive and back up your studio exports.',
    },
    {
      id: 'projects' as const,
      icon: <FolderKanban className="w-5 h-5 text-indigo-500" />,
      titleTe: 'ప్రాజెక్టులు & మీడియా హిస్టరీ',
      titleEn: 'Projects & Asset History',
      descTe: `${projectCount} వీడియోలు · ${gameCount} గేమ్‌లు సేవ్ చేయబడ్డాయి.`,
      descEn: `${projectCount} videos · ${gameCount} games · photos, audio & downloads history.`,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-5 sm:gap-7">
      {/* 1. Hero Section: Prominent Centered Logo at Top + App Name Below Logo */}
      <section className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl px-4 py-6 sm:p-8 flex flex-col items-center text-center gap-4">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-xl overflow-hidden flex items-center justify-center shrink-0">
          <img
            src={APP_LOGO_URL}
            alt="AI VIDEO MAKER PRO Logo"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="max-w-2xl flex flex-col items-center gap-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance">
            AI VIDEO MAKER PRO
          </h1>
          <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
            {lang === 'te'
              ? 'మీ ఆరోగ్యం – మా ప్రాధాన్యత · Create Everything with AI'
              : 'Create Everything with AI · Bilingual Telugu & English Studio'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {lang === 'te'
              ? 'వీడియో, ఫోటో, ఆడియో, AI కథలు, YouTube షార్ట్స్ (9:16), లాంగ్ వీడియోలు (16:9) & 2D గేమ్‌లు అన్నీ ఒకే మొబైల్ యాప్‌లో.'
              : 'Video Maker & Editor, YouTube Shorts (9:16), Long Videos (16:9), Photo & Collage, Telugu/English AI Voice, Story Studio & 2D Game Maker.'}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            <span>
              {lang === 'te' ? 'ప్రాజెక్టులు:' : 'Projects:'}{' '}
              <strong className="text-slate-900 dark:text-slate-100">{projectCount}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lang === 'te' ? 'గేమ్‌లు:' : 'Games:'}{' '}
              <strong className="text-slate-900 dark:text-slate-100">{gameCount}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lang === 'te' ? 'ఎగుమతులు:' : 'Exports:'}{' '}
              <strong className="text-amber-500">{usageStats.totalExports}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl pt-2">
          <button
            type="button"
            onClick={scrollToApkSection}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{lang === 'te' ? 'DOWNLOAD APK / యాప్' : 'DOWNLOAD APK'}</span>
          </button>

          <button
            type="button"
            onClick={onStartShortsVideo}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>{lang === 'te' ? '9:16 షార్ట్ వీడియో' : 'Create 9:16 Short'}</span>
          </button>

          <button
            type="button"
            onClick={onStartLongVideo}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Clapperboard className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{lang === 'te' ? '16:9 లాంగ్ వీడియో' : 'Create 16:9 Long Video'}</span>
          </button>
        </div>
      </section>

      {/* 2. Clearly Visible ANDROID APK DOWNLOAD & INSTALL APP Sections */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card A: ANDROID APK DOWNLOAD */}
        <div
          id="apk-download-section"
          className="lg:col-span-6 bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4"
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>ANDROID APK DOWNLOAD</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'te'
                    ? 'Android మొబైల్ APK బిల్డ్ & ప్రాజెక్ట్ ఎగుమతి విభాగం'
                    : 'Real Android APK installer & Capacitor Android Studio project'}
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                {apkStatus === null
                  ? lang === 'te'
                    ? 'పరిశీలిస్తోంది...'
                    : 'Checking...'
                  : apkStatus.available
                    ? lang === 'te'
                      ? 'APK సిద్ధం'
                      : 'APK Ready'
                    : lang === 'te'
                      ? 'బిల్డ్ సిద్ధం'
                      : 'Build Ready'}
              </span>
            </div>

            {apkStatus?.available && apkStatus.downloadUrl ? (
              <div className="flex flex-col gap-3">
                {(apkStatus.version || apkStatus.fileSizeBytes !== null || apkStatus.updatedAt) && (
                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3 font-mono-tabular">
                    {apkStatus.version && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          {lang === 'te' ? 'వెర్షన్' : 'Version'}
                        </span>
                        <strong className="text-slate-900 dark:text-slate-100">{apkStatus.version}</strong>
                      </div>
                    )}
                    {apkStatus.fileSizeBytes !== null && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          {lang === 'te' ? 'సైజు' : 'File Size'}
                        </span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {(apkStatus.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </strong>
                      </div>
                    )}
                    {apkStatus.updatedAt && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          {lang === 'te' ? 'అప్‌డేట్' : 'Updated'}
                        </span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {new Date(apkStatus.updatedAt).toLocaleDateString()}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                <a
                  href={resolveApiUrl(apkStatus.downloadUrl)}
                  download="AI-VIDEO-MAKER-PRO.apk"
                  className="min-h-[50px] w-full px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>DOWNLOAD APK</span>
                </a>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'te'
                    ? 'ఇన్‌స్టాల్ విధానం: APK డౌన్లోడ్ చేసి ఓపెన్ చేయండి → "Install unknown apps" అనుమతించండి → Install నొక్కండి.'
                    : 'Install guide: Tap downloaded .apk → Allow "Install unknown apps" → Tap Install.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Clear Green DOWNLOAD APK button — honest status when no .apk binary exists yet */}
                <button
                  type="button"
                  onClick={handleUnbuiltApkButtonClick}
                  className="min-h-[50px] w-full px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>DOWNLOAD APK</span>
                </button>

                <div
                  id="apk-build-guide-box"
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-colors ${
                    apkNoticeHighlighted
                      ? 'bg-amber-500/15 border-amber-500/50'
                      : 'bg-slate-50 dark:bg-[#0B0D12] border-slate-200 dark:border-white/10'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    <p className="font-semibold">
                      {lang === 'te'
                        ? 'APK బైనరీ ఫైల్ ఇంకా కంపైల్ కాలేదు (Android ప్రాజెక్ట్ సిద్ధం)'
                        : 'No Compiled .apk Binary Yet — Android Studio Project Ready'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">
                      {lang === 'te'
                        ? 'ఈ వెబ్ కంటైనర్‌లో Java/Android SDK లేకపోవడంతో నేరుగా .apk తయారు కాదు (నకిలీ APK ఇవ్వము). క్రింది Android ప్రాజెక్ట్ (.zip) డౌన్లోడ్ చేసి GitHub Actions లేదా Android Studio లో app-debug.apk బిల్డ్ చేయండి.'
                        : 'This web preview sandbox lacks Java/Android SDK so no real .apk file is compiled here yet. Download the full Android Capacitor project (.zip) below to build app/build/outputs/apk/debug/app-debug.apk via GitHub Actions or Android Studio.'}
                    </p>
                  </div>
                </div>

                {androidProjectStatus?.ready ? (
                  <>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3">
                      {[
                        { ok: androidProjectStatus.capacitorConfig, label: 'capacitor.config.json' },
                        { ok: androidProjectStatus.androidManifest, label: 'AndroidManifest.xml' },
                        { ok: androidProjectStatus.gradleWrapper, label: 'Gradle 8.14.3 Wrapper' },
                        { ok: androidProjectStatus.githubWorkflow, label: 'GitHub Actions APK' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${item.ok ? 'text-emerald-500' : 'text-amber-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    <a
                      href={resolveApiUrl(androidProjectStatus.exportUrl || '/api/android-project/export')}
                      download="AI-VIDEO-MAKER-PRO-android-project.zip"
                      className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 text-center leading-snug cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {lang === 'te'
                          ? `Android ప్రాజెక్ట్ (.zip · ${androidProjectStatus.fileCount} ఫైళ్లు) డౌన్లోడ్`
                          : `Download Android Project (.zip · ${androidProjectStatus.fileCount} files)`}
                      </span>
                    </a>
                  </>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3 leading-relaxed">
                    {lang === 'te'
                      ? 'లోకల్ యాప్ మోడ్‌లో వీడియో, ఫొటో, ఆడియో & 2D గేమ్ ఎడిటింగ్ పనిచేస్తాయి. Android ప్రాజెక్ట్ .zip ఎగుమతి కోసం స్టూడియో సర్వర్ అవసరం.'
                      : 'Running in local device mode without a backend URL. All editing & export tools work here; Android project ZIP export is served when connected to the studio backend server.'}
                  </p>
                )}

                <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-[11px] text-slate-600 dark:text-slate-300 flex flex-col gap-1 leading-relaxed">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {lang === 'te'
                      ? 'APK బిల్డ్ విధానం (app/build/outputs/apk/debug/app-debug.apk):'
                      : 'Build Path (app/build/outputs/apk/debug/app-debug.apk):'}
                  </p>
                  <p className="font-mono-tabular break-all">
                    npm install && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
                  </p>
                </div>

                {onOpenAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {lang === 'te'
                        ? 'బిల్డ్ చేసిన .apk ఫైల్‌ను Admin లో ప్రచురించండి'
                        : 'Admin: Upload & Publish Built .apk'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ready-to-Share Telugu Promo Message with Live Link */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'te' ? 'యాప్ లింక్ షేర్ చేయండి' : 'Share App Promo Link'}</span>
              </span>
              <span className="text-[11px] font-mono-tabular text-emerald-500">
                {liveApkShareUrl ? 'Live APK Link' : 'Live Web App Link'}
              </span>
            </div>

            <pre className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-sans text-[11px] bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-700 dark:text-slate-300 leading-relaxed">
              {promoShareMessage}
            </pre>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleCopyPromo()}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedPromo ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copiedPromo
                    ? lang === 'te'
                      ? 'కాపీ అయింది!'
                      : 'Copied!'
                    : lang === 'te'
                      ? 'మెసేజ్ కాపీ'
                      : 'Copy Message'}
                </span>
              </button>
              <a
                href={getWhatsAppShareUrl(promoShareMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{lang === 'te' ? 'WhatsApp షేర్' : 'Share WhatsApp'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Card B: Dedicated INSTALL APP Section */}
        <div
          id="install-app-section"
          className="lg:col-span-6 bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4"
        >
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-500 shrink-0" />
                <span>INSTALL APP</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'te'
                  ? 'Android హోమ్ స్క్రీన్‌లో యాప్ లోగోతో తక్షణమే ఇన్‌స్టాల్ చేయండి (PWA)'
                  : 'Install directly to your Android Home Screen or iOS device with full app icon & splash screen'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-4 flex items-center gap-3.5">
              <img
                src={APP_LOGO_URL}
                alt="AI Video Pro App Icon"
                className="w-14 h-14 rounded-2xl object-cover border border-amber-500/40 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  AI VIDEO MAKER PRO
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  AI Video Pro · 192×192 & 512×512 PNG · Standalone
                </div>
              </div>
            </div>

            <PWAInstallButton lang={lang} variant="prominent" showAlreadyInstalledState />

            {isInIframe && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {lang === 'te'
                    ? 'Android Chrome ఇన్‌స్టాల్ కోసం కొత్త ట్యాబ్‌లో తెరవండి'
                    : 'Open Direct Browser Tab for Chrome Install'}
                </span>
              </a>
            )}

            <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {lang === 'te' ? 'మొబైల్ ఇన్‌స్టాల్ విధానం:' : 'Mobile Installation Steps:'}
              </p>
              <p>
                {lang === 'te'
                  ? '1. Android Chrome: పై INSTALL APP బటన్ నొక్కండి లేదా Chrome ⋮ మెనూ → "Install app" / "Add to Home screen" ఎంచుకోండి.'
                  : '1. Android Chrome: Tap INSTALL APP above, or open Chrome ⋮ menu → "Install app" / "Add to Home screen".'}
              </p>
              <p>
                {lang === 'te'
                  ? '2. iPhone Safari: Share బటన్ నొక్కి → "Add to Home Screen" ఎంచుకోండి.'
                  : '2. iPhone / iPad Safari: Tap Share → "Add to Home Screen".'}
              </p>
              <p>
                {lang === 'te'
                  ? '3. ఇన్‌స్టాల్ తర్వాత హోమ్ స్క్రీన్‌లో యాప్ లోగోతో ఫుల్-స్క్రీన్ స్ప్లాష్ & స్టూడియో ఓపెన్ అవుతుంది.'
                  : '3. Launches standalone with your app logo, splash screen, offline tools, and home shortcuts.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{lang === 'te' ? 'షార్ట్‌కట్స్: Shorts · Video · Photo · Projects' : 'Home Shortcuts: Shorts · Video · Photo · Projects'}</span>
            <span className="font-mono-tabular text-emerald-500">PWA Ready</span>
          </div>
        </div>
      </section>

      {/* 3. Visible APP INFORMATION Section */}
      <section
        id="app-info-section"
        className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <span>APP INFORMATION</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'te' ? 'యాప్ వివరాలు & సాంకేతిక సమాచారం' : 'Application Details & Platform Compatibility'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'te' ? 'యాప్ పేరు & ప్యాకేజీ ID' : 'App Name & Package ID'}
            </span>
            <strong className="text-slate-900 dark:text-slate-100 text-sm">AI VIDEO MAKER PRO</strong>
            <span className="font-mono-tabular text-slate-600 dark:text-slate-300">com.aivideomakerpro.app</span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'te' ? 'Android & PWA సపోర్ట్' : 'Android & PWA Support'}
            </span>
            <strong className="text-slate-900 dark:text-slate-100 text-sm">Android 7.0+ (API 24–36)</strong>
            <span className="text-slate-600 dark:text-slate-300">
              Capacitor 8 · 192×192 / 512×512 PNG · Standalone
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'te' ? 'ముఖ్య ఫీచర్లు' : 'Included Studio Tools'}
            </span>
            <strong className="text-slate-900 dark:text-slate-100 text-sm">
              {lang === 'te' ? 'వీడియో · ఫోటో · ఆడియో · గేమ్' : 'Video · Photo · Audio · 2D Games'}
            </strong>
            <span className="text-slate-600 dark:text-slate-300">
              {lang === 'te'
                ? 'తెలుగు/ఇంగ్లీష్ కథలు, Shorts & MP4 ఎగుమతి'
                : 'Telugu/English Stories, Shorts & MP4 Export'}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'te' ? 'నిర్వహణ & సహాయం' : 'Proprietor & Support'}
            </span>
            <strong className="text-slate-900 dark:text-slate-100 text-sm">Injarapu Siva Raghava</strong>
            <span className="text-slate-600 dark:text-slate-300">
              Turangi, Kakinada, AP - 533016 · +91 8977776111
            </span>
          </div>
        </div>
      </section>

      {/* 4. Separate Mobile-Friendly Studio Media & Project Downloads */}
      <section className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {lang === 'te' ? 'మీడియా & ప్రాజెక్ట్ డౌన్లోడ్లు' : 'Studio Media & Project Downloads'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'te'
              ? 'వీడియో, ఫొటో, ఆడియో మరియు సేవ్ చేసిన ప్రాజెక్ట్ ఫైళ్లను నేరుగా ఫోన్‌లో డౌన్లోడ్ చేయండి.'
              : 'Separate one-tap mobile download buttons for Video, Photo, Audio, and Project files.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Download Video */}
            <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                  <Film className="w-3.5 h-3.5" />
                  <span>{lang === 'te' ? 'వీడియో ఎగుమతి' : 'Exported Video'}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-1">
                  {currentProject.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onDownloadVideo()}
                disabled={isExportingVideo}
                className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {isExportingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>
                  {isExportingVideo
                    ? `${exportProgress}%`
                    : `${lang === 'te' ? 'వీడియో డౌన్లోడ్' : 'Download Video'} (${videoCodecExt})`}
                </span>
              </button>
            </div>

            {/* 2. Download Photo */}
            <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-500">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{lang === 'te' ? 'తయారైన ఫొటో' : 'Generated / Edited Photo'}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-1">
                  {latestPhoto
                    ? latestPhoto.title
                    : lang === 'te'
                      ? 'ఇంకా ఫొటో సేవ్ చేయలేదు'
                      : 'No saved photo yet'}
                </p>
              </div>
              {latestPhoto?.dataUrl ? (
                <a
                  href={latestPhoto.dataUrl}
                  download={`${latestPhoto.title.replace(/\s+/g, '_')}.png`}
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'te' ? 'ఫొటో డౌన్లోడ్' : 'Download Photo'}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenTool('photo')}
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-sky-500" />
                  <span>{lang === 'te' ? 'ఫొటో స్టూడియో తెరవండి' : 'Create Photo First'}</span>
                </button>
              )}
            </div>

            {/* 3. Download Audio */}
            <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                  <Mic className="w-3.5 h-3.5" />
                  <span>{lang === 'te' ? 'తయారైన ఆడియో' : 'Generated / Edited Audio'}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-1">
                  {readyAudioUrl
                    ? readyAudioLabel
                    : lang === 'te'
                      ? 'ఇంకా ఆడియో సిద్ధం కాలేదు'
                      : 'No generated audio yet'}
                </p>
              </div>
              {readyAudioUrl ? (
                <a
                  href={readyAudioUrl}
                  download={`${readyAudioLabel.replace(/\s+/g, '_')}.wav`}
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'te' ? 'ఆడియో డౌన్లోడ్' : 'Download Audio'}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenTool('audio')}
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-emerald-500" />
                  <span>{lang === 'te' ? 'ఆడియో స్టూడియో తెరవండి' : 'Generate Audio First'}</span>
                </button>
              )}
            </div>

            {/* 4. Download Project */}
            <div className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-500">
                  <FileJson className="w-3.5 h-3.5" />
                  <span>{lang === 'te' ? 'సేవ్ చేసిన ప్రాజెక్ట్ (.JSON)' : 'Saved Project File (.JSON)'}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-1">
                  {currentProject.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDownloadProject(currentProject)}
                className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'te' ? 'ప్రాజెక్ట్ డౌన్లోడ్' : 'Download Project'}</span>
              </button>
            </div>
          </div>
      </section>

      {/* 9-Tile Complete Studio Hub */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {lang === 'te' ? 'స్టూడియో ఫీచర్లు & ఎడిటర్లు' : 'Complete AI Creator Suite'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => (tool.id === 'projects' ? onOpenProjects() : onOpenTool(tool.id))}
              className="text-left bg-white dark:bg-[#13161F] hover:bg-slate-50 dark:hover:bg-[#171B26] border border-slate-200 dark:border-white/10 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {lang === 'te' ? tool.titleTe : tool.titleEn}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {lang === 'te' ? tool.descTe : tool.descEn}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500">
                <span>{lang === 'te' ? 'తెరవండి' : 'Open Studio'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Honest Capability Breakdown */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {lang === 'te'
                ? 'ఆఫ్‌లైన్ / లోకల్ పరికరంలో పనిచేసే ఫీచర్లు'
                : 'Works Locally On Your Device (No External Billing Required)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {lang === 'te'
              ? 'వీడియో ట్రిమ్, కట్, స్ప్లిట్, మెర్జ్, రొటేట్, క్రాప్, స్లో/ఫాస్ట్ మోషన్, మల్టీ-ట్రాక్ ఎడిటింగ్, ఫొటో & కొలాజ్ ఎడిటర్, మైక్ రికార్డ్, ఆడియో ఎక్స్‌ట్రాక్షన్, ప్లేయబుల్ 2D గేమ్‌లు & MP4/WebM ఎగుమతి.'
              : 'Video Trim, Cut, Split, Merge, Rotate, Crop, Speed, Chroma Key, Photo & Collage Editor, Mic Recording, Video-to-Audio Extraction, Playable 2D Games + HTML Export & MP4/WebM Export.'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold">
              <Server className="w-4 h-4" />
              <span>
                {lang === 'te'
                  ? 'AI సర్వీస్ కనెక్షన్ (ఐచ్ఛికం)'
                  : 'AI Service Connection (Optional)'}
              </span>
            </div>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                aiServiceStatus === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-amber-500/15 text-amber-500'
              }`}
            >
              {aiServiceStatus === 'connected'
                ? lang === 'te'
                  ? 'AI కనెక్ట్ అయింది'
                  : 'AI Connected'
                : lang === 'te'
                  ? 'AI సర్వీస్ కనెక్షన్ అవసరం'
                  : 'Requires AI Service Connection'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {aiServiceStatus === 'connected'
              ? lang === 'te'
                ? 'కథలు, తెలుగు/ఇంగ్లీష్ AI వాయిస్ (TTS), AI ఆటో క్రియేటర్, 2D గేమ్ AI డిజైన్ & AI అసిస్టెంట్ లైవ్‌గా పనిచేస్తున్నాయి.'
                : 'AI Storyboard, Telugu/English AI TTS Voice, Auto Creator, Photo SVG Art, 2D Game AI & Assistant are live.'
              : lang === 'te'
                ? 'AI స్క్రిప్ట్, AI వాయిస్, AI కథలు & AI అసిస్టెంట్ ఫీచర్లకు AI సర్వీస్ కనెక్షన్ (లేదా ఐచ్ఛిక VITE_API_BASE_URL) అవసరం. హోమ్ స్క్రీన్, వీడియో/షార్ట్స్ ఎడిటర్, ఫొటో & ఆడియో ఎడిటర్ మరియు 2D గేమ్‌లు ఇప్పుడే పూర్తిగా పనిచేస్తాయి.'
                : 'AI Storyboard, AI Voice (TTS), AI Story Studio, AI Photo Art, AI Game Designer & AI Assistant require an AI service connection (optional VITE_API_BASE_URL for standalone APKs). All local editing & export tools work immediately without a backend URL.'}
          </p>
        </div>
      </section>
    </div>
  );
};
