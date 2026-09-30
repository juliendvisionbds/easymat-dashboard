import { describe, expect, it } from "vitest";
import { buildDataset, dormantsAt, monthAlerts, newClients } from "./analytics";
import { parseAmount, parseCsv, parseDate, parseGrid, ParseError } from "./parse";
import { exerciceMonths, exerciceOf } from "./period";
import type { Facture } from "./types";

const JOURNAL = `JOURNAL DE VENTE DE L'AGENCE TEST,,,,,,,,,TEST,,,
Edition du ,23/1/2026,,,,,,,1,,,,
Code client,Nom du client,N° Facture,Date,Montant HT,+ Montant TVA,= Montant TTC,Marge,% Marge,,,,
Journal : VT,,,,,,,,,,,,
ALPHA,"ALPHA, BTP",25110001,30/11/2025,"1 207,00","241,40","1 448,40","1 207,00",100 %,,,,
BETA,BETA,25110002,15/11/2025,"-200,00","-40,00","-240,00","-100,00",50 %,,,,
ALPHA,"ALPHA, BTP",25110003,5/12/2025,"50,00","10,00","60,00",,,,,,
Total Journal,,,,Total HT,Total TVA,Total TTC,Marge,% Marge,,,,
,,,,"1 057,00","211,40","1 268,40","1 107,00",46 %,,,,
Total Agence,,,,"1 057,00","211,40","1 268,40","1 107,00",46 %,,,,
`;

describe("lecture du journal", () => {
  it("lit les montants et les dates à la française", () => {
    expect(parseAmount("2 937 292,40")).toBe(2937292.4);
    expect(parseAmount("-1 234,66")).toBe(-1234.66);
    expect(parseAmount(12.5)).toBe(12.5);
    expect(parseAmount("Total HT")).toBeNull();
    expect(parseDate("5/8/2025")).toBe("2025-08-05");
    expect(parseDate("31/2/2025")).toBeNull();
    expect(parseDate(new Date(Date.UTC(2025, 0, 31)))).toBe("2025-01-31");
  });

  it("extrait les factures et contrôle le total", () => {
    const res = parseGrid(parseCsv(JOURNAL));
    expect(res.factures).toHaveLength(3);
    expect(res.factures[0]).toEqual({
      numero: "25110001", clientCode: "ALPHA", clientName: "ALPHA, BTP",
      date: "2025-11-30", ht: 1207, tva: 241.4, ttc: 1448.4,
    });
    expect(res.totalHt).toBe(1057);
    expect(res.declaredTotal).toBe(1057);
    expect(res.warnings).toEqual([]);
    expect(res.periodStart).toBe("2025-11-15");
    expect(res.periodEnd).toBe("2025-12-05");
  });

  it("signale un total qui ne correspond pas", () => {
    const res = parseGrid(parseCsv(JOURNAL.replaceAll("1 057,00", "9 999,00")));
    expect(res.warnings).toHaveLength(1);
  });

  it("n'écrase pas un mois pour quelques factures isolées", () => {
    const rows = Array.from({ length: 40 }, (_, i) => `C${i},CLIENT ${i},2511${String(i).padStart(4, "0")},20/11/2025,"100,00","20,00","120,00"`);
    rows.push(`C0,CLIENT 0,25119999,1/12/2025,"100,00","20,00","120,00"`);
    const res = parseGrid(parseCsv(`Code client,Nom du client,N° Facture,Date,Montant HT,Montant TVA,Montant TTC\n${rows.join("\n")}`));
    expect(res.months).toEqual([
      { mk: "2025-11", n: 40, ht: 4000, replaced: true },
      { mk: "2025-12", n: 1, ht: 100, replaced: false },
    ]);
  });

  it("refuse un fichier qui n'est pas un journal des ventes", () => {
    expect(() => parseGrid(parseCsv("Code client,Nom du client,Montant HT\nA,ALPHA,12"))).toThrow(ParseError);
  });

  it("lit un export séparé par des points-virgules", () => {
    const res = parseGrid(parseCsv("Code client;Nom du client;N° Facture;Date;Montant HT\nA;ALPHA;1;01/11/2025;1 000,50"));
    expect(res.factures[0].ht).toBe(1000.5);
  });
});

describe("exercice", () => {
  it("va de novembre à octobre", () => {
    expect(exerciceOf("2024-11-01")).toBe(2024);
    expect(exerciceOf("2025-10-31")).toBe(2024);
    expect(exerciceOf("2025-11-01")).toBe(2025);
    expect(exerciceMonths(2024)[0]).toBe("2024-11");
    expect(exerciceMonths(2024)[11]).toBe("2025-10");
  });
});

let n = 0;
const f = (clientCode: string, date: string, ht: number): Facture => ({
  numero: String(++n), clientCode, clientName: clientCode, date, ht, tva: 0, ttc: ht,
});

describe("indicateurs", () => {
  const factures = [
    // A : régulier, puis s'arrête après janvier.
    f("A", "2024-11-10", 10000), f("A", "2024-12-10", 10000), f("A", "2025-01-10", 20000),
    // B : présent tous les mois.
    ...["2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04"].map((m) => f("B", `${m}-15`, 5000)),
    // C : nouveau en février, avec un avoir en mars.
    f("C", "2025-02-20", 3000), f("C", "2025-03-05", -1000),
  ];
  const ds = buildDataset(factures);
  const e = ds.byExercice.get(2024)!;

  it("agrège par mois et par client", () => {
    expect(ds.exercices).toEqual([2024]);
    expect(e.total).toBe(72000);
    expect(e.nFactures).toBe(11);
    expect(e.withData).toEqual([0, 1, 2, 3, 4, 5]);
    expect(e.months[2]).toMatchObject({ mk: "2025-01", ca: 25000, nf: 2, actifs: 2, navoirs: 0 });
    expect(e.months[4]).toMatchObject({ ca: 4000, avoirs: -1000, navoirs: 1 });
    expect(e.clients.map((c) => c.code)).toEqual(["A", "B", "C"]);
    expect(e.clients[0].part).toBe(55.6);
    expect(e.avoirsTot).toBe(-1000);
  });

  it("repère les nouveaux clients, sauf le tout premier mois", () => {
    expect(newClients(ds, e, 0)).toEqual([]);
    expect(newClients(ds, e, 3).map((c) => c.code)).toEqual(["C"]);
    expect(e.months[3].nouveaux).toBe(1);
  });

  it("repère les clients dormants après trois mois sans facture", () => {
    expect(dormantsAt(ds, "2025-03")).toEqual([]);
    expect(dormantsAt(ds, "2025-04").map((d) => d.code)).toEqual(["A"]);
    expect(dormantsAt(ds, "2025-04")[0]).toMatchObject({ last: "2025-01", tot: 40000 });
  });

  it("ne déclare personne dormant sur un mois non importé", () => {
    const partial = buildDataset(factures.filter((x) => !x.date.startsWith("2025-03")));
    expect(dormantsAt(partial, "2025-04")).toEqual([]);
  });

  it("alerte sur le décrochage et la dépendance", () => {
    const kickers = monthAlerts(ds, e, 3).map((a) => a.kicker);
    expect(kickers).toContain("Décrochage");
    expect(kickers).toContain("Dépendance");
    expect(kickers).toContain("Nouveaux");
  });
});
