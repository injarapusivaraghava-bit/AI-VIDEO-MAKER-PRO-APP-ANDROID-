import { LanguageMode } from '../types/studio';

/**
 * Resolves API endpoint URLs cleanly across:
 * 1. Web browser / Express hosted origin (same-origin `/api/...`)
 * 2. Standalone / Capacitor Android WebView when `VITE_API_BASE_URL` is optionally set
 * 3. Local-only mode when `VITE_API_BASE_URL` is not provided (no fake URLs, no crash)
 */
const CONFIGURED_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export type AiServiceConnectionState = 'checking' | 'connected' | 'not-configured';

export function getConfiguredApiBase(): string {
  return CONFIGURED_API_BASE;
}

export function hasConfiguredApiBase(): boolean {
  return CONFIGURED_API_BASE.length > 0;
}

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (typeof cap?.isNativePlatform === 'function') {
    try {
      return Boolean(cap.isNativePlatform());
    } catch {
      return false;
    }
  }
  return window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
}

/**
 * Inside native Capacitor WebView without `VITE_API_BASE_URL`, relative `/api/*`
 * points to `https://localhost/api/*`, which has no backend server.
 */
export function isBackendUnavailableLocally(): boolean {
  return isCapacitorNative() && !hasConfiguredApiBase();
}

export function getAiServiceRequiredMessage(lang: LanguageMode = 'en'): string {
  return lang === 'te'
    ? 'ఈ AI ఫీచర్‌కు AI సర్వీస్ కనెక్షన్ (బ్యాకెండ్ సర్వర్ లేదా VITE_API_BASE_URL) అవసరం. లోకల్ వీడియో/షార్ట్స్ ఎడిటర్, ఫొటో & కొలాజ్, ఆడియో ఎడిటర్, 2D గేమ్‌లు & MP4 ఎగుమతి బ్యాకెండ్ లేకుండానే పనిచేస్తాయి.'
    : 'This AI feature requires an AI service connection (hosted backend server or optional VITE_API_BASE_URL). Local Video/Shorts editing, Photo & Collage, Mic & Audio tools, 2D Games, and MP4/WebM export work without a backend URL.';
}

export function resolveApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (CONFIGURED_API_BASE) {
    return `${CONFIGURED_API_BASE}${normalized}`;
  }
  return normalized;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (isBackendUnavailableLocally()) {
    throw new Error(getAiServiceRequiredMessage('en'));
  }
  return fetch(resolveApiUrl(path), init);
}

export async function safeParseJson<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiJson<T = any>(
  path: string,
  init?: RequestInit,
  lang: LanguageMode = 'en'
): Promise<T> {
  if (isBackendUnavailableLocally()) {
    throw new Error(getAiServiceRequiredMessage(lang));
  }

  let res: Response;
  try {
    res = await fetch(resolveApiUrl(path), init);
  } catch {
    throw new Error(getAiServiceRequiredMessage(lang));
  }

  const data = await safeParseJson<any>(res);
  if (!data) {
    throw new Error(getAiServiceRequiredMessage(lang));
  }
  if (!res.ok) {
    throw new Error(data.error || 'AI service request failed');
  }
  return data as T;
}

export async function checkAiServiceConnection(): Promise<boolean> {
  if (isBackendUnavailableLocally()) {
    return false;
  }

  const controller = new AbortController();
  const timeout = typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), 3500) : null;
  try {
    const res = await fetch(resolveApiUrl('/api/health'), { signal: controller.signal });
    if (!res.ok) return false;
    const data = await safeParseJson<{ ok?: boolean; hasApiKey?: boolean }>(res);
    return Boolean(data?.ok && data?.hasApiKey);
  } catch {
    return false;
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }
}
