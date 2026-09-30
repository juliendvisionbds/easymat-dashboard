"use server";

import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  if (!supabaseConfigured) return "Supabase n'est pas encore configuré.";
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return "Renseignez l'e-mail et le mot de passe.";

  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return "E-mail ou mot de passe incorrect.";
  redirect("/");
}
