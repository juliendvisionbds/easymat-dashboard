import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { monthKey } from "./period";
import { createClient, supabaseConfigured } from "./supabase";
import type { Facture, ImportMeta, NewImport } from "./types";

export interface Store {
  listImports(): Promise<ImportMeta[]>;
  loadFactures(): Promise<Facture[]>;
  applyImport(imp: NewImport): Promise<void>;
}

type FactureRow = {
  numero: string; client_code: string; client_name: string; date: string;
  montant_ht: number | string; montant_tva: number | string; montant_ttc: number | string;
};

const PAGE = 1000;

const supabaseStore: Store = {
  async listImports() {
    const db = await createClient();
    const { data, error } = await db.from("imports").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data.map((r) => ({
      id: r.id, filename: r.filename, periodStart: r.period_start, periodEnd: r.period_end,
      nbFactures: r.nb_factures, totalHt: Number(r.total_ht), replacedMonths: r.replaced_months, createdAt: r.created_at,
    }));
  },

  async loadFactures() {
    const db = await createClient();
    const out: Facture[] = [];
    // L'API plafonne à 1000 lignes par requête.
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("factures")
        .select("numero, client_code, client_name, date, montant_ht, montant_tva, montant_ttc")
        .order("numero")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      for (const r of data as FactureRow[]) {
        out.push({
          numero: r.numero, clientCode: r.client_code, clientName: r.client_name, date: r.date,
          ht: Number(r.montant_ht), tva: Number(r.montant_tva), ttc: Number(r.montant_ttc),
        });
      }
      if (data.length < PAGE) return out;
    }
  },

  async applyImport(imp) {
    const db = await createClient();
    const { error } = await db.rpc("apply_import", {
      p_filename: imp.filename,
      p_replaced_months: imp.replacedMonths,
      p_factures: imp.factures,
    });
    if (error) throw new Error(error.message);
  },
};

// Stockage fichier pour développer sans Supabase. Jamais utilisé en production.
const LOCAL_FILE = path.join(process.cwd(), ".data", "store.json");
type LocalData = { imports: ImportMeta[]; factures: Facture[] };

async function readLocal(): Promise<LocalData> {
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8"));
  } catch {
    return { imports: [], factures: [] };
  }
}

const localStore: Store = {
  listImports: async () => (await readLocal()).imports,
  loadFactures: async () => (await readLocal()).factures,
  async applyImport(imp) {
    const data = await readLocal();
    const numeros = new Set(imp.factures.map((f) => f.numero));
    const dates = imp.factures.map((f) => f.date).sort();
    data.factures = data.factures
      .filter((f) => !imp.replacedMonths.includes(monthKey(f.date)) && !numeros.has(f.numero))
      .concat(imp.factures);
    data.imports.unshift({
      id: randomUUID(), filename: imp.filename,
      periodStart: dates[0], periodEnd: dates[dates.length - 1],
      nbFactures: imp.factures.length,
      totalHt: Math.round(imp.factures.reduce((a, f) => a + f.ht, 0) * 100) / 100,
      replacedMonths: imp.replacedMonths, createdAt: new Date().toISOString(),
    });
    await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await writeFile(LOCAL_FILE, JSON.stringify(data));
  },
};

export function getStore(): Store {
  if (supabaseConfigured) return supabaseStore;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase n'est pas configuré : renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return localStore;
}

// Une seule lecture par requête, partagée entre le layout et la page.
export const loadFactures = cache(() => getStore().loadFactures());
export const listImports = cache(() => getStore().listImports());
