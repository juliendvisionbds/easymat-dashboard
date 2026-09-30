"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Signale la navigation en cours sur le lien cliqué (classe `pending-inner`,
// stylée via `:has()` sur le parent) en attendant le squelette de la page.
export function PendingLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      <Inner>{children}</Inner>
    </Link>
  );
}

function Inner({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={pending ? "pending-inner" : undefined}>{children}</span>;
}
