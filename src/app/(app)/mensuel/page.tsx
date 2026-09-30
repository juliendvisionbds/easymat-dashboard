import Link from "next/link";
import { Alerts, ExerciceChips, Kpi, Meter, NoData } from "@/components/ui";
import { buildDataset, dormantsAt, monthAlerts, newClients, pickExercice } from "@/lib/analytics";
import { REGLES } from "@/lib/config";
import { eur, k, pct, plural } from "@/lib/format";
import { exerciceOf, monthLabel, monthLongLabel } from "@/lib/period";
import { loadFactures } from "@/lib/store";

export const metadata = { title: "Vue mensuelle" };

export default async function MensuelPage({ searchParams }: PageProps<"/mensuel">) {
  const params = await searchParams;
  const ds = buildDataset(await loadFactures());
  const wanted = typeof params.m === "string" && /^\d{4}-\d{2}$/.test(params.m) ? params.m : null;
  const e = pickExercice(ds, wanted ? String(exerciceOf(`${wanted}-01`)) : typeof params.ex === "string" ? params.ex : undefined);
  if (!e) return <NoData />;

  // Par défaut : le dernier mois qui a des factures.
  const asked = e.months.findIndex((m) => m.mk === wanted && m.hasData);
  const i = asked !== -1 ? asked : e.withData.at(-1)!;
  const m = e.months[i];
  const prev = i > 0 && e.months[i - 1].hasData ? e.months[i - 1] : null;
  const ev = prev && prev.ca > 0 ? ((m.ca - prev.ca) / prev.ca) * 100 : null;
  const cumul = e.months.slice(0, i + 1).reduce((a, x) => a + x.ca, 0);

  const tops = e.clients.filter((c) => c.m[i] > 0).sort((a, b) => b.m[i] - a.m[i]).slice(0, 8);
  const news = newClients(ds, e, i).slice(0, 6);
  const dorm = dormantsAt(ds, m.mk);

  return (
    <>
      <div className="hero" style={{ marginBottom: 20 }}>
        <h1>Le point du mois.</h1>
        <p>Choisissez un mois : nouveaux clients, clients qui décrochent, avoirs, tout est recalculé.</p>
      </div>

      <ExerciceChips exercices={ds.exercices} current={e.ex} base="/mensuel" />

      <div className="chips">
        {e.months.map((x) => (
          <Link
            key={x.mk}
            href={`/mensuel?m=${x.mk}`}
            className={`chip${x.mk === m.mk ? " active" : ""}${x.hasData ? "" : " disabled"}`}
            aria-disabled={!x.hasData}
            scroll={false}
          >
            {x.lab}
          </Link>
        ))}
      </div>

      <div className="grid-kpi section">
        <Kpi
          label="CA du mois"
          value={k(m.ca)}
          sub={ev == null ? "Pas de mois précédent" : `${pct(ev)} vs ${prev!.lab}`}
          tone={ev == null ? undefined : ev >= 0 ? "pos" : "neg"}
        />
        <Kpi label="Factures" value={String(m.nf)} sub={`panier moyen ${eur(m.ca / m.nf)}`} />
        <Kpi label="Clients facturés" value={String(m.actifs)} sub={`${plural(m.nouveaux, "nouveau", "nouveaux")} ce mois`} />
        <Kpi
          label="Avoirs"
          value={m.navoirs ? k(m.avoirs) : "0 €"}
          sub={plural(m.navoirs, "avoir")}
          tone={m.avoirs < REGLES.seuilAvoirs ? "neg" : undefined}
        />
        <Kpi
          label={`Cumul depuis ${monthLabel(e.months[0].mk)}`}
          value={k(cumul)}
          sub={`${Math.round((cumul / e.total) * 100)} % du CA facturé à ce jour`}
        />
      </div>

      <div className="card section">
        <div className="card-title">Alertes de {monthLongLabel(m.mk)}</div>
        <Alerts alerts={monthAlerts(ds, e, i)} />
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Top clients du mois</div>
          {tops.map((c) => (
            <Meter key={c.code} name={c.name} value={eur(c.m[i])} width={(c.m[i] / tops[0].m[i]) * 100} />
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title">Nouveaux clients</div>
            <div className="card-sub" style={{ marginBottom: 6 }}>Première facture ce mois-ci.</div>
            {news.map((c) => (
              <div key={c.code} className="line">
                <span className="ellipsis">{c.name}</span>
                <span className="mono">{eur(c.m[i])}</span>
              </div>
            ))}
            {!news.length && <div className="empty">Aucun nouveau client ce mois-ci.</div>}
          </div>

          <div className="card">
            <div className="card-title">Clients dormants</div>
            <div className="card-sub" style={{ marginBottom: 6 }}>
              {dorm.length
                ? `Plus rien facturé depuis ${REGLES.moisDormance} mois, alors qu’ils achetaient avant.`
                : "Aucun client dormant à cette date."}
            </div>
            {dorm.slice(0, 6).map((c) => (
              <div key={c.code} className="line">
                <span className="ellipsis">{c.name}</span>
                <span className="muted small">{k(c.tot)} · dern. {monthLabel(c.last)}</span>
              </div>
            ))}
            {dorm.length > 6 && <div className="muted small" style={{ paddingTop: 10 }}>+ {dorm.length - 6} autres</div>}
          </div>
        </div>
      </div>
    </>
  );
}
