import { Tx, Direction, directionOf, txMeta, parseDate, MONTHS } from './home-api';

export type ActivityRowData = {
  id: string;
  icon: string;
  title: string;
  category: string;
  time: string; // "10:24"
  date: Date;
  amount: number;
  dir: Direction;
  status: Tx['status'];
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Tranzaksiyalarni ekranga tayyor qatorlarga aylantiradi (eng yangisi birinchi) */
export function buildActivity(txs: Tx[], ids: Set<string>): ActivityRowData[] {
  return txs
    .map((tx) => {
      const dir = directionOf(tx, ids);
      const meta = txMeta(tx, dir);
      const date = parseDate(tx.created_at);
      return {
        id: tx.id,
        icon: meta.icon,
        title: meta.title,
        category: meta.category,
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
        date,
        amount: Number(tx.amount) || 0,
        dir,
        status: tx.status,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** "Bugun", "Kecha" yoki "20 Noyabr 2026" */
export function dayLabel(d: Date, now = new Date()) {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff === 0) return 'Bugun';
  if (diff === 1) return 'Kecha';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}