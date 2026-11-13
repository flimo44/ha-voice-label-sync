# Parcours standard — reprendre un fichier d'entités existant (PR #147)

Objectif produit : **HVLS gère les labels Home Assistant et génère le YAML
`google_assistant_entities.yaml`**. L'absence de `google_assistant:` dans
`configuration.yaml` ne doit pas empêcher cette gestion ; elle signifie
seulement que la diffusion réelle vers Google Home n'est pas établie.

## Cas concret

Nouvelle installation HVLS avec `google_assistant_entities.yaml` déjà présent,
mais pas de déclaration Google Assistant détectée (notamment VM venant de
HVLS v0.2.0).

1. Ouvrir **Assistant** ; choisir **Reprendre un fichier d'entités** ou
   **Choisir un autre fichier**. **Partir d'une sélection vide** reste possible
   sans supprimer le fichier existant.
2. Vérifier le YAML avec l'inspecteur admin en lecture seule. Un fichier
   syntaxiquement incorrect est refusé, les anomalies locales restent visibles.
3. Consulter la comparaison avec le catalogue HA actuel :
   - **à ajouter** : `expose: true` explicite, sans autre personnalisation,
     entité présente, éligible et sans label HVLS ;
   - **déjà dans HVLS** : étiquette existante sans conflit ni personnalisation ;
   - **exclue** : `expose: false` sans label HVLS ;
   - **à examiner** : `expose` absent/invalide, nom/pièce/alias personnalisé,
     option non prise en charge, entité absente/inéligible ou conflit.
4. Une seule confirmation humaine permet d'ajouter les labels HVLS proposés
   via l'API existante `set_entity_label`, qui valide l'éligibilité et l'état
   attendu de chaque entité. **Le fichier source n'est pas modifié.**
5. Les labels sont relus, puis le Preview est demandé. Le Preview **n'est pas**
   appliqué automatiquement au YAML de production. Si le fichier est déjà
   présent et n'appartient pas à HVLS, l'Apply habituel reste soumis aux
   règles de propriété et de sauvegarde ; cette PR ne prend pas possession
   d'un fichier manuel.

## Règles de sécurité et de simplicité

- La reprise d'un **fichier d'entités** ne signifie pas la migration de
  Google Assistant ni un changement d'exposition Google Home.
- Le bilan expose seulement des identifiants d'entités au format sûr,
  la directive `expose` et la présence de personnalisations ; jamais la
  valeur des noms, alias, pièces, secrets ou options.
- Inventaire limité à 500 entités ; un inventaire tronqué désactive
  l'ajout groupé.
- La référence au contenu est relue et comparée par empreinte avant le
  premier ajout. Le catalogue HA est relu ; si les candidats diffèrent,
  aucune écriture ne démarre. Chaque ajout utilise ensuite les contrôles
  de concurrence existants du registre HA.
- **Les ajouts successifs ne sont pas atomiques** : en cas d'erreur, HVLS
  s'arrête au premier échec et indique combien de labels ont été ajoutés.
  Pas de rollback improvisé ni de réessai automatique. Les autres labels
  des entités sont préservés.
- Aucune validation d'une source active historique, aucun staging du moteur
  de migration, aucune attestation, migration ou cutover n'est ouvert par
  cette fonctionnalité.

## Test prioritaire sur la VM

Sur la VM de test contenant le fichier non référencé de **52 entités** :

1. Avant de confirmer l'ajout : relever le nombre de labels HVLS, sauvegarder
   la VM et vérifier que la VM ne peut pas commander la production.
2. Sélectionner **Reprendre un fichier d'entités**, vérifier le fichier et
   comparer le bilan de labels. Les entités déjà étiquetées doivent rester
   inchangées ; les `expose: false` et les personnalisations demandent un
   traitement distinct.
3. Contrôler l'identité du YAML original avant/après. Cliquer la confirmation
   seulement sur une VM isolée et jetable.
4. Vérifier les nouvelles étiquettes, les éventuelles anomalies, la génération
   du Preview et l'absence de tout Apply automatique.
5. Après ce test, retrouver le comportement nominal de gestion des entités.

**Cette PR couvre le cas 1 simple.** Les configurations actives propres,
les options personnalisées et les cas ambigus seront traités ensuite à
partir d'essais utilisateur. Elle ne prétend pas terminer la prise en charge
d'un fichier manuel pour son Apply final.
