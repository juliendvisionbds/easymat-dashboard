"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="form">
      <label className="field">
        <span>E-mail</span>
        <input className="input" type="email" name="email" autoComplete="username" required />
      </label>
      <label className="field">
        <span>Mot de passe</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required />
      </label>
      {error && <div className="error">{error}</div>}
      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
