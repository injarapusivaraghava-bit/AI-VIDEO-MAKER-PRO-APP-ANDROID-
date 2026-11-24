import React, { useEffect, useState } from 'react';
import {
  Lock,
  Save,
  CheckCircle2,
  ShieldCheck,
  Cloud,
  LogIn,
  Users,
  Activity,
  AlertTriangle,
  Settings,
  Trash2,
  Smartphone,
  Upload,
} from 'lucide-react';
import { AdminOverviewData, AdminSettings, ApkStatusInfo, LanguageMode, UsageStats } from '../types/studio';
import { TRANSLATIONS } from '../i18n/translations';
import { useFirebase } from '../contexts/FirebaseContext';
import { saveStudioConfigToFirestore } from '../utils/firestoreService';
import {
  apiFetch,
  getAiServiceRequiredMessage,
  isBackendUnavailableLocally,
  safeParseJson,
} from '../utils/apiClient';

interface AdminPanelViewProps {
  lang: LanguageMode;
  publicSettings: Omit<AdminSettings, 'adminPin'>;
  usageStats: UsageStats;
  adminToken: string;
  apkStatus: ApkStatusInfo | null;
  onApkStatusChange: (status: ApkStatusInfo) => void;
  onAdminTokenChange: (token: string) => void;
  onSettingsUpdated: (settings: Omit<AdminSettings, 'adminPin'>, stats: UsageStats) => void;
}

type AdminSectionTab = 'settings' | 'users' | 'history' | 'errors';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  lang,
  publicSettings,
  usageStats,
  adminToken,
  apkStatus,
  onApkStatusChange,
  onAdminTokenChange,
  onSettingsUpdated,
}) => {
  const { user, isAdminUser, signInWithGoogle, signingIn } = useFirebase();
  const t = TRANSLATIONS[lang];
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [draft, setDraft] = useState<Omit<AdminSettings, 'adminPin'>>(publicSettings);
  const [newPin, setNewPin] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [section, setSection] = useState<AdminSectionTab>('settings');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [apkVersionInput, setApkVersionInput] = useState('1.0');
  const [apkBusy, setApkBusy] = useState(false);
  const [apkMsg, setApkMsg] = useState('');

  const unlocked = Boolean(adminToken) || isAdminUser;

  useEffect(() => {
    setDraft(publicSettings);
  }, [publicSettings]);

  useEffect(() => {
    if (isBackendUnavailableLocally()) {
      setBackendConnected(false);
      return;
    }
    apiFetch('/api/health')
      .then((r) => safeParseJson<{ ok?: boolean; hasApiKey?: boolean }>(r))
      .then((d) => setBackendConnected(Boolean(d?.ok && d?.hasApiKey)))
      .catch(() => setBackendConnected(false));
  }, []);

  const loadOverview = async (tokenToUse: string) => {
    if (!tokenToUse || isBackendUnavailableLocally()) return;
    try {
      const res = await apiFetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (res.ok) {
        const data = await safeParseJson<AdminOverviewData>(res);
        if (data) setOverview(data);
      }
    } catch {}
  };

  useEffect(() => {
    if (adminToken) {
      void loadOverview(adminToken);
    }
  }, [adminToken]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (isBackendUnavailableLocally()) {
      setAuthError(getAiServiceRequiredMessage(lang));
      return;
    }
    try {
      const res = await apiFetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await safeParseJson<any>(res);
      if (!data) {
        setAuthError(getAiServiceRequiredMessage(lang));
        return;
      }
      if (!res.ok || !data.unlocked || !data.adminToken) {
        setAuthError(lang === 'te' ? 'తప్పు అడ్మిన్ PIN / పాస్‌కోడ్.' : 'Incorrect Admin Passcode / PIN.');
        return;
      }
      setDraft(data.settings);
      onAdminTokenChange(data.adminToken);
      setPin('');
    } catch {
      setAuthError(getAiServiceRequiredMessage(lang));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    setAuthError('');
    try {
      let updatedSettings = draft;
      let updatedStats = usageStats;

      if (adminToken && !isBackendUnavailableLocally()) {
        const res = await apiFetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            settings: {
              ...draft,
              ...(newPin.trim() ? { newPin: newPin.trim() } : {}),
            },
          }),
        });
        const data = await safeParseJson<any>(res);
        if (!data) throw new Error(getAiServiceRequiredMessage(lang));
        if (!res.ok) throw new Error(data.error || 'Failed to save settings');
        if (newPin.trim()) setNewPin('');
        updatedSettings = data.settings;
        updatedStats = data.usageStats;
      }

      if (user && isAdminUser) {
        await saveStudioConfigToFirestore(user.uid, updatedSettings);
      }

      onSettingsUpdated(updatedSettings, updatedStats);
      setSavedMsg(
        user && isAdminUser
          ? lang === 'te'
            ? 'Firestore & సెట్టింగ్స్ సేవ్ అయ్యాయి'
            : 'Saved & synced to Firebase Firestore'
          : lang === 'te'
            ? 'అడ్మిన్ సెట్టింగ్స్ సేవ్ అయ్యాయి'
            : 'Admin settings saved successfully'
      );
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: 'active' | 'blocked') => {
    if (!adminToken || isBackendUnavailableLocally()) return;
    const nextStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const data = await safeParseJson<any>(res);
        if (data?.users) {
          setOverview((prev) => (prev ? { ...prev, users: data.users } : prev));
        }
      }
    } catch {}
  };

  const handleClearLogs = async () => {
    if (!adminToken || isBackendUnavailableLocally()) return;
    try {
      const res = await apiFetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setOverview((prev) => (prev ? { ...prev, generationLogs: [], errorLogs: [] } : prev));
      }
    } catch {}
  };

  const handleUploadApk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isBackendUnavailableLocally()) {
      setApkMsg(getAiServiceRequiredMessage(lang));
      return;
    }
    if (!adminToken) {
      setApkMsg(
        lang === 'te'
          ? 'APK అప్‌లోడ్ చేయడానికి ముందుగా సర్వర్ Admin PIN తో అన్‌లాక్ చేయండి.'
          : 'Unlock with Server Admin Passcode first before uploading an APK.'
      );
      return;
    }
    if (!file.name.toLowerCase().endsWith('.apk')) {
      setApkMsg(lang === 'te' ? 'దయచేసి అసలైన .apk ఫైల్‌ను మాత్రమే ఎంచుకోండి.' : 'Please select a valid compiled .apk file.');
      return;
    }

    setApkBusy(true);
    setApkMsg('');
    try {
      const buf = await file.arrayBuffer();
      const res = await apiFetch('/api/admin/apk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          Authorization: `Bearer ${adminToken}`,
          'X-APK-Version': apkVersionInput.trim() || '1.0',
        },
        body: buf,
      });
      const data = await safeParseJson<any>(res);
      if (!data) throw new Error(getAiServiceRequiredMessage(lang));
      if (!res.ok) throw new Error(data.error || 'Failed to upload APK');
      onApkStatusChange(data);
      setApkMsg(
        lang === 'te'
          ? 'నిజమైన Android APK పబ్లిష్ చేయబడింది! ఇప్పుడు హోమ్ స్క్రీన్‌లో డౌన్లోడ్ బటన్ పనిచేస్తుంది.'
          : 'Real Android APK published! Home screen Download APK button is now live.'
      );
    } catch (err: any) {
      setApkMsg(err.message || 'APK upload failed');
    } finally {
      setApkBusy(false);
    }
  };

  const handleRemoveApk = async () => {
    if (!adminToken || isBackendUnavailableLocally()) return;
    setApkBusy(true);
    setApkMsg('');
    try {
      const res = await apiFetch('/api/admin/apk', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await safeParseJson<any>(res);
      if (!data) throw new Error(getAiServiceRequiredMessage(lang));
      if (!res.ok) throw new Error(data.error || 'Failed to remove APK');
      onApkStatusChange(data);
      setApkMsg(lang === 'te' ? 'APK తొలగించబడింది.' : 'Published APK removed.');
    } catch (err: any) {
      setApkMsg(err.message || 'Remove failed');
    } finally {
      setApkBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.adminTitle}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.adminSubtitle}</p>
        </div>
        <div className="flex flex-col sm:items-end gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
          <p>
            AI Service:{' '}
            <span className={backendConnected ? 'text-emerald-500' : 'text-amber-500'}>
              {backendConnected === null
                ? 'Checking...'
                : backendConnected
                  ? 'Connected (Gemini AI Live)'
                  : isBackendUnavailableLocally()
                    ? 'Local Mode (No Backend URL)'
                    : 'Not Connected (Requires AI Service)'}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              Firebase:{' '}
              <span className="text-emerald-500">
                {user
                  ? isAdminUser
                    ? `Admin Verified (${user.email})`
                    : `Creator (${user.email})`
                  : 'Firestore & Auth Ready'}
              </span>
            </span>
          </p>
        </div>
      </div>

      {/* Live Usage Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'నేటి తయారీలు' : 'Today Creations'}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono-tabular mt-1">
            {usageStats.todayCount} / {publicSettings.freeDailyLimit}
          </p>
        </div>
        <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'స్టోరీబోర్డులు' : 'Storyboards'}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono-tabular mt-1">{usageStats.totalStoryboards}</p>
        </div>
        <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'AI వాయిస్ + గేమ్‌లు' : 'Voices + Games'}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono-tabular mt-1">
            {usageStats.totalVoices} / {usageStats.totalGames || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'వీడియో ఎగుమతులు' : 'Video Exports'}</p>
          <p className="text-2xl font-bold text-amber-500 font-mono-tabular mt-1">{usageStats.totalExports}</p>
        </div>
      </div>

      {!unlocked ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <form
            onSubmit={handleUnlock}
            className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {lang === 'te' ? 'ప్రైవేట్ అడ్మిన్ ప్రవేశం' : 'Protected Admin Access'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{publicSettings.proprietorName}</p>
              </div>
            </div>

            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={lang === 'te' ? 'అడ్మిన్ PIN / పాస్‌కోడ్ నమోదు చేయండి' : 'Enter Admin Passcode / PIN'}
              className="w-full bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />

            {authError && <p className="text-xs text-rose-500">{authError}</p>}

            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
            >
              {t.adminUnlock}
            </button>
          </form>

          <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {lang === 'te' ? 'Google Admin సైన్-ఇన్' : 'Verified Firebase Admin'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'te'
                    ? 'యజమాని Google ఖాతాతో మాత్రమే ఈ అడ్మిన్ ప్యానెల్ అన్‌లాక్ అవుతుంది.'
                    : 'Only the verified Proprietor Google account or Admin Passcode holder can unlock settings.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={signingIn}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-amber-500" />
              <span>{signingIn ? '...' : lang === 'te' ? 'Google తో సైన్-ఇన్' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
              <ShieldCheck className="w-5 h-5" />
              <span>{lang === 'te' ? 'అడ్మిన్ కంట్రోల్ అన్‌లాక్ అయింది' : 'Protected Admin Session Active'}</span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto max-w-full">
              {[
                { id: 'settings' as const, label: lang === 'te' ? 'సెట్టింగ్స్' : 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
                { id: 'users' as const, label: lang === 'te' ? 'వినియోగదారులు' : 'Users', icon: <Users className="w-3.5 h-3.5" /> },
                { id: 'history' as const, label: lang === 'te' ? 'AI హిస్టరీ' : 'AI History', icon: <Activity className="w-3.5 h-3.5" /> },
                { id: 'errors' as const, label: lang === 'te' ? 'ఎర్రర్ లాగ్స్' : 'Error Logs', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
              ].map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setSection(tb.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    section === tb.id
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tb.icon}
                  <span>{tb.label}</span>
                </button>
              ))}
            </div>
          </div>

          {section === 'settings' && (
            <>
              {savedMsg && (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {savedMsg}
                </span>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'స్టూడియో పేరు' : 'Studio Brand Name'}</label>
                  <input
                    type="text"
                    value={draft.studioName}
                    onChange={(e) => setDraft({ ...draft, studioName: e.target.value })}
                    className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'యజమాని పేరు' : 'Proprietor Name'}</label>
                  <input
                    type="text"
                    value={draft.proprietorName}
                    onChange={(e) => setDraft({ ...draft, proprietorName: e.target.value })}
                    className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'యాప్ ధర మోడ్' : 'Monetization Mode'}</label>
                  <select
                    value={draft.pricingMode}
                    onChange={(e) =>
                      setDraft({ ...draft, pricingMode: e.target.value as 'free-starter' | 'freemium' })
                    }
                    className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="free-starter">Free Starter (100% Free to Start)</option>
                    <option value="freemium">Freemium (Free + Paid Pro Plan)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'te' ? 'రోజువారీ ఉచిత పరిమితి' : 'Free Daily Limit'}:{' '}
                    <span className="font-mono-tabular text-amber-500">{draft.freeDailyLimit}</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={draft.freeDailyLimit}
                    onChange={(e) => setDraft({ ...draft, freeDailyLimit: Number(e.target.value) })}
                    className="accent-amber-500 mt-2"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{lang === 'te' ? 'వాటర్‌మార్క్ టెక్స్ట్' : 'Watermark Text'}</label>
                  <input
                    type="text"
                    value={draft.watermarkText}
                    onChange={(e) => setDraft({ ...draft, watermarkText: e.target.value })}
                    className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'te' ? 'కొత్త అడ్మిన్ PIN' : 'Change Admin PIN (Optional)'}
                  </label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••"
                    className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Admin Note</label>
                  <textarea
                    rows={2}
                    value={draft.adminNote || ''}
                    onChange={(e) => setDraft({ ...draft, adminNote: e.target.value })}
                    className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                {[
                  { key: 'watermarkEnabled', labelTe: 'వీడియో వాటర్‌మార్క్', labelEn: 'Video Watermark' },
                  { key: 'enableCartoon', labelTe: 'AI కార్టూన్ ఇంజన్', labelEn: 'AI Cartoon Engine' },
                  { key: 'enableRealistic', labelTe: 'రియలిస్టిక్ ఇంజన్', labelEn: 'Realistic Engine' },
                  { key: 'enableImageToVideo', labelTe: 'ఫోటో-టు-వీడియో', labelEn: 'Image-to-Video' },
                ].map((item) => {
                  const checked = Boolean((draft as any)[item.key]);
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-3 cursor-pointer"
                    >
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {lang === 'te' ? item.labelTe : item.labelEn}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.checked })}
                        className="w-4 h-4 accent-amber-500"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4">
                {authError ? <p className="text-xs text-rose-500">{authError}</p> : <span />}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? '...' : t.adminSave}</span>
                </button>
              </div>

              {/* Real Android APK Upload & Publishing */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                    <Smartphone className="w-4 h-4" />
                    <span>
                      {lang === 'te'
                        ? 'Android APK ప్రచురణ (GitHub Actions బిల్డ్ తర్వాత)'
                        : 'Android APK Distribution (After GitHub Actions Build)'}
                    </span>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500">
                    {apkStatus?.available
                      ? `Live · v${apkStatus.version || '1.0'} · ${((apkStatus.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB`
                      : 'Not published yet'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'te'
                    ? 'మీ Android ఫోన్‌లో GitHub Actions (`.github/workflows/android-apk.yml`) ద్వారా బిల్డ్ చేసిన నిజమైన `.apk` ఫైల్‌ను ఇక్కడ అప్‌లోడ్ చేస్తే, హోమ్ స్క్రీన్‌లో అందరికీ "Download Android APK" బటన్ ప్రత్యక్షమవుతుంది.'
                    : 'Once you build the real `.apk` via GitHub Actions on your phone or locally, upload it here to enable the live Download Android APK button on the Home Screen.'}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={apkVersionInput}
                    onChange={(e) => setApkVersionInput(e.target.value)}
                    placeholder="Version (e.g. 1.0.0)"
                    className="w-36 bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                  <label className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>
                      {apkBusy
                        ? lang === 'te'
                          ? 'అప్‌లోడ్ అవుతోంది...'
                          : 'Uploading...'
                        : lang === 'te'
                          ? 'బిల్డ్ చేసిన .apk అప్‌లోడ్ చేయండి'
                          : 'Upload Compiled .apk'}
                    </span>
                    <input
                      type="file"
                      accept=".apk,application/vnd.android.package-archive"
                      onChange={handleUploadApk}
                      disabled={apkBusy}
                      className="hidden"
                    />
                  </label>
                  {apkStatus?.available && (
                    <button
                      type="button"
                      onClick={handleRemoveApk}
                      disabled={apkBusy}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'te' ? 'APK తొలగించు' : 'Remove APK'}</span>
                    </button>
                  )}
                </div>

                {apkMsg && <p className="text-xs text-amber-500">{apkMsg}</p>}
              </div>
            </>
          )}

          {section === 'users' && (
            <div className="flex flex-col gap-3">
              {!adminToken && (
                <p className="text-xs text-amber-500">
                  {lang === 'te' ? 'వినియోగదారుల జాబితా కోసం సర్వర్ PIN తో అన్‌లాక్ చేయండి.' : 'Enter server Admin Passcode to manage user list.'}
                </p>
              )}
              {(overview?.users || []).map((u) => (
                <div
                  key={u.id}
                  className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {u.label} <span className="text-xs text-slate-500">({u.role})</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email || u.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleUserStatus(u.id, u.status)}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      u.status === 'blocked'
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'bg-emerald-500/15 text-emerald-500'
                    }`}
                  >
                    {u.status === 'blocked' ? 'Blocked (Unblock)' : 'Active (Block)'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {section === 'history' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleClearLogs()}
                  className="text-xs text-rose-500 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Logs</span>
                </button>
              </div>
              {(overview?.generationLogs || []).length === 0 ? (
                <p className="text-xs text-slate-500">No generation events recorded yet.</p>
              ) : (
                overview?.generationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">{log.type}</strong> · {log.summary}
                    </div>
                    <span className="text-slate-500 font-mono-tabular">{log.model}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {section === 'errors' && (
            <div className="flex flex-col gap-2">
              {(overview?.errorLogs || []).length === 0 ? (
                <p className="text-xs text-emerald-500">No API errors logged.</p>
              ) : (
                overview?.errorLogs.map((err) => (
                  <div
                    key={err.id}
                    className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-300"
                  >
                    <strong>{err.route}:</strong> {err.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
