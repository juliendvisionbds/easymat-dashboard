import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  if (supabaseConfigured) {
    const db = await createClient();
    await db.auth.signOut();
  }
  // 303 : le navigateur enchaîne sur un GET de la page de connexion.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
