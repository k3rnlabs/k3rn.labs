# MIRAVA Studio — Mobile onboarding, identity capture and activation remediation

Date de vérification : 2026-08-02  
Périmètre : onboarding MIRAVA Studio V3, capture d’identité, création de la première séance, mobile iPhone.  
Contraintes respectées : aucun déploiement, aucun commit, aucune donnée cliente ou production modifiée.

## 1. Résumé exécutif

L’ancien parcours de huit écrans a été remplacé par six séquences stables. Le shell mobile utilise désormais une seule région scrollable entre un header/progress et un rail d’action persistant. L’activation n’est plus déduite d’un compteur : elle nécessite une intention, une direction, un profil possédé contenant au moins trois photos, une vraie `StudioCreation` possédée et liée au profil, puis une confirmation d’activation.

Les 193 tests, le typecheck et le build passent. La revue navigateur locale couvre les quatre viewports demandés, le clavier réduit, le paysage et un agrandissement de texte à 200 %. En revanche, aucune session cliente locale sûre n’était disponible : le parcours authentifié avec vraies écritures, la caméra d’un iPhone physique et la reprise après rafraîchissement sur une base isolée n’ont pas pu être démontrés sans enfreindre l’interdiction de modifier des données réelles. Le verdict reste donc conservateur.

Skill réellement utilisé : `agent-browser`, pour les captures, mesures de viewport, contrôle des débordements et console. Les autres skills nommés dans la demande n’étaient pas disponibles et n’ont pas été simulés.

## 2. État initial

Observations confirmées dans le code et les captures fournies : huit positions numériques, documents entiers très longs, CTA en fin de page, galerie verticale, narration redondante, concaténation fragile, fin `completed` avant identité, et caméra visuellement masquée par un voile noir très fort.

La capture existante n’était pas factice : elle possédait déjà un worker MediaPipe local, des règles de centrage, angle, lumière et flou, trois vues requises et trois vues facultatives. La divergence était principalement l’intégration mobile, l’opacité du masque, le moment du consentement et le branchement d’activation.

## 3. Captures avant

Preuves fournies par l’utilisateur : `IMG_0679.PNG` à `IMG_0690.PNG` dans `/Users/user/Downloads/`. Elles couvrent les huit séquences, les longues pages, le saut 6 → 8 et la caméra sombre.

Preuve locale supplémentaire : [entrée protégée 390×844](mirava-mobile-onboarding-identity-activation/before/390x844-entry.png). Sans session, la route Studio redirige correctement vers le login ; cette preuve explique aussi la limite du test authentifié.

## 4. Machine d’état initiale

| Index | ID initial | Écriture principale | Transition |
|---:|---|---|---|
| 0 | `welcome_name` | prénom | `promise` |
| 1 | `promise` | aucune | `how_it_works` |
| 2 | `how_it_works` | aucune | `universes` |
| 3 | `universes` | `universeIds` | `goal` |
| 4 | `goal` | `goal` | `creative_direction` |
| 5 | `creative_direction` | direction dérivée | `identity_control` |
| 6 | `identity_control` | intention identité | `studio_ready` |
| 7 | `studio_ready` | `status=completed` | Studio |

L’état V2 reposait sur `step: number`, `status: in_progress|completed` et `completedAt`. Une valeur `completed` ne prouvait ni profil identité ni séance.

## 5. Cause de la séquence manquante

La route n’était pas absente. La « séquence 7 » correspondait à l’index 6 (`identity_control`). Son action persistait immédiatement l’index 7 ; elle devenait donc un écran transitoire facilement sauté, tandis que l’UI affichait des numéros humains 6 puis 8. Le compteur numérique et l’auto-transition donnaient l’impression d’une route manquante. La correction est structurelle : IDs stables V3 et six phases réelles, pas un ajustement du compteur.

## 6. Activation retenue

Activation minimale implémentée :

1. `goal` enregistré ;
2. univers et `direction` enregistrés ;
3. consentement identité daté avant caméra/photothèque ;
4. `StudioIdentityProfile` possédé avec au moins trois assets ;
5. `StudioCreation` possédée, liée au même profil et conservée dans `firstSessionId` ;
6. action explicite `activate`, avec nouvelle vérification profil/séance.

`isMiravaOnboardingCompleted` exige `status=activated`, `activatedAt` et `firstSessionId`. `session_ready` ne suffit pas. L’activation cible jusqu’au premier résultat reste hors preuve réelle ; le CTA ouvre toutefois la vraie première séance, voie directe vers la génération existante.

## 7. Flow cible

| # | ID V3 | Responsabilité | Sortie |
|---:|---|---|---|
| 1 | `promise_name` | promesse + prénom | prénom sauvegardé |
| 2 | `objective` | objectif unique | objectif, auto-avance 360 ms réversible |
| 3 | `visual_universes` | 1 à 3 univers | sélection persistée |
| 4 | `direction_review` | synthèse explicite | direction confirmée |
| 5 | `identity_permission` | confiance + consentement | accord daté, puis permission à la demande |
| 6 | `capture_activation` | capture, profil, séance, activation | première séance ouvrable |

## 8. Architecture mobile

`100dvh` fixe la coque. La grille utilise `auto auto minmax(0,1fr) auto`, une colonne `minmax(0,1fr)` et `overflow:hidden`. Seul `.mirava-onboarding-v3-scroll` défile. Le rail reste dans la dernière ligne. Les petits écrans réduisent collage, cartes et espacements sans créer un second scroll.

## 9. Safe areas

Le header ajoute `env(safe-area-inset-top)`. Les actions ajoutent `env(safe-area-inset-bottom)`. Les marges latérales utilisent les insets gauche/droit. `viewportFit: cover` existait déjà dans les métadonnées et a été conservé. La vérification navigateur sans encoche confirme la géométrie ; l’encoche/Dynamic Island réelle reste à confirmer sur matériel iOS.

## 10. Navigation

Retour utilise l’ID précédent dans `MIRAVA_ONBOARDING_STEPS`, conserve les réponses locales/persistées et n’éjecte pas du parcours. À 375 px, son libellé visuel est compacté en icône avec `aria-label`, afin de laisser l’action principale respirer et de rester robuste au zoom. Les panneaux reçoivent le focus à chaque changement.

## 11. Wording

La phrase incorrecte construite par concaténation a disparu. La restitution utilise des champs séparés : objectif, direction dominante, première séance, formats et raison. FR et ES ont des libellés/formats dédiés. Aucun écran ne dit « Studio prêt » avant activation ; les états exacts sont « Profil Identité », « première séance prête » et « ouvrir ma première séance ».

## 12. Sélection de l’objectif

Trois choix exclusifs annoncent leur conséquence réelle. `aria-pressed`, coche et bordure renforcée donnent un feedback non exclusivement colorimétrique. Une auto-avance de 360 ms suit la sélection, reste annulable par une nouvelle sélection et le retour conserve la donnée.

## 13. Sélection des univers

La galerie devient une grille compacte à deux colonnes sur mobile et trois sur écran plus large. Chaque carte présente image, attributs, nom, coche et `aria-pressed`. Le compteur 0–3 est visible. Une quatrième sélection produit une explication au lieu d’être ignorée silencieusement.

## 14. Restitution

La synthèse associe réellement objectif, univers dominant, type de séance et formats. Les boutons « Modifier l’objectif » et « Modifier les univers » retournent au bon écran sans effacer les autres décisions.

## 15. Confiance et confidentialité

Avant tout accès caméra ou galerie, l’utilisateur voit : trois vues essentielles, environ deux minutes, analyse de cadrage locale, stockage privé des photos validées, remplacement/suppression, et traitement OpenAI uniquement lors d’une création demandée. Aucune promesse de non-rétention contraire à la politique existante n’est formulée.

## 16. Permission caméra

`getUserMedia` n’est appelé qu’après le CTA et un consentement coché. Les états demandé, accordé et refusé sont instrumentés. En cas de refus/indisponibilité, le message explique les réglages et la photothèque reste disponible ; il n’y a pas de dead end logique.

## 17. Capture guidée

Le produit conserve six vues maximum : face, trois-quarts gauche, trois-quarts droit obligatoires ; cheveux, silhouette face et silhouette angle facultatifs. Le worker local valide visage/pose, centrage, distance, angle, lumière, homogénéité et flou. Le shell affiche progression, consigne, masque, statut live, récapitulatif, annulation et déclencheur. Le masque extérieur passe de 85 % à 42 % d’opacité et le dégradé bas de 62 % à 42 %.

## 18. Validation photo

Chaque capture passe par un aperçu avec Refaire/Garder. Les imports sont analysés localement, classés par vue, dédupliqués et rejetés avec une raison sans envoi. Le récapitulatif permet de réparer uniquement les vues obligatoires manquantes. Trois vues validées sont requises pour créer le profil.

## 19. Persistance

Le prénom, objectif, univers, direction, consentement daté, `currentStep`, statut et `firstSessionId` sont persistés. Les photos validées restent gérées par l’API de profil existante. Si un profil de trois photos existe déjà à la reprise, le client prépare la séance sans imposer une nouvelle capture. Les IDs stables remplacent la dépendance à un index.

Limite : aucune campagne réelle interruption → rafraîchissement → reprise n’a été exécutée contre une base isolée dans cette session.

## 20. Migration de l’ancien flow

Les états V2 sont lus et mappés vers le premier prérequis V3 réellement incomplet. Un ancien `completed` n’est jamais accepté comme activation. Objectif et univers valides sont conservés ; la direction est reconstruite lorsque possible. L’utilisateur reprend au plus tard à `identity_permission` tant qu’aucune activation V3 prouvée n’existe.

## 21. Création de la première séance

Après l’écriture du profil, le client appelle la route réelle `/api/visual-engine/creations` avec le preset dominant, une création, l’objectif dans les options et les consentements réellement reçus. La route onboarding `session_ready` vérifie ensuite propriété, nombre d’assets et lien `identityProfileId`. L’écran final n’est rendu prêt qu’après cette réponse.

Limite critique de preuve : ce chemin n’a pas été exécuté avec une session authentifiée et une base de test isolée ; seules les frontières automatisées et le code de production ont été vérifiés.

## 22. Analytics

Événements ajoutés/utilisés : `onboarding_started`, `onboarding_resumed`, `onboarding_step_viewed`, `name_saved`, `objective_selected`, `universe_selected`, `direction_confirmed`, `identity_explanation_viewed`, `camera_permission_requested|granted|denied`, `identity_capture_started`, `identity_photo_captured|rejected|validated`, `identity_profile_completed`, `first_session_created|opened`, `onboarding_activated`.

Propriétés autorisées : version, ID d’étape, objectif, ID d’univers, booléen sélectionné, ID logique de vue, raison générique, nombre de photos. Interdits : prénom, photo, filename, biométrie, contenu d’image, URL privée, identifiant de profil ou de création.

## 23. Fichiers modifiés

Lot onboarding principal :

- `src/lib/mirava/onboarding.ts`
- `src/app/api/visual-engine/onboarding/route.ts`
- `src/app/api/visual-engine/onboarding/route.test.ts`
- `src/components/studio/mirava-studio-onboarding.tsx`
- `src/components/studio/mirava-studio-onboarding.test.ts`
- `src/components/studio/mirava-identity-capture.tsx`
- `src/components/studio/mirava-identity-capture.test.ts`
- `src/components/studio/visual-engine-studio.tsx`
- `src/components/studio/visual-engine-studio.test.ts`
- `src/lib/mirava/onboarding.test.ts`
- `src/styles/mirava.css`
- ce rapport et les preuves PNG.

Le worktree contient aussi des changements parallèles/préexistants dans d’autres fichiers MIRAVA et K3RN. Ils ont été préservés et ne sont pas attribués à ce lot.

## 24. Tests

Commande finale : `npx vitest run`. Résultat : **42 fichiers, 193 tests passés**. Les tests couvrent API, propriété, profil incomplet, refus de saut vers la capture, conservation d’une séance déjà préparée pendant la navigation, activation, ancien flow, consentements, capture et contrats UI.

## 25. Scénarios navigateur

| Scénario | Résultat | Niveau de preuve |
|---|---|---|
| Six écrans clés | PASS visuel | navigateur local, harness sans donnée |
| Utilisateur pressé | PASS visuel | CTA/disabled/sélection immédiatement lisibles |
| Utilisateur hésitant | PASS automatisé | sélection/désélection/retour et limite testés par contrat |
| Permission refusée | PARTIEL | branche et alternative inspectées/testées, pas de refus matériel |
| Faible lumière | PARTIEL | détection réelle existante, pas de caméra physique dans cette session |
| Reprise | PARTIEL | état/API testés, pas de rafraîchissement avec DB isolée |
| Ancien état | PASS automatisé | migration V2 → V3 |
| Parcours authentifié complet | NON EXÉCUTÉ | aucune session/base de test sûre disponible |

La console du harness n’affiche aucune erreur applicative ; seulement React DevTools/Fast Refresh en développement.

## 26. Captures après

- [375×667 — promesse](mirava-mobile-onboarding-identity-activation/after/375x667-step-1.png)
- [390×844 — objectif](mirava-mobile-onboarding-identity-activation/after/390x844-step-2.png)
- [393×852 — univers](mirava-mobile-onboarding-identity-activation/after/393x852-step-3.png)
- [430×932 — restitution](mirava-mobile-onboarding-identity-activation/after/430x932-step-4.png)
- [375×667 — identité](mirava-mobile-onboarding-identity-activation/after/375x667-step-5.png)
- [390×844 — première séance prête](mirava-mobile-onboarding-identity-activation/after/390x844-step-6-ready.png)
- [390×844 — consentement avant caméra](mirava-mobile-onboarding-identity-activation/after/390x844-identity-consent.png)
- [375×430 — clavier réduit](mirava-mobile-onboarding-identity-activation/after/375x430-keyboard.png)
- [844×390 — paysage](mirava-mobile-onboarding-identity-activation/after/844x390-landscape.png)
- [390×844 — texte 200 %](mirava-mobile-onboarding-identity-activation/after/390x844-text-zoom-200.png)

Mesures : `scrollWidth === innerWidth` aux 375, 390, 393 et 430 px ; CTA dans le viewport. Le test 200 % a d’abord révélé un débordement, corrigé par une piste de grille `minmax(0,1fr)` et un rail flexible ; le re-test reste dans 390 px.

## 27. Résultats lint

`npm run lint` : **exit 0**. Aucun warning hooks spécifique au nouveau flux après ajout de la dépendance `currentStep.id`. Le dépôt conserve des warnings `no-img-element` et hooks historiques ; les images MIRAVA locales apparaissent aussi dans la règle de recommandation Next, sans erreur bloquante.

## 28. Résultats typecheck

`npx tsc --noEmit --pretty false` : **exit 0**.

## 29. Résultats build

`npm run build` : **exit 0**, 67 pages générées. Le build émet les warnings historiques de routes dynamiques utilisant les cookies pendant l’analyse statique et `metadataBase`, mais compile, typechecke et finalise les traces.

## 30. Problèmes résiduels

1. P0 preuve : caméra et safe areas non rejouées sur un iPhone physique.
2. P0 preuve : activation authentifiée réelle non exécutée contre une base isolée, puis rechargée.
3. P1 preuve : reprise après interruption et changement de permission non rejoués sur appareil.
4. P2 : l’activation cible jusqu’au premier résultat personnalisé n’est pas démontrée ; le flow s’arrête à une séance réelle prête à générer.
5. P2 : les images locales utilisent `<img>` ; le build recommande `next/image` mais aucun défaut fonctionnel n’a été observé.

## 31. Risques

Le risque principal n’est plus un faux succès dans la machine d’état, mais l’absence de preuve environnementale. Une configuration iOS réelle peut encore révéler une différence de clavier, permission, exposition ou safe area. Une défaillance réseau entre création de la `StudioCreation` et écriture `session_ready` peut laisser une séance orpheline du point de vue onboarding et créer un doublon à la reprise ; un futur lot doit rendre cette préparation idempotente côté serveur.

Condition minimale avant production : campagne sur projet QA isolé avec utilisatrice neuve, refus puis accord caméra, trois photos valides, rechargement entre chaque frontière, vérification DB du profil et de la séance, ouverture de la séance, puis lancement réel contrôlé jusqu’au résultat ou à la file de génération.

## 32. Addendum confidentialité — 2026-08-02

La surface Compte ne présente plus ni ne met à jour de descriptions de caractéristiques physiques. Le DTO public du Profil identité ne contient désormais que son identifiant, le nombre de photos, la date de mise à jour et les aperçus privés autorisés. Les prompts, résumés d’analyse et descriptions physiques restent internes ; un scan du bundle de production MIRAVA ne trouve aucun des identifiants `masterPrompt`, `negativePrompt`, `creativeDirectionSummary` ou `physicalTraits`.

Les résultats et réponses API MIRAVA utilisent `Cache-Control: private, no-store, max-age=0`, et le résultat final est servi par une route authentifiée avec `X-Content-Type-Options: nosniff`. L’audit npm n’a pas pu être rejoué depuis cette session car le registre npm était injoignable ; aucune conclusion sur les dépendances n’est donc ajoutée.

## 33. Verdict

`MIRAVA_ONBOARDING_NOT_READY`

Justification : le code et l’UI locale satisfont les corrections structurelles, mais les critères de sortie exigent une activation démontrée et un parcours navigateur complet. Sans session authentifiée sûre, base QA isolée et iPhone physique, ces preuves critiques ne peuvent pas être déclarées.
