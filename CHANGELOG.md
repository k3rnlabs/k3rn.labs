# Changelog

## 1.0.0 — 2026-07-30

- FEATURE: Sécurisation du flux de confirmation d'e-mail avec jeton PKCE : création de la route d'échange `/auth/callback` et passage de `emailRedirectTo` dans `/api/auth/signup` pour rediriger l'utilisateur directement vers MIRAVA Studio dès le clic sur le lien de confirmation.
- FIX: Optimisation du flux d'inscription Supabase : retour de la session dans `/api/auth/signup`, connexion et redirection automatique immédiate sans attente d'email si la confirmation automatique est active, et messages d'aide enrichis (dossier Spam / quota SMTP Supabase).
- Initial complete KERN Visual Gold Standard Pipeline pack.
- Master orchestrator and specialist prompts.
- Strict JSON schemas and YAML workflow.
- Multi-tenant Supabase schema.
- Installable `kern-visual-audit` skill.
- Scripts for segmentation, run scaffolding and validation.
- MIRAVA example with desktop/mobile evidence.
- Static Shadcn neutral/grey prototype.
