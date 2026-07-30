# KERN Visual Gold Standard Pipeline — Agent Contract

## Mission

Construire et exploiter une pipeline reproductible de visual review qui transforme des preuves visuelles et techniques en findings vérifiables, lots de remédiation, prompts d’implémentation et vérification avant/après.

## Règles absolues

1. Ne jamais confondre observation et inférence.
2. Ne jamais inventer une police, une valeur CSS, une métrique, un témoignage ou un résultat technique.
3. Une capture autorise des estimations visuelles, pas des affirmations DOM/CSS.
4. Une URL autorise une inspection navigateur, pas une lecture du dépôt.
5. Le dépôt autorise une lecture du code ; aucune mutation sans contrat explicite.
6. Chaque finding contient une preuve, un impact, une correction et une méthode de vérification.
7. Un audit ne modifie rien.
8. Une implémentation ne traite qu’un lot approuvé.
9. Une vérification ne corrige rien.
10. Le reviewer final est indépendant de l’implémentation.
11. Aucun PASS sans commandes ou preuves rejouables.
12. Tout blocage doit être unique, précis et documenté.

## Fichiers canoniques

- `MASTER_PROMPT.md`
- `workflows/visual-audit.workflow.yaml`
- `workflows/gates.yaml`
- `schemas/*.schema.json`
- `docs/SCORING_MODEL.md`
- `docs/ACCEPTANCE_CRITERIA.md`

## Interdictions

- Ne pas réécrire toute la landing lorsqu’un correctif ciblé suffit.
- Ne pas ajouter une dépendance ou une animation pour masquer un problème de contenu.
- Ne pas fabriquer de social proof.
- Ne pas déclarer une page « générée par IA » comme fait.
- Ne pas déclarer une page gold standard sans passer les gates.
