import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_HASH = 'pin_hash';
const PIN_SALT = 'pin_salt';
const BIO_ENABLED = 'biometric_enabled';

/* ----------------------------- PIN (4 xonali parol) ----------------------------- */

const hashPin = (pin: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

export async function savePin(pin: string) {
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(PIN_SALT, salt);
  await SecureStore.setItemAsync(PIN_HASH, await hashPin(pin, salt));
}

export async function hasPin() {
  return !!(await SecureStore.getItemAsync(PIN_HASH));
}

export async function verifyPin(pin: string) {
  const [salt, saved] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT),
    SecureStore.getItemAsync(PIN_HASH),
  ]);
  if (!salt || !saved) return false;
  return (await hashPin(pin, salt)) === saved;
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_HASH);
  await SecureStore.deleteItemAsync(PIN_SALT);
  await SecureStore.deleteItemAsync(BIO_ENABLED);
}

/* ----------------------------- Face ID / barmoq izi ----------------------------- */

export type BiometricKind = 'face' | 'fingerprint';

export async function biometricKind(): Promise<BiometricKind | null> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hardware || !enrolled) return null;

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'face'
      : 'fingerprint';
  } catch {
    return null;
  }
}

export function biometricLabel(kind: BiometricKind) {
  if (kind === 'face') return Platform.OS === 'ios' ? 'Face ID' : 'Yuz orqali tanish';
  return Platform.OS === 'ios' ? 'Touch ID' : 'Barmoq izi';
}

export async function isBiometricEnabled() {
  return (await SecureStore.getItemAsync(BIO_ENABLED)) === '1';
}

export async function setBiometricEnabled(enabled: boolean) {
  if (enabled) await SecureStore.setItemAsync(BIO_ENABLED, '1');
  else await SecureStore.deleteItemAsync(BIO_ENABLED);
}

export async function authenticateBiometric() {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ilovaga kirish',
      cancelLabel: 'Bekor qilish',
      disableDeviceFallback: true,
    });
    return r.success;
  } catch {
    return false;
  }
}