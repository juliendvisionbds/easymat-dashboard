import Image from "next/image";
import { LoginForm } from "./form";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="login">
      <div className="card login-card">
        <div className="brand">
          <Image src="/logo.png" alt="Easymat Services" width={46} height={46} className="brand-logo" />
          <div>
            <div className="brand-title">Analyse financière</div>
            <div className="muted small">Easymat Services</div>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
