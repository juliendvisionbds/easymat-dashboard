import { eur } from "@/lib/format";
import { dateFr, monthLabel } from "@/lib/period";
import { listImports } from "@/lib/store";
import { Upload } from "./upload";

export const metadata = { title: "Imports" };

export default async function ImportsPage() {
  const imports = await listImports();
  return (
    <>
      <div className="hero">
        <h1>Mettre à jour les données.</h1>
        <p>
          Chaque mois, déposez l’export du journal des ventes. Les factures du mois importé remplacent celles déjà
          enregistrées pour ce mois ; les autres mois ne bougent pas.
        </p>
      </div>

      <Upload />

      <div className="card">
        <div className="card-title">Historique des imports</div>
        {imports.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>Aucun import pour l’instant.</div>
        ) : (
          <div className="table-wrap">
            <div className="table">
              <div className="tr head cols-imports">
                <div>Fichier</div>
                <div>Mois écrasés</div>
                <div className="right">Factures</div>
                <div className="right">Total HT</div>
                <div className="right">Importé le</div>
              </div>
              {imports.map((i) => (
                <div key={i.id} className="tr cols-imports">
                  <div className="ellipsis" style={{ fontWeight: 600 }} title={i.filename}>{i.filename}</div>
                  <div className="cell-soft ellipsis">
                    {i.replacedMonths.length > 2
                      ? `${monthLabel(i.replacedMonths[0])} → ${monthLabel(i.replacedMonths.at(-1)!)}`
                      : i.replacedMonths.map(monthLabel).join(", ") || "—"}
                  </div>
                  <div className="right cell-soft">{i.nbFactures.toLocaleString("fr-FR")}</div>
                  <div className="right mono">{eur(i.totalHt)}</div>
                  <div className="right cell-soft">{dateFr(i.createdAt.slice(0, 10))}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
