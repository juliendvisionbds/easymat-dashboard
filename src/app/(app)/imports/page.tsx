import { Hero } from "@/components/ui";
import { eur } from "@/lib/format";
import { dateFr, monthLabel } from "@/lib/period";
import { listImports } from "@/lib/store";
import { Upload } from "./upload";

export const metadata = { title: "Imports" };

export default async function ImportsPage() {
  const imports = await listImports();
  return (
    <>
      <Hero
        title="Mettre à jour les données"
        sub="Chaque mois, déposez l’export du journal des ventes. Les factures du mois importé remplacent celles déjà enregistrées pour ce mois ; les autres mois ne bougent pas."
      />

      <Upload />

      <div className="card flush">
        <div className="card-bar">
          <div className="card-title">Historique des imports</div>
        </div>
        {imports.length === 0 ? (
          <div className="alert-empty">Aucun import pour l’instant.</div>
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
                  <div className="cell-name ellipsis" title={i.filename}>{i.filename}</div>
                  <div className="cell-soft ellipsis">
                    {i.replacedMonths.length > 2
                      ? `${monthLabel(i.replacedMonths[0])} → ${monthLabel(i.replacedMonths.at(-1)!)}`
                      : i.replacedMonths.map(monthLabel).join(", ") || "–"}
                  </div>
                  <div className="right cell-soft">{i.nbFactures.toLocaleString("fr-FR")}</div>
                  <div className="right strong">{eur(i.totalHt)}</div>
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
