import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Ob-havo ma'lumoti: Open-Meteo (bepul, API kalit kerak emas)         */
/* ------------------------------------------------------------------ */

export type WeatherKind = 'sun' | 'night' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm' | 'blossom';

export type WeatherInfo = {
  kind: WeatherKind;
  temp: number; // °C
  isDay: boolean;
};

const TASHKENT = { lat: 41.2995, lon: 69.2401 }; // joylashuv bo'lmasa shu ishlatiladi

/** WMO ob-havo kodi → animatsiya turi */
export function kindFromCode(code: number, isDay: boolean, month = new Date().getMonth()): WeatherKind {
  if (code === 0 || code === 1) {
    if (!isDay) return 'night';
    return month >= 2 && month <= 4 ? 'blossom' : 'sun'; // mart-may: bahorgi gullar
  }
  if (code === 2 || code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloud';
}

/** Karta foni rangi (ob-havoga qarab ozgina tovlanadi) */
export function weatherTint(kind: WeatherKind) {
  switch (kind) {
    case 'sun':
      return '#171409';
    case 'night':
      return '#0B0E17';
    case 'cloud':
      return '#101315';
    case 'fog':
      return '#121414';
    case 'rain':
      return '#0A1218';
    case 'snow':
      return '#0F1519';
    case 'storm':
      return '#0C0E14';
    default:
      return '#0E1210'; // blossom
  }
}

/** Feather ikonka nomi */
export function weatherIcon(kind: WeatherKind) {
  switch (kind) {
    case 'night':
      return 'moon';
    case 'cloud':
      return 'cloud';
    case 'fog':
      return 'cloud-drizzle';
    case 'rain':
      return 'cloud-rain';
    case 'snow':
      return 'cloud-snow';
    case 'storm':
      return 'cloud-lightning';
    default:
      return 'sun';
  }
}

/* ------------------------------------------------------------------ */

async function getCoords() {
  try {
    const Location = await import('expo-location');
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') status = (await Location.requestForegroundPermissionsAsync()).status;
    if (status !== 'granted') return TASHKENT;

    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));

    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return TASHKENT;
  }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const json = await res.json();
    const c = json?.current;
    if (!c || typeof c.weather_code !== 'number') return null;

    const isDay = c.is_day === 1;
    return { kind: kindFromCode(c.weather_code, isDay), temp: Number(c.temperature_2m) || 0, isDay };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let cache: { at: number; data: WeatherInfo } | null = null;
const TTL = 15 * 60 * 1000;

/** Joriy ob-havo. `enabled` false bo'lsa kutadi (boshqa ruxsat oynalari bilan to'qnashmaslik uchun) */
export function useWeather(enabled = true) {
  const [weather, setWeather] = useState<WeatherInfo | null>(cache?.data ?? null);

  useEffect(() => {
    if (!enabled) return;
    if (cache && Date.now() - cache.at < TTL) {
      setWeather(cache.data);
      return;
    }

    let alive = true;
    (async () => {
      const { lat, lon } = await getCoords();
      const data = await fetchWeather(lat, lon);
      if (data) {
        cache = { at: Date.now(), data };
        if (alive) setWeather(data);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled]);

  return weather;
}