# Analyse financière Easymat

Tableau de bord du chiffre d'affaires d'Easymat Services, alimenté par le journal des ventes exporté d'Edilogic.

- **Vue globale** : CA de l'exercice, alertes, CA par mois, poids des clients, avoirs, tableau des clients.
- **Vue mensuelle** : le point d'un mois (CA, nouveaux clients, clients dormants, avoirs).
- **Assistant IA** : questions en langage naturel sur les mêmes données (OpenAI, via le proxy key.one).
- **Imports** : dépôt de l'export mensuel, avec aperçu avant enregistrement.

Stack : Next.js 16 (App Router), Supabase (Postgres + Auth), déploiement Vercel.

## Démarrer en local

```bash
npm install
npm run dev
```

Sans variables Supabase, l'app tourne en **mode local** : pas de connexion, données stockées dans `.data/store.json`. Ce mode est refusé en production.

```bash
npm test        # tests du parser et des indicateurs
npm run build
```

## Mise en service

1. **Supabase** : créer un projet, puis exécuter `supabase/migrations/0001_init.sql` dans le SQL Editor.
2. **Utilisateur** : dans Authentication → Users, créer le compte du dirigeant (e-mail + mot de passe). Désactiver les inscriptions publiques (Authentication → Sign In / Providers → « Allow new users to sign up »), sinon n'importe qui peut se créer un compte et lire les données.
3. **Variables d'environnement** (`.env.local` en local, Project Settings → Environment Variables sur Vercel), voir `.env.example` :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `KEYONE_API_KEY` (clé de projet key.one, `kone_live_…`), `KEYONE_OPENAI_BASE_URL`, et `OPENAI_MODEL` si besoin (défaut : `gpt-5-mini`)
4. **Vercel** : importer le dépôt. Si l'app est dans un sous-dossier du dépôt, le renseigner comme Root Directory.
5. **Premier import** : se connecter, onglet Imports, déposer l'historique de l'exercice.

## Format du fichier importé

Le journal de vente Edilogic, en `.xlsx` ou `.csv`, avec au minimum les colonnes `Code client`, `Nom du client`, `N° Facture`, `Date`, `Montant HT`. Les lignes de titre et de total sont ignorées ; le total du journal sert à contrôler la lecture. Les colonnes de marge ne sont pas utilisées.

## Règle d'écrasement

Un fichier écrase les mois qu'il couvre : toutes les factures déjà enregistrées pour ces mois sont supprimées, puis celles du fichier sont insérées. Le mois d'une facture est celui de sa date.

Un mois n'est écrasé que s'il représente au moins 5 % des factures du fichier, ou au moins 20 factures. En dessous, ce sont des factures isolées (par exemple numérotées en février mais datées du 31 janvier) : elles sont ajoutées ou mises à jour par numéro, sans toucher au reste du mois. L'aperçu indique l'effet mois par mois avant confirmation.

## Règles métier

Elles sont dans `src/lib/config.ts` : début d'exercice (novembre), seuil de dépendance (20 %), dormance (3 mois), pic d'avoirs (−20 k€), décrochage.

## Non couvert pour l'instant

- **Marge** : ignorée volontairement.
- **Comparaison N-1** : apparaîtra une fois l'exercice précédent importé ; les vues hausses/baisses restent à construire.
- **Activités et regroupements de clients** : le journal ne les contient pas. Chaque code client Edilogic compte comme un client (Vigna en a neuf).
