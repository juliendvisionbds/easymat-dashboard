import Link from "next/link";
import type { Alert } from "@/lib/analytics";

const TONE_LABEL = { pos: "Bonne nouvelle", neg: "À surveiller", warn: "Vigilance" };

export function Alerts({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return <div className="empty">Rien à signaler.</div>;
  return (
    <div className="alerts">
      {alerts.map((a, i) => (
        <div key={i} className={`alert ${a.tone}`}>
          <div className="alert-kicker">
            <span className="dot" />
            {a.kicker ?? TONE_LABEL[a.tone]}
          </div>
          <div className="alert-title">{a.title}</div>
          <div className="alert-body">{a.body}</div>
        </div>
      ))}
    </div>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "pos" | "neg" }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-sub${tone ? ` ${tone}` : ""}`}>{sub}</div>
    </div>
  );
}

export function Meter({ name, value, width, risk }: { name: string; value: string; width: number; risk?: boolean }) {
  return (
    <div className="meter-row">
      <div className="meter-head">
        <span className="ellipsis">{name}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter">
        <div className={risk ? "risk" : undefined} style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  );
}

export function ExerciceChips({ exercices, current, base }: { exercices: number[]; current: number; base: string }) {
  if (exercices.length < 2) return null;
  return (
    <div className="chips">
      {exercices.map((ex) => (
        <Link key={ex} href={`${base}?ex=${ex}`} className={`chip${ex === current ? " active" : ""}`}>
          Exercice {ex}-{String(ex + 1).slice(2)}
        </Link>
      ))}
    </div>
  );
}

export function NoData() {
  return (
    <div className="card">
      <div className="card-title">Aucune donnée pour l’instant</div>
      <p className="card-sub">Importez le journal des ventes Edilogic pour alimenter le tableau de bord.</p>
      <div className="actions">
        <Link href="/imports" className="btn-primary">Importer un export</Link>
      </div>
    </div>
  );
}
