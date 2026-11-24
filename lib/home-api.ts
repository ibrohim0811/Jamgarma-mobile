import { authFetch, ApiError, NetworkError } from './auth-api';

/* ------------------------------------------------------------------ */
/*  Turlar (API hujjatiga mos)                                          */
/* ------------------------------------------------------------------ */

export type Card = {
  id?: string; // hujjatga ko'ra hozircha qaytmaydi; qaytsa avtomatik ishlatiladi
  card_number: number;
  balance: string;
  is_frozen: boolean;
  created_at: string;
  user_fullname: string;
};

export type TxType = 'p2p' | 'communal' | 'telecom' | 'replenishment';

export type Tx = {
  id: string;
  sender_card_id: string | null;
  receiver_card_id: string | null;
  amount: string;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  transaction_type: TxType;
  service_type: string | null;
  provider: string | null;
  recipient_phone: string | null;
  description: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/*  So'rovlar                                                           */
/* ------------------------------------------------------------------ */

export async function call(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await authFetch(path, init);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new NetworkError();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof data?.detail === 'string' ? data.detail : 'Xatolik yuz berdi');
  }
  return res.json();
}

export const getCards = (): Promise<Card[]> => call('/cards/');
export const getTransactions = (): Promise<Tx[]> => call('/transactions/');
export const createCard = (): Promise<Card> => call('/cards/', { method: 'POST' });

/** PATCH /cards/freeze va /cards/unfreeze: yangilangan kartani qaytaradi */
export const setCardFrozen = (card_number: number, frozen: boolean): Promise<Card> =>
  call(frozen ? '/cards/freeze' : '/cards/unfreeze', {
    method: 'PATCH',
    body: JSON.stringify({ card_number }),
  });

/* ------------------------------------------------------------------ */
/*  Pul va sana formatlari                                              */
/* ------------------------------------------------------------------ */

const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** 1284500.5 → { int: "1 284 500", dec: "50" } */
export function splitMoney(n: number) {
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  return { int: group(i), dec: d };
}

/** Kasr qismi 00 bo'lsa yashiradi: "48 000" yoki "48 000.50" */
export function money(n: number) {
  const { int, dec } = splitMoney(n);
  return dec === '00' ? int : `${int}.${dec}`;
}

export const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

/** "2026-11-20T10:18:00.000000+00:00" → Date (mikrosekundlarni kesib tashlaydi) */
export function parseDate(iso: string) {
  return new Date(iso.replace(/(\.\d{3})\d+/, '$1'));
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function whenLabel(d: Date, now = new Date()) {
  const diff = Math.round((dayStart(now) - dayStart(d)) / 86400000);
  if (diff === 0) return `Bugun, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diff === 1) return 'Kecha';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/*  Tranzaksiya yo'nalishi (kirim / chiqim)                             */
/* ------------------------------------------------------------------ */

export type Direction = 'in' | 'out' | 'unknown';

/**
 * Foydalanuvchi kartalarining ID lari.
 * /cards/ ID qaytarsa o'shani ishlatadi, aks holda tranzaksiyalardan topadi:
 *  - kommunal/telecom: yuboruvchi karta har doim o'zimizniki
 *  - hisob to'ldirish: qabul qiluvchi karta o'zimizniki
 */
export function myCardIds(cards: Card[], txs: Tx[]) {
  const ids = new Set<string>();
  cards.forEach((c) => c.id && ids.add(c.id));
  txs.forEach((t) => {
    if ((t.transaction_type === 'communal' || t.transaction_type === 'telecom') && t.sender_card_id) {
      ids.add(t.sender_card_id);
    }
    if (t.transaction_type === 'replenishment' && t.receiver_card_id) {
      ids.add(t.receiver_card_id);
    }
  });
  return ids;
}

export function directionOf(tx: Tx, ids: Set<string>): Direction {
  if (tx.transaction_type === 'replenishment') return 'in';
  if (tx.transaction_type === 'communal' || tx.transaction_type === 'telecom') return 'out';

  // p2p
  const s = !!tx.sender_card_id && ids.has(tx.sender_card_id);
  const r = !!tx.receiver_card_id && ids.has(tx.receiver_card_id);
  if (s && !r) return 'out';
  if (r && !s) return 'in';
  return 'unknown';
}

/* ------------------------------------------------------------------ */
/*  Tranzaksiya ko'rinishi (ikonka, sarlavha, kategoriya)               */
/* ------------------------------------------------------------------ */

const SERVICE: Record<string, { title: string; icon: string }> = {
  electricity: { title: 'Elektr energiya', icon: 'zap' },
  gas: { title: 'Gaz', icon: 'wind' },
  water: { title: 'Suv', icon: 'droplet' },
  heating: { title: 'Isitish', icon: 'thermometer' },
  trash: { title: 'Chiqindi', icon: 'trash-2' },
  hoa: { title: 'Shirkat (TSJ)', icon: 'home' },
};

const PROVIDER: Record<string, string> = {
  beeline: 'Beeline',
  uzmobile: 'Uzmobile',
  ucell: 'Ucell',
  mobiuz: 'Mobiuz',
  uztelecom_internet: 'Uztelecom internet',
};

export function txMeta(tx: Tx, dir: Direction): { icon: string; title: string; category: string } {
  switch (tx.transaction_type) {
    case 'replenishment':
      return { icon: 'arrow-down-left', title: "Hisob to'ldirish", category: 'Kirim' };

    case 'communal': {
      const s = SERVICE[tx.service_type ?? ''];
      return { icon: s?.icon ?? 'home', title: s?.title ?? "Kommunal to'lov", category: 'Kommunal' };
    }

    case 'telecom':
      return {
        icon: tx.provider === 'uztelecom_internet' ? 'wifi' : 'smartphone',
        title: PROVIDER[tx.provider ?? ''] ?? "Mobil to'lov",
        category: tx.provider === 'uztelecom_internet' ? 'Internet' : 'Mobil aloqa',
      };

    default: {
      // p2p
      const custom = tx.description && tx.description !== "P2P o'tkazma" ? tx.description : null;
      return {
        icon: dir === 'in' ? 'arrow-down-left' : 'arrow-up-right',
        title: custom ?? (dir === 'in' ? 'Kartaga kirim' : dir === 'out' ? "Kartaga o'tkazma" : "P2P o'tkazma"),
        category: "O'tkazma",
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Oylik xarajat                                                       */
/* ------------------------------------------------------------------ */

export type Spending = {
  month: number; // shu oy chiqimi
  prevMonth: number; // o'tgan oy chiqimi
  days: number[]; // oxirgi N kun (oxirgisi - bugun)
};

export function computeSpending(txs: Tx[], ids: Set<string>, nDays = 12, now = new Date()): Spending {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const out: Spending = { month: 0, prevMonth: 0, days: Array(nDays).fill(0) };

  txs.forEach((tx) => {
    if (tx.status === 'failed' || directionOf(tx, ids) !== 'out') return;

    const d = parseDate(tx.created_at);
    const amount = Number(tx.amount) || 0;

    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) out.month += amount;
    else if (d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()) out.prevMonth += amount;

    const diff = Math.round((dayStart(now) - dayStart(d)) / 86400000);
    if (diff >= 0 && diff < nDays) out.days[nDays - 1 - diff] += amount;
  });

  return out;
}