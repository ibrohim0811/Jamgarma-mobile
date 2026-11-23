import { call, Card, Tx, myCardIds } from './home-api';

/* ------------------------------------------------------------------ */
/*  Karta ID si (UUID)                                                  */
/* ------------------------------------------------------------------ */

export const NO_CARD_ID_MESSAGE =
  "Karta ID si topilmadi. Backendda GET /cards/ javobiga `id` (UUID) maydonini qo'shish kerak.";

/**
 * To'ldirish va to'lov endpointlari karta UUID sini talab qiladi.
 * 1) /cards/ `id` qaytarsa, shuni ishlatadi.
 * 2) Aks holda bitta karta bo'lsa, tranzaksiyalardan topadi (faqat avval kommunal/aloqa
 *    to'lovi yoki to'ldirish bo'lgan bo'lsa ishlaydi).
 */
export function resolveCardId(cards: Card[], txs: Tx[]): string | null {
  const card = cards[0];
  if (!card) return null;
  if (card.id) return card.id;

  if (cards.length === 1) {
    const ids = myCardIds([], txs);
    if (ids.size === 1) return [...ids][0];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Kartani to'ldirish                                                  */
/* ------------------------------------------------------------------ */

export type TopUpResult = {
  transaction_id: string;
  card_id: string;
  amount: string;
  new_balance: string;
  status: string;
  transaction_type: string;
  created_at: string;
};

export const topUp = (card_id: string, amount: number, description?: string): Promise<TopUpResult> =>
  call('/cards/topup', {
    method: 'POST',
    body: JSON.stringify({ card_id, amount, ...(description ? { description } : {}) }),
  });

/* ------------------------------------------------------------------ */
/*  Kommunal va mobil aloqa to'lovlari                                  */
/* ------------------------------------------------------------------ */

export const payCommunal = (b: {
  card_id: string;
  service_type: string;
  provider_name: string;
  account_number: string;
  amount: number;
}): Promise<{ id: string; transaction_id: string; amount: string; status: string }> =>
  call('/communal/pay', { method: 'POST', body: JSON.stringify(b) });

export const payTelecom = (b: {
  card_id: string;
  provider: string;
  recipient_phone: string;
  amount: number;
}): Promise<{ message: string; transaction_id: string }> =>
  call('/telecom/pay', { method: 'POST', body: JSON.stringify(b) });

/* ------------------------------------------------------------------ */
/*  Xizmatlar ro'yxati                                                  */
/* ------------------------------------------------------------------ */

export type PayService = {
  kind: 'communal' | 'telecom';
  key: string;
  label: string;
  icon: string;
  provider?: string; // kommunal uchun standart xizmat ko'rsatuvchi nomi
};

export const COMMUNAL: PayService[] = [
  { kind: 'communal', key: 'electricity', label: 'Elektr energiya', icon: 'zap', provider: 'Hududiy elektr tarmoqlari' },
  { kind: 'communal', key: 'gas', label: 'Gaz', icon: 'wind', provider: 'Hududgaz' },
  { kind: 'communal', key: 'water', label: 'Suv', icon: 'droplet', provider: "Suv ta'minoti" },
  { kind: 'communal', key: 'heating', label: 'Isitish', icon: 'thermometer', provider: "Issiqlik ta'minoti" },
  { kind: 'communal', key: 'trash', label: 'Chiqindi', icon: 'trash-2', provider: 'Maishiy chiqindi' },
  { kind: 'communal', key: 'hoa', label: 'Shirkat (TSJ)', icon: 'home', provider: 'Uy-joy shirkati' },
];

export const TELECOM: PayService[] = [
  { kind: 'telecom', key: 'beeline', label: 'Beeline', icon: 'smartphone' },
  { kind: 'telecom', key: 'uzmobile', label: 'Uzmobile', icon: 'smartphone' },
  { kind: 'telecom', key: 'ucell', label: 'Ucell', icon: 'smartphone' },
  { kind: 'telecom', key: 'mobiuz', label: 'Mobiuz', icon: 'smartphone' },
  { kind: 'telecom', key: 'uztelecom_internet', label: 'Uztelecom internet', icon: 'wifi' },
];