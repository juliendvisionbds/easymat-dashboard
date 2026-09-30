const fr = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");

export const eur = (n: number) => `${fr(n)} €`;

export function k(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")} M€`;
  if (a >= 1000) return `${fr(n / 1000)} k€`;
  return `${Math.round(n)} €`;
}

export const pct = (n: number) => `${n > 0 ? "+" : ""}${String(Math.round(n * 10) / 10).replace(".", ",")} %`;

export const part = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")} %`;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
