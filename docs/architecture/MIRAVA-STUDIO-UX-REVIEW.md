# MIRAVA Studio — Refonte de l’expérience de création

## Statut

Conception validée et implémentée le 29 juillet 2026. Ce document constitue le contrat UX du Studio MIRAVA.

## Compréhension validée

- MIRAVA reste un studio photo personnel : « Votre studio photo personnel, partout où vous voulez être vue. »
- L’identité visuelle « Noir minéral éditorial » est conservée.
- Le Studio actuel présente trop de choix et trop de sections simultanément.
- La structure utile du prototype Google AI Studio est sa segmentation, sa chronologie et sa navigation, pas sa palette ni ses effets.
- L’expérience cible doit se comporter comme une application mobile native, sans modifier les API, les crédits ou la confidentialité.
- La Directrice créative devient Alma, une professionnelle incarnée dans une vraie messagerie contextuelle.

## Hypothèses et contraintes

- PWA Next.js pour Safari iOS et Chrome Android, téléphone prioritaire.
- Zones tactiles minimales de 48 px, zones sûres iOS/Android et navigation arrière prévisible.
- Aucun ajout de dépendance nécessaire pour la refonte UI.
- Les états serveur et le parcours métier existants restent autoritaires.
- Les conversations avec Alma restent attachées à la séance courante sans introduire de nouvelle persistance serveur.
- Le portrait d’Alma est un personnage original généré, sans ressemblance intentionnelle avec une personne réelle.

## Architecture de navigation

La navigation principale contient cinq destinations :

1. Studio
2. Univers
3. Portfolio
4. Alma
5. Compte

Le Profil identité n’est plus une destination principale : il reste une étape fonctionnelle de la séance et se gère depuis Compte.

Sur mobile, la navigation prend la forme d’un dock éditorial attaché au bas de l’écran. Son état actif repose sur le contraste du texte et un repère fin, jamais sur un gros pavé blanc. Studio est légèrement dominant et Alma est représentée par son portrait. Sur desktop, les cinq destinations sont regroupées dans un panneau de contrôle central sombre.

Le header est attaché aux bords supérieur et latéraux de l’écran. Seuls ses deux angles inférieurs sont arrondis. La zone sûre est absorbée à l’intérieur du header, qui conserve le mot-symbole, le nombre de créations disponibles et la langue sans trait horizontal de séparation.

## Parcours « Créer »

Une seule étape est développée à la fois. La progression est toujours visible et utilise le vocabulaire suivant :

| Étape | Français | Espagnol | Rôle |
| --- | --- | --- | --- |
| 01 | Moodboard | Moodboard | Choisir un univers MIRAVA ou ajouter une image de référence. |
| 02 | Séance | Sesión | Composer le décor, le look, la lumière, l’attitude et le format. |
| 03 | Modèle | Modelo | Ajouter ou réutiliser les photos nécessaires à la fidélité de représentation. |
| 04 | Création | Creación | Vérifier la séance, le nombre de photos et lancer la création. |

Questions d’accompagnement :

- Moodboard : « Où voulez-vous être vue ? »
- Séance : « Quelle image voulez-vous créer ? »
- Modèle : « Vous êtes au centre de la séance. »
- Création : « Votre studio est prêt. »

Action finale : « Créer mes photos » / « Crear mis fotos ».

Les réglages secondaires de la séance sont masqués sous une action « Préciser la séance ». Cette divulgation progressive évite de présenter tous les contrôles en même temps.

## Alma — Directrice créative

Alma est une Directrice éditoriale méditerranéenne et nord-africaine de 46 ans : présence calme et assurée, traits matures naturels, coupe courte sombre traversée d’une mèche argentée, blazer graphite et portrait studio photoréaliste contemporain. Cette identité a été volontairement éloignée de celle du modèle de campagne.

Dans l’étape Séance, un module compact présente :

- le portrait d’Alma ;
- « Alma — Directrice créative » ;
- une phrase contextuelle liée à la séance ;
- l’action « Échanger avec Alma ».

La conversation occupe tout l’écran sur mobile et un panneau latéral sur desktop. Elle propose des questions utiles, des recommandations concrètes et une action « Appliquer à ma séance » lorsque des réglages peuvent être repris.

Alma n’utilise aucune étoile, baguette, formulation magique ou esthétique de chatbot générique.

## Règles visuelles

- Rayon universel de 12 px pour les surfaces, médias, boutons, contrôles, header et navigation.
- Les avatars fonctionnels peuvent conserver une forme circulaire lorsque l’identification humaine l’exige.
- Aucun séparateur horizontal entre les sections principales.
- La hiérarchie repose sur l’espace, le contraste des surfaces et la typographie.
- Aucun gradient décoratif, aucune icône magique et aucune animation de spectacle.
- Inter pour l’interface et Plus Jakarta Sans pour les titres et métadonnées premium.

## Journal de décisions

| Décision | Alternatives considérées | Motif |
| --- | --- | --- |
| Navigation Studio · Univers · Portfolio · Alma · Compte | Identité dans la navigation, Alma uniquement contextuelle | Rend les espaces prévisibles, donne un accès direct à la Directrice créative et replace le Profil identité dans son rôle fonctionnel. |
| Parcours progressif en quatre étapes | Page longue, accordéons sur une page | Réduit la charge cognitive et rapproche l’expérience d’une application native. |
| Moodboard · Séance · Modèle · Création | Inspiration · Intention · Identité · Vérification ; vocabulaire campagne/production | Reste intuitif, bilingue et fidèle à la promesse de studio photo personnel. |
| Alma accessible dans la navigation et intégrée à Séance | Gros bouton magique, simple rubrique d’aide | La Directrice créative reste contextuelle tout en devenant une présence stable et incarnée dans le Studio. |
| Rayon unique de 12 px | Échelle de rayons variable | Supprime le déséquilibre visuel signalé pendant la review. |
| Séparation par espace et contraste | Barres horizontales | Produit une composition plus calme et éditoriale. |
| Reprendre la structure du ZIP uniquement | Copier son identité complète | Le prototype contient des incohérences visuelles et un débordement mobile, mais une bonne segmentation. |

## Validation attendue après implémentation

- Inspection réelle du Studio authentifié dans le navigateur.
- Tests à 375, 768, 1024 et 1440 px.
- Aucun débordement horizontal ni contenu masqué par la navigation.
- Toutes les cibles tactiles mesurent au moins 48 × 48 px.
- Parcours clavier, focus visible, langue FR/ES et mouvement réduit validés.
- TypeScript et build Next.js validés.
