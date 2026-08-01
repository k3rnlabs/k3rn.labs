# Changelog

## 1.0.0 — 2026-07-30

- FIX: Le guide caméra et l’import du Profil identité utilisent désormais un worker de vision ES module autonome, compilé avant le build et chargé intégralement depuis MIRAVA. Le runtime n’est plus exécuté dans le bundle de page Next, ce qui supprimait l’échec réel `_N_E is not defined` dans les navigateurs.
- FIX: La première création MIRAVA est toujours une image signature à un crédit. Une série de plusieurs images ne peut plus être préconfigurée silencieusement par l’intention d’onboarding.
- REFACTOR: Les fonds MIRAVA utilisent désormais Grainient de React Bits via un contexte WebGL local centralisé par racine visuelle, sans SVG ni tuile de bruit répétée.
- FEATURE: Les grands titres d’ancrage du flow Studio utilisent désormais BlurText de React Bits, avec une entrée mot par mot brève et le respect de la préférence de mouvement réduit.
- REFACTOR: La progression Studio réunit Retour et Suivant dans le header attaché et supprime la barre d’actions inférieure ; la direction sélectionnée devient un brief éditorial compact plutôt qu’une fiche de paramètres.
- FEATURE: Un onboarding MIRAVA dédié recueille prénom, univers, intention et choix de préparer le Profil identité ; une séance passe désormais directement de Moodboard à Séance puis Création, avec aperçus privés temporaires des vraies références d’identité.
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
