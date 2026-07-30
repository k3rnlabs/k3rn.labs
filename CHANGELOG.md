# Changelog

All notable changes to this project are documented in this file.

Format based on Keep a Changelog.

## 2026-07-30

- FEATURE: Page de connexion Mirava Studio `/visual-engine/studio/login` — design full Mirava (dark mineral, grain, ambient, typographie Jakarta), bilingue FR/ES, modes login/signup/forgot. Le Studio redirige désormais vers cette page (et non `/auth/login` K3RN) quand l'utilisateur n'est pas authentifié.
- FIX: Alma utilise désormais son modèle dédié `gpt-5-mini`; la passerelle OpenAI adapte `max_completion_tokens` et omet la température pour les modèles GPT-5, supprimant les erreurs fournisseur `400` qui rendaient la Directrice créative indisponible.
- FEATURE: Alma devient une Directrice créative facultative et actionnable : suggestions contextuelles, validation explicite avant application, repli manuel non bloquant et aucune exposition de données privées.
- REFACTOR: Le panneau Alma adopte une sortie unique « Retour au studio », des actions de départ non dupliquées et une synthèse lisible des ajustements réellement appliqués à la séance.
- FEATURE: La navigation mobile MIRAVA adopte une barre Framer Motion contrôlée par la vue réelle : l’onglet actif développe son libellé, Alma conserve son portrait et les cinq destinations disposent de cibles tactiles de 48 px.
- REFACTOR: Le header Studio partage désormais la matière et la logique segmentée de la barre basse, reste attaché au haut de l’écran avec ses seuls angles inférieurs arrondis et intègre Moodboard, Séance, Modèle et Création.
- FEATURE: Les étapes Studio déjà visitées restent accessibles depuis le header, même après un retour en arrière, sans perdre la chronologie ni les réglages de séance.
- CHORE: Ajout ciblé des primitives shadcn/Radix Collapsible et RadioGroup pour les réglages facultatifs et choix exclusifs, avec navigation clavier et focus MIRAVA visibles.
- FIX: La Directrice créative MIRAVA ne renvoie plus le résultat de `scrollIntoView` comme nettoyage React, supprimant le crash `destroy is not a function` lors de son démontage.
- FEATURE: La Séance MIRAVA s’adapte désormais à la source choisie : direction complète héritée de chaque univers ou fidélité explicite à une référence personnelle, avec format obligatoire et ajustements réellement facultatifs.
- FEATURE: Les sept univers disposent de décors, allures, attitudes et lumières bilingues propres; changer d’univers ou de source efface les réglages devenus incompatibles.
- FEATURE: Les séries permettent de conserver un décor principal ou de parcourir plusieurs décors liés, et la consigne choisie est transmise au brief de génération.
- REFACTOR: Le grain MIRAVA abandonne entièrement les SVG/CSS embarqués au profit d’un calque Canvas React local, unique par racine d’application, non répétitif et partagé par toutes les surfaces sans altérer les photographies.
- REFACTOR: L’onboarding Modèle abandonne sa palette ivoire isolée et rejoint la continuité noir minéral du Studio, avec un rayon universel de 12 px jusque dans les planches-contact.
- CHORE: Le registre React Bits est déclaré pour les futurs effets ponctuels, sans ajouter un canvas WebGL coûteux sur chaque carte.
- FIX: `npm run dev` choisit désormais un port libre avant le démarrage et isole les artefacts Next.js dans `.next-dev-<port>`, empêchant deux sessions locales de corrompre mutuellement leurs routes, runtime Webpack et chunks.
- CHORE: Chaque serveur de développement utilise un tsconfig temporaire ignoré afin que les dossiers de types isolés ne réécrivent plus le `tsconfig.json` partagé.

## 2026-07-29

- REFACTOR: L’onboarding MIRAVA adopte une progression de planche-contact, une étape Modèle éditoriale mobile-first et des actions persistantes dans la zone du pouce, sans cartes SaaS génériques.
- FEATURE: Le Profil identité accepte désormais caméra guidée ou sélection de photothèque, classe localement les vues face/3-4 gauche/3-4 droit et permet de réparer uniquement une vue refusée avant tout envoi.
- SECURITY: Les imports d’identité passent par le même worker local que la caméra, un fichier à la fois, sans upload, métrique faciale ni repli silencieux avant le récapitulatif et le consentement.
- REFACTOR: Les surfaces et cartes MIRAVA reçoivent un grain monochrome fin, auto-hébergé en CSS et modulé par surface, sans recouvrir les photographies ni ajouter de ressource réseau.
- REFACTOR: La navigation MIRAVA devient Studio, Univers, Portfolio, Alma et Compte, avec un dock mobile éditorial sans pavé actif blanc et un panneau de contrôle central sur desktop.
- FIX: Le header MIRAVA est désormais attaché aux bords supérieur et latéraux de l’écran, conserve uniquement ses angles inférieurs arrondis et intègre correctement les zones sûres mobiles.
- REFACTOR: Le Profil identité quitte la navigation principale, reste une étape du shooting et se gère désormais depuis Compte.
- REFACTOR: Le parcours de création est segmenté en quatre étapes progressives — Moodboard, Séance, Modèle et Création — avec réglages secondaires repliés et action finale unique « Créer mes photos ».
- REFACTOR: Tous les composants MIRAVA partagent désormais un rayon de 12 px et les séparateurs horizontaux ainsi que les icônes de magie sont retirés de l’expérience.
- FEATURE: Alma devient la Directrice créative incarnée de MIRAVA avec un portrait original distinct du modèle, un module contextuel dans la séance et une messagerie éditoriale dédiée.
- FIX: MIRAVA reprend désormais la capture guidée à la première vue d'identité manquante et retire `unsafe-eval` de sa politique navigateur en production.
- FEATURE: le Profil identité MIRAVA distingue l’ajout non destructif d’une vue, plafonné à six photos, de la reprise complète du profil depuis Identité ou Compte.
- CHORE: le dossier de sortie Next.js peut être isolé via `NEXT_DIST_DIR` afin que les validations parallèles ne corrompent plus leurs artefacts.

FEATURE: Le Profil identité MIRAVA devient une étape principale et reprenable de l’onboarding, créée avant la première séance puis réutilisée automatiquement, modifiable ou supprimable depuis Compte.
FEATURE: La capture identité adopte un parcours mobile plein écran de type natif : permission contextualisée, guidance en direct, vrais 3/4 gauche/droit, autocapture stable, revue Garder/Refaire et récapitulatif avant envoi.
SECURITY: Le guide caméra utilise Face/Pose Landmarker dans un Web Worker avec modèles et WASM auto-hébergés, blocage programmatique des requêtes externes et CSP `connect-src 'self'`; aucune vidéo ni mesure biométrique n’est transmise.
FIX: Un Profil identité requiert désormais les trois portraits indispensables — face, 3/4 gauche et 3/4 droit — tandis que cheveux et silhouettes restent des enrichissements facultatifs.
CHORE: Ajout de `@mediapipe/tasks-vision` et des modèles locaux versionnés pour l’analyse de cadrage sur l’appareil, sans CDN d’exécution.
REFACTOR: MIRAVA Studio adopte le signe « Reflet Oblique » : une signature vectorielle architecturale, ses icônes PWA/Apple noir minéral, ivoire et sable, et un mot-symbole éditorial cohérent.
REFACTOR: MIRAVA Studio adopte le design system « Noir minéral éditorial » : tokens centralisés, surfaces, contrôles, navigation, grain discret, mouvement respectueux des préférences utilisateur et landing sombre unifiée.
FIX: L’ensemble de l’expérience MIRAVA est aligné sur des primitives mobiles natives de 48 px, des zones sûres iOS/Android, des modales plein écran, un vocabulaire et une langue de document FR/ES cohérents, ainsi qu’une source CSS unique sans couleurs héritées dans les pages.
FIX: Les modales MIRAVA (capture identité, Directrice créative, consentement) et l’écran hors-ligne n’utilisent plus de palette ou de rayons hérités de la précédente direction ivoire solaire.
FIX: Les six exemples du Profil identité MIRAVA utilisent désormais une lumière studio homogène, une carnation naturelle sans ombrage marbré et deux vrais angles de visage opposés à trois-quarts.
FEATURE: MIRAVA Studio propose désormais une image signature ou une série cohérente de 2 à 6 images, avec un crédit par résultat, reprise durable et variation obligatoire des poses, activités, sous-lieux, cadrages et lumières.
FEATURE: Ajout de sept univers de shooting différenciés, d’une Directrice créative privée et d’un Profil identité guidé de 2 à 6 photos incluant angles, cheveux et vues plein pied.
REFACTOR: Refonte complète de la landing et du Studio MIRAVA en ivoire solaire mobile-first à partir de visuels originaux locaux, sans image Pinterest, célébrité ou dépendance externe.
SECURITY: Les références d’identité ne pilotent plus pose, regard, expression, lumière, tenue, bijoux, maquillage ou coiffure; elles servent exclusivement à la fidélité du visage, de la carnation et des proportions.
SECURITY: Création, réutilisation de studio et achat sont bloqués en production tant que `MIRAVA_PUBLIC_LAUNCH_ENABLED` n’est pas explicitement activé.
FIX: La réutilisation d’un studio rattache automatiquement le Profil identité privé existant et la capture guidée gère proprement les navigateurs sans caméra.
CHORE: Les brouillons juridiques FR/ES reflètent désormais le Profil identité 2–6 photos, les séries de 2 à 6 images et la facturation d’un crédit par image livrée.
FEATURE: MIRAVA Studio introduit les studios personnels réutilisables, les six directions éditoriales FAMOSA et un Profil identité privé supprimable depuis le compte.
REFACTOR: Landing et Studio MIRAVA adoptent la direction « ivoire solaire » mobile-first, avec le studio sur mesure comme parcours principal et sans exposition de prompts.
SECURITY: Les photos de référence sont dissociées du Profil identité réutilisable, maintenu dans le bucket privé, contrôlé par propriété et supprimable immédiatement.
FIX: Le rate limiting Upstash utilise prioritairement les identifiants Redis gérés par Vercel, borne les attentes réseau et absorbe les pannes fournisseur sans `500`, avec repli ouvert en développement et fermé en production.
SECURITY: RLS activé et privilèges Data API révoqués pour `anon` et `authenticated` sur les 30 tables historiques K3RN, sans politique client permissive.
SECURITY: Les réponses API des pôles, experts et sessions utilisent des DTO en liste blanche qui excluent les prompts système et les données Dossier jointes.
SECURITY: Le client Supabase navigateur et les usages `service_role` sont séparés en modules distincts; stockage et broadcasts privilégiés restent exclusivement importés par les routes serveur.
CHORE: Historique des migrations Supabase réconcilié avec la migration Visual Engine déjà présente, sans rejouer son SQL.
CHORE: Ajout du brouillon juridique de pré-lancement MIRAVA Studio en français et espagnol, avec consentements, rétention, sous-traitants et checklist de validation.
FIX: Les métadonnées de partage de MIRAVA Studio n’héritent plus du nom, de la description ni du visuel K3RN.
FIX: Le manifest, le service worker et l’écran hors-ligne publics de MIRAVA Studio sont accessibles sans connexion.
SECURITY: Les états et DTO publics MIRAVA Studio utilisent désormais `IDENTITY_READY`; aucune référence au master prompt ne rejoint le bundle client.
SECURITY: Les tables et fonctions transactionnelles MIRAVA Studio sont protégées par RLS et inaccessibles aux rôles navigateur Supabase
REFACTOR: Le studio devient officiellement MIRAVA Studio dans l’interface, la PWA, Stripe, le worker, la configuration et la documentation, avec des identifiants de paiement `mirava_studio`
SECURITY: Les mutations MIRAVA Studio (création, upload, analyse, génération, paiement et push) sont limitées par compte et IP via Upstash
FEATURE: MIRAVA Studio remplace l’expérience publique Visual Engine par une identité premium bilingue, mobile-first et sans aucune référence K3RN dans son interface
FEATURE: Ajout des abonnements MIRAVA Studio 20/60/150, des recharges permanentes, des lots crédités expirables et du report mensuel plafonné
FEATURE: Ajout de la PWA MIRAVA Studio, de l’installation iOS/Android et des notifications opt-in chiffrées sans donnée personnelle
SECURITY: Les résultats MIRAVA Studio passent par une route authentifiée `no-store`; les prompts, analyses, Dossiers et URLs signées ne sortent plus des DTO publics
REFACTOR: Le worker MIRAVA Studio utilise des modèles OpenAI configurables (`gpt-5.6-sol` et `gpt-image-2`) et conserve l’exception directe sans modifier les flux KAEL
CHORE: Documentation de déploiement, de configuration Stripe Tax, de rétention et de l’audit des dépendances MIRAVA Studio
FIX: Les workers d’ingestion authentifient désormais leurs appels internes, réclament effectivement leurs jobs et peuvent terminer les traitements de cartes
FIX: Les callbacks internes (ingestion, documents, Telegram, missions) exigent un secret interne valide, sans ouvrir les routes API au public
FIX: Le paiement crowdfunding est accessible depuis la campagne publique et un événement Stripe rejoué ne compte plus deux fois le même investissement
FIX: Le rate limiting échoue fermé en production lorsqu’Upstash n’est pas configuré
REFACTOR: Les appels IA et Telegram passent directement par les APIs fournisseurs ; les scripts, routes, configuration et colonnes n8n sont retirés
CHORE: Migration de suppression des colonnes n8n appliquée et enregistrée sur le Supabase configuré

## 2026-07-28

FIX: Visual Engine ne sérialise plus aucun prompt ou texte d’analyse vers le navigateur ; la génération consomme uniquement les données persistées côté serveur
FEATURE: Visual Engine Studio devient un micro-SaaS isolé : landing publique `/visual-engine`, Studio authentifié `/visual-engine/studio`, bibliothèque privée et redirection de l’ancien `/studio`
FEATURE: Ajout des créations Studio, consentements 18+/droit à l’image, assets privés Supabase, jobs durables, purge des sources après 24 h et ledger de crédits séparé des missions KAEL
FEATURE: Pipeline Studio directe OpenAI : analyse `gpt-4o` structurée puis édition `gpt-image-1` haute fidélité, rendu vertical cadré en 4:5, sans n8n ni fallback externe
FEATURE: Crédits Studio — 3 créations offertes, packs Stripe TTC 10/29 €, 30/79 €, 100/199 €, Stripe Tax et compensation automatique si la génération finale échoue
FEATURE: Worker PM2 `npm run studio-worker`, limites Upstash et tests Visual Engine ; Vitest est désormais limité aux tests source
FIX: Le worker Studio récupère les jobs interrompus après redémarrage et ne régénère pas un résultat déjà stocké
FIX: Onboarding KAEL ne confirme plus un aspect lorsque le message utilisateur est vide ou indécis
CHORE: Ajout de la migration Supabase Visual Engine, de la documentation d’architecture et de la configuration des prix/stockage Studio
CHORE: Mise à jour de `sharp` vers 0.35.3 pour le cadrage sécurisé des rendus Studio
CHORE: Migration Visual Engine appliquée au Supabase configuré (tables, RPC de ledger et bucket privé)
CHORE: Audit des dépendances — `xlsx` est conservé car utilisé par l’extraction tableur ; son remplacement sécurisé reste un chantier distinct

FIX: Lazy initialization of OpenAI client in ingest route, Suspense boundary on /home route, and resilient fallback in env.ts to prevent Vercel build-time crashes
FIX: Correction de l'URL de base de données PostgreSQL Supabase dans .env et Vercel (remplacement de l'hôte pooler obsolète par db.qcjtqtagrlwblejosvrt.supabase.co), fallback DIRECT_URL dans prisma.ts et sécurisation de res.json() dans LoginPage
FIX: Amélioration des messages d'erreur d'authentification Supabase (traduction en français et gestion explicite du quota d'emails "email rate limit exceeded")
FIX: Couverture globale de traduction systématique en français de toutes les erreurs Supabase/réseau avec détection et fallback dynamique dans auth-errors.ts
FEATURE: Ajout du bouton d'affichage/masquage des mots de passe (icônes œil) et de la double vérification (mot de passe de confirmation) lors de l'inscription dans LoginPage
FEATURE: Implémentation complète du flux "Mot de passe oublié" (mode sur la page de login, route `/api/auth/forgot-password`, route `/api/auth/reset-password` et page `/auth/reset-password`) avec helper centralisé de traduction des erreurs en français
CHORE: Migration Supabase vers nouveau projet qcjtqtagrlwblejosvrt (nouveau compte k3rnlabs)
CHORE: prisma db push — toutes les tables recréées sur le nouveau Supabase (7 poles + 22 experts seedés)
CHORE: Storage migré — avatar utilisateur uploadé dans bucket Avatars du nouveau Supabase
CHORE: .gitignore étendu — exclusion archives .storage.zip, scripts de debug racine, Icon macOS
FEATURE: Studio Visual Direction Extraction Engine & Avatar Photo Studio (`/studio`) with LLM Proxy extraction (`callLLMProxy` gpt-4o), user profile face/body photo inputs, style reference photo extraction, configuration panel (variations count 1-3, ratio, environment/studio/wardrobe overrides) & direct image downloads
FEATURE: Added Spanish (🇪🇸 ES) and multi-language switcher (FR, ES, EN) for Studio DA interface and summary prompt extraction
FIX: Studio UI (`visual-engine-studio.tsx`) — la zone de texte "PROMPT FINAL" est passée d'une hauteur fixe de 112px (`h-28`) à une hauteur étendue (`h-64 sm:h-80`) avec défilement fluide, permettant d'afficher l'intégralité du master-prompt de 400+ mots sans troncature visuelle
FIX: Route `/api/visual-engine/generate` — assainissement des mots réservés pour DALL-E 3 (`fashion resort wear`), augmentation du délai d'expiration à 35s et remplacement du paysage de mer vide par des photos de mannequin en éditorial de plage
FEATURE: Route `/api/visual-engine/generate` — réécriture complète de la pipeline de génération : intégration OpenAI Responses API (`gpt-4o` + tool `image_generation`) comme Step 1 prioritaire qui reçoit les photos du modèle utilisateur en `input_image`, génère l'image en préservant l'identité (visage, peau, proportions) — exactement comme le fait ChatGPT en interne ; DALL-E 3 (text-only) reste en Step 2 de fallback, Pollinations Flux en Step 3, Unsplash éditorial en Step 4
FEATURE: Studio `visual-engine-studio.tsx` — compression canvas client-side de toutes les photos uploadées avant encodage base64 (`compressImage` : redimensionnement max 900px JPEG q=0.82 pour profils, max 1200px q=0.88 pour référence) afin de réduire le payload de ~3MB à ~150KB par photo et respecter les limites de taille de l'API
CHORE: Route `/api/visual-engine/generate` — ajout de `export const maxDuration = 120` (2 minutes) pour autoriser la durée d'exécution étendue nécessaire à la Responses API sur Vercel
FEATURE: Route `/api/visual-engine/extract` — renforcement des consignes d'extraction dans le prompt système et ajustement de `temperature: 0.6` pour contraindre GPT-4o à produire des master-prompts complets d'une richesse extrême (350-500 mots décrivant en micro-détails la plage, les lunettes translucides, les cheveux humides, l'angle 28-35mm, les bijoux et l'ordre de priorité)
FIX: Route `/api/visual-engine/generate` & `visual-engine-studio.tsx` — remplacement définitif de l'URL de secours erronée (`photo-1515886657613` jogging jaune streetwear) par de véritables photographies éditoriales de plage tropicale ensoleillée
FIX: Route `/api/visual-engine/generate` — intégration de la génération dynamique Pollinations Flux AI et sélection contextuelle d'images selon les mots-clés du prompt (plage/soleil/sable vs studio/sombre) pour éliminer les incohérences de décor
FIX: Studio UI (`visual-engine-studio.tsx`) & `/api/visual-engine/generate` — ajout d'un gestionnaire `onError` résilient sur la balise `<img>` et sécurisation des URLs d'images photographiques haute définition pour empêcher les icônes d'images brisées dans la galerie
FEATURE: Route `/api/visual-engine/extract` — mise à jour complète du `SYSTEM_PROMPT` avec les spécifications exactes de l'Engine (processus d'analyse en 8 axes : décor, composition, pose, vêtements, beauté, éclairage, rendu photo, ordres de priorité) et augmentation de `max_tokens` à 3500 pour générer des prompts de direction artistique ultra-détaillés et professionnels
REFACTOR: Studio UI (`visual-engine-studio.tsx`) — suppression des images par défaut pré-chargées Unsplash dans les sections "Identité de Référence" et "Direction Artistique" ; la page démarre désormais entièrement vierge avec des zones d'upload interactives ("placeholders") prêtes au clic/glisser-déposer
FIX: Studio UI (`visual-engine-studio.tsx`) — correction du bug où `referenceImage` était remplacée par la chaîne littérale `"Uploaded Base64 Image"` lors de l'envoi au serveur ; envoie désormais la vraie URL / Data URI de l'image pour analyse par GPT-4o Vision
FIX: Route `/api/visual-engine/extract` — activé GPT-4o Vision avec envoi de l'image de référence en `image_url` (permet à l'IA d'analyser visuellement la photo réelle au lieu de lire une simple chaîne de texte)
FEATURE: Route `/api/visual-engine/generate` — intégration de la génération réelle de photos IA via OpenAI DALL-E 3 et fallback Pollinations/Flux (remplacement des cercles bleus SVG factices par de vrais rendus photographiques 8K ultra-détaillés)
FIX: Route `/api/visual-engine/extract` & Studio UI — support flexible JSON response structure (`extractData.data || extractData`), fixing `Cannot read properties of undefined (reading 'finalGenerationPrompt')` error
REFACTOR: Studio UI complete DA redesign — strict alignment with K3RN Labs design system (unified violet-indigo palette, liquid glassmorphism cards with inset shadow & shimmer top borders, custom ChipSelector replacing native HTML select dropdowns, removal of AI tells like flag emojis and over-labeling, text-wrap balance/pretty typography, smooth mobile tab bar with animated sliding indicator)
FIX: Route `/api/visual-engine/extract` — remplacé `callLLMProxy` (nécessite `N8N_LLM_PROXY_URL` absent en dev) par un appel direct `fetch` OpenAI Chat Completions avec `OPENAI_API_KEY` ; résout l'erreur d'extraction en environnement local
REFACTOR: Mobile-first UX optimization for `/studio` (sticky mobile action bar, touch targets >= 44px, responsive mobile tabs switching automatically to results on generation)
CHORE: Access link to Studio DA added to primary HomeDock navigation bar


## 2026-03-13

FIX: Session interactive depuis KAEL pré-remplit l'input sans auto-envoyer le message (ajout prop initialInput sur PoleSlideUpPanel)
FIX: Carte MissionProposalCard se désactive après clic "Session interactive" pour éviter double-clic
REFACTOR: KaelSlideUpPanel expose onSessionInteractiveToPole séparé de onRouteToPole — routing KAEL standard conserve l'auto-send

## 2026-03-09

FEATURE: New autonomous mission flow — "Générer le brief" replaces "Envoyer en mission"; expert plan shown in PoleSlideUpPanel before budget debit
FEATURE: POST /api/kael/missions/brief — creates PoleSession with brief as first message, calls expert for plan (isMissionPlan), creates AutonomousMission BRIEFING (no debit)
FEATURE: POST /api/kael/missions/confirm — debits budget, executes mission via invokeExpertDirect, injects report in PoleSession, creates Task suggestions from next steps
FEATURE: MissionConfirmCard in PoleSlideUpPanel — detects isMissionPlan messages, shows "Confirmer la mission — N missions" button
FEATURE: onMissionBriefed callback chain — KaelSlideUpPanel → workspace page → PoleSlideUpPanel opens with briefedSessionId + briefedMissionId
FEATURE: AutonomousMission.poleSessionId field added to schema and DB (migration applied)
CHORE: Tasks auto-created from mission report next steps (SUGGESTED, origin "mission")

## 2026-03-08

FIX: invokeExpertDirect — add responseFormat text to callLLMProxy, fixing "Désolé une erreur" on autonomous missions (default was json_object, incompatible with free-text expert reports)
FIX: POST /api/kael/missions — replace legacy missionBudget check with new checkMissionBudget/consumeMission system, fixing 403 with valid budget
FEATURE: Unread badges for all expert poles on workspace mount — GET /api/kael/unread returns all unread keys (kael + poleIds), workspace page marks each as unread via markUnread
FEATURE: Add GET /api/kael/unread route — returns unread message keys for KAEL and all active pole sessions

REFACTOR: Settings page — refonte UI/UX alignée sur le dashboard (bg-background, header border-b + Logo identique, max-w-5xl, sidebar nav zinc, typographie standard, sans glassmorphism ni glows)

## 2026-03-08 (suite)

FIX: onboarding route — suppression checkMissionBudget + consumeMission (KAEL onboarding = gratuit comme KAEL workspace)
FIX: settings/page.tsx — suppression bloc "Budget missions" dans l'onglet profil (doublon)
REFACTOR: settings/page.tsx — onglet "Crédits & Accès" → "Plan & Missions"
FEATURE: subscription-plans.ts — définition plans Solo/Studio (29€/60 missions, 79€/200 missions)
FEATURE: api/billing/subscribe — POST crée checkout Stripe subscription ou redirige vers portal si abonnement existant
FEATURE: api/billing/portal — POST génère lien Stripe Billing Portal (factures, annulation, paiement)
FEATURE: billing/webhook — gestion customer.subscription.created/updated/deleted + invoice.payment_failed, mise à jour subscriptionTier + monthlyMissionAllowance en DB
FEATURE: settings/page.tsx — section Crédits & Accès refaite : budget réel (allowance + top-up), grille 3 plans avec boutons, portail Stripe pour abonnés

## 2026-03-08

FEATURE: api/poles/sessions/[sessionId] — checkMissionBudget avant appel expert + consumeMission fire-and-forget après réponse
FEATURE: api/dossiers/[id]/onboarding POST — checkMissionBudget avant appel KAEL + consumeMission après réponse LLM
FEATURE: api/user/budget — GET route exposant allowanceLeft + topUpLeft + total
FEATURE: use-mission-budget.ts — hook React avec cache 30s
FEATURE: home-dock + workspace Dock — affichage budget réel (allowance + top-ups) via useMissionBudget
FEATURE: mission-budget.ts — nouveau système hybride abonnement + top-up (checkMissionBudget, consumeMission, creditTopUpMissions, getMissionBudgetDisplay)
FEATURE: prisma schema — ajout SubscriptionTier enum (FREE/SOLO/STUDIO) + champs subscription sur User (subscriptionTier, monthlyMissionAllowance, monthlyMissionsUsed, topUpMissions, allowanceResetAt, stripeCustomerId, stripeSubscriptionId)
FEATURE: migration Supabase — subscription_tiers_and_mission_model appliquée
FEATURE: credit-packs.ts — prix top-ups révisés (12€/30, 29€/100, 69€/300, 149€/1000)
REFACTOR: billing/webhook — utilise creditTopUpMissions() au lieu d'incrémenter missionBudget directement
REFACTOR: api/dossiers POST — création de dossier gratuite (suppression débit missionBudget à la création)
REFACTOR: use-dossier.ts — suppression BudgetExhaustedError sur création dossier
REFACTOR: dashboard-page.tsx — suppression catch BudgetExhaustedError sur handleCreate

FIX: globals.css — --primary in dark mode was hsl(0 0% 98%) (white) causing white-on-white buttons; corrected to brand orange hsl(17 100% 45%) = #E84000 in both :root and .dark
FIX: button.tsx — outline variant now includes explicit text-foreground to prevent invisible text in edge cases
REFACTOR: wording — "Licence/Alpha Labs/K3RN Pro/Palier Actif" → "Accès/Early Access/Pro/Accès actuel" across settings + docks

FEATURE: Billing — 4 credit packs (Bootstrapped/Funded/Series B/IPO Ready) via Stripe Checkout
FEATURE: POST /api/billing/checkout — creates Stripe Checkout session for a credit pack
FEATURE: POST /api/billing/webhook — handles checkout.session.completed, credits missionBudget
FEATURE: CreditsModal — modal with 4 packs, opens on budget exhausted (dashboard) or from settings
FEATURE: Settings subscription tab — shows missionBudget with color coding + Recharger button
FEATURE: Dashboard — credits success banner after Stripe redirect (?credits=success)
FIX: useCreateDossier — surfaces BudgetExhaustedError (HTTP 403) as typed error for UI handling
FIX: POST /api/dossiers — missionBudget null treated as 0 (blocking creation for users created before column was added); now defaults to 30
FIX: /invite/[code] server-side crash — cookies().set() moved from Server Component to middleware (Next.js 14 constraint)
REFACTOR: score-engine — cross-contribution model: outcome+constraint now feed both Produit AND Finance; problem+target also feed Validation baseline
FIX: FloatingWorkspaceInfo title "Mémoire du projet" → "Progression"
FEATURE: KAEL workspace opener proactive — GET /api/kael/init creates opener session on workspace mount, badges KAEL button
FIX: KAEL message duplication — POST route now appends to DB messages instead of trusting client history
REFACTOR: invokeChefDeProjet — challenge max 4 (was 2), multi-question per message allowed, acquittements anti-generique, transitions directes
FEATURE: KAEL session continuity — last 10 messages from previous session injected as context in new sessions
FEATURE: KAEL direct answer rule — answers simple questions directly, missionProposal only for research/deep analysis tasks
FEATURE: kael_notes (post-session synthesis) now injected into buildProjectMemory brief
REFACTOR: invokeChefDeProjet prompt — ultra-personalization: questions must be anchored in user's exact words, generic/abstract questions forbidden
FIX: Autonomous missions now execute via invokeExpertDirect fire-and-forget instead of broken n8n k3rn-expert-mission webhook
FEATURE: executeAutonomousMission() — runs LLM directly, updates status RUNNING→DONE, injects result into KaelSession, broadcasts via Realtime
FEATURE: invokeExpertDirect() — experts now respond via direct callLLMProxy with their systemPrompt, replacing broken n8n GuichetUnique routing
REFACTOR: Pole session routes (create + send message) use invokeExpertDirect instead of invokeN8nPole
FEATURE: Universal mission flow — ALL experts now go through missionProposal (brief + validation + budget) instead of direct routedPole
FEATURE: Wire "Session interactive" button in MissionProposalCard → opens expert panel directly with routing context
FIX: Remove KAEL auto-redirect — routing shows inline "Ouvrir session" button instead of closing KAEL immediately
FEATURE: Auto-start pole session with KAEL routing context — expert responds via real LLM when opened from KAEL routing
FIX: Remove hardcoded manager greeting — chat starts empty when no routing context, populated by real LLM when context exists
FIX: Add polling (5s interval) for autonomous mission status — injects result as manager message when DONE
FIX: Pass routingReason from KAEL response through to PoleSlideUpPanel via onRouteToPole callback

## 2026-03-08

FIX: KAEL routing — auto-open expert panel quand routedPole reçu (onRouteToPole callback)
FIX: KAEL prompt — règle anti-répétition renforcée (si user dit "go" après routing → retourner routedPole immédiatement)
FIX: FloatingWorkspaceInfo — redesign glassmorphism, collapsible, suppression Card shadcn
FIX: ScoreMeter — redesign glassmorphism 4 dimensions (Marché/Produit/Finance/Validation), sans Card
FIX: ForceGraph — dimensions initiales window.innerWidth, rebuild immédiat après fetch, poles via supabaseAdmin direct
FIX: /api/dossiers/[id]/graph — poles fetch via supabaseAdmin (pas db.pole.findMany)
FEATURE: Knowledge System — ExpertDocument + Task tables (migration Supabase)
FEATURE: API /api/documents (GET/POST/PATCH/DELETE) — CRUD ExpertDocuments avec webhook n8n
FEATURE: API /api/tasks (GET/POST/PATCH/DELETE) — CRUD tâches avec cycle de vie SUGGESTED→DONE
FEATURE: triggerDocumentExtraction() — extraction async post-session pôle, fire-and-forget
FEATURE: TaskPanel — panneau tâches flottant dans workspace (liste, création, avancement statut)
FEATURE: Dock — bouton Tâches (CheckCircle2) ouvre TaskPanel
FEATURE: Memory Graph — refonte complète en knowledge graph force-directed (react-force-graph-2d)
FEATURE: ForceGraph.tsx — nœuds hubs pôles + cartes + documents + tâches, filtres viewMode/type/search
FEATURE: NodeModal.tsx — modal au clic nœud : fiche expert / preview carte / document / tâche
FEATURE: /api/dossiers/[id]/graph — retourne poles + cards + relations + documents + tasks
REFACTOR: CanvasView.tsx — remplace ReactFlow par ForceGraph, conserve interface props

FEATURE: pole-manager-chat — bandeau "Mission en cours" si mission RUNNING/PENDING pour cet expert+dossier
FIX: notifications GET — sélect-puis-insert au lieu de upsert (Supabase upsert retourne null data sur row existante)
FIX: kael/route — normalise missionProposal.initialObjective → objective avant persistance DB
FIX: missions route — { decrement } remplacé par RPC SQL decrement_mission_budget (DbModel ne supporte pas l'opérateur)
FIX: kael route — missionProposal et choices persistés dans les messages DB (carte mission visible à la réouverture)
FIX: SlideUpPanel — "Invalid Date" sur messages sans timestamp (fallback vide)
FIX: SlideUpPanel — proposal.objective → proposal.initialObjective (Zod 400 sur /api/kael/missions/estimate)
FIX: estimate route — prompt LLM forcé à toujours générer briefFinal non null
FIX: SlideUpPanel — fallback brief sur proposal.initialObjective si briefFinal null malgré tout
FIX: GET /api/user/notifications — suppression ignoreDuplicates:true (upsert retournait null → 500)
FIX: n8n TelegramGateway — CERVEAU KAEL gère /start seul → route menu
FIX: n8n TelegramGateway — Config refactorisé (évite }} interprété comme expression)
FIX: n8n TelegramGateway — Send Reply ajout operation:sendMessage (était invalide)
FIX: n8n TelegramGateway — Build Session Body refactorisé avec $input.first().json

## 2026-03-07

FIX: ProjectFolderCard — body rounded-[28px] partout (top-left inclus), overlap tab/corps réduit à 8px (pt-[20px])
FEATURE: Settings Telegram — indicateur visuel connecté (dot pulsant, chat ID masqué, border verte, polling auto 5s)
FIX: n8n K3RN__TelegramGateway__v1 — restauré et activé après corruption MCP (nodes Is Link?/Webhook Link/Link Reply mis à jour vers typeVersions compatibles)

FIX: API /api/user/notifications + /api/user/telegram/link — DbModel.create() injectait id: newId() sur une table sans colonne id (userId = PK), remplacé par supabaseAdmin upsert direct
FIX: Skeleton loading des dossiers — forme exacte de la vraie carte (tab content-driven + diagonal + body 90% + blocs hiérarchiques)
FEATURE: Telegram setup banner persistante sur la home (dismissible, lien vers Settings → Préférences)
FEATURE: Raccourci "Connecter Telegram" dans le panel profil du HomeDock et du Dock workspace si non configuré
FEATURE: Hook useNotificationSettings avec cache layer (pattern identique à useUserProfile)
FEATURE: Settings onglet Préférences — flow /link token Redis + deep link Telegram + toggles notifications
FEATURE: n8n K3RN__TelegramGateway__v1 — détection /link token + webhook vers API + réponse confirmation
CHORE: Tooltip "Nouveau dossier" sur le bouton + du HomeDock

FEATURE: Liaison Telegram — token generation (POST /api/user/telegram/token, Redis TTL 15min) + webhook link (POST /api/user/telegram/link) + UI flow complet dans Settings
FEATURE: Settings — UserNotificationSettings configurable (toggles missions + Telegram, section intégration Telegram)
FEATURE: API GET/PATCH /api/user/notifications — lecture et mise à jour des préférences de notification
FEATURE: Missions autonomes — UI complète dans KAEL chat (MissionProposalCard, MissionUpdateBubble, MissionResultBubble, Supabase Realtime subscription)
FEATURE: db.ts — ajout autonomousMission + userNotificationSettings dans DbClient
FEATURE: env.ts — ajout N8N_BASE_URL avec default k3rnlabs.com

## 2026-03-07

FEATURE: Score engine refonte — 4 dimensions (Marché/Produit/Finance/Validation) alignées YC+BCG, pondérations par lab, labels Embryonnaire→Mature, levier prioritaire dans brief KAEL
FEATURE: score-engine.ts — LAB_WEIGHTS par phase, validation_interviews déplacé vers dimension Validation, productScore via techScore DB compat, getScoreLabel/getScoreTier/getScoreTierColor exportés
FEATURE: project-memory.ts — section score 4 dimensions avec labels et LEVIER PRIORITAIRE déterministe pour routing KAEL
FEATURE: claude.ts invokeKAEL — prompt référence les 4 dimensions nommées et le levier prioritaire du brief
FEATURE: poles/sessions/[sessionId]/route.ts — fire-and-forget computeAndPersistScore après chaque échange expert
CHORE: prisma schema + Supabase migration — ajout colonne validationScore Float sur ScoreSnapshot
FEATURE: KAEL workspace — choices obligatoires si pas de routedPole, règle anti-répétition, framing DISCOVERY positif, explication workspace process dans le prompt invokeKAEL
FEATURE: generateKAELOpener retourne maintenant { message, choices } au lieu d'un string — choices sauvegardées en DB avec le message opener
FEATURE: SlideUpPanel KAEL — rendu des choices comme chips cliquables sur le dernier message KAEL, guard client si choices absents
FIX: onboarding handleEnterWorkspace — hard navigation window.location.href vers /workspace/${id} (bypasse le cache TanStack Query, évite le bounce vers onboarding)
FIX: claude.ts — stateReminder : instruction "TON MESSAGE DOIT SE TERMINER PAR UNE QUESTION" remplacée par logique conditionnelle (si user vient de répondre → confirmer + compléter ou avancer ; sinon → poser la question)
FIX: workspace gate — attendre isFetching=false avant de rediriger vers onboarding (évite le bounce sur cache TanStack Query stale après completion)
FIX: SlideUpPanel KaelSlideUpPanel — charger la session active depuis DB au montage (remplace le message hardcodé générique par l'historique réel + opener proactif LLM au 1er envoi)
FIX: onboarding route POST — idempotency guard strip choices/questions des messages avant retour (évitait hasPendingChoices=true bloquant isComplete côté client)
FIX: onboarding route POST — suppression du guard regex sur choices (le LLM décide quand proposer des choices, pas un pattern /[?]/)
FIX: onboarding/page.tsx — scroll automatique déclenché aussi quand isComplete passe à true (carte de complétion visible sans avoir à scroller manuellement)
FIX: claude.ts — suppression phrase d'acquittement hardcodée "Je retiens ça pour l'instant" du prompt APRÈS 2 CHALLENGES (KAEL la copiait mot pour mot à chaque fois)
FIX: onboarding GET — message de bienvenue KAEL persisté en DB dès le premier chargement (retour en arrière et reprise de session conservent l'historique complet)
FIX: api/og/invite/route.tsx — ajout `export const dynamic = 'force-dynamic'` pour éviter l'erreur de build Next.js (route utilisait request.url)
FIX: n8n.ts — callLLMProxy : guard explicite si N8N_LLM_PROXY_URL est undefined (remplace le cryptique "Cannot read properties of undefined (reading 'toString')" par un message clair sur la variable d'env manquante)

FIX: KaelPanel — charger l'historique de session depuis GET /api/kael/session/active au montage (supprime le message hardcodé "Bonjour. Je suis KAEL")
FIX: onboarding/page.tsx — suppression redirection automatique isComplete (court-circuitait le message de clôture normal)
FIX: onboarding-state.ts — guard serveur : COMPLETE bloqué si un aspect weak n'a pas challengeCount >= 1 (empêche isComplete prématuré même si LLM met les 4 aspects dès le 1er échange)
FIX: claude.ts — isComplete interdit si un aspect weak n'a pas été challengé au moins 1 fois, séquence challenge obligatoire target→outcome→constraint
FIX: claude.ts — exemples challenge retirés du prompt (KAEL les copiait mot pour mot au lieu d'adapter au contexte)
FIX: claude.ts — invokeChefDeProjet : aspects faibles présents dans le 1er message confirmés weak immédiatement (ne plus les ignorer ni les redemander), challenge séquentiel à partir du 1er faible seulement
FIX: claude.ts — invokeChefDeProjet : confusion problem/outcome corrigée (chiffre douleur prestataire ≠ outcome client final), contrainte multiple challengée, cible double→weak après 1 seul challenge
REFACTOR: claude.ts — invokeChefDeProjet : critères solidité renforcés (cible double=weak, outcome sans chiffre=weak, contrainte universelle=weak), anti-validation prématurée, exemples challenges améliorés
FIX: onboarding/route.ts — suppression macroState:"ONBOARDING" (enum invalide Supabase → 500 instantané)
FIX: onboarding/route.ts — message max 50000 chars (était 10000, rejetait les pitchs longs)
FIX: onboarding/route.ts — double try/catch outer pour capturer les erreurs hors du bloc inner
FIX: claude.ts — invokeChefDeProjet : content en string si pas d'images (OpenAI rejette json_object avec content array)
FIX: n8n.ts — log du body de réponse n8n en cas d'erreur HTTP
FIX: onboarding/page.tsx — photo KAEL : kael-avatar-onboarding.png → /images/experts/Kael.webp
REFACTOR: DashboardPage — traduction complète en français (titres, labels, boutons, placeholders, états vides)
REFACTOR: ProjectFolderCard — silhouette dossier finale : tab (bg-zinc-900) + connecteur diagonal + body (bg-zinc-700/50, width 80%, rounded-tr+b), tab unifié avec body, ligne accent supprimée
FIX: skeleton loading — aligné sur la vraie géométrie (pt-[28px], width 80%, tab bg-zinc-900, body rounded-tr+b)

## 2026-03-06

REFACTOR: ProjectFolderCard — vraie silhouette folder via CSS clip-path polygon, rename inline au clic, tags suggérés depuis tous les dossiers existants, grille ajustée sm/xl
FIX: skeleton loading — suppression des constantes OVERLAP/TAB_W obsolètes, remplacement par TAB_H/TAB_W_PCT
FEATURE: useRenameDossier — hook PATCH /api/dossiers/[id] { name } avec cache invalidation
FIX: POST /api/dossiers — remplacer `{ decrement: 1 }` (syntaxe Prisma non supportée par le wrapper Supabase) par `user.missionBudget - 1` pour débiter le budget missions correctement

## 2026-03-06 (KAEL Chief of Staff)

FEATURE: KAEL workspace — réécriture complète du prompt invokeKAEL : identité Chief of Staff, ton conseiller senior, comportement ancré dans le brief, interdiction de reformuler ou de poser des questions vagues
FEATURE: buildProjectMemory() enrichi — brief onboarding avec quality tags, scores par dimension (marché/finance/tech), cartes par état (validées/brouillons/rejetées), lab transition status
FEATURE: generateKAELOpener() — message initial proactif généré via LLM à partir du brief ; remplace le message hardcodé "Qu'est-ce que tu veux explorer ?"
FEATURE: triggerKAELPostSessionNote() — synthèse KAEL asynchrone après chaque session pôle expert, stockée comme kael_note dans kaelSession
REFACTOR: /api/kael/route.ts — buildProjectMemory() appelé avant la création de session pour alimenter generateKAELOpener()
REFACTOR: /api/poles/sessions/[sessionId]/route.ts — trigger triggerKAELPostSessionNote fire-and-forget après chaque réponse expert

## 2026-03-06 (suite)

FIX: score-engine — outcome + constraint scorés sur Finance (viabilité business) au lieu de Tech ; quality "weak" compte 0.5x au lieu de 1x
FIX: onboarding DELETE — rollback de onboardingState via snapshot _stateBefore stocké dans le message expert ; état cohérent après Retry
FIX: onboarding POST — macroState passe à "ONBOARDING" au premier message, revient à "WORKSPACE_IDLE" à la complétion ; scoreStatus "computed"|"failed"|"pending" retourné dans la réponse
FIX: dossiers POST — onboardingState initialisé à createInitialState() à la création (plus de null DB)
FIX: claude.ts — critère "problem" retire "population identifiable" (appartient à target) ; remplacé par "fréquence ou intensité mesurable"
FIX: ChatMessage interface — ajout champ _stateBefore?: Record<string, unknown> pour rollback DELETE
REFACTOR: onboarding page.tsx — useMemo sur lastKaelWithInteraction (scan O(n) à chaque render → memoïsé) ; banner "Session en cours" si IN_PROGRESS avec aspects confirmés

## 2026-03-06

FIX: Workspace — exclusivité des panneaux flottants : ouvrir CommandPalette ferme KaelCommandBar et vice-versa, une seule fenêtre ouverte à la fois
FIX: CommandPalette — navigation directionnelle cohérente : ←/→ dans sections horizontales (types, disposition), ↑/↓ entre sections verticales et pour Interface (sons/minimap) ; onglet Recherche : ←/→ entre sous-dossiers, ↑ retour à l'input
FIX: KaelCommandBar — navigation clavier ↑↓ dans la liste d'experts : ArrowDown depuis l'input descend vers le premier expert, ArrowUp depuis le premier remonte à l'input, Enter sélectionne, scroll automatique de l'item focalisé
FIX: CommandPalette onglet Recherche — ArrowDown depuis la barre de recherche passe au premier item (Vue globale), ArrowUp depuis Vue globale retourne le focus à la barre de recherche
FIX: CommandPalette — supprimer raccourcis ⌘+lettre (conflits système), remplacés par navigation flèches (← → ↑ ↓) + Entrée pour activer ; focusedIndex avec ring visuel sur chaque item
FIX: KaelCommandBar — ZARA renommé SKY en DB, photos experts à la place des initiales, bouton "Trouver un expert", recherche par mot-clé libre (sans #), hashtags enrichis pour les 7 experts (~15-20 triggers chacun)
FIX: Francisation complète V1 — labels types de cartes (Idée/Décision/Tâche/Analyse/Hypothèse/Problème/Vision), sous-dossiers (Produit/Marché/Technologie/Business), états cartes (Brouillon/Validée/Rejetée/Archivée), card-detail-panel entièrement traduit
FEATURE: CommandPalette — raccourcis ⌘ intuitifs par type de carte (⌘I/D/T/N/H/P/V), disposition ⌘G/⌘R, S/M sons/minimap ; navigation 0-4 sous-dossiers dans Recherche
FIX: CommandPalette — tab contrôlé par le parent (plus de defaultTab) : ⌘K/⌘L basculent l'onglet en temps réel sans fermer/rouvrir
FIX: Dock workspace — cliquer sur un panneau fermé l'autre instantanément (plus besoin de fermer manuellement)
FIX: Dock workspace — raccourci ⌘L ajouté pour Filtres & Vue (⌘K = Recherche, ⌘L = Filtres)
FIX: Dock workspace — boutons Recherche et Filtres fonctionnent en toggle (clic sur le bouton actif ferme la palette, clic sur l'autre tab bascule sans conflit)
FIX: Workspace — conflit ⌘K résolu : KaelCommandBar passe à ⌘J (sélection expert), Dock garde ⌘K (recherche canvas)
FIX: Dock (home) — bouton profil remplacé par icône User standard avec tooltip "Mon profil" au survol
FEATURE: Dock (workspace) — bouton profil avec panel rapide identique (quota missions, plan, lien paramètres)
FIX: Settings — schema Zod PATCH accepte désormais null (z.string().nullable()) pour les champs optionnels, corrige le 400 à la sauvegarde
FIX: Settings — bouton Enregistrer désactivé si aucune modification (dirty tracking sur 5 champs profil)
FIX: Settings — handleSave n'envoyait que les champs du schema (firstName/lastName/company/industry/goal) au lieu de tout l'objet user
FIX: Settings — invalidateUserProfileCache() maintenant appelé après sauvegarde pour synchroniser le dock
FIX: Settings — feedback visuel post-sauvegarde : bouton passe en vert "Modifications enregistrées" pendant 3s
FEATURE: Dock — bouton profil ouvre un panel rapide (avatar, nom, quota missions, plan, lien paramètres) au lieu de naviguer directement vers /settings
FIX: Budget Missions — dénominateur "/30" et barre de progression désormais dynamiques (Math.max(30, missionBudget)) pour gérer les bonus ambassadeur > 30
FIX: AvatarCropper — modale ne se fermait pas si toBlob() retournait null (fenêtre bloquée après clic Valider)
FIX: Bucket Supabase Storage avatars — fallback corrigé de "avatars" vers "Avatars" (cause racine du bug upload)
FEATURE: Avatar utilisateur affiché dans le dock dashboard (bouton Paramètres)
FEATURE: Avatar utilisateur affiché dans les bulles chat du KaelPanel
FEATURE: Hook useUserProfile avec cache partagé et invalidation post-upload
CHORE: invalidateUserProfileCache() appelé après upload/delete avatar dans settings
FEATURE: Capture cookie referral_code au signup pour écrire referredById sur le nouvel utilisateur
FEATURE: Écriture ReferralLog SIGNUP dès la création du compte avec ambassadorId
FEATURE: Trigger ACTIVATED idempotent à la première PoleSession — crédit +5 missions ambassadeur
FEATURE: API GET /api/user/referral enrichie avec stats complètes (signupsCount, activatedCount, totalMissions, historique)
FEATURE: Settings tab Ambassadeur — stats dynamiques temps réel (3 cards + historique des récompenses)
FEATURE: Settings tab Abonnement — affichage dynamique du plan (FREE/PRO)
FEATURE: Ajout enum Plan (FREE/PRO) + champ plan sur User + champ ambassadorId sur ReferralLog (migration Supabase)
CHORE: Ajout plan dans SessionUser interface (src/lib/auth.ts)

## [0.3.0] - 2026-03-04

### Added
- **Identity & Profiling System**:
  - **Avatar Cropper**: Built a native HTML5 Canvas-based circular cropping tool (`AvatarCropper.tsx`) for high-fidelity user profile photos. 
  - **Storage Integration**: Seamless binary upload via `@supabase/storage-js` with dedicated `/api/user/avatar` endpoints (POST/DELETE).
  - **Settings Integration**: Live avatar editing, previewing, and standard `initials` fallback in `settings/page.tsx`.
- **Ambassador & Referral Engine**:
  - **Dynamic OpenGraph**: Implementation of `/api/og/invite` to generate branded, personified social sharing images for referrers via Next.js `ImageResponse`.
  - **Referral Tracking**: Cookie-based attribution system in `/invite/[code]` with transparent redirection and referral persistence.
  - **Public Referral API**: Created `/api/user/referral` to manage custom slugs (e.g., `k3rn.labs/invite/MonSuperCode`) and track invitation counts.
- **Expert Recommendation Engine**:
  - Integrated a dynamic "Top Experts" slot in the workspace header, filtering experts by their `activePriorityLabs` against the project's `currentLab`.
  - Added shadcn/ui **Tooltip** provider for premium hover feedback on recommended expert avatars.
- **Social Story Factory (Instagram Stories)**:
  - **Deterministic Rendering**: Implemented a Satori-based rendering pipeline via `@vercel/og` for 1080x1920 PNG generation.
  - **Internal Builder**: Created `/stories` route with live preview, safe-zone overlays, and template property editor.
  - **Standard Templates**: V1 includes **Quote**, **Announcement**, and **Checklist** templates optimized for k3rn labs branding.
  - **FIX**: Resolved `ReferenceError: React is not defined` in `templates/index.ts` by adding missing import.

### Refactored & Rebranded
- **The "Sky" Project (Zara Rebranding)**:
  - Global transition of the Marketing manager from "Zara" to **"Sky"**.
  - Updated mapping logic in `floating-chat-window`, `SlideUpPanel`, and `pole-manager-chat`.
  - Re-mapped `getManagerGreeting` responses and initials generation (`SK` instead of `ZA`).
- **Ambassador Shift**: Migrated the legacy "Invitation" concept to a premium **Programme Ambassadeur**, with Nova as the program's dedicated orchestrator.
- **Kael Protocol**: Standardized Kael's role as **"Assistant"** (Assistant stratégique personnel) across all UI layers and system prompts. Removed "Intelligence Centrale" suffix.
- **Role Consistency**: Updated `MANAGERS` configuration and `POLE_CONFIG` to synchronize expert names and roles ("NAME - Role") across the Dock and Workspace.

### Fixed & Polished
- **Infrastructure & Build**:
  - **Favicon Fix**: Resolved 500 Internal Server Errors caused by legacy favicon formats; implemented native `icon.svg` support in Next.js.
  - **Vercel Build Stability**: Implemented lazy initialization for Supabase admin clients via Proxy to prevent build-time `environment variable` errors.
  - **CSS Optimization**: Integrated `critters` for improved FCP (First Contentful Paint).
- **Workspace UI Polish**:
  - **Expert Avatars**: Ported high-res `.webp` portraits from `docs/experts/` to `public/images/experts/`.
  - **Dock Calibration**: Refined hover zoom to `scale-110` (from `scale-125`) to eliminate visual clipping of expert portraits.
  - **Glow Effects**: Normalized unread status borders/glows using consistent HSL tokens for Kael.
- **Copywriting**: Finalized the semantic purge of technical jargon ("Quota Cognitif" → "Budget Missions").

---

## [0.2.0] - 2026-03-03

### Added/Changed
- **Conversational Modal Wizard**: The Application Modal is now a 4-step conversational journey guided by **Kael**:
  1.  **Profil & Rôle**: Capture of identity and role using smart suggestion chips.
  2.  **Urgence & Obstacles**: Qualification of project urgency (1-5 scale) and main technical/business blocks.
  3.  **Expertise & Intérêt**: Matching with a dedicated expert and identifying the most attractive value proposition.
  4.  **Ambition & Source**: Final motivation filter and acquisition source tracking.
- **Workspace Expert Avatars**: Integrated professional profile photos for all experts across the workspace:
  - **Dock**: Replaced text initials with circular avatars and liquid hover effects.
  - **Panels**: Headers and message bubbles now show the expert's face.
  - **KAEL Panel**: Kael's profile photo integrated into the permanent side panel and collapsed state.
  - **Mobile**: Consistent avatar application in the mobile orchestrator selection row and chat.
- **Alpha Application Modal (Conversational Redesign)**: Transformed the modal into a multi-step conversation with **KAEL**, featuring:
  - **KAEL Avatar**: Integrated Kael's profile for a more humanized application experience.
  - **Smart Chips**: Selection suggestions for roles, pain points, experts, and discovery sources.
  - **Rating Scales**: 1-5 urgency scale for quantified project qualification.
  - **Dynamic State**: Specialized fields for `urgency` and `selectedExpert` added to state.
  - **UX Refinement**: Simplified technical language to be inclusive of non-technical founders.
- **Typography & Font Harmonization**: Standardized **Plus Jakarta Sans** for all metadata, labels, and tags across the landing page, replacing technical `font-mono` and `font-serif` with a cleaner, premium aesthetic.
- **Landing Page Header Nav**: Added a full navigation system (Experts, Méthode, Vision, Offre) with a mobile menu orchestrator.
- **Login Navigation**: Updated the "Log in" button to a direct link to `/auth/login` for better UX.
- **Unified CTA Strategy**: All landing page buttons (Hero, Header, Pricing, Sticky Modal) now trigger the central application logic.
- **Refined Experts Carousel Animation**: Implementation of a dynamic "ping-pong" scroll. Content moves slowly to the left after a 1.5s initial delay, then returns faster to the starting position once the end is reached.
- **Licence Alpha Offer Section**: Integrated a premium "Licence Alpha" pricing card into the landing page, highlighting the 30-mission freemium model and "Sur sélection" exclusivity.
- **Sticky CTA Modal**: Added a floating, sticky CTA modal at the bottom right of the landing page featuring KAEL's avatar, matching the pricing card aesthetics, and scrolling smoothly to the offer section on click.
- **Automated Mission Budget**: Zero-friction billing system. Budget (30 units) auto-decrements on dossier creation or expert session start.
- **Floating Workspace Info**: Bottom-left panel for dossier global score and lab progress overview.
- **Header Auth Integration**: Updated "Log in" buttons (Desktop/Mobile) to redirect to `/auth/login`, establishing a clear path for returning users.
- **Typography Overhaul**: Removed all legacy technical fonts (`Space Grotesk`, `font-mono`, `font-serif`) globally, replacing them with a unified system of **Plus Jakarta Sans** and **Inter**.
- **Expert Asset Synchronization**: Manually synchronized high-resolution expert profile photos from `docs/experts/` to `public/images/experts/` for production consistency.
- **Database Layer Alignment**: Fixed a discrepancy in the custom `DbClient` where the `Mission` model was missing.
- **API & UI Type Fixes**: 
  - Corrected Zod record validation for user preferences.
  - Fixed `ChatInput` prop types to allow functional state updates for voice-to-text integration.
### Security & Infrastructure
- **Security Hardening**: Centralized n8n webhook URLs in environment variables.
- **API Protection**: Secured ingestion routes with `X-N8N-Secret` header validation.
- **Documentation**: Added `SECURITY.md` covering security architecture and practices.
- **Git Hygiene**: Enhanced `.gitignore` to prevent leakage of AI/agent artifacts.
### Refactored
- **Landing Page Avatar Updates**: Updated KAEL's avatar to a refined portrait without gamified UI dots, and introduced Marcus, Nova, and Kai (updated) into their dedicated spots within the horizontal scrolling 7-experts carousel.
- **Offer Section Copywriting**: Emphasized "Une équipe de 7. Pour le prix de zéro." to contrast the high value provided by the 7 experts against the freemium cost of closed beta access.
- **Settings Harmonic Redesign**: Visual stabilization using 3 font sizes max, font-jakarta titles, font-sans (Inter) body, and 70% opacity labels.
- **Human-Centric Terminology**: Replaced "Quota Cognitif" and "Crédits" with **"Budget Missions"** across settings and navigation.
- **Workspace UI Cleanup**: Removed left sidebar to maximize canvas space; moved all controls and MiniMap to bottom-right alignment.
- **Settings Visual Purge**: Removed background grid, alpha stage badges, and complex version strings for a minimalist premium aesthetic.
### Fixed
- **GET /favicon.ico 500**: Resolved internal server error caused by invalid SVG-disguised-as-ICO files. Implemented proper `src/app/icon.svg` configuration.
- **Settings Performance**: Fixed infinite loader by handling direct user object response and added null guards for `firstName`.
- **Logo Scaling**: Added `xs` (20px) support to `Logo.tsx` to prevent oversized header indicators.
- **Migration Stability**: Updated `prisma.config.ts` with direct connection support for Supabase/Prisma 7 operations.

---

## [0.1.0] - 2026-03-02
### Added
- Minimap command toggle in Dock settings (interface tab) with dark sleek glassmorphism styling.
- Notification pastille for unread messages (replaces active dot).
- Next-gen "glass ping" sound design for UI notifications using Web Audio API (lowpass filter sweep + transients).
### Fixed
- Re-enabled proper Next.js compilation after hot-reloading crash.
- Fixed React Flow Minimap defaulting to white vertical rectangle on right pane.
FEATURE: Notifications sonores — son futuriste Web Audio API (sine+triangle pad), toggle on/off persisté localStorage, badge unread rouge animé sur boutons Dock
FEATURE: Dock glass liquid — hub central premium avec command palette (⌘K), groupes utilitaires/experts séparés, shimmer layer + edge glow primary
FEATURE: SlideUpPanel — remplace KaelPanel droit + ChatTray flottant, panels KAEL/Expert slide-up au-dessus du Dock, glass liquid, backdrop blur
FEATURE: MobileOrchestrator — surface mobile chat-first KAEL, quick actions, experts row collapsible, input optimisé touch
REFACTOR: Dock — suppression search/filter inline, tout migré vers CommandPalette modale (slide-in-from-bottom)
REFACTOR: Workspace page — suppression KaelPanel + ExpertPanelManager, intégration SlideUpPanel + responsive md/mobile split
REFACTOR: WorkspaceSidebar — refonte visuelle glass dark, typo épurée, couleurs white/XX cohérentes avec workspace

CHORE: Add favicon to app/ directory for Next.js auto-detection + enrich icons metadata (SVG + Apple touch)
REFACTOR: Full landing redesign — bg #060608 unifié, ambient orbs hero, glassmorphism graph mockup, typographie font-jakarta, sections avec depth (border white/6), CTA final avec ambient glow, footer minimaliste
REFACTOR: Header landing — glass liquid effect (backdrop-blur, border white/8, shimmer layer, left-edge glow), pill nav avec bouton Early Access solid white, logo size lg
FEATURE: Add section incubateur/communauté — financement communautaire, collaboration inter-projets, lancement & optimisation continue
REFACTOR: Rewrite landing page copy — promesse "idée → multinationale" au lieu de "système cognitif", hero, sous-titre, steps, KAEL block, CTA
REFACTOR: Redesign section "7 Pôles" en scrollable horizontal — KAEL sticky à gauche, 7 manager cards défilantes, cards compactes (w-52, min-h-340px)
FIX: Update KAEL description on landing page — "Copilote" → "Assistant stratégique personnel", label "Orchestrateur Central" → "Intelligence Centrale", tu→vous, fix typo "tese"
FEATURE: Refonte section "7 Pôles" landing page — vrais managers AXEL/MAYA/KAI/ELENA/ZARA/MARCUS/NOVA avec avatar placeholder (initiale colorée), titre, description, hashtags, grille 4 colonnes responsive
FEATURE: Add copy button (hover) on every chat message in onboarding — clipboard copy with 1.5s check feedback
FEATURE: Add retry button (hover) on KAEL messages — DELETE last exchange then re-send same user input for a fresh response
FIX: KAEL stops after weak-acceptance without asking next aspect — prompt now enforces question on next aspect after every confirmation (strong or weak)
FIX: stateReminder now lists remaining aspects and explicitly mandates question on next aspect in scope
FEATURE: Add KaelQuestionWizard — paginated multi-question modal with per-question single/multi-select and progress bar
FEATURE: Extend KAELResponse and ChatMessage with questions[] field for guided questionnaire blocks
FEATURE: Update invokeChefDeProjet prompt to generate questions[] when multiple aspects need collection
FEATURE: Update onboarding route to propagate questions[] to ChatMessage (priority over flat choices)

FEATURE: Tags libres couleur sur les dossiers — badge coloré sur chaque carte, popover d'édition inline, palette 8 couleurs, stocké en DB (tags String[])
FEATURE: HomeDock flottant sur la page Home — filtres par tag/statut/lab + bouton nouveau dossier, style Apple dock
FIX: Avertissement nom dupliqué dans le dialog de création de dossier (bandeau ambre, sans blocage)
FIX: Variabilité réponses KAEL — temperature 0.3 dans callLLMProxy (n8n.ts), invokeChefDeProjet (claude.ts) et workflow n8n LLMProxy (Validate + Call OpenAI)
FIX: Bouton retour workspace redirige vers /home au lieu de / (landing page)
FIX: KAEL s'arrête après acquittement — ajout règle "jamais terminer sans question si aspects manquants", exemple concret dans prompt
FIX: KAEL choices sans question — choices conditionnels (prompt + guard serveur), omis si message est acquittement/transition sans "?"
FIX: KaelInlineChoices display bug — add prompt rule forbidding question text inside choices array (labels only, 2-5 words max)
FEATURE: KaelInlineChoices multi-select — checkbox accumulation mode with Valider (N) button, auto "Tout cela" option when 3+ choices
FIX: KAEL challenge prompt — une seule dimension par message, choices cohérentes avec la question posée, max 20 mots par question
FEATURE: OnboardingProgress badge ambre pour aspects weak — bar segment et label en amber-400, tooltip "à affiner"
REFACTOR: Redesign invokeChefDeProjet system prompt — KAEL becomes YC-associate mode with dual role (natural assistant + silent extractor), solidarity criteria, challenge flow capped at 2, and dynamic JSON example reflecting actual state
FEATURE: Add aspectQuality and challengeCount fields to KAELResponse interface
FEATURE: Add confirmedQualities and challengeCounts to invokeChefDeProjet stateContext parameter
FIX: Add guard capping challengeCount values at 2 in invokeChefDeProjet response parsing

REFACTOR: Pass confirmedQualities and challengeCounts from existingState to invokeChefDeProjet stateContext in onboarding POST route
REFACTOR: Forward aspectQuality and challengeCount from aiResponse into applyLLMResponse call in onboarding POST route

REFACTOR: applyLLMResponse now LLM-driven — accepts llmQuality and llmChallengeCount params, replaces server-side heuristic auto-confirm with guard at 2 challenges (weak force-confirm)
FEATURE: toDTO exposes aspectQuality field in OnboardingStateDTO so UI can render weak/strong badge

FIX: KAEL no longer re-asks confirmed aspects — added end-of-prompt state reminder with recency weight and fixed confirmedAspects JSON example to reflect actual confirmed list
FEATURE: OnboardingProgress bar fades in after first KAEL message load (300ms delay, premium entrance)
FEATURE: OnboardingProgress bar animates a scanning shimmer dot across segments while KAEL is thinking
FIX: Strip choices from history messages on each POST — inline choices no longer persist after user replies
FIX: Move OnboardingProgress to header (sticky) — no longer scrolls out of view during conversation
FIX: Replace scrollable KAEL badge+progress block in chat with compact "KAEL" pill in header right slot
FIX: Raise onboarding message max length from 4000 to 10000 — long project descriptions were rejected by Zod
FIX: Add maxLength={10000} to onboarding Textarea — browser enforces same limit as server schema
FIX: Display Zod field details in onboarding error messages — easier debugging of future validation failures
FIX: Add console.error in validateBody on Zod failure — logs field errors in Vercel/server logs
CHORE: Create CLAUDE.md at project root — architecture rules, MCP servers, critical files index
CHORE: Add .claude/rules/onboarding-ux.md — onboarding patterns, layout rules, known bugs
FIX: Add "binary" to fileContextSchema kind enum — prevents Zod validation error on POST
FIX: Filter binary files client-side before POST — binary files have no content/dataUrl for LLM
FIX: Move interim voice transcript above input row — no longer pushes buttons off-screen
FIX: Add max-h-[200px] + overflow-y-auto to onboarding textarea — prevents unlimited vertical growth
FIX: useAutoResize hook respects CSS maxHeight — textarea height capped at computed max

FIX: Floating chat windows use explicit bg-[#111111] — no more white background on dark theme
FIX: Chat message bubbles use bg-white/8 — no dependency on bg-muted CSS variable
FIX: Chat input zone uses bg-white/5 and border-white/10 — fully dark regardless of theme
FIX: Auto-minimize limit reduced from 3 to 2 — prevents chat windows from overflowing screen width
FIX: Chat window width reduced from 360px to 320px — better fit with 2-up layout
FIX: Chat windows bottom offset raised to bottom-[108px] — no overlap with Dock (bottom-6 + 72px height)
FIX: Minimized chat tabs repositioned to bottom-[108px] and displayed in horizontal row (flex-row-reverse)
FIX: KaelPanel collapsed state uses bg-[#0a0a0a] — eliminates white strip on dark theme
FIX: KaelPanel open state uses bg-[#0f0f0f] instead of bg-background/90 — consistent dark background
FEATURE: Workspace loading screen uses animated spinning logo instead of ✦ star icon
FEATURE: Dossier redirect loading screen uses animated spinning logo instead of ✦ star icon

## 2026-03-01

FIX: Dock z-index raised to z-60 — always accessible above floating chat windows
FIX: Chat windows anchored to bottom-[72px] — no longer overlap the Dock
FIX: Minimized chat tabs repositioned to bottom-[140px] z-40 — no collision with MiniMap or KaelPanel
FIX: MiniMap repositioned to top-4 right-4 — out of floating-layer zone
FEATURE: FIFO auto-minimize for chat windows — oldest expanded window minimizes when 4th is opened (max 3 visible)
REFACTOR: Dock KAEL button unified — always toggles KaelPanel permanent (no duplicate floating KAEL window)
FIX: Add onboarding gate in WorkspacePage — redirect to onboarding if step !== COMPLETE
FEATURE: Add GET /api/status/worker endpoint — reports CardIngestionJob counts (pending/running/stale/failed)
REFACTOR: Link ExpertSession to PoleSession via optional poleSessionId FK in Prisma schema
FIX: Add postinstall script to force deterministic prisma generate on Vercel CI (fixes CardState not exported from @prisma/client)
FIX: Remove duplicate CardState enum declaration in prisma/schema.prisma (lines 455-459)
CHORE: Delete orphaned floating-dock.tsx component (replaced by Dock.tsx, zero imports)
CHORE: Add .env and .env.* to .gitignore and remove .env from git tracking

---

## 2026-03-01

FIX: onboarding — Prevent UI race condition showing completion banner simultaneously with unanswered question by deferring step=COMPLETE on server when hasPendingChoices
FIX: applyLLMResponse — server-side auto-confirmation of currentQuestion when user gives substantive answer (>= 8 chars, not "je sais pas")
FIX: KAEL onboarding reasoning — LLM stateBlock now shows confirmed aspect VALUES so KAEL never re-poses an already-answered question
FIX: invokeChefDeProjet — mandatory acknowledgement rule + stronger progression rules added to system prompt
REFACTOR: invokeChefDeProjet — stateContext now includes confirmedValues map for richer LLM context
FEATURE: Implement Outbox Ingestion System — CardIngestionJob table (PENDING/RUNNING/DONE/FAILED, retries, backoff)
FEATURE: Create ingestion-worker.ts standalone worker (poll loop, exponential backoff, stale-job recovery, JSON logs)
CHORE: Register cardIngestionJob and cardIngestionLog models in DbClient
CHORE: Add 'worker' npm script for running the ingestion worker via tsx
FEATURE: Implement Chat-to-Graph pipeline for automatic background ingestion of expert chat messages
FEATURE: Create Realtime 'graph' channel to broadcast GRAPH_UPDATED events and sync client-side canvas
FEATURE: Add INGESTION_ENABLED kill-switch and AuditLog tracing for the card ingestion lifecycle

FIX: Restaure fetch() dans les 4 Code nodes GuichetUnique — ni fetch ni $helpers.httpRequest disponibles dans le task runner n8n (requiert N8N_RUNNERS_DISABLED=true)
FIX: TelegramGateway Send Reply lit depuis Extract Response au lieu de Upsert Pole Session (données chat_id/manager_message absentes du retour Supabase)
FIX: Upsert Pole Session continueOnFail=true + return=minimal + service key — l'absence d'id UUID bloquait l'envoi Telegram
FIX: Build Session Body génère un UUID v4 pour le champ id de PoleSession (colonne NOT NULL sans default Postgres)

FIX: Bouton retour onboarding utilise router.back() au lieu d'un redirect hardcodé vers le dossier

FEATURE: Add Actifs/Archivés tabs on dashboard to browse and restore archived dossiers
FIX: Fix ConfirmDeleteDialog footer overflow — buttons no longer escape modal bounds on narrow widths
FIX: Clear custom textarea content in KaelInlineChoices after sending (removes perceived latency/confusion)
FIX: KAEL no longer loops on same question when user says "je sais pas" — detects ignorance and offers choices immediately
FIX: Pass server-side state context (currentQuestion, confirmedAspects) to invokeChefDeProjet for deterministic LLM routing

FEATURE: Notifications & Autonomie supervisée (TICKET 8) — kael_tasks table (short_id 8-char, action_type, action_payload JSONB, scheduled_at, status, requires_validation), K3RN__DailyReport__v1 (cron 8h → rapport Supabase + LLMProxy → Telegram), K3RN__Scheduler__v1 (toutes les 5min → tâches dues → demande validation Telegram), GuichetUnique CONFIRME/ANNULE detection (regex → fetch kael_tasks → execute/cancel → bypass PoleRouter + Synthese), scheduling detection dans routing LLM (task_to_schedule → kael_tasks insert + confirmation message)
FEATURE: Add back button in onboarding page header to return to dossier workspace

FEATURE: Vector memory (TICKET 7) — pgvector + kael_embeddings table (HNSW index) + kael_semantic_search RPC, K3RN__Embedder__v1 (ID: UXriPTQpkD6QL9OJ, text-embedding-3-small), GuichetUnique updated: Load Memory ajoute semantic search 21j + briefing, KAEL+Tavily reçoit briefing dans contexte, KAEL Synthese stocke embeddings après chaque échange
FEATURE: KAEL GuichetUnique — single orchestrator entry point (TICKET 6) — rebuild K3RN__KAEL__GuichetUnique__v1 (8 nodes: Webhook→Config→Normalize Input→Load Memory→KAEL+Tavily→Call PoleRouter→KAEL Synthese→Respond), create kael_memory Supabase table, invokeN8nPole() always routes through GUICHET_URL with sync COMPLETED detection, TelegramGateway POLE_ROUTER_WEBHOOK→GuichetUnique
FEATURE: Centralize all LLM calls through n8n LLMProxy (TICKET 5) — create K3RN__LLMProxy__v1 (ID: yyQlNd4b2ERIRQHj), add callLLMProxy() to n8n.ts, remove OpenAI SDK from claude.ts (invokeExpert/getExpertInitialMessage/invokeExpertChat/invokeKAEL/invokeChefDeProjet), remove OPENAI_API_KEY from .env
FEATURE: Telegram Menu (TICKET 4) — /menu InlineKeyboard (Mes dossiers/Status/Reset), /dossiers liste cliquable, /status rapport budget+dossier, callback_query select_dossier → upsert telegram_state, CERVEAU KAEL étendu aux 6 nouvelles routes
CHORE: Supabase migration telegram_state (chat_id PK, active_dossier_id, updated_at) pour persistance sélection dossier
FIX: Reset Reply + Send Reply — ajouter resource+operation manquants (Telegram node)
FEATURE: Create K3RN__TelegramGateway__v1 (n8n ID: wtP6kvqw7ZU8NBLm) — Telegram text+voice → KAEL routing → PoleRouter → Supabase PoleSession persistence, 22 nodes, /reset + /menu commands, Whisper transcription

## 2026-02-28

CHORE: Create k3rn_idempotency + k3rn_task_budget tables in Supabase k3rn (circuit breaker operational)
CHORE: Delete orphan n8n workflows — My workflow 2 + TEST (unnamed/unroled)
CHORE: Rename KAEL_CoreEngine_v5 → [ARCHIVÉ] KAEL_CoreEngine_v5 in n8n
CHORE: Remove 24 STRYVR role nodes from K3RN__KAEL__GuichetUnique__v1 (CEO/DIRECTEUR/MANAGER/EMPLOYE) — 23 K3RN nodes remain

FEATURE: KaelInlineChoices — panel sombre numéroté (task chat style) attaché dans la bulle KAEL, navigation clavier 1–4/↑↓/Entrée, "Autre choix" inline
REFACTOR: Onboarding page — supprime KaelGuidedModal, choices inline dans la bulle, input toujours visible, premier contact libre sans choices
REFACTOR: OnboardingState (Étape C) — step enum FREE_INPUT/IN_PROGRESS/COMPLETE, migration v1→v2, isComplete dérivé serveur uniquement, STATE_SCHEMA_VERSION 2
FIX: invokeChefDeProjet — premier message analyse l'input réel (pas le nom du projet), reçoit currentStep pour comportement adapté
REFACTOR: Onboarding (Étape G) — bouton workspace uniquement si isComplete serveur, suppression du bouton "Passer cette étape" ambigu

FEATURE: Implement Memory Graph System (T1–T8) — Expert Identity from DB, n8n execution authority, CardRelation schema, Memory Graph API (POST/GET /api/cards, PATCH /api/cards/[id], relations CRUD), Chat→Card pipeline (save button in PoleManagerChat), GET /api/dossiers/[id]/graph, Canvas projection from graph DB, GET /api/cards/search with GIN full-text index
REFACTOR: src/app/api/labs/[lab]/experts/route.ts — replace EXPERTS_REGISTRY with prisma.expert.findMany (DB as source of truth)
REFACTOR: src/lib/n8n.ts — remove OpenAI fallback from invokeN8nPole, n8n is now exclusive execution authority
FEATURE: Supabase migration memory_graph_schema — CardType/CardSource/RelationType enums, Card extended (cardType, source, poleCode, dossierId nullable), CardRelation table
FEATURE: Supabase migration card_search_gin_index — GIN index on Card title+content for full-text search
REFACTOR: src/lib/db.ts — add CardRelation model, new relations (Card.outgoingRelations, Card.incomingRelations, Card.dossier, Dossier.cards), skip/offset support in findMany
REFACTOR: src/components/canvas/CanvasView.tsx — Canvas now projects graph from /api/dossiers/[id]/graph (not CanvasNode/CanvasEdge store)

FEATURE: Transform KAEL onboarding into guided "Task Chat" UX — KaelGuidedModal (src/components/kael/kael-guided-modal.tsx) avec choix numérotés, navigation clavier (1-4), "Répondre librement", backdrop dismiss
FEATURE: Create src/lib/onboarding-state.ts — state machine server-authoritative (problem → target → outcome → constraint), audit trail, stateSchemaVersion, migration v0→v1, toDTO()
FEATURE: Create src/lib/__tests__/onboarding-state.test.ts — 22 tests vitest couvrant les 6 invariants (isComplete, recommendedLab, currentQuestion, immuabilité, audit trail, sérialisation, toDTO)
FEATURE: Supabase migration — ADD COLUMN "onboardingState" JSONB sur table Dossier
FEATURE: Add GET /api/test endpoint (src/app/api/test/route.ts)
REFACTOR: src/app/api/dossiers/[id]/onboarding/route.ts — state persisté en DB via deserializeState + applyLLMResponse + toDTO, idempotent si COMPLETE
REFACTOR: src/app/dossiers/[id]/onboarding/page.tsx — consomme onboardingState depuis serveur (source unique de vérité), OnboardingProgress component, input masqué quand COMPLETE
REFACTOR: src/lib/claude.ts — importe ConfirmedAspect/VALID_LABS depuis onboarding-state.ts, prompt état machine strict (4 aspects ordonnés), guard safeValidateLab
FIX: src/app/globals.css — déplacer @keyframes kaelModalIn depuis styled-jsx (non disponible en App Router)
REFACTOR: Replace HTTP Request node with native LangChain nodes (lmChatOpenAi + chainLlm) in K3RN__PoleRouter__v1
FIX: Correct lmChatOpenAi typeVersion (1.3) and model parameter format ({mode:"id",value:"gpt-4o"})
FEATURE: Create n8n workflow K3RN__PoleRouter__v1 — webhook unique pour les 7 pôles (https://agent.k3rnlabs.com/webhook/k3rn-pole-router)
FEATURE: Seed 22 experts en base de données via prisma/seed.ts (idempotent)
FEATURE: Set n8nWebhookUrl + n8nWorkflowId sur les 7 pôles en DB
REFACTOR: src/app/api/experts/[expertId]/sessions/route.ts — lookup DB (findUnique) au lieu de EXPERTS_REGISTRY
REFACTOR: src/lib/permissions.ts — async, prisma.expert.findMany au lieu de EXPERTS_REGISTRY
FIX: src/app/api/dossiers/[id]/permissions/route.ts — await computePermissions()
FIX: src/lib/claude.ts — réduire max_tokens à 1024, timeout 28s, truncation fichiers à 8000 chars
FIX: src/app/dossiers/[id]/onboarding/page.tsx — timeout 30s, AbortSignal.timeout(15s) sur initOnboarding, try/catch
FIX: src/components/ui/markdown.tsx — null safety sur children

FEATURE: Initialize changelog system
