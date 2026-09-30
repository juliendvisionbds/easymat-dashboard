import { REGLES } from "./config";
import { isoDate, monthKey } from "./period";
import type { Facture } from "./types";

export type ParseResult = {
  factures: Facture[];
  totalHt: number;
  // Total HT lu sur la ligne « Total Journal » du fichier, quand elle existe.
  declaredTotal: number | null;
  periodStart: string;
  periodEnd: string;
  // Répartition des factures par mois (YYYY-MM).
  months: { mk: string; n: number; ht: number; replaced: boolean }[];
  warnings: string[];
};

export class ParseError extends Error {}

type Cell = unknown;

const text = (c: Cell) => (c == null ? "" : String(c).replace(/\s+/g, " ").trim());

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

export function parseAmount(c: Cell): number | null {
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  let s = text(c).replace(/[\s  €]/g, "").replace(/−/g, "-");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export function parseDate(c: Cell): string | null {
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? null : c.toISOString().slice(0, 10);
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/.exec(text(c));
  if (!m) return null;
  return isoDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
}

export function parseCsv(input: string): string[][] {
  const src = input.replace(/^﻿/, "");
  // Le séparateur se lit sur la ligne d'en-tête, pas sur le titre du journal.
  const headerLine = src.split(/\r?\n/, 30).find((l) => /montant/i.test(l)) ?? "";
  const count = (ch: string) => headerLine.split(ch).length - 1;
  const sep = count(";") > count(",") ? ";" : count("\t") > count(",") ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

type Columns = { code: number; nom: number; numero: number; date: number; ht: number; tva: number; ttc: number };

function findColumns(grid: Cell[][]): { header: number; cols: Columns } | null {
  for (let r = 0; r < Math.min(grid.length, 30); r++) {
    const cells = grid[r].map((c) => norm(text(c)));
    const find = (re: RegExp) => cells.findIndex((c) => re.test(c));
    const cols: Columns = {
      code: find(/\bCODE\b/),
      nom: find(/\bNOM\b/),
      numero: find(/FACTURE/),
      date: find(/^DATE\b/),
      ht: find(/\bHT\b/),
      tva: find(/\bTVA\b/),
      ttc: find(/\bTTC\b/),
    };
    if (cols.code !== -1 && cols.numero !== -1 && cols.date !== -1 && cols.ht !== -1) return { header: r, cols };
  }
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseGrid(grid: Cell[][]): ParseResult {
  const found = findColumns(grid);
  if (!found) {
    throw new ParseError(
      "Format non reconnu. Le fichier doit être le journal des ventes Edilogic, avec les colonnes Code client, N° Facture, Date et Montant HT."
    );
  }
  const { header, cols } = found;
  const factures = new Map<string, Facture>();
  const warnings: string[] = [];
  let declaredTotal: number | null = null;

  for (let r = header + 1; r < grid.length; r++) {
    const row = grid[r];
    const code = text(row[cols.code]);
    const numero = text(row[cols.numero]);
    const ht = parseAmount(row[cols.ht]);

    if (!numero) {
      // Ligne de total : sous « Total Journal », ou « Total Agence ».
      if (ht != null && (!code || /^TOTAL/i.test(code))) declaredTotal ??= ht;
      continue;
    }
    const date = parseDate(row[cols.date]);
    if (!code || !date || ht == null) {
      // Les en-têtes répétés en haut de page ne sont pas des erreurs.
      if (!/FACTURE/i.test(numero)) {
        warnings.push(`Ligne ${r + 1} ignorée (facture ${numero}) : code client, date ou montant illisible.`);
      }
      continue;
    }
    if (factures.has(numero)) warnings.push(`Facture ${numero} présente deux fois : la dernière ligne est conservée.`);
    const tva = cols.tva === -1 ? null : parseAmount(row[cols.tva]);
    const ttc = cols.ttc === -1 ? null : parseAmount(row[cols.ttc]);
    factures.set(numero, {
      numero,
      clientCode: code,
      clientName: (cols.nom === -1 ? "" : text(row[cols.nom])) || code,
      date,
      ht: round2(ht),
      tva: round2(tva ?? 0),
      ttc: round2(ttc ?? ht + (tva ?? 0)),
    });
  }

  const list = [...factures.values()];
  if (!list.length) throw new ParseError("Aucune facture trouvée dans le fichier.");

  const totalHt = round2(list.reduce((a, f) => a + f.ht, 0));
  if (declaredTotal != null && Math.abs(declaredTotal - totalHt) > 0.05) {
    warnings.push(
      `Le total du journal (${declaredTotal.toFixed(2)} €) ne correspond pas à la somme des factures lues (${totalHt.toFixed(2)} €).`
    );
  }

  const byMonth = new Map<string, { n: number; ht: number }>();
  for (const f of list) {
    const m = byMonth.get(monthKey(f.date)) ?? { n: 0, ht: 0 };
    m.n += 1; m.ht += f.ht;
    byMonth.set(monthKey(f.date), m);
  }
  const months = [...byMonth.entries()]
    .map(([mk, m]) => ({ mk, n: m.n, ht: round2(m.ht), replaced: m.n / list.length >= REGLES.partMoisEcrase || m.n >= REGLES.facturesMoisEcrase }))
    .sort((a, b) => a.mk.localeCompare(b.mk));
  const dates = list.map((f) => f.date).sort();

  return {
    factures: list, totalHt, declaredTotal, months, warnings,
    periodStart: dates[0], periodEnd: dates[dates.length - 1],
  };
}

export async function parseFile(filename: string, data: Buffer): Promise<ParseResult> {
  const isZip = data.length > 3 && data[0] === 0x50 && data[1] === 0x4b;
  if (!isZip) {
    if (/\.xls$/i.test(filename)) {
      throw new ParseError("L'ancien format .xls n'est pas pris en charge. Enregistrez le fichier en .xlsx ou .csv.");
    }
    return parseGrid(parseCsv(data.toString("utf8")));
  }

  const { default: readExcelFile } = await import("read-excel-file/node");
  let sheets: { sheet: string; data: Cell[][] }[];
  try {
    sheets = await readExcelFile(data);
  } catch {
    throw new ParseError("Impossible de lire ce fichier Excel.");
  }
  // Le journal est dans le premier onglet qui a les bonnes colonnes.
  let firstError: unknown = null;
  for (const s of sheets) {
    try {
      return parseGrid(s.data);
    } catch (e) {
      firstError ??= e;
    }
  }
  throw firstError ?? new ParseError("Fichier Excel vide.");
}
