import { Tx, directionOf, txMeta, parseDate } from './home-api';

/* ------------------------------------------------------------------ */
/*  Statistika: hammasi /transactions/ ma'lumotidan frontendda hisoblanadi */
/* ------------------------------------------------------------------ */

export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
export const WEEKDAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']; // dushanba - yakshanba

const dayKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export type CategoryKey = 'communal' | 'telecom' | 'transfer';

export const CATEGORIES: Record<CategoryKey, { label: string; color: string }> = {
  communal: { label: "Kommunal to'lovlar", color: '#F5B95F' },
  telecom: { label: 'Mobil aloqa va internet', color: '#7CC4FF' },
  transfer: { label: "O'tkazmalar", color: '#C9A8FF' },
};

export type DayPoint = { date: Date; income: number; expense: number };
export type StatItem = { key: string; title: string; icon: string; amount: number; count: number };

export type Stats = {
  income: number;
  expense: number;
  net: number;
  avgDaily: number;
  count: number;
  unknown: number; // yo'nalishi aniqlanmagan P2P tranzaksiyalar soni
  daily: DayPoint[];
  categories: { key: CategoryKey; amount: number; count: number }[];
  items: StatItem[];
  biggest: { title: string; amount: number; date: Date } | null;
};

/** Oxirgi `days` kun uchun kirim/chiqim statistikasi */
export function computeStats(txs: Tx[], ids: Set<string>, days: number, now = new Date()): Stats {
  const daily: DayPoint[] = Array.from({ length: days }, (_, i) => ({
    date: addDays(now, -(days - 1 - i)),
    income: 0,
    expense: 0,
  }));
  const index = new Map<number, number>();
  daily.forEach((p, i) => index.set(dayKey(p.date), i));

  let income = 0;
  let expense = 0;
  let count = 0;
  let unknown = 0;
  let biggest: Stats['biggest'] = null;

  const cats: Record<CategoryKey, { amount: number; count: number }> = {
    communal: { amount: 0, count: 0 },
    telecom: { amount: 0, count: 0 },
    transfer: { amount: 0, count: 0 },
  };
  const items = new Map<string, StatItem>();

  txs.forEach((tx) => {
    if (tx.status === 'failed') return;

    const date = parseDate(tx.created_at);
    const i = index.get(dayKey(date));
    if (i === undefined) return;

    const dir = directionOf(tx, ids);
    if (dir === 'unknown') {
      unknown++;
      return;
    }

    const amount = Number(tx.amount) || 0;
    count++;

    if (dir === 'in') {
      income += amount;
      daily[i].income += amount;
      return;
    }

    // chiqim
    expense += amount;
    daily[i].expense += amount;

    const cat: CategoryKey =
      tx.transaction_type === 'communal' ? 'communal' : tx.transaction_type === 'telecom' ? 'telecom' : 'transfer';
    cats[cat].amount += amount;
    cats[cat].count += 1;

    const meta = txMeta(tx, dir);
    const key = `${tx.transaction_type}:${tx.service_type ?? tx.provider ?? ''}`;
    const prev = items.get(key);
    if (prev) {
      prev.amount += amount;
      prev.count += 1;
    } else {
      items.set(key, { key, title: meta.title, icon: meta.icon, amount, count: 1 });
    }

    if (!biggest || amount > biggest.amount) biggest = { title: meta.title, amount, date };
  });

  return {
    income,
    expense,
    net: income - expense,
    avgDaily: expense / days,
    count,
    unknown,
    daily,
    categories: (Object.keys(cats) as CategoryKey[]).map((key) => ({ key, ...cats[key] })),
    items: [...items.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    biggest,
  };
}

/* ------------------------------------------------------------------ */
/*  Contribution graph (GitHub kabi): har kungi KIRIM (to'ldirish)       */
/* ------------------------------------------------------------------ */

export type Cell = { date: Date; amount: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

export type ContributionData = {
  weeks: Cell[][]; // har hafta 7 ta kun (dushanba - yakshanba)
  total: number; // yillik jami kirim
  count: number; // kirim tranzaksiyalari soni
  activeDays: number;
  longest: number; // eng uzun ketma-ket kunlar
  current: number; // joriy ketma-ketlik
};

export function contribution(txs: Tx[], ids: Set<string>, weeks = 53, now = new Date()): ContributionData {
  const todayDow = (now.getDay() + 6) % 7; // dushanba = 0
  const base = addDays(now, -(todayDow + (weeks - 1) * 7));
  const todayKey = dayKey(now);
  const firstKey = dayKey(base);

  const totals = new Map<number, number>();
  let total = 0;
  let count = 0;

  txs.forEach((tx) => {
    if (tx.status === 'failed' || directionOf(tx, ids) !== 'in') return;
    const k = dayKey(parseDate(tx.created_at));
    if (k < firstKey || k > todayKey) return;

    const amount = Number(tx.amount) || 0;
    totals.set(k, (totals.get(k) ?? 0) + amount);
    total += amount;
    count++;
  });

  // Darajalar: noldan farqli kunlar kvartillari bo'yicha (GitHub kabi)
  const nz = [...totals.values()].sort((a, b) => a - b);
  const q = (p: number) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))];
  const [q1, q2, q3] = nz.length ? [q(0.25), q(0.5), q(0.75)] : [0, 0, 0];

  const grid: Cell[][] = [];
  const flat: Cell[] = [];

  for (let w = 0; w < weeks; w++) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(base, w * 7 + d);
      const k = dayKey(date);
      const future = k > todayKey;
      const amount = totals.get(k) ?? 0;
      const level = future || amount <= 0 ? 0 : amount <= q1 ? 1 : amount <= q2 ? 2 : amount <= q3 ? 3 : 4;
      const cell: Cell = { date, amount, level: level as Cell['level'], future };
      col.push(cell);
      if (!future) flat.push(cell);
    }
    grid.push(col);
  }

  // Ketma-ket kunlar
  let longest = 0;
  let run = 0;
  flat.forEach((c) => {
    run = c.amount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  });

  let current = 0;
  let i = flat.length - 1;
  if (i >= 0 && flat[i].amount === 0) i--; // bugun hali to'ldirilmagan bo'lsa, kechadan sanaymiz
  while (i >= 0 && flat[i].amount > 0) {
    current++;
    i--;
  }

  return { weeks: grid, total, count, activeDays: totals.size, longest, current };
}