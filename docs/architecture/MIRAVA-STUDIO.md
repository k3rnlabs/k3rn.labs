# MIRAVA Studio — exploitation et déploiement

MIRAVA Studio est l’expérience de personal branding autonome servie par `/visual-engine`. K3RN, Supabase, Stripe et l’authentification restent des services d’infrastructure : ils ne sont jamais nommés dans l’interface MIRAVA Studio.

## Architecture et confidentialité

- Les analyses de direction, `masterPrompt`, `negativePrompt`, consentements et photos sources restent serveur uniquement. Aucun DTO public ne les contient.
- Les résultats sont lus via `/api/visual-engine/creations/:id/result`, après vérification de session et de propriété, avec `Cache-Control: private, no-store`.
- Le bucket `visual-engine-private` reste privé. La photo de référence est supprimée après son analyse; le Profil identité (trois à six photos, dont quatre recommandées) est conservé jusqu’à suppression par la personne ou suppression du compte. Les résultats restent jusqu’à suppression.
- Un `StudioProfile` conserve uniquement la direction interne d’une séance : il est réutilisable pour de nouvelles créations sans exposer le texte de direction. Les sept univers rapides sont Escapade solaire, Destination iconique, Beauty close-up, Éditorial mode, Night glamour, Futuristic muse et Lifestyle de créatrice.
- La PWA ne précache que `/visual-engine` et `/visual-engine/offline`. Elle ne cache ni API, ni média, ni URL de stockage, ni résultat, ni donnée de création.
- Les notifications push sont facultatives. Les clés navigateur sont chiffrées AES-256-GCM avant stockage ; le seul message envoyé est « Votre création est prête ».
- Les journaux d’audit ne conservent que l’action et l’identifiant technique de création. Ils excluent les images, prompts, analyses et consentements.

## Onboarding et guide caméra local

- Le Profil identité est une étape principale de l’onboarding MIRAVA. Il peut être créé avant toute séance; chaque nouvelle création le rattache automatiquement et ne le redemande pas tant qu’il contient les trois portraits requis.
- Après l’onboarding, une cliente peut ajouter une vue dans la limite de six sans remplacer son profil; l’action « Refaire » reste séparée et remplace l’ensemble après une nouvelle validation.
- Les prises requises sont face, 3/4 gauche et 3/4 droit. La vue cheveux naturels et les deux silhouettes face/3/4 sont facultatives. Compte permet de remplacer entièrement le profil ou de le supprimer immédiatement.
- La permission caméra est demandée après un écran explicatif. La capture utilise un écran `100dvh` sans défilement, respecte les zones sûres, propose capture automatique après stabilité, déclenchement manuel, revue Garder/Refaire et validation finale avant téléversement.
- `FaceLandmarker` et `PoseLandmarker` tournent dans un Web Worker. Les modèles TFLite et le runtime WASM sont servis depuis `/visual-engine/vision`; aucun CDN n’est utilisé à l’exécution.
- Le worker remplace `fetch` avant le chargement de MediaPipe et rejette toute origine différente de MIRAVA. Une CSP dédiée à `/visual-engine/:path*` impose aussi `connect-src 'self'`, `worker-src 'self' blob:` et limite caméra à l’origine courante.
- Les frames vidéo réduites, landmarks, angles et scores de qualité restent en mémoire locale et ne sont ni envoyés, ni stockés, ni journalisés. Seules les photos explicitement conservées sont téléversées après consentement 18+, droits et rétention.
- Sur appareil incompatible, le guide automatique se dégrade en capture manuelle et l’import classique reste disponible; le parcours ne devient pas un contrôle KYC ou de reconnaissance faciale.

### Import validé depuis la photothèque

**Contrat validé :** l’onboarding propose deux chemins équivalents, « Prendre mes photos » et « Choisir mes photos ». L’import accepte une sélection multiple de trois à six images et utilise le même moteur local que la caméra avant tout téléversement.

**État d’implémentation :** la photothèque est intégrée dans le plein écran Profil identité. Les imports directs des écrans de création ont été retirés afin que caméra et fichiers passent obligatoirement par ce récapitulatif validé.

- Le traitement local recherche une seule personne, contrôle netteté, exposition, homogénéité de lumière, cadrage et orientation, puis classe automatiquement les portraits en face, 3/4 gauche et 3/4 droit.
- Les vues cheveux et silhouettes ne sont classées qu’en enrichissements facultatifs. Elles ne peuvent jamais remplacer l’un des trois portraits requis.
- Un écran récapitulatif affiche les emplacements valides, les doublons et les vues manquantes. La personne peut corriger l’affectation ou remplacer uniquement une image refusée.
- Aucun fichier n’est envoyé tant que les trois vues requises, le consentement et la validation finale ne sont pas réunis. Les images rejetées, miniatures de travail, mesures et scores sont détruits localement à la fermeture.
- Si le moteur local n’est pas disponible, l’import automatique échoue explicitement et propose le parcours caméra ou une sélection guidée vue par vue; il ne valide jamais silencieusement les fichiers.

**Hypothèses non fonctionnelles :** analyse sur l’appareil, une seule image traitée à la fois pour borner la mémoire mobile, objectif de quelques secondes par photo sur un téléphone récent, aucune dépendance réseau supplémentaire et limite existante de 10 Mo par fichier.

**Décision :** le classement automatique après sélection multiple est retenu, avec correction manuelle par emplacement. Une sélection strictement vue par vue a été écartée comme parcours principal car elle ajoute de la friction; une acceptation sans classement a été écartée car elle ne garantit pas les trois angles indispensables.

## Exception IA assumée

MIRAVA Studio appelle OpenAI directement depuis le worker serveur. C’est une exception isolée : les workflows KAEL existants ne sont pas modifiés.

- Analyse : `MIRAVA_ANALYSIS_MODEL`, par défaut `gpt-5.6-sol`, vision et JSON structuré avec `store: false`.
- Direction créative Alma : `MIRAVA_CREATIVE_DIRECTOR_MODEL`, par défaut `gpt-5-mini`, conversation bilingue courte et réponses JSON structurées. Ce modèle est indépendant de l’analyse visuelle et ne reçoit jamais d’image, de prompt ou d’analyse interne.
- Image : `MIRAVA_IMAGE_MODEL`, par défaut `gpt-image-2`, édition haute fidélité à partir de trois à six photos d’identité.
- Le rendu est généré en vertical puis recadré au serveur en PNG 1024 × 1280 (4:5).
- Trois tentatives maximum sont réservées aux erreurs transitoires. Un refus de sécurité n’est jamais relancé ni compensé ; une panne technique finale crée un crédit de compensation permanent.
- Les images d’identité ne servent qu’à préserver le visage, la carnation, les traits distinctifs et les proportions naturelles. Le prompt serveur interdit explicitement de reprendre leur pose, regard, expression, cadrage, lumière, tenue, bijoux, maquillage ou coiffure.

## Série MIRAVA

Une création peut livrer une image signature ou une série de deux à six images. Une série reste une seule `StudioCreation` durable et possède plusieurs assets `RESULT`.

- Chaque image consomme un crédit. La réservation transactionnelle utilise `p_amount=1..6` selon le format validé.
- Le worker reprend une série au premier résultat manquant après une interruption ; il ne régénère pas les images déjà stockées.
- Chaque frame reçoit un rôle distinct : ouverture destination, moment vécu, signature intime, mouvement/échelle et conclusion. Pour une série de trois, l’arc utilise ouverture, moment vécu et conclusion.
- La continuité verrouille la même identité adulte, la même famille de destination, la même palette et le même traitement photographique.
- La variation interdit la répétition de pose, regard, expression, geste, cadrage, hauteur/angle caméra, activité, sous-lieu et lumière. Le résultat doit se lire comme un vrai séjour éditorial photographié dans le temps.
- Les résultats sont servis individuellement par la route authentifiée `result?index=0..5`. Le DTO public n’expose que les compteurs et ces routes contrôlées.
- En panne technique finale, seuls les résultats manquants sont compensés. Un refus de sécurité n’est ni relancé ni compensé.

## Crédits

- À l’activation : 3 créations offertes, permanentes.
- Abonnements mensuels : MIRAVA Studio 20 (49 € TTC), 60 (119 € TTC), 150 (249 € TTC). Les crédits non utilisés se reportent une seule période, avec un plafond égal au forfait mensuel.
- Recharges permanentes : 10 / 30 / 100 créations pour 29 / 79 / 199 € TTC.
- La réservation se fait au lancement de l’analyse. Le débit devient définitif lorsque la direction interne est enregistrée. Pour une nouvelle image depuis un StudioProfile déjà prêt, le crédit est réservé puis débité au lancement de la génération. La génération finale est incluse.
- Chaque lot est séparé en base ; les lots mensuels expirent, les recharges, l’activation, les migrations historiques et les compensations ne le font pas.

## Déploiement

1. Appliquer les migrations Visual Engine puis `202607290001_mirava_credit_lots.sql`, `202607290002_mirava_studio_security.sql` et `20260729150000_mirava_personal_studios.sql`. La dernière ajoute les studios personnels et profils identité, avec RLS et aucun accès navigateur direct.
2. Ajouter les variables MIRAVA de `.env.example` dans l’environnement de production. Générer les clés VAPID hors du navigateur, puis fournir la clé publique via `NEXT_PUBLIC_MIRAVA_PUSH_PUBLIC_KEY`; `MIRAVA_PUSH_ENCRYPTION_KEY` doit être une clé aléatoire de 32 octets encodée en base64.
3. Démarrer le worker durable : `pm2 start npm --name mirava-studio-worker -- run studio-worker`, puis `pm2 save`. Le worker récupère les jobs interrompus, purge les sources, expire les lots mensuels et envoie les notifications opt-in.
4. Déployer l’application et vérifier, depuis un autre compte, qu’un résultat, une création et les médias ne sont pas accessibles. Vérifier aussi `Cache-Control: private, no-store` sur la route de résultat.
5. Garder `MIRAVA_PUBLIC_LAUNCH_ENABLED=false` en production jusqu’à la validation de la marque, des consentements, du DPA OpenAI et de la politique de rétention. Le développement local reste ouvert pour les tests.

## Stripe

Créer les prix Stripe suivants en EUR, TVA incluse, puis placer leurs identifiants dans les variables d’environnement :

| Offre | Type | Prix TTC | Crédits | Variable |
|---|---:|---:|---:|---|
| MIRAVA Studio Esencia — 20 | Mensuel | 49 € | 20 | `STRIPE_PRICE_MIRAVA_20` |
| MIRAVA Studio Aura — 60 | Mensuel | 119 € | 60 | `STRIPE_PRICE_MIRAVA_60` |
| MIRAVA Studio Círculo — 150 | Mensuel | 249 € | 150 | `STRIPE_PRICE_MIRAVA_150` |
| Recarga Esencia — 10 | Paiement unique | 29 € | 10 | `STRIPE_PRICE_MIRAVA_10` |
| Recarga Aura — 30 | Paiement unique | 79 € | 30 | `STRIPE_PRICE_MIRAVA_30` |
| Recarga Casa — 100 | Paiement unique | 199 € | 100 | `STRIPE_PRICE_MIRAVA_100` |

Dans Stripe :

1. Activer Stripe Tax et définir le code fiscal approprié avec le conseil comptable.
2. Activer le Customer Portal pour la mise à jour de paiement et l’annulation des abonnements MIRAVA Studio.
3. Configurer le webhook `/api/billing/webhook` avec : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
4. Conserver le secret dans `STRIPE_WEBHOOK_SECRET`. Les événements sont idempotents par session Stripe ou début de période d’abonnement, avec `metadata.product=mirava_studio`.

Les produits historiques K3RN et leurs crédits ne sont jamais lus ni modifiés par ces routes.

## Go-live

L’ouverture publique reste bloquée tant que ne sont pas validés : marque et domaines, consentements et droits à l’image, politique de rétention, DPA OpenAI et informations réglementaires Stripe Tax. La configuration API standard d’OpenAI doit être expliquée dans les textes légaux si une rétention zéro n’est pas contractualisée.
