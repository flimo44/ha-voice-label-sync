# PR #109 — Comparer la politique Google Assistant chargée et le YAML disque

## Pourquoi

Le fichier YAML sur disque et la politique Google Assistant actuellement chargée peuvent diverger si l'utilisateur a modifié le YAML sans recharger l'intégration ou si un rechargement a échoué. Les moteurs des PR #106–#108 ne doivent pas conclure que la politique disque représente automatiquement les paramètres actifs.

## Source de vérité côté HA

Dans Home Assistant Core 2026.10.2 et 2026.11.0, le `GoogleConfig` manuel stocke sa configuration active dans `_config`. Son `async_reload_yaml` remplace `_config` après validation. L'entrée de configuration de source `import` contient `runtime_data`, qui référence cet objet actif.

L'adaptateur `compare_loaded_google_on_ha(hass, discovery)` :
- S'exécute uniquement sur la boucle d'événements HA.
- Identifie une **unique entrée Google Assistant manuelle**, de type `GoogleConfig`, et refuse les cas ambigus (y compris coexistence d'autres entrées Google).
- Lit les seules clés nécessaires depuis l'objet **actif** et non une copie d'options potentiellement périmée.
- Utilise la liste native `DEFAULT_EXPOSED_DOMAINS` de HA si l'option est absente sur disque.
- Ne copie, ne journalise et ne renvoie jamais `project_id`, `service_account`, `secure_devices_pin` ni aucun compte/identifiant.

**Limite :** `GoogleConfig._config` est une API privée de HA, qui peut changer. Le type et la structure sont vérifiés et toute incompatibilité rend le diagnostic « indisponible ». Les tests utilisent un faux HA conforme aux versions inspectées, pas encore une instance HA réelle.

## Comparaison sémantique

Le rapport compare exclusivement :
- `expose_by_default` et les **ensembles** `exposed_domains` (l'ordre des domaines n'a pas de valeur fonctionnelle).
- Pour chaque `entity_config` : présence, `expose`, `name`, `room` et l'ordre des `aliases`.
- Il reconnaît le défaut implicite `expose: true` d'une entrée `entity_config`.
- Il distingue **option absente** et **liste `exposed_domains: []` explicitement vide**.
- Une option invalide sur une seule entité rend **cette entité** indéterminée ; les autres restent comparables.
- La présence d'un blocage global dans l'analyseur disque empêche toute comparaison affirmative.

Les résultats sont `match_compared_fields`, `drift_detected`, `partial_unknown` ou `unavailable`. Pour une différence, seul le nom du champ est retourné ; les anciennes/nouvelles valeurs des noms, pièces et alias ne figurent pas dans ce rapport.

**Un résultat identique ne garantit PAS une parité complète de configuration :** `project_id`, `service_account`, autres paramètres et commentaires, les SHA des fichiers après analyse et l'état de Google Home sont hors de ce comparateur. Une modification d'un paramètre nécessitant un redémarrage n'est donc pas détectée ici. Ne pas afficher « configuration globalement synchronisée » ni autoriser une migration sur la seule base du résultat.

## Sécurité

Aucune écriture YAML, aucune étiquette, aucun service Google, aucun redémarrage ou rechargement. Le résultat est toujours `cutover_allowed: false`. Les erreurs sont décrites par des codes statiques qui ne divulguent ni noms ni secrets de la configuration interne.

## Tests et suite

`tests/test_migration_loaded_policy.py` vérifie les configurations identiques, les changements d'exposition et de métadonnées, les ajouts et suppressions, les defaults, les entrées cloud/ambiguës, les anomalies locales, les erreurs structurales, la confidentialité et l'absence d'écritures.

Prochaine étape : intégrer ce comparateur et la projection précédente dans un diagnostic administrateur à accès restreint, avec une lecture YAML hors boucle d'événements, puis valider les API internes sur une instance Home Assistant isolée. **Aucune migration autorisée à cette étape.**

Sources :
- https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/http.py
- https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/__init__.py
- https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/const.py
