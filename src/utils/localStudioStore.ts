import { GameProject, SavedAssetItem, UsageStats, VideoProject } from '../types/studio';

const PROJECTS_KEY = 'ai_video_pro_projects_v1';
const GAMES_KEY = 'ai_video_pro_games_v1';
const ASSETS_KEY = 'ai_video_pro_assets_v1';
const STATS_KEY = 'ai_video_pro_stats_v1';
const DEMOS_CLEARED_KEY = 'ai_video_pro_demos_cleared_v1';

const DEMO_PROJECT_IDS = new Set(['proj-cartoon-rabbit', 'proj-kakinada-short']);

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getStarterDemoProjects(): VideoProject[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'proj-cartoon-rabbit',
      title: 'చిట్టి కుందేలు & తెలివైన తాబేలు',
      mode: 'cartoon-maker',
      style: 'cartoon',
      aspectRatio: '16:9',
      quality: '720p',
      targetDurationSec: 30,
      contentLanguage: 'bilingual',
      prompt: 'పిల్లల కోసం చిట్టి కుందేలు మరియు తెలివైన తాబేలు స్నేహ కథ',
      voiceName: 'Kore',
      voiceStyle: 'cartoon',
      musicTrack: 'kids-playful',
      musicVolume: 0.25,
      voiceVolume: 1.0,
      subtitleStyle: 'cinema',
      exportCount: 0,
      createdAt: now,
      updatedAt: now,
      scenes: [
        {
          id: 'sc-1',
          title: 'అడవి ఉదయం (Forest Morning)',
          narration: 'పచ్చని అడవిలో ఒక చిట్టి కుందేలు, తెలివైన తాబేలు మంచి స్నేహితులుగా ఉండేవి.',
          subtitleTe: 'పచ్చని అడవిలో చిట్టి కుందేలు, తెలివైన తాబేలు స్నేహితులుగా ఉండేవి.',
          subtitleEn: 'In a lush green forest, a little rabbit and a wise turtle were best friends.',
          durationSec: 5,
          cameraMotion: 'zoom-in',
          weatherFx: 'golden-dust',
          backdropType: 'template',
          imageUrl: '/assets/images/studio_cartoon_jungle_1795115468069.jpg',
          palette: { skyTop: '#38BDF8', skyBottom: '#BAE6FD', ground: '#15803D', accent: '#FBBF24' },
          cartoonElements: { character: 'rabbit', secondaryCharacter: 'turtle', setting: 'forest', mood: 'sunny' },
        },
        {
          id: 'sc-2',
          title: 'సహాయం & విజయం (Teamwork)',
          narration: 'ఎలాంటి కష్టమైనా కలిసికట్టుగా పనిచేస్తే సులభంగా గెలవచ్చని అవి నిరూపించాయి.',
          subtitleTe: 'కలిసికట్టుగా ఉంటే ఎలాంటి కష్టమైనా గెలవవచ్చు!',
          subtitleEn: 'Together, true friends can overcome any obstacle!',
          durationSec: 5,
          cameraMotion: 'pan-right',
          weatherFx: 'fireflies',
          backdropType: 'template',
          imageUrl: '/assets/images/studio_telugu_village_1795115467329.jpg',
          palette: { skyTop: '#F59E0B', skyBottom: '#FDE68A', ground: '#166534', accent: '#F97316' },
          cartoonElements: { character: 'turtle', secondaryCharacter: 'rabbit', setting: 'village', mood: 'sunset' },
        },
      ],
    },
    {
      id: 'proj-kakinada-short',
      title: 'ఉదయం 5 గంటల అలవాటు | 9:16 Short',
      mode: 'text-to-video',
      style: 'realistic',
      aspectRatio: '9:16',
      quality: '720p',
      targetDurationSec: 30,
      contentLanguage: 'bilingual',
      prompt: 'రోజూ ఉదయం 5 గంటలకు నిద్రలేవడం వల్ల కలిగే అద్భుతమైన ప్రయోజనాలు',
      voiceName: 'Charon',
      voiceStyle: 'energetic',
      musicTrack: 'shorts-beat',
      musicVolume: 0.3,
      voiceVolume: 1.0,
      subtitleStyle: 'shorts-pop',
      exportCount: 0,
      createdAt: now,
      updatedAt: now,
      scenes: [
        {
          id: 'sc-s1',
          title: 'సూర్యోదయ శక్తి',
          narration: 'ఉదయం ప్రశాంతమైన సమయంలో మీ లక్ష్యాలపై దృష్టి పెడితే రోజంతా ఉత్సాహంగా ఉంటుంది.',
          subtitleTe: 'ఉదయం 5 గంటల ప్రశాంతత మీ జీవితాన్ని మారుస్తుంది!',
          subtitleEn: 'Quiet 5 AM focus transforms your entire day!',
          durationSec: 5,
          cameraMotion: 'ken-burns',
          weatherFx: 'golden-dust',
          backdropType: 'template',
          imageUrl: '/assets/images/studio_shorts_portrait_1795115467460.jpg',
          palette: { skyTop: '#0F172A', skyBottom: '#312E81', ground: '#1E293B', accent: '#F59E0B' },
          cartoonElements: { character: 'none', setting: 'mountains', mood: 'magical' },
        },
      ],
    },
  ];
}

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadLocalProjects(): VideoProject[] {
  const saved = safeReadJson<VideoProject[] | null>(PROJECTS_KEY, null);
  if (Array.isArray(saved)) {
    return saved;
  }
  const cleared = safeReadJson<boolean>(DEMOS_CLEARED_KEY, false);
  if (cleared) return [];
  const starters = getStarterDemoProjects();
  safeWriteJson(PROJECTS_KEY, starters);
  return starters;
}

export function saveLocalProjects(projects: VideoProject[]): void {
  safeWriteJson(PROJECTS_KEY, projects.slice(0, 50));
}

export function upsertLocalProject(project: VideoProject): VideoProject[] {
  const current = loadLocalProjects();
  const idx = current.findIndex((p) => p.id === project.id);
  const next =
    idx >= 0
      ? current.map((p) => (p.id === project.id ? project : p))
      : [project, ...current];
  saveLocalProjects(next);
  return next;
}

export function deleteLocalProject(id: string): VideoProject[] {
  const next = loadLocalProjects().filter((p) => p.id !== id);
  saveLocalProjects(next);
  return next;
}

export function clearLocalDemos(): VideoProject[] {
  safeWriteJson(DEMOS_CLEARED_KEY, true);
  const next = loadLocalProjects().filter((p) => !DEMO_PROJECT_IDS.has(p.id));
  saveLocalProjects(next);
  return next;
}

export function loadLocalGames(): GameProject[] {
  return safeReadJson<GameProject[]>(GAMES_KEY, []);
}

export function saveLocalGames(games: GameProject[]): void {
  safeWriteJson(GAMES_KEY, games.slice(0, 50));
}

export function upsertLocalGame(game: GameProject): GameProject[] {
  const current = loadLocalGames();
  const idx = current.findIndex((g) => g.id === game.id);
  const next =
    idx >= 0
      ? current.map((g) => (g.id === game.id ? game : g))
      : [game, ...current];
  saveLocalGames(next);
  return next;
}

export function deleteLocalGame(id: string): GameProject[] {
  const next = loadLocalGames().filter((g) => g.id !== id);
  saveLocalGames(next);
  return next;
}

export function loadLocalAssets(): SavedAssetItem[] {
  return safeReadJson<SavedAssetItem[]>(ASSETS_KEY, []);
}

export function saveLocalAssets(assets: SavedAssetItem[]): void {
  safeWriteJson(ASSETS_KEY, assets.slice(0, 30));
}

export function prependLocalAsset(asset: SavedAssetItem): SavedAssetItem[] {
  const current = loadLocalAssets().filter((a) => a.id !== asset.id);
  const next = [asset, ...current].slice(0, 30);
  saveLocalAssets(next);
  return next;
}

export function deleteLocalAsset(id: string): SavedAssetItem[] {
  const next = loadLocalAssets().filter((a) => a.id !== id);
  saveLocalAssets(next);
  return next;
}

export function loadLocalStats(): UsageStats {
  const fallback: UsageStats = {
    totalStoryboards: 0,
    totalVoices: 0,
    totalExports: 0,
    totalYouTubePreps: 0,
    totalGames: 0,
    todayCount: 0,
    lastResetDate: getTodayStr(),
  };
  const saved = safeReadJson<UsageStats>(STATS_KEY, fallback);
  if (saved.lastResetDate !== getTodayStr()) {
    return { ...saved, todayCount: 0, lastResetDate: getTodayStr() };
  }
  return saved;
}

export function saveLocalStats(stats: UsageStats): void {
  safeWriteJson(STATS_KEY, stats);
}
