import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL, ApiError, NetworkError, saveTokens, authFetch } from './auth-api';

/* ------------------------------------------------------------------ */
/*  Ro'yxatdan o'tish ma'lumotlari (faqat xotirada, diskka yozilmaydi)  */
/* ------------------------------------------------------------------ */

export type RegisterDraft = {
  first_name: string;
  last_name: string;
  phone: string; // faqat 9 ta raqam (+998 siz)
  password: string;
};

const EMPTY: RegisterDraft = { first_name: '', last_name: '', phone: '', password: '' };
let draft: RegisterDraft = { ...EMPTY };

export const getDraft = () => draft;
export const setDraft = (patch: Partial<RegisterDraft>) => {
  draft = { ...draft, ...patch };
};
export const clearDraft = () => {
  draft = { ...EMPTY };
};

/* ------------------------------------------------------------------ */
/*  So'rov yordamchilari                                                */
/* ------------------------------------------------------------------ */

async function post(path: string, body: unknown, timeoutMs = 20000) {
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

function detailOf(data: any, fallback = 'Xatolik yuz berdi') {
  const d = data?.detail;
  if (typeof d === 'string') return d;
  // 422 validatsiya xatosi: [{ msg: "Value error, ..." }]
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace(/^Value error,\s*/, '');
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  POST /auth/register  →  OTP yuboriladi                              */
/* ------------------------------------------------------------------ */

export async function register(d: RegisterDraft) {
  const { res, data } = await post('/auth/register', {
    first_name: d.first_name.trim(),
    last_name: d.last_name.trim(),
    phone_number: `+998${d.phone}`,
    password: d.password,
  });

  if (res.status === 200) return data as { message: string; status: number };
  throw new ApiError(res.status, detailOf(data));
}

/* ------------------------------------------------------------------ */
/*  POST /auth/confirm-otp  →  akkaunt yaratiladi, tokenlar saqlanadi    */
/* ------------------------------------------------------------------ */

export async function confirmOtp(phone: string, code: string) {
  const { res, data } = await post('/auth/confirm-otp', {
    phone_number: `+998${phone}`,
    otp_code: Number(code),
  });

  if (res.status === 200 && data.access_token) {
    await saveTokens(data.access_token, data.refresh_token);
    return data as { message: string; access_token: string; refresh_token: string };
  }

  throw new ApiError(res.status, detailOf(data));
}

/* ------------------------------------------------------------------ */
/*  POST /devices/register  →  Expo push token (xato bersa jim o'tadi)   */
/* ------------------------------------------------------------------ */

export async function registerDevice() {
  try {
    if (Platform.OS === 'web') return;

    // Dinamik import: Expo Go'da paket cheklangan bo'lsa ham ilova qulamaydi
    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await authFetch('/devices/register', {
      method: 'POST',
      body: JSON.stringify({ token, device_type: Platform.OS }),
    });
  } catch (e) {
    console.log("Push token ro'yxatdan o'tmadi:", e);
  }
}

/* ------------------------------------------------------------------ */
/*  GET /auth/me                                                        */
/* ------------------------------------------------------------------ */

export type Me = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  is_active: boolean;
};

export async function getMe(): Promise<Me> {
  let res: Response;
  try {
    res = await authFetch('/auth/me');
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new NetworkError();
  }
  if (res.ok) return res.json();
  throw new ApiError(res.status, "Foydalanuvchi ma'lumotini olib bo'lmadi");
}