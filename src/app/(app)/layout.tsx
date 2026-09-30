import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getUser } from "@/lib/auth";
import { eur } from "@/lib/format";
import { dateFr, monthLongLabel } from "@/lib/period";
import { listImports } from "@/lib/store";

// Les données dépendent de la session et des imports : jamais de rendu statique.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const last = (await listImports())[0];

  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <Image src="/logo.png" alt="Easymat Services" width={46} height={46} className="brand-logo" priority />
            <div>
              <div className="brand-title">Analyse financière</div>
              <div className="muted small">Easymat Services · journal des ventes</div>
            </div>
          </div>
          <div className="spacer" />
          <div className="user">
            <div className="avatar">{user.email.slice(0, 2)}</div>
            <div>
              <div className="user-name">{user.email}</div>
              <form action="/logout" method="post">
                <button className="link-btn" type="submit">Se déconnecter</button>
              </form>
            </div>
          </div>
        </div>
        <Nav />
      </header>

      <div className="banner">
        <div className="banner-row">
          <span className="dot" />
          {last ? (
            <span className="banner-text">
              Dernier import le {dateFr(last.createdAt.slice(0, 10))} : <strong>{last.nbFactures.toLocaleString("fr-FR")} factures</strong>,{" "}
              {eur(last.totalHt)} HT
              {last.replacedMonths.length > 0 &&
                ` · ${last.replacedMonths.length === 1
                  ? monthLongLabel(last.replacedMonths[0])
                  : `${monthLongLabel(last.replacedMonths[0])} → ${monthLongLabel(last.replacedMonths.at(-1)!)}`}`}
              .
            </span>
          ) : (
            <span className="banner-text">Aucun import pour l’instant.</span>
          )}
          <Link href="/imports" className="btn-ghost">Importer un export</Link>
        </div>
      </div>

      <main className="page">{children}</main>
    </>
  );
}
