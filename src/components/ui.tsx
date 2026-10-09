import Link from "next/link";
import type { ReactNode } from "react";
import type { Alert } from "@/lib/analytics";
import { plural } from "@/lib/format";
import { PendingLink } from "./pending-link";

const TONE_LABEL = { pos: "Bonne nouvelle", neg: "À surveiller", warn: "Vigilance" };

export function Hero({ title, sub, children }: { title: string; sub: ReactNode; children?: ReactNode }) {
  return (
    <div className="hero">
      <div className="hero-text">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children && <div className="hero-actions">{children}</div>}
    </div>
  );
}

export function AlertsCard({ title, meta, alerts }: { title: string; meta?: string; alerts: Alert[] }) {
  return (
    <div className="card flush">
      <div className="card-bar">
        <div className="card-bar-title">
          <div className="card-title">{title}</div>
          {alerts.length > 0 && <span className="badge">{plural(alerts.length, "signal", "signaux")}</span>}
        </div>
        {meta && <div className="card-sub">{meta}</div>}
      </div>
      {alerts.map((a, i) => (
        <div key={i} className="alert-row">
          <div className={`alert-kicker ${a.tone}`}>
            <span className="dot" />
            <span className="pill">{a.kicker ?? TONE_LABEL[a.tone]}</span>
          </div>
          <div>
            <div className="alert-title">{a.title}</div>
            <div className="alert-body">{a.body}</div>
          </div>
        </div>
      ))}
      {!alerts.length && <div className="alert-empty">Rien à signaler.</div>}
    </div>
  );
}

// `delta` affiche l'écart dans une puce colorée ; sans lui, `tone` colore le texte.
export function Kpi({ label, value, sub, delta, tone }: { label: string; value: string; sub: string; delta?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">
        {delta && <span className={`delta${tone ? ` ${tone}` : ""}`}>{delta}</span>}
        <span className={!delta && tone ? tone : undefined}>{sub}</span>
      </div>
    </div>
  );
}

export function Meter({ name, value, share, width, risk }: { name: string; value: string; share?: string; width: number; risk?: boolean }) {
  return (
    <div className="meter-row">
      <div className="meter-head">
        <span className="meter-name ellipsis">{name}</span>
        <span className="meter-values">
          <strong>{value}</strong>
          {share && <span className={`meter-share${risk ? " risk" : ""}`}>{share}</span>}
        </span>
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
    <div className="seg">
      {exercices.map((ex) => (
        <PendingLink key={ex} href={`${base}?ex=${ex}`} className={`seg-item${ex === current ? " active" : ""}`}>
          Exercice {ex}-{String(ex + 1).slice(2)}
        </PendingLink>
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
