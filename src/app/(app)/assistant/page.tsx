import { NoData } from "@/components/ui";
import { buildDataset, pickExercice } from "@/lib/analytics";
import { eur, plural } from "@/lib/format";
import { loadFactures } from "@/lib/store";
import { Chat } from "./chat";

export const metadata = { title: "Assistant IA" };

export default async function AssistantPage() {
  const e = pickExercice(buildDataset(await loadFactures()));
  if (!e) return <NoData />;

  return (
    <>
      <div className="hero" style={{ marginBottom: 22 }}>
        <h1>Posez la question.</h1>
        <p>
          L’assistant lit les mêmes données que les deux onglets précédents. Il répond avec des chiffres, jamais avec
          une impression.
        </p>
      </div>
      <Chat
        welcome={`Bonjour. J’ai repris le journal des ventes de l’exercice ${e.label} : ${eur(e.total)} facturés, ${plural(e.clients.length, "client")}. Que voulez-vous savoir ?`}
      />
    </>
  );
}
