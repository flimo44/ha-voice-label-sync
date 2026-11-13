# Restauration et réconciliation des labels HVLS — PR #154

## Cause racine

Les sauvegardes historiques ne conservent que le YAML Google Assistant.
Le Preview est généré à partir des labels HA actuels. Restaurer un fichier à
quatre entités quand seulement trois labels sont présents est une restauration
valide du fichier, mais **pas** une configuration HVLS cohérente. Un Apply
ordinaire peut réécrire trois entités et annuler le résultat.

La bêta 4 avait volontairement interdit à Restore de modifier les registres
HA ; les anciens tests vérifiaient cela. Il manquait un contrat fonctionnel
de réconciliation avant de reprendre les générations.

## Nouveau contrat pour les restaurations effectuées après #154

1. Vérifier la sauvegarde sélectionnée et la production via les empreintes
   SHA-256 et l'identité de propriété HVLS existantes.
2. Installer **avant l'écriture** un garde durable sous
   `.hvls/restore_reconciliation.json` (empreintes originales et cibles,
   ID du backup et installation HVLS). La création exclusive est synchronisée
   sur le disque ; un enregistrement illisible bloque les écritures.
3. Restaurer le YAML via le moteur d'écriture atomique existant, avec sa
   sauvegarde de sécurité obligatoire. **Les labels HA ne sont pas modifiés
   implicitement.**
4. Pendant la réconciliation, les **points d'écriture normaux de l'intégration
   HA** (Apply et service de génération) refusent de modifier la production.
   Le blocage survit à un redémarrage ; les endpoints restent verrouillés
   côté serveur même si l'interface affiche des données périmées.
5. Dans Preview, l'administrateur peut :
   - **Conserver la configuration restaurée** : rétablir, après confirmation,
     les labels manquants uniquement pour les entités éligibles sans label,
     régénérer uniquement le Preview et comparer. Si les entités sont
     équivalentes (y compris `name`/`room`/`aliases`), clôturer le garde.
   - **Conserver les labels HA actuels** : accepter explicitement que le futur
     Apply puisse réécrire la production restaurée ; clôturer le garde puis
     déclencher séparément un éventuel Apply.
6. Le serveur revalide les empreintes du Preview et de la production, l'état
   de propriété, **et le contenu d'une génération neuve depuis les registres
   HA actuels**, sous le verrou partagé de l'intégration et le verrou fichier.
   Aucun Apply ou changement du YAML n'a lieu pendant cette décision.

## Limites et échecs

- Les anciennes sauvegardes n'enregistrent **pas** l'historique exact des
  labels. L'ajout de labels est une réconciliation volontaire, pas une
  restauration complète des anciens registres HA.
- Un nom, une pièce, un alias ou une option personnalisée non reproductible
  depuis les registres peut empêcher la concordance ; l'Apply reste bloqué
  tant que la décision n'est pas prise.
- Une modification du fichier ou une erreur de sauvegarde, de registre ou
  d'empreinte entraîne un refus. En cas de restauration interrompue, le garde
  reste présent : **on ne supprime pas le fichier de garde à la main**.
  Une résolution `cancel_failed` n'est autorisée que si le YAML original
  et la propriété sont encore vérifiés ; le parcours automatique de récupération
  des écritures incomplètes demeure une étape distincte.
- Cette protection est intégrée au composant HA, afin de fonctionner avec
  la dépendance PyPI actuelle `ha-voice-label-sync==0.3.6`, sans imposer
  de publier une nouvelle version du cœur avant les essais VM.
- Aucun mécanisme ne peut empêcher un utilisateur root ou une application
  extérieure à HVLS de modifier directement le fichier ; le garde protège
  les **écritures de l'intégration HVLS**, pas le système entier.

## Scénarios de non-régression essentiels

- 4 labels → retrait d'1 → Apply (3) → restauration du YAML (4) →
  tentative Apply **refusée** → confirmation du rétablissement du label →
  Preview à 4 → réconciliation validée → YAML à 4 inchangé.
- Même scénario après redémarrage HA : l'Apply reste refusé.
- Choix explicite « labels actuels » : déblocage séparé, sans Apply automatique.
- Fichier restauré modifié ou empreinte périmée : refus.
- Label manquant, inéligible ou conflit : aucun ajout silencieux.
- Restauration interrompue : garde persistant, pas d'écriture ordinaire.
- Ancienne configuration sans garde : comportement antérieur conservé ;
  les restaurations faites avant la PR ne deviennent pas automatiquement
  des transactions protégées.
