import {
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  clearTokens,
} from './auth-api';
import { hasPin, clearPin } from './pin';

/** JWT ichidagi `exp` (ms). O'qib bo'lmasa null. */
function tokenExpiresAt(token: string): number | null {
  try {
    if (typeof atob !== 'function') return null;
    const part = token.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Token muddati tugagan (yoki 1 daqiqadan kamroq qolgan) bo'lsa true */
function isExpired(token: string, skewMs = 60_000) {
  const exp = tokenExpiresAt(token);
  return exp === null ? true : exp - skewMs <= Date.now();
}

export type SessionState =
  | 'valid' // access token yaroqli (yoki yangilandi)
  | 'offline' // tokenlar bor, lekin serverga ulanib bo'lmadi
  | 'none'; // tokenlar yo'q yoki refresh token ham tugagan → qayta kirish kerak

export async function ensureSession(): Promise<SessionState> {
  const refresh = await getRefreshToken();
  if (!refresh) return 'none';

  // Refresh token (30 kun) ham tugagan bo'lsa, sessiya tugagan
  const refreshExp = tokenExpiresAt(refresh);
  if (refreshExp !== null && refreshExp <= Date.now()) {
    await clearTokens();
    return 'none';
  }

  // Access token (1 kun) hali yaroqli bo'lsa, so'rov yubormaymiz
  const access = await getAccessToken();
  if (access && !isExpired(access)) return 'valid';

  // Aks holda refresh token orqali yangi access token olamiz
  if (await refreshAccessToken()) return 'valid';

  // Yangilab bo'lmadi: tokenlar o'chirilgan bo'lsa server rad etgan, aks holda tarmoq muammosi
  return (await getRefreshToken()) ? 'offline' : 'none';
}

/** Ilova ochilganda qaysi ekranga o'tishni aniqlaydi */
export async function resolveStartRoute(): Promise<string> {
  const state = await ensureSession();

  if (state === 'none') {
    await clearPin(); // eski akkauntning paroli keyingi akkauntga o'tib qolmasin
    return '/login';
  }

  // Sessiya bor: parol o'rnatilgan bo'lsa so'raymiz, yo'q bo'lsa yangi o'rnatamiz
  return (await hasPin()) ? '/pin?mode=unlock' : '/pin';
}