"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ImportPreview } from "@/app/api/imports/route";
import { eur, plural } from "@/lib/format";
import { dateFr, monthLongLabel } from "@/lib/period";

export function Upload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function send(f: File, confirm: boolean) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", f);
      if (confirm) body.set("confirm", "1");
      const res = await fetch("/api/imports", { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "L’import a échoué.");
      setPreview(json);
      if (confirm) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L’import a échoué.");
      if (!confirm) setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(null);
    send(f, false);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (input.current) input.current.value = "";
  }

  const replaced = preview?.months.filter((m) => m.replaced) ?? [];
  const erased = replaced.reduce((a, m) => a + m.existing, 0);

  return (
    <div className="card">
      <div className="card-title">Importer le journal des ventes</div>
      <div className="card-sub">
        L’export Edilogic du mois, en .xlsx ou .csv. Rien n’est enregistré avant votre confirmation.
      </div>

      {!preview && (
        <label
          className={`drop${over ? " over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
        >
          <input ref={input} type="file" accept=".xlsx,.csv" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
          <div className="drop-title">{busy ? "Lecture du fichier…" : "Déposez le fichier ici, ou cliquez pour le choisir"}</div>
          <div className="muted small">Journal de vente VT · 4 Mo maximum</div>
        </label>
      )}

      {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}

      {preview && (
        <div className="preview">
          {preview.applied ? (
            <div className="success">
              Import terminé : {plural(preview.nbFactures, "facture enregistrée", "factures enregistrées")}, {eur(preview.totalHt)} HT. Le tableau de bord est à jour.
            </div>
          ) : (
            <div className="notice">
              Vérifiez l’aperçu puis confirmez.{" "}
              {erased > 0
                ? `${plural(erased, "facture déjà en base sera remplacée", "factures déjà en base seront remplacées")}.`
                : "Aucune donnée existante ne sera écrasée."}
            </div>
          )}

          <div className="line first">
            <span className="ellipsis"><strong>{preview.filename}</strong></span>
            <span className="muted small">{dateFr(preview.periodStart)} → {dateFr(preview.periodEnd)}</span>
          </div>
          <div className="line">
            <span>Factures et avoirs</span>
            <span className="num strong">{preview.nbFactures.toLocaleString("fr-FR")} · {plural(preview.nbClients, "client")}</span>
          </div>
          <div className="line">
            <span>Total HT</span>
            <span className="num strong">
              {eur(preview.totalHt)}
              {preview.declaredTotal != null && Math.abs(preview.declaredTotal - preview.totalHt) <= 0.05 && (
                <span className="pos"> · conforme au total du journal</span>
              )}
            </span>
          </div>

          <div className="table-wrap table-box">
            <div className="table">
              <div className="tr head cols-preview">
                <div>Mois</div>
                <div className="right">Factures</div>
                <div className="right">CA HT</div>
                <div>Effet</div>
              </div>
              {preview.months.map((m) => (
                <div key={m.mk} className="tr cols-preview">
                  <div className="cell-name">{monthLongLabel(m.mk)}</div>
                  <div className="right cell-soft">{m.n}</div>
                  <div className="right strong">{eur(m.ht)}</div>
                  <div className="cell-soft">
                    {!m.replaced
                      ? "Factures isolées : ajoutées sans écraser le mois"
                      : m.existing
                        ? `Remplace les ${m.existing} factures existantes`
                        : "Nouveau mois"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <div className="notice" style={{ marginTop: 14 }}>
              {preview.warnings.slice(0, 8).map((w, i) => <div key={i}>{w}</div>)}
              {preview.warnings.length > 8 && <div>… et {preview.warnings.length - 8} autres avertissements.</div>}
            </div>
          )}

          <div className="actions">
            {preview.applied ? (
              <button className="btn-secondary" type="button" onClick={reset}>Importer un autre fichier</button>
            ) : (
              <>
                <button className="btn-primary" type="button" disabled={busy || !file} onClick={() => file && send(file, true)}>
                  {busy ? "Import en cours…" : "Confirmer l’import"}
                </button>
                <button className="btn-secondary" type="button" disabled={busy} onClick={reset}>Annuler</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
