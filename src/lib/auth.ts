import "server-only";
import { createClient, supabaseConfigured } from "./supabase";

export type User = { email: string };

// null = personne de connecté. Sans Supabase (développement local), l'accès est ouvert.
export async function getUser(): Promise<User | null> {
  if (!supabaseConfigured) {
    return process.env.NODE_ENV === "production" ? null : { email: "mode local" };
  }
  const db = await createClient();
  const { data } = await db.auth.getUser();
  return data.user ? { email: data.user.email ?? "" } : null;
}
