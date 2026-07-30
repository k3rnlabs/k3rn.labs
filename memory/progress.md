# Progression projet

## 2026-07-30 — Développement local

- [x] Rendre Alma facultative, contextuelle et réellement actionnable : modèle `gpt-5-mini` dédié, contrat JSON limité, application explicite à la séance, repli manuel et compatibilité de la passerelle avec GPT-5.
- [x] Isoler automatiquement chaque serveur Next.js local par port et cache de compilation afin de permettre plusieurs sessions sans corruption de `.next`.
- [x] Empêcher Next.js de réécrire le `tsconfig.json` partagé lors des démarrages isolés.

## 2026-07-29 — MIRAVA Studio

- [x] Identité « Reflet Oblique » : signe vectoriel architectural, signature éditoriale et icônes PWA/Apple cohérentes en noir minéral et ivoire.
- [x] Identité officielle MIRAVA Studio dans l’interface, les métadonnées PWA, les notifications et la documentation.
- [x] Offres Stripe alignées : Esencia 20, Aura 60, Círculo 150; recharges Esencia 10, Aura 30, Casa 100.
- [x] Identifiant Stripe isolé : `mirava_studio`.
- [x] Webhook et portail client créés dans Stripe; secret configuré dans l’environnement de production.
- [x] Les six `STRIPE_PRICE_MIRAVA_*` sont renseignés dans l’environnement de production.
- [x] Brouillon juridique MIRAVA FR/ES préparé : confidentialité, conditions, consentements et checklist de lancement.
- [x] Migrations des lots de crédits et de verrouillage RLS appliquées et vérifiées sur Supabase.
- [x] Auditer puis protéger les 30 tables K3RN historiques : RLS activé, privilèges Data API navigateur révoqués et DTO de prompts durcis.
- [x] Provisionner `k3rn-rate-limit` via Vercel/Upstash et rendre le rate limiting résilient sans `500`, avec repli fermé en production.
- [x] Ajouter les studios personnels réutilisables, les sept univers MIRAVA et un Profil identité privé de 3 à 6 photos, supprimable, avec référence brute purgée après analyse.
- [x] Ajouter les Séries MIRAVA de 2 à 6 images : crédits par image, reprise durable, résultats multiples et plans de prises de vue réellement variés.
- [x] Refaire la landing et le Studio en « Noir minéral éditorial », mobile-first, avec tokens centralisés, navigation au pouce, Directrice créative plein écran, capture identité guidée et preuves visuelles originales de fidélité.
- [x] Segmenter le Studio en cinq espaces et un parcours Moodboard → Séance → Modèle → Création, avec rayon universel de 12 px, absence de séparateurs horizontaux et Alma incarnée dans une messagerie éditoriale.
- [x] Affiner la navigation en Studio → Univers → Portfolio → Alma → Compte, rattacher le header aux bords de l’écran et déplacer la gestion du Profil identité hors du menu principal.
- [x] Faire du Profil identité une étape principale de l’onboarding, réutilisable et administrable depuis Compte, avec trois portraits obligatoires et trois enrichissements facultatifs.
- [x] Distinguer l’ajout non destructif d’une vue du remplacement complet du Profil identité, avec un plafond de six photos.
- [x] Ajouter une capture locale de type natif avec Face/Pose Landmarker en worker, autocapture stable, revue avant envoi et double verrou anti-trafic externe.
- [x] Unifier caméra et photothèque dans l’onboarding identité : classement local des angles, refus explicites, réparation ciblée et aucun upload avant consentement.
- [x] Recomposer l’onboarding en planche-contact mobile-first et appliquer un grain éditorial discret aux surfaces MIRAVA sans filtrer les photographies.
- [x] Verrouiller création, réutilisation et achat en production derrière `MIRAVA_PUBLIC_LAUNCH_ENABLED`.
- [x] Valider TypeScript, build Next.js, 70 tests du dépôt et absence de prompts/fallbacks externes dans le bundle client.
- [ ] Traiter les 20 vulnérabilités hautes signalées par `npm audit --omit=dev` avant le go-live, sans appliquer de mise à niveau majeure automatique.
- [ ] Déployer l’application et le worker MIRAVA Studio après résolution de l’audit RLS global.
- [ ] Tester un achat en mode test avant toute ouverture publique.

## 2026-07-30 — MIRAVA Studio

- [x] Valider la conception de la Séance adaptative : format obligatoire, direction héritée par univers ou référence et ajustements contextualisés facultatifs.
- [x] Valider le système visuel de matière noir–argent : champ lumineux, grain Canvas React partagé sans SVG et trois intensités de surface centralisées.
- [x] Refonte UI/UX de la landing page MIRAVA Studio (`/visual-engine`) en intégrant les compétences impeccable.style, UI-UX Pro Max, Jakub Kr, Agent-Reach et React Bits (composants interactifs showcase et simulateur d'agent).
- [x] Application de la suite `syntax-syndicate/marketing-skills` : levée d'objections & accordéon FAQ (`MiravaFaq`), balisage JSON-LD SEO (`SoftwareApplication`) pour les bots IA et réassurance CRO.
- [x] Implémenter le parcours adaptatif, les directions contextuelles des sept univers et la matière visuelle centralisée; validation navigateur consignée avec les contrôles de rendu.
- [x] Intégrer shadcn de façon ciblée avec Collapsible et RadioGroup, puis remplacer la navigation mobile par une barre animée contrôlée et intégrer les quatre étapes Studio au header attaché.
