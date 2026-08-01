# MIRAVA Studio — Séance adaptative et matière minérale

## Statut

Conception validée et implémentée le 30 juillet 2026. Validation technique et visuelle effectuée sur le parcours Studio.

## Compréhension validée

- L’étape Séance doit s’adapter à la source choisie dans Moodboard : univers MIRAVA ou référence personnelle.
- Le format est le seul réglage obligatoire, car il détermine le nombre d’images et les crédits consommés.
- Un univers fournit automatiquement une direction cohérente : décor, lumière, styling, attitude et traitement photographique.
- Les réglages manuels sont des ajustements facultatifs, jamais un formulaire obligatoire.
- Une référence personnelle devient la source créative prioritaire et ne déclenche aucun choix générique redondant.
- Les choix incompatibles ne doivent jamais survivre à un changement d’univers ou de source.
- Le design system doit traduire les références visuelles en une matière originale noir–argent, lumineuse et granuleuse, sans filtre uniforme ni effet bon marché.

## Contraintes et hypothèses

- PWA Next.js, téléphone prioritaire, avec validation à 375, 768, 1024 et 1440 px.
- Cibles tactiles d’au moins 48 px et aucun contenu masqué par les barres fixes.
- Inter reste la police d’interface et Plus Jakarta Sans la police de display.
- Les textures restent locales, légères et sans dépendance réseau.
- Le grain ne modifie jamais les textes, les contrôles tactiles ou les photographies ; il est généré par le fond Grainient React Bits, local et distinct des contenus.
- L’absence de réglage facultatif ne bloque jamais la séance.
- Les règles existantes de confidentialité, purge, consentement, crédits et génération restent inchangées.
- Une image unique utilise normalement un décor principal.
- Une série conserve un univers commun et peut varier les sous-lieux ou plusieurs décors compatibles.

## Parcours cible

### 0. Premier accès MIRAVA

Le premier accès après authentification ouvre un onboarding propre à MIRAVA, distinct de l’onboarding global de l’application. Il recueille le prénom, jusqu’à trois univers appréciés, l’intention initiale (présence, campagne ou portfolio), puis laisse le choix de préparer le Profil identité immédiatement ou plus tard.

Les préférences sont enregistrées sous `preferences.miravaOnboarding` de l’utilisateur ; elles ne modifient pas les données d’onboarding des autres produits. Les preuves d’usage restent vérifiables : références privées et supprimables, et contrôle local des vues avant validation.

### 1. Moodboard

Le Studio enregistre une source créative explicite :

- `universe` avec l’identifiant de l’univers sélectionné ;
- `reference` avec la référence personnelle privée.

Retirer une référence restaure le dernier univers sélectionné.

### 2. Séance — tronc commun

Le format est présenté en premier : l’Image signature, à un crédit, est toujours sélectionnée par défaut. Une série de 2 à 6 photos ne peut être choisie qu’explicitement. Chaque option affiche immédiatement son coût en crédits.

### 3A. Séance depuis un univers

Un brief éditorial « Direction sélectionnée » expose les choix hérités :

- décor principal ;
- lumière ;
- allure et styling ;
- traitement photographique.

La personne peut continuer sans rien modifier. « Ajuster cette direction » révèle uniquement les options compatibles avec l’univers actif.

Pour une série, un choix supplémentaire apparaît :

- conserver un décor principal et varier les sous-lieux ;
- varier plusieurs décors cohérents dans le même univers.

### 3B. Séance depuis une référence

« Rester fidèle à cette image » est la direction par défaut. Aucun lieu, style ou niveau d’énergie générique n’est demandé.

« Créer des variations » révèle les dimensions modifiables : décor, tenue, lumière et cadrage. Seules les dimensions explicitement choisies sont enregistrées comme dérogations.

### 4. Création et identité requise

Une séance ne contient que Moodboard → Séance → Création. Le Profil identité ne devient jamais une étape récurrente pour un profil déjà prêt.

À la dernière étape, des aperçus privés à durée limitée peuvent être affichés pour contrôler les vraies références de l’utilisateur. Les images de guide MIRAVA ne sont jamais réemployées comme substitut du profil réel. Si l’identité manque, le parcours dédié est ouvert puis la personne revient à sa création.

Le récapitulatif distingue clairement :

- la direction héritée de MIRAVA ou de la référence ;
- les ajustements volontaires de la personne ;
- le format et le coût final.

## Modèle de données créatives

Chaque `MiravaUniverse` porte une direction bilingue structurée :

- `creativeDirection` : décor, lumière, styling, attitude et traitement photographique ;
- `creativeDirection.refinements.locations` : décors et sous-lieux compatibles ;
- `creativeDirection.refinements.stylings` ;
- `creativeDirection.refinements.energies` ;
- `creativeDirection.refinements.lights`.

`MiravaCreativeOptions` ne stocke que les ajustements validés par la personne. Les valeurs héritées restent rattachées à la source et ne sont pas dupliquées comme faux choix utilisateur.

Changer de source supprime les ajustements incompatibles. Un univers dont la configuration serait incomplète conserve ses valeurs par défaut sans bloquer l’expérience.

## Composants

- `SessionFormatPicker` — format obligatoire et crédits.
- `CreativeDirectionSummary` — direction héritée et provenance.
- `UniverseRefinement` — ajustements contextualisés facultatifs.
- `ReferenceFidelity` — fidélité ou variations de la référence.
- `SeriesDirection` — stratégie de décor pour les séries.
- le récapitulatif de l’étape Création — synthèse avant génération.

Alma reçoit la source, le format et les ajustements actifs. Ses suggestions doivent rester compatibles avec l’univers ou la référence.

## Système de matière visuelle

### Champ lumineux

Les grandes surfaces utilisent des gradients noir–argent asymétriques, larges et diffus. Leur position varie afin de produire une lumière de studio organique et d’éviter une répétition mécanique.

### Grain

Le grain est généré par `Grainient`, un composant React Bits rendu localement par WebGL et partagé par toute la racine MIRAVA. Il combine plusieurs fréquences monochromes à faible intensité sans SVG, ni image de bruit, ni tuile répétée. Les trois matières de surface modulent uniquement le champ lumineux :

- `subtle` pour les petites surfaces fonctionnelles ;
- `mineral` pour les cartes éditoriales ;
- `spotlight` pour les zones héro et les grands panneaux.

Il reste structurel, local et non interactif. Les photographies, textes et boutons conservent leur netteté, et aucune carte ne crée son propre canevas.

### Surfaces

Les cartes combinent noir translucide, voile interne, bord lumineux très discret et ombre large. Elles doivent évoquer une matière sombre taillée, pas un glassmorphism générique.

### Typographie et contrôles

- Titres Plus Jakarta Sans, poids 500–600, interlettrage serré et échelle généreuse.
- Corps et interface en Inter.
- Métadonnées petites, capitales, espacées et volontairement secondaires.
- Bouton primaire ivoire avec texte noir.
- Bouton secondaire sombre avec contour discret.
- Rayon universel de 12 px et hauteur tactile minimale de 48 px.
- Aucun reflet animé, gradient brillant ou vocabulaire magique.

Tous les paramètres de matière vivent dans les tokens `--mirava-*` et les variantes de composants, jamais directement dans les pages.

## Cas limites et validation

- Changement entre les sept univers sans conservation d’un réglage incompatible.
- Import puis retrait d’une référence.
- Fidélité stricte et variations facultatives d’une référence.
- Formats 1 à 6 et coût correspondant.
- Série automatique sans réglage manuel.
- Univers incomplet utilisant sa direction par défaut.
- Navigation clavier, focus visible et mouvement réduit.
- Aucun débordement horizontal à 375, 768, 1024 et 1440 px.
- Vérification que le fond Grainient reste non répétitif, performant, sans bande et absent des zones de lecture critiques.

## Journal de décisions

| Décision | Alternatives considérées | Motif |
| --- | --- | --- |
| Séance adaptative selon la source | Formulaire unique ; séance entièrement conversationnelle | Offre une expérience intelligente sans ralentir le parcours. |
| Format obligatoire sans choix silencieux | Image unique préselectionnée | Le coût et le volume de production exigent une décision explicite. |
| Direction héritée par défaut | Réglages génériques obligatoires | L’univers ou la référence contient déjà une intention exploitable. |
| Ajustements propres à chaque univers | Listes globales lieu/style/énergie | Empêche les incohérences telles qu’un bord de mer dans Glamour nocturne. |
| Fidélité par défaut pour une référence | Réafficher tous les réglages | Respecte l’intention d’une personne qui apporte déjà une image précise. |
| Alma comme soutien contextuel | Alma comme passage obligatoire | Préserve la rapidité tout en gardant une aide incarnée. |
| Matière en trois couches + Grainient partagé | Texture SVG/CSS de bruit uniforme | Reproduit la profondeur des références sans effet répétitif, bande visible ou rendu bon marché. |
| Tokens et variantes centralisés | Styles locaux par composant | Permet une évolution globale et maintenable de la DA. |
