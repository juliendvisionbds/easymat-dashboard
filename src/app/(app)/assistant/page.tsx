import { Hero, NoData } from "@/components/ui";
import { pickExercice } from "@/lib/analytics";
import { eur, plural } from "@/lib/format";
import { getDataset } from "@/lib/store";
import { Chat } from "./chat";

export const metadata = { title: "Assistant IA" };

export default async function AssistantPage() {
  const e = pickExercice(await getDataset());
  if (!e) return <NoData />;

  return (
    <>
      <Hero
        title="Assistant IA"
        sub="Il lit les mêmes données que les deux onglets précédents et répond avec des chiffres, jamais avec une impression."
      />
      <Chat
        welcome={`Bonjour. J’ai repris le journal des ventes de l’exercice ${e.label} : ${eur(e.total)} facturés, ${plural(e.clients.length, "client")}. Que voulez-vous savoir ?`}
      />
    </>
  );
}
