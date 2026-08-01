# MIRAVA Studio — Onboarding Gold Standard

**Date :** 1 août 2026  
**Verdict :** `CONDITIONALLY_READY`

## Décision produit

`Professionnelle du personal branding → besoin d’images éditoriales qui lui ressemblent → studio photo personnel privé → univers et intention → séance → première image livrée → activation`

- Promesse : un studio photo personnel qui mène d’une direction claire à un résultat éditorial.
- Utilisatrice : personne qui construit sa présence professionnelle, sa campagne ou son portfolio, sans devoir maîtriser le vocabulaire photo.
- Activation primaire : une première `StudioCreation` atteint `COMPLETED` et son résultat est consultable par sa propriétaire. Finir l’accueil ne constitue pas une activation.
- Signaux secondaires : Profil identité validé, première séance configurée, première création lancée.

Le parcours conserve quatre décisions utiles. Le Profil identité ne réapparaît plus comme une étape de chaque séance : il est proposé au premier accès, puis requis uniquement lorsqu’il devient nécessaire à la création.

## Diagnostic et corrections

| Observation | Impact | Correction vérifiable |
| --- | --- | --- |
| Préférences initiales et réglages de séance étaient confondus. | Trop de choix trop tôt, répétition du profil. | Onboarding dédié, puis flow `Moodboard → Séance → Création`. |
| Les réponses pouvaient être décoratives. | Personnalisation sans effet. | Chaque réponse change le point de départ ou le prochain pas du studio. |
| Une interruption pouvait faire perdre le contexte. | Friction et abandon. | Brouillon versionné sauvegardé après chaque réponse utile. |
| Le profil image risquait d’être demandé avant perception de valeur. | Inquiétude et effort prématuré. | Choix clair « maintenant » ou « plus tard », confidentialité contextualisée. |

## Matrice des étapes

| Identifiant | Décision et nécessité | Utilisation | CTA / secondaire | Persistance et cas dégradé |
| --- | --- | --- | --- | --- |
| `welcome_name` | Prénom, nécessaire à une entrée personnelle. | Le titre de la première séance emploie le prénom. | Continuer. | `user.firstName`; valeur non vide requise, erreur visible. |
| `universes` | Un à trois univers, nécessaires à un point de départ non neutre. | Le premier pré-sélectionne le moodboard ; les autres restent des préférences. | Continuer / Retour. | `preferences.miravaOnboarding.universeIds`; limite de trois explicitée. |
| `goal` | Intention simple, nécessaire à la recommandation du premier format. | Présence : 1 image ; campagne ou portfolio : série de 3 cohérente. La séance reste modifiable. | Continuer / Retour. | `goal`; sélection et sauvegarde explicites. |
| `identity_timing` | Moment de préparer les photos privées ; reportable car l’exploration n’en dépend pas. | « Maintenant » ouvre la capture après l’accueil ; « plus tard » reporte la demande à la création. | Entrer dans le studio / Retour. | `identityIntent`; aucune photo ici. |

Les écrans portent une décision principale unique. La progression est honnête (`01/04` à `04/04`), le choix multiple garde une confirmation et le Retour est proposé dès la seconde décision.

## Données, confiance et mesure

- Prénom dans le compte ; univers, intention et timing dans `preferences.miravaOnboarding`, séparés de l’onboarding global.
- Les photos sont demandées seulement dans le parcours dédié Profil identité, après explication et consentements. Elles sont privées et supprimables.
- Événements : `onboarding_started`, `onboarding_resumed`, `onboarding_step_viewed`, `onboarding_answer_selected`, `onboarding_answer_submitted`, `onboarding_step_skipped`, `onboarding_validation_failed`, `onboarding_back_clicked`, `onboarding_completed`.
- Les événements se limitent à la version, l’étape et la catégorie de réponse : jamais prénom, univers précis, photo ni consentement.
- Reprise assurée par un état `in_progress` versionné.

## Interface et accessibilité

- Continuité avec le système MIRAVA : noir minéral, surfaces grainées React, hiérarchie éditoriale et tokens partagés. Ni urgence artificielle, ni preuve sociale inventée.
- Une décision par écran, cartes entièrement cliquables, états sélectionnés lisibles, zones tactiles de 96 px minimum, focus visible et colonne unique sur très petit mobile.
- Les mouvements de progression et de cartes respectent `prefers-reduced-motion`.
- Éléments natifs, `aria-pressed` sur les cartes et région de statut pour les erreurs.

## Preuves exécutées

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Environnement navigateur | Passé : 11 contrôles, 0 avertissement, 0 échec. | `npx --yes agent-browser doctor` (1 août 2026). |
| Parcours public local | Observé sur `/visual-engine` : navigation, univers et entrée de création accessibles. | `/tmp/mirava-onboarding-qa/landing-before.png` |
| Validation d’inscription réelle | Observée sur `/visual-engine/studio/login` : confirmation de mot de passe incohérente et erreur visible. | `/tmp/mirava-onboarding-qa/signup-validation.png` |
| Tests ciblés | À rejouer après les derniers ajustements. | Commandes ci-dessous. |

```bash
npx vitest run src/app/api/visual-engine/onboarding/route.test.ts src/components/studio/mirava-studio-onboarding.test.ts src/components/studio/visual-engine-studio.test.ts
npx tsc --noEmit
git diff --check
```

## Limite et condition de passage au vert

Le verdict n’est pas `ONBOARDING_GOLD_STANDARD_VERIFIED` : le parcours authentifié complet, de l’inscription au premier résultat généré, n’a pas été exécuté dans un environnement jetable avec compte de test et nettoyage prouvable. Créer un compte durable ou lancer une génération avec des données personnelles aurait dépassé le périmètre de test sûr.

Pour lever cette condition : provisionner un compte QA isolé avec crédits de test et purge documentée, puis vérifier sur mobile et desktop la reprise, les choix « maintenant » et « plus tard », la capture/import, la création, le résultat `COMPLETED`, l’accès privé et l’événement d’activation. Une relecture indépendante doit ensuite valider les preuves avant tout verdict Gold Standard.
