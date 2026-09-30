import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ParseError, parseFile } from "@/lib/parse";
import { monthKey } from "@/lib/period";
import { getStore } from "@/lib/store";

const MAX_SIZE = 4 * 1024 * 1024;

export type ImportPreview = {
  filename: string;
  nbFactures: number;
  nbClients: number;
  totalHt: number;
  declaredTotal: number | null;
  periodStart: string;
  periodEnd: string;
  months: { mk: string; n: number; ht: number; replaced: boolean; existing: number }[];
  warnings: string[];
  applied: boolean;
};

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Sans `confirm`, renvoie seulement l'aperçu du fichier. Avec `confirm=1`, écrit en base.
export async function POST(request: Request) {
  if (!(await getUser())) return fail("Non connecté.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Requête invalide.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Aucun fichier reçu.");
  if (file.size > MAX_SIZE) return fail("Fichier trop volumineux (4 Mo maximum).");

  let parsed;
  try {
    parsed = await parseFile(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof ParseError) return fail(e.message);
    throw e;
  }

  const store = getStore();
  const existing = new Map<string, number>();
  for (const f of await store.loadFactures()) {
    existing.set(monthKey(f.date), (existing.get(monthKey(f.date)) ?? 0) + 1);
  }

  const confirm = form.get("confirm") === "1";
  if (confirm) {
    await store.applyImport({
      filename: file.name,
      factures: parsed.factures,
      replacedMonths: parsed.months.filter((m) => m.replaced).map((m) => m.mk),
    });
    revalidatePath("/", "layout");
  }

  const preview: ImportPreview = {
    filename: file.name,
    nbFactures: parsed.factures.length,
    nbClients: new Set(parsed.factures.map((f) => f.clientCode)).size,
    totalHt: parsed.totalHt,
    declaredTotal: parsed.declaredTotal,
    periodStart: parsed.periodStart,
    periodEnd: parsed.periodEnd,
    months: parsed.months.map((m) => ({ ...m, existing: existing.get(m.mk) ?? 0 })),
    warnings: parsed.warnings,
    applied: confirm,
  };
  return NextResponse.json(preview);
}
