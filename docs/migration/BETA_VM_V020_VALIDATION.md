# Plan de validation bêta sur une VM Home Assistant isolée — PR #134

Ce plan est conçu pour une VM de test restée sur **HA Voice Label Sync
v0.2.0**, et pour une **copie locale** de la configuration actuelle de
production. Ce sont deux scénarios différents : il ne faut pas remplacer
l'état v0.2.0 avant d'avoir testé sa mise à niveau.

**Important : nous n'avons pas encore exécuté ces essais sur cette VM.**
Cette PR fournit le protocole, le précontrôle local et des tests automatisés
sur des exemples fictifs. Elle n'active toujours pas le staging dormant.

## 0. Conditions préalables et isolement (à valider humainement)

1. Sauvegarder la VM telle qu'elle est maintenant, **avec HVLS v0.2.0**.
   Conserver une restauration complète des disques/registries ainsi qu'un
   second point de restauration pour le scénario de copie de production.
   Pour une sauvegarde à chaud, tester explicitement la restauration.
2. Éteindre la VM de test et **couper ses accès aux équipements réels et
   aux services externes depuis l'hyperviseur** avant de restaurer une
   copie de production : aucun pont vers le LAN domotique, aucun accès
   MQTT, broker de production, Zigbee/Z-Wave, Jeedom, Node-RED, n8n,
   cloud Google, Freebox/VPS, webhooks ou notifications. Un simple NAT
   connecté à Internet **n'est pas une isolation**.
3. S'assurer que l'on dispose d'un accès local/console à la VM lorsque
   son réseau est coupé. Identifier le mécanisme permettant de rétablir
   la VM de test sans modifier l'original.
4. Si l'on copie des éléments de `.storage`, des secrets ou
   `configuration.yaml`, les conserver **uniquement dans la copie privée
   hors ligne**. Ils peuvent contenir jetons d'intégrations, identifiants
   uniques, adresses internes et accès à des équipements. **Ne pas
   les publier sur GitHub, les coller dans une PR ou les partager en
   pièce jointe.**
5. Si la VM est un clone complet de la production, elle peut contenir
   les **mêmes identifiants d'instance, tokens et automatismes**.
   Ne jamais l'exécuter avec l'accès à la production. Le simple fait
   de démarrer HA peut déclencher des connexions et des automatismes.
6. Le précontrôle fourni ici inspecte des **noms de clés YAML**, sans
   vérifier les intégrations effectivement chargées depuis `.storage`,
   les identités réseau ou les effets externes. **Il ne peut pas lever
   ces conditions**, même lorsqu'il affiche un YAML correctement lu.

**Règle de sécurité :** aucun essai dans cette PR ne doit modifier
l'instance HA de production ; aucune opération de migration réelle n'est
autorisée sur la VM avant une validation distincte du protocole exécutable.

## 1. Scénario A — Mise à niveau depuis HVLS v0.2.0

Conserver le contenu et l'état originaux de la VM v0.2.0 pour cet essai.

- Relever la version HVLS **v0.2.0** et celle de **Home Assistant Core**
  séparément. La version de HA n'est pas nécessairement celle de HVLS.
- Avant mise à niveau, relever les nombres d'entités sélectionnées,
  exclues, sans label, désactivées et les noms des labels (en local).
  Conserver les YAML Google Assistant et les journaux de diagnostic
  **dans la sauvegarde privée**, non dans les résultats publics.
- Exécuter le précontrôle sur une copie locale *déjà isolée*.
- Mettre à niveau **HVLS seulement** vers la version de développement
  approuvée, sans activer une migration, un cutover, un redémarrage
  Google Assistant ni un Apply automatique.
- Valider que le config flow se charge, que la sélection existante
  n'est pas perdue, que les sauvegardes et l'aperçu restent accessibles,
  et qu'aucune exposition par défaut n'a été créée silencieusement.
- Comparer le SHA source de départ et celui d'arrivée. Sans édition
  intentionnelle, il doit être identique.
- Vérifier les logs HA et les erreurs frontend, la résilience aux
  redémarrages et la possibilité de revenir à la sauvegarde v0.2.0.

Si une migration automatique ou un ajout de label non approuvé est observé :
**arrêt du test, conservation des logs privés et retour au snapshot**.

## 2. Scénario B — Nouvelle installation sur configuration type production

Restaurer la VM à un **état distinct** du scénario A (snapshot dédié).
Ce scénario nécessite une copie de production faite hors ligne, après
l'isolation réseau de la VM.

- Restaurer une **copie de configuration de production** cohérente.
  Les registres des entités, devices, areas et labels peuvent contenir
  des informations essentielles à la migration; les copier seulement
  dans un clone entièrement isolé. Ne pas écraser à la main les fichiers
  `.storage` pour supprimer HVLS : préférer une vraie installation
  neuve ou les mécanismes HA prévus à cet effet.
- Le YAML Google Assistant de la copie peut ensuite être modifié
  volontairement. Le YAML d'origine de production reste intact.
- Démarrer la VM isolée. Les dispositifs absents ou déconnectés peuvent
  être en état `unavailable` ; **cela ne prouve jamais qu'une entité
  doit être supprimée ou désexposée**.
- Effectuer une découverte et une revue **lecture seule**, puis comparer
  les résultats avec les intentions YAML de production et le registre HA.
- Vérifier que la personnalisation existante (nom, pièce, alias,
  `expose: false`, domaines autorisés, politique `expose_by_default`)
  n'est ni ignorée ni silencieusement réécrite.
- Pour cette PR, ne pas autoriser le staging dormant : nous testons la
  **collecte et la qualification**, pas une migration effective.

## 3. Outil local de précontrôle sans mutation

`tools/migration_vm_preflight.py` n'écrit aucun fichier de configuration.
Il exige Python et PyYAML, et utilise l'analyseur de migration existant.

Sur une **copie déjà isolée** accessible depuis le clone local du dépôt :

```bash
python3 tools/migration_vm_preflight.py --config-dir /CHEMIN/COPIE_HA_ISOLEE
```

Le rapport JSON affiche notamment :
- le type de source `assisted_migration` ou `new_configuration` ;
- le nombre d'entrées YAML explicites, exclues et à examiner ;
- les codes d'anomalies (sans noms des entités ni contenu YAML) ;
- les catégories de risques décelables dans les **clés de premier niveau**
  de `configuration.yaml` ;
- l'empreinte SHA-256 des fichiers YAML de la configuration Google.

Consigner **localement** `source.fingerprint_sha256`, puis relancer
ultérieurement :

```bash
python3 tools/migration_vm_preflight.py \
  --config-dir /CHEMIN/COPIE_HA_ISOLEE \
  --expected-source-sha256 EMPREINTE_DE_REFERENCE
```

Un code de retour `2` signale une lecture bloquée, un format non sûr ou
une divergence des fichiers par rapport à la référence. Un code `0`
signifie uniquement **inspection locale terminée** : jamais « réseau
isolé », « sauvegarde restaurable » ou « autorisé à migrer ».

Le rapport ne contient **aucune valeur de secret, aucun ID d'entité,
aucun alias, aucun nom de pièce, aucun chemin ni contenu YAML**.
Il n'inspecte pas le contenu des fichiers `secrets.yaml` ou de la
base `.storage/core.config_entries`. Seuls les noms de catégories
et des compteurs anonymisés sont émis. Les SHA sont des empreintes
de fichiers privés, pas des signatures d'autorisation.

### Exécution depuis Unraid, sans réseau dans le conteneur

Si l'image Home Assistant de test est déjà disponible localement et
si le dépôt est présent sur l'hôte, le script peut aussi être lancé
hors de HA (adapter les chemins **des copies**, jamais ceux de la
production) :

```bash
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --entrypoint python3 \
  -v /CHEMIN/DEPOT_HVLS:/repo:ro \
  -v /CHEMIN/COPIE_HA_ISOLEE:/test-ha:ro \
  ghcr.io/home-assistant/home-assistant:2026.11.0 \
  /repo/tools/migration_vm_preflight.py --config-dir /test-ha
```

C'est un **exemple**, pas une commande directement exécutable avec les
chemins de ton installation. Il ne contacte pas les équipements de
production, mais l'image peut nécessiter un téléchargement *avant*
son utilisation hors ligne.

## 4. Matrice des essais à réaliser sur les deux états VM

| ID | Action sur la COPIE de test | Attendu |
|---|---|---|
| T01 | HVLS v0.2.0 → version candidate | Démarrage sans écriture non demandée |
| T02 | Nouvelle installation sur copie production | Discovery / review sans stage |
| T03 | Entité existante compatible | Proposition d'import, sans écriture |
| T04 | Entité absente, indisponible, renommée | Anomalie locale ; pas de suppression automatique |
| T05 | `expose: false` | Exclusion préservée et visible |
| T06 | `name`, `room`, `aliases` personnalisés | Valeurs préservées ou risque explicite |
| T07 | `expose_by_default: true` ou domaine implicite | Risque global signalé avant cutover |
| T08 | Une seule option d'entité invalide mais YAML lisible | Cas isolé ; les autres restent examinables |
| T09 | Duplicate YAML key / include absent | Bloquage global ; aucune action |
| T10 | Ajout/retrait de label par autre acteur | Snapshot/CAS périmé ; refus |
| T11 | Journal avec `intent` après crash simulé | Aucune reprise/ACK automatique |
| T12 | Préparation, confirmation, jeton rejoué | Deuxième confirmation refusée |
| T13 | Deux admins / entité concurrente | Conflit explicite et état conservé |
| T14 | Réinitialisation de la VM après les essais | Retour au snapshot vérifié |
| T15 | Comparaison YAML avant/après en mode observation | Empreinte source inchangée |
| T16 | Google Home / automations externes | **Non testés hors ligne** ; ne pas affirmer leur sûreté |

Les T10–T13 sont déjà exercés dans les tests automatisés et le sandbox
HA Core natif. Sur la VM personnelle, ils restent des scénarios
progressifs, **uniquement lorsque la version candidate offrira
effectivement le parcours concerné et que la sûreté de la VM aura été
vérifiée**. En particulier, ne pas modifier à la main les journaux
protégés pour simuler un crash, ni provoquer une coupure d'écriture
sur la VM sans snapshot dédié.

## 5. Critères d'entrée en bêta de migration

Les points suivants doivent être observables, pas présumés :

- Zéro action sur la production (HA, broker, Google Home, Jeedom,
  Node-RED, n8n, équipements et notifications).
- Snapshots test VM avant et après, et **restauration réellement
  vérifiée**, pas uniquement un fichier de backup présent.
- Source Google d'origine conservée octet pour octet en mode lecture
  seule ; dérive détectée avant tout write.
- Erreur locale sur une entité sans effacement ni blocage injustifié
  des autres ; erreurs globales réellement bloquantes.
- Exclusions et attributs personnalisés conservés ou signalés.
- Contrôles de concurrence, de rejouement, de redémarrage, de
  journal `intent` et de rollback non autorisé validés.
- Test de l'autorisation **réellement exécutable** et de ses barrières
  transactionnelles en sandbox avant de permettre des mutations dans
  la VM de test. Ce contrôle **n'existe pas encore** en #134.
- Test séparé des effets Google Home / consommateurs externes dans un
  environnement délibérément contrôlé avant de déclarer la migration
  complète sûre. Un conteneur `--network none` ne peut pas le vérifier.

**Retour d'expérience partageable :** les compteurs agrégés, codes
d'anomalies et résultats de la matrice, plus logs épurés. **Ne pas
transmettre** `configuration.yaml`, `secrets.yaml`, `.storage`, des
jetons, noms d'entités personnalisés ou des exports Google de production.

### Invariants

Toujours `execution_authorized = false`, `stage_allowed = false`,
`cutover_allowed = false` pour le précontrôle de cette PR.
Ce plan n'active aucun WebSocket de staging et ne modifie aucun registre HA.
