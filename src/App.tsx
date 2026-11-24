import { useEffect, useState } from 'react';
import {
  Clapperboard,
  Home,
  FolderKanban,
  Shield,
  Globe,
  Image as ImageIcon,
  Mic,
  BookOpen,
  Video,
  Cloud,
  LogIn,
  LogOut,
  HardDrive,
  Gamepad2,
  Sparkles,
  Bot,
  Sun,
  Moon,
} from 'lucide-react';
import {
  APP_LOGO_URL,
  AdminSettings,
  AndroidProjectStatusInfo,
  ApkStatusInfo,
  ContentLanguage,
  GameProject,
  LanguageMode,
  SavedAssetItem,
  SceneItem,
  ThemeMode,
  UsageStats,
  VideoProject,
  VoiceName,
  YouTubeSeo,
} from './types/studio';
import { TRANSLATIONS } from './i18n/translations';
import { useFirebase } from './contexts/FirebaseContext';
import {
  deleteUserProjectFromFirestore,
  incrementProjectExportInFirestore,
  saveUserProjectToFirestore,
  subscribeStudioConfig,
  subscribeUserProjects,
  subscribeUserStats,
  syncUserStatsToFirestore,
} from './utils/firestoreService';
import { HomeScreenView } from './components/HomeScreenView';
import { CreateStudioView } from './components/CreateStudioView';
import { AutoCreatorView } from './components/AutoCreatorView';
import { PhotoStudioView } from './components/PhotoStudioView';
import { AudioStudioView } from './components/AudioStudioView';
import { GameMakerView } from './components/GameMakerView';
import { StoryStudioView } from './components/StoryStudioView';
import { AIAssistantView } from './components/AIAssistantView';
import { GoogleDriveView } from './components/GoogleDriveView';
import { ProjectsView } from './components/ProjectsView';
import { AdminPanelView } from './components/AdminPanelView';
import { YouTubeUploadModal } from './components/YouTubeUploadModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { exportProjectVideo } from './utils/canvasRenderer';
import { shareMediaFile } from './utils/shareUtils';
import { DriveAuthError, uploadBlobToDrive } from './utils/googleDriveService';
import {
  AiServiceConnectionState,
  apiFetch,
  checkAiServiceConnection,
  isBackendUnavailableLocally,
  safeParseJson,
} from './utils/apiClient';
import {
  clearLocalDemos,
  deleteLocalAsset,
  deleteLocalGame,
  deleteLocalProject,
  loadLocalAssets,
  loadLocalGames,
  loadLocalProjects,
  loadLocalStats,
  prependLocalAsset,
  saveLocalAssets,
  saveLocalGames,
  saveLocalProjects,
  saveLocalStats,
  upsertLocalGame,
  upsertLocalProject,
} from './utils/localStudioStore';

type ActiveTab = 'home' | 'studio' | 'shorts' | 'projects' | 'admin';
type StudioSuiteTool = 'video' | 'auto' | 'photo' | 'audio' | 'game' | 'story' | 'assistant' | 'drive';

const DEFAULT_ADMIN_SETTINGS: Omit<AdminSettings, 'adminPin'> = {
  studioName: 'AI VIDEO MAKER PRO',
  proprietorName: 'Injarapu Siva Raghava',
  adminNote: '',
  freeDailyLimit: 25,
  watermarkEnabled: false,
  watermarkText: 'AI VIDEO MAKER PRO',
  enableCartoon: true,
  enableRealistic: true,
  enableImageToVideo: true,
  pricingMode: 'free-starter',
  proMonthlyInr: 199,
  maintenanceMode: false,
};

const DEFAULT_STATS: UsageStats = {
  totalStoryboards: 0,
  totalVoices: 0,
  totalExports: 0,
  totalYouTubePreps: 0,
  totalGames: 0,
  todayCount: 0,
  lastResetDate: new Date().toISOString().slice(0, 10),
};

function createBlankProject(aspectRatio: '16:9' | '9:16' | '1:1' = '16:9'): VideoProject {
  const now = new Date().toISOString();
  return {
    id: `proj-${Date.now()}`,
    title: aspectRatio === '9:16' ? 'కొత్త YouTube షార్ట్ వీడియో' : 'చిట్టి కుందేలు AI వీడియో కథ',
    mode: aspectRatio === '9:16' ? 'text-to-video' : 'cartoon-maker',
    style: aspectRatio === '9:16' ? 'realistic' : 'cartoon',
    aspectRatio,
    quality: '720p',
    targetDurationSec: 30,
    contentLanguage: 'bilingual',
    prompt: '',
    voiceName: 'Kore',
    voiceStyle: 'storyteller',
    musicTrack: aspectRatio === '9:16' ? 'shorts-beat' : 'kids-playful',
    musicVolume: 0.25,
    voiceVolume: 1.0,
    subtitleStyle: aspectRatio === '9:16' ? 'shorts-pop' : 'cinema',
    exportCount: 0,
    createdAt: now,
    updatedAt: now,
    scenes: [
      {
        id: `scene-init-${Date.now()}`,
        title: aspectRatio === '9:16' ? 'ఆరంభ దృశ్యం' : 'అడవి ఉదయం',
        narration:
          aspectRatio === '9:16'
            ? 'మన తెలుగు కథల ప్రపంచానికి స్వాగతం!'
            : 'పచ్చని అడవిలో చిట్టి కుందేలు తన స్నేహితులతో ఆనందంగా గడిపేది.',
        subtitleTe:
          aspectRatio === '9:16'
            ? 'మన తెలుగు కథల ప్రపంచానికి స్వాగతం!'
            : 'పచ్చని అడవిలో చిట్టి కుందేలు తన స్నేహితులతో ఆనందంగా గడిపేది.',
        subtitleEn:
          aspectRatio === '9:16'
            ? 'Welcome to the world of Telugu AI Shorts!'
            : 'In a sunlit forest, the little rabbit played happily with friends.',
        durationSec: 5,
        cameraMotion: aspectRatio === '9:16' ? 'zoom-in' : 'ken-burns',
        weatherFx: 'golden-dust',
        backdropType: 'template',
        imageUrl:
          aspectRatio === '9:16'
            ? '/assets/images/studio_shorts_portrait_1795115467460.jpg'
            : '/assets/images/studio_cartoon_jungle_1795115468069.jpg',
        palette: { skyTop: '#38BDF8', skyBottom: '#BAE6FD', ground: '#15803D', accent: '#FBBF24' },
        cartoonElements: {
          character: aspectRatio === '9:16' ? 'none' : 'rabbit',
          setting: aspectRatio === '9:16' ? 'mountains' : 'forest',
          mood: 'sunny',
        },
      },
    ],
  };
}

export default function App() {
  const {
    user,
    authReady,
    profileReady,
    signingIn,
    authError,
    driveToken,
    connectGoogleDrive,
    clearDriveToken,
    signInWithGoogle,
    signOutUser,
    clearAuthError,
  } = useFirebase();
  const [lang, setLang] = useState<LanguageMode>('te');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [studioTool, setStudioTool] = useState<StudioSuiteTool>('video');
  const [projects, setProjects] = useState<VideoProject[]>(() => loadLocalProjects());
  const [games, setGames] = useState<GameProject[]>(() => loadLocalGames());
  const [assets, setAssets] = useState<SavedAssetItem[]>(() => loadLocalAssets());
  const [currentProject, setCurrentProject] = useState<VideoProject>(
    () => loadLocalProjects()[0] || createBlankProject('16:9')
  );
  const [selectedGame, setSelectedGame] = useState<GameProject | null>(null);
  const [adminSettings, setAdminSettings] = useState<Omit<AdminSettings, 'adminPin'>>(DEFAULT_ADMIN_SETTINGS);
  const [usageStats, setUsageStats] = useState<UsageStats>(() => loadLocalStats());
  const [apkStatus, setApkStatus] = useState<ApkStatusInfo | null>(null);
  const [androidProjectStatus, setAndroidProjectStatus] = useState<AndroidProjectStatusInfo | null>(null);
  const [aiServiceStatus, setAiServiceStatus] = useState<AiServiceConnectionState>(() =>
    isBackendUnavailableLocally() ? 'not-configured' : 'checking'
  );
  const [adminToken, setAdminToken] = useState('');
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [sharingVideo, setSharingVideo] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [driveSavedNotice, setDriveSavedNotice] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [readyShareVideo, setReadyShareVideo] = useState<{
    blob: Blob;
    fileName: string;
    title: string;
    signature: string;
  } | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [savingProject, setSavingProject] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const [driveImportedPhoto, setDriveImportedPhoto] = useState<{ dataUrl: string; title: string } | null>(null);
  const [driveImportedAudio, setDriveImportedAudio] = useState<{ base64: string; title: string } | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shortcut = params.get('shortcut');
    if (!shortcut) return;

    if (shortcut === 'shorts') {
      setActiveTab('shorts');
      setStudioTool('video');
      setCurrentProject((prev) => ({
        ...prev,
        aspectRatio: '9:16',
        subtitleStyle: 'shorts-pop',
      }));
    } else if (shortcut === 'video') {
      setActiveTab('studio');
      setStudioTool('video');
      setCurrentProject((prev) => ({
        ...prev,
        aspectRatio: '16:9',
        subtitleStyle: prev.subtitleStyle === 'shorts-pop' ? 'cinema' : prev.subtitleStyle,
      }));
    } else if (shortcut === 'photo') {
      setActiveTab('studio');
      setStudioTool('photo');
    } else if (shortcut === 'projects') {
      setActiveTab('projects');
    }

    params.delete('shortcut');
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);
  }, []);

  useEffect(() => {
    let active = true;

    checkAiServiceConnection().then((connected) => {
      if (active) {
        setAiServiceStatus(connected ? 'connected' : 'not-configured');
      }
    });

    if (isBackendUnavailableLocally()) {
      setApkStatus({
        available: false,
        message: 'APK is not ready yet. Build the Android app first.',
        version: null,
        fileSizeBytes: null,
        updatedAt: null,
        downloadUrl: null,
      });
      setAndroidProjectStatus(null);
      return () => {
        active = false;
      };
    }

    apiFetch('/api/projects')
      .then((r) => safeParseJson<{ projects?: VideoProject[] }>(r))
      .then((data) => {
        if (active && data && Array.isArray(data.projects) && data.projects.length > 0) {
          saveLocalProjects(data.projects);
          setProjects((prev) => (prev.length > 0 ? prev : data.projects!));
          setCurrentProject((prev) => (prev.prompt || prev.scenes.length > 1 ? prev : data.projects![0]));
        }
      })
      .catch(() => {});

    apiFetch('/api/games')
      .then((r) => safeParseJson<{ games?: GameProject[] }>(r))
      .then((data) => {
        if (active && data && Array.isArray(data.games)) {
          saveLocalGames(data.games);
          setGames(data.games);
        }
      })
      .catch(() => {});

    apiFetch('/api/assets')
      .then((r) => safeParseJson<{ assets?: SavedAssetItem[] }>(r))
      .then((data) => {
        if (active && data && Array.isArray(data.assets)) {
          saveLocalAssets(data.assets);
          setAssets(data.assets);
        }
      })
      .catch(() => {});

    apiFetch('/api/admin/settings')
      .then((r) => safeParseJson<{ settings?: Omit<AdminSettings, 'adminPin'>; usageStats?: UsageStats }>(r))
      .then((data) => {
        if (!active || !data) return;
        if (data.settings) setAdminSettings(data.settings);
        if (data.usageStats) {
          saveLocalStats(data.usageStats);
          setUsageStats(data.usageStats);
        }
      })
      .catch(() => {});

    apiFetch('/api/apk/status')
      .then((r) => safeParseJson<ApkStatusInfo>(r))
      .then((data) => {
        if (!active) return;
        setApkStatus(
          data || {
            available: false,
            message: 'APK is not ready yet. Build the Android app first.',
            version: null,
            fileSizeBytes: null,
            updatedAt: null,
            downloadUrl: null,
          }
        );
      })
      .catch(() => {
        if (active) {
          setApkStatus({
            available: false,
            message: 'APK is not ready yet. Build the Android app first.',
            version: null,
            fileSizeBytes: null,
            updatedAt: null,
            downloadUrl: null,
          });
        }
      });

    apiFetch('/api/android-project/status')
      .then((r) => safeParseJson<AndroidProjectStatusInfo>(r))
      .then((data) => {
        if (active && data) {
          setAndroidProjectStatus(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Real-time Firestore listeners (strictly gated behind authReady && profileReady && user)
  useEffect(() => {
    if (!authReady || !profileReady || !user) return;

    if (!isBackendUnavailableLocally()) {
      apiFetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.uid,
          label: user.displayName || user.email || 'Creator',
          email: user.email || undefined,
        }),
      }).catch(() => {});
    }

    const unsubProjects = subscribeUserProjects(user.uid, (cloudProjects) => {
      if (cloudProjects.length > 0) {
        setProjects(cloudProjects);
      }
    });

    const unsubConfig = subscribeStudioConfig((cloudSettings) => {
      setAdminSettings((prev) => ({ ...prev, ...cloudSettings }));
    });

    const unsubStats = subscribeUserStats(user.uid, (cloudStats) => {
      setUsageStats(cloudStats);
    });

    return () => {
      unsubProjects();
      unsubConfig();
      unsubStats();
    };
  }, [authReady, profileReady, user]);

  const handleSaveAsset = async (asset: Omit<SavedAssetItem, 'id' | 'createdAt'>) => {
    const record: SavedAssetItem = {
      ...asset,
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const nextLocal = prependLocalAsset(record);
    setAssets(nextLocal);

    if (!isBackendUnavailableLocally()) {
      try {
        const res = await apiFetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset: record }),
        });
        const data = await safeParseJson<{ assets?: SavedAssetItem[] }>(res);
        if (res.ok && data && Array.isArray(data.assets)) {
          saveLocalAssets(data.assets);
          setAssets(data.assets);
        }
      } catch {
        // Local persistence already succeeded
      }
    }
  };

  const handleDeleteAsset = async (id: string) => {
    setAssets(deleteLocalAsset(id));
    if (!isBackendUnavailableLocally()) {
      try {
        await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
      } catch {
        // Local deletion already succeeded
      }
    }
  };

  const handleSaveGame = async (game: GameProject) => {
    const timestamped: GameProject = {
      ...game,
      updatedAt: new Date().toISOString(),
    };
    setGames(upsertLocalGame(timestamped));

    if (!isBackendUnavailableLocally()) {
      try {
        const res = await apiFetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: timestamped }),
        });
        const data = await safeParseJson<{ game?: GameProject }>(res);
        if (res.ok && data?.game) {
          setGames(upsertLocalGame(data.game));
        }
      } catch {
        // Local persistence already succeeded
      }
    }
  };

  const handleDeleteGame = async (id: string) => {
    setGames(deleteLocalGame(id));
    if (!isBackendUnavailableLocally()) {
      try {
        await apiFetch(`/api/games/${id}`, { method: 'DELETE' });
      } catch {
        // Local deletion already succeeded
      }
    }
  };

  const handleSaveProject = async (projToSave: VideoProject = currentProject) => {
    setSavingProject(true);
    try {
      let savedProj: VideoProject = {
        ...projToSave,
        updatedAt: new Date().toISOString(),
      };

      if (!isBackendUnavailableLocally()) {
        try {
          const res = await apiFetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: savedProj }),
          });
          const data = await safeParseJson<{ project?: VideoProject }>(res);
          if (res.ok && data?.project) {
            savedProj = data.project;
          }
        } catch {
          // Proceed with local save when backend is unreachable
        }
      }

      if (user && profileReady) {
        await saveUserProjectToFirestore(user.uid, savedProj).catch(() => {});
      }

      setCurrentProject(savedProj);
      setProjects(upsertLocalProject(savedProj));
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDownloadProject = (proj: VideoProject = currentProject) => {
    const safeName = (proj.title || 'ai_video_project').replace(/[^a-zA-Z0-9\u0C00-\u0C7F_-]+/g, '_');
    const json = JSON.stringify(proj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadVideo = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(1);
    try {
      const wm = adminSettings.watermarkEnabled ? adminSettings.watermarkText : undefined;
      const { blob, ext } = await exportProjectVideo(currentProject, wm, setExportProgress);
      const fileName = `${currentProject.title.replace(/\s+/g, '_')}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      void handleSaveAsset({
        type: 'download',
        title: fileName,
        subtitle: `${currentProject.aspectRatio} · ${currentProject.quality || '720p'} · ${ext.toUpperCase()}`,
        mimeType: blob.type,
      });

      setUsageStats((s) => {
        const next = { ...s, totalExports: s.totalExports + 1 };
        saveLocalStats(next);
        if (user && profileReady) {
          void syncUserStatsToFirestore(user.uid, next);
        }
        return next;
      });

      if (!isBackendUnavailableLocally()) {
        apiFetch(`/api/projects/${currentProject.id}/export-track`, { method: 'POST' })
          .then((r) => safeParseJson<{ totalExports?: number }>(r))
          .then((d) => {
            if (d && typeof d.totalExports === 'number') {
              setUsageStats((s) => {
                const next = { ...s, totalExports: d.totalExports! };
                saveLocalStats(next);
                if (user && profileReady) {
                  void syncUserStatsToFirestore(user.uid, next);
                }
                return next;
              });
            }
          })
          .catch(() => {});
      }

      if (user && profileReady) {
        void incrementProjectExportInFirestore(user.uid, currentProject.id);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleSaveVideoToDrive = async () => {
    if (isExporting || savingToDrive) return;
    setSavingToDrive(true);
    setExportProgress(1);
    try {
      const token = driveToken || (await connectGoogleDrive());
      if (!token) return;
      const wm = adminSettings.watermarkEnabled ? adminSettings.watermarkText : undefined;
      const { blob, ext } = await exportProjectVideo(currentProject, wm, setExportProgress);
      const safeName = `${currentProject.title.replace(/\s+/g, '_')}.${ext}`;
      await uploadBlobToDrive({
        token,
        fileName: safeName,
        mimeType: blob.type || `video/${ext}`,
        blob,
        description: `Video created in AI VIDEO MAKER PRO (${currentProject.aspectRatio})`,
        useStudioFolder: true,
      });
      setDriveSavedNotice(true);
      setTimeout(() => setDriveSavedNotice(false), 3000);
    } catch (err) {
      if (err instanceof DriveAuthError) clearDriveToken();
      console.error('Save to Drive failed:', err);
    } finally {
      setSavingToDrive(false);
      setExportProgress(0);
    }
  };

  const currentShareSignature = `${currentProject.id}:${currentProject.aspectRatio}:${currentProject.title}:${adminSettings.watermarkEnabled ? adminSettings.watermarkText : ''}:${currentProject.scenes
    .map((s) => `${s.id}-${s.narration.length}-${s.durationSec}-${s.backdropType}-${s.cameraMotion}`)
    .join('|')}`;

  const handleShareVideo = async () => {
    if (isExporting || sharingVideo) return;
    setShareNotice('');

    if (readyShareVideo && readyShareVideo.signature === currentShareSignature) {
      setSharingVideo(true);
      try {
        const result = await shareMediaFile({
          blob: readyShareVideo.blob,
          fileName: readyShareVideo.fileName,
          title: readyShareVideo.title,
          text: `${readyShareVideo.title} — Created in AI VIDEO MAKER PRO`,
        });
        if (result.sharedNative) {
          setShareNotice(lang === 'te' ? 'వీడియో షేర్ చేయబడింది!' : 'Video shared!');
          setTimeout(() => setShareNotice(''), 3000);
        } else if (!result.cancelled) {
          setShareNotice(
            lang === 'te'
              ? 'వీడియో ఫైల్ డౌన్లోడ్ అయింది — WhatsApp లేదా Instagram లో అటాచ్ చేయండి.'
              : 'Video downloaded — attach it directly in WhatsApp or Instagram.'
          );
          setTimeout(() => setShareNotice(''), 4500);
        }
      } catch (err) {
        console.error('Share video failed:', err);
      } finally {
        setSharingVideo(false);
      }
      return;
    }

    setSharingVideo(true);
    setExportProgress(1);
    try {
      const wm = adminSettings.watermarkEnabled ? adminSettings.watermarkText : undefined;
      const { blob, ext } = await exportProjectVideo(currentProject, wm, setExportProgress);
      const fileName = `${currentProject.title.replace(/\s+/g, '_')}.${ext}`;
      setReadyShareVideo({
        blob,
        fileName,
        title: currentProject.title,
        signature: currentShareSignature,
      });

      const result = await shareMediaFile({
        blob,
        fileName,
        title: currentProject.title,
        text: `${currentProject.title} — Created in AI VIDEO MAKER PRO`,
      });
      if (result.gestureExpired) {
        setShareNotice(
          lang === 'te'
            ? 'వీడియో సిద్ధమై డౌన్లోడ్ అయింది! నేరుగా షేర్ చేయడానికి "Share Now" బటన్ మళ్లీ నొక్కండి.'
            : 'Video rendered & downloaded! Tap "Share Now" once more to open the share sheet.'
        );
      } else if (!result.sharedNative && !result.cancelled) {
        setShareNotice(
          lang === 'te'
            ? 'వీడియో డౌన్లోడ్ అయింది — WhatsApp లేదా Instagram లో షేర్ చేయండి.'
            : 'Video downloaded — attach it in WhatsApp or Instagram.'
        );
      }
    } catch (err) {
      console.error('Share video failed:', err);
    } finally {
      setSharingVideo(false);
      setExportProgress(0);
    }
  };

  const handleStartLongVideo = () => {
    setActiveTab('studio');
    setStudioTool('video');
    setCurrentProject((prev) => ({
      ...prev,
      aspectRatio: '16:9',
      subtitleStyle: prev.subtitleStyle === 'shorts-pop' ? 'cinema' : prev.subtitleStyle,
    }));
  };

  const handleSwitchToShorts = () => {
    setActiveTab('shorts');
    setStudioTool('video');
    setCurrentProject((prev) => ({
      ...prev,
      aspectRatio: '9:16',
      subtitleStyle: 'shorts-pop',
    }));
  };

  const handleUpdateSeo = (seo: YouTubeSeo) => {
    const updated = { ...currentProject, youtubeSeo: seo };
    setCurrentProject(updated);
    void handleSaveProject(updated);
  };

  const handleDuplicateProject = async (proj: VideoProject) => {
    const copy: VideoProject = {
      ...proj,
      id: `proj-${Date.now()}`,
      title: `${proj.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await handleSaveProject(copy);
  };

  const handleDeleteProject = async (id: string) => {
    setProjects(deleteLocalProject(id));
    if (!isBackendUnavailableLocally()) {
      try {
        await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      } catch {
        // Local deletion already succeeded
      }
    }
    if (user && profileReady) {
      await deleteUserProjectFromFirestore(user.uid, id).catch(() => {});
    }
  };

  const handleClearDemos = async () => {
    setProjects(clearLocalDemos());
    if (!isBackendUnavailableLocally()) {
      try {
        await apiFetch('/api/projects/clear-demos', { method: 'POST' });
      } catch {
        // Local demo clearing already succeeded
      }
    }
    if (user && profileReady) {
      for (const demoId of ['proj-cartoon-rabbit', 'proj-kakinada-short']) {
        if (projects.some((p) => p.id === demoId)) {
          await deleteUserProjectFromFirestore(user.uid, demoId).catch(() => {});
        }
      }
    }
  };

  const handleSendPhotoToVideo = (dataUrl: string, title: string, prompt: string) => {
    const newScene: SceneItem = {
      id: `photo-sc-${Date.now()}`,
      title,
      narration: lang === 'te' ? `${title} కదిలే AI దృశ్యం.` : `${title} animated with cinematic motion.`,
      subtitleTe: title,
      subtitleEn: title,
      durationSec: 5,
      cameraMotion: 'ken-burns',
      weatherFx: 'golden-dust',
      backdropType: 'uploaded',
      imageUrl: dataUrl,
      palette: { skyTop: '#0F172A', skyBottom: '#1E293B', ground: '#0F172A', accent: '#F59E0B' },
      cartoonElements: { character: 'none', setting: 'forest', mood: 'sunny' },
    };
    setCurrentProject((prev) => ({
      ...prev,
      mode: 'image-to-video',
      title: title || prev.title,
      prompt: prompt || prev.prompt,
      scenes: [newScene, ...prev.scenes.slice(0, 3)],
    }));
    setActiveTab('studio');
    setStudioTool('video');
  };

  const handleAttachVoiceToScene = (
    text: string,
    audioBase64: string,
    mimeType: string,
    voiceName: VoiceName
  ) => {
    setCurrentProject((prev) => {
      const updatedScenes = prev.scenes.map((sc, idx) =>
        idx === 0
          ? {
              ...sc,
              narration: text,
              subtitleTe: lang === 'te' ? text : sc.subtitleTe,
              subtitleEn: lang === 'en' ? text : sc.subtitleEn,
              audioBase64,
              audioMimeType: mimeType,
              audioStatus: 'ready' as const,
            }
          : sc
      );
      return { ...prev, voiceName, scenes: updatedScenes };
    });
    setActiveTab('studio');
    setStudioTool('video');
  };

  const handleConvertStoryToVideo = (
    title: string,
    topic: string,
    scenes: SceneItem[],
    contentLang: ContentLanguage
  ) => {
    setCurrentProject((prev) => ({
      ...prev,
      id: `proj-${Date.now()}`,
      title,
      prompt: topic,
      mode: 'story-maker',
      style: 'devotional',
      contentLanguage: contentLang,
      scenes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setActiveTab('studio');
    setStudioTool('video');
  };

  const suiteTools: { id: StudioSuiteTool; label: string; icon: React.ReactNode }[] = [
    { id: 'video', label: t.navCreate, icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'auto', label: lang === 'te' ? 'ఆటో క్రియేటర్' : 'Auto Creator', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'photo', label: t.tabPhoto, icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'audio', label: t.tabAudio, icon: <Mic className="w-3.5 h-3.5" /> },
    { id: 'game', label: lang === 'te' ? 'గేమ్ మేకర్' : 'Game Maker', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: 'story', label: t.tabStory, icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'assistant', label: lang === 'te' ? 'AI సహాయకుడు' : 'Assistant', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'drive', label: t.tabDrive, icon: <HardDrive className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-[#0B0D12] text-slate-900 dark:text-slate-100 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8 flex flex-col transition-colors">
      {/* Top Bar Contract: 3 exact zones (Wordmark — 4 concise single-line links — 1 primary CTA) */}
      <header className="sticky top-0 z-40 h-13 sm:h-16 bg-white/90 dark:bg-[#0B0D12]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Brand logo + wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="min-w-0 flex items-center gap-2 text-sm sm:text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50 font-display cursor-pointer text-left"
          >
            <img
              src={APP_LOGO_URL}
              alt={adminSettings.studioName || t.brandName}
              className="w-8 h-8 rounded-lg object-cover border border-amber-500/35 shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="truncate">{adminSettings.studioName || t.brandName}</span>
          </button>

          {/* Zone 2: 4 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeTab === 'home' ? 'text-amber-500 underline underline-offset-8' : ''
              }`}
            >
              {lang === 'te' ? 'హోమ్' : 'Home'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeTab === 'studio' || activeTab === 'shorts' ? 'text-amber-500 underline underline-offset-8' : ''
              }`}
            >
              {t.navCreate}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeTab === 'projects' ? 'text-amber-500 underline underline-offset-8' : ''
              }`}
            >
              {t.navProjects}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeTab === 'admin' ? 'text-amber-500 underline underline-offset-8' : ''
              }`}
            >
              {t.navAdmin}
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleDownloadVideo}
              disabled={isExporting}
              className="min-h-[38px] sm:min-h-[40px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-[11px] sm:text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              {isExporting ? `${exportProgress}%` : t.primaryCta}
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Sub-Toolbar */}
      <div className="border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#0E1118]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto max-w-full">
            {suiteTools.map((tool) => {
              const isSelected = (activeTab === 'studio' || activeTab === 'shorts') && studioTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setActiveTab('studio');
                    setStudioTool(tool.id);
                  }}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {tool.icon}
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  title={lang === 'te' ? 'సైన్ అవుట్' : 'Sign out'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'te' ? 'సైన్ అవుట్' : 'Sign out'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-500" />
                <span>{signingIn ? '...' : lang === 'te' ? 'Google సైన్-ఇన్' : 'Sign in'}</span>
              </button>
            )}

            <PWAInstallButton lang={lang} />

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'te' ? 'en' : 'te'))}
              className="min-h-[34px] px-3 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.langSwitch}</span>
            </button>
          </div>
        </div>
        {authError && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2 flex items-center justify-between gap-2 text-xs text-rose-500">
            <span className="break-words">{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="px-2 py-0.5 rounded border border-rose-500/30 text-[11px] shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeScreenView
            lang={lang}
            usageStats={usageStats}
            projectCount={projects.length}
            gameCount={games.length}
            apkStatus={apkStatus}
            androidProjectStatus={androidProjectStatus}
            aiServiceStatus={aiServiceStatus}
            currentProject={currentProject}
            assets={assets}
            isExportingVideo={isExporting}
            exportProgress={exportProgress}
            onDownloadVideo={handleDownloadVideo}
            onDownloadProject={handleDownloadProject}
            onStartLongVideo={handleStartLongVideo}
            onStartShortsVideo={handleSwitchToShorts}
            onOpenTool={(tool) => {
              setActiveTab('studio');
              setStudioTool(tool);
            }}
            onOpenProjects={() => setActiveTab('projects')}
            onOpenAdmin={() => setActiveTab('admin')}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'video' && (
          <CreateStudioView
            project={currentProject}
            lang={lang}
            adminSettings={adminSettings}
            aiServiceConnected={aiServiceStatus === 'connected'}
            onChangeProject={setCurrentProject}
            onSaveProject={() => handleSaveProject(currentProject)}
            onDownloadProject={() => handleDownloadProject(currentProject)}
            onDownloadVideo={handleDownloadVideo}
            onShareVideo={handleShareVideo}
            onSaveVideoToDrive={handleSaveVideoToDrive}
            onOpenYouTubeModal={() => setShowYouTubeModal(true)}
            isExporting={isExporting}
            sharingVideo={sharingVideo}
            shareReady={Boolean(readyShareVideo && readyShareVideo.signature === currentShareSignature)}
            shareNotice={shareNotice}
            savingToDrive={savingToDrive}
            driveSavedNotice={driveSavedNotice}
            exportProgress={exportProgress}
            savingProject={savingProject}
            savedNotice={savedNotice}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'auto' && (
          <AutoCreatorView
            lang={lang}
            aiServiceConnected={aiServiceStatus === 'connected'}
            onCreateAutoProject={(assembled) => {
              setCurrentProject(assembled);
              setActiveTab('studio');
              setStudioTool('video');
            }}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'photo' && (
          <PhotoStudioView
            lang={lang}
            aiServiceConnected={aiServiceStatus === 'connected'}
            initialPhoto={driveImportedPhoto}
            onClearInitialPhoto={() => setDriveImportedPhoto(null)}
            onSendPhotoToVideo={handleSendPhotoToVideo}
            onSaveAsset={handleSaveAsset}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'audio' && (
          <AudioStudioView
            lang={lang}
            aiServiceConnected={aiServiceStatus === 'connected'}
            initialAudio={driveImportedAudio}
            onClearInitialAudio={() => setDriveImportedAudio(null)}
            onAttachVoiceToScene={handleAttachVoiceToScene}
            onSaveAsset={handleSaveAsset}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'game' && (
          <GameMakerView
            lang={lang}
            aiServiceConnected={aiServiceStatus === 'connected'}
            initialGame={selectedGame}
            onClearInitialGame={() => setSelectedGame(null)}
            onSaveGame={handleSaveGame}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'story' && (
          <StoryStudioView
            lang={lang}
            aiServiceConnected={aiServiceStatus === 'connected'}
            onConvertStoryToVideo={handleConvertStoryToVideo}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'assistant' && (
          <AIAssistantView
            lang={lang}
            aiServiceConnected={aiServiceStatus === 'connected'}
            onLaunchToolWithPrompt={(tool, suggestedPrompt) => {
              if (tool === 'video') {
                setCurrentProject((prev) => ({ ...prev, prompt: suggestedPrompt }));
              }
              setActiveTab('studio');
              setStudioTool(tool);
            }}
          />
        )}

        {(activeTab === 'studio' || activeTab === 'shorts') && studioTool === 'drive' && (
          <GoogleDriveView
            lang={lang}
            currentProject={currentProject}
            onImportPhotoToStudio={(dataUrl, title) => {
              setDriveImportedPhoto({ dataUrl, title });
              setActiveTab('studio');
              setStudioTool('photo');
            }}
            onImportAudioToStudio={(base64, title) => {
              setDriveImportedAudio({ base64, title });
              setActiveTab('studio');
              setStudioTool('audio');
            }}
            onImportProjectFromDrive={(proj) => {
              setCurrentProject(proj);
              setActiveTab('studio');
              setStudioTool('video');
            }}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            games={games}
            assets={assets}
            lang={lang}
            onOpenProject={(proj) => {
              setCurrentProject(proj);
              setActiveTab('studio');
              setStudioTool('video');
            }}
            onDownloadProject={handleDownloadProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onClearDemos={handleClearDemos}
            onCreateNew={() => {
              setCurrentProject(createBlankProject('16:9'));
              setActiveTab('studio');
              setStudioTool('video');
            }}
            onOpenGame={(g) => {
              setSelectedGame(g);
              setActiveTab('studio');
              setStudioTool('game');
            }}
            onDeleteGame={handleDeleteGame}
            onDeleteAsset={handleDeleteAsset}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanelView
            lang={lang}
            publicSettings={adminSettings}
            usageStats={usageStats}
            adminToken={adminToken}
            apkStatus={apkStatus}
            onApkStatusChange={setApkStatus}
            onAdminTokenChange={setAdminToken}
            onSettingsUpdated={(s, st) => {
              setAdminSettings(s);
              setUsageStats(st);
            }}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-white/5 mt-10 py-6 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {adminSettings.studioName} · {adminSettings.proprietorName}
          </span>
          <span>Turangi, Kakinada, Andhra Pradesh - 533016 · +91 8977776111</span>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Tab Bar (md:hidden) */}
      <nav
        aria-label="Mobile Studio Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 min-h-14 pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-[#13161F]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 grid grid-cols-4 items-center px-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center min-h-[48px] px-1 text-[11px] font-medium ${
            activeTab === 'home' ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="mt-0.5 truncate max-w-full">{lang === 'te' ? 'హోమ్' : 'Home'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('studio');
            setStudioTool('video');
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] px-1 text-[11px] font-medium ${
            activeTab === 'studio' || activeTab === 'shorts' ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Clapperboard className="w-5 h-5" />
          <span className="mt-0.5 truncate max-w-full">{t.navCreate}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center justify-center min-h-[48px] px-1 text-[11px] font-medium ${
            activeTab === 'projects' ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span className="mt-0.5 truncate max-w-full">{t.navProjects}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center justify-center min-h-[48px] px-1 text-[11px] font-medium ${
            activeTab === 'admin' ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="mt-0.5 truncate max-w-full">{t.navAdmin}</span>
        </button>
      </nav>

      <OfflineIndicator lang={lang} />

      {showYouTubeModal && (
        <YouTubeUploadModal
          project={currentProject}
          lang={lang}
          aiServiceConnected={aiServiceStatus === 'connected'}
          onClose={() => setShowYouTubeModal(false)}
          onUpdateSeo={handleUpdateSeo}
          onDownloadVideo={handleDownloadVideo}
          isExporting={isExporting}
          exportProgress={exportProgress}
        />
      )}
    </div>
  );
}
