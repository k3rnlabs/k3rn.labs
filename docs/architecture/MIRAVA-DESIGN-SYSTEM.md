# MIRAVA Studio — Design System Noir minéral éditorial

## Mission

MIRAVA Studio est un studio de personal branding éditorial. Son interface doit faire sentir un espace de création privé, précis et désirable : l'image est vivante, l'interface est architecturale.

Ce document est la source de décision de la direction artistique. Les composants MIRAVA ne définissent ni couleurs de marque, ni ombres, ni rayons en dur : ils consomment les tokens et primitives documentés ici.

## Périmètre

- Routes publiques et authentifiées : `/visual-engine`, `/visual-engine/studio`, et leurs états de chargement, vide, erreur, upload et résultat.
- Hors périmètre : interface K3RN, règles métier, API, textes juridiques et logique de crédits.
- La référence initiale inspire la densité, le contraste, la composition asymétrique et le grain. MIRAVA conserve une identité visuelle originale.

## Direction artistique

**Nom : Noir minéral éditorial.**

- Fond : noir profond et graphite, sans verre dépoli ni dégradés colorés ; seuls des champs de lumière neutres et les voiles fonctionnels sur média sont admis.
- Chaleur : portée par les créations photographiques ; les accents UI restent rares et désaturés.
- Composition : grille nette, très grand espace négatif, titres éditoriaux et panneaux denses.
- Formes : angles francs ou très faibles arrondis ; pas de composants pill par défaut.
- Profondeur : traits structurels et anneaux d'élévation translucides, non des ombres lourdes.
- Matière : un champ lumineux noir–argent et un grain monochrome fin, irrégulier et multi-fréquence sur les surfaces UI, jamais comme filtre sur les portraits ou créations. Un seul calque Canvas React local le génère pour chaque racine MIRAVA, sans SVG ni image distante.
- Onboarding : il reste dans la palette noir minéral afin de conserver une continuité de marque entre Moodboard, Séance, Modèle et Création.

## Tokens

| Famille | Rôle |
| --- | --- |
| Canvas | fond principal, fond relevé et fond de panel |
| Ink | textes principal, secondaire et discret |
| Line | séparateurs, contours de média, contour sélectionné et focus |
| Accent | champagne minéral, réservé aux indications de direction ou aux statuts non destructifs |
| Feedback | succès, avertissement et erreur assourdis, jamais saturés |
| Shape | rayon universel `12` px pour les surfaces, médias, contrôles et navigations ; cercle réservé aux commandes photographiques fonctionnelles et aux avatars humains |
| Motion | 100–150 ms pour les interactions fréquentes, 250–300 ms pour les entrées rares |

Les tokens vivent sous le namespace `--mirava-*` dans `src/styles/mirava.css`, importé une seule fois par `globals.css`. `tailwind.config.ts` ne contient aucune valeur MIRAVA dupliquée : il ne fait que relier les utilitaires aux variables CSS, y compris leurs canaux RGB pour les opacités. Les primitives sont exposées par des classes `mirava-*` réutilisables, jamais par des couleurs arbitraires dans chaque écran.

## Typographie et iconographie

- Titres et métadonnées premium : Plus Jakarta Sans.
- Interface, paragraphes et commandes : Inter.
- Titres courts : `text-wrap: balance`; textes courts à moyens : `text-wrap: pretty`.
- Les compteurs et prix utilisent des chiffres tabulaires.
- Toutes les icônes viennent de Lucide, en `currentColor`, avec une même épaisseur optique sur une surface.

## Composants

- **Bouton primaire** : ivoire sur noir, 48 px minimum sur mobile, retour tactile limité à `scale(0.96)` hors soumission.
- **Bouton secondaire** : transparent, contour minéral, sans effet de verre.
- **Surface** : trois intensités centralisées — `subtle`, `mineral`, `spotlight` — combinent graphite et lumière diffuse ; le grain Canvas React commun apporte une matière fine, sans répétition par carte. Une image reçoit un contour blanc pur translucide mais aucun bruit superposé.
- **Choix et filtres** : rectangles compacts et non pastilles ; sélection par fond relevé, contour clair et coche.
- **Entrées et uploads** : label visible, contour focus contrasté, états erreur et chargement explicites.
- **Navigation basse** : capsule minérale contrôlée par l’état réel de l’application ; seul l’onglet actif développe son libellé, les quatre autres restent iconographiques, avec cinq cibles de 48 px minimum.
- **Header Studio** : attaché aux bords supérieur et latéraux, arrondi uniquement en bas et composé dans la même matière que la navigation. Sur le parcours Studio, il contient la progression Moodboard → Séance → Modèle → Création ; l’étape active se développe et les étapes déjà visitées restent accessibles.
- **Contrôles structurés** : `Collapsible` et `RadioGroup` shadcn/Radix portent respectivement les réglages facultatifs et les choix exclusifs, tandis que les classes MIRAVA conservent toute la DA.

## Composition

- Landing : manifeste et actions à gauche ; création immersive verticale à droite ; planches asymétriques pour les univers.
- Studio : espace de travail compact ; création et résultat au premier plan ; réglages, profil identité et bibliothèque en panneaux secondaires. L’onboarding utilise un rail de planche-contact et une composition photographique plutôt qu’une répétition de cartes génériques.
- Mobile : lecture verticale, actions au pouce, dock animé Studio · Univers · Portfolio · Alma · Compte placé dans la zone sûre et header de progression attaché au haut de l’écran, sans débordement ni information inaccessible sous les éléments fixes.
- Les parcours complexes — consentement, capture identité et direction créative — occupent tout l’écran sur téléphone et redeviennent des panneaux sur grand écran.

## Vocabulaire produit

- En français : « séance », « image signature », « Profil identité », « Directrice créative » et « univers ».
- En espagnol : « sesión », « imagen insignia », « Perfil de identidad », « Directora creativa » et « universo ».
- Les termes de production internes (`styling`, identifiants techniques, statuts API) ne sont jamais exposés tels quels dans l’interface.

## Mouvement et accessibilité

- Les interactions utilisent des transitions CSS interruptibles et ciblées ; jamais `transition: all`.
- Framer Motion est réservé aux entrées de scène rares et aux changements de contexte. Il respecte `prefers-reduced-motion`.
- Une animation n'est jamais l'unique signal d'état.
- Focus visible, contraste de texte d'au moins 4.5:1, ordre clavier logique et zones tactiles d'au moins 48 × 48 px.
- Les états chargement, erreur, vide et succès restent explicites et n'effacent jamais une donnée déjà visible sans raison.

## Journal de décisions

| Décision | Alternatives considérées | Raison |
| --- | --- | --- |
| Noir minéral comme fond dominant | Ivoire solaire, noir cacao | Conserve la tension éditoriale validée et laisse les créations apporter la chaleur. |
| Tokens centralisés `--mirava-*` | Styles par page | Toute évolution de DA impacte immédiatement l'expérience entière. |
| Inter + Plus Jakarta Sans | Polices manuscrites ou techniques | Respecte les règles du projet tout en gardant une tension premium. |
| Motion sobre avec Framer Motion existant | Nouvelle dépendance, animations systématiques | Préserve le bundle, la lisibilité et le contrôle utilisateur. |
| Inspiration, pas duplication | Reproduction d'une identité tierce | MIRAVA reste identifiable, durable et originale. |
| Grain Canvas React partagé | Texture SVG/CSS répétée, bitmap distante ou filtre posé sur toutes les images | Ajoute une matière premium sans réseau ni bandes de répétition, sans altérer la photographie et sans multiplier les canevas par carte. |
| Onboarding noir minéral continu | Exception ivoire | Évite une rupture de marque et laisse les photographies porter seules la chaleur visuelle. |
