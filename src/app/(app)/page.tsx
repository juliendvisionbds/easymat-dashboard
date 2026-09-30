import Link from "next/link";
import { Alerts, ExerciceChips, Kpi, Meter, NoData } from "@/components/ui";
import { buildDataset, exerciceAlerts, pickExercice } from "@/lib/analytics";
import { REGLES } from "@/lib/config";
import { eur, k, part, plural } from "@/lib/format";
import { monthLongLabel } from "@/lib/period";
import { loadFactures } from "@/lib/store";

const TABLE_DEFAULT = 15;

export default async function GlobalPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ds = buildDataset(await loadFactures());
  const e = pickExercice(ds, typeof params.ex === "string" ? params.ex : undefined);
  if (!e) return <NoData />;

  const showAll = params.all === "1";
  const n = e.withData.length;
  const moy = e.total / n;
  const maxCa = Math.max(...e.months.map((m) => m.ca), 1);
  const first = e.months[e.withData[0]];
  const last = e.months[e.withData[n - 1]];
  const worstAvoirs = e.months.reduce((a, b) => (b.avoirs < a.avoirs ? b : a));
  const alerts = exerciceAlerts(ds, e);
  const rows = showAll ? e.clients : e.clients.slice(0, TABLE_DEFAULT);
  const query = (all: boolean) => `/?ex=${e.ex}${all ? "&all=1" : ""}#clients`;

  return (
    <>
      <div className="hero">
        <h1>L’exercice en un écran.</h1>
        <p>
          Exercice {e.label}. Tout ce qui suit est calculé depuis le journal des ventes Edilogic, sans retouche manuelle.
        </p>
      </div>

      <ExerciceChips exercices={ds.exercices} current={e.ex} base="/" />

      <div className="grid-kpi section">
        <Kpi
          label="CA facturé — exercice"
          value={k(e.total)}
          sub={`${plural(e.nFactures, "facture")} · ${plural(e.clients.length, "client")}`}
        />
        <Kpi
          label="Moyenne mensuelle"
          value={k(moy)}
          sub={n === 12 ? "sur les 12 mois de l’exercice" : `sur ${plural(n, "mois importé", "mois importés")}`}
        />
        <Kpi
          label="Clients actifs"
          value={String(last.actifs)}
          sub={n > 1 ? `en ${monthLongLabel(last.mk)}, contre ${first.actifs} en ${monthLongLabel(first.mk)}` : `en ${monthLongLabel(last.mk)}`}
        />
        <Kpi
          label="Avoirs"
          value={e.avoirsN ? k(e.avoirsTot) : "0 €"}
          sub={e.avoirsN ? `${plural(e.avoirsN, "avoir")} · dont ${k(worstAvoirs.avoirs)} en ${monthLongLabel(worstAvoirs.mk)}` : "aucun avoir"}
        />
      </div>

      <div className="card section">
        <div className="card-head">
          <div className="card-title">Ce qu’il faut regarder ce mois-ci</div>
          <div className="muted small">{monthLongLabel(last.mk)} · généré automatiquement</div>
        </div>
        <Alerts alerts={alerts} />
      </div>

      <div className="card section">
        <div className="card-head">
          <div className="card-title">CA facturé par mois</div>
          <div className="muted small">Moyenne {k(moy)} · barre foncée = au-dessus de la moyenne</div>
        </div>
        <div className="bars">
          {e.months.map((m) => (
            <Link key={m.mk} href={`/mensuel?m=${m.mk}`} className="bar-col" title={m.hasData ? eur(m.ca) : "Pas encore importé"}>
              <div className="bar-val">{m.hasData ? k(m.ca) : "—"}</div>
              <div
                className={`bar${!m.hasData ? " empty" : m.ca >= moy ? " high" : ""}`}
                style={{ height: `${m.hasData ? Math.max(0, Math.round((m.ca / maxCa) * 100)) : 0}%` }}
              />
            </Link>
          ))}
        </div>
        <div className="bar-labels">
          {e.months.map((m) => <div key={m.mk}>{m.lab}</div>)}
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Poids des clients</div>
          <div className="card-sub" style={{ marginBottom: 14 }}>
            Le top 10 pèse {part(e.top10part)} du CA. Seuil d’alerte fixé à {REGLES.seuilDependance} % par client.
          </div>
          {e.clients.slice(0, 10).map((c) => (
            <Meter
              key={c.code}
              name={c.name}
              value={`${part(c.part)}  ·  ${k(c.tot)}`}
              width={(c.part / e.clients[0].part) * 100}
              risk={c.part >= REGLES.seuilDependance}
            />
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title">Récurrent ou ponctuel</div>
            <div className="card-sub" style={{ marginBottom: 12 }}>
              Un client facturé dix mois sur douze ne se pilote pas comme un client d’un seul chantier.
            </div>
            {e.recurrence ? (
              <>
                <div className="line">
                  <div>
                    <div className="line-title">Clients récurrents</div>
                    <div className="muted small">
                      {plural(e.recurrence.recurrents.n, "client facturé", "clients facturés")} {e.recurrence.seuil} mois ou plus sur {e.recurrence.surMois}
                    </div>
                  </div>
                  <div className="line-big">{part(e.recurrence.recurrents.part)}</div>
                </div>
                <div className="line">
                  <div>
                    <div className="line-title">Clients ponctuels</div>
                    <div className="muted small">{plural(e.recurrence.ponctuels.n, "client facturé", "clients facturés")} un seul mois</div>
                  </div>
                  <div className="line-big">{part(e.recurrence.ponctuels.part)}</div>
                </div>
              </>
            ) : (
              <div className="empty">Disponible à partir de trois mois importés.</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Avoirs par mois</div>
            <div className="card-sub" style={{ marginBottom: 6 }}>Un pic signale un litige ou une erreur de facturation.</div>
            {e.months.filter((m) => m.navoirs > 0).map((m) => (
              <div key={m.mk} className="line">
                <span>{m.lab} <span className="muted small">· {plural(m.navoirs, "avoir")}</span></span>
                <span className={`mono${m.avoirs < REGLES.seuilAvoirs ? " neg" : ""}`}>{eur(m.avoirs)}</span>
              </div>
            ))}
            {!e.avoirsN && <div className="empty">Aucun avoir sur l’exercice.</div>}
          </div>
        </div>
      </div>

      <div className="card" id="clients">
        <div className="card-head">
          <div>
            <div className="card-title">Tous les clients de l’exercice</div>
            <div className="card-sub">{plural(e.clients.length, "client facturé", "clients facturés")} sur l’exercice {e.label}</div>
          </div>
          {e.clients.length > TABLE_DEFAULT && (
            <Link href={query(!showAll)} className="btn-secondary" scroll={false}>
              {showAll ? `Réduire à ${TABLE_DEFAULT}` : `Afficher les ${e.clients.length}`}
            </Link>
          )}
        </div>
        <div className="table-wrap">
          <div className="table">
            <div className="tr head cols-clients">
              <div>Client</div>
              <div className="right">CA exercice</div>
              <div className="right">Part</div>
              <div className="right">Factures</div>
              <div className="right">Avoirs</div>
              <div className="right">Mois</div>
            </div>
            {rows.map((c) => (
              <div key={c.code} className="tr cols-clients">
                <div className="ellipsis" style={{ fontWeight: 600 }} title={`${c.name} (${c.code})`}>{c.name}</div>
                <div className={`right mono${c.tot < 0 ? " neg" : ""}`}>{eur(c.tot)}</div>
                <div className="right cell-soft">{part(c.part)}</div>
                <div className="right cell-soft">{c.nf.reduce((a, b) => a + b, 0)}</div>
                <div className="right cell-soft">{c.avn ? eur(c.av) : "—"}</div>
                <div className="right cell-soft">{c.mois}/{n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
