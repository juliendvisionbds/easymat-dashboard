import { REGLES } from "./config";
import { eur, k, part, pct, plural } from "./format";
import {
  exerciceLabel,
  exerciceMonths,
  exerciceOf,
  monthFromIndex,
  monthIndex,
  monthKey,
  monthLabel,
  monthLongLabel,
} from "./period";
import type { Facture } from "./types";

export type Tone = "pos" | "neg" | "warn";
export type Alert = { tone: Tone; kicker?: string; title: string; body: string };

export type Client = {
  code: string;
  name: string;
  tot: number;
  part: number;
  // CA et nombre de factures pour chacun des 12 mois de l'exercice.
  m: number[];
  nf: number[];
  av: number;
  avn: number;
  // Nombre de mois facturés dans l'exercice.
  mois: number;
};

export type Month = {
  mk: string;
  lab: string;
  // Le mois a des factures en base.
  hasData: boolean;
  ca: number;
  nf: number;
  actifs: number;
  avoirs: number;
  navoirs: number;
  nouveaux: number;
};

export type Dormant = { code: string; name: string; tot: number; last: string };

export type Exercice = {
  ex: number;
  label: string;
  total: number;
  nFactures: number;
  clients: Client[];
  months: Month[];
  // Index des mois qui ont des factures.
  withData: number[];
  avoirsTot: number;
  avoirsN: number;
  top10part: number;
  recurrence: {
    seuil: number;
    surMois: number;
    recurrents: { n: number; part: number };
    ponctuels: { n: number; part: number };
  } | null;
};

type History = {
  name: string;
  // CA par mois (YYYY-MM), tous exercices confondus.
  months: Map<string, number>;
  first: string;
  last: string;
};

export type Dataset = {
  exercices: number[];
  history: Map<string, History>;
  // Mois qui ont au moins une facture en base.
  monthsWithData: Set<string>;
  byExercice: Map<number, Exercice>;
};

const share = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);

export function buildDataset(factures: Facture[]): Dataset {
  const history = new Map<string, History>();
  const monthsWithData = new Set<string>();
  const sorted = [...factures].sort((a, b) => a.date.localeCompare(b.date));

  for (const f of sorted) {
    const mk = monthKey(f.date);
    monthsWithData.add(mk);
    const h = history.get(f.clientCode) ?? { name: f.clientName, months: new Map(), first: mk, last: mk };
    // La facture la plus récente fait foi pour le nom du client.
    h.name = f.clientName;
    h.months.set(mk, (h.months.get(mk) ?? 0) + f.ht);
    h.last = mk;
    history.set(f.clientCode, h);
  }

  const exercices = [...new Set(sorted.map((f) => exerciceOf(f.date)))].sort((a, b) => a - b);
  const byExercice = new Map<number, Exercice>();
  const firstMonth = [...monthsWithData].sort()[0];
  for (const ex of exercices) {
    byExercice.set(ex, buildExercice(ex, sorted.filter((f) => exerciceOf(f.date) === ex), history, firstMonth));
  }
  return { exercices, history, monthsWithData, byExercice };
}

function buildExercice(ex: number, factures: Facture[], history: Map<string, History>, firstMonth: string): Exercice {
  const mks = exerciceMonths(ex);
  const clients = new Map<string, Client>();
  const zeros = () => Array.from({ length: 12 }, () => 0);

  for (const f of factures) {
    const i = mks.indexOf(monthKey(f.date));
    const c = clients.get(f.clientCode) ?? {
      code: f.clientCode, name: history.get(f.clientCode)?.name ?? f.clientName,
      tot: 0, part: 0, m: zeros(), nf: zeros(), av: 0, avn: 0, mois: 0,
    };
    c.tot += f.ht;
    c.m[i] += f.ht;
    c.nf[i] += 1;
    if (f.ht < 0) { c.av += f.ht; c.avn += 1; }
    clients.set(f.clientCode, c);
  }

  const list = [...clients.values()].sort((a, b) => b.tot - a.tot);
  const total = list.reduce((a, c) => a + c.tot, 0);
  for (const c of list) {
    c.part = share(c.tot, total);
    c.mois = c.nf.filter((n) => n > 0).length;
  }

  const months: Month[] = mks.map((mk, i) => {
    const inMonth = factures.filter((f) => monthKey(f.date) === mk);
    const avoirs = inMonth.filter((f) => f.ht < 0);
    return {
      mk, lab: monthLabel(mk), hasData: inMonth.length > 0,
      ca: inMonth.reduce((a, f) => a + f.ht, 0),
      nf: inMonth.length,
      actifs: list.filter((c) => c.nf[i] > 0).length,
      avoirs: avoirs.reduce((a, f) => a + f.ht, 0),
      navoirs: avoirs.length,
      // Le tout premier mois en base n'a pas d'historique : personne n'y est « nouveau ».
      nouveaux: mk === firstMonth ? 0 : list.filter((c) => c.nf[i] > 0 && history.get(c.code)?.first === mk).length,
    };
  });
  const withData = months.flatMap((m, i) => (m.hasData ? [i] : []));

  const sum = (cs: Client[]) => cs.reduce((a, c) => a + c.tot, 0);
  // Récurrent = facturé 10 mois sur 12, au prorata des mois disponibles.
  const seuil = Math.ceil((withData.length * 10) / 12);
  const rec = list.filter((c) => c.mois >= seuil);
  const ponc = list.filter((c) => c.mois === 1);

  return {
    ex, label: exerciceLabel(ex), total, nFactures: factures.length, clients: list, months, withData,
    avoirsTot: months.reduce((a, m) => a + m.avoirs, 0),
    avoirsN: months.reduce((a, m) => a + m.navoirs, 0),
    top10part: share(sum(list.slice(0, 10)), total),
    recurrence: withData.length >= 3
      ? {
          seuil, surMois: withData.length,
          recurrents: { n: rec.length, part: share(sum(rec), total) },
          ponctuels: { n: ponc.length, part: share(sum(ponc), total) },
        }
      : null,
  };
}

// Clients dont la toute première facture tombe ce mois-ci.
export function newClients(ds: Dataset, e: Exercice, i: number): Client[] {
  const mk = e.months[i].mk;
  if (mk === [...ds.monthsWithData].sort()[0]) return [];
  return e.clients
    .filter((c) => c.nf[i] > 0 && ds.history.get(c.code)?.first === mk)
    .sort((a, b) => b.m[i] - a.m[i]);
}

// Clients qui viennent de décrocher : dernière facture il y a w à w+2 mois,
// et qui pesaient assez pour valoir un rappel (plusieurs mois facturés ou > 15 k€).
export function dormantsAt(ds: Dataset, mk: string): Dormant[] {
  const w = REGLES.moisDormance;
  const i = monthIndex(mk);
  const out: Dormant[] = [];
  for (const [code, h] of ds.history) {
    const past = [...h.months.entries()].filter(([m]) => monthIndex(m) <= i);
    if (!past.length) continue;
    const lastMk = past.map(([m]) => m).sort().at(-1)!;
    const last = monthIndex(lastMk);
    if (last > i - w || last < i - w - 2) continue;
    // Un mois sans import n'est pas un mois sans facture.
    let covered = true;
    for (let j = last + 1; j <= i; j++) if (!ds.monthsWithData.has(monthFromIndex(j))) covered = false;
    if (!covered) continue;
    const recent = past.filter(([m]) => monthIndex(m) > i - 12);
    const tot = recent.reduce((a, [, v]) => a + v, 0);
    if (tot < REGLES.dormantCaMin || !(recent.length >= 2 || tot >= 15000)) continue;
    out.push({ code, name: h.name, tot, last: lastMk });
  }
  return out.sort((a, b) => b.tot - a.tot);
}

export function monthAlerts(ds: Dataset, e: Exercice, i: number): Alert[] {
  const m = e.months[i];
  if (!m?.hasData) return [];
  const out: Alert[] = [];
  const prev = i > 0 && e.months[i - 1].hasData ? e.months[i - 1] : null;
  const best = e.withData.map((j) => e.months[j]).reduce((a, b) => (b.ca > a.ca ? b : a));

  if (e.withData.length >= 3 && best.mk === m.mk) {
    out.push({ tone: "pos", kicker: "Record", title: `Meilleur mois de l’exercice : ${k(m.ca)}`, body: `${plural(m.nf, "facture émise", "factures émises")}, ${plural(m.actifs, "client facturé", "clients facturés")}.` });
  } else if (prev && prev.ca > 0 && m.ca > prev.ca * (1 + REGLES.variationMois)) {
    out.push({ tone: "pos", title: `CA en hausse de ${pct(((m.ca - prev.ca) / prev.ca) * 100)} vs le mois précédent`, body: `${k(prev.ca)} → ${k(m.ca)}.` });
  } else if (prev && prev.ca > 0 && m.ca < prev.ca * (1 - REGLES.variationMois)) {
    out.push({ tone: "neg", title: `CA en baisse de ${part(((prev.ca - m.ca) / prev.ca) * 100)} vs le mois précédent`, body: `${k(prev.ca)} → ${k(m.ca)}.` });
  }

  const news = newClients(ds, e, i);
  if (news.length) {
    out.push({ tone: "pos", kicker: "Nouveaux", title: plural(news.length, "nouveau client", "nouveaux clients"), body: `Le plus important : ${news[0].name}, ${eur(news[0].m[i])} dès le premier mois.` });
  }

  const dorm = dormantsAt(ds, m.mk);
  if (dorm.length) {
    out.push({ tone: "neg", kicker: "Dormants", title: `${plural(dorm.length, "client")} sans facture depuis ${REGLES.moisDormance} mois`, body: `Le plus important : ${dorm[0].name}, ${k(dorm[0].tot)} sur douze mois, dernière facture en ${monthLongLabel(dorm[0].last)}.` });
  }

  if (m.avoirs < REGLES.seuilAvoirs) {
    out.push({ tone: "warn", kicker: "Avoirs", title: `Pic d’avoirs : ${eur(m.avoirs)}`, body: `${plural(m.navoirs, "avoir")} sur le mois. Signal de litige ou d’erreur de facturation.` });
  }

  const tops = e.clients.filter((c) => c.m[i] > 0).sort((a, b) => b.m[i] - a.m[i]);
  if (tops.length && m.ca > 0) {
    const s = (tops[0].m[i] / m.ca) * 100;
    if (s > REGLES.seuilDependance) {
      out.push({ tone: "warn", kicker: "Dépendance", title: `${tops[0].name} pèse ${Math.round(s)} % du mois`, body: `${eur(tops[0].m[i])} sur ${eur(m.ca)} facturés. Au-delà de ${REGLES.seuilDependance} %, la dépendance devient un risque.` });
    }
  }

  if (prev) {
    const drop = e.clients
      .filter((c) => c.m[i - 1] > REGLES.decrochageCaMin && c.m[i] < c.m[i - 1] * REGLES.decrochageRatio)
      .sort((a, b) => (a.m[i] - a.m[i - 1]) - (b.m[i] - b.m[i - 1]));
    if (drop.length) {
      const c = drop[0];
      out.push({ tone: "neg", kicker: "Décrochage", title: `${c.name} : ${k(c.m[i - 1])} → ${k(c.m[i])}`, body: `Chute de ${part(((c.m[i - 1] - c.m[i]) / c.m[i - 1]) * 100)} d’un mois sur l’autre.` });
    }
  }
  return out.slice(0, 4);
}

export function exerciceAlerts(ds: Dataset, e: Exercice): Alert[] {
  const lastIdx = e.withData.at(-1);
  const out = lastIdx == null ? [] : monthAlerts(ds, e, lastIdx);
  const has = (kicker: string) => out.some((a) => a.kicker === kicker);

  const top = e.clients[0];
  if (top && top.part >= REGLES.seuilDependance) {
    out.push({ tone: "warn", kicker: "Dépendance", title: `${top.name} pèse ${part(top.part)} de l’exercice`, body: `${eur(top.tot)} sur ${eur(e.total)}. Seuil d’alerte fixé à ${REGLES.seuilDependance} %.` });
  }
  if (e.top10part >= 60) {
    out.push({ tone: "warn", kicker: "Concentration", title: `Le top 10 fait ${part(e.top10part)} du CA`, body: `${plural(e.clients.length, "client facturé", "clients facturés")}, mais l’essentiel repose sur dix d’entre eux.` });
  }
  if (e.avoirsN && !has("Avoirs")) {
    const worst = e.months.reduce((a, b) => (b.avoirs < a.avoirs ? b : a));
    out.push({ tone: "warn", kicker: "Avoirs", title: `${plural(e.avoirsN, "avoir")} pour ${k(e.avoirsTot)}`, body: `Dont ${k(worst.avoirs)} sur le seul mois de ${monthLongLabel(worst.mk)}.` });
  }
  const loss = e.clients.filter((c) => c.tot < 0).at(-1);
  if (loss) {
    out.push({ tone: "neg", kicker: "Solde négatif", title: `${loss.name} : ${eur(loss.tot)} sur l’exercice`, body: `Plus d’avoirs que de factures : ${plural(loss.avn, "avoir")} pour ${eur(loss.av)}.` });
  }
  return out.slice(0, 7);
}

// Exercice affiché par défaut : le plus récent qui a des données.
export function pickExercice(ds: Dataset, wanted?: string): Exercice | null {
  const ex = wanted && ds.byExercice.has(+wanted) ? +wanted : ds.exercices.at(-1);
  return ex == null ? null : ds.byExercice.get(ex) ?? null;
}
