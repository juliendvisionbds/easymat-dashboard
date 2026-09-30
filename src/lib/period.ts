import { REGLES } from "./config";

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Clé de mois "YYYY-MM" <-> index entier, pour l'arithmétique de mois.
export const monthKey = (date: string) => date.slice(0, 7);
export const monthIndex = (mk: string) => +mk.slice(0, 4) * 12 + (+mk.slice(5, 7) - 1);
export const monthFromIndex = (i: number) => `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`;

export const monthLabel = (mk: string) => `${MOIS_COURTS[+mk.slice(5, 7) - 1]} ${mk.slice(2, 4)}`;
export const monthLongLabel = (mk: string) => `${MOIS_LONGS[+mk.slice(5, 7) - 1]} ${mk.slice(0, 4)}`;
export const dateFr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

// Un exercice est identifié par l'année de son premier mois (2024 = nov. 2024 → oct. 2025).
export function exerciceOf(date: string): number {
  const y = +date.slice(0, 4);
  const m = +date.slice(5, 7);
  return m >= REGLES.moisDebutExercice ? y : y - 1;
}

export function exerciceMonths(ex: number): string[] {
  const first = ex * 12 + (REGLES.moisDebutExercice - 1);
  return Array.from({ length: 12 }, (_, i) => monthFromIndex(first + i));
}

export function exerciceLabel(ex: number): string {
  const months = exerciceMonths(ex);
  const [y, m] = [+months[11].slice(0, 4), +months[11].slice(5, 7)];
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${dateFr(`${months[0]}-01`)} → ${dateFr(`${months[11]}-${pad(lastDay)}`)}`;
}
