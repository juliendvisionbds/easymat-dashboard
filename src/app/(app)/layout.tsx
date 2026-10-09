import Image from "next/image";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getUser } from "@/lib/auth";

// Les données dépendent de la session et des imports : jamais de rendu statique.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Image src="/logo.png" alt="Easymat Services" width={36} height={36} className="brand-logo" priority />
          <div className="brand-text">
            <div className="brand-title">Analyse financière</div>
            <div className="brand-sub">Easymat Services · journal des ventes</div>
          </div>
        </div>
        <Nav />
        <div className="user">
          <div className="avatar">{user.email.slice(0, 2)}</div>
          <div className="user-text">
            <div className="user-name ellipsis">{user.email}</div>
            <form action="/logout" method="post">
              <button className="link-btn" type="submit">Se déconnecter</button>
            </form>
          </div>
        </div>
      </header>

      <main className="page">{children}</main>
    </>
  );
}
