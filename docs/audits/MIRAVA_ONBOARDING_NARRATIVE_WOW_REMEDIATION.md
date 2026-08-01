# MIRAVA onboarding — remediation narrative et visuelle

**Date :** 1 août 2026  
**Verdict :** `CONDITIONALLY_READY`

## Diagnostic initial

Le parcours précédemment livré était un assistant de configuration à quatre décisions. Les données étaient déjà persistées et réutilisées, mais la promesse n'était pas montrée avant l'effort demandé, les univers ne rendaient pas leurs assets existants, les réponses n'étaient pas restituées visuellement et la réassurance identité était trop condensée.

## Fondations conservées

- Sauvegarde progressive, reprise et retour arrière restent centralisés dans `PATCH /api/visual-engine/onboarding`.
- Le prénom reste dans le compte ; univers, intention et moment du Profil Identité restent dans `preferences.miravaOnboarding`.
- L'activation reste distincte de la fin d'onboarding. « Maintenant » ouvre le flux de capture existant ; « plus tard » laisse entrer dans le studio.
- Les événements PostHog ne contiennent ni prénom, ni photos, ni choix détaillé d'univers.

## Architecture avant / après

| Avant | Après | Fonction |
| --- | --- | --- |
| 01 Prénom | 01 Accueil personnel | Appartenance et prénom |
| — | 02 Promesse | Même identité, plusieurs usages visuels |
| — | 03 Fonctionnement | Identité → direction → images |
| 02 Univers | 04 Univers visuels | Expression personnelle, un à trois choix |
| 03 Intention | 05 Intention | Conséquence explicite et auto-avance |
| — | 06 Direction créative | Restitution personnalisée des réponses |
| 04 Moment identité | 07 Identité et contrôle | Décision informée, non culpabilisante |
| — | 08 Studio prêt | Prochaine action unique et contextualisée |

## Matrice et wording final

| Séquence | Preuve produit / wording | Action |
| --- | --- | --- |
| 01 | « Bienvenue dans votre studio photo personnel. » | « Construire mon studio » |
| 02 | « Une même identité. Plusieurs univers. » et quatre assets MIRAVA | « Voir comment ça fonctionne » |
| 03 | Flux visuel : Photos validées → Direction → Images | « Choisir ma direction » |
| 04 | Cartes image, mots-directeurs, compteur `0–3` | « Utiliser ces univers » |
| 05 | Présence, campagne ou portfolio avec conséquence | Auto-avance après sélection |
| 06 | « Votre studio prend forme, {prénom}. » avec univers, objectif et recommandation | « Préparer mon identité » |
| 07 | Photos validées, contrôle local avant envoi, consultation/suppression | « Créer mon Profil Identité » ou « Le préparer plus tard » |
| 08 | Direction et état d'identité récapitulés | CTA dynamique : identité ou exploration |

## Composants, mouvement et reduced motion

- Aucun composant externe ajouté : les assets de `MIRAVA_UNIVERSES`, `framer-motion` et les icônes déjà installées suffisent.
- `AnimatePresence` orchestre les changements de séquence ; les reveals de galerie et de moodboard utilisent des entrées courtes et un stagger. Les cartes sélectionnées ont un feedback visuel immédiat.
- `useReducedMotion` ramène les délais d'auto-avance à zéro et raccourcit les transitions. Le CSS enlève aussi les transitions décoratives quand `prefers-reduced-motion` est actif.

## Données, reprise et analytics

- Le contrat passe à la version `2` et expose huit identifiants stables dans `MIRAVA_ONBOARDING_STEPS`.
- Les états version `1` sont lus et projetés vers les étapes narratives correspondantes ; les onboards déjà terminés restent terminés.
- La vue, la sélection, la soumission, le retour, le skip et la complétion portent `onboarding_version`, `step_id` et `sequence_id` lorsque pertinent. Aucun contenu sensible n'est envoyé.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| Tests ciblés onboarding / studio | 25 tests passés |
| Typecheck | Passé (`tsc --noEmit`) |
| Lint | Passé avec avertissements historiques et 4 avertissements `no-img-element` sur la nouvelle galerie |
| Build production | Passé ; avertissements existants de routes dynamiques et `metadataBase` |
| Diff | `git diff --check` passé |
| Navigateur local | Serveur démarré, redirection vers l'auth observée ; axe : 0 violation, 1 vérification manuelle de contraste sur l'écran d'authentification |

La seule capture réellement obtenue est [l'écran de garde d'authentification](./mirava-onboarding-evidence/auth-gate-local.png). Elle n'est pas présentée comme une preuve de l'onboarding.

## Scénarios navigateur et limite

Les scénarios A à E, les captures mobile/desktop de chaque séquence, le parcours caméra/galerie, la reprise et reduced motion **ne sont pas certifiés** : le parcours est derrière l'authentification et aucun compte QA isolé, réutilisable et nettoyable n'était disponible. Aucun compte durable n'a été créé, aucune auth n'a été contournée et aucune donnée photo n'a été envoyée.

## Problèmes résiduels

1. Créer un compte QA isolé avec purge documentée afin de rejouer A–E dans un vrai navigateur, produire les captures demandées et vérifier la reprise à partir d'un état version 1 et 2.
2. Revoir avec l'équipe produit les affirmations de confidentialité qui ne sont pas démontrables ici : conservation côté serveur, entraînement éventuel d'un modèle général et durée de rétention. Elles ne sont pas affirmées dans cette remédiation.
3. Décider si les assets de galerie doivent passer à `next/image` ; les `img` sont intentionnels pour les compositions animées, mais le linter les signale.

## Verdict

`CONDITIONALLY_READY` : la structure narrative, la version de persistance, les tests ciblés, le typecheck et le build sont validés. Le verdict `MIRAVA_ONBOARDING_GOLD_STANDARD_VERIFIED` est interdit tant que les parcours authentifiés complets et leurs preuves visuelles mobile, desktop et reduced motion n'ont pas été rejoués avec un compte QA sûr.
