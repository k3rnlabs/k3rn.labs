# Mémoire projet K3RN

## MIRAVA Studio

- MIRAVA Studio est le studio de personal branding isolé, servi sous `/visual-engine` et `/visual-engine/studio`. K3RN reste une infrastructure non exposée dans son interface.
- Les prompts, analyses, consentements détaillés, chemins de stockage et URLs signées ne doivent jamais figurer dans un DTO, un log ou une notification client.
- Les sources privées sont supprimées après 24 h. Les résultats passent uniquement par la route authentifiée `/api/visual-engine/creations/:id/result` avec `Cache-Control: private, no-store`.
- Stripe utilise six prix configurés par `STRIPE_PRICE_MIRAVA_*`; les sessions et abonnements portent `metadata.product=mirava_studio`. Les crédits MIRAVA Studio ne touchent jamais les missions K3RN.
- Les migrations MIRAVA Studio sont appliquées et vérifiées : RLS actif sur les tables Studio et exécution des fonctions transactionnelles refusée à `anon`/`authenticated`.
- Avant déploiement : renseigner les variables Stripe/VAPID, démarrer `pm2` sous le nom `mirava-studio-worker` et traiter l’audit RLS des tables K3RN historiques.

## Règles de sécurité

- Le webhook Stripe est `/api/billing/webhook` et son secret est uniquement `STRIPE_WEBHOOK_SECRET` dans l’environnement d’hébergement.
- MIRAVA Studio appelle OpenAI directement côté serveur comme exception isolée; les flux KAEL restent indépendants.

## Développement local

- Toujours démarrer Next.js avec `npm run dev`. Le lanceur réserve un port et utilise `.next-dev-<port>` avec un tsconfig temporaire; ne pas lancer plusieurs `next dev` directs qui partageraient `.next`.
