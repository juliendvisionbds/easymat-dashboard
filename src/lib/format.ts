// Signe moins typographique (U+2212), jamais le trait d'union.
const minus = (s: string) => s.replace("-", "−");
const fr = (n: number) => minus(Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " "));

export const eur = (n: number) => `${fr(n)} €`;

export function k(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${minus((n / 1_000_000).toFixed(2)).replace(".", ",")} M€`;
  if (a >= 1000) return `${fr(n / 1000)} k€`;
  return `${minus(String(Math.round(n)))} €`;
}

export const pct = (n: number) => `${n > 0 ? "+" : ""}${minus(String(Math.round(n * 10) / 10)).replace(".", ",")} %`;

export const part = (n: number) => `${minus(String(Math.round(n * 10) / 10)).replace(".", ",")} %`;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
