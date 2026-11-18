import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * API manzili.
 *  - iOS simulyator / web:  http://127.0.0.1:8000
 *  - Android emulyator:     http://10.0.2.2:8000  (emulyatordan kompyuter localhost'i shu)
 *  - Haqiqiy telefon:       .env faylida EXPO_PUBLIC_API_URL=http://<kompyuter-IP>:8000
 */
const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL;

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

/* ----------------------------- Tokenlar ----------------------------- */

export async function saveTokens(access: string, refresh?: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS_KEY);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY);

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

/* ----------------------------- Xatolar ------------------------------ */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Serverga ulanib bo\'lmadi. Internetni tekshiring.');
  }
}

/* ----------------------------- So'rov ------------------------------- */

async function post(path: string, body: unknown, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

function detailOf(data: any, fallback: string) {
  return typeof data?.detail === 'string' ? data.detail : fallback;
}

/* ----------------------------- Login -------------------------------- */

/** phone: "+998901234567" ko'rinishida. Muvaffaqiyatli bo'lsa tokenlarni saqlaydi. */
export async function login(phone: string, password: string) {
  const { res, data } = await post('/auth/login', {
    phone_number: phone,
    password,
  });

  if (res.status === 200) {
    await saveTokens(data.access_token, data.refresh_token);
    return data as { message: string; access_token: string; refresh_token: string };
  }

  throw new ApiError(res.status, detailOf(data, 'Xatolik yuz berdi'));
}

/* ------------------------- Refresh token ---------------------------- */

let refreshing: Promise<string | null> | null = null;

/** Refresh token orqali yangi access token oladi. Muvaffaqiyatsiz bo'lsa null. */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing; // bir vaqtda bitta refresh

  refreshing = (async () => {
    try {
      const refresh = await getRefreshToken();
      if (!refresh) return null;

      const { res, data } = await post('/auth/refresh', { refresh_token: refresh });

      if (res.status === 200 && data.access_token) {
        await saveTokens(data.access_token);
        return data.access_token as string;
      }

      // Refresh token yaroqsiz yoki muddati o'tgan → qayta kirish kerak
      await clearTokens();
      return null;
    } catch {
      return null; // tarmoq xatosi: tokenlarni o'chirmaymiz
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/* --------------- Himoyalangan so'rovlar uchun yordamchi -------------- */

/**
 * Authorization header bilan so'rov yuboradi.
 * 401 bo'lsa access tokenni yangilab, so'rovni bir marta qayta yuboradi.
 */
export async function authFetch(path: string, init: RequestInit = {}) {
  const send = async (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await send(await getAccessToken());

  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (!fresh) throw new ApiError(401, 'Sessiya tugadi. Qayta kiring.');
    res = await send(fresh);
  }

  return res;
}