# MIRAVA Studio — Alma, Directrice créative facultative

> Statut : design validé le 2026-07-30 ; implémentation à planifier.

## Intention

Alma est une directrice créative privée et facultative. Elle aide une créatrice à transformer une intention simple en décisions de séance réellement exploitables par MIRAVA Studio. Elle n'est ni un chatbot générique, ni un passage imposé, ni un moteur de génération.

## Expérience validée

1. La créatrice peut toujours commencer directement depuis un univers, une référence ou les réglages de séance.
2. Elle ouvre Alma lorsqu'elle souhaite être conseillée, développer une intention ou préparer une série.
3. Alma reçoit le contexte créatif déjà validé : univers, options de séance, stratégie et taille de série, ainsi que le message de la créatrice.
4. Alma retourne une réponse éditoriale courte et, au plus, trois propositions structurées applicables.
5. Aucune proposition ne modifie la séance avant une action explicite « Appliquer à ma séance ».
6. L'application ferme Alma et revient exactement à la séance après application ; les options deviennent les options persistées de la création et sont utilisées par le brief serveur de génération.

## Interface

- Un seul moyen de sortie : « Retour au studio ». Le bouton de fermeture `×` n'est pas affiché.
- En-tête compact : portrait, nom Alma et rôle de Directrice créative. Ne pas afficher un statut « disponible » non vérifié.
- Sur mobile : fiche plein écran, en-tête fixe, conversation défilante, saisie ancrée aux zones sûres, cibles tactiles d'au moins 48 px.
- Les propositions de départ sont des intentions courtes, contextuelles et non dupliquées. Elles disparaissent après le premier échange pour éviter de polluer la conversation.
- Les réponses présentent les changements de manière lisible avant application, par exemple « Lumière : dorée rasante » ou « Série : 4 images ».

## Contrat de données et sécurité

Alma reçoit exclusivement : locale, `universeId`, options créatives validées et message client. Elle ne reçoit jamais les images d'identité, les photos de référence brutes, le master prompt, le negative prompt, l'analyse interne, les URLs signées ou les consentements détaillés.

Elle retourne :

- une réponse client courte ;
- des valeurs strictement validées pour `location`, `styling`, `energy`, `framing`, `photoStyle`, `beauty`, `audacity`, `seriesSize`, `seriesStrategy`, `referenceMode`, `variationAxes` et `note`.

Le serveur valide chaque valeur avant persistance. Les options appliquées alimentent le brief de génération côté serveur ; aucun prompt interne ne revient au navigateur.

## Fiabilité

- Modèle par défaut : `MIRAVA_CREATIVE_DIRECTOR_MODEL=gpt-5-mini`, retenu pour sa latence, son coût et son support des réponses JSON structurées pour une conversation éditoriale courte. Ce réglage est distinct de `MIRAVA_ANALYSIS_MODEL`, qui reste dédié aux analyses visuelles.
- La route serveur doit distinguer les erreurs de configuration, quota, fournisseur, délai et réponse JSON invalide dans des logs minimaux sans contenu créatif ni donnée personnelle.
- Une panne d'Alma conserve le brouillon et laisse immédiatement les réglages manuels disponibles. La création MIRAVA ne dépend jamais de cette fonctionnalité.
- Les erreurs affichées côté cliente sont simples, sans détails d'infrastructure, avec une action de réessai et un accès aux réglages de séance.

## Validation attendue

1. Alma peut proposer et appliquer des options réellement consommées par la génération.
2. Une réponse ne change rien avant validation explicite.
3. Une indisponibilité ne bloque ni le brouillon ni la création manuelle.
4. La sortie est unique et cohérente sur mobile et desktop.
5. Tests : réponse structurée, valeurs invalides, timeout, quota, persistance des options, absence de données privées dans les DTO et rendu mobile à 390 px.

## Decision log

| Décision | Alternatives considérées | Justification |
| --- | --- | --- |
| Alma est facultative | Étape obligatoire ; assistant de formulaires | La cliente experte doit pouvoir créer sans friction. |
| Conversation et actions applicables | Chat libre ; formulaires seuls | Conserve la dimension créative tout en gardant la pipeline contrôlée. |
| Validation explicite avant application | Mise à jour automatique | La créatrice garde le contrôle de sa direction. |
| `gpt-5-mini` pour Alma | `gpt-5.6-sol`, modèle image | Suffisant pour des réponses bilingues courtes et structurées, avec un coût adapté. |
| Dégradation manuelle sans blocage | Erreur bloquante | Alma est un outil additionnel, jamais une dépendance à la création. |
