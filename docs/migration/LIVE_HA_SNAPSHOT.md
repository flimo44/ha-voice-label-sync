# PR #108 — Snapshot des entités Home Assistant pour la migration

## Sources natives consultées

Lorsque l'adaptateur est invoqué sur le thread principal de Home Assistant :

1. Le registre des états (hass.states.async_all()) fournit la liste des entités actuellement présentes. Une entité désactivée peut encore exister dans le registre sans état actif.
2. Le registre natif des entités (entity_registry.async_get(hass)) donne les indicateurs hidden_by, entity_category et disabled_by, sans modifier leurs valeurs ni leurs labels.
3. Le contrôle natif supported_traits_for_state(state) de Google Assistant indique si au moins une fonctionnalité Google est supportée. Une erreur isolée donne le statut inconnu pour l'entité concernée.
4. La constante native DEFAULT_EXPOSED_DOMAINS évite d'inventer la liste de domaines exposés lorsque l'option YAML est absente.

Sources vérifiées : Home Assistant Core 2026.10.2 et 2026.11.0, fichiers google_assistant/{helpers.py,const.py,http.py,smart_home.py}.

## Principes d'exécution

Le code est strictement en lecture seule, sans appels aux services Google ni mise à jour de registre. Il ne retourne ni données privées des états HA, ni labels, ni PIN, ni secrets, ni texte d'exception.

- Snapshot complet : inventaires d'états et de registre récupérés, contrôle des fonctionnalités réussi pour toutes les entités actives.
- Snapshot partiel : inventaires complets, mais fonctionnalité d'une ou plusieurs entités indéterminée. Les autres entités peuvent néanmoins être classées.
- Snapshot indisponible : registre inaccessible, API native manquante, identifiants en double ou erreur globale de capture. Aucun résultat d'exposition ne doit alors être certifié.

La fonction project_discovery_on_live_ha(hass, discovery) rapproche ce snapshot du modèle de la PR #107. Elle n'effectue jamais de lecture de fichier YAML. L'analyse disque de la PR #106 doit être faite hors du thread Home Assistant.

**Limite critique :** l'adaptateur n'a pas encore vérifié que les règles du fichier YAML découvertes sur disque sont exactement celles actuellement chargées par l'intégration Google Assistant. Ainsi, runtime_policy_verified reste systématiquement false, et cutover_allowed reste false. Même une projection positive ne prouve pas ce qui apparaît effectivement dans l'application Google Home ni la préservation de ses pièces/routines.

## Tests

Le fichier tests/test_migration_live_snapshot.py contient des tests contre des simulations des interfaces natives HA :

- États actifs, entités masquées, auxiliaires, désactivées ou sans registre.
- Fonctionnalités Google supportées, incompatibles, inconnues ou en échec.
- Liste de domaines par défaut issue de la constante native.
- Refus des inventaires contradictoires et récupération après échec global.
- Absence d'écritures et non-divulgation des attributs privés.

Ces tests valident l'adaptateur sur des interfaces simulées. Une validation sur une instance Home Assistant isolée restera nécessaire pour confirmer le comportement réel.

## Suite

Comparer les réglages Google Assistant réellement chargés en mémoire aux sources YAML analysées, puis exposer un diagnostic administrateur en lecture seule. Aucune migration automatique n'est prévue dans cette PR.
