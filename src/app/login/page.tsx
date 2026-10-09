import Image from "next/image";
import { LoginForm } from "./form";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="login">
      <div className="card login-card">
        <div className="brand">
          <Image src="/logo.png" alt="Easymat Services" width={36} height={36} className="brand-logo" />
          <div className="brand-text">
            <div className="brand-title">Analyse financière</div>
            <div className="brand-sub">Easymat Services</div>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
