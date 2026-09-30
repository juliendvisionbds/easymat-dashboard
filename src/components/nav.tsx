"use client";

import { usePathname } from "next/navigation";
import { PendingLink } from "./pending-link";

const TABS = [
  { href: "/", label: "Vue globale" },
  { href: "/mensuel", label: "Vue mensuelle" },
  { href: "/assistant", label: "Assistant IA" },
  { href: "/imports", label: "Imports" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {TABS.map((t) => (
        <PendingLink key={t.href} href={t.href} className={`tab${path === t.href ? " active" : ""}`}>
          {t.label}
        </PendingLink>
      ))}
    </nav>
  );
}
