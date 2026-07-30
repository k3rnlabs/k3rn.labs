# k3rn Labs — Cognitive Orchestration System

k3rn est une plateforme d'orchestration cognitive conçue pour transformer des idées brutes en stratégies structurées et opérationnelles. 

## 🚀 Vision
Passer du concept à la multinationale en s'appuyant sur un réseau d'experts spécialisés et un assistant stratégique central, **KAEL**.

## 🏗️ Architecture Unique
Le système repose sur deux concepts fondamentaux :
- **Dossiers (Projets)** : Structures de stockage et d'organisation gratuites.
- **Missions** : L'unité de travail effectif. Chaque interaction expert ou création de dossier consomme une mission du budget utilisateur.

## 🛠️ Stack Technique
- **Framework**: Next.js 14 (App Router)
- **Base de données**: PostgreSQL (Supabase) + pgvector pour la mémoire sémantique
- **ORM**: Prisma 7
- **UI/UX**: Tailwind CSS + Framer Motion (Glassmorphism & Liquid Design)
- **AI Orchestration**: appels directs OpenAI (GPT-4o) depuis la couche serveur

## 🔋 Fonctionnalités Clés
- **Canvas Unifié**: Une surface cognitive sans sidebar pour une immersion totale.
- **Budget Missions Automatisé**: Système freemium (30 missions) avec décompte transparent.
- **Programme Ambassadeur**: Système d'affiliation premium géré par Nova, avec URLs personnalisées et OpenGraph dynamique.
- **Profilage & Identité**: Éditeur d'avatar avec recadrage intégré et stockage cloud sécurisé.
- **Mémoire Sémantique**: KAEL se souvient du contexte passé pour calibrer ses stratégies.
- **Rapports Quotidiens**: Synthèse automatisée envoyée via Telegram.

## 🛠️ Développement

### Installation
```bash
npm install
```

### Lancement
```bash
# Frontend & API
npm run dev

# Worker d'ingestion (Graph)
npm run worker

# Worker MIRAVA Studio (générations privées asynchrones)
npm run studio-worker
```

## 📜 Changelog
Voir le fichier [CHANGELOG.md](./CHANGELOG.md) pour le détail des dernières versions.

## MIRAVA Studio

MIRAVA Studio est le studio de personal branding isolé accessible sous `/visual-engine`. Son exploitation, ses variables et sa configuration Stripe sont documentées dans [docs/architecture/MIRAVA-STUDIO.md](./docs/architecture/MIRAVA-STUDIO.md).
# or
pnpm dev
# or
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load **Plus Jakarta Sans** and **Inter**, for a clean, premium sans-serif aesthetic.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
