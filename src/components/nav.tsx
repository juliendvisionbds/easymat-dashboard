"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
        <Link key={t.href} href={t.href} className={`tab${path === t.href ? " active" : ""}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
