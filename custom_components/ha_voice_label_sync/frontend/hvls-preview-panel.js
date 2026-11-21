const HVLS_INELIGIBLE_REASONS = Object.freeze([
  "domain_not_enabled",
  "unsupported_device_class",
  "disabled",
  "hidden",
  "entity_category",
  "other",
]);

const HVLS_TRANSLATIONS = {
  fr: {
    generate: "Générer le Preview",
    refresh: "Actualiser toutes les données",
    copy: "Copier YAML",
    apply: "Appliquer le Preview",
    settings: "Paramètres",
    menu: "Ouvrir le menu Home Assistant",
    tabStats: "Statistiques",
    tabExclusions: "Entités exclues",
    tabEntities: "Gestion des entités HVLS",
    tabPreview: "Preview",
    tabBackups: "Sauvegardes",
    tabMigration: "Assistant",
    migrationIntro: "HVLS génère votre fichier d'entités à partir des labels Home Assistant. La gestion des labels n'exige pas que Google Assistant soit connecté. Les analyses sont en lecture seule ; tout ajout de label ou Apply demande une confirmation explicite.",
    migrationGuideTitle: "Identifions votre situation",
    migrationGuideStepIdentify: "Étape 1 — Identifiez votre situation",
    migrationGuideStepVerify: "Étape 2 sur 2 — Vérifiez les points indiqués",
    assistantProvenanceStepVerify: "Vérifiez le fichier YAML à reprendre",
    migrationManagedNotice: "Le fichier de production est pris en charge par HVLS. Pour modifier les entités, utilisez le Preview. Les anciens diagnostics restent disponibles dans les outils avancés.",
    migrationGuideDetected: "Aucune déclaration google_assistant: détectée. Cela n'empêche pas HVLS de gérer et générer le fichier d'entités.",
    migrationGuideCandidate: "Un fichier google_assistant_entities.yaml existe. Vous pouvez le reprendre pour initialiser vos labels HVLS, même sans connexion Google Assistant.",
    migrationGuideNoCandidate: "Aucun fichier google_assistant_entities.yaml habituel n'a été détecté. D'autres sources peuvent néanmoins exister.",
    migrationGuideQuestion: "Comment souhaitez-vous démarrer HVLS ?",
    migrationGuideNew: "Choisir mes entités dans HA",
    migrationGuideExisting: "Reprendre un fichier d'entités",
    migrationGuideUnsure: "Choisir un autre fichier",
    migrationGuideNextNew: "Choisissez les entités dans Gestion des entités HVLS. Les étiquettes déjà présentes sont conservées. Le Preview reste obligatoire avant toute modification.",
    migrationGuideNextExisting: "Vérifiez le fichier d'entités, puis examinez les labels à reprendre. Aucune connexion Google Assistant n'est requise.",
    migrationGuideNextUnsure: "Indiquez le chemin relatif du fichier YAML à reprendre, puis vérifiez son contenu.",
    migrationGuideAwaitChoice: "Choisissez : reprendre le fichier, choisir un autre fichier ou repartir de zéro.",
    migrationGuideNoAuthorization: "Ce choix est local à cet écran ; il ne valide aucune migration et n'autorise aucune écriture.",
    assistantSourceFound: "Configuration Google Assistant détectée",
    assistantSourceSummary: "{entries} entité(s) déclarée(s). Fichiers analysés : {paths}. Aucune exposition Google Home certifiée.",
    assistantPackagesDetected: "Configuration par packages détectée : classée « Autre configuration », non analysée automatiquement.",
    assistantPackagesQuestion: "Indiquez manuellement le fichier YAML contenant les entités à examiner.",
    assistantFileHelp: "ⓘ Voir les exemples de syntaxe YAML",
    assistantGoogleConnectionHint: "Raccordement Google Assistant non détecté dans la configuration analysée. Consultez les exemples ci-dessous pour vérifier configuration.yaml. HVLS peut gérer les entités sans ce raccordement.",
    assistantExampleDirect: "Dans configuration.yaml :",
    assistantExampleProjectId: "VOTRE_PROJECT_ID",
    assistantExampleInclude: "Variante avec fichier inclus dans configuration.yaml :",
    assistantExampleIncludedContent: "Dans google_assistant.yaml :",
    assistantExampleNote: "Adaptez project_id au projet Google et SERVICE_ACCOUNT.json à votre fichier de compte de service (sans afficher son contenu). project_id et service_account sont obligatoires pour la configuration manuelle ; report_state est facultatif. Vérifiez la configuration avant toute modification d'une installation active : ces exemples ne prouvent pas la connexion Google Home. secure_devices_pin (facultatif, à décommenter) est le code à dire pour ouvrir une serrure, désarmer une alarme ou ouvrir une porte ou un portail ; mettez-le dans secrets.yaml, entre guillemets (par exemple google_secure_pin: \"1234\").",
    assistantFileTitle: "Fichier des entités",
    assistantFileCandidate: "Fichier détecté proposé ; vous pouvez modifier ce chemin.",
    assistantFileManual: "Indiquez le chemin du fichier YAML des entités.",
    assistantFilePathLabel: "Chemin relatif au dossier de configuration Home Assistant",
    assistantFilePlaceholder: "google_assistant_entities.yaml",
    assistantFileCheck: "Vérifier le fichier (lecture seule)",
    assistantFileChecking: "Contrôle en lecture seule…",
    assistantFileNotChecked: "Aucun fichier vérifié pour le moment.",
    assistantFileChecked: "{entries} entité(s) déclarée(s) · {anomalies} anomalie(s) structurelle(s) locale(s) détectée(s).",
    assistantFileIssues: "À examiner : {issues}. Corrigez si nécessaire, puis revérifiez.",
    assistantFileNoIssues: "Aucune anomalie structurelle détectée. Cela ne garantit pas une configuration active ou une exposition Google Home.",
    assistantFileCannotRead: "Impossible de lire le fichier : {reason}.",
    assistantFileUnavailable: "Contrôle indisponible. Aucune modification effectuée.",
    assistantFileSafety: "La lecture ne prouve pas une exposition dans Google Home. Aucun label ni YAML n'est modifié sans une action distincte et confirmée.",
    migrationGuideSelectedExisting: "Reprise d'un fichier existant sélectionnée. Vous pouvez changer de choix.",
    migrationGuideSelectedNew: "Parcours choisi : nouvelle configuration. Vous pouvez modifier votre choix ci-dessous.",
    migrationGuideSelectedUnsure: "Choix d'un autre fichier sélectionné. Indiquez son chemin ci-dessous.",
    assistantFileMetricEntries: "Entités déclarées",
    assistantFileMetricTrue: "expose: true",
    assistantFileMetricFalse: "expose: false",
    assistantFileMetricUnset: "expose absent",
    assistantFileMetricIssues: "Entités à examiner",
    assistantFileUnreferencedConclusion: "Ce fichier est lisible et peut servir à initialiser les labels HVLS. L'absence de raccordement Google Assistant est un avertissement, pas un blocage de gestion. Le fichier original sera conservé.",
    assistantFilePackagesConclusion: "Un fichier lisible ne suffit pas à identifier la configuration utilisée par les packages. Ceux-ci restent classés « Autre configuration » et ne peuvent pas être migrés automatiquement.",
    assistantFileGeneralConclusion: "Cette vérification porte uniquement sur le contenu du fichier, sans établir les règles globales Google Assistant ni l'exposition effective dans Google Home.",
    assistantFileUnsetExplanation: "Une entrée sans champ expose n'est pas considérée comme expose: true. Son exposition éventuelle dépend d'autres réglages et n'est pas établie ici.",
    assistantFileResultsTitle: "Bilan de lecture du fichier",
    assistantAdoptTitle: "Reprendre les entités dans HVLS",
    assistantAdoptIntro: "Reprise de l'ancien YAML avec les entités actuellement disponibles dans HA. D'abord sauvegarder et récupérer la gestion, puis préparer le Preview. Aucun changement sans validation.",
    assistantAdoptNoCatalog: "Le catalogue des entités Home Assistant n'est pas chargé. Actualisez la comparaison avant de poursuivre.",
    assistantAdoptRefresh: "Actualiser la comparaison des labels",
    assistantAdoptCounts: "{total} dans l'ancien YAML · {recoverable} récupérables · {existingNew} déjà étiquetées en plus dans HA · {nextTotal} proposées au total · {missing} absentes · {ineligible} non éligible(s) · {review} à vérifier.",
    assistantAdoptReview: "Détail des entités et décisions proposées",
    assistantAdoptReasonAdd: "Ajouter le label HVLS",
    assistantAdoptReasonAlready: "Déjà dans HVLS",
    assistantAdoptReasonExclude: "Exclue (expose: false) — aucun ajout",
    assistantAdoptReasonReview: "À examiner manuellement",
    assistantAdoptReviewYamlIssue: "Anomalie dans la déclaration YAML",
    assistantAdoptReviewInvalidExposure: "Valeur expose invalide",
    assistantAdoptReviewMissingEntity: "Entité absente du catalogue HA",
    assistantAdoptReviewImplicitExposure: "Directive expose absente : intention inconnue",
    assistantAdoptReviewUnknownLabel: "État du label HVLS inconnu",
    assistantAdoptReviewExcludedLabeled: "expose: false mais label HVLS présent",
    assistantAdoptReviewIneligible: "Entité non éligible à la génération",
    assistantAdoptReviewUnlabeledCustom: "Sans label HVLS ; personnalisations YAML à préserver",
    assistantAdoptCustomValuesUnverified: "Nom, pièce ou alias du YAML non comparés aux valeurs générées",
    assistantAdoptLimits: "Les entités absentes ou non éligibles seront supprimées du nouveau YAML uniquement. Le Preview montrera aussi les changements de noms, pièces et alias : vérifiez-les avant validation.",
    assistantAdoptAction: "Préparer le Preview de reprise ({count} entités)",
    assistantAdoptNone: "Aucune entité récupérable : impossible de préparer un nouveau YAML.",
    assistantTakeoverTitle: "Confier le fichier existant à HVLS",
    migrationChangeChoice: "Changer de méthode (facultatif)",
    importPreviewDanger: "ATTENTION : ce Preview ordinaire est généré à partir des étiquettes HA actuelles, ce n'est PAS une reprise du fichier existant. {count} entités sur {total} seraient supprimées du YAML. Ne l'appliquez pas avant d'avoir terminé la reprise dans l'Assistant.",
    importPreviewReturn: "Retourner à l'Assistant",
    assistantReinstallTitle: "Récupérer le fichier après réinstallation",
    assistantReinstallIntro: "L'ancienne configuration sera analysée avec les entités actuelles de HA. HVLS sauvegarde le fichier avant de récupérer sa gestion. Ensuite, validez les changements dans Preview.",
    assistantReinstallAction: "Vérifier et récupérer la gestion",
    assistantRecoveryTakeoverConfirm: "Ancienne configuration : {total} entités.\nRécupérables : {recoverable}.\nAbsentes de HA : {missing}.\nNon éligibles : {ineligible}.\n\nCréer une sauvegarde vérifiée puis confier le fichier à HVLS ? Aucune modification du YAML ni des étiquettes à cette étape.",
    assistantRecoveryChangedNote: "Attention : le fichier actuel diffère de celui enregistré par l'ancienne installation. La sauvegarde protège le fichier ACTUEL.\n\n",
    assistantRecoveryReady: "Gestion récupérée après sauvegarde vérifiée. Préparez maintenant le Preview de reprise.",
    assistantRecoveryPreviewPrepared: "Preview de reprise prêt. Vérifiez les suppressions et les modifications du YAML avant d'appliquer.",
    assistantRecoveryPreviewFailed: "Préparation du Preview refusée : {error}. Aucune étiquette ni YAML modifié.",
    assistantRecoveryNotPrepared: "Aucun Preview de reprise préparé. Ajouts, suppressions et modifications en attente : zéro. Commencez par l’Assistant.",
    assistantRecoveryPreviewBack: "Ouvrir l’Assistant",
    assistantRecoveryApply: "Valider la reprise de configuration",
    assistantRecoveryApplyConfirm: "Appliquer la reprise vérifiée ? Le YAML actuel sera sauvegardé obligatoirement avant la mise à jour des étiquettes et du fichier. Les entités retirées ne seront supprimées que du YAML.",
    assistantRecoveryApplied: "Reprise terminée : {count} entités dans le nouveau YAML. Sauvegarde : {backup}.",
    assistantReinstallConfirm: "Transférer la gestion de {path} vers cette installation HVLS ?\n\nLa précédente installation doit être absente de Home Assistant. Le YAML actuel et le registre seront vérifiés, puis une sauvegarde sera créée. Aucun Apply ni changement d’étiquette automatique.",
    assistantReinstallChangedConfirm: "ATTENTION : le fichier actuel n’est PLUS celui enregistré par l’ancienne installation.\n\nAncien SHA-256 : {oldSha}\nSHA-256 actuel : {newSha}\nEntités actuelles : {entities}\nPreview ordinaire : {added} ajout(s), {removed} suppression(s), {modified} modification(s).\n\nAutoriser uniquement la récupération de gestion, après sauvegarde vérifiée ? AUCUN YAML ni label modifié. NE PAS appliquer le Preview ordinaire avant d’avoir réconcilié les entités.",
    assistantReinstallChangedSuccess: "Gestion du fichier remplacé récupérée avec sauvegarde vérifiée : {backup}. Les entités et le YAML n’ont pas changé. ATTENTION : le Preview ordinaire reste différent ; ne l’appliquez pas avant une reprise contrôlée des entités.",

    assistantTakeoverIntro: "Vérifiez les entités récupérables. HVLS sauvegarde le fichier actuel puis prend en charge sa gestion. Le YAML sera actualisé uniquement après approbation du Preview.",
    assistantTakeoverAction: "Vérifier et reprendre ce fichier",
    assistantTakeoverConfirm: "Confier le fichier {path} à HVLS ?\n\nEntités actuelles : {entities} ({issues} à examiner).\nDifférences proposées par le Preview : {added} ajout(s), {removed} suppression(s), {modified} modification(s).\n\nUne sauvegarde obligatoire sera créée. Le fichier de production ne sera PAS modifié et aucun Apply ne sera lancé. Seule sa gestion future par HVLS sera autorisée.",
    assistantTakeoverSuccess: "Fichier repris par HVLS. Sauvegarde vérifiée : {backup}. Aucun Apply effectué. Examinez les différences dans Preview avant toute application.",
    assistantTakeoverFailure: "Reprise refusée ou incomplète : vérifiez le fichier, les sauvegardes et le statut de propriété, puis actualisez. Aucun Apply automatique.",
    assistantTakeoverRegistrationFailed: "Sauvegarde créée, mais le transfert de propriété a échoué. Consultez les journaux Home Assistant (HVLS recovery) avant un nouvel essai.",
    assistantTakeoverBusy: "Vérification et sauvegarde du fichier en cours…",
    assistantAdoptConfirm: "Ajouter les labels HVLS aux {count} entités compatibles ? Le fichier YAML source et Google Assistant ne seront pas modifiés. Chaque ajout est contrôlé séparément : en cas d'échec, les ajouts déjà effectués sont conservés et signalés.",
    assistantAdoptBusy: "Ajout des labels HVLS : {done} / {total}",
    assistantAdoptDone: "{count} label(s) ajouté(s). Le YAML d'origine est conservé ; un nouveau Preview a été demandé. Vérifiez-le avant toute application.",
    assistantAdoptStopped: "{count} label(s) confirmé(s) avant interruption. Vérifiez le catalogue actualisé : une opération sans réponse peut avoir été appliquée. Aucun réessai automatique.",
    assistantAdoptStale: "Fichier ou catalogue changé depuis la vérification. Recommencez l'analyse avant de préparer un Preview.",
    assistantAdoptNeedsReview: "Les différences entre l'ancien YAML et HA actuel apparaîtront dans le Preview. Les absentes et non éligibles ne bloquent pas les autres.",
    assistantAdoptTruncated: "Le fichier comporte trop d'entrées pour une reprise complète ; aucun ajout groupé n'est proposé.",
    assistantProvenanceAdvanced: "ⓘ Origine du fichier et recherches dans les sauvegardes (facultatif)",
    assistantProvenanceStep: "Origine du fichier (facultatif)",
    assistantProvenanceQuestion: "À votre connaissance, d'où vient ce fichier ?",
    assistantProvenanceOld: "Il appartenait à une ancienne configuration Google Assistant",
    assistantProvenanceUnknown: "Je ne connais pas son origine",
    assistantProvenanceNew: "Il a été préparé pour une nouvelle configuration",
    assistantProvenanceVerifiedTitle: "Constat vérifié par HVLS",
    assistantProvenanceVerified: "Le fichier YAML a été lu et ses déclarations ont été comptées. Aucun changement n'a été réalisé.",
    assistantProvenanceAnomalies: "{count} entité(s) présentent des anomalies locales : les autres restent analysables. Chaque anomalie doit être examinée avant toute décision concernant l'entité.",
    assistantProvenanceMissingTitle: "Ce qui reste à établir",
    assistantProvenanceMissing: "Aucune référence google_assistant: à ce fichier n'a été trouvée dans la configuration analysée. Les règles globales d'exposition, la configuration réellement chargée et l'état des appareils dans Google Home ne sont pas établis.",
    assistantProvenanceNextTitle: "Prochaine vérification conseillée",
    assistantProvenanceNextOld: "Recherchez une ancienne sauvegarde de configuration.yaml et, le cas échéant, le fichier inclus google_assistant.yaml. Vérifiez si entity_config référençait ce fichier et quels paramètres expose_by_default et exposed_domains étaient appliqués. Ne réactivez rien pour cette vérification.",
    assistantProvenanceNextUnknown: "Consultez vos sauvegardes Home Assistant et les anciens fichiers Google Assistant pour retrouver une référence explicite à ce fichier et les règles globales. Tant que la provenance reste inconnue, conservez ce fichier comme indice et non comme source de migration.",
    assistantProvenanceNextNew: "Ce fichier peut servir à préparer une nouvelle configuration, mais ce n'est pas une migration attestée. Revenez au parcours « nouvelle configuration » si c'est bien votre objectif ; n'activez pas automatiquement Google Assistant.",
    assistantProvenanceNextChoose: "Choisissez une provenance ci-dessus pour afficher les recherches adaptées à votre situation.",
    assistantProvenanceSafety: "Votre réponse est uniquement une indication locale, non enregistrée. Elle ne certifie ni une ancienne exposition ni l'état Google Home et ne débloque aucune étape de migration.",
    assistantProvenanceCategory: "Provenance déclarée, non vérifiée",
    assistantProvenanceSourceLabel: "Fichier examiné",
    assistantProvenanceChecklistTitle: "Comment retrouver la configuration d'origine ?",
    assistantProvenanceChecklistTrigger: "ⓘ Guide pratique : où chercher dans une sauvegarde",
    assistantProvenanceChecklistIntro: "Ces vérifications se font manuellement sur une copie de sauvegarde ; HVLS ne parcourt, n'extrait et ne modifie aucune sauvegarde à cette étape.",
    assistantProvenanceChecklist1: "Ouvrez une copie d'une ancienne sauvegarde Home Assistant sans la restaurer sur votre instance active.",
    assistantProvenanceChecklist2: "Dans configuration.yaml, recherchez une déclaration google_assistant: directe ou google_assistant: !include fichier.yaml.",
    assistantProvenanceChecklist3: "Si un fichier est inclus, consultez-le dans la copie. Recherchez entity_config: !include ... et comparez sa référence au fichier examiné.",
    assistantProvenanceChecklist4: "Relevez uniquement les réglages utiles (expose_by_default, exposed_domains). Ne communiquez ni secrets, ni clés, ni compte de service.",
    assistantProvenanceChecklistEnd: "Une référence retrouvée dans une sauvegarde indique une configuration historique possible ; elle ne démontre pas à elle seule que Google Home exposait réellement ces entités.",
    assistantProvenanceSourceLabelUnknown: "Aucune copie de sauvegarde n'est analysée automatiquement ici.",
    assistantHistoryTitle: "Examiner une copie d'ancienne configuration",
    assistantHistoryHow: "Dans votre éditeur de fichiers HA, créez le dossier hvls-history-review dans le répertoire de configuration. Placez-y uniquement une copie de l'ancien configuration.yaml et des YAML qu'il inclut pour Google Assistant, en conservant leurs sous-dossiers. Ne restaurez pas d'archive et ne copiez pas de secrets.",
    assistantHistoryFolder: "Dossier de copies : hvls-history-review (à côté de configuration.yaml, jamais à sa place).",
    assistantHistoryAction: "Analyser la copie historique (lecture seule)",
    assistantHistoryBusy: "Analyse de la copie isolée en cours…",
    assistantHistoryIdle: "Aucune ancienne copie examinée dans ce parcours.",
    assistantHistoryNoFolder: "Le dossier hvls-history-review est absent. Créez-le manuellement et placez les fichiers YAML de la copie à analyser.",
    assistantHistoryNoConfig: "Le fichier configuration.yaml est introuvable dans hvls-history-review.",
    assistantHistoryBlocked: "Analyse refusée : {reason}. Vérifiez uniquement la copie, sans modifier votre configuration active.",
    assistantHistoryUnavailable: "Analyse historique indisponible. Aucun fichier n'a été modifié.",
    assistantHistoryFound: "Déclaration historique : {declaration}.",
    assistantHistoryDeclDirect: "directement dans configuration.yaml",
    assistantHistoryDeclIncluded: "dans un fichier !include",
    assistantHistoryDeclAbsent: "non trouvée dans la copie",
    assistantHistoryDeclUnknown: "non déterminée",
    assistantHistoryRules: "Règle globale trouvée : expose_by_default = {defaultValue} ({origin}). exposed_domains : {domains}.",
    assistantHistoryRuleExplicit: "déclaration explicite",
    assistantHistoryRuleImplicit: "valeur par défaut supposée par le parseur",
    assistantHistoryRuleUnknown: "non vérifiée",
    assistantHistoryDomainsNone: "aucun champ déclaré",
    assistantHistoryDomainsEmpty: "liste vide déclarée",
    assistantHistorySource: "Source entity_config : {source}.",
    assistantHistorySourceInline: "entités déclarées directement dans le YAML",
    assistantHistorySourceAbsent: "champ entity_config non déclaré",
    assistantHistorySourceUnknown: "source non résolue",
    assistantHistoryCompare: "Référence au fichier sélectionné : {pathStatus}. Comparaison des contenus : {contentStatus}.",
    assistantHistoryPathSame: "chemin identique",
    assistantHistoryPathDifferent: "chemin différent",
    assistantHistoryPathUnknown: "non déterminé",
    assistantHistoryContentIdentical: "empreintes identiques au moment du contrôle",
    assistantHistoryContentDifferent: "empreintes différentes",
    assistantHistoryContentUnknown: "non réalisée",
    assistantHistoryCounts: "{entries} entité(s) déclarée(s) dans la copie ; {anomalies} présentant une anomalie de structure.",
    assistantHistoryIssues: "Points à examiner : {issues}. Les autres entités restent analysables.",
    assistantHistoryIssueHistoricalMissing: "fichier d'entités inclus absent de la copie",
    assistantHistoryIssueNoConfig: "aucune déclaration Google Assistant dans la copie",
    assistantHistoryIssueNoEntity: "aucun champ entity_config dans la copie",
    assistantHistoryIssueInline: "entités définies directement, pas dans le fichier recherché",
    assistantHistoryIssueCurrentUnavailable: "impossible de comparer le fichier actuel sélectionné",
    assistantHistoryReasonUnsafe: "référence YAML non autorisée ou hors du dossier isolé",
    assistantHistoryReasonPackages: "structure par packages non prise en charge",
    assistantHistoryReasonSyntax: "syntaxe YAML, structure ou clé en double non valide",
    assistantHistoryReasonSymlink: "lien symbolique non autorisé",
    assistantHistoryReasonTooLarge: "fichier trop volumineux",
    assistantHistoryReasonMissing: "fichier inclus manquant",
    assistantHistoryReasonOther: "structure ou fichier non pris en charge",
    assistantHistorySafety: "Un chemin ou une empreinte identique indique seulement une correspondance entre fichiers examinés. Cela ne démontre ni l'utilisation historique réelle, ni l'état Google Home. Aucune migration ni écriture n'est autorisée.",
    migrationAnalyze: "Analyser à nouveau la configuration (lecture seule)",
    migrationLoading: "Analyse de la configuration Google Assistant en lecture seule…",
    migrationFailed: "Analyse indisponible : {error}",
    migrationStatus: "État de la revue",
    backupIntro: "Choisissez une sauvegarde pour préparer ses modifications dans le Preview. Aucune restauration directe ni modification d'étiquette.",
    backupLoading: "Chargement des sauvegardes…",
    backupEmpty: "Aucune sauvegarde disponible.",
    backupTypeAuto: "Automatique",
    backupTypeSafety: "Sécurité",
    backupTypeLegacy: "Ancienne",
    backupHistorySummary: "{total} sauvegarde(s) · {auto} automatiques · {safety} sécurité · {legacy} anciennes",
    backupShowOlder: "Afficher les {count} anciennes sauvegardes",
    backupShowRecent: "Afficher seulement les 10 dernières",
    backupCleanupPrepare: "Préparer le nettoyage des sauvegardes",
    backupCleanupReview: "Nettoyage proposé : conserver {keep} sauvegarde(s), supprimer {count} sauvegarde(s). Aucune suppression effectuée.",
    backupCleanupNoop: "Aucune sauvegarde sélectionnée pour suppression.",
    backupCleanupPick: "Cochez les sauvegardes à supprimer ; décochez celles à conserver. Les 10 plus récentes sont conservées par défaut.",
    backupCleanupSelection: "{count} à supprimer · {kept} à conserver",
    backupCleanupSelectionTitle: "Choisir les sauvegardes à supprimer",
    backupCleanupCheck: "Supprimer cette sauvegarde",
    backupCleanupNone: "Tout décocher",
    backupCleanupReset: "Reprendre la sélection proposée",
    backupCleanupKeepOne: "Conservez au moins une sauvegarde.",
    backupCleanupDeleteCount: "Supprimer les {count} sauvegardes sélectionnées",
    backupCleanupDeleteOne: "Supprimer la sauvegarde sélectionnée",
    backupCleanupConfirmButton: "Confirmer le nettoyage",
    backupCleanupCancel: "Annuler le nettoyage",
    backupCleanupConfirm: "Supprimer définitivement les {count} sauvegardes affichées dans le plan ? Les {keep} plus récentes seront conservées. Cette action est irréversible.",
    backupCleanupDone: "Nettoyage effectué : {count} sauvegarde(s) supprimée(s).",
    backupCleanupFailed: "Nettoyage impossible : {error}. Actualisez la liste et réexaminez le plan.",
    backupReviewing: "Comparaison avec la production…",
    backupMissingReview: "Le fichier de production est absent. Sauvegarde sélectionnée : {count} entités. Vous pouvez la préparer dans le Preview, puis examiner les entités et les étiquettes avant validation.",
    backupMissingPreview: "La production est absente. Cette sauvegarde propose {count} entités. Les conflits avec les étiquettes actuelles doivent être résolus avant de recréer le YAML.",
    backupMissingNoSafety: "Aucune (le fichier de production était absent)",
    backupReviewFailed: "Comparaison impossible : {error}",
    backupLoadFailed: "Chargement impossible : {error}",
    backupRestore: "Préparer cette sauvegarde dans le Preview",
    backupPreviewPrepared: "Restauration prête. Si vous l'appliquez : {added} ajout(s), {removed} suppression(s), {modified} modification(s). Rien n'est écrit dans le YAML ni dans les étiquettes avant « Appliquer cette restauration ».",
    backupPreviewNotExecutable: "Preview de restauration : contrôlez les changements et les étiquettes avant validation.",
    backupPreviewApply: "Appliquer cette restauration",
    backupPreviewConfirm: "Appliquer la sauvegarde après contrôle ? Le YAML de production et les étiquettes HA seront mis à jour. Une sauvegarde de sécurité sera créée.",
    backupPreviewApplying: "Application de la restauration contrôlée…",
    backupPreviewApplied: "Restauration validée : {entities} entité(s), {added} étiquette(s) ajoutée(s), {removed} retirée(s). Sauvegarde de sécurité : {backup}.",
    backupPreviewApplyFailed: "Restauration refusée ou incomplète : {error}. Vérifiez la production et les éventuels contrôles de réconciliation.",
    backupPreviewLabels: "Étiquettes envisagées : {added} ajout(s), {removed} retrait(s), {review} entité(s) à examiner.",
    manualLabelPending: "À valider",
    manualLabelPreparing: "Simulation des étiquettes et du YAML, sans écriture…",
    manualLabelPrepared: "{count} changement(s) d'étiquette prêt(s) dans le Preview. Aucun label ni YAML modifié.",
    manualLabelHelp: "Proposition enregistrée dans ce navigateur pour votre compte Home Assistant. Au retour, le Preview sera revérifié. Aucun label ni YAML modifié avant Apply.",
    savedDraftRestored: "{count} modification(s) provisoire(s) retrouvée(s) et revérifiée(s). Vérifiez le Preview avant Appliquer.",
    savedDraftRestoredDetail: "Proposition retrouvée et revérifiée : {count} changement(s) ({added} ajout(s), {removed} suppression(s), {modified} modification(s)). Vérifiez le Preview avant Appliquer.",
    savedDraftBlocked: "Brouillon conservé, mais non applicable : la configuration, les entités ou les protections ont changé. Aucune écriture autorisée. Examinez la situation puis cliquez sur Annuler pour repartir de l'état actuel.",
    savedDraftStorageUnavailable: "Le navigateur n'a pas pu enregistrer cette proposition. Elle pourrait disparaître si vous quittez HVLS. Appliquez-la ou annulez-la maintenant.",
    backupAlreadyStaged: "Cette sauvegarde est déjà préparée dans le Preview.",
    backupReplaceRestoreConfirm: "Une restauration est déjà en attente dans le Preview. Voulez-vous l'annuler et préparer cette sauvegarde à la place ? Si vous répondez non, rien ne change.",
    backupReplaceProposalConfirm: "Une proposition d'étiquettes non appliquée est en attente dans le Preview. Voulez-vous l'annuler et préparer cette sauvegarde à la place ? Si vous répondez non, rien ne change.",
    backupReplaceKept: "Aucune action : la proposition en attente est conservée dans le Preview.",
    pendingDraftProtect: "Une proposition non appliquée est en attente. Examinez-la dans le Preview puis appliquez-la ou annulez-la avant de recharger ou de lancer une autre opération.",
    manualLabelApply: "Appliquer les changements d'étiquettes",
    manualLabelConfirm: "Appliquer les changements d'étiquettes et le YAML proposés dans le Preview ? Une sauvegarde de sécurité sera créée si un fichier de production existe.",
    manualLabelApplied: "Modification validée : {added} étiquette(s) ajoutée(s), {removed} retirée(s). YAML et labels vérifiés.",
    manualLabelFailed: "Préparation refusée : {error}. Aucune étiquette ni YAML modifié.",
    manualLabelApplyFailed: "Application refusée ou incomplète : {error}. Vérifiez la production et les protections de réconciliation.",
    backupLabelAdd: "Étiquettes à ajouter",
    backupLabelRemove: "Étiquettes à retirer",
    backupLabelReview: "Entités à examiner",
    backupConfirm: "Restaurer ce YAML en production ? Une copie de sécurité de la production actuelle sera créée obligatoirement. Les étiquettes HA ne seront pas modifiées.",
    backupRestoreFailed: "Restauration refusée : {error}",
    backupRestored: "Restauration terminée. Copie de sécurité : {backup}",
    backupRestorePendingRemoval: "Attention : {count} entité(s) présente(s) dans le YAML restauré sont absentes du Preview : {entities}. Un prochain Apply les supprimerait à nouveau. Les labels HA n'ont pas été restaurés : rétablissez les labels si vous souhaitez conserver ces entités.",
    backupRestorePendingOther: "Après restauration, le Preview propose encore {added} ajout(s), {removed} suppression(s) et {modified} modification(s). Les labels HA n'ont pas été restaurés. Examinez les différences avant tout Apply.",
    backupRestoreNotVerified: "Le YAML a été restauré mais la comparaison actualisée avec le Preview n'est pas vérifiée. Actualisez le Preview et contrôlez les différences avant tout Apply.",
    backupRestoreAligned: "Le YAML restauré et le Preview ont la même configuration par entité. Les labels HA n'ont pas été restaurés.",
    restoreReconcileTitle: "Restauration HVLS à finaliser",
    restoreReconcileSummary: "Le YAML restauré est protégé. HVLS ne peut pas réécrire la production tant que vous n'avez pas choisi comment résoudre les différences avec les labels Home Assistant.",
    restoreReconcilePending: "La restauration reste protégée même après redémarrage. Terminez-la dans l'onglet Preview avant un nouvel Apply.",
    restoreReconcileAddLabels: "Rétablir les labels des entités restaurées",
    restoreReconcileAligned: "Valider la cohérence et terminer la restauration",
    restoreReconcileKeepCurrent: "Conserver les labels actuels (Apply séparé)",
    restoreReconcileAddConfirm: "Rétablir les labels HVLS de {count} entité(s) restaurée(s) ?\n{entities}\n\nAucun Apply ni changement du YAML de production.",
    restoreReconcileKeepConfirm: "Vous choisissez les labels HA actuels. Les différences avec le YAML restauré sont : {added} ajout(s), {removed} suppression(s), {modified} modification(s). Un futur Apply pourra remplacer la configuration restaurée. La sauvegarde restera disponible. Débloquer uniquement la possibilité d'Apply (sans l'exécuter) ?",
    restoreReconcileAlignedConfirm: "Le Preview est maintenant conforme aux entités du YAML restauré. Terminer la protection de restauration sans modifier le fichier ni effectuer Apply ?",
    restoreReconcileCannotAdd: "Les labels ne peuvent pas être rétablis automatiquement pour toutes ces entités (absentes ou non éligibles). Examinez-les dans Gestion des entités HVLS.",
    restoreReconcileAfterLabels: "Les labels ont été rétablis, mais le Preview reste différent du YAML restauré. Aucun Apply n'est autorisé. Examinez les personnalisations.",
    restoreReconcileResolved: "Restauration réconciliée. Le YAML de production n'a pas été modifié ; aucun Apply effectué.",
    restoreReconcileError: "Réconciliation refusée ou incomplète. Les écritures restent protégées. Actualisez puis examinez les différences.",
    restoreReconcileWorking: "Réconciliation des labels et vérifications en cours…",
    restoreReconcileDiff: "Différences Preview / production restaurée : {added} ajout(s), {removed} suppression(s), {modified} modification(s).",
    restoreReconcileCancelFailed: "Annuler la reprise interrompue",
    restoreReconcileCancelFailedConfirm: "La restauration a été interrompue avant de modifier le YAML de production. Le fichier initial a été vérifié. Retirer sa protection de reprise sans modifier les labels ni le YAML ?",
    restoreReconcileUncertain: "État du YAML non vérifié après interruption. Aucun déblocage automatique : contrôlez les sauvegardes et l'état de propriété.",
    backupNoDiff: "YAML identique à la production.",
    backupTextOnlyDiff: "Aucune différence entre les entités. Seul le texte YAML diffère (par exemple, commentaires, ordre ou mise en forme). Restaurer remplacerait le texte du fichier de production, après sauvegarde de sécurité.",
    backupRestoreTextOnly: "Préparer la comparaison du texte YAML",
    backupConfirmTextOnly: "Les entités sont identiques mais le texte YAML diffère. Restaurer exactement le texte de la sauvegarde en production ? Une copie de sécurité de la production actuelle sera créée obligatoirement. Les étiquettes HA ne seront pas modifiées.",
    backupDiffTitle: "Changements si cette sauvegarde est restaurée",
    backupSize: "{size} octets",
    backupEntities: "{count} entités",
    backupRestartHint: "Le YAML a été restauré sur disque. Redémarrez Home Assistant pour que Google Assistant recharge sa configuration.",
    refreshEntities: "Actualiser les entités",
    loadingEntities: "Chargement des entités…",
    searchPlaceholder: "Rechercher un nom, identifiant ou une pièce…",
    searchLabel: "Rechercher une entité",
    filterLabel: "Filtrer les entités",
    filterAll: "Toutes les entités",
    filterWith: "Avec HVLS",
    filterWithout: "Sans HVLS",
    filterEligibleWithout: "Sans HVLS — éligibles",
    assistantReportIssue: "Signaler un problème sur GitHub",
    filterIneligible: "Non éligibles",
    actionAdd: "AJOUTER",
    actionRemove: "RETIRER",
    confirmLabel: "{action} l'étiquette HVLS ?",
    otherLabelsPreserved: "Les autres étiquettes seront conservées.",
    ineligibleWarning: "Attention : cette entité n'est actuellement pas éligible.",
    updateFailed: "Modification HVLS refusée pour {entity} :",
    reloadFailed: "Étiquette modifiée dans HA, mais le catalogue n'a pas pu être rechargé. Utilise « Actualiser les entités ».",
    domainsSupported: "Domaines pris en charge par HVLS",
    domainsUnsupported: "Domaines non pris en charge",
    domainCount: "{count} domaines · {entities} entités",
    entitiesCount: "{count} entités",
    catalogStatus: "{matching} entités correspondant aux filtres · {labeled} étiquetées sur {total} · Étiquette : {label}",
    noMatches: "Aucune entité correspondant aux filtres.",
    noArea: "Sans pièce",
    withoutHVLS: "— Sans HVLS",
    unknownHVLS: "HVLS · statut inconnu",
    ineligibleState: "Inéligible",
    notEligible: "Cette entité ne respecte pas les règles de sélection de HVLS.",
    exclusionIntro: "Exclue de la configuration Google Assistant générée par HVLS :",
    reasonDomain: "son domaine n’est pas pris en charge par HVLS.",
    reasonClass: "sa classe (capteur, capteur binaire ou événement) n’est pas prise en charge par HVLS.",
    reasonDisabled: "elle est désactivée dans Home Assistant.",
    reasonHidden: "elle est masquée dans Home Assistant.",
    reasonCategory: "c’est une entité de configuration ou de diagnostic.",
    exclusionHelp: "Pourquoi cette entité est exclue",
    exclusionFootnote: "Elle reste dans Home Assistant. HVLS ne la sélectionne pas pour Google Assistant.",
    moreDomain: "Afficher 100 de plus ({shown}/{total})",
    moreEntities: "Afficher 100 entités supplémentaires",
    excludedTitle: "Entités exclues ({count})",
    excludedExplanation: "Entités portant l’étiquette HVLS mais non retenues par les règles actuelles.",
    excludedEmpty: "Aucune entité étiquetée exclue.",
    excludedNote: "Diagnostic calculé sur les registres actuels. Le YAML affiché provient du dernier Preview généré.",
    unknownReason: "Motif inconnu",
    reasonFilterTitle: "Motifs de non-éligibilité",
    reasonFilterAll: "Tout cocher",
    reasonFilterOnly: "seulement",
    reasonFilterOnlyAria: "Afficher seulement : {reason}",
    reasonFilterNone: "Aucun motif coché. Coche au moins un motif pour afficher des entités.",
    reasonShort_domain_not_enabled: "Domaine non pris en charge",
    reasonShort_unsupported_device_class: "Classe non prise en charge",
    reasonShort_disabled: "Désactivée",
    reasonShort_hidden: "Masquée",
    reasonShort_entity_category: "Configuration / diagnostic",
    reasonShort_other: "Motif inconnu",
    reasonDetailDomain: "domaine : {domain}",
    reasonDetailClass: "classe : {deviceClass}",
    reasonDetailNoClass: "classe : aucune",
    reasonDetailConfig: "catégorie : configuration",
    reasonDetailDiagnostic: "catégorie : diagnostic",
    reasonCategoryFull: "Entité de configuration ou de diagnostic",
    metricEntities: "Entités en production",
    productionStatsUnavailable: "Statistiques de production indisponibles : fichier absent, illisible ou invalide.",
    initialLabelsDetected: "{count} entités étiquetées HVLS détectées dans Home Assistant. Vous pouvez créer votre premier YAML à partir de cette sélection.",
    initialLabelsPreview: "Préparer le Preview initial ({count} entités)",
    initialPendingPreview: "Voir le Preview en attente ({count} modification(s))",
    initialYamlPreview: "Première configuration : {count} entités proposées depuis les étiquettes HA. Le YAML sera créé uniquement après validation.",
    productionRemoval: "Suppression prévue dans le Preview : entité encore présente en production",
    metricRooms: "Pièces",
    byDomain: "Par domaine",
    byArea: "Par pièce",
    disabledDomains: "Domaines exclus de la sélection HVLS",
    noDisabledDomains: "Aucun domaine non activé détecté.",
    labeledOnly: "Entités étiquetées HVLS uniquement.",
    comparisonTitle: "Diff Preview / Production",
    pendingChanges: "{count} changement(s) à examiner avant application",
    pendingAction: "Ouvrir le Preview",
    productionValidated: "Déjà présente dans le YAML de production",
    productionPending: "Ajout en attente d’application au YAML de production",
    productionModified: "Présente en production, modifications en attente d’application",
    productionUnknown: "Statut de production inconnu : actualisez le Preview",
    comparisonMissing: "Comparaison impossible : fichier de production absent.",
    comparisonFailed: "Comparaison impossible ({status}) : {reason}",
    unreadableFile: "fichier illisible",
    added: "Ajoutées",
    removed: "Supprimées",
    modified: "Modifiées",
    unchanged: "Inchangées",
    identicalYaml: "✓ Aucune différence : YAML identique à la production.",
    identicalEntities: "✓ Même configuration par entité (différences de présentation YAML uniquement).",
    entitiesAdded: "Entités ajoutées",
    entitiesRemoved: "Entités supprimées",
    removalReasonProposal: "Raison : étiquette HVLS retirée dans cette proposition.",
    removalReasonBackup: "Raison : exposée aujourd'hui, mais absente de la sauvegarde.",
    removalReasonNoLabel: "Raison : n'a plus l'étiquette HVLS dans Home Assistant.",
    removalReasonMissing: "Raison : n'existe plus dans Home Assistant.",
    removalReasonIneligible: "Raison : {detail}",
    entitiesModified: "Entités modifiées",
    previewLoading: "Chargement du Preview…",
    previewMissing: "Aucun Preview disponible. Lancez d’abord une génération.",
    previewReady: "Preview : {path} — Production : {production}",
    previewLoadFailed: "Impossible de charger le Preview : {error}",
    previewGenerating: "Génération du Preview en cours…",
    previewGenerated: "Preview généré : {count} entités. Vérifiez les différences avant application.",
    previewGenerateFailed: "Échec de génération du Preview : {error}",
    applyInfoLabel: "Pourquoi Apply est-il désactivé ?",
    cancelPreview: "Annuler",
    previewCancelled: "Preview annulé : aucune modification effectuée.",
    backupIgnoreUpdating: "Recalcul du Preview après exclusion…",
    backupIgnoreFailed: "Impossible de recalculer le Preview : {error}. Aucun fichier ni label modifié.",
    backupIgnoreSelected: "Choix enregistrés : {count} entité(s) ignorée(s), {refreshed} restaurée(s) avec le nom et la pièce actuels. Aucun fichier ni label modifié.",
    restoreBlockerField: "{field} : sauvegarde « {before} » → Home Assistant aujourd'hui « {after} »",
    restoreFieldName: "nom",
    restoreFieldRoom: "pièce",
    restoreValueAbsent: "(aucune)",
    planCol_out: "Non restaurées ({count})",
    planCol_current: "Nom ou pièce changés ({count})",
    planCol_result: "Résultat pour Google ({count})",
    planSub_out: "Rien ne change pour elles.",
    planSub_current: "Restaurées avec les valeurs actuelles de Home Assistant.",
    planSub_result: "Ce qui sera réellement écrit.",
    planHelpLabel: "Aide",
    planHelp_out: "Entités de la sauvegarde qui ne seront pas remises. « Impossible » : elles n'existent plus, ne sont plus éligibles ou ont des options que HVLS ne génère pas. Les autres, vous avez choisi de ne pas les restaurer : leur état actuel ne change pas.",
    planHelp_current: "Ces entités ont été renommées ou déplacées dans Home Assistant depuis la sauvegarde. Elles seront restaurées avec leur nom et leur pièce d'aujourd'hui, pas ceux de la sauvegarde. « Retirer » les passe dans « Non restaurées ».",
    planHelp_result: "La liste exacte des entités exposées à Google après la restauration. « Ajoutée » : pas exposée aujourd'hui. « Déjà exposée » : aucun changement. En rouge : exposée aujourd'hui mais absente de la sauvegarde ; elle sera retirée, sauf si vous la gardez.",
    planSumRestored: "Restaurées depuis la sauvegarde",
    planSumExposed: "Exposées après restauration",
    planSumAdded: "Ajoutées par la sauvegarde",
    planSumAlready: "Déjà exposées aujourd'hui",
    planSumRemoved: "Ne seront plus exposées",
    planNotReady: "Certaines entités doivent encore être résolues avant de pouvoir appliquer cette restauration.",
    planActionRestore: "Restaurer →",
    planActionWithdraw: "← Retirer",
    planActionKeep: "Garder",
    planActionSkip: "Ne pas restaurer",
    planTagPending: "à résoudre",
    planTagLocked: "impossible",
    planTagRemoved: "retirée",
    planTagKept: "gardée",
    planTagCurrent: "nom/pièce actuels",
    planTagAdded: "ajoutée",
    planTagAlready: "déjà exposée",
    planKeepQuestion: "{count} entité(s) exposées aujourd'hui sont absentes de la sauvegarde. Voulez-vous les garder ?",
    planKeepAll: "Tout garder",
    planRemoveAll: "Tout retirer",
    planRecommended: "↺ Revenir à la recommandation",
    planEmpty: "Aucune",
    planReasonMissing: "absente de Home Assistant",
    planReasonNotExposed: "non exposée dans la sauvegarde",
    planReasonIneligible: "non éligible ({reason})",
    planReasonOptions: "options non reproductibles : {fields}",
    planReasonConflict: "différence non reproductible",
    planReasonRemoved: "exposée aujourd'hui, absente de la sauvegarde",
    planReasonNoLabel: "exposée aujourd'hui, mais n'a plus l'étiquette HVLS dans Home Assistant",
    planTechDetails: "Détails techniques : étiquettes Home Assistant",
    planConfirmSummary: "Après restauration : {exposed} entité(s) exposées à Google ({added} ajoutée(s), {already} déjà exposée(s)).",
    planConfirmRemoved: "Ne seront plus exposées ({count}) : {entities}.",
    planConfirmCurrent: "Avec le nom et la pièce actuels ({count}) : {entities}.",
    planConfirmOut: "Non restaurées ({count}) : {entities}.",
    applyNoChanges: "Aucune modification à appliquer : le Preview est déjà identique à la production.",
    applyReasonMissingIdentity: "L'identité de l'installation HVLS est indisponible.",
    applyReasonUnsafePath: "Le chemin du fichier ou du registre n'est pas sûr. Vérifiez notamment les liens symboliques.",
    applyReasonReservedPath: "Le fichier de sortie utilise un emplacement réservé aux métadonnées HVLS.",
    applyReasonRegistryInvalid: "Le registre de propriété HVLS est invalide ou illisible. Vérification nécessaire.",
    applyReasonOtherInstallation: "Ce fichier appartient à une autre installation HVLS. Écriture interdite.",
    applyReasonUnmanagedOutput: "Un fichier YAML existe déjà, mais sa propriété n'est pas vérifiée par HVLS. Il reste protégé.",
    applyUnmanagedAssistantHint: "L'Assistant peut examiner ce fichier en lecture seule. Cette analyse ne débloque pas automatiquement l'Apply.",
    applyUnmanagedAssistantAction: "Examiner dans l'Assistant",
    applyReasonMissingDirectory: "Le répertoire de destination est indisponible.",
    applyReasonVerificationFailed: "La vérification de sécurité du fichier a échoué. Apply reste désactivé.",
    applyReasonOutputPathMismatch: "Le chemin de sortie ne correspond plus au chemin enregistré par HVLS.",
    applyReasonPendingOperation: "Une opération HVLS est incomplète. Une reprise contrôlée est nécessaire avant Apply.",
    applyReasonManagedOutputMissing: "Le fichier précédemment géré par HVLS est introuvable.",
    missingRebuildAction: "Reconstruire le fichier YAML",
    missingRebuildReview: "Le fichier de production géré par HVLS a disparu. {count} entités peuvent être reconstruites à partir des étiquettes HA actuelles. Contrôlez le YAML avant de confirmer.",
    missingRebuildConfirm: "Le fichier de production HVLS a disparu. Le recréer à partir du Preview vérifié et des étiquettes HA actuelles ? Aucun label ne sera modifié. Les sauvegardes existantes seront conservées. Si le fichier réapparaît, cette opération sera refusée.",
    missingRebuildApplied: "Fichier YAML reconstruit : {path} — {bytes} octets écrits. Étiquettes HA inchangées.",
    missingRebuildBackups: "Examiner les sauvegardes",
    missingRebuildDetected: "Fichier de production HVLS manquant. Vous pouvez restaurer une sauvegarde ou le reconstruire depuis les {count} entités étiquetées dans HA, après contrôle du Preview.",
    applyReasonOutputChanged: "Le fichier géré par HVLS a été modifié depuis son dernier contrôle SHA-256.",
    applyReasonNotConfigured: "HVLS n'est pas encore configuré.",
    applyVerificationUnavailable: "Impossible de valider Apply : informations de sécurité manquantes ou incohérentes. Actualisez le Preview.",
    bulkRemovalWarning: "ATTENTION : {removed} entités sur {before} disparaîtront du YAML de production (après Apply : {after}). Vérifiez les suppressions rouges avant de continuer.",
    emptySelectionConfirm: "Cette suppression retirera la dernière entité HVLS : aucune entité ne restera exposée dans le YAML. Confirmez-vous ce retrait total ?",
    bulkRemovalConfirm: "SUPPRESSION IMPORTANTE : {removed} entités sur {before} seront retirées du YAML (nouveau total : {after}). Cette action peut également retirer des étiquettes HA. Confirmez-vous expressément ces suppressions ?",
    applyConfirm: "Appliquer ce Preview à la configuration Google Assistant ?",
    applyWarning: "Le fichier actuel sera sauvegardé si les sauvegardes sont activées. Toute modification détectée depuis l’examen entraînera un refus.",
    previewApplying: "Vérification et application du Preview…",
    previewApplied: "Preview appliqué : {path} — {bytes} octets écrits{backup}",
    backupCreated: "Sauvegarde : {path}",
    previewApplyFailed: "Application refusée : {error}. Actualisez le Preview avant de réessayer.",
    noYaml: "Aucun YAML à copier.",
    copyUnsupported: "La copie dans le navigateur a échoué.",
    yamlCopied: "YAML copié — {path}",
    copyFailed: "Impossible de copier : {error}",
    registriesLoading: "Chargement des registres HA…",
    entitiesLoadFailed: "Impossible de charger les entités : {error}",
    inconsistentRegistry: "Réponse du registre HA incohérente",
    waitingHA: "En attente de Home Assistant…",
    tabsLabel: "Sections HVLS",
    rawDiffSummary: "Diff YAML détaillé",
    hvlsLabelAria: "Étiquette HVLS : {entity}",
    entityMoreInfo: "Afficher les informations de {entity} dans Home Assistant",
    catalogWarning: "Attention : {warnings}",
    absentValue: "(absent)",
    showPreviewYaml: "Afficher le YAML du Preview",
    changesProposed: "Changements proposés à Google Assistant",
    recoveryDiffTitle: "Différences entre l'ancien et le nouveau YAML",
    recoveryDiffSummary: "Ancien fichier : {before} entités → Nouveau fichier proposé : {after} entités.",
    changesIntro: "Vérifiez les différences avant d’appliquer la configuration.",
    noChanges: "Aucun changement d’entité à appliquer.",
    removalNote: "Retirer une entité ici ne la supprime pas de Home Assistant : seule sa configuration Google Assistant change.",
    firstProduction: "Aucune configuration de production existante : impossible de calculer les différences avec un fichier précédent.",
    fieldBefore: "Avant",
    fieldAfter: "Après",
    fileIssue_invalid_entity_file_path: "chemin invalide",
    fileIssue_sensitive_file_reference: "fichier sensible",
    fileIssue_symlink_entity_file_not_allowed: "lien symbolique interdit",
    fileIssue_include_missing: "fichier introuvable",
    fileIssue_yaml_syntax_error: "syntaxe YAML incorrecte",
    fileIssue_duplicate_mapping_key: "clé YAML en double",
    fileIssue_yaml_file_too_large: "fichier trop volumineux",
    fileIssue_expected_mapping: "structure YAML incorrecte",
    fileIssue_unreadable_yaml_file: "fichier illisible",
    fileIssue_entity_file_unavailable: "fichier inaccessible",
    fileIssue_invalid_entity_id: "identifiant d'entité incorrect",
    fileIssue_invalid_entity_options: "options d'entité incorrectes",
    fileIssue_invalid_expose_value: "valeur expose incorrecte",
    fileIssue_invalid_room_option: "option room incorrecte",
    fileIssue_invalid_name_option: "option name incorrecte",
    fileIssue_invalid_aliases_option: "option aliases incorrecte",
    fileIssue_unhandled_entity_option: "option non prise en charge",
    fileIssueUnknown: "problème non identifié",
    fileIssueLine: "ligne"
  },
  de: {
    generate: "Preview erzeugen",
    refresh: "Alle Daten aktualisieren",
    copy: "YAML kopieren",
    apply: "Preview anwenden",
    settings: "Einstellungen",
    menu: "Home-Assistant-Menü öffnen",
    tabStats: "Statistik",
    tabExclusions: "Ausgeschlossene Entitäten",
    tabEntities: "HVLS-Entitätsverwaltung",
    tabPreview: "Preview",
    tabBackups: "Sicherungen",
    tabMigration: "Assistent",
    migrationIntro: "HVLS erzeugt die YAML-Datei Ihrer Entitäten aus Home-Assistant-Labels. Für die Verwaltung der Labels ist keine Google-Assistant-Verbindung nötig. Die Prüfung ist schreibgeschützt; Label-Änderungen und „Anwenden“ erfordern eine ausdrückliche Bestätigung.",
    migrationGuideTitle: "Ermitteln wir Ihre Ausgangslage",
    migrationGuideStepIdentify: "Schritt 1 — Ausgangslage ermitteln",
    migrationGuideStepVerify: "Schritt 2 von 2 — Empfohlene Prüfungen durchgehen",
    assistantProvenanceStepVerify: "Die YAML-Datei prüfen, die Sie wiederverwenden möchten",
    migrationManagedNotice: "HVLS verwaltet jetzt die produktive Entitätsdatei. Nehmen Sie Änderungen über die Preview vor. Frühere Diagnosen bleiben unter den erweiterten Werkzeugen verfügbar.",
    migrationGuideDetected: "Keine google_assistant:-Deklaration gefunden. Das hindert HVLS nicht daran, eine Entitäts-YAML-Datei zu verwalten und zu erzeugen.",
    migrationGuideCandidate: "Eine Datei google_assistant_entities.yaml ist vorhanden. Sie können sie verwenden, um die HVLS-Labels zu initialisieren, auch ohne Google-Assistant-Verbindung.",
    migrationGuideNoCandidate: "Keine übliche Datei google_assistant_entities.yaml gefunden. Es können dennoch andere Quellen existieren.",
    migrationGuideQuestion: "Wie möchten Sie mit HVLS beginnen?",
    migrationGuideNew: "Meine Entitäten in HA auswählen",
    migrationGuideExisting: "Eine vorhandene Entitätsdatei wiederverwenden",
    migrationGuideUnsure: "Eine andere Datei wählen",
    migrationGuideNextNew: "Wählen Sie die Entitäten unter „HVLS-Entitätsverwaltung“ aus. Vorhandene Labels bleiben unverändert. Vor jedem Schreibvorgang ist weiterhin eine Freigabe der Preview nötig.",
    migrationGuideNextExisting: "Prüfen Sie die Entitätsdatei und anschließend die zu importierenden Labels. Eine Google-Assistant-Verbindung ist nicht erforderlich.",
    migrationGuideNextUnsure: "Geben Sie den relativen Pfad der wiederzuverwendenden YAML-Datei ein und prüfen Sie sie.",
    migrationGuideAwaitChoice: "Wählen Sie, ob Sie diese Datei wiederverwenden, eine andere Datei wählen oder neu beginnen möchten.",
    migrationGuideNoAuthorization: "Diese Auswahl gilt nur für diesen Bildschirm; sie genehmigt keine Migration und erlaubt keine Schreibvorgänge.",
    assistantSourceFound: "Google-Assistant-Konfiguration gefunden",
    assistantSourceSummary: "{entries} ausdrückliche Entitätsdeklarationen. Geprüfte Dateien: {paths}. Keine Google-Home-Freigabe bestätigt.",
    assistantPackagesDetected: "Packages-Konfiguration gefunden: als „Andere Konfiguration“ eingestuft, nicht automatisch geprüft.",
    assistantPackagesQuestion: "Geben Sie den Pfad der Entitäts-YAML-Datei für eine manuelle Prüfung ein.",
    assistantFileHelp: "ⓘ YAML-Syntaxbeispiele anzeigen",
    assistantGoogleConnectionHint: "In der geprüften Konfiguration wurde keine Google-Assistant-Verbindung gefunden. Prüfen Sie configuration.yaml anhand der Beispiele unten. HVLS kann Entitäten auch ohne diese Verbindung verwalten.",
    assistantExampleDirect: "In configuration.yaml:",
    assistantExampleProjectId: "IHRE_PROJEKT_ID",
    assistantExampleInclude: "Alternative mit eingebundener Datei in configuration.yaml:",
    assistantExampleIncludedContent: "In google_assistant.yaml:",
    assistantExampleNote: "Ersetzen Sie project_id durch Ihr Google-Projekt und SERVICE_ACCOUNT.json durch Ihre Dienstkontodatei (zeigen Sie deren Inhalt nie an). project_id und service_account sind für die manuelle Einrichtung erforderlich; report_state ist optional. Prüfen Sie die aktiven Einstellungen, bevor Sie sie ändern: Diese Beispiele stellen keine funktionierende Google-Home-Verbindung her. secure_devices_pin (optional, Kommentarzeichen entfernen) ist der Code, den Sie sagen, um ein Schloss zu öffnen, eine Alarmanlage zu entschärfen oder eine Tür bzw. ein Tor zu öffnen; legen Sie ihn in secrets.yaml in Anführungszeichen ab (zum Beispiel google_secure_pin: \"1234\").",
    assistantFileTitle: "Entitätsdatei",
    assistantFileCandidate: "Vorgeschlagene gefundene Datei; Sie können diesen Pfad ändern.",
    assistantFileManual: "Geben Sie den Pfad der Entitäts-YAML-Datei ein.",
    assistantFilePathLabel: "Pfad relativ zum Home-Assistant-Konfigurationsordner",
    assistantFilePlaceholder: "google_assistant_entities.yaml",
    assistantFileCheck: "Datei prüfen (schreibgeschützt)",
    assistantFileChecking: "Schreibgeschützte Prüfung…",
    assistantFileNotChecked: "Noch keine Datei geprüft.",
    assistantFileChecked: "{entries} deklarierte Entität(en) · {anomalies} lokale Strukturprobleme gefunden.",
    assistantFileIssues: "Zu prüfen: {issues}. Bei Bedarf korrigieren und erneut prüfen.",
    assistantFileNoIssues: "Keine Strukturprobleme gefunden. Das garantiert weder eine aktive Konfiguration noch eine Freigabe in Google Home.",
    assistantFileCannotRead: "Datei kann nicht geprüft werden: {reason}.",
    assistantFileUnavailable: "Prüfung nicht verfügbar. Es wurde nichts geändert.",
    assistantFileSafety: "Die Prüfung einer Datei beweist keine Freigabe in Google Home. Labels und YAML werden nur durch eine separate, bestätigte Aktion geändert.",
    migrationGuideSelectedExisting: "„Vorhandene Datei wiederverwenden“ ausgewählt. Sie können Ihre Wahl ändern.",
    migrationGuideSelectedNew: "Gewählter Weg: neue Konfiguration. Sie können Ihre Wahl unten ändern.",
    migrationGuideSelectedUnsure: "„Andere Datei wählen“ ausgewählt. Geben Sie unten den Pfad ein.",
    assistantFileMetricEntries: "Deklarierte Entitäten",
    assistantFileMetricTrue: "expose: true",
    assistantFileMetricFalse: "expose: false",
    assistantFileMetricUnset: "expose fehlt",
    assistantFileMetricIssues: "Zu prüfende Entitäten",
    assistantFileUnreferencedConclusion: "Diese lesbare Datei kann die HVLS-Labels initialisieren. Eine fehlende Google-Assistant-Verknüpfung ist ein Hinweis, kein Hindernis für die Entitätsverwaltung. Die Originaldatei bleibt erhalten.",
    assistantFilePackagesConclusion: "Eine lesbare Datei zeigt nicht, welche Konfiguration Packages verwenden. Packages bleiben als „Andere Konfiguration“ eingestuft und kommen für eine automatische Migration nicht in Frage.",
    assistantFileGeneralConclusion: "Diese Prüfung analysiert nur den Dateiinhalt; sie stellt weder globale Google-Assistant-Regeln noch die tatsächliche Freigabe in Google Home fest.",
    assistantFileUnsetExplanation: "Ein Eintrag ohne expose wird nicht als expose: true behandelt. Eine eventuelle Freigabe hängt von anderen Einstellungen ab und wird hier nicht festgestellt.",
    assistantFileResultsTitle: "Zusammenfassung der Dateiprüfung",
    assistantAdoptTitle: "Entitäten in HVLS wiederverwenden",
    assistantAdoptIntro: "Stellen Sie die bisherige YAML-Datei mit den derzeit in HA verfügbaren Entitäten wieder her. Zuerst sichern und übernehmen, dann die Preview vorbereiten. Keine Änderung ohne Freigabe.",
    assistantAdoptNoCatalog: "Der Home-Assistant-Entitätskatalog ist nicht geladen. Aktualisieren Sie den Vergleich, um fortzufahren.",
    assistantAdoptRefresh: "Label-Vergleich aktualisieren",
    assistantAdoptCounts: "{total} in der alten YAML · {recoverable} wiederherstellbar · {existingNew} weitere bereits in HA gelabelt · {nextTotal} vorgeschlagen insgesamt · {missing} fehlend · {ineligible} nicht geeignet · {review} zu prüfen.",
    assistantAdoptReview: "Entitätsdetails und vorgeschlagene Entscheidungen",
    assistantAdoptReasonAdd: "HVLS-Label hinzufügen",
    assistantAdoptReasonAlready: "Bereits in HVLS",
    assistantAdoptReasonExclude: "Ausgeschlossen (expose: false) — nicht hinzufügen",
    assistantAdoptReasonReview: "Manuelle Prüfung erforderlich",
    assistantAdoptReviewYamlIssue: "Problem in der YAML-Deklaration",
    assistantAdoptReviewInvalidExposure: "Ungültige expose-Angabe",
    assistantAdoptReviewMissingEntity: "Entität fehlt im HA-Katalog",
    assistantAdoptReviewImplicitExposure: "expose-Angabe fehlt: Absicht unbekannt",
    assistantAdoptReviewUnknownLabel: "HVLS-Label-Status unbekannt",
    assistantAdoptReviewExcludedLabeled: "expose: false, aber HVLS-Label vorhanden",
    assistantAdoptReviewIneligible: "Entität für die Erzeugung nicht geeignet",
    assistantAdoptReviewUnlabeledCustom: "Kein HVLS-Label; YAML-Anpassungen beibehalten",
    assistantAdoptCustomValuesUnverified: "YAML-Name, -Raum oder -Aliase nicht mit erzeugten Werten verglichen",
    assistantAdoptLimits: "Fehlende oder nicht geeignete Entitäten werden nur aus der neuen YAML entfernt. Die Preview zeigt auch Änderungen an Namen, Räumen und Aliasen: Prüfen Sie diese vor der Freigabe.",
    assistantAdoptAction: "Wiederherstellungs-Preview vorbereiten ({count} Entitäten)",
    assistantAdoptNone: "Keine wiederherstellbaren Entitäten: Es kann keine neue YAML vorbereitet werden.",
    assistantTakeoverTitle: "HVLS die vorhandene YAML verwalten lassen",
    migrationChangeChoice: "Einrichtungsweg ändern (optional)",
    importPreviewDanger: "WARNUNG: Diese normale Preview verwendet die aktuellen HA-Labels; sie ist KEIN Import der vorhandenen YAML. {count} von {total} Entitäten würden aus der YAML entfernt. Nicht anwenden, bevor Sie die Wiederherstellung im Assistenten abgeschlossen haben.",
    importPreviewReturn: "Zurück zum Assistenten",
    assistantReinstallTitle: "YAML-Verwaltung nach einer Neuinstallation wiederherstellen",
    assistantReinstallIntro: "Die alte Konfiguration wird mit den aktuellen HA-Entitäten abgeglichen. HVLS sichert die Datei, bevor es sie übernimmt. Prüfen Sie die Änderungen anschließend in der Preview.",
    assistantReinstallAction: "Prüfen und Verwaltung wiederherstellen",
    assistantRecoveryTakeoverConfirm: "Bisherige YAML: {total} Entitäten.\nWiederherstellbar: {recoverable}.\nIn HA fehlend: {missing}.\nNicht geeignet: {ineligible}.\n\nEine geprüfte Sicherung erstellen und HVLS diese Datei verwalten lassen? In diesem Schritt ändern sich weder YAML noch Labels.",
    assistantRecoveryChangedNote: "Warnung: Die aktuelle Datei unterscheidet sich von der Datei, die die vorherige Installation registriert hat. Die Sicherung schützt die AKTUELLE Datei.\n\n",
    assistantRecoveryReady: "Verwaltung nach einer geprüften Sicherung wiederhergestellt. Bereiten Sie jetzt die Wiederherstellungs-Preview vor.",
    assistantRecoveryPreviewPrepared: "Wiederherstellungs-Preview vorbereitet. Prüfen Sie Entfernungen und Änderungen in der YAML, bevor Sie anwenden.",
    assistantRecoveryPreviewFailed: "Vorbereitung der Preview abgelehnt: {error}. YAML und Labels unverändert.",
    assistantRecoveryNotPrepared: "Noch keine Wiederherstellungs-Preview vorbereitet. Ausstehende Hinzufügungen, Entfernungen und Änderungen: keine. Beginnen Sie im Assistenten.",
    assistantRecoveryPreviewBack: "Assistent öffnen",
    assistantRecoveryApply: "Wiederhergestellte Konfiguration anwenden",
    assistantRecoveryApplyConfirm: "Die geprüfte Wiederherstellung anwenden? Vor der Aktualisierung von Labels und Datei wird eine verpflichtende Sicherung der aktuellen YAML erstellt. Ausgemusterte Entitäten werden nur aus der YAML entfernt.",
    assistantRecoveryApplied: "Wiederherstellung abgeschlossen: {count} Entitäten in der neuen YAML. Sicherung: {backup}.",
    assistantReinstallConfirm: "Die Verwaltung von {path} auf diese HVLS-Installation übertragen?\n\nDie vorherige Installation darf in Home Assistant nicht mehr vorhanden sein. YAML und Registry werden geprüft, und es wird eine Sicherung erstellt. Kein automatisches Anwenden und keine Änderung der HA-Labels.",
    assistantReinstallChangedConfirm: "WARNUNG: Die aktuelle Datei UNTERSCHEIDET sich von der Datei, die die alte Installation registriert hat.\n\nBisheriger SHA-256: {oldSha}\nAktueller SHA-256: {newSha}\nAktuelle Entitäten: {entities}\nNormale Preview: {added} hinzugefügt, {removed} entfernt, {modified} geändert.\n\nNUR eine Übernahme der Verwaltung nach einer geprüften Sicherung erlauben? YAML und Labels werden nicht geändert. Wenden Sie die normale Preview NICHT an, bevor die Entitäten abgeglichen sind.",
    assistantReinstallChangedSuccess: "Verwaltung der ersetzten YAML mit geprüfter Sicherung wiederhergestellt: {backup}. Keine Entitäten und keine YAML geändert. WARNUNG: Die normale Preview weicht ab; wenden Sie sie erst nach dem Abgleich der Entitäten an.",
    assistantTakeoverIntro: "Prüfen Sie die wiederherstellbaren Entitäten. HVLS sichert die Datei und übernimmt sie. Die YAML wird erst nach Freigabe der Preview aktualisiert.",
    assistantTakeoverAction: "Diese Datei prüfen und übernehmen",
    assistantTakeoverConfirm: "HVLS {path} verwalten lassen?\n\nAktuelle Entitäten: {entities} ({issues} zu prüfen).\nUnterschiede in der Preview: {added} hinzugefügt, {removed} entfernt, {modified} geändert.\n\nEs wird eine verpflichtende Sicherung erstellt. Die Produktivdatei wird NICHT bearbeitet und es wird nichts angewendet. Damit wird nur die künftige Verwaltung durch HVLS erlaubt.",
    assistantTakeoverSuccess: "HVLS verwaltet jetzt diese YAML. Geprüfte Sicherung: {backup}. Nichts angewendet. Prüfen Sie die Unterschiede in der Preview, bevor Sie anwenden.",
    assistantTakeoverFailure: "Übernahme abgelehnt oder unvollständig: Prüfen Sie YAML, Sicherungen und Eigentumsstatus und aktualisieren Sie dann. Kein automatisches Anwenden.",
    assistantTakeoverRegistrationFailed: "Sicherung erstellt, aber die Verwaltung wurde nicht übertragen. Prüfen Sie die Home-Assistant-Protokolle (HVLS recovery). Wiederholen Sie die Übernahme nicht vor einer Diagnose.",
    assistantTakeoverBusy: "Vorhandene YAML wird geprüft und gesichert…",
    assistantAdoptConfirm: "HVLS-Labels zu {count} geeigneten Entitäten hinzufügen? Weder die Quell-YAML noch Google Assistant werden geändert. Jede Hinzufügung wird einzeln geprüft: Schlägt eine fehl, bleiben frühere erfolgreiche Hinzufügungen bestehen und werden gemeldet.",
    assistantAdoptBusy: "HVLS-Labels werden hinzugefügt: {done} / {total}",
    assistantAdoptDone: "{count} Label(s) hinzugefügt. Original-YAML beibehalten; eine neue Preview wurde angefordert. Prüfen Sie sie vor dem Anwenden.",
    assistantAdoptStopped: "{count} Label-Hinzufügung(en) vor der Unterbrechung bestätigt. Prüfen Sie den aktualisierten Katalog: Ein unbeantworteter Vorgang könnte dennoch erfolgreich gewesen sein. Keine automatische Wiederholung.",
    assistantAdoptStale: "Datei oder Katalog haben sich seit der Prüfung geändert. Erneut prüfen, bevor Sie eine Preview vorbereiten.",
    assistantAdoptNeedsReview: "Unterschiede zwischen alter YAML und aktuellem HA erscheinen in der Preview. Fehlende und nicht geeignete Entitäten blockieren die anderen nicht.",
    assistantAdoptTruncated: "Die Datei enthält zu viele Einträge für einen vollständigen Wiederverwendungsplan; es werden keine Massen-Label-Hinzufügungen vorgeschlagen.",
    assistantProvenanceAdvanced: "ⓘ Herkunft der Datei und Prüfung historischer Sicherungen (optional)",
    assistantProvenanceStep: "Herkunft der Datei (optional)",
    assistantProvenanceQuestion: "Woher stammt diese Datei, soweit Sie wissen?",
    assistantProvenanceOld: "Sie gehörte zu einer früheren Google-Assistant-Konfiguration",
    assistantProvenanceUnknown: "Ich kenne ihre Herkunft nicht",
    assistantProvenanceNew: "Sie wurde für eine neue Konfiguration vorbereitet",
    assistantProvenanceVerifiedTitle: "Was HVLS geprüft hat",
    assistantProvenanceVerified: "Die YAML-Datei wurde gelesen und ihre Deklarationen gezählt. Es wurde nichts geändert.",
    assistantProvenanceAnomalies: "{count} Entität(en) haben lokale Probleme: Die übrigen Einträge bleiben prüfbar. Jedes Problem muss geprüft werden, bevor Sie über diese Entität entscheiden.",
    assistantProvenanceMissingTitle: "Was nicht geprüft ist",
    assistantProvenanceMissing: "In der analysierten Konfiguration wurde kein google_assistant:-Verweis auf diese Datei gefunden. Globale Freigaberegeln, die tatsächlich geladene Konfiguration und der Gerätestatus in Google Home sind nicht festgestellt.",
    assistantProvenanceNextTitle: "Empfohlene nächste Prüfung",
    assistantProvenanceNextOld: "Suchen Sie eine ältere Sicherung von configuration.yaml und eine eventuell eingebundene google_assistant.yaml. Prüfen Sie, ob entity_config auf diese Datei verwies und welche Einstellungen für expose_by_default und exposed_domains galten. Aktivieren Sie nichts nur zu Prüfzwecken.",
    assistantProvenanceNextUnknown: "Durchsuchen Sie Home-Assistant-Sicherungen und alte Google-Assistant-Dateien nach einem ausdrücklichen Verweis auf diese Datei und ihre globalen Regeln. Solange die Herkunft nicht geklärt ist, betrachten Sie sie als Hinweis, nicht als Migrationsquelle.",
    assistantProvenanceNextNew: "Diese Datei kann zur Vorbereitung einer neuen Konfiguration dienen, ist aber keine geprüfte Migration. Kehren Sie zum Weg „neue Konfiguration“ zurück, wenn das Ihr Ziel ist; aktivieren Sie Google Assistant nicht automatisch.",
    assistantProvenanceNextChoose: "Wählen Sie oben die Herkunft der Datei, um die für Ihre Situation passenden Prüfungen zu sehen.",
    assistantProvenanceSafety: "Ihre Antwort gilt nur für diesen Bildschirm und wird nicht gespeichert. Sie bestätigt weder eine frühere Freigabe noch den Status in Google Home und schaltet keine Migration frei.",
    assistantProvenanceCategory: "Angegebene Herkunft, nicht geprüft",
    assistantProvenanceSourceLabel: "Geprüfte Datei",
    assistantProvenanceChecklistTitle: "Wie finde ich die ursprüngliche Konfiguration?",
    assistantProvenanceChecklistTrigger: "ⓘ Praktische Anleitung: wo man in einer Sicherung sucht",
    assistantProvenanceChecklistIntro: "Diese Prüfungen erfolgen manuell an einer Kopie der Sicherung. HVLS durchsucht, entpackt oder ändert in diesem Schritt keine Sicherung.",
    assistantProvenanceChecklist1: "Öffnen Sie eine Kopie einer älteren Home-Assistant-Sicherung, ohne sie in Ihre aktive Installation wiederherzustellen.",
    assistantProvenanceChecklist2: "Suchen Sie in configuration.yaml nach einer direkten google_assistant:-Deklaration oder nach google_assistant: !include datei.yaml.",
    assistantProvenanceChecklist3: "Wird eine Datei eingebunden, prüfen Sie sie in der Kopie. Suchen Sie nach entity_config: !include ... und vergleichen Sie den Verweis mit der geprüften Datei.",
    assistantProvenanceChecklist4: "Notieren Sie nur relevante Einstellungen (expose_by_default, exposed_domains). Geben Sie keine Geheimnisse, Schlüssel oder Dienstkonten weiter.",
    assistantProvenanceChecklistEnd: "Ein in einer Sicherung gefundener Verweis ist ein möglicher Hinweis auf eine frühere Konfiguration; er allein beweist nicht, dass Google Home diese Entitäten tatsächlich freigegeben hat.",
    assistantProvenanceSourceLabelUnknown: "Hier wird keine Sicherungskopie automatisch analysiert.",
    assistantHistoryTitle: "Eine Kopie einer älteren Konfiguration prüfen",
    assistantHistoryHow: "Legen Sie im Datei-Editor von HA im Konfigurationsordner den Ordner hvls-history-review an. Legen Sie dort nur Kopien der älteren configuration.yaml und der für Google Assistant eingebundenen YAML-Dateien ab und behalten Sie die relativen Ordner bei. Stellen Sie kein Archiv wieder her und kopieren Sie keine Geheimnisse.",
    assistantHistoryFolder: "Kopie-Ordner: hvls-history-review (neben configuration.yaml, ersetzt diese nie).",
    assistantHistoryAction: "Historische Kopie prüfen (schreibgeschützt)",
    assistantHistoryBusy: "Isolierte Kopie wird geprüft…",
    assistantHistoryIdle: "Auf diesem Weg wurde noch keine historische Kopie geprüft.",
    assistantHistoryNoFolder: "hvls-history-review fehlt. Legen Sie den Ordner manuell an und legen Sie nur die zu prüfenden YAML-Dateien hinein.",
    assistantHistoryNoConfig: "configuration.yaml wurde in hvls-history-review nicht gefunden.",
    assistantHistoryBlocked: "Prüfung abgelehnt: {reason}. Prüfen Sie nur die Kopie; ändern Sie nicht die aktive Konfiguration.",
    assistantHistoryUnavailable: "Historische Prüfung nicht verfügbar. Es wurden keine Dateien geändert.",
    assistantHistoryFound: "Historische Deklaration: {declaration}.",
    assistantHistoryDeclDirect: "direkt in configuration.yaml",
    assistantHistoryDeclIncluded: "über eine !include-Datei",
    assistantHistoryDeclAbsent: "in der Kopie nicht gefunden",
    assistantHistoryDeclUnknown: "nicht bestimmt",
    assistantHistoryRules: "Historische globale Regel: expose_by_default = {defaultValue} ({origin}). exposed_domains: {domains}.",
    assistantHistoryRuleExplicit: "ausdrücklich deklariert",
    assistantHistoryRuleImplicit: "vom Parser angenommener Standardwert",
    assistantHistoryRuleUnknown: "nicht festgestellt",
    assistantHistoryDomainsNone: "Feld nicht deklariert",
    assistantHistoryDomainsEmpty: "ausdrücklich leere Liste",
    assistantHistorySource: "Quelle von entity_config: {source}.",
    assistantHistorySourceInline: "Entitäten direkt deklariert",
    assistantHistorySourceAbsent: "kein Feld entity_config",
    assistantHistorySourceUnknown: "nicht aufgelöst",
    assistantHistoryCompare: "Verweis auf die gewählte Entitätsdatei: {pathStatus}. Dateiinhalt: {contentStatus}.",
    assistantHistoryPathSame: "gleicher relativer Pfad",
    assistantHistoryPathDifferent: "anderer relativer Pfad",
    assistantHistoryPathUnknown: "nicht bestimmt",
    assistantHistoryContentIdentical: "Prüfsummen zum Prüfzeitpunkt identisch",
    assistantHistoryContentDifferent: "unterschiedliche Prüfsummen",
    assistantHistoryContentUnknown: "nicht verglichen",
    assistantHistoryCounts: "{entries} deklarierte Entitäten in der Kopie; {anomalies} mit Strukturproblemen.",
    assistantHistoryIssues: "Prüfung nötig: {issues}. Die übrigen Entitäten bleiben prüfbar.",
    assistantHistoryIssueHistoricalMissing: "eingebundene Entitätsdatei fehlt in der Kopie",
    assistantHistoryIssueNoConfig: "keine Google-Assistant-Deklaration in der Kopie",
    assistantHistoryIssueNoEntity: "kein Feld entity_config in der Kopie",
    assistantHistoryIssueInline: "Entitäten direkt definiert statt in der gewählten Datei",
    assistantHistoryIssueCurrentUnavailable: "Vergleich mit der aktuell gewählten Entitätsdatei nicht möglich",
    assistantHistoryReasonUnsafe: "YAML-Verweis außerhalb des isolierten Ordners oder dort nicht erlaubt",
    assistantHistoryReasonPackages: "Packages-Konfiguration nicht unterstützt",
    assistantHistoryReasonSyntax: "ungültige YAML-Syntax, -Struktur oder doppelter Schlüssel",
    assistantHistoryReasonSymlink: "symbolischer Link nicht erlaubt",
    assistantHistoryReasonTooLarge: "Datei zu groß",
    assistantHistoryReasonMissing: "eingebundene Datei fehlt",
    assistantHistoryReasonOther: "nicht unterstützte Datei oder Struktur",
    assistantHistorySafety: "Ein übereinstimmender Pfad oder eine übereinstimmende Prüfsumme betrifft nur die geprüften Dateien. Das beweist weder eine frühere Verwendung noch eine tatsächliche Freigabe in Google Home. Keine Migration und kein Schreibvorgang wird erlaubt.",
    migrationAnalyze: "Konfiguration erneut analysieren (schreibgeschützt)",
    migrationLoading: "Google-Assistant-Konfiguration wird schreibgeschützt analysiert…",
    migrationFailed: "Analyse nicht verfügbar: {error}",
    migrationStatus: "Prüfstatus",
    backupIntro: "Wählen Sie eine Sicherung, um Änderungen in der Preview vorzubereiten. YAML und Labels werden nicht geändert.",
    backupLoading: "Sicherungen werden geladen…",
    backupEmpty: "Keine Sicherungen verfügbar.",
    backupTypeAuto: "Automatisch",
    backupTypeSafety: "Sicherheit",
    backupTypeLegacy: "Alt",
    backupHistorySummary: "{total} Sicherungen · {auto} automatisch · {safety} Sicherheit · {legacy} alt",
    backupShowOlder: "{count} ältere Sicherungen anzeigen",
    backupShowRecent: "Nur die 10 neuesten anzeigen",
    backupCleanupPrepare: "Bereinigung der Sicherungen anzeigen",
    backupCleanupReview: "Vorgeschlagene Bereinigung: {keep} Sicherungen behalten, {count} Sicherungen löschen. Es wurde nichts gelöscht.",
    backupCleanupNoop: "Keine Sicherungen zum Löschen ausgewählt.",
    backupCleanupPick: "Markieren Sie die zu löschenden Sicherungen; entfernen Sie die Markierung bei denen, die Sie behalten möchten. Die 10 neuesten werden standardmäßig behalten.",
    backupCleanupSelection: "{count} zu löschen · {kept} zu behalten",
    backupCleanupSelectionTitle: "Zu löschende Sicherungen wählen",
    backupCleanupCheck: "Diese Sicherung löschen",
    backupCleanupNone: "Alle abwählen",
    backupCleanupReset: "Vorgeschlagene Auswahl wiederherstellen",
    backupCleanupKeepOne: "Behalten Sie mindestens eine Sicherung.",
    backupCleanupDeleteCount: "{count} ausgewählte Sicherungen löschen",
    backupCleanupDeleteOne: "Ausgewählte Sicherung löschen",
    backupCleanupConfirmButton: "Bereinigung bestätigen",
    backupCleanupCancel: "Bereinigung abbrechen",
    backupCleanupConfirm: "Die {count} aufgeführten Sicherungen endgültig löschen? Die {keep} neuesten werden behalten. Das kann nicht rückgängig gemacht werden.",
    backupCleanupDone: "Bereinigung abgeschlossen: {count} Sicherungen gelöscht.",
    backupCleanupFailed: "Bereinigung abgelehnt: {error}. Aktualisieren Sie die Liste und prüfen Sie erneut.",
    backupReviewing: "Vergleich mit der Produktivdatei…",
    backupMissingReview: "Die Produktivdatei fehlt. Gewählte Sicherung: {count} Entitäten. Sie können sie in der Preview vorbereiten und dann Entitäten und HA-Labels prüfen, bevor Sie bestätigen.",
    backupMissingPreview: "Die Produktivdatei fehlt. Diese Sicherung schlägt {count} Entitäten vor. Klären Sie die Unterschiede zu den aktuellen HA-Labels, bevor Sie die YAML neu aufbauen.",
    backupMissingNoSafety: "Keine (Produktivdatei fehlte)",
    backupReviewFailed: "Vergleich nicht möglich: {error}",
    backupLoadFailed: "Sicherungen können nicht geladen werden: {error}",
    backupRestore: "Diese Sicherung in der Preview vorbereiten",
    backupPreviewPrepared: "Wiederherstellung bereit. Beim Anwenden: {added} hinzugefügt, {removed} entfernt, {modified} geändert. In YAML und Labels wird nichts geschrieben, bevor Sie „Diese Wiederherstellung anwenden“ wählen.",
    backupPreviewNotExecutable: "Wiederherstellungs-Preview: Prüfen Sie die Änderungen und HA-Labels vor der Bestätigung.",
    backupPreviewApply: "Diese Wiederherstellung anwenden",
    backupPreviewConfirm: "Die geprüfte Sicherung anwenden? Produktive YAML und HA-Labels werden aktualisiert. Es wird eine Sicherheitskopie erstellt.",
    backupPreviewApplying: "Geprüfte Wiederherstellung wird angewendet…",
    backupPreviewApplied: "Wiederherstellung abgeschlossen: {entities} Entitäten, {added} Labels hinzugefügt, {removed} entfernt. Sicherheitskopie: {backup}.",
    backupPreviewApplyFailed: "Wiederherstellung abgelehnt oder unvollständig: {error}. Prüfen Sie die Produktivdatei und einen eventuellen Abgleichshinweis.",
    backupPreviewLabels: "Geplante HA-Labels: {added} hinzufügen, {removed} entfernen, {review} zu prüfen.",
    manualLabelPending: "Prüfung ausstehend",
    manualLabelPreparing: "Labels und YAML werden ohne Schreibvorgang simuliert…",
    manualLabelPrepared: "{count} Label-Änderung(en) in der Preview vorbereitet. Labels und YAML unverändert.",
    manualLabelHelp: "Vorschlag lokal in diesem Browser für Ihr Home-Assistant-Konto gespeichert. Er wird bei der Rückkehr erneut geprüft; vor „Anwenden“ werden weder Labels noch YAML geändert.",
    savedDraftRestored: "{count} ausstehende Änderung(en) gefunden und erneut geprüft. Prüfen Sie die Preview vor dem Anwenden.",
    savedDraftRestoredDetail: "Gespeicherter Vorschlag gefunden und erneut geprüft: {count} Änderung(en) ({added} hinzugefügt, {removed} entfernt, {modified} geändert). Prüfen Sie die Preview vor dem Anwenden.",
    savedDraftBlocked: "Gespeicherter Entwurf beibehalten, kann aber nicht angewendet werden: Konfiguration, Entitäten oder Schutzmechanismen haben sich geändert. Schreibvorgänge sind nicht erlaubt. Prüfen Sie die Lage und wählen Sie dann „Abbrechen“, um vom aktuellen Stand neu zu beginnen.",
    savedDraftStorageUnavailable: "Der Browser konnte diesen Vorschlag nicht speichern. Er kann beim Verlassen von HVLS verloren gehen. Wenden Sie ihn jetzt an oder brechen Sie ihn ab.",
    backupAlreadyStaged: "Diese Sicherung ist bereits in der Preview vorbereitet.",
    backupReplaceRestoreConfirm: "In der Preview wartet bereits eine Wiederherstellung. Diese abbrechen und stattdessen diese Sicherung vorbereiten? Wenn Sie ablehnen, ändert sich nichts.",
    backupReplaceProposalConfirm: "In der Preview wartet ein nicht angewendeter Label-Vorschlag. Diesen abbrechen und stattdessen diese Sicherung vorbereiten? Wenn Sie ablehnen, ändert sich nichts.",
    backupReplaceKept: "Nichts geändert: Der ausstehende Vorschlag bleibt in der Preview erhalten.",
    pendingDraftProtect: "Ein nicht angewendeter Vorschlag steht noch aus. Prüfen Sie ihn in der Preview und wenden Sie ihn an oder brechen Sie ihn ab, bevor Sie aktualisieren oder einen anderen Vorgang starten.",
    manualLabelApply: "Label-Änderungen anwenden",
    manualLabelConfirm: "Die geprüften Label-Änderungen und die YAML anwenden? Wenn eine Produktivdatei existiert, wird eine Sicherheitskopie erstellt.",
    manualLabelApplied: "Änderungen angewendet: {added} Label(s) hinzugefügt, {removed} entfernt. YAML und Labels geprüft.",
    manualLabelFailed: "Vorbereitung der Preview abgelehnt: {error}. Labels und YAML unverändert.",
    manualLabelApplyFailed: "Anwenden abgelehnt oder unvollständig: {error}. Prüfen Sie die Produktivdatei und die Abgleichsschutzmechanismen.",
    backupLabelAdd: "Hinzuzufügende Labels",
    backupLabelRemove: "Zu entfernende Labels",
    backupLabelReview: "Zu prüfende Entitäten",
    backupConfirm: "Diese YAML in die Produktivdatei zurückschreiben? Von der aktuellen Produktivdatei wird immer eine Sicherheitskopie erstellt. HA-Labels werden nicht geändert.",
    backupRestoreFailed: "Wiederherstellung abgelehnt: {error}",
    backupRestored: "Wiederherstellung abgeschlossen. Sicherheitskopie: {backup}",
    backupRestorePendingRemoval: "Warnung: {count} Entitäten der wiederhergestellten produktiven YAML fehlen in der Preview: {entities}. Das nächste Anwenden würde sie wieder entfernen. HA-Labels wurden nicht wiederhergestellt; stellen Sie diese Labels wieder her, wenn Sie die Entitäten behalten möchten.",
    backupRestorePendingOther: "Nach der Wiederherstellung schlägt die Preview noch {added} Hinzufügungen, {removed} Entfernungen und {modified} Änderungen vor. HA-Labels wurden nicht wiederhergestellt. Prüfen Sie die Änderungen vor jedem Anwenden.",
    backupRestoreNotVerified: "Die produktive YAML wurde wiederhergestellt, aber der aktualisierte Preview-Vergleich konnte nicht geprüft werden. Aktualisieren Sie die Preview und prüfen Sie die Unterschiede vor jedem Anwenden.",
    backupRestoreAligned: "Die wiederhergestellte YAML und die Preview haben pro Entität dieselbe Konfiguration. HA-Labels wurden nicht wiederhergestellt.",
    restoreReconcileTitle: "HVLS-Wiederherstellung abschließen",
    restoreReconcileSummary: "Die wiederhergestellte YAML ist geschützt. HVLS kann die Produktivdatei erst neu schreiben, wenn Sie entschieden haben, wie die Unterschiede zu den Home-Assistant-Labels aufgelöst werden.",
    restoreReconcilePending: "Die Wiederherstellung bleibt auch nach einem Neustart geschützt. Schließen Sie sie in der Preview ab, bevor Sie erneut anwenden.",
    restoreReconcileAddLabels: "Labels der wiederhergestellten Entitäten wiederherstellen",
    restoreReconcileAligned: "Übereinstimmende Konfiguration bestätigen und Wiederherstellung abschließen",
    restoreReconcileKeepCurrent: "Aktuelle Labels behalten (separates Anwenden)",
    restoreReconcileAddConfirm: "HVLS-Labels für {count} wiederhergestellte Entitäten wiederherstellen?\n{entities}\n\nKein Anwenden und keine Änderung der produktiven YAML.",
    restoreReconcileKeepConfirm: "Sie haben die aktuellen HA-Labels gewählt. Unterschiede zur wiederhergestellten YAML: {added} Hinzufügungen, {removed} Entfernungen, {modified} Änderungen. Ein späteres Anwenden kann die wiederhergestellte Konfiguration ersetzen. Die Sicherung bleibt verfügbar. Nur ein separates Anwenden freischalten (ohne es auszuführen)?",
    restoreReconcileAlignedConfirm: "Die Preview entspricht jetzt den Entitäten der wiederhergestellten YAML. Den Wiederherstellungsschutz aufheben, ohne die Produktivdatei zu ändern oder etwas anzuwenden?",
    restoreReconcileCannotAdd: "Für einige dieser Entitäten können die Labels nicht sicher wiederhergestellt werden (fehlend oder nicht geeignet). Prüfen Sie sie in der HVLS-Entitätsverwaltung.",
    restoreReconcileAfterLabels: "Die Labels wurden wiederhergestellt, aber die Preview weicht noch von der wiederhergestellten YAML ab. „Anwenden“ bleibt gesperrt. Prüfen Sie die Anpassungen.",
    restoreReconcileResolved: "Wiederherstellung abgeglichen. Produktive YAML unverändert; nichts angewendet.",
    restoreReconcileError: "Abgleich abgelehnt oder unvollständig. Schreibvorgänge bleiben gesperrt. Aktualisieren und Unterschiede prüfen.",
    restoreReconcileWorking: "Labels werden abgeglichen und der Zustand geprüft…",
    restoreReconcileDiff: "Unterschiede Preview / wiederhergestellte Produktivdatei: {added} hinzugefügt, {removed} entfernt, {modified} geändert.",
    restoreReconcileCancelFailed: "Unterbrochene Wiederherstellung abbrechen",
    restoreReconcileCancelFailedConfirm: "Die Wiederherstellung wurde vor der Bearbeitung der produktiven YAML gestoppt. Der ursprüngliche Dateizustand wurde geprüft. Den Wiederherstellungsschutz aufheben, ohne Labels oder YAML zu ändern?",
    restoreReconcileUncertain: "Der YAML-Zustand konnte nach der Unterbrechung nicht geprüft werden. Keine automatische Freigabe; prüfen Sie Sicherungen und Eigentumsstatus.",
    backupNoDiff: "Die YAML entspricht der Produktivdatei.",
    backupTextOnlyDiff: "Keine Unterschiede pro Entität. Nur der YAML-Text unterscheidet sich (zum Beispiel Kommentare, Reihenfolge oder Formatierung). Eine Wiederherstellung würde den Text der Produktivdatei nach einer Sicherheitskopie ersetzen.",
    backupRestoreTextOnly: "Textunterschiede der YAML in der Preview anzeigen",
    backupConfirmTextOnly: "Die Entitätskonfigurationen sind identisch, aber der YAML-Text unterscheidet sich. Den exakten Text der Sicherung in die Produktivdatei zurückschreiben? Von der aktuellen Produktivdatei wird immer eine Sicherheitskopie erstellt. HA-Labels werden nicht geändert.",
    backupDiffTitle: "Änderungen bei Wiederherstellung dieser Sicherung",
    backupSize: "{size} Bytes",
    backupEntities: "{count} Entitäten",
    backupRestartHint: "Die YAML-Datei wurde auf dem Datenträger wiederhergestellt. Starten Sie Home Assistant neu, damit Google Assistant seine Konfiguration neu lädt.",
    refreshEntities: "Entitäten aktualisieren",
    loadingEntities: "Entitäten werden geladen…",
    searchPlaceholder: "Nach Name, Entitäts-ID oder Bereich suchen…",
    searchLabel: "Entitäten suchen",
    filterLabel: "Entitäten filtern",
    filterAll: "Alle Entitäten",
    filterWith: "Mit HVLS",
    filterWithout: "Ohne HVLS",
    filterEligibleWithout: "Ohne HVLS — geeignet",
    assistantReportIssue: "Problem auf GitHub melden",
    filterIneligible: "Nicht geeignet",
    actionAdd: "HINZUFÜGEN",
    actionRemove: "ENTFERNEN",
    confirmLabel: "HVLS-Label {action}?",
    otherLabelsPreserved: "Alle anderen Labels bleiben erhalten.",
    ineligibleWarning: "Warnung: Diese Entität ist derzeit nicht geeignet.",
    updateFailed: "Aktualisierung des HVLS-Labels für {entity} abgelehnt:",
    reloadFailed: "Das Label wurde in HA aktualisiert, aber der Entitätskatalog konnte nicht neu geladen werden. Verwenden Sie „Entitäten aktualisieren“.",
    domainsSupported: "Von HVLS unterstützte Domänen",
    domainsUnsupported: "Nicht unterstützte Domänen",
    domainCount: "{count} Domänen · {entities} Entitäten",
    entitiesCount: "{count} Entitäten",
    catalogStatus: "{matching} passende Entitäten · {labeled} von {total} gelabelt · Label: {label}",
    noMatches: "Keine Entitäten entsprechen den Filtern.",
    noArea: "Kein Bereich",
    withoutHVLS: "— Kein HVLS-Label",
    unknownHVLS: "HVLS · Status unbekannt",
    ineligibleState: "Nicht geeignet",
    notEligible: "Diese Entität erfüllt die HVLS-Auswahlregeln nicht.",
    exclusionIntro: "Von der durch HVLS erzeugten Google-Assistant-Konfiguration ausgeschlossen:",
    reasonDomain: "ihre Domäne wird von HVLS nicht unterstützt.",
    reasonClass: "ihre Klasse (Sensor, Binärsensor oder Ereignis) wird von HVLS nicht unterstützt.",
    reasonDisabled: "sie ist in Home Assistant deaktiviert.",
    reasonHidden: "sie ist in Home Assistant ausgeblendet.",
    reasonCategory: "sie ist eine Konfigurations- oder Diagnose-Entität.",
    exclusionHelp: "Warum diese Entität ausgeschlossen ist",
    exclusionFootnote: "Sie bleibt in Home Assistant. HVLS wählt sie nicht für Google Assistant aus.",
    moreDomain: "100 weitere anzeigen ({shown}/{total})",
    moreEntities: "100 weitere Entitäten anzeigen",
    excludedTitle: "Ausgeschlossene Entitäten ({count})",
    excludedExplanation: "Entitäten mit dem HVLS-Label, die die aktuellen Auswahlregeln nicht erfüllen.",
    excludedEmpty: "Keine gelabelten Entitäten sind ausgeschlossen.",
    excludedNote: "Die Diagnose verwendet die aktuellen Registries. Die angezeigte YAML stammt aus der zuletzt erzeugten Preview.",
    unknownReason: "Unbekannter Grund",
    reasonFilterTitle: "Gründe für fehlende Eignung",
    reasonFilterAll: "Alle auswählen",
    reasonFilterOnly: "nur",
    reasonFilterOnlyAria: "Nur anzeigen: {reason}",
    reasonFilterNone: "Kein Grund ausgewählt. Wähle mindestens einen Grund, um Entitäten anzuzeigen.",
    reasonShort_domain_not_enabled: "Nicht unterstützte Domäne",
    reasonShort_unsupported_device_class: "Nicht unterstützte Klasse",
    reasonShort_disabled: "Deaktiviert",
    reasonShort_hidden: "Ausgeblendet",
    reasonShort_entity_category: "Konfiguration / Diagnose",
    reasonShort_other: "Unbekannter Grund",
    reasonDetailDomain: "Domäne: {domain}",
    reasonDetailClass: "Klasse: {deviceClass}",
    reasonDetailNoClass: "Klasse: keine",
    reasonDetailConfig: "Kategorie: Konfiguration",
    reasonDetailDiagnostic: "Kategorie: Diagnose",
    reasonCategoryFull: "Konfigurations- oder Diagnose-Entität",
    metricEntities: "Produktive Entitäten",
    productionStatsUnavailable: "Produktionsstatistik nicht verfügbar: Datei fehlt, ist unlesbar oder ungültig.",
    initialLabelsDetected: "{count} Entitäten mit HVLS-Label in Home Assistant gefunden. Sie können die erste YAML aus dieser Auswahl erstellen.",
    initialLabelsPreview: "Erste Preview vorbereiten ({count} Entitäten)",
    initialPendingPreview: "Ausstehende Preview prüfen ({count} Änderung(en))",
    initialYamlPreview: "Erste Konfiguration: {count} Entitäten aus den aktuellen HA-Labels vorgeschlagen. Die YAML wird erst nach Freigabe erstellt.",
    productionRemoval: "Entfernung in der Preview ausstehend: Die Entität ist noch in der Produktivdatei",
    metricRooms: "Bereiche",
    byDomain: "Nach Domäne",
    byArea: "Nach Bereich",
    disabledDomains: "Von der HVLS-Auswahl ausgeschlossene Domänen",
    noDisabledDomains: "Keine deaktivierten Domänen gefunden.",
    labeledOnly: "Nur Entitäten mit HVLS-Label.",
    comparisonTitle: "Unterschiede Preview / Produktivdatei",
    pendingChanges: "{count} Änderung(en) vor dem Anwenden zu prüfen",
    pendingAction: "Preview öffnen",
    productionValidated: "Bereits in der produktiven YAML vorhanden",
    productionPending: "Hinzufügung zur produktiven YAML ausstehend",
    productionModified: "In der Produktivdatei vorhanden, Änderungen ausstehend",
    productionUnknown: "Produktionsstatus unbekannt: Preview aktualisieren",
    comparisonMissing: "Vergleich nicht möglich: Produktivdatei fehlt.",
    comparisonFailed: "Vergleich nicht möglich ({status}): {reason}",
    unreadableFile: "unlesbare Datei",
    added: "Hinzugefügt",
    removed: "Entfernt",
    modified: "Geändert",
    unchanged: "Unverändert",
    identicalYaml: "✓ Keine Unterschiede: Die YAML entspricht der Produktivdatei.",
    identicalEntities: "✓ Gleiche Konfiguration pro Entität (nur Formatierungsunterschiede in der YAML).",
    entitiesAdded: "Hinzugefügte Entitäten",
    entitiesRemoved: "Entfernte Entitäten",
    removalReasonProposal: "Grund: HVLS-Label in diesem Vorschlag entfernt.",
    removalReasonBackup: "Grund: heute freigegeben, aber nicht in der Sicherung enthalten.",
    removalReasonNoLabel: "Grund: hat in Home Assistant kein HVLS-Label mehr.",
    removalReasonMissing: "Grund: existiert in Home Assistant nicht mehr.",
    removalReasonIneligible: "Grund: {detail}",
    entitiesModified: "Geänderte Entitäten",
    previewLoading: "Preview wird geladen…",
    previewMissing: "Keine Preview verfügbar. Erzeugen Sie zuerst eine.",
    previewReady: "Preview: {path} — Produktivdatei: {production}",
    previewLoadFailed: "Preview kann nicht geladen werden: {error}",
    previewGenerating: "Preview wird erzeugt…",
    previewGenerated: "Preview erzeugt: {count} Entitäten. Prüfen Sie die Unterschiede vor dem Anwenden.",
    previewGenerateFailed: "Preview konnte nicht erzeugt werden: {error}",
    applyInfoLabel: "Warum ist „Anwenden“ deaktiviert?",
    cancelPreview: "Abbrechen",
    previewCancelled: "Preview abgebrochen: Es wurde nichts geändert.",
    backupIgnoreUpdating: "Preview wird mit den Ausschlüssen neu berechnet…",
    backupIgnoreFailed: "Preview kann nicht neu berechnet werden: {error}. YAML und Labels unverändert.",
    backupIgnoreSelected: "Auswahl gespeichert: {count} Entität(en) ignoriert, {refreshed} mit aktuellem Namen und Bereich wiederhergestellt. Keine Datei und kein Label geändert.",
    restoreBlockerField: "{field}: Sicherung „{before}“ → Home Assistant heute „{after}“",
    restoreFieldName: "Name",
    restoreFieldRoom: "Bereich",
    restoreValueAbsent: "(keiner)",
    planCol_out: "Nicht wiederhergestellt ({count})",
    planCol_current: "Name oder Bereich geändert ({count})",
    planCol_result: "Ergebnis für Google ({count})",
    planSub_out: "Für sie ändert sich nichts.",
    planSub_current: "Mit den aktuellen Home-Assistant-Werten wiederhergestellt.",
    planSub_result: "Was tatsächlich geschrieben wird.",
    planHelpLabel: "Hilfe",
    planHelp_out: "Entitäten der Sicherung, die nicht zurückgeholt werden. „Unmöglich“: Sie existieren nicht mehr, sind nicht mehr geeignet oder haben Optionen, die HVLS nicht erzeugt. Bei den anderen haben Sie entschieden, sie nicht wiederherzustellen: Ihr aktueller Zustand ändert sich nicht.",
    planHelp_current: "Diese Entitäten wurden seit der Sicherung in Home Assistant umbenannt oder verschoben. Sie werden mit dem heutigen Namen und Bereich wiederhergestellt, nicht mit denen der Sicherung. „Zurücknehmen“ verschiebt sie nach „Nicht wiederhergestellt“.",
    planHelp_result: "Die genaue Liste der Entitäten, die nach der Wiederherstellung für Google freigegeben sind. „Hinzugefügt“: heute nicht freigegeben. „Bereits freigegeben“: keine Änderung. In Rot: heute freigegeben, aber nicht in der Sicherung; sie wird entfernt, außer Sie behalten sie.",
    planSumRestored: "Aus der Sicherung wiederhergestellt",
    planSumExposed: "Nach der Wiederherstellung freigegeben",
    planSumAdded: "Durch die Sicherung hinzugefügt",
    planSumAlready: "Heute bereits freigegeben",
    planSumRemoved: "Nicht mehr freigegeben",
    planNotReady: "Einige Entitäten müssen noch geklärt werden, bevor diese Wiederherstellung angewendet werden kann.",
    planActionRestore: "Wiederherstellen →",
    planActionWithdraw: "← Zurücknehmen",
    planActionKeep: "Behalten",
    planActionSkip: "Nicht wiederherstellen",
    planTagPending: "zu klären",
    planTagLocked: "unmöglich",
    planTagRemoved: "entfernt",
    planTagKept: "behalten",
    planTagCurrent: "aktueller Name/Bereich",
    planTagAdded: "hinzugefügt",
    planTagAlready: "bereits freigegeben",
    planKeepQuestion: "{count} heute freigegebene Entität(en) sind nicht in der Sicherung enthalten. Möchten Sie sie behalten?",
    planKeepAll: "Alle behalten",
    planRemoveAll: "Alle entfernen",
    planRecommended: "↺ Zurück zur Empfehlung",
    planEmpty: "Keine",
    planReasonMissing: "fehlt in Home Assistant",
    planReasonNotExposed: "in der Sicherung nicht freigegeben",
    planReasonIneligible: "nicht geeignet ({reason})",
    planReasonOptions: "nicht reproduzierbare Optionen: {fields}",
    planReasonConflict: "nicht reproduzierbarer Unterschied",
    planReasonRemoved: "heute freigegeben, nicht in der Sicherung",
    planReasonNoLabel: "heute freigegeben, hat in Home Assistant aber kein HVLS-Label mehr",
    planTechDetails: "Technische Details: Home-Assistant-Labels",
    planConfirmSummary: "Nach der Wiederherstellung: {exposed} Entität(en) für Google freigegeben ({added} hinzugefügt, {already} bereits freigegeben).",
    planConfirmRemoved: "Nicht mehr freigegeben ({count}): {entities}.",
    planConfirmCurrent: "Mit aktuellem Namen und Bereich ({count}): {entities}.",
    planConfirmOut: "Nicht wiederhergestellt ({count}): {entities}.",
    applyNoChanges: "Keine Änderungen anzuwenden: Die Preview entspricht bereits der Produktivdatei.",
    applyReasonMissingIdentity: "Die Identität der HVLS-Installation ist nicht verfügbar.",
    applyReasonUnsafePath: "Der Ausgabe- oder Registry-Pfad ist unsicher. Prüfen Sie auf symbolische Links.",
    applyReasonReservedPath: "Der Ausgabepfad kollidiert mit reservierten HVLS-Metadaten.",
    applyReasonRegistryInvalid: "Die HVLS-Eigentumsregistry ist ungültig oder unlesbar. Eine Prüfung ist erforderlich.",
    applyReasonOtherInstallation: "Diese Datei gehört zu einer anderen HVLS-Installation. Schreiben ist untersagt.",
    applyReasonUnmanagedOutput: "Eine vorhandene YAML-Datei ist nicht als HVLS-eigen bestätigt. Sie bleibt geschützt.",
    applyUnmanagedAssistantHint: "Der Assistent kann diese Datei schreibgeschützt prüfen. Die Prüfung schaltet „Anwenden“ nicht automatisch frei.",
    applyUnmanagedAssistantAction: "Im Assistenten prüfen",
    applyReasonMissingDirectory: "Das Ausgabeverzeichnis ist nicht verfügbar.",
    applyReasonVerificationFailed: "Die Sicherheitsprüfung der Datei ist fehlgeschlagen. „Anwenden“ bleibt deaktiviert.",
    applyReasonOutputPathMismatch: "Der Ausgabepfad entspricht nicht mehr dem von HVLS registrierten Pfad.",
    applyReasonPendingOperation: "Ein HVLS-Vorgang ist unvollständig. Vor dem Anwenden ist eine kontrollierte Wiederherstellung nötig.",
    applyReasonManagedOutputMissing: "Die bisher von HVLS verwaltete Ausgabedatei fehlt.",
    missingRebuildAction: "Fehlende YAML neu erstellen",
    missingRebuildReview: "Die bisher von HVLS verwaltete YAML fehlt. {count} Entitäten können aus den aktuellen HA-Labels neu erstellt werden. Prüfen Sie die YAML, bevor Sie bestätigen.",
    missingRebuildConfirm: "Die HVLS-Produktivdatei fehlt. Sie aus der geprüften Preview und den aktuellen HA-Labels neu erstellen? Labels werden nicht geändert und vorhandene Sicherungen bleiben erhalten. Taucht die Datei wieder auf, wird der Vorgang abgelehnt.",
    missingRebuildApplied: "YAML neu erstellt: {path} — {bytes} Bytes geschrieben. HA-Labels unverändert.",
    missingRebuildBackups: "Sicherungen ansehen",
    missingRebuildDetected: "Die HVLS-Produktivdatei fehlt. Sie können eine Sicherung wiederherstellen oder sie nach Prüfung der Preview aus {count} in HA gelabelten Entitäten neu erstellen.",
    applyReasonOutputChanged: "Die von HVLS verwaltete Datei hat sich seit der letzten SHA-256-Prüfung geändert.",
    applyReasonNotConfigured: "HVLS ist noch nicht eingerichtet.",
    applyVerificationUnavailable: "„Anwenden“ kann nicht bestätigt werden: Sicherheitsinformationen fehlen oder sind widersprüchlich. Aktualisieren Sie die Preview.",
    bulkRemovalWarning: "WARNUNG: {removed} von {before} Entitäten werden aus der produktiven YAML entfernt (nach dem Anwenden: {after}). Prüfen Sie die roten Entfernungen, bevor Sie fortfahren.",
    emptySelectionConfirm: "Damit wird die letzte HVLS-Entität entfernt: Danach ist keine Entität mehr in der YAML freigegeben. Entfernen aller Entitäten bestätigen?",
    bulkRemovalConfirm: "UMFANGREICHE ENTFERNUNG: {removed} von {before} Entitäten werden aus der produktiven YAML entfernt (neue Gesamtzahl: {after}). Dabei können auch HA-Labels entfernt werden. Bestätigen Sie diese Entfernungen ausdrücklich?",
    applyConfirm: "Diese Preview auf die Google-Assistant-Konfiguration anwenden?",
    applyWarning: "Die aktuelle Datei wird gesichert, sofern Sicherungen aktiviert sind. Der Vorgang wird abgelehnt, wenn seit Ihrer Prüfung Änderungen festgestellt werden.",
    previewApplying: "Preview wird geprüft und angewendet…",
    previewApplied: "Preview angewendet: {path} — {bytes} Bytes geschrieben{backup}",
    backupCreated: "Sicherung: {path}",
    previewApplyFailed: "Anwenden abgelehnt: {error}. Aktualisieren Sie die Preview, bevor Sie es erneut versuchen.",
    noYaml: "Keine YAML zum Kopieren.",
    copyUnsupported: "Kopieren im Browser fehlgeschlagen.",
    yamlCopied: "YAML kopiert — {path}",
    copyFailed: "Kopieren nicht möglich: {error}",
    registriesLoading: "HA-Registries werden geladen…",
    entitiesLoadFailed: "Entitäten können nicht geladen werden: {error}",
    inconsistentRegistry: "Widersprüchliche Antwort der HA-Registry",
    waitingHA: "Warten auf Home Assistant…",
    tabsLabel: "HVLS-Bereiche",
    rawDiffSummary: "Detaillierter YAML-Vergleich",
    hvlsLabelAria: "HVLS-Label: {entity}",
    entityMoreInfo: "Details von {entity} in Home Assistant anzeigen",
    catalogWarning: "Warnung: {warnings}",
    absentValue: "(fehlt)",
    showPreviewYaml: "YAML der Preview anzeigen",
    changesProposed: "Vorgeschlagene Google-Assistant-Änderungen",
    recoveryDiffTitle: "Unterschiede zwischen alter und neuer YAML",
    recoveryDiffSummary: "Alte Datei: {before} Entitäten → Vorgeschlagene neue Datei: {after} Entitäten.",
    changesIntro: "Prüfen Sie die Unterschiede, bevor Sie die Konfiguration anwenden.",
    noChanges: "Keine Entitätsänderungen anzuwenden.",
    removalNote: "Wenn Sie eine Entität hier entfernen, wird sie nicht aus Home Assistant gelöscht: Nur ihre Google-Assistant-Konfiguration ändert sich.",
    firstProduction: "Keine vorhandene Produktivkonfiguration: Unterschiede zu einer früheren Datei können nicht berechnet werden.",
    fieldBefore: "Vorher",
    fieldAfter: "Nachher",
    fileIssue_invalid_entity_file_path: "ungültiger Pfad",
    fileIssue_sensitive_file_reference: "sensible Datei",
    fileIssue_symlink_entity_file_not_allowed: "symbolischer Link nicht erlaubt",
    fileIssue_include_missing: "Datei nicht gefunden",
    fileIssue_yaml_syntax_error: "ungültige YAML",
    fileIssue_duplicate_mapping_key: "doppelter YAML-Schlüssel",
    fileIssue_yaml_file_too_large: "Datei zu groß",
    fileIssue_expected_mapping: "ungültige YAML-Struktur",
    fileIssue_unreadable_yaml_file: "unlesbare Datei",
    fileIssue_entity_file_unavailable: "Datei nicht verfügbar",
    fileIssue_invalid_entity_id: "ungültige Entitäts-ID",
    fileIssue_invalid_entity_options: "ungültige Entitätsoptionen",
    fileIssue_invalid_expose_value: "ungültiger expose-Wert",
    fileIssue_invalid_room_option: "ungültige room-Option",
    fileIssue_invalid_name_option: "ungültige name-Option",
    fileIssue_invalid_aliases_option: "ungültige aliases-Option",
    fileIssue_unhandled_entity_option: "nicht unterstützte Option",
    fileIssueUnknown: "unbekanntes Problem",
    fileIssueLine: "Zeile"
  },
  es: {
    generate: "Generar Preview",
    refresh: "Actualizar todos los datos",
    copy: "Copiar YAML",
    apply: "Aplicar Preview",
    settings: "Ajustes",
    menu: "Abrir el menú de Home Assistant",
    tabStats: "Estadísticas",
    tabExclusions: "Entidades excluidas",
    tabEntities: "Gestión de entidades HVLS",
    tabPreview: "Preview",
    tabBackups: "Copias de seguridad",
    tabMigration: "Asistente",
    migrationIntro: "HVLS genera el YAML de tus entidades a partir de las etiquetas de Home Assistant. Gestionar las etiquetas no requiere conexión con Google Assistant. La inspección es de solo lectura; los cambios de etiquetas y «Aplicar» requieren una confirmación explícita.",
    migrationGuideTitle: "Identifiquemos tu situación",
    migrationGuideStepIdentify: "Paso 1 — Identificar tu situación",
    migrationGuideStepVerify: "Paso 2 de 2 — Revisar las comprobaciones recomendadas",
    assistantProvenanceStepVerify: "Inspeccionar el archivo YAML que quieres reutilizar",
    migrationManagedNotice: "HVLS gestiona ahora el archivo de entidades de producción. Usa la Preview para hacer cambios. Los diagnósticos anteriores siguen disponibles en las herramientas avanzadas.",
    migrationGuideDetected: "No se ha detectado ninguna declaración google_assistant:. Esto no impide que HVLS gestione y genere un archivo YAML de entidades.",
    migrationGuideCandidate: "Existe un archivo google_assistant_entities.yaml. Puedes reutilizarlo para inicializar las etiquetas HVLS, incluso sin conexión con Google Assistant.",
    migrationGuideNoCandidate: "No se ha detectado el archivo habitual google_assistant_entities.yaml. Puede haber otras fuentes.",
    migrationGuideQuestion: "¿Cómo quieres empezar a usar HVLS?",
    migrationGuideNew: "Seleccionar mis entidades en HA",
    migrationGuideExisting: "Reutilizar un archivo de entidades existente",
    migrationGuideUnsure: "Elegir otro archivo",
    migrationGuideNextNew: "Selecciona las entidades en «Gestión de entidades HVLS». Las etiquetas existentes no cambian. Antes de cualquier escritura sigue siendo necesaria la aprobación de la Preview.",
    migrationGuideNextExisting: "Inspecciona el archivo de entidades y después revisa las etiquetas que se importarán. No se necesita conexión con Google Assistant.",
    migrationGuideNextUnsure: "Introduce la ruta relativa del archivo YAML que quieres reutilizar y después inspecciónalo.",
    migrationGuideAwaitChoice: "Elige si quieres reutilizar este archivo, seleccionar otro o empezar de cero.",
    migrationGuideNoAuthorization: "Esta elección se queda en esta pantalla; no aprueba ninguna migración ni permite escrituras.",
    assistantSourceFound: "Configuración de Google Assistant detectada",
    assistantSourceSummary: "{entries} declaraciones explícitas de entidades. Archivos inspeccionados: {paths}. No se certifica ninguna exposición en Google Home.",
    assistantPackagesDetected: "Configuración con packages detectada: clasificada como «Otra configuración», no se inspecciona automáticamente.",
    assistantPackagesQuestion: "Introduce la ruta del archivo YAML de entidades para inspeccionarlo manualmente.",
    assistantFileHelp: "ⓘ Mostrar ejemplos de sintaxis YAML",
    assistantGoogleConnectionHint: "No se ha detectado ninguna conexión con Google Assistant en la configuración inspeccionada. Revisa configuration.yaml con los ejemplos de abajo. HVLS puede gestionar entidades igualmente sin esta conexión.",
    assistantExampleDirect: "En configuration.yaml:",
    assistantExampleProjectId: "TU_PROJECT_ID",
    assistantExampleInclude: "Alternativa con un archivo incluido en configuration.yaml:",
    assistantExampleIncludedContent: "En google_assistant.yaml:",
    assistantExampleNote: "Sustituye project_id por tu proyecto de Google y SERVICE_ACCOUNT.json por tu archivo de cuenta de servicio (nunca muestres su contenido). project_id y service_account son obligatorios para la configuración manual; report_state es opcional. Revisa los ajustes activos antes de cambiarlos: estos ejemplos no establecen una conexión funcional con Google Home. secure_devices_pin (opcional, quita el comentario) es el código que dices para abrir una cerradura, desarmar una alarma o abrir una puerta o un portón; guárdalo en secrets.yaml, entre comillas (por ejemplo google_secure_pin: \"1234\").",
    assistantFileTitle: "Archivo de entidades",
    assistantFileCandidate: "Archivo detectado sugerido; puedes modificar esta ruta.",
    assistantFileManual: "Introduce la ruta del archivo YAML de entidades.",
    assistantFilePathLabel: "Ruta relativa a la carpeta de configuración de Home Assistant",
    assistantFilePlaceholder: "google_assistant_entities.yaml",
    assistantFileCheck: "Inspeccionar archivo (solo lectura)",
    assistantFileChecking: "Inspección de solo lectura…",
    assistantFileNotChecked: "Todavía no se ha inspeccionado ningún archivo.",
    assistantFileChecked: "{entries} entidad(es) declarada(s) · {anomalies} problema(s) estructural(es) local(es) detectado(s).",
    assistantFileIssues: "Revisar: {issues}. Corrige si es necesario y vuelve a comprobar.",
    assistantFileNoIssues: "No se han encontrado problemas estructurales. Esto no garantiza una configuración activa ni la exposición en Google Home.",
    assistantFileCannotRead: "No se puede inspeccionar el archivo: {reason}.",
    assistantFileUnavailable: "Inspección no disponible. No se ha cambiado nada.",
    assistantFileSafety: "Inspeccionar un archivo no demuestra la exposición en Google Home. Las etiquetas y el YAML solo cambian mediante una acción aparte y confirmada.",
    migrationGuideSelectedExisting: "«Reutilizar un archivo existente» seleccionado. Puedes cambiar tu elección.",
    migrationGuideSelectedNew: "Camino seleccionado: nueva configuración. Puedes cambiar tu elección abajo.",
    migrationGuideSelectedUnsure: "«Elegir otro archivo» seleccionado. Introduce su ruta abajo.",
    assistantFileMetricEntries: "Entidades declaradas",
    assistantFileMetricTrue: "expose: true",
    assistantFileMetricFalse: "expose: false",
    assistantFileMetricUnset: "expose ausente",
    assistantFileMetricIssues: "Entidades que revisar",
    assistantFileUnreferencedConclusion: "Este archivo legible puede inicializar las etiquetas HVLS. La falta de vínculo con Google Assistant es un aviso, no un impedimento para gestionar entidades. El archivo original se conservará.",
    assistantFilePackagesConclusion: "Un archivo legible no indica qué configuración usan los packages. Los packages siguen clasificados como «Otra configuración» y no admiten migración automática.",
    assistantFileGeneralConclusion: "Esta comprobación solo analiza el contenido del archivo; no establece las reglas globales de Google Assistant ni la exposición efectiva en Google Home.",
    assistantFileUnsetExplanation: "Una entrada sin expose no se trata como expose: true. Cualquier exposición depende de otros ajustes y no se establece aquí.",
    assistantFileResultsTitle: "Resumen de la inspección del archivo",
    assistantAdoptTitle: "Reutilizar entidades en HVLS",
    assistantAdoptIntro: "Recupera el YAML anterior con las entidades disponibles actualmente en HA. Primero haz una copia y toma el control, después prepara la Preview. Ningún cambio sin aprobación.",
    assistantAdoptNoCatalog: "El catálogo de entidades de Home Assistant no está cargado. Actualiza la comparación para continuar.",
    assistantAdoptRefresh: "Actualizar comparación de etiquetas",
    assistantAdoptCounts: "{total} en el YAML antiguo · {recoverable} recuperables · {existingNew} más ya etiquetadas en HA · {nextTotal} en total propuestas · {missing} ausentes · {ineligible} no aptas · {review} que revisar.",
    assistantAdoptReview: "Detalle de entidades y decisiones sugeridas",
    assistantAdoptReasonAdd: "Añadir etiqueta HVLS",
    assistantAdoptReasonAlready: "Ya en HVLS",
    assistantAdoptReasonExclude: "Excluida (expose: false) — no se añade",
    assistantAdoptReasonReview: "Requiere revisión manual",
    assistantAdoptReviewYamlIssue: "Problema en la declaración YAML",
    assistantAdoptReviewInvalidExposure: "Directiva expose no válida",
    assistantAdoptReviewMissingEntity: "Entidad ausente del catálogo de HA",
    assistantAdoptReviewImplicitExposure: "Falta la directiva expose: intención desconocida",
    assistantAdoptReviewUnknownLabel: "Estado de la etiqueta HVLS desconocido",
    assistantAdoptReviewExcludedLabeled: "expose: false pero la etiqueta HVLS está presente",
    assistantAdoptReviewIneligible: "Entidad no apta para la generación",
    assistantAdoptReviewUnlabeledCustom: "Sin etiqueta HVLS; conservar las personalizaciones del YAML",
    assistantAdoptCustomValuesUnverified: "Nombre, área o alias del YAML no comparados con los valores generados",
    assistantAdoptLimits: "Las entidades ausentes o no aptas solo se quitarán del nuevo YAML. La Preview también muestra cambios de nombres, áreas y alias: revísalos antes de aprobar.",
    assistantAdoptAction: "Preparar la Preview de recuperación ({count} entidades)",
    assistantAdoptNone: "No hay entidades recuperables: no se puede preparar un nuevo YAML.",
    assistantTakeoverTitle: "Dejar que HVLS gestione el YAML existente",
    migrationChangeChoice: "Cambiar el modo de configuración (opcional)",
    importPreviewDanger: "ATENCIÓN: esta Preview normal usa las etiquetas actuales de HA; NO es una importación del YAML existente. {count} de {total} entidades se quitarían del YAML. No apliques nada hasta completar la recuperación en el Asistente.",
    importPreviewReturn: "Volver al Asistente",
    assistantReinstallTitle: "Recuperar la gestión del YAML tras una reinstalación",
    assistantReinstallIntro: "La configuración antigua se analiza frente a las entidades actuales de HA. HVLS hace una copia del archivo antes de tomar el control. Revisa después los cambios en la Preview.",
    assistantReinstallAction: "Comprobar y recuperar la gestión",
    assistantRecoveryTakeoverConfirm: "YAML anterior: {total} entidades.\nRecuperables: {recoverable}.\nAusentes en HA: {missing}.\nNo aptas: {ineligible}.\n\n¿Crear una copia de seguridad verificada y dejar que HVLS gestione este archivo? En este paso no cambian ni el YAML ni las etiquetas.",
    assistantRecoveryChangedNote: "Atención: el archivo actual es distinto del registrado por la instalación anterior. La copia de seguridad protege el archivo ACTUAL.\n\n",
    assistantRecoveryReady: "Gestión recuperada tras una copia de seguridad verificada. Prepara ahora la Preview de recuperación.",
    assistantRecoveryPreviewPrepared: "Preview de recuperación preparada. Revisa las eliminaciones y modificaciones del YAML antes de aplicar.",
    assistantRecoveryPreviewFailed: "Preparación de la Preview rechazada: {error}. YAML y etiquetas sin cambios.",
    assistantRecoveryNotPrepared: "Todavía no se ha preparado ninguna Preview de recuperación. Adiciones, eliminaciones y modificaciones pendientes: ninguna. Empieza desde el Asistente.",
    assistantRecoveryPreviewBack: "Abrir el Asistente",
    assistantRecoveryApply: "Aplicar la configuración recuperada",
    assistantRecoveryApplyConfirm: "¿Aplicar la recuperación revisada? Se hará una copia de seguridad obligatoria del YAML actual antes de actualizar las etiquetas y el archivo. Las entidades retiradas solo se quitan del YAML.",
    assistantRecoveryApplied: "Recuperación completada: {count} entidades en el nuevo YAML. Copia de seguridad: {backup}.",
    assistantReinstallConfirm: "¿Transferir la gestión de {path} a esta instalación de HVLS?\n\nLa instalación anterior debe haber desaparecido de Home Assistant. Se comprobarán el YAML y el registro y se hará una copia de seguridad. No se aplicará nada automáticamente ni cambiarán las etiquetas de HA.",
    assistantReinstallChangedConfirm: "ATENCIÓN: el archivo actual es DISTINTO del registrado por la instalación antigua.\n\nSHA-256 anterior: {oldSha}\nSHA-256 actual: {newSha}\nEntidades actuales: {entities}\nPreview normal: {added} añadidas, {removed} eliminadas, {modified} modificadas.\n\n¿Autorizar SOLO una toma de control tras una copia de seguridad verificada? No se modificará ni el YAML ni las etiquetas. NO apliques la Preview normal hasta conciliar las entidades.",
    assistantReinstallChangedSuccess: "Gestión del YAML sustituido recuperada con copia de seguridad verificada: {backup}. Ninguna entidad ni YAML modificado. ATENCIÓN: la Preview normal difiere; no la apliques hasta conciliar las entidades.",
    assistantTakeoverIntro: "Comprueba las entidades recuperables. HVLS hace una copia del archivo y toma el control. El YAML solo se actualiza tras aprobar la Preview.",
    assistantTakeoverAction: "Revisar y tomar el control de este archivo",
    assistantTakeoverConfirm: "¿Dejar que HVLS gestione {path}?\n\nEntidades actuales: {entities} ({issues} que revisar).\nDiferencias en la Preview: {added} añadidas, {removed} eliminadas, {modified} modificadas.\n\nSe creará una copia de seguridad obligatoria. El archivo de producción NO se editará y no se aplicará nada. Solo se autoriza la gestión futura por HVLS.",
    assistantTakeoverSuccess: "HVLS gestiona ahora este YAML. Copia de seguridad verificada: {backup}. No se ha aplicado nada. Revisa las diferencias de la Preview antes de aplicar.",
    assistantTakeoverFailure: "Toma de control rechazada o incompleta: revisa el YAML, las copias de seguridad y el estado de propiedad, y después actualiza. No se aplica nada automáticamente.",
    assistantTakeoverRegistrationFailed: "Copia de seguridad creada, pero la propiedad no se ha transferido. Consulta los registros de Home Assistant (HVLS recovery). No repitas la toma de control antes de un diagnóstico.",
    assistantTakeoverBusy: "Comprobando y copiando el YAML existente…",
    assistantAdoptConfirm: "¿Añadir etiquetas HVLS a {count} entidades aptas? No se modificará ni el YAML de origen ni Google Assistant. Cada adición se comprueba por separado: si una falla, las adiciones anteriores correctas se mantienen y se indican.",
    assistantAdoptBusy: "Añadiendo etiquetas HVLS: {done} / {total}",
    assistantAdoptDone: "{count} etiqueta(s) añadida(s). YAML original conservado; se ha solicitado una nueva Preview. Revísala antes de aplicar.",
    assistantAdoptStopped: "{count} adición(es) de etiqueta confirmada(s) antes de la interrupción. Revisa el catálogo actualizado: una operación sin respuesta podría haberse completado igualmente. Sin reintento automático.",
    assistantAdoptStale: "El archivo o el catálogo han cambiado desde la inspección. Vuelve a comprobar antes de preparar una Preview.",
    assistantAdoptNeedsReview: "Las diferencias entre el YAML antiguo y el HA actual aparecen en la Preview. Las entidades ausentes y no aptas no bloquean a las demás.",
    assistantAdoptTruncated: "El archivo contiene demasiadas entradas para un plan de reutilización completo; no se sugieren adiciones masivas de etiquetas.",
    assistantProvenanceAdvanced: "ⓘ Origen del archivo y comprobación de copias históricas (opcional)",
    assistantProvenanceStep: "Origen del archivo (opcional)",
    assistantProvenanceQuestion: "Según lo que sabes, ¿de dónde viene este archivo?",
    assistantProvenanceOld: "Pertenecía a una configuración anterior de Google Assistant",
    assistantProvenanceUnknown: "No conozco su origen",
    assistantProvenanceNew: "Se preparó para una nueva configuración",
    assistantProvenanceVerifiedTitle: "Lo que HVLS ha comprobado",
    assistantProvenanceVerified: "Se ha leído el archivo YAML y se han contado sus declaraciones. No se ha cambiado nada.",
    assistantProvenanceAnomalies: "{count} entidad(es) tienen problemas locales: las demás entradas siguen siendo inspeccionables. Cada problema debe revisarse antes de decidir qué hacer con esa entidad.",
    assistantProvenanceMissingTitle: "Lo que queda sin comprobar",
    assistantProvenanceMissing: "No se ha encontrado ninguna referencia google_assistant: a este archivo en la configuración analizada. No se establecen las reglas globales de exposición, la configuración realmente cargada ni el estado de los dispositivos en Google Home.",
    assistantProvenanceNextTitle: "Siguiente comprobación recomendada",
    assistantProvenanceNextOld: "Busca una copia antigua de configuration.yaml y cualquier google_assistant.yaml incluido. Comprueba si entity_config hacía referencia a este archivo y qué ajustes expose_by_default y exposed_domains se aplicaban. No actives nada solo para comprobarlo.",
    assistantProvenanceNextUnknown: "Revisa las copias de seguridad de Home Assistant y los archivos antiguos de Google Assistant en busca de una referencia explícita a este archivo y a sus reglas globales. Mientras no se establezca su origen, tómalo como una pista, no como una fuente de migración.",
    assistantProvenanceNextNew: "Este archivo podría servir para preparar una nueva configuración, pero no es una migración verificada. Vuelve al camino de nueva configuración si ese es tu objetivo; no actives Google Assistant automáticamente.",
    assistantProvenanceNextChoose: "Elige arriba el origen del archivo para ver las comprobaciones adecuadas a tu situación.",
    assistantProvenanceSafety: "Tu respuesta solo vale para esta pantalla y no se guarda. No certifica una exposición anterior ni el estado de Google Home, y no desbloquea la migración.",
    assistantProvenanceCategory: "Origen declarado, no verificado",
    assistantProvenanceSourceLabel: "Archivo inspeccionado",
    assistantProvenanceChecklistTitle: "¿Cómo encuentro la configuración original?",
    assistantProvenanceChecklistTrigger: "ⓘ Guía práctica: dónde buscar en una copia de seguridad",
    assistantProvenanceChecklistIntro: "Estas comprobaciones son manuales y se hacen sobre una copia. HVLS no busca, extrae ni modifica ninguna copia de seguridad en este paso.",
    assistantProvenanceChecklist1: "Abre una copia de una copia de seguridad antigua de Home Assistant sin restaurarla en tu instalación activa.",
    assistantProvenanceChecklist2: "En configuration.yaml, busca una declaración directa google_assistant: o google_assistant: !include archivo.yaml.",
    assistantProvenanceChecklist3: "Si se incluye un archivo, inspecciónalo en la copia. Busca entity_config: !include ... y compara su referencia con el archivo inspeccionado.",
    assistantProvenanceChecklist4: "Anota solo los ajustes relevantes (expose_by_default, exposed_domains). No compartas secretos, claves ni cuentas de servicio.",
    assistantProvenanceChecklistEnd: "Una referencia encontrada en una copia de seguridad es una posible pista de una configuración histórica; por sí sola no demuestra que Google Home expusiera realmente estas entidades.",
    assistantProvenanceSourceLabelUnknown: "Aquí no se analiza automáticamente ninguna copia de seguridad.",
    assistantHistoryTitle: "Inspeccionar una copia de una configuración antigua",
    assistantHistoryHow: "En el editor de archivos de HA, crea hvls-history-review en la carpeta de configuración. Coloca allí solo copias del configuration.yaml antiguo y de los archivos YAML que incluye para Google Assistant, conservando las carpetas relativas. No restaures ningún archivo comprimido ni copies secretos.",
    assistantHistoryFolder: "Carpeta de copia: hvls-history-review (junto a configuration.yaml, nunca la sustituye).",
    assistantHistoryAction: "Inspeccionar la copia histórica (solo lectura)",
    assistantHistoryBusy: "Inspeccionando la copia aislada…",
    assistantHistoryIdle: "Todavía no se ha revisado ninguna copia histórica en esta ruta.",
    assistantHistoryNoFolder: "Falta hvls-history-review. Créala manualmente y coloca dentro solo los archivos YAML que quieres revisar.",
    assistantHistoryNoConfig: "No se ha encontrado configuration.yaml dentro de hvls-history-review.",
    assistantHistoryBlocked: "Inspección rechazada: {reason}. Revisa solo la copia; no cambies la configuración activa.",
    assistantHistoryUnavailable: "Inspección histórica no disponible. No se ha modificado ningún archivo.",
    assistantHistoryFound: "Declaración histórica: {declaration}.",
    assistantHistoryDeclDirect: "directamente en configuration.yaml",
    assistantHistoryDeclIncluded: "mediante un archivo !include",
    assistantHistoryDeclAbsent: "no encontrada en la copia",
    assistantHistoryDeclUnknown: "no determinada",
    assistantHistoryRules: "Regla global histórica: expose_by_default = {defaultValue} ({origin}). exposed_domains: {domains}.",
    assistantHistoryRuleExplicit: "declarada explícitamente",
    assistantHistoryRuleImplicit: "valor por defecto supuesto por el analizador",
    assistantHistoryRuleUnknown: "no establecida",
    assistantHistoryDomainsNone: "campo no declarado",
    assistantHistoryDomainsEmpty: "lista vacía explícita",
    assistantHistorySource: "Origen de entity_config: {source}.",
    assistantHistorySourceInline: "entidades declaradas directamente",
    assistantHistorySourceAbsent: "sin campo entity_config",
    assistantHistorySourceUnknown: "sin resolver",
    assistantHistoryCompare: "Referencia al archivo de entidades seleccionado: {pathStatus}. Contenido del archivo: {contentStatus}.",
    assistantHistoryPathSame: "misma ruta relativa",
    assistantHistoryPathDifferent: "ruta relativa distinta",
    assistantHistoryPathUnknown: "no determinada",
    assistantHistoryContentIdentical: "sumas de comprobación idénticas en el momento de la inspección",
    assistantHistoryContentDifferent: "sumas de comprobación distintas",
    assistantHistoryContentUnknown: "no comparado",
    assistantHistoryCounts: "{entries} entidades declaradas en la copia; {anomalies} con problemas estructurales.",
    assistantHistoryIssues: "Revisión necesaria: {issues}. Las demás entidades siguen siendo inspeccionables.",
    assistantHistoryIssueHistoricalMissing: "archivo de entidades incluido ausente en la copia",
    assistantHistoryIssueNoConfig: "ninguna declaración de Google Assistant en la copia",
    assistantHistoryIssueNoEntity: "ningún campo entity_config en la copia",
    assistantHistoryIssueInline: "entidades definidas directamente en lugar de en el archivo seleccionado",
    assistantHistoryIssueCurrentUnavailable: "no se pudo comparar con el archivo de entidades seleccionado actualmente",
    assistantHistoryReasonUnsafe: "referencia YAML fuera de la carpeta aislada o no permitida en ella",
    assistantHistoryReasonPackages: "configuración con packages no compatible",
    assistantHistoryReasonSyntax: "sintaxis o estructura YAML no válida, o clave duplicada",
    assistantHistoryReasonSymlink: "enlace simbólico no permitido",
    assistantHistoryReasonTooLarge: "archivo demasiado grande",
    assistantHistoryReasonMissing: "falta el archivo incluido",
    assistantHistoryReasonOther: "archivo o estructura no compatible",
    assistantHistorySafety: "Una ruta o suma de comprobación coincidente solo se refiere a los archivos inspeccionados. No demuestra un uso histórico ni una exposición real en Google Home. No se autoriza ninguna migración ni escritura.",
    migrationAnalyze: "Volver a analizar la configuración (solo lectura)",
    migrationLoading: "Analizando la configuración de Google Assistant en solo lectura…",
    migrationFailed: "Análisis no disponible: {error}",
    migrationStatus: "Estado de la revisión",
    backupIntro: "Selecciona una copia de seguridad para preparar cambios en la Preview. No se modificarán ni el YAML ni las etiquetas.",
    backupLoading: "Cargando copias de seguridad…",
    backupEmpty: "No hay copias de seguridad disponibles.",
    backupTypeAuto: "Automática",
    backupTypeSafety: "Seguridad",
    backupTypeLegacy: "Antigua",
    backupHistorySummary: "{total} copias · {auto} automáticas · {safety} de seguridad · {legacy} antiguas",
    backupShowOlder: "Mostrar {count} copias más antiguas",
    backupShowRecent: "Mostrar solo las 10 más recientes",
    backupCleanupPrepare: "Previsualizar la limpieza de copias",
    backupCleanupReview: "Limpieza propuesta: conservar {keep} copias y eliminar {count}. No se ha eliminado nada.",
    backupCleanupNoop: "No hay copias seleccionadas para eliminar.",
    backupCleanupPick: "Marca las copias que quieres eliminar y desmarca las que quieres conservar. Por defecto se conservan las 10 más recientes.",
    backupCleanupSelection: "{count} para eliminar · {kept} para conservar",
    backupCleanupSelectionTitle: "Elegir las copias que eliminar",
    backupCleanupCheck: "Eliminar esta copia",
    backupCleanupNone: "Desmarcar todo",
    backupCleanupReset: "Restablecer la selección sugerida",
    backupCleanupKeepOne: "Conserva al menos una copia.",
    backupCleanupDeleteCount: "Eliminar las {count} copias seleccionadas",
    backupCleanupDeleteOne: "Eliminar la copia seleccionada",
    backupCleanupConfirmButton: "Confirmar la limpieza",
    backupCleanupCancel: "Cancelar la limpieza",
    backupCleanupConfirm: "¿Eliminar definitivamente las {count} copias de la lista? Se conservarán las {keep} más recientes. Esta acción no se puede deshacer.",
    backupCleanupDone: "Limpieza completada: {count} copias eliminadas.",
    backupCleanupFailed: "Limpieza rechazada: {error}. Actualiza la lista y vuelve a revisarla.",
    backupReviewing: "Comparando con la producción…",
    backupMissingReview: "Falta el archivo de producción. Copia seleccionada: {count} entidades. Puedes prepararla en la Preview y después revisar las entidades y las etiquetas de HA antes de confirmar.",
    backupMissingPreview: "Falta el archivo de producción. Esta copia propone {count} entidades. Resuelve las diferencias con las etiquetas actuales de HA antes de reconstruir el YAML.",
    backupMissingNoSafety: "Ninguna (faltaba el archivo de producción)",
    backupReviewFailed: "No se puede comparar: {error}",
    backupLoadFailed: "No se pueden cargar las copias: {error}",
    backupRestore: "Preparar esta copia en la Preview",
    backupPreviewPrepared: "Restauración lista. Al aplicarla: {added} añadidas, {removed} eliminadas, {modified} modificadas. No se escribe nada en el YAML ni en las etiquetas hasta que pulses «Aplicar esta restauración».",
    backupPreviewNotExecutable: "Preview de restauración: revisa los cambios y las etiquetas de HA antes de validar.",
    backupPreviewApply: "Aplicar esta restauración",
    backupPreviewConfirm: "¿Aplicar la copia revisada? Se actualizarán el YAML de producción y las etiquetas de HA. Se creará una copia de seguridad.",
    backupPreviewApplying: "Aplicando la restauración revisada…",
    backupPreviewApplied: "Restauración completada: {entities} entidades, {added} etiquetas añadidas, {removed} eliminadas. Copia de seguridad: {backup}.",
    backupPreviewApplyFailed: "Restauración rechazada o incompleta: {error}. Revisa la producción y cualquier aviso de conciliación.",
    backupPreviewLabels: "Etiquetas de HA previstas: {added} añadir, {removed} quitar, {review} que revisar.",
    manualLabelPending: "Pendiente de revisión",
    manualLabelPreparing: "Simulando etiquetas y YAML sin escribir…",
    manualLabelPrepared: "{count} cambio(s) de etiqueta preparado(s) en la Preview. Etiquetas y YAML sin cambios.",
    manualLabelHelp: "Propuesta guardada localmente en este navegador para tu cuenta de Home Assistant. Se volverá a comprobar al regresar; no se cambia ninguna etiqueta ni el YAML antes de «Aplicar».",
    savedDraftRestored: "{count} cambio(s) pendiente(s) encontrado(s) y comprobado(s) de nuevo. Revisa la Preview antes de aplicar.",
    savedDraftRestoredDetail: "Propuesta guardada encontrada y comprobada de nuevo: {count} cambio(s) ({added} añadidas, {removed} eliminadas, {modified} modificadas). Revisa la Preview antes de aplicar.",
    savedDraftBlocked: "Borrador guardado conservado, pero no se puede aplicar: la configuración, las entidades o las protecciones han cambiado. No se permite ninguna escritura. Revisa la situación y elige «Cancelar» para empezar de nuevo desde el estado actual.",
    savedDraftStorageUnavailable: "El navegador no ha podido guardar esta propuesta. Puede desaparecer al salir de HVLS. Aplícala o cancélala ahora.",
    backupAlreadyStaged: "Esta copia ya está preparada en la Preview.",
    backupReplaceRestoreConfirm: "Ya hay una restauración pendiente en la Preview. ¿Cancelarla y preparar esta copia en su lugar? Si respondes que no, no cambia nada.",
    backupReplaceProposalConfirm: "Hay una propuesta de etiquetas sin aplicar en la Preview. ¿Cancelarla y preparar esta copia en su lugar? Si respondes que no, no cambia nada.",
    backupReplaceKept: "No ha cambiado nada: la propuesta pendiente se mantiene en la Preview.",
    pendingDraftProtect: "Hay una propuesta sin aplicar pendiente. Revísala en la Preview y aplícala o cancélala antes de actualizar o iniciar otra operación.",
    manualLabelApply: "Aplicar los cambios de etiquetas",
    manualLabelConfirm: "¿Aplicar los cambios de etiquetas revisados y el YAML? Si existe un archivo de producción, se hará una copia de seguridad.",
    manualLabelApplied: "Cambios aplicados: {added} etiqueta(s) añadida(s), {removed} quitada(s). YAML y etiquetas verificados.",
    manualLabelFailed: "Preparación de la Preview rechazada: {error}. Etiquetas y YAML sin cambios.",
    manualLabelApplyFailed: "Aplicación rechazada o incompleta: {error}. Revisa la producción y las protecciones de conciliación.",
    backupLabelAdd: "Etiquetas que añadir",
    backupLabelRemove: "Etiquetas que quitar",
    backupLabelReview: "Entidades que revisar",
    backupConfirm: "¿Restaurar este YAML en producción? Siempre se creará una copia de seguridad del archivo de producción actual. Las etiquetas de HA no cambiarán.",
    backupRestoreFailed: "Restauración rechazada: {error}",
    backupRestored: "Restauración completada. Copia de seguridad: {backup}",
    backupRestorePendingRemoval: "Atención: {count} entidades del YAML de producción restaurado faltan en la Preview: {entities}. La próxima aplicación las volvería a quitar. Las etiquetas de HA no se han restaurado; restáuralas si quieres conservar estas entidades.",
    backupRestorePendingOther: "Tras la restauración, la Preview todavía propone {added} adiciones, {removed} eliminaciones y {modified} modificaciones. Las etiquetas de HA no se han restaurado. Revisa los cambios antes de aplicar nada.",
    backupRestoreNotVerified: "Se ha restaurado el YAML de producción, pero no se ha podido verificar la comparación actualizada con la Preview. Actualiza la Preview y revisa las diferencias antes de aplicar nada.",
    backupRestoreAligned: "El YAML restaurado y la Preview tienen la misma configuración por entidad. Las etiquetas de HA no se han restaurado.",
    restoreReconcileTitle: "Completar la restauración de HVLS",
    restoreReconcileSummary: "El YAML restaurado está protegido. HVLS no puede reescribir la producción hasta que decidas cómo resolver sus diferencias con las etiquetas de Home Assistant.",
    restoreReconcilePending: "La restauración sigue protegida incluso tras un reinicio. Termínala en la Preview antes de volver a aplicar.",
    restoreReconcileAddLabels: "Restaurar las etiquetas de las entidades restauradas",
    restoreReconcileAligned: "Confirmar la configuración coincidente y terminar la restauración",
    restoreReconcileKeepCurrent: "Mantener las etiquetas actuales (aplicación aparte)",
    restoreReconcileAddConfirm: "¿Restaurar las etiquetas HVLS de {count} entidades restauradas?\n{entities}\n\nNo se aplica nada ni se modifica el YAML de producción.",
    restoreReconcileKeepConfirm: "Has elegido las etiquetas actuales de HA. Diferencias con el YAML restaurado: {added} adiciones, {removed} eliminaciones, {modified} modificaciones. Una aplicación posterior puede sustituir la configuración restaurada. La copia de seguridad sigue disponible. ¿Solo desbloquear una aplicación aparte (sin ejecutarla)?",
    restoreReconcileAlignedConfirm: "La Preview coincide ahora con las entidades del YAML restaurado. ¿Terminar la protección de la restauración sin cambiar la producción ni aplicar nada?",
    restoreReconcileCannotAdd: "No se pueden restaurar con seguridad las etiquetas de todas estas entidades (ausentes o no aptas). Revísalas en la Gestión de entidades HVLS.",
    restoreReconcileAfterLabels: "Las etiquetas se han restaurado, pero la Preview sigue difiriendo del YAML restaurado. «Aplicar» sigue bloqueado. Revisa las personalizaciones.",
    restoreReconcileResolved: "Restauración conciliada. YAML de producción sin cambios; no se ha aplicado nada.",
    restoreReconcileError: "Conciliación rechazada o incompleta. Las escrituras siguen protegidas. Actualiza y revisa las diferencias.",
    restoreReconcileWorking: "Conciliando las etiquetas y verificando el estado…",
    restoreReconcileDiff: "Diferencias Preview / producción restaurada: {added} añadidas, {removed} eliminadas, {modified} modificadas.",
    restoreReconcileCancelFailed: "Cancelar la restauración interrumpida",
    restoreReconcileCancelFailedConfirm: "La restauración se detuvo antes de editar el YAML de producción. Se ha verificado el estado original del archivo. ¿Quitar la protección de la restauración sin cambiar etiquetas ni YAML?",
    restoreReconcileUncertain: "No se ha podido verificar el estado del YAML tras la interrupción. Sin desbloqueo automático; revisa las copias de seguridad y la propiedad.",
    backupNoDiff: "El YAML coincide con la producción.",
    backupTextOnlyDiff: "No hay diferencias por entidad. Solo difiere el texto del YAML (por ejemplo comentarios, orden o formato). Restaurar sustituiría el texto del archivo de producción tras una copia de seguridad.",
    backupRestoreTextOnly: "Ver las diferencias de texto del YAML en la Preview",
    backupConfirmTextOnly: "Las configuraciones de entidades son idénticas, pero el texto del YAML difiere. ¿Restaurar el texto exacto de la copia en producción? Siempre se creará una copia de seguridad de la producción actual. Las etiquetas de HA no se modificarán.",
    backupDiffTitle: "Cambios si se restaura esta copia",
    backupSize: "{size} bytes",
    backupEntities: "{count} entidades",
    backupRestartHint: "El archivo YAML se ha restaurado en el disco. Reinicia Home Assistant para que Google Assistant recargue su configuración.",
    refreshEntities: "Actualizar entidades",
    loadingEntities: "Cargando entidades…",
    searchPlaceholder: "Buscar por nombre, ID de entidad o área…",
    searchLabel: "Buscar entidades",
    filterLabel: "Filtrar entidades",
    filterAll: "Todas las entidades",
    filterWith: "Con HVLS",
    filterWithout: "Sin HVLS",
    filterEligibleWithout: "Sin HVLS — aptas",
    assistantReportIssue: "Informar de un problema en GitHub",
    filterIneligible: "No aptas",
    actionAdd: "AÑADIR",
    actionRemove: "QUITAR",
    confirmLabel: "¿{action} la etiqueta HVLS?",
    otherLabelsPreserved: "Todas las demás etiquetas se conservarán.",
    ineligibleWarning: "Atención: esta entidad no es apta actualmente.",
    updateFailed: "Actualización de la etiqueta HVLS rechazada para {entity}:",
    reloadFailed: "La etiqueta se ha actualizado en HA, pero no se ha podido recargar el catálogo de entidades. Usa «Actualizar entidades».",
    domainsSupported: "Dominios compatibles con HVLS",
    domainsUnsupported: "Dominios no compatibles",
    domainCount: "{count} dominios · {entities} entidades",
    entitiesCount: "{count} entidades",
    catalogStatus: "{matching} entidades coincidentes · {labeled} etiquetadas de {total} · Etiqueta: {label}",
    noMatches: "Ninguna entidad coincide con los filtros.",
    noArea: "Sin área",
    withoutHVLS: "— Sin etiqueta HVLS",
    unknownHVLS: "HVLS · estado desconocido",
    ineligibleState: "No apta",
    notEligible: "Esta entidad no cumple las reglas de selección de HVLS.",
    exclusionIntro: "Excluida de la configuración de Google Assistant generada por HVLS:",
    reasonDomain: "su dominio no es compatible con HVLS.",
    reasonClass: "su clase (sensor, sensor binario o evento) no es compatible con HVLS.",
    reasonDisabled: "está desactivada en Home Assistant.",
    reasonHidden: "está oculta en Home Assistant.",
    reasonCategory: "es una entidad de configuración o de diagnóstico.",
    exclusionHelp: "Por qué se excluye esta entidad",
    exclusionFootnote: "Sigue en Home Assistant. HVLS no la selecciona para Google Assistant.",
    moreDomain: "Mostrar 100 más ({shown}/{total})",
    moreEntities: "Mostrar 100 entidades más",
    excludedTitle: "Entidades excluidas ({count})",
    excludedExplanation: "Entidades con la etiqueta HVLS que no cumplen las reglas de selección actuales.",
    excludedEmpty: "No hay entidades etiquetadas excluidas.",
    excludedNote: "El diagnóstico usa los registros actuales. El YAML mostrado procede de la última Preview generada.",
    unknownReason: "Motivo desconocido",
    reasonFilterTitle: "Motivos de no idoneidad",
    reasonFilterAll: "Marcar todos",
    reasonFilterOnly: "solo",
    reasonFilterOnlyAria: "Mostrar solo: {reason}",
    reasonFilterNone: "Ningún motivo marcado. Marca al menos un motivo para mostrar entidades.",
    reasonShort_domain_not_enabled: "Dominio no compatible",
    reasonShort_unsupported_device_class: "Clase no compatible",
    reasonShort_disabled: "Desactivada",
    reasonShort_hidden: "Oculta",
    reasonShort_entity_category: "Configuración / diagnóstico",
    reasonShort_other: "Motivo desconocido",
    reasonDetailDomain: "dominio: {domain}",
    reasonDetailClass: "clase: {deviceClass}",
    reasonDetailNoClass: "clase: ninguna",
    reasonDetailConfig: "categoría: configuración",
    reasonDetailDiagnostic: "categoría: diagnóstico",
    reasonCategoryFull: "Entidad de configuración o de diagnóstico",
    metricEntities: "Entidades en producción",
    productionStatsUnavailable: "Estadísticas de producción no disponibles: archivo ausente, ilegible o no válido.",
    initialLabelsDetected: "Se han encontrado {count} entidades con la etiqueta HVLS en Home Assistant. Puedes crear el primer YAML a partir de esta selección.",
    initialLabelsPreview: "Preparar la Preview inicial ({count} entidades)",
    initialPendingPreview: "Revisar la Preview pendiente ({count} cambio(s))",
    initialYamlPreview: "Primera configuración: {count} entidades propuestas a partir de las etiquetas actuales de HA. El YAML solo se creará tras la aprobación.",
    productionRemoval: "Eliminación pendiente en la Preview: la entidad sigue en producción",
    metricRooms: "Áreas",
    byDomain: "Por dominio",
    byArea: "Por área",
    disabledDomains: "Dominios excluidos de la selección HVLS",
    noDisabledDomains: "No se han detectado dominios desactivados.",
    labeledOnly: "Solo las entidades con etiqueta HVLS.",
    comparisonTitle: "Diferencias Preview / producción",
    pendingChanges: "{count} cambio(s) que revisar antes de aplicar",
    pendingAction: "Abrir la Preview",
    productionValidated: "Ya presente en el YAML de producción",
    productionPending: "Adición pendiente al YAML de producción",
    productionModified: "Presente en producción, cambios pendientes",
    productionUnknown: "Estado de producción desconocido: actualiza la Preview",
    comparisonMissing: "No se puede comparar: falta el archivo de producción.",
    comparisonFailed: "No se puede comparar ({status}): {reason}",
    unreadableFile: "archivo ilegible",
    added: "Añadidas",
    removed: "Eliminadas",
    modified: "Modificadas",
    unchanged: "Sin cambios",
    identicalYaml: "✓ Sin diferencias: el YAML coincide con la producción.",
    identicalEntities: "✓ Misma configuración por entidad (solo diferencias de formato en el YAML).",
    entitiesAdded: "Entidades añadidas",
    entitiesRemoved: "Entidades eliminadas",
    removalReasonProposal: "Motivo: etiqueta HVLS quitada en esta propuesta.",
    removalReasonBackup: "Motivo: expuesta hoy, pero ausente de la copia.",
    removalReasonNoLabel: "Motivo: ya no tiene la etiqueta HVLS en Home Assistant.",
    removalReasonMissing: "Motivo: ya no existe en Home Assistant.",
    removalReasonIneligible: "Motivo: {detail}",
    entitiesModified: "Entidades modificadas",
    previewLoading: "Cargando la Preview…",
    previewMissing: "No hay ninguna Preview disponible. Genera una primero.",
    previewReady: "Preview: {path} — Producción: {production}",
    previewLoadFailed: "No se puede cargar la Preview: {error}",
    previewGenerating: "Generando la Preview…",
    previewGenerated: "Preview generada: {count} entidades. Revisa las diferencias antes de aplicar.",
    previewGenerateFailed: "No se ha podido generar la Preview: {error}",
    applyInfoLabel: "¿Por qué está desactivado «Aplicar»?",
    cancelPreview: "Cancelar",
    previewCancelled: "Preview cancelada: no ha cambiado nada.",
    backupIgnoreUpdating: "Recalculando la Preview con las exclusiones…",
    backupIgnoreFailed: "No se puede recalcular la Preview: {error}. YAML y etiquetas sin cambios.",
    backupIgnoreSelected: "Elecciones guardadas: {count} entidad(es) ignorada(s), {refreshed} restaurada(s) con el nombre y el área actuales. Ningún archivo ni etiqueta modificado.",
    restoreBlockerField: "{field}: copia «{before}» → Home Assistant hoy «{after}»",
    restoreFieldName: "nombre",
    restoreFieldRoom: "área",
    restoreValueAbsent: "(ninguno)",
    planCol_out: "No restauradas ({count})",
    planCol_current: "Nombre o área cambiados ({count})",
    planCol_result: "Resultado para Google ({count})",
    planSub_out: "Para ellas no cambia nada.",
    planSub_current: "Restauradas con los valores actuales de Home Assistant.",
    planSub_result: "Lo que se escribirá realmente.",
    planHelpLabel: "Ayuda",
    planHelp_out: "Entidades de la copia que no se recuperarán. «Imposible»: ya no existen, ya no son aptas o tienen opciones que HVLS no genera. Para las demás, has decidido no restaurarlas: su estado actual no cambia.",
    planHelp_current: "Estas entidades se han renombrado o movido en Home Assistant desde la copia. Se restaurarán con el nombre y el área de hoy, no con los de la copia. «Retirar» las pasa a «No restauradas».",
    planHelp_result: "La lista exacta de entidades expuestas a Google tras la restauración. «Añadida»: no expuesta hoy. «Ya expuesta»: sin cambios. En rojo: expuesta hoy pero ausente de la copia; se quitará salvo que la conserves.",
    planSumRestored: "Restauradas desde la copia",
    planSumExposed: "Expuestas tras la restauración",
    planSumAdded: "Añadidas por la copia",
    planSumAlready: "Ya expuestas hoy",
    planSumRemoved: "Dejarán de estar expuestas",
    planNotReady: "Todavía hay entidades que resolver antes de poder aplicar esta restauración.",
    planActionRestore: "Restaurar →",
    planActionWithdraw: "← Retirar",
    planActionKeep: "Conservar",
    planActionSkip: "No restaurar",
    planTagPending: "por resolver",
    planTagLocked: "imposible",
    planTagRemoved: "quitada",
    planTagKept: "conservada",
    planTagCurrent: "nombre/área actuales",
    planTagAdded: "añadida",
    planTagAlready: "ya expuesta",
    planKeepQuestion: "{count} entidad(es) expuesta(s) hoy no están en la copia. ¿Quieres conservarlas?",
    planKeepAll: "Conservar todas",
    planRemoveAll: "Quitar todas",
    planRecommended: "↺ Volver a la recomendación",
    planEmpty: "Ninguna",
    planReasonMissing: "ausente de Home Assistant",
    planReasonNotExposed: "no expuesta en la copia",
    planReasonIneligible: "no apta ({reason})",
    planReasonOptions: "opciones que no se pueden reproducir: {fields}",
    planReasonConflict: "diferencia que no se puede reproducir",
    planReasonRemoved: "expuesta hoy, ausente de la copia",
    planReasonNoLabel: "expuesta hoy, pero ya no tiene la etiqueta HVLS en Home Assistant",
    planTechDetails: "Detalles técnicos: etiquetas de Home Assistant",
    planConfirmSummary: "Tras la restauración: {exposed} entidad(es) expuesta(s) a Google ({added} añadida(s), {already} ya expuesta(s)).",
    planConfirmRemoved: "Dejarán de estar expuestas ({count}): {entities}.",
    planConfirmCurrent: "Con el nombre y el área actuales ({count}): {entities}.",
    planConfirmOut: "No restauradas ({count}): {entities}.",
    applyNoChanges: "No hay cambios que aplicar: la Preview ya coincide con la producción.",
    applyReasonMissingIdentity: "La identidad de la instalación de HVLS no está disponible.",
    applyReasonUnsafePath: "La ruta de salida o del registro no es segura. Comprueba si hay enlaces simbólicos.",
    applyReasonReservedPath: "La ruta de salida entra en conflicto con metadatos reservados de HVLS.",
    applyReasonRegistryInvalid: "El registro de propiedad de HVLS no es válido o no se puede leer. Se requiere una comprobación.",
    applyReasonOtherInstallation: "Este archivo pertenece a otra instalación de HVLS. Escribir está prohibido.",
    applyReasonUnmanagedOutput: "Un archivo YAML existente no está verificado como propiedad de HVLS. Sigue protegido.",
    applyUnmanagedAssistantHint: "El Asistente puede inspeccionar este archivo en modo de solo lectura. La inspección no activa «Aplicar» automáticamente.",
    applyUnmanagedAssistantAction: "Inspeccionar en el Asistente",
    applyReasonMissingDirectory: "La carpeta de salida no está disponible.",
    applyReasonVerificationFailed: "La comprobación de seguridad del archivo ha fallado. «Aplicar» sigue desactivado.",
    applyReasonOutputPathMismatch: "La ruta de salida ya no coincide con la ruta registrada por HVLS.",
    applyReasonPendingOperation: "Hay una operación de HVLS incompleta. Antes de aplicar es necesaria una recuperación controlada.",
    applyReasonManagedOutputMissing: "Falta el archivo de salida que gestionaba HVLS.",
    missingRebuildAction: "Reconstruir el YAML que falta",
    missingRebuildReview: "Falta el YAML que gestionaba HVLS. Se pueden reconstruir {count} entidades a partir de las etiquetas actuales de HA. Revisa el YAML antes de confirmar.",
    missingRebuildConfirm: "Falta el archivo de producción de HVLS. ¿Volver a crearlo a partir de la Preview verificada y de las etiquetas actuales de HA? No se cambiará ninguna etiqueta y se conservarán las copias existentes. Si el archivo reaparece, la operación se rechazará.",
    missingRebuildApplied: "YAML reconstruido: {path} — {bytes} bytes escritos. Etiquetas de HA sin cambios.",
    missingRebuildBackups: "Ver las copias de seguridad",
    missingRebuildDetected: "Falta el archivo de producción de HVLS. Puedes restaurar una copia o reconstruirlo a partir de {count} entidades etiquetadas en HA, tras revisar la Preview.",
    applyReasonOutputChanged: "El archivo gestionado por HVLS ha cambiado desde su última comprobación SHA-256.",
    applyReasonNotConfigured: "HVLS todavía no está configurado.",
    applyVerificationUnavailable: "No se puede validar «Aplicar»: falta información de seguridad o es incoherente. Actualiza la Preview.",
    bulkRemovalWarning: "ATENCIÓN: se quitarán {removed} de {before} entidades del YAML de producción (tras aplicar: {after}). Revisa las eliminaciones en rojo antes de continuar.",
    emptySelectionConfirm: "Esto quita la última entidad HVLS: no quedará ninguna entidad expuesta en el YAML. ¿Confirmar que se quitan todas las entidades?",
    bulkRemovalConfirm: "ELIMINACIÓN IMPORTANTE: se quitarán {removed} de {before} entidades del YAML de producción (nuevo total: {after}). Esta operación también puede quitar etiquetas de HA. ¿Confirmas explícitamente estas eliminaciones?",
    applyConfirm: "¿Aplicar esta Preview a la configuración de Google Assistant?",
    applyWarning: "El archivo actual se copiará si las copias de seguridad están activadas. La operación se rechazará si se detectan cambios desde tu revisión.",
    previewApplying: "Validando y aplicando la Preview…",
    previewApplied: "Preview aplicada: {path} — {bytes} bytes escritos{backup}",
    backupCreated: "Copia de seguridad: {path}",
    previewApplyFailed: "Aplicación rechazada: {error}. Actualiza la Preview antes de volver a intentarlo.",
    noYaml: "No hay YAML que copiar.",
    copyUnsupported: "La copia en el navegador ha fallado.",
    yamlCopied: "YAML copiado — {path}",
    copyFailed: "No se puede copiar: {error}",
    registriesLoading: "Cargando los registros de HA…",
    entitiesLoadFailed: "No se pueden cargar las entidades: {error}",
    inconsistentRegistry: "Respuesta incoherente del registro de HA",
    waitingHA: "Esperando a Home Assistant…",
    tabsLabel: "Secciones de HVLS",
    rawDiffSummary: "Diferencias detalladas del YAML",
    hvlsLabelAria: "Etiqueta HVLS: {entity}",
    entityMoreInfo: "Mostrar los detalles de {entity} en Home Assistant",
    catalogWarning: "Atención: {warnings}",
    absentValue: "(ausente)",
    showPreviewYaml: "Mostrar el YAML de la Preview",
    changesProposed: "Cambios propuestos a Google Assistant",
    recoveryDiffTitle: "Diferencias entre el YAML antiguo y el nuevo",
    recoveryDiffSummary: "Archivo antiguo: {before} entidades → Nuevo archivo propuesto: {after} entidades.",
    changesIntro: "Revisa las diferencias antes de aplicar la configuración.",
    noChanges: "No hay cambios de entidades que aplicar.",
    removalNote: "Quitar una entidad aquí no la elimina de Home Assistant: solo cambia su configuración de Google Assistant.",
    firstProduction: "No hay configuración de producción existente: no se pueden calcular diferencias con un archivo anterior.",
    fieldBefore: "Antes",
    fieldAfter: "Después",
    fileIssue_invalid_entity_file_path: "ruta no válida",
    fileIssue_sensitive_file_reference: "archivo sensible",
    fileIssue_symlink_entity_file_not_allowed: "enlace simbólico no permitido",
    fileIssue_include_missing: "archivo no encontrado",
    fileIssue_yaml_syntax_error: "YAML no válido",
    fileIssue_duplicate_mapping_key: "clave YAML duplicada",
    fileIssue_yaml_file_too_large: "archivo demasiado grande",
    fileIssue_expected_mapping: "estructura YAML no válida",
    fileIssue_unreadable_yaml_file: "archivo ilegible",
    fileIssue_entity_file_unavailable: "archivo no disponible",
    fileIssue_invalid_entity_id: "ID de entidad no válido",
    fileIssue_invalid_entity_options: "opciones de entidad no válidas",
    fileIssue_invalid_expose_value: "valor de expose no válido",
    fileIssue_invalid_room_option: "opción room no válida",
    fileIssue_invalid_name_option: "opción name no válida",
    fileIssue_invalid_aliases_option: "opción aliases no válida",
    fileIssue_unhandled_entity_option: "opción no compatible",
    fileIssueUnknown: "problema desconocido",
    fileIssueLine: "línea"
  },
  it: {
    generate: "Genera Preview",
    refresh: "Aggiorna tutti i dati",
    copy: "Copia YAML",
    apply: "Applica Preview",
    settings: "Impostazioni",
    menu: "Apri il menu di Home Assistant",
    tabStats: "Statistiche",
    tabExclusions: "Entità escluse",
    tabEntities: "Gestione entità HVLS",
    tabPreview: "Preview",
    tabBackups: "Backup",
    tabMigration: "Assistente",
    migrationIntro: "HVLS genera lo YAML delle tue entità a partire dalle etichette di Home Assistant. La gestione delle etichette non richiede una connessione a Google Assistant. L'ispezione è in sola lettura; le modifiche alle etichette e «Applica» richiedono una conferma esplicita.",
    migrationGuideTitle: "Identifichiamo la tua situazione",
    migrationGuideStepIdentify: "Passo 1 — Identificare la tua situazione",
    migrationGuideStepVerify: "Passo 2 di 2 — Esaminare i controlli consigliati",
    assistantProvenanceStepVerify: "Ispeziona il file YAML che vuoi riutilizzare",
    migrationManagedNotice: "HVLS ora gestisce il file delle entità in produzione. Usa la Preview per le modifiche. Le diagnostiche precedenti restano disponibili negli strumenti avanzati.",
    migrationGuideDetected: "Nessuna dichiarazione google_assistant: rilevata. Questo non impedisce a HVLS di gestire e generare un file YAML delle entità.",
    migrationGuideCandidate: "Esiste un file google_assistant_entities.yaml. Puoi riutilizzarlo per inizializzare le etichette HVLS, anche senza connessione a Google Assistant.",
    migrationGuideNoCandidate: "Nessun file google_assistant_entities.yaml abituale rilevato. Potrebbero comunque esistere altre fonti.",
    migrationGuideQuestion: "Come vuoi iniziare a usare HVLS?",
    migrationGuideNew: "Selezionare le mie entità in HA",
    migrationGuideExisting: "Riutilizzare un file di entità esistente",
    migrationGuideUnsure: "Scegliere un altro file",
    migrationGuideNextNew: "Seleziona le entità in «Gestione entità HVLS». Le etichette esistenti restano invariate. Prima di qualsiasi scrittura serve comunque l'approvazione della Preview.",
    migrationGuideNextExisting: "Ispeziona il file delle entità, poi esamina le etichette da importare. Non serve una connessione a Google Assistant.",
    migrationGuideNextUnsure: "Inserisci il percorso relativo del file YAML da riutilizzare, poi ispezionalo.",
    migrationGuideAwaitChoice: "Scegli se riutilizzare questo file, selezionarne un altro o ripartire da zero.",
    migrationGuideNoAuthorization: "Questa scelta resta in questa schermata; non approva alcuna migrazione e non consente scritture.",
    assistantSourceFound: "Configurazione di Google Assistant rilevata",
    assistantSourceSummary: "{entries} dichiarazioni esplicite di entità. File ispezionati: {paths}. Nessuna esposizione in Google Home certificata.",
    assistantPackagesDetected: "Configurazione con packages rilevata: classificata come «Altra configurazione», non ispezionata automaticamente.",
    assistantPackagesQuestion: "Inserisci il percorso del file YAML delle entità da ispezionare manualmente.",
    assistantFileHelp: "ⓘ Mostra esempi di sintassi YAML",
    assistantGoogleConnectionHint: "Nessuna connessione a Google Assistant rilevata nella configurazione ispezionata. Controlla configuration.yaml con gli esempi qui sotto. HVLS può comunque gestire le entità senza questa connessione.",
    assistantExampleDirect: "In configuration.yaml:",
    assistantExampleProjectId: "IL_TUO_PROJECT_ID",
    assistantExampleInclude: "Alternativa con un file incluso in configuration.yaml:",
    assistantExampleIncludedContent: "In google_assistant.yaml:",
    assistantExampleNote: "Sostituisci project_id con il tuo progetto Google e SERVICE_ACCOUNT.json con il file del tuo account di servizio (non mostrarne mai il contenuto). project_id e service_account sono obbligatori per la configurazione manuale; report_state è facoltativo. Controlla le impostazioni attive prima di modificarle: questi esempi non stabiliscono una connessione funzionante con Google Home. secure_devices_pin (facoltativo, da decommentare) è il codice da pronunciare per aprire una serratura, disattivare un allarme o aprire una porta o un cancello; mettilo in secrets.yaml, tra virgolette (per esempio google_secure_pin: \"1234\").",
    assistantFileTitle: "File delle entità",
    assistantFileCandidate: "File rilevato suggerito; puoi modificare questo percorso.",
    assistantFileManual: "Inserisci il percorso del file YAML delle entità.",
    assistantFilePathLabel: "Percorso relativo alla cartella di configurazione di Home Assistant",
    assistantFilePlaceholder: "google_assistant_entities.yaml",
    assistantFileCheck: "Ispeziona il file (sola lettura)",
    assistantFileChecking: "Ispezione in sola lettura…",
    assistantFileNotChecked: "Nessun file ancora ispezionato.",
    assistantFileChecked: "{entries} entità dichiarate · {anomalies} problemi strutturali locali rilevati.",
    assistantFileIssues: "Da verificare: {issues}. Correggi se necessario, poi ricontrolla.",
    assistantFileNoIssues: "Nessun problema strutturale trovato. Questo non garantisce una configurazione attiva né l'esposizione in Google Home.",
    assistantFileCannotRead: "Impossibile ispezionare il file: {reason}.",
    assistantFileUnavailable: "Ispezione non disponibile. Nessuna modifica effettuata.",
    assistantFileSafety: "Ispezionare un file non dimostra l'esposizione in Google Home. Etichette e YAML cambiano solo con un'azione separata e confermata.",
    migrationGuideSelectedExisting: "«Riutilizzare un file esistente» selezionato. Puoi cambiare la tua scelta.",
    migrationGuideSelectedNew: "Percorso selezionato: nuova configurazione. Puoi cambiare la tua scelta qui sotto.",
    migrationGuideSelectedUnsure: "«Scegliere un altro file» selezionato. Inserisci il percorso qui sotto.",
    assistantFileMetricEntries: "Entità dichiarate",
    assistantFileMetricTrue: "expose: true",
    assistantFileMetricFalse: "expose: false",
    assistantFileMetricUnset: "expose mancante",
    assistantFileMetricIssues: "Entità da verificare",
    assistantFileUnreferencedConclusion: "Questo file leggibile può inizializzare le etichette HVLS. L'assenza di collegamento a Google Assistant è un avviso, non un ostacolo alla gestione delle entità. Il file originale sarà conservato.",
    assistantFilePackagesConclusion: "Un file leggibile non indica quale configurazione usano i packages. I packages restano classificati come «Altra configurazione» e non sono idonei alla migrazione automatica.",
    assistantFileGeneralConclusion: "Questo controllo analizza solo il contenuto del file; non stabilisce le regole globali di Google Assistant né l'esposizione effettiva in Google Home.",
    assistantFileUnsetExplanation: "Una voce senza expose non è trattata come expose: true. Un'eventuale esposizione dipende da altre impostazioni e non è stabilita qui.",
    assistantFileResultsTitle: "Riepilogo dell'ispezione del file",
    assistantAdoptTitle: "Riutilizzare le entità in HVLS",
    assistantAdoptIntro: "Recupera lo YAML precedente usando le entità attualmente disponibili in HA. Prima esegui il backup e prendi il controllo, poi prepara la Preview. Nessuna modifica senza approvazione.",
    assistantAdoptNoCatalog: "Il catalogo delle entità di Home Assistant non è caricato. Aggiorna il confronto per continuare.",
    assistantAdoptRefresh: "Aggiorna il confronto delle etichette",
    assistantAdoptCounts: "{total} nel vecchio YAML · {recoverable} recuperabili · {existingNew} altre già etichettate in HA · {nextTotal} proposte in totale · {missing} mancanti · {ineligible} non idonee · {review} da verificare.",
    assistantAdoptReview: "Dettaglio delle entità e decisioni suggerite",
    assistantAdoptReasonAdd: "Aggiungi etichetta HVLS",
    assistantAdoptReasonAlready: "Già in HVLS",
    assistantAdoptReasonExclude: "Esclusa (expose: false) — nessuna aggiunta",
    assistantAdoptReasonReview: "Richiede una verifica manuale",
    assistantAdoptReviewYamlIssue: "Problema nella dichiarazione YAML",
    assistantAdoptReviewInvalidExposure: "Direttiva expose non valida",
    assistantAdoptReviewMissingEntity: "Entità assente dal catalogo di HA",
    assistantAdoptReviewImplicitExposure: "Direttiva expose mancante: intenzione sconosciuta",
    assistantAdoptReviewUnknownLabel: "Stato dell'etichetta HVLS sconosciuto",
    assistantAdoptReviewExcludedLabeled: "expose: false ma l'etichetta HVLS è presente",
    assistantAdoptReviewIneligible: "Entità non idonea alla generazione",
    assistantAdoptReviewUnlabeledCustom: "Nessuna etichetta HVLS; conservare le personalizzazioni YAML",
    assistantAdoptCustomValuesUnverified: "Nome, area o alias YAML non confrontati con i valori generati",
    assistantAdoptLimits: "Le entità mancanti o non idonee saranno rimosse solo dal nuovo YAML. La Preview mostra anche le modifiche a nomi, aree e alias: verificale prima dell'approvazione.",
    assistantAdoptAction: "Prepara la Preview di recupero ({count} entità)",
    assistantAdoptNone: "Nessuna entità recuperabile: impossibile preparare un nuovo YAML.",
    assistantTakeoverTitle: "Lasciare che HVLS gestisca lo YAML esistente",
    migrationChangeChoice: "Cambia modalità di configurazione (facoltativo)",
    importPreviewDanger: "ATTENZIONE: questa Preview normale usa le etichette attuali di HA; NON è un'importazione dello YAML esistente. {count} entità su {total} verrebbero rimosse dallo YAML. Non applicare nulla prima di aver completato il recupero nell'Assistente.",
    importPreviewReturn: "Torna all'Assistente",
    assistantReinstallTitle: "Recuperare la gestione dello YAML dopo una reinstallazione",
    assistantReinstallIntro: "La vecchia configurazione viene analizzata rispetto alle entità attuali di HA. HVLS esegue il backup del file prima di prenderne il controllo. Verifica poi le modifiche nella Preview.",
    assistantReinstallAction: "Verifica e recupera la gestione",
    assistantRecoveryTakeoverConfirm: "YAML precedente: {total} entità.\nRecuperabili: {recoverable}.\nMancanti in HA: {missing}.\nNon idonee: {ineligible}.\n\nCreare un backup verificato e lasciare che HVLS gestisca questo file? In questo passaggio non cambiano né lo YAML né le etichette.",
    assistantRecoveryChangedNote: "Attenzione: il file attuale è diverso da quello registrato dall'installazione precedente. Il backup protegge il file ATTUALE.\n\n",
    assistantRecoveryReady: "Gestione recuperata dopo un backup verificato. Ora prepara la Preview di recupero.",
    assistantRecoveryPreviewPrepared: "Preview di recupero preparata. Verifica rimozioni e modifiche dello YAML prima di applicare.",
    assistantRecoveryPreviewFailed: "Preparazione della Preview rifiutata: {error}. YAML ed etichette invariati.",
    assistantRecoveryNotPrepared: "Nessuna Preview di recupero ancora preparata. Aggiunte, rimozioni e modifiche in sospeso: nessuna. Inizia dall'Assistente.",
    assistantRecoveryPreviewBack: "Apri l'Assistente",
    assistantRecoveryApply: "Applica la configurazione recuperata",
    assistantRecoveryApplyConfirm: "Applicare il recupero verificato? Prima di aggiornare etichette e file verrà eseguito un backup obbligatorio dello YAML attuale. Le entità ritirate vengono rimosse solo dallo YAML.",
    assistantRecoveryApplied: "Recupero completato: {count} entità nel nuovo YAML. Backup: {backup}.",
    assistantReinstallConfirm: "Trasferire la gestione di {path} a questa installazione di HVLS?\n\nL'installazione precedente non deve più essere presente in Home Assistant. YAML e registro verranno verificati e verrà eseguito un backup. Nessuna applicazione automatica né modifica delle etichette di HA.",
    assistantReinstallChangedConfirm: "ATTENZIONE: il file attuale è DIVERSO da quello registrato dalla vecchia installazione.\n\nSHA-256 precedente: {oldSha}\nSHA-256 attuale: {newSha}\nEntità attuali: {entities}\nPreview normale: {added} aggiunte, {removed} rimosse, {modified} modificate.\n\nAutorizzare SOLO una presa in carico della gestione dopo un backup verificato? YAML ed etichette non verranno modificati. NON applicare la Preview normale prima di aver riconciliato le entità.",
    assistantReinstallChangedSuccess: "Gestione dello YAML sostituito recuperata con backup verificato: {backup}. Nessuna entità né YAML modificati. ATTENZIONE: la Preview normale è diversa; non applicarla prima di aver riconciliato le entità.",
    assistantTakeoverIntro: "Controlla le entità recuperabili. HVLS esegue il backup del file e ne prende il controllo. Lo YAML viene aggiornato solo dopo l'approvazione della Preview.",
    assistantTakeoverAction: "Verifica e prendi il controllo di questo file",
    assistantTakeoverConfirm: "Lasciare che HVLS gestisca {path}?\n\nEntità attuali: {entities} ({issues} da verificare).\nDifferenze nella Preview: {added} aggiunte, {removed} rimosse, {modified} modificate.\n\nVerrà creato un backup obbligatorio. Il file di produzione NON verrà modificato e non verrà applicato nulla. Si autorizza solo la gestione futura da parte di HVLS.",
    assistantTakeoverSuccess: "HVLS ora gestisce questo YAML. Backup verificato: {backup}. Nessuna applicazione eseguita. Verifica le differenze della Preview prima di applicare.",
    assistantTakeoverFailure: "Presa in carico rifiutata o incompleta: controlla lo YAML, i backup e lo stato di proprietà, poi aggiorna. Nessuna applicazione automatica.",
    assistantTakeoverRegistrationFailed: "Backup creato, ma la proprietà non è stata trasferita. Consulta i log di Home Assistant (HVLS recovery). Non ripetere la presa in carico prima di una diagnosi.",
    assistantTakeoverBusy: "Verifica e backup dello YAML esistente…",
    assistantAdoptConfirm: "Aggiungere le etichette HVLS a {count} entità idonee? Né lo YAML di origine né Google Assistant verranno modificati. Ogni aggiunta è verificata singolarmente: se una fallisce, le aggiunte precedenti riuscite restano e vengono segnalate.",
    assistantAdoptBusy: "Aggiunta delle etichette HVLS: {done} / {total}",
    assistantAdoptDone: "{count} etichetta/e aggiunta/e. YAML originale conservato; è stata richiesta una nuova Preview. Verificala prima di applicare.",
    assistantAdoptStopped: "{count} aggiunta/e di etichetta confermata/e prima dell'interruzione. Controlla il catalogo aggiornato: un'operazione senza risposta potrebbe comunque essere riuscita. Nessun nuovo tentativo automatico.",
    assistantAdoptStale: "Il file o il catalogo sono cambiati dall'ispezione. Ricontrolla prima di preparare una Preview.",
    assistantAdoptNeedsReview: "Le differenze tra il vecchio YAML e l'HA attuale compaiono nella Preview. Le entità mancanti e non idonee non bloccano le altre.",
    assistantAdoptTruncated: "Il file contiene troppe voci per un piano di riutilizzo completo; non vengono suggerite aggiunte di etichette in blocco.",
    assistantProvenanceAdvanced: "ⓘ Origine del file e controllo dei backup storici (facoltativo)",
    assistantProvenanceStep: "Origine del file (facoltativo)",
    assistantProvenanceQuestion: "Per quanto ne sai, da dove proviene questo file?",
    assistantProvenanceOld: "Apparteneva a una precedente configurazione di Google Assistant",
    assistantProvenanceUnknown: "Non ne conosco l'origine",
    assistantProvenanceNew: "È stato preparato per una nuova configurazione",
    assistantProvenanceVerifiedTitle: "Cosa ha verificato HVLS",
    assistantProvenanceVerified: "Il file YAML è stato letto e le sue dichiarazioni sono state contate. Non è stato modificato nulla.",
    assistantProvenanceAnomalies: "{count} entità presentano problemi locali: le altre voci restano ispezionabili. Ogni problema va verificato prima di decidere cosa fare con quell'entità.",
    assistantProvenanceMissingTitle: "Cosa resta da verificare",
    assistantProvenanceMissing: "Nella configurazione analizzata non è stato trovato alcun riferimento google_assistant: a questo file. Non sono stabilite le regole globali di esposizione, la configurazione effettivamente caricata né lo stato dei dispositivi in Google Home.",
    assistantProvenanceNextTitle: "Prossimo controllo consigliato",
    assistantProvenanceNextOld: "Cerca un vecchio backup di configuration.yaml ed eventuali google_assistant.yaml inclusi. Controlla se entity_config faceva riferimento a questo file e quali impostazioni expose_by_default ed exposed_domains si applicavano. Non attivare nulla solo per verificarlo.",
    assistantProvenanceNextUnknown: "Esamina i backup di Home Assistant e i vecchi file di Google Assistant alla ricerca di un riferimento esplicito a questo file e alle sue regole globali. Finché l'origine non è stabilita, consideralo un indizio, non una fonte di migrazione.",
    assistantProvenanceNextNew: "Questo file potrebbe servire a preparare una nuova configurazione, ma non è una migrazione verificata. Torna al percorso «nuova configurazione» se è il tuo obiettivo; non attivare Google Assistant automaticamente.",
    assistantProvenanceNextChoose: "Scegli sopra l'origine del file per vedere i controlli adatti alla tua situazione.",
    assistantProvenanceSafety: "La tua risposta vale solo per questa schermata e non viene salvata. Non certifica un'esposizione precedente né lo stato di Google Home e non sblocca la migrazione.",
    assistantProvenanceCategory: "Origine dichiarata, non verificata",
    assistantProvenanceSourceLabel: "File ispezionato",
    assistantProvenanceChecklistTitle: "Come trovo la configurazione originale?",
    assistantProvenanceChecklistTrigger: "ⓘ Guida pratica: dove cercare in un backup",
    assistantProvenanceChecklistIntro: "Questi controlli sono manuali e si fanno su una copia. In questo passaggio HVLS non cerca, estrae né modifica alcun backup.",
    assistantProvenanceChecklist1: "Apri una copia di un vecchio backup di Home Assistant senza ripristinarlo nell'installazione attiva.",
    assistantProvenanceChecklist2: "In configuration.yaml, cerca una dichiarazione diretta google_assistant: oppure google_assistant: !include file.yaml.",
    assistantProvenanceChecklist3: "Se è incluso un file, ispezionalo nella copia. Cerca entity_config: !include ... e confronta il riferimento con il file ispezionato.",
    assistantProvenanceChecklist4: "Annota solo le impostazioni rilevanti (expose_by_default, exposed_domains). Non condividere segreti, chiavi o account di servizio.",
    assistantProvenanceChecklistEnd: "Un riferimento trovato in un backup è un possibile indizio di una configurazione storica; da solo non dimostra che Google Home abbia effettivamente esposto queste entità.",
    assistantProvenanceSourceLabelUnknown: "Qui nessuna copia di backup viene analizzata automaticamente.",
    assistantHistoryTitle: "Ispezionare una copia di una vecchia configurazione",
    assistantHistoryHow: "Nell'editor di file di HA, crea hvls-history-review nella cartella di configurazione. Mettici solo copie del vecchio configuration.yaml e dei file YAML che include per Google Assistant, mantenendo le cartelle relative. Non ripristinare archivi e non copiare segreti.",
    assistantHistoryFolder: "Cartella di copia: hvls-history-review (accanto a configuration.yaml, senza mai sostituirlo).",
    assistantHistoryAction: "Ispeziona la copia storica (sola lettura)",
    assistantHistoryBusy: "Ispezione della copia isolata…",
    assistantHistoryIdle: "Nessuna copia storica ancora esaminata in questo percorso.",
    assistantHistoryNoFolder: "Manca hvls-history-review. Creala manualmente e mettici solo i file YAML da esaminare.",
    assistantHistoryNoConfig: "configuration.yaml non trovato in hvls-history-review.",
    assistantHistoryBlocked: "Ispezione rifiutata: {reason}. Controlla solo la copia; non modificare la configurazione attiva.",
    assistantHistoryUnavailable: "Ispezione storica non disponibile. Nessun file modificato.",
    assistantHistoryFound: "Dichiarazione storica: {declaration}.",
    assistantHistoryDeclDirect: "direttamente in configuration.yaml",
    assistantHistoryDeclIncluded: "tramite un file !include",
    assistantHistoryDeclAbsent: "non trovata nella copia",
    assistantHistoryDeclUnknown: "non determinata",
    assistantHistoryRules: "Regola globale storica: expose_by_default = {defaultValue} ({origin}). exposed_domains: {domains}.",
    assistantHistoryRuleExplicit: "dichiarata esplicitamente",
    assistantHistoryRuleImplicit: "valore predefinito presunto dal parser",
    assistantHistoryRuleUnknown: "non stabilita",
    assistantHistoryDomainsNone: "campo non dichiarato",
    assistantHistoryDomainsEmpty: "lista vuota esplicita",
    assistantHistorySource: "Origine di entity_config: {source}.",
    assistantHistorySourceInline: "entità dichiarate direttamente",
    assistantHistorySourceAbsent: "nessun campo entity_config",
    assistantHistorySourceUnknown: "non risolta",
    assistantHistoryCompare: "Riferimento al file di entità selezionato: {pathStatus}. Contenuto del file: {contentStatus}.",
    assistantHistoryPathSame: "stesso percorso relativo",
    assistantHistoryPathDifferent: "percorso relativo diverso",
    assistantHistoryPathUnknown: "non determinato",
    assistantHistoryContentIdentical: "checksum identici al momento dell'ispezione",
    assistantHistoryContentDifferent: "checksum diversi",
    assistantHistoryContentUnknown: "non confrontato",
    assistantHistoryCounts: "{entries} entità dichiarate nella copia; {anomalies} con problemi strutturali.",
    assistantHistoryIssues: "Verifica necessaria: {issues}. Le altre entità restano ispezionabili.",
    assistantHistoryIssueHistoricalMissing: "file di entità incluso mancante nella copia",
    assistantHistoryIssueNoConfig: "nessuna dichiarazione di Google Assistant nella copia",
    assistantHistoryIssueNoEntity: "nessun campo entity_config nella copia",
    assistantHistoryIssueInline: "entità definite direttamente invece che nel file selezionato",
    assistantHistoryIssueCurrentUnavailable: "impossibile confrontare con il file di entità attualmente selezionato",
    assistantHistoryReasonUnsafe: "riferimento YAML esterno alla cartella isolata o non consentito",
    assistantHistoryReasonPackages: "configurazione con packages non supportata",
    assistantHistoryReasonSyntax: "sintassi o struttura YAML non valida, o chiave duplicata",
    assistantHistoryReasonSymlink: "collegamento simbolico non consentito",
    assistantHistoryReasonTooLarge: "file troppo grande",
    assistantHistoryReasonMissing: "file incluso mancante",
    assistantHistoryReasonOther: "file o struttura non supportati",
    assistantHistorySafety: "Un percorso o un checksum corrispondente riguarda solo i file ispezionati. Non dimostra un uso storico né un'esposizione reale in Google Home. Nessuna migrazione o scrittura è autorizzata.",
    migrationAnalyze: "Analizza di nuovo la configurazione (sola lettura)",
    migrationLoading: "Analisi della configurazione di Google Assistant in sola lettura…",
    migrationFailed: "Analisi non disponibile: {error}",
    migrationStatus: "Stato della verifica",
    backupIntro: "Seleziona un backup per preparare le modifiche nella Preview. YAML ed etichette non verranno modificati.",
    backupLoading: "Caricamento dei backup…",
    backupEmpty: "Nessun backup disponibile.",
    backupTypeAuto: "Automatico",
    backupTypeSafety: "Sicurezza",
    backupTypeLegacy: "Vecchio formato",
    backupHistorySummary: "{total} backup · {auto} automatici · {safety} di sicurezza · {legacy} vecchio formato",
    backupShowOlder: "Mostra {count} backup meno recenti",
    backupShowRecent: "Mostra solo i 10 più recenti",
    backupCleanupPrepare: "Anteprima della pulizia dei backup",
    backupCleanupReview: "Pulizia proposta: mantenere {keep} backup, eliminarne {count}. Non è stato eliminato nulla.",
    backupCleanupNoop: "Nessun backup selezionato per l'eliminazione.",
    backupCleanupPick: "Seleziona i backup da eliminare; deseleziona quelli da mantenere. Per impostazione predefinita vengono mantenuti i 10 più recenti.",
    backupCleanupSelection: "{count} da eliminare · {kept} da mantenere",
    backupCleanupSelectionTitle: "Scegli i backup da eliminare",
    backupCleanupCheck: "Elimina questo backup",
    backupCleanupNone: "Deseleziona tutto",
    backupCleanupReset: "Ripristina la selezione suggerita",
    backupCleanupKeepOne: "Mantieni almeno un backup.",
    backupCleanupDeleteCount: "Elimina i {count} backup selezionati",
    backupCleanupDeleteOne: "Elimina il backup selezionato",
    backupCleanupConfirmButton: "Conferma la pulizia",
    backupCleanupCancel: "Annulla la pulizia",
    backupCleanupConfirm: "Eliminare definitivamente i {count} backup elencati? Verranno mantenuti i {keep} più recenti. L'operazione è irreversibile.",
    backupCleanupDone: "Pulizia completata: {count} backup eliminati.",
    backupCleanupFailed: "Pulizia rifiutata: {error}. Aggiorna l'elenco e verifica di nuovo.",
    backupReviewing: "Confronto con la produzione…",
    backupMissingReview: "Il file di produzione manca. Backup selezionato: {count} entità. Puoi prepararlo nella Preview, poi verificare entità ed etichette di HA prima di confermare.",
    backupMissingPreview: "Il file di produzione manca. Questo backup propone {count} entità. Risolvi le differenze con le etichette attuali di HA prima di ricostruire lo YAML.",
    backupMissingNoSafety: "Nessuno (il file di produzione mancava)",
    backupReviewFailed: "Impossibile confrontare: {error}",
    backupLoadFailed: "Impossibile caricare i backup: {error}",
    backupRestore: "Prepara questo backup nella Preview",
    backupPreviewPrepared: "Ripristino pronto. Se applicato: {added} aggiunte, {removed} rimosse, {modified} modificate. Nulla viene scritto nello YAML né nelle etichette finché non scegli «Applica questo ripristino».",
    backupPreviewNotExecutable: "Preview di ripristino: verifica le modifiche e le etichette di HA prima di confermare.",
    backupPreviewApply: "Applica questo ripristino",
    backupPreviewConfirm: "Applicare il backup verificato? Lo YAML di produzione e le etichette di HA verranno aggiornati. Verrà creato un backup di sicurezza.",
    backupPreviewApplying: "Applicazione del ripristino verificato…",
    backupPreviewApplied: "Ripristino completato: {entities} entità, {added} etichette aggiunte, {removed} rimosse. Backup di sicurezza: {backup}.",
    backupPreviewApplyFailed: "Ripristino rifiutato o incompleto: {error}. Controlla la produzione e un eventuale avviso di riconciliazione.",
    backupPreviewLabels: "Etichette di HA previste: {added} da aggiungere, {removed} da rimuovere, {review} da verificare.",
    manualLabelPending: "In attesa di verifica",
    manualLabelPreparing: "Simulazione di etichette e YAML senza scrittura…",
    manualLabelPrepared: "{count} modifica/e di etichetta preparata/e nella Preview. Etichette e YAML invariati.",
    manualLabelHelp: "Proposta salvata localmente in questo browser per il tuo account Home Assistant. Verrà ricontrollata al ritorno; nessuna etichetta né YAML cambia prima di «Applica».",
    savedDraftRestored: "{count} modifica/e in sospeso trovata/e e ricontrollata/e. Verifica la Preview prima di applicare.",
    savedDraftRestoredDetail: "Proposta salvata trovata e ricontrollata: {count} modifica/e ({added} aggiunte, {removed} rimosse, {modified} modificate). Verifica la Preview prima di applicare.",
    savedDraftBlocked: "Bozza salvata conservata ma non applicabile: la configurazione, le entità o le protezioni sono cambiate. Nessuna scrittura è consentita. Esamina la situazione, poi scegli «Annulla» per ripartire dallo stato attuale.",
    savedDraftStorageUnavailable: "Il browser non ha potuto salvare questa proposta. Potrebbe andare persa uscendo da HVLS. Applicala o annullala ora.",
    backupAlreadyStaged: "Questo backup è già preparato nella Preview.",
    backupReplaceRestoreConfirm: "C'è già un ripristino in attesa nella Preview. Annullarlo e preparare invece questo backup? Se rispondi di no, non cambia nulla.",
    backupReplaceProposalConfirm: "C'è una proposta di etichette non applicata in attesa nella Preview. Annullarla e preparare invece questo backup? Se rispondi di no, non cambia nulla.",
    backupReplaceKept: "Nessuna modifica: la proposta in attesa resta nella Preview.",
    pendingDraftProtect: "C'è ancora una proposta non applicata. Verificala nella Preview e applicala o annullala prima di aggiornare o avviare un'altra operazione.",
    manualLabelApply: "Applica le modifiche alle etichette",
    manualLabelConfirm: "Applicare le modifiche alle etichette e lo YAML verificati? Se esiste un file di produzione, verrà eseguito un backup di sicurezza.",
    manualLabelApplied: "Modifiche applicate: {added} etichetta/e aggiunta/e, {removed} rimossa/e. YAML ed etichette verificati.",
    manualLabelFailed: "Preparazione della Preview rifiutata: {error}. Etichette e YAML invariati.",
    manualLabelApplyFailed: "Applicazione rifiutata o incompleta: {error}. Controlla la produzione e le protezioni di riconciliazione.",
    backupLabelAdd: "Etichette da aggiungere",
    backupLabelRemove: "Etichette da rimuovere",
    backupLabelReview: "Entità da verificare",
    backupConfirm: "Ripristinare questo YAML in produzione? Verrà sempre creata una copia di sicurezza del file di produzione attuale. Le etichette di HA non verranno modificate.",
    backupRestoreFailed: "Ripristino rifiutato: {error}",
    backupRestored: "Ripristino completato. Backup di sicurezza: {backup}",
    backupRestorePendingRemoval: "Attenzione: {count} entità dello YAML di produzione ripristinato mancano nella Preview: {entities}. La prossima applicazione le rimuoverebbe di nuovo. Le etichette di HA non sono state ripristinate; ripristinale se vuoi mantenere queste entità.",
    backupRestorePendingOther: "Dopo il ripristino, la Preview propone ancora {added} aggiunte, {removed} rimozioni e {modified} modifiche. Le etichette di HA non sono state ripristinate. Verifica le modifiche prima di qualsiasi applicazione.",
    backupRestoreNotVerified: "Lo YAML di produzione è stato ripristinato, ma non è stato possibile verificare il confronto aggiornato con la Preview. Aggiorna la Preview e verifica le differenze prima di qualsiasi applicazione.",
    backupRestoreAligned: "Lo YAML ripristinato e la Preview hanno la stessa configurazione per entità. Le etichette di HA non sono state ripristinate.",
    restoreReconcileTitle: "Completa il ripristino di HVLS",
    restoreReconcileSummary: "Lo YAML ripristinato è protetto. HVLS non può riscrivere la produzione finché non decidi come risolvere le differenze con le etichette di Home Assistant.",
    restoreReconcilePending: "Il ripristino resta protetto anche dopo un riavvio. Completalo nella Preview prima di applicare di nuovo.",
    restoreReconcileAddLabels: "Ripristina le etichette delle entità ripristinate",
    restoreReconcileAligned: "Conferma la configurazione corrispondente e completa il ripristino",
    restoreReconcileKeepCurrent: "Mantieni le etichette attuali (applicazione separata)",
    restoreReconcileAddConfirm: "Ripristinare le etichette HVLS di {count} entità ripristinate?\n{entities}\n\nNessuna applicazione né modifica dello YAML di produzione.",
    restoreReconcileKeepConfirm: "Hai scelto le etichette attuali di HA. Differenze rispetto allo YAML ripristinato: {added} aggiunte, {removed} rimozioni, {modified} modifiche. Un'applicazione successiva può sostituire la configurazione ripristinata. Il backup resta disponibile. Sbloccare solo un'applicazione separata (senza eseguirla)?",
    restoreReconcileAlignedConfirm: "La Preview ora corrisponde alle entità dello YAML ripristinato. Terminare la protezione del ripristino senza modificare la produzione né applicare nulla?",
    restoreReconcileCannotAdd: "Non è possibile ripristinare in sicurezza le etichette di tutte queste entità (mancanti o non idonee). Esaminale in Gestione entità HVLS.",
    restoreReconcileAfterLabels: "Le etichette sono state ripristinate, ma la Preview differisce ancora dallo YAML ripristinato. «Applica» resta bloccato. Controlla le personalizzazioni.",
    restoreReconcileResolved: "Ripristino riconciliato. YAML di produzione invariato; nessuna applicazione eseguita.",
    restoreReconcileError: "Riconciliazione rifiutata o incompleta. Le scritture restano protette. Aggiorna e verifica le differenze.",
    restoreReconcileWorking: "Riconciliazione delle etichette e verifica dello stato…",
    restoreReconcileDiff: "Differenze Preview / produzione ripristinata: {added} aggiunte, {removed} rimosse, {modified} modificate.",
    restoreReconcileCancelFailed: "Annulla il ripristino interrotto",
    restoreReconcileCancelFailedConfirm: "Il ripristino si è interrotto prima di modificare lo YAML di produzione. Lo stato originale del file è stato verificato. Rimuovere la protezione del ripristino senza modificare etichette o YAML?",
    restoreReconcileUncertain: "Non è stato possibile verificare lo stato dello YAML dopo l'interruzione. Nessuno sblocco automatico; controlla backup e proprietà.",
    backupNoDiff: "Lo YAML corrisponde alla produzione.",
    backupTextOnlyDiff: "Nessuna differenza per entità. Differisce solo il testo dello YAML (per esempio commenti, ordine o formattazione). Il ripristino sostituirebbe il testo del file di produzione dopo un backup di sicurezza.",
    backupRestoreTextOnly: "Mostra le differenze di testo dello YAML nella Preview",
    backupConfirmTextOnly: "Le configurazioni delle entità sono identiche ma il testo dello YAML differisce. Ripristinare in produzione il testo esatto del backup? Verrà sempre creata una copia di sicurezza della produzione attuale. Le etichette di HA non verranno modificate.",
    backupDiffTitle: "Modifiche se questo backup viene ripristinato",
    backupSize: "{size} byte",
    backupEntities: "{count} entità",
    backupRestartHint: "Il file YAML è stato ripristinato su disco. Riavvia Home Assistant perché Google Assistant ricarichi la sua configurazione.",
    refreshEntities: "Aggiorna le entità",
    loadingEntities: "Caricamento delle entità…",
    searchPlaceholder: "Cerca per nome, ID entità o area…",
    searchLabel: "Cerca entità",
    filterLabel: "Filtra entità",
    filterAll: "Tutte le entità",
    filterWith: "Con HVLS",
    filterWithout: "Senza HVLS",
    filterEligibleWithout: "Senza HVLS — idonee",
    assistantReportIssue: "Segnala un problema su GitHub",
    filterIneligible: "Non idonee",
    actionAdd: "AGGIUNGERE",
    actionRemove: "RIMUOVERE",
    confirmLabel: "{action} l'etichetta HVLS?",
    otherLabelsPreserved: "Tutte le altre etichette verranno mantenute.",
    ineligibleWarning: "Attenzione: questa entità al momento non è idonea.",
    updateFailed: "Aggiornamento dell'etichetta HVLS rifiutato per {entity}:",
    reloadFailed: "L'etichetta è stata aggiornata in HA, ma non è stato possibile ricaricare il catalogo delle entità. Usa «Aggiorna le entità».",
    domainsSupported: "Domini supportati da HVLS",
    domainsUnsupported: "Domini non supportati",
    domainCount: "{count} domini · {entities} entità",
    entitiesCount: "{count} entità",
    catalogStatus: "{matching} entità corrispondenti · {labeled} etichettate su {total} · Etichetta: {label}",
    noMatches: "Nessuna entità corrisponde ai filtri.",
    noArea: "Nessuna area",
    withoutHVLS: "— Nessuna etichetta HVLS",
    unknownHVLS: "HVLS · stato sconosciuto",
    ineligibleState: "Non idonea",
    notEligible: "Questa entità non rispetta le regole di selezione di HVLS.",
    exclusionIntro: "Esclusa dalla configurazione di Google Assistant generata da HVLS:",
    reasonDomain: "il suo dominio non è supportato da HVLS.",
    reasonClass: "la sua classe (sensore, sensore binario o evento) non è supportata da HVLS.",
    reasonDisabled: "è disattivata in Home Assistant.",
    reasonHidden: "è nascosta in Home Assistant.",
    reasonCategory: "è un'entità di configurazione o di diagnostica.",
    exclusionHelp: "Perché questa entità è esclusa",
    exclusionFootnote: "Resta in Home Assistant. HVLS non la seleziona per Google Assistant.",
    moreDomain: "Mostra altre 100 ({shown}/{total})",
    moreEntities: "Mostra altre 100 entità",
    excludedTitle: "Entità escluse ({count})",
    excludedExplanation: "Entità con l'etichetta HVLS che non rispettano le regole di selezione attuali.",
    excludedEmpty: "Nessuna entità etichettata è esclusa.",
    excludedNote: "La diagnostica usa i registri attuali. Lo YAML mostrato proviene dall'ultima Preview generata.",
    unknownReason: "Motivo sconosciuto",
    reasonFilterTitle: "Motivi di non idoneità",
    reasonFilterAll: "Seleziona tutti",
    reasonFilterOnly: "solo",
    reasonFilterOnlyAria: "Mostra solo: {reason}",
    reasonFilterNone: "Nessun motivo selezionato. Seleziona almeno un motivo per mostrare le entità.",
    reasonShort_domain_not_enabled: "Dominio non supportato",
    reasonShort_unsupported_device_class: "Classe non supportata",
    reasonShort_disabled: "Disattivata",
    reasonShort_hidden: "Nascosta",
    reasonShort_entity_category: "Configurazione / diagnostica",
    reasonShort_other: "Motivo sconosciuto",
    reasonDetailDomain: "dominio: {domain}",
    reasonDetailClass: "classe: {deviceClass}",
    reasonDetailNoClass: "classe: nessuna",
    reasonDetailConfig: "categoria: configurazione",
    reasonDetailDiagnostic: "categoria: diagnostica",
    reasonCategoryFull: "Entità di configurazione o di diagnostica",
    metricEntities: "Entità in produzione",
    productionStatsUnavailable: "Statistiche di produzione non disponibili: file mancante, illeggibile o non valido.",
    initialLabelsDetected: "Trovate {count} entità con l'etichetta HVLS in Home Assistant. Puoi creare il primo YAML da questa selezione.",
    initialLabelsPreview: "Prepara la Preview iniziale ({count} entità)",
    initialPendingPreview: "Verifica la Preview in sospeso ({count} modifica/e)",
    initialYamlPreview: "Prima configurazione: {count} entità proposte dalle etichette attuali di HA. Lo YAML verrà creato solo dopo l'approvazione.",
    productionRemoval: "Rimozione in sospeso nella Preview: l'entità è ancora in produzione",
    metricRooms: "Aree",
    byDomain: "Per dominio",
    byArea: "Per area",
    disabledDomains: "Domini esclusi dalla selezione HVLS",
    noDisabledDomains: "Nessun dominio disattivato rilevato.",
    labeledOnly: "Solo le entità con l'etichetta HVLS.",
    comparisonTitle: "Differenze Preview / produzione",
    pendingChanges: "{count} modifica/e da verificare prima di applicare",
    pendingAction: "Apri la Preview",
    productionValidated: "Già presente nello YAML di produzione",
    productionPending: "Aggiunta allo YAML di produzione in sospeso",
    productionModified: "Presente in produzione, modifiche in sospeso",
    productionUnknown: "Stato di produzione sconosciuto: aggiorna la Preview",
    comparisonMissing: "Impossibile confrontare: manca il file di produzione.",
    comparisonFailed: "Impossibile confrontare ({status}): {reason}",
    unreadableFile: "file illeggibile",
    added: "Aggiunte",
    removed: "Rimosse",
    modified: "Modificate",
    unchanged: "Invariate",
    identicalYaml: "✓ Nessuna differenza: lo YAML corrisponde alla produzione.",
    identicalEntities: "✓ Stessa configurazione per entità (solo differenze di formattazione YAML).",
    entitiesAdded: "Entità aggiunte",
    entitiesRemoved: "Entità rimosse",
    removalReasonProposal: "Motivo: etichetta HVLS rimossa in questa proposta.",
    removalReasonBackup: "Motivo: esposta oggi, ma assente dal backup.",
    removalReasonNoLabel: "Motivo: non ha più l'etichetta HVLS in Home Assistant.",
    removalReasonMissing: "Motivo: non esiste più in Home Assistant.",
    removalReasonIneligible: "Motivo: {detail}",
    entitiesModified: "Entità modificate",
    previewLoading: "Caricamento della Preview…",
    previewMissing: "Nessuna Preview disponibile. Generane prima una.",
    previewReady: "Preview: {path} — Produzione: {production}",
    previewLoadFailed: "Impossibile caricare la Preview: {error}",
    previewGenerating: "Generazione della Preview…",
    previewGenerated: "Preview generata: {count} entità. Verifica le differenze prima di applicare.",
    previewGenerateFailed: "Generazione della Preview non riuscita: {error}",
    applyInfoLabel: "Perché «Applica» è disattivato?",
    cancelPreview: "Annulla",
    previewCancelled: "Preview annullata: non è cambiato nulla.",
    backupIgnoreUpdating: "Ricalcolo della Preview con le esclusioni…",
    backupIgnoreFailed: "Impossibile ricalcolare la Preview: {error}. YAML ed etichette invariati.",
    backupIgnoreSelected: "Scelte salvate: {count} entità ignorata/e, {refreshed} ripristinata/e con nome e stanza attuali. Nessun file né etichetta modificati.",
    restoreBlockerField: "{field}: backup \"{before}\" → Home Assistant oggi \"{after}\"",
    restoreFieldName: "nome",
    restoreFieldRoom: "stanza",
    restoreValueAbsent: "(nessuno)",
    planCol_out: "Non ripristinate ({count})",
    planCol_current: "Nome o stanza cambiati ({count})",
    planCol_result: "Risultato per Google ({count})",
    planSub_out: "Per loro non cambia nulla.",
    planSub_current: "Ripristinate con i valori attuali di Home Assistant.",
    planSub_result: "Ciò che verrà effettivamente scritto.",
    planHelpLabel: "Aiuto",
    planHelp_out: "Entità del backup che non verranno ripristinate. «Impossibile»: non esistono più, non sono più idonee o hanno opzioni che HVLS non genera. Per le altre hai scelto di non ripristinarle: il loro stato attuale non cambia.",
    planHelp_current: "Queste entità sono state rinominate o spostate in Home Assistant dopo il backup. Verranno ripristinate con il nome e la stanza di oggi, non con quelli del backup. «Ritira» le sposta in «Non ripristinate».",
    planHelp_result: "L'elenco esatto delle entità esposte a Google dopo il ripristino. «Aggiunta»: non esposta oggi. «Già esposta»: nessuna modifica. In rosso: esposta oggi ma assente dal backup; verrà rimossa a meno che tu non la mantenga.",
    planSumRestored: "Ripristinate dal backup",
    planSumExposed: "Esposte dopo il ripristino",
    planSumAdded: "Aggiunte dal backup",
    planSumAlready: "Già esposte oggi",
    planSumRemoved: "Non più esposte",
    planNotReady: "Alcune entità devono ancora essere risolte prima di poter applicare questo ripristino.",
    planActionRestore: "Ripristina →",
    planActionWithdraw: "← Ritira",
    planActionKeep: "Mantieni",
    planActionSkip: "Non ripristinare",
    planTagPending: "da risolvere",
    planTagLocked: "impossibile",
    planTagRemoved: "rimossa",
    planTagKept: "mantenuta",
    planTagCurrent: "nome/stanza attuali",
    planTagAdded: "aggiunta",
    planTagAlready: "già esposta",
    planKeepQuestion: "{count} entità esposta/e oggi è/sono assente/i dal backup. Mantenerla/e?",
    planKeepAll: "Mantieni tutte",
    planRemoveAll: "Rimuovi tutte",
    planRecommended: "↺ Torna alla raccomandazione",
    planEmpty: "Nessuna",
    planReasonMissing: "assente da Home Assistant",
    planReasonNotExposed: "non esposta nel backup",
    planReasonIneligible: "non idonea ({reason})",
    planReasonOptions: "opzioni non riproducibili: {fields}",
    planReasonConflict: "differenza non riproducibile",
    planReasonRemoved: "esposta oggi, assente dal backup",
    planReasonNoLabel: "esposta oggi, ma non ha più l'etichetta HVLS in Home Assistant",
    planTechDetails: "Dettagli tecnici: etichette di Home Assistant",
    planConfirmSummary: "Dopo il ripristino: {exposed} entità esposta/e a Google ({added} aggiunta/e, {already} già esposta/e).",
    planConfirmRemoved: "Non più esposte ({count}): {entities}.",
    planConfirmCurrent: "Con nome e stanza attuali ({count}): {entities}.",
    planConfirmOut: "Non ripristinate ({count}): {entities}.",
    applyNoChanges: "Nessuna modifica da applicare: la Preview corrisponde già alla produzione.",
    applyReasonMissingIdentity: "L'identità dell'installazione HVLS non è disponibile.",
    applyReasonUnsafePath: "Il percorso di output o del registro non è sicuro. Controlla i collegamenti simbolici.",
    applyReasonReservedPath: "Il percorso di output è in conflitto con i metadati riservati di HVLS.",
    applyReasonRegistryInvalid: "Il registro di proprietà di HVLS non è valido o è illeggibile. È necessaria una verifica.",
    applyReasonOtherInstallation: "Questo file appartiene a un'altra installazione di HVLS. La scrittura è vietata.",
    applyReasonUnmanagedOutput: "Un file YAML esistente non è verificato come di proprietà di HVLS. Resta protetto.",
    applyUnmanagedAssistantHint: "L'Assistente può ispezionare questo file in sola lettura. L'ispezione non abilita automaticamente «Applica».",
    applyUnmanagedAssistantAction: "Ispeziona nell'Assistente",
    applyReasonMissingDirectory: "La cartella di output non è disponibile.",
    applyReasonVerificationFailed: "Verifica di sicurezza del file non riuscita. «Applica» resta disattivato.",
    applyReasonOutputPathMismatch: "Il percorso di output non corrisponde più a quello registrato da HVLS.",
    applyReasonPendingOperation: "Un'operazione HVLS è incompleta. Prima di «Applica» è necessario un recupero controllato.",
    applyReasonManagedOutputMissing: "Il file di output gestito in precedenza da HVLS manca.",
    missingRebuildAction: "Ricostruisci lo YAML mancante",
    missingRebuildReview: "Lo YAML gestito in precedenza da HVLS manca. {count} entità possono essere ricostruite dalle etichette attuali di HA. Verifica lo YAML prima di confermare.",
    missingRebuildConfirm: "Il file di produzione di HVLS manca. Ricrearlo dalla Preview verificata e dalle etichette attuali di HA? Nessuna etichetta verrà modificata e i backup esistenti saranno conservati. Se il file ricompare, l'operazione viene rifiutata.",
    missingRebuildApplied: "YAML ricostruito: {path} — {bytes} byte scritti. Etichette di HA invariate.",
    missingRebuildBackups: "Esamina i backup",
    missingRebuildDetected: "Il file di produzione di HVLS manca. Puoi ripristinare un backup o ricostruirlo da {count} entità etichettate in HA, dopo aver verificato la Preview.",
    applyReasonOutputChanged: "Il file gestito da HVLS è cambiato dall'ultima verifica SHA-256.",
    applyReasonNotConfigured: "HVLS non è ancora configurato.",
    applyVerificationUnavailable: "Impossibile convalidare «Applica»: informazioni di sicurezza mancanti o incoerenti. Aggiorna la Preview.",
    bulkRemovalWarning: "ATTENZIONE: {removed} entità su {before} verranno rimosse dallo YAML di produzione (dopo «Applica»: {after}). Verifica le rimozioni in rosso prima di continuare.",
    emptySelectionConfirm: "Questa operazione rimuove l'ultima entità HVLS: nello YAML non resterà alcuna entità esposta. Confermare la rimozione di tutte le entità?",
    bulkRemovalConfirm: "RIMOZIONE MASSIVA: {removed} entità su {before} verranno rimosse dallo YAML di produzione (nuovo totale: {after}). L'operazione può rimuovere anche etichette di HA. Confermi esplicitamente queste rimozioni?",
    applyConfirm: "Applicare questa Preview alla configurazione di Google Assistant?",
    applyWarning: "Se i backup sono attivi, verrà eseguito il backup del file attuale. L'operazione verrà rifiutata se vengono rilevate modifiche dopo la tua verifica.",
    previewApplying: "Convalida e applicazione della Preview…",
    previewApplied: "Preview applicata: {path} — {bytes} byte scritti{backup}",
    backupCreated: "Backup: {path}",
    previewApplyFailed: "Applicazione rifiutata: {error}. Aggiorna la Preview prima di riprovare.",
    noYaml: "Nessuno YAML da copiare.",
    copyUnsupported: "Copia dal browser non riuscita.",
    yamlCopied: "YAML copiato — {path}",
    copyFailed: "Impossibile copiare: {error}",
    registriesLoading: "Caricamento dei registri di HA…",
    entitiesLoadFailed: "Impossibile caricare le entità: {error}",
    inconsistentRegistry: "Risposta incoerente dal registro di HA",
    waitingHA: "In attesa di Home Assistant…",
    tabsLabel: "Sezioni di HVLS",
    rawDiffSummary: "Diff YAML dettagliato",
    hvlsLabelAria: "Etichetta HVLS: {entity}",
    entityMoreInfo: "Mostra i dettagli di {entity} in Home Assistant",
    catalogWarning: "Attenzione: {warnings}",
    absentValue: "(assente)",
    showPreviewYaml: "Mostra lo YAML della Preview",
    changesProposed: "Modifiche proposte per Google Assistant",
    recoveryDiffTitle: "Differenze tra il vecchio e il nuovo YAML",
    recoveryDiffSummary: "Vecchio file: {before} entità → Nuovo file proposto: {after} entità.",
    changesIntro: "Verifica le differenze prima di applicare la configurazione.",
    noChanges: "Nessuna modifica di entità da applicare.",
    removalNote: "Rimuovere un'entità qui non la elimina da Home Assistant: cambia solo la sua configurazione di Google Assistant.",
    firstProduction: "Nessuna configurazione di produzione esistente: impossibile calcolare le differenze rispetto a un file precedente.",
    fieldBefore: "Prima",
    fieldAfter: "Dopo",
    fileIssue_invalid_entity_file_path: "percorso non valido",
    fileIssue_sensitive_file_reference: "file sensibile",
    fileIssue_symlink_entity_file_not_allowed: "collegamento simbolico vietato",
    fileIssue_include_missing: "file non trovato",
    fileIssue_yaml_syntax_error: "YAML non valido",
    fileIssue_duplicate_mapping_key: "chiave YAML duplicata",
    fileIssue_yaml_file_too_large: "file troppo grande",
    fileIssue_expected_mapping: "struttura YAML non valida",
    fileIssue_unreadable_yaml_file: "file illeggibile",
    fileIssue_entity_file_unavailable: "file non disponibile",
    fileIssue_invalid_entity_id: "ID entità non valido",
    fileIssue_invalid_entity_options: "opzioni dell'entità non valide",
    fileIssue_invalid_expose_value: "valore expose non valido",
    fileIssue_invalid_room_option: "opzione room non valida",
    fileIssue_invalid_name_option: "opzione name non valida",
    fileIssue_invalid_aliases_option: "opzione aliases non valida",
    fileIssue_unhandled_entity_option: "opzione non supportata",
    fileIssueUnknown: "problema sconosciuto",
    fileIssueLine: "riga",
  },
  nl: {
    generate: "Preview genereren",
    refresh: "Alle gegevens vernieuwen",
    copy: "YAML kopiëren",
    apply: "Preview toepassen",
    settings: "Instellingen",
    menu: "Home Assistant-menu openen",
    tabStats: "Statistieken",
    tabExclusions: "Uitgesloten entiteiten",
    tabEntities: "HVLS-entiteitenbeheer",
    tabPreview: "Preview",
    tabBackups: "Back-ups",
    tabMigration: "Assistent",
    migrationIntro: "HVLS genereert de YAML van je entiteiten op basis van Home Assistant-labels. Voor labelbeheer is geen verbinding met Google Assistant nodig. Inspectie is alleen-lezen; labelwijzigingen en 'Toepassen' vereisen een expliciete bevestiging.",
    migrationGuideTitle: "Laten we je situatie bepalen",
    migrationGuideStepIdentify: "Stap 1 — Je situatie bepalen",
    migrationGuideStepVerify: "Stap 2 van 2 — De aanbevolen controles bekijken",
    assistantProvenanceStepVerify: "Inspecteer het YAML-bestand dat je wilt hergebruiken",
    migrationManagedNotice: "HVLS beheert nu het productiebestand met entiteiten. Gebruik de Preview voor wijzigingen. Eerdere diagnoses blijven beschikbaar onder de geavanceerde tools.",
    migrationGuideDetected: "Geen google_assistant:-declaratie gevonden. Dit verhindert niet dat HVLS een YAML-bestand met entiteiten beheert en genereert.",
    migrationGuideCandidate: "Er bestaat een bestand google_assistant_entities.yaml. Je kunt het hergebruiken om HVLS-labels in te stellen, ook zonder verbinding met Google Assistant.",
    migrationGuideNoCandidate: "Geen gebruikelijk google_assistant_entities.yaml-bestand gevonden. Er kunnen nog andere bronnen bestaan.",
    migrationGuideQuestion: "Hoe wil je beginnen met HVLS?",
    migrationGuideNew: "Mijn entiteiten in HA selecteren",
    migrationGuideExisting: "Een bestaand entiteitenbestand hergebruiken",
    migrationGuideUnsure: "Een ander bestand kiezen",
    migrationGuideNextNew: "Selecteer entiteiten in 'HVLS-entiteitenbeheer'. Bestaande labels blijven ongewijzigd. Vóór elke schrijfactie is nog steeds goedkeuring van de Preview nodig.",
    migrationGuideNextExisting: "Inspecteer het entiteitenbestand en bekijk daarna de te importeren labels. Er is geen verbinding met Google Assistant nodig.",
    migrationGuideNextUnsure: "Voer het relatieve pad in van het YAML-bestand dat je wilt hergebruiken en inspecteer het.",
    migrationGuideAwaitChoice: "Kies of je dit bestand hergebruikt, een ander bestand selecteert of opnieuw begint.",
    migrationGuideNoAuthorization: "Deze keuze blijft op dit scherm; ze keurt geen migratie goed en staat geen schrijfacties toe.",
    assistantSourceFound: "Google Assistant-configuratie gevonden",
    assistantSourceSummary: "{entries} expliciete entiteitsdeclaraties. Geïnspecteerde bestanden: {paths}. Geen blootstelling in Google Home gecertificeerd.",
    assistantPackagesDetected: "Configuratie met packages gevonden: ingedeeld als 'Andere configuratie', niet automatisch geïnspecteerd.",
    assistantPackagesQuestion: "Voer het pad in van het YAML-bestand met entiteiten dat je handmatig wilt inspecteren.",
    assistantFileHelp: "ⓘ Voorbeelden van YAML-syntaxis tonen",
    assistantGoogleConnectionHint: "Geen verbinding met Google Assistant gevonden in de geïnspecteerde configuratie. Controleer configuration.yaml aan de hand van de voorbeelden hieronder. HVLS kan entiteiten ook zonder deze verbinding beheren.",
    assistantExampleDirect: "In configuration.yaml:",
    assistantExampleProjectId: "JOUW_PROJECT_ID",
    assistantExampleInclude: "Alternatief met een bestand dat in configuration.yaml wordt opgenomen:",
    assistantExampleIncludedContent: "In google_assistant.yaml:",
    assistantExampleNote: "Vervang project_id door je Google-project en SERVICE_ACCOUNT.json door het bestand van je serviceaccount (toon de inhoud nooit). project_id en service_account zijn verplicht voor handmatige configuratie; report_state is optioneel. Controleer je actieve instellingen voordat je ze wijzigt: deze voorbeelden zorgen niet voor een werkende verbinding met Google Home. secure_devices_pin (optioneel, verwijder het commentaarteken) is de code die je uitspreekt om een slot te openen, een alarm uit te schakelen of een deur of poort te openen; zet hem tussen aanhalingstekens in secrets.yaml (bijvoorbeeld google_secure_pin: \"1234\").",
    assistantFileTitle: "Entiteitenbestand",
    assistantFileCandidate: "Voorgesteld gevonden bestand; je kunt dit pad wijzigen.",
    assistantFileManual: "Voer het pad in van het YAML-bestand met entiteiten.",
    assistantFilePathLabel: "Pad relatief aan de configuratiemap van Home Assistant",
    assistantFilePlaceholder: "google_assistant_entities.yaml",
    assistantFileCheck: "Bestand inspecteren (alleen-lezen)",
    assistantFileChecking: "Alleen-lezen inspectie…",
    assistantFileNotChecked: "Nog geen bestand geïnspecteerd.",
    assistantFileChecked: "{entries} gedeclareerde entiteiten · {anomalies} lokale structurele problemen gevonden.",
    assistantFileIssues: "Te controleren: {issues}. Corrigeer indien nodig en controleer opnieuw.",
    assistantFileNoIssues: "Geen structurele problemen gevonden. Dit garandeert geen actieve configuratie of blootstelling in Google Home.",
    assistantFileCannotRead: "Kan het bestand niet inspecteren: {reason}.",
    assistantFileUnavailable: "Inspectie niet beschikbaar. Er is niets gewijzigd.",
    assistantFileSafety: "Het inspecteren van een bestand bewijst geen blootstelling in Google Home. Labels en YAML veranderen alleen via een afzonderlijke, bevestigde actie.",
    migrationGuideSelectedExisting: "'Een bestaand bestand hergebruiken' geselecteerd. Je kunt je keuze wijzigen.",
    migrationGuideSelectedNew: "Gekozen route: nieuwe configuratie. Je kunt je keuze hieronder wijzigen.",
    migrationGuideSelectedUnsure: "'Een ander bestand kiezen' geselecteerd. Voer hieronder het pad in.",
    assistantFileMetricEntries: "Gedeclareerde entiteiten",
    assistantFileMetricTrue: "expose: true",
    assistantFileMetricFalse: "expose: false",
    assistantFileMetricUnset: "expose ontbreekt",
    assistantFileMetricIssues: "Te controleren entiteiten",
    assistantFileUnreferencedConclusion: "Dit leesbare bestand kan HVLS-labels instellen. Het ontbreken van een koppeling met Google Assistant is een waarschuwing, geen belemmering voor entiteitenbeheer. Het oorspronkelijke bestand blijft behouden.",
    assistantFilePackagesConclusion: "Een leesbaar bestand geeft niet aan welke configuratie de packages gebruiken. Packages blijven ingedeeld als 'Andere configuratie' en komen niet in aanmerking voor automatische migratie.",
    assistantFileGeneralConclusion: "Deze controle analyseert alleen de inhoud van het bestand; ze bepaalt niet de globale regels van Google Assistant of de werkelijke blootstelling in Google Home.",
    assistantFileUnsetExplanation: "Een vermelding zonder expose wordt niet behandeld als expose: true. Een eventuele blootstelling hangt af van andere instellingen en wordt hier niet vastgesteld.",
    assistantFileResultsTitle: "Samenvatting van de bestandsinspectie",
    assistantAdoptTitle: "Entiteiten hergebruiken in HVLS",
    assistantAdoptIntro: "Herstel de vorige YAML met de entiteiten die momenteel in HA beschikbaar zijn. Maak eerst een back-up en neem het beheer over, bereid daarna de Preview voor. Geen wijzigingen zonder goedkeuring.",
    assistantAdoptNoCatalog: "De entiteitencatalogus van Home Assistant is niet geladen. Vernieuw de vergelijking om verder te gaan.",
    assistantAdoptRefresh: "Labelvergelijking vernieuwen",
    assistantAdoptCounts: "{total} in de oude YAML · {recoverable} herstelbaar · {existingNew} andere al gelabeld in HA · {nextTotal} in totaal voorgesteld · {missing} ontbrekend · {ineligible} niet in aanmerking · {review} te controleren.",
    assistantAdoptReview: "Details van entiteiten en voorgestelde beslissingen",
    assistantAdoptReasonAdd: "HVLS-label toevoegen",
    assistantAdoptReasonAlready: "Al in HVLS",
    assistantAdoptReasonExclude: "Uitgesloten (expose: false) — niet toegevoegd",
    assistantAdoptReasonReview: "Handmatige controle vereist",
    assistantAdoptReviewYamlIssue: "Probleem in de YAML-declaratie",
    assistantAdoptReviewInvalidExposure: "Ongeldige expose-instructie",
    assistantAdoptReviewMissingEntity: "Entiteit ontbreekt in de HA-catalogus",
    assistantAdoptReviewImplicitExposure: "expose-instructie ontbreekt: bedoeling onbekend",
    assistantAdoptReviewUnknownLabel: "Status van het HVLS-label onbekend",
    assistantAdoptReviewExcludedLabeled: "expose: false maar het HVLS-label is aanwezig",
    assistantAdoptReviewIneligible: "Entiteit komt niet in aanmerking voor generatie",
    assistantAdoptReviewUnlabeledCustom: "Geen HVLS-label; YAML-aanpassingen behouden",
    assistantAdoptCustomValuesUnverified: "YAML-naam, -ruimte of -aliassen niet vergeleken met gegenereerde waarden",
    assistantAdoptLimits: "Ontbrekende of niet in aanmerking komende entiteiten worden alleen uit de nieuwe YAML verwijderd. De Preview toont ook wijzigingen in namen, ruimtes en aliassen: controleer ze vóór goedkeuring.",
    assistantAdoptAction: "Herstel-Preview voorbereiden ({count} entiteiten)",
    assistantAdoptNone: "Geen herstelbare entiteiten: er kan geen nieuwe YAML worden voorbereid.",
    assistantTakeoverTitle: "HVLS de bestaande YAML laten beheren",
    migrationChangeChoice: "Configuratiemodus wijzigen (optioneel)",
    importPreviewDanger: "LET OP: deze normale Preview gebruikt de huidige HA-labels; dit is GEEN import van de bestaande YAML. {count} van de {total} entiteiten zouden uit de YAML worden verwijderd. Pas niets toe voordat je het herstel in de Assistent hebt afgerond.",
    importPreviewReturn: "Terug naar de Assistent",
    assistantReinstallTitle: "YAML-beheer herstellen na een herinstallatie",
    assistantReinstallIntro: "De oude configuratie wordt geanalyseerd ten opzichte van de huidige HA-entiteiten. HVLS maakt een back-up van het bestand voordat het beheer wordt overgenomen. Controleer daarna de wijzigingen in de Preview.",
    assistantReinstallAction: "Controleren en beheer herstellen",
    assistantRecoveryTakeoverConfirm: "Vorige YAML: {total} entiteiten.\nHerstelbaar: {recoverable}.\nOntbrekend in HA: {missing}.\nNiet in aanmerking: {ineligible}.\n\nEen gecontroleerde back-up maken en HVLS dit bestand laten beheren? In deze stap veranderen YAML en labels niet.",
    assistantRecoveryChangedNote: "Let op: het huidige bestand verschilt van het bestand dat de vorige installatie heeft geregistreerd. De back-up beschermt het HUIDIGE bestand.\n\n",
    assistantRecoveryReady: "Beheer hersteld na een gecontroleerde back-up. Bereid nu de herstel-Preview voor.",
    assistantRecoveryPreviewPrepared: "Herstel-Preview voorbereid. Controleer verwijderingen en YAML-wijzigingen voordat je toepast.",
    assistantRecoveryPreviewFailed: "Voorbereiding van de Preview geweigerd: {error}. YAML en labels ongewijzigd.",
    assistantRecoveryNotPrepared: "Nog geen herstel-Preview voorbereid. Openstaande toevoegingen, verwijderingen en wijzigingen: geen. Begin in de Assistent.",
    assistantRecoveryPreviewBack: "Assistent openen",
    assistantRecoveryApply: "Herstelde configuratie toepassen",
    assistantRecoveryApplyConfirm: "Het gecontroleerde herstel toepassen? Voordat labels en bestand worden bijgewerkt, wordt een verplichte back-up van de huidige YAML gemaakt. Ingetrokken entiteiten worden alleen uit de YAML verwijderd.",
    assistantRecoveryApplied: "Herstel voltooid: {count} entiteiten in de nieuwe YAML. Back-up: {backup}.",
    assistantReinstallConfirm: "Het beheer van {path} overdragen aan deze HVLS-installatie?\n\nDe vorige installatie mag niet meer in Home Assistant aanwezig zijn. YAML en register worden gecontroleerd en er wordt een back-up gemaakt. Er wordt niets automatisch toegepast en er worden geen HA-labels gewijzigd.",
    assistantReinstallChangedConfirm: "LET OP: het huidige bestand VERSCHILT van het bestand dat de oude installatie heeft geregistreerd.\n\nVorige SHA-256: {oldSha}\nHuidige SHA-256: {newSha}\nHuidige entiteiten: {entities}\nNormale Preview: {added} toegevoegd, {removed} verwijderd, {modified} gewijzigd.\n\nALLEEN de overname van het beheer na een gecontroleerde back-up toestaan? YAML en labels worden niet gewijzigd. Pas de normale Preview NIET toe voordat de entiteiten zijn afgestemd.",
    assistantReinstallChangedSuccess: "Beheer van de vervangen YAML hersteld met gecontroleerde back-up: {backup}. Geen entiteiten of YAML gewijzigd. LET OP: de normale Preview wijkt af; pas deze niet toe voordat de entiteiten zijn afgestemd.",
    assistantTakeoverIntro: "Controleer de herstelbare entiteiten. HVLS maakt een back-up van het bestand en neemt het beheer over. De YAML wordt pas bijgewerkt na goedkeuring van de Preview.",
    assistantTakeoverAction: "Dit bestand controleren en het beheer overnemen",
    assistantTakeoverConfirm: "HVLS {path} laten beheren?\n\nHuidige entiteiten: {entities} ({issues} te controleren).\nVerschillen in de Preview: {added} toegevoegd, {removed} verwijderd, {modified} gewijzigd.\n\nEr wordt een verplichte back-up gemaakt. Het productiebestand wordt NIET gewijzigd en er wordt niets toegepast. Alleen toekomstig beheer door HVLS wordt toegestaan.",
    assistantTakeoverSuccess: "HVLS beheert nu deze YAML. Gecontroleerde back-up: {backup}. Er is niets toegepast. Controleer de verschillen in de Preview voordat je toepast.",
    assistantTakeoverFailure: "Overname geweigerd of onvolledig: controleer de YAML, back-ups en eigendomsstatus en vernieuw daarna. Er wordt niets automatisch toegepast.",
    assistantTakeoverRegistrationFailed: "Back-up gemaakt, maar het eigendom is niet overgedragen. Raadpleeg de Home Assistant-logboeken (HVLS recovery). Herhaal de overname niet voordat het probleem is onderzocht.",
    assistantTakeoverBusy: "Bestaande YAML controleren en back-up maken…",
    assistantAdoptConfirm: "HVLS-labels toevoegen aan {count} entiteiten die in aanmerking komen? De bron-YAML en Google Assistant worden niet gewijzigd. Elke toevoeging wordt afzonderlijk gecontroleerd: als er één mislukt, blijven eerdere geslaagde toevoegingen behouden en worden ze gemeld.",
    assistantAdoptBusy: "HVLS-labels toevoegen: {done} / {total}",
    assistantAdoptDone: "{count} label(s) toegevoegd. Oorspronkelijke YAML behouden; er is een nieuwe Preview aangevraagd. Controleer deze voordat je toepast.",
    assistantAdoptStopped: "{count} labeltoevoeging(en) bevestigd vóór de onderbreking. Controleer de bijgewerkte catalogus: een bewerking zonder antwoord kan toch geslaagd zijn. Geen automatische nieuwe poging.",
    assistantAdoptStale: "Het bestand of de catalogus is gewijzigd sinds de inspectie. Controleer opnieuw voordat je een Preview voorbereidt.",
    assistantAdoptNeedsReview: "Verschillen tussen de oude YAML en de huidige HA verschijnen in de Preview. Ontbrekende en niet in aanmerking komende entiteiten blokkeren de andere niet.",
    assistantAdoptTruncated: "Het bestand bevat te veel vermeldingen voor een volledig hergebruikplan; er worden geen labels in bulk voorgesteld.",
    assistantProvenanceAdvanced: "ⓘ Herkomst van het bestand en controle van historische back-ups (optioneel)",
    assistantProvenanceStep: "Herkomst van het bestand (optioneel)",
    assistantProvenanceQuestion: "Waar komt dit bestand volgens jou vandaan?",
    assistantProvenanceOld: "Het hoorde bij een eerdere Google Assistant-configuratie",
    assistantProvenanceUnknown: "Ik weet niet waar het vandaan komt",
    assistantProvenanceNew: "Het is voorbereid voor een nieuwe configuratie",
    assistantProvenanceVerifiedTitle: "Wat HVLS heeft gecontroleerd",
    assistantProvenanceVerified: "Het YAML-bestand is gelezen en de declaraties zijn geteld. Er is niets gewijzigd.",
    assistantProvenanceAnomalies: "{count} entiteiten hebben lokale problemen: de andere vermeldingen blijven inspecteerbaar. Controleer elk probleem voordat je beslist wat er met die entiteit gebeurt.",
    assistantProvenanceMissingTitle: "Wat nog gecontroleerd moet worden",
    assistantProvenanceMissing: "In de geanalyseerde configuratie is geen google_assistant:-verwijzing naar dit bestand gevonden. De globale blootstellingsregels, de daadwerkelijk geladen configuratie en de status van apparaten in Google Home zijn niet vastgesteld.",
    assistantProvenanceNextTitle: "Aanbevolen volgende controle",
    assistantProvenanceNextOld: "Zoek een oude back-up van configuration.yaml en eventueel opgenomen google_assistant.yaml-bestanden. Controleer of entity_config naar dit bestand verwees en welke instellingen voor expose_by_default en exposed_domains golden. Activeer niets alleen om dit te controleren.",
    assistantProvenanceNextUnknown: "Doorzoek Home Assistant-back-ups en oude Google Assistant-bestanden naar een expliciete verwijzing naar dit bestand en de globale regels. Zolang de herkomst niet vaststaat, behandel je het als een aanwijzing, niet als migratiebron.",
    assistantProvenanceNextNew: "Dit bestand kan helpen bij het voorbereiden van een nieuwe configuratie, maar het is geen gecontroleerde migratie. Ga terug naar de route 'nieuwe configuratie' als dat je doel is; activeer Google Assistant niet automatisch.",
    assistantProvenanceNextChoose: "Kies hierboven de herkomst van het bestand om de controles te zien die bij je situatie passen.",
    assistantProvenanceSafety: "Je antwoord geldt alleen voor dit scherm en wordt niet opgeslagen. Het bevestigt geen eerdere blootstelling of status van Google Home en ontgrendelt de migratie niet.",
    assistantProvenanceCategory: "Opgegeven herkomst, niet gecontroleerd",
    assistantProvenanceSourceLabel: "Geïnspecteerd bestand",
    assistantProvenanceChecklistTitle: "Hoe vind ik de oorspronkelijke configuratie?",
    assistantProvenanceChecklistTrigger: "ⓘ Praktische gids: waar zoek je in een back-up",
    assistantProvenanceChecklistIntro: "Deze controles zijn handmatig en gebeuren op een kopie. In deze stap doorzoekt, extraheert of wijzigt HVLS geen enkele back-up.",
    assistantProvenanceChecklist1: "Open een kopie van een oude Home Assistant-back-up zonder deze in de actieve installatie te herstellen.",
    assistantProvenanceChecklist2: "Zoek in configuration.yaml naar een directe google_assistant:-declaratie of google_assistant: !include bestand.yaml.",
    assistantProvenanceChecklist3: "Als er een bestand wordt opgenomen, inspecteer het dan in de kopie. Zoek naar entity_config: !include ... en vergelijk de verwijzing met het geïnspecteerde bestand.",
    assistantProvenanceChecklist4: "Noteer alleen de relevante instellingen (expose_by_default, exposed_domains). Deel geen geheimen, sleutels of serviceaccounts.",
    assistantProvenanceChecklistEnd: "Een verwijzing in een back-up is een mogelijke aanwijzing voor een historische configuratie; op zichzelf bewijst ze niet dat Google Home deze entiteiten echt heeft blootgesteld.",
    assistantProvenanceSourceLabelUnknown: "Hier wordt geen back-upkopie automatisch geanalyseerd.",
    assistantHistoryTitle: "Een kopie van een oude configuratie inspecteren",
    assistantHistoryHow: "Maak in de bestandseditor van HA de map hvls-history-review aan in de configuratiemap. Plaats daarin alleen kopieën van de oude configuration.yaml en de YAML-bestanden die deze voor Google Assistant opneemt, met behoud van de relatieve mappen. Herstel geen archieven en kopieer geen geheimen.",
    assistantHistoryFolder: "Kopiemap: hvls-history-review (naast configuration.yaml, zonder die ooit te vervangen).",
    assistantHistoryAction: "Historische kopie inspecteren (alleen-lezen)",
    assistantHistoryBusy: "Geïsoleerde kopie inspecteren…",
    assistantHistoryIdle: "Nog geen historische kopie bekeken in deze route.",
    assistantHistoryNoFolder: "hvls-history-review ontbreekt. Maak de map handmatig aan en plaats er alleen de te bekijken YAML-bestanden in.",
    assistantHistoryNoConfig: "configuration.yaml niet gevonden in hvls-history-review.",
    assistantHistoryBlocked: "Inspectie geweigerd: {reason}. Controleer alleen de kopie; wijzig de actieve configuratie niet.",
    assistantHistoryUnavailable: "Historische inspectie niet beschikbaar. Er is geen bestand gewijzigd.",
    assistantHistoryFound: "Historische declaratie: {declaration}.",
    assistantHistoryDeclDirect: "rechtstreeks in configuration.yaml",
    assistantHistoryDeclIncluded: "via een !include-bestand",
    assistantHistoryDeclAbsent: "niet gevonden in de kopie",
    assistantHistoryDeclUnknown: "niet bepaald",
    assistantHistoryRules: "Historische globale regel: expose_by_default = {defaultValue} ({origin}). exposed_domains: {domains}.",
    assistantHistoryRuleExplicit: "expliciet gedeclareerd",
    assistantHistoryRuleImplicit: "standaardwaarde aangenomen door de parser",
    assistantHistoryRuleUnknown: "niet vastgesteld",
    assistantHistoryDomainsNone: "veld niet gedeclareerd",
    assistantHistoryDomainsEmpty: "expliciet lege lijst",
    assistantHistorySource: "Bron van entity_config: {source}.",
    assistantHistorySourceInline: "entiteiten rechtstreeks gedeclareerd",
    assistantHistorySourceAbsent: "geen entity_config-veld",
    assistantHistorySourceUnknown: "niet opgelost",
    assistantHistoryCompare: "Verwijzing naar het geselecteerde entiteitenbestand: {pathStatus}. Inhoud van het bestand: {contentStatus}.",
    assistantHistoryPathSame: "zelfde relatieve pad",
    assistantHistoryPathDifferent: "ander relatief pad",
    assistantHistoryPathUnknown: "niet bepaald",
    assistantHistoryContentIdentical: "identieke checksums op het moment van inspectie",
    assistantHistoryContentDifferent: "verschillende checksums",
    assistantHistoryContentUnknown: "niet vergeleken",
    assistantHistoryCounts: "{entries} entiteiten gedeclareerd in de kopie; {anomalies} met structurele problemen.",
    assistantHistoryIssues: "Controle nodig: {issues}. De andere entiteiten blijven inspecteerbaar.",
    assistantHistoryIssueHistoricalMissing: "opgenomen entiteitenbestand ontbreekt in de kopie",
    assistantHistoryIssueNoConfig: "geen Google Assistant-declaratie in de kopie",
    assistantHistoryIssueNoEntity: "geen entity_config-veld in de kopie",
    assistantHistoryIssueInline: "entiteiten rechtstreeks gedefinieerd in plaats van in het geselecteerde bestand",
    assistantHistoryIssueCurrentUnavailable: "vergelijking met het momenteel geselecteerde entiteitenbestand niet mogelijk",
    assistantHistoryReasonUnsafe: "YAML-verwijzing buiten de geïsoleerde map of niet toegestaan",
    assistantHistoryReasonPackages: "configuratie met packages niet ondersteund",
    assistantHistoryReasonSyntax: "ongeldige YAML-syntaxis of -structuur, of dubbele sleutel",
    assistantHistoryReasonSymlink: "symbolische koppeling niet toegestaan",
    assistantHistoryReasonTooLarge: "bestand te groot",
    assistantHistoryReasonMissing: "opgenomen bestand ontbreekt",
    assistantHistoryReasonOther: "bestand of structuur niet ondersteund",
    assistantHistorySafety: "Een overeenkomend pad of checksum betreft alleen de geïnspecteerde bestanden. Het bewijst geen historisch gebruik of werkelijke blootstelling in Google Home. Er is geen migratie of schrijfactie toegestaan.",
    migrationAnalyze: "Configuratie opnieuw analyseren (alleen-lezen)",
    migrationLoading: "Google Assistant-configuratie alleen-lezen analyseren…",
    migrationFailed: "Analyse niet beschikbaar: {error}",
    migrationStatus: "Status van de controle",
    backupIntro: "Selecteer een back-up om de wijzigingen in de Preview voor te bereiden. YAML en labels worden niet gewijzigd.",
    backupLoading: "Back-ups laden…",
    backupEmpty: "Geen back-ups beschikbaar.",
    backupTypeAuto: "Automatisch",
    backupTypeSafety: "Veiligheid",
    backupTypeLegacy: "Oud formaat",
    backupHistorySummary: "{total} back-ups · {auto} automatisch · {safety} veiligheid · {legacy} oud formaat",
    backupShowOlder: "{count} oudere back-ups tonen",
    backupShowRecent: "Alleen de 10 meest recente tonen",
    backupCleanupPrepare: "Opschoning van back-ups bekijken",
    backupCleanupReview: "Voorgestelde opschoning: {keep} back-ups behouden, {count} verwijderen. Er is nog niets verwijderd.",
    backupCleanupNoop: "Geen back-ups geselecteerd om te verwijderen.",
    backupCleanupPick: "Selecteer de back-ups die je wilt verwijderen; vink de back-ups uit die je wilt behouden. Standaard worden de 10 meest recente behouden.",
    backupCleanupSelection: "{count} te verwijderen · {kept} te behouden",
    backupCleanupSelectionTitle: "Kies de te verwijderen back-ups",
    backupCleanupCheck: "Deze back-up verwijderen",
    backupCleanupNone: "Alles deselecteren",
    backupCleanupReset: "Voorgestelde selectie herstellen",
    backupCleanupKeepOne: "Behoud minstens één back-up.",
    backupCleanupDeleteCount: "De {count} geselecteerde back-ups verwijderen",
    backupCleanupDeleteOne: "De geselecteerde back-up verwijderen",
    backupCleanupConfirmButton: "Opschoning bevestigen",
    backupCleanupCancel: "Opschoning annuleren",
    backupCleanupConfirm: "De {count} vermelde back-ups definitief verwijderen? De {keep} meest recente worden behouden. Dit kan niet ongedaan worden gemaakt.",
    backupCleanupDone: "Opschoning voltooid: {count} back-ups verwijderd.",
    backupCleanupFailed: "Opschoning geweigerd: {error}. Vernieuw de lijst en controleer opnieuw.",
    backupReviewing: "Vergelijken met productie…",
    backupMissingReview: "Het productiebestand ontbreekt. Geselecteerde back-up: {count} entiteiten. Je kunt deze in de Preview voorbereiden en daarna de entiteiten en HA-labels controleren voordat je bevestigt.",
    backupMissingPreview: "Het productiebestand ontbreekt. Deze back-up stelt {count} entiteiten voor. Los de verschillen met de huidige HA-labels op voordat je de YAML opnieuw opbouwt.",
    backupMissingNoSafety: "Geen (het productiebestand ontbrak)",
    backupReviewFailed: "Kan niet vergelijken: {error}",
    backupLoadFailed: "Kan back-ups niet laden: {error}",
    backupRestore: "Deze back-up voorbereiden in de Preview",
    backupPreviewPrepared: "Herstel klaar. Bij toepassen: {added} toegevoegd, {removed} verwijderd, {modified} gewijzigd. Er wordt niets naar YAML of labels geschreven totdat je 'Dit herstel toepassen' kiest.",
    backupPreviewNotExecutable: "Herstel-Preview: controleer de wijzigingen en HA-labels voordat je bevestigt.",
    backupPreviewApply: "Dit herstel toepassen",
    backupPreviewConfirm: "De gecontroleerde back-up toepassen? De productie-YAML en HA-labels worden bijgewerkt. Er wordt een veiligheidsback-up gemaakt.",
    backupPreviewApplying: "Gecontroleerd herstel toepassen…",
    backupPreviewApplied: "Herstel voltooid: {entities} entiteiten, {added} labels toegevoegd, {removed} verwijderd. Veiligheidsback-up: {backup}.",
    backupPreviewApplyFailed: "Herstel geweigerd of onvolledig: {error}. Controleer de productie en een eventuele afstemmingswaarschuwing.",
    backupPreviewLabels: "Verwachte HA-labels: {added} toe te voegen, {removed} te verwijderen, {review} te controleren.",
    manualLabelPending: "Wacht op controle",
    manualLabelPreparing: "Labels en YAML simuleren zonder te schrijven…",
    manualLabelPrepared: "{count} labelwijziging(en) voorbereid in de Preview. Labels en YAML ongewijzigd.",
    manualLabelHelp: "Voorstel lokaal opgeslagen in deze browser voor je Home Assistant-account. Het wordt opnieuw gecontroleerd wanneer je terugkomt; er veranderen geen labels of YAML vóór 'Toepassen'.",
    savedDraftRestored: "{count} openstaande wijziging(en) gevonden en opnieuw gecontroleerd. Controleer de Preview voordat je toepast.",
    savedDraftRestoredDetail: "Opgeslagen voorstel gevonden en opnieuw gecontroleerd: {count} wijziging(en) ({added} toegevoegd, {removed} verwijderd, {modified} gewijzigd). Controleer de Preview voordat je toepast.",
    savedDraftBlocked: "Opgeslagen concept behouden maar niet toepasbaar: de configuratie, entiteiten of beveiligingen zijn gewijzigd. Er is geen schrijfactie toegestaan. Bekijk de situatie en kies daarna 'Annuleren' om opnieuw te beginnen vanuit de huidige staat.",
    savedDraftStorageUnavailable: "De browser kon dit voorstel niet opslaan. Het kan verloren gaan als je HVLS verlaat. Pas het nu toe of annuleer het.",
    backupAlreadyStaged: "Deze back-up is al voorbereid in de Preview.",
    backupReplaceRestoreConfirm: "Er staat al een herstel klaar in de Preview. Dat annuleren en in plaats daarvan deze back-up voorbereiden? Als je nee antwoordt, verandert er niets.",
    backupReplaceProposalConfirm: "Er staat een niet-toegepast labelvoorstel klaar in de Preview. Dat annuleren en in plaats daarvan deze back-up voorbereiden? Als je nee antwoordt, verandert er niets.",
    backupReplaceKept: "Niets gewijzigd: het openstaande voorstel blijft in de Preview.",
    pendingDraftProtect: "Er is nog een niet-toegepast voorstel. Controleer het in de Preview en pas het toe of annuleer het voordat je vernieuwt of een andere bewerking start.",
    manualLabelApply: "Labelwijzigingen toepassen",
    manualLabelConfirm: "De gecontroleerde labelwijzigingen en YAML toepassen? Als er een productiebestand bestaat, wordt een veiligheidsback-up gemaakt.",
    manualLabelApplied: "Wijzigingen toegepast: {added} label(s) toegevoegd, {removed} verwijderd. YAML en labels gecontroleerd.",
    manualLabelFailed: "Voorbereiding van de Preview geweigerd: {error}. Labels en YAML ongewijzigd.",
    manualLabelApplyFailed: "Toepassen geweigerd of onvolledig: {error}. Controleer de productie en de afstemmingsbeveiligingen.",
    backupLabelAdd: "Toe te voegen labels",
    backupLabelRemove: "Te verwijderen labels",
    backupLabelReview: "Te controleren entiteiten",
    backupConfirm: "Deze YAML in productie herstellen? Er wordt altijd een veiligheidskopie van het huidige productiebestand gemaakt. HA-labels worden niet gewijzigd.",
    backupRestoreFailed: "Herstel geweigerd: {error}",
    backupRestored: "Herstel voltooid. Veiligheidsback-up: {backup}",
    backupRestorePendingRemoval: "Let op: {count} entiteiten uit de herstelde productie-YAML ontbreken in de Preview: {entities}. De volgende toepassing zou ze opnieuw verwijderen. HA-labels zijn niet hersteld; herstel ze als je deze entiteiten wilt behouden.",
    backupRestorePendingOther: "Na het herstel stelt de Preview nog {added} toevoegingen, {removed} verwijderingen en {modified} wijzigingen voor. HA-labels zijn niet hersteld. Controleer de wijzigingen voordat je iets toepast.",
    backupRestoreNotVerified: "De productie-YAML is hersteld, maar de bijgewerkte vergelijking met de Preview kon niet worden gecontroleerd. Vernieuw de Preview en controleer de verschillen voordat je iets toepast.",
    backupRestoreAligned: "De herstelde YAML en de Preview hebben per entiteit dezelfde configuratie. HA-labels zijn niet hersteld.",
    restoreReconcileTitle: "HVLS-herstel afronden",
    restoreReconcileSummary: "De herstelde YAML is beveiligd. HVLS kan de productie niet herschrijven totdat je beslist hoe de verschillen met de Home Assistant-labels worden opgelost.",
    restoreReconcilePending: "Het herstel blijft beveiligd, ook na een herstart. Rond het af in de Preview voordat je opnieuw toepast.",
    restoreReconcileAddLabels: "Labels van herstelde entiteiten herstellen",
    restoreReconcileAligned: "Overeenkomende configuratie bevestigen en herstel afronden",
    restoreReconcileKeepCurrent: "Huidige labels behouden (afzonderlijke toepassing)",
    restoreReconcileAddConfirm: "HVLS-labels van {count} herstelde entiteiten herstellen?\n{entities}\n\nGeen toepassing of wijziging van de productie-YAML.",
    restoreReconcileKeepConfirm: "Je hebt de huidige HA-labels gekozen. Verschillen met de herstelde YAML: {added} toevoegingen, {removed} verwijderingen, {modified} wijzigingen. Een latere toepassing kan de herstelde configuratie vervangen. De back-up blijft beschikbaar. Alleen een afzonderlijke toepassing ontgrendelen (zonder deze uit te voeren)?",
    restoreReconcileAlignedConfirm: "De Preview komt nu overeen met de entiteiten van de herstelde YAML. De herstelbeveiliging beëindigen zonder de productie te wijzigen of iets toe te passen?",
    restoreReconcileCannotAdd: "De labels van al deze entiteiten kunnen niet veilig worden hersteld (ontbrekend of niet in aanmerking). Bekijk ze in HVLS-entiteitenbeheer.",
    restoreReconcileAfterLabels: "De labels zijn hersteld, maar de Preview wijkt nog af van de herstelde YAML. 'Toepassen' blijft geblokkeerd. Controleer de aanpassingen.",
    restoreReconcileResolved: "Herstel afgestemd. Productie-YAML ongewijzigd; er is niets toegepast.",
    restoreReconcileError: "Afstemming geweigerd of onvolledig. Schrijfacties blijven beveiligd. Vernieuw en controleer de verschillen.",
    restoreReconcileWorking: "Labels afstemmen en status controleren…",
    restoreReconcileDiff: "Verschillen Preview / herstelde productie: {added} toegevoegd, {removed} verwijderd, {modified} gewijzigd.",
    restoreReconcileCancelFailed: "Onderbroken herstel annuleren",
    restoreReconcileCancelFailedConfirm: "Het herstel is gestopt voordat de productie-YAML werd gewijzigd. De oorspronkelijke staat van het bestand is gecontroleerd. De herstelbeveiliging verwijderen zonder labels of YAML te wijzigen?",
    restoreReconcileUncertain: "De status van de YAML na de onderbreking kon niet worden gecontroleerd. Geen automatische ontgrendeling; controleer back-ups en eigendom.",
    backupNoDiff: "De YAML komt overeen met de productie.",
    backupTextOnlyDiff: "Geen verschillen per entiteit. Alleen de YAML-tekst verschilt (bijvoorbeeld opmerkingen, volgorde of opmaak). Herstellen zou de tekst van het productiebestand vervangen na een veiligheidsback-up.",
    backupRestoreTextOnly: "YAML-tekstverschillen tonen in de Preview",
    backupConfirmTextOnly: "De entiteitsconfiguraties zijn identiek, maar de YAML-tekst verschilt. De exacte tekst van de back-up in productie herstellen? Er wordt altijd een veiligheidskopie van de huidige productie gemaakt. HA-labels worden niet gewijzigd.",
    backupDiffTitle: "Wijzigingen als deze back-up wordt hersteld",
    backupSize: "{size} bytes",
    backupEntities: "{count} entiteiten",
    backupRestartHint: "Het YAML-bestand is op schijf hersteld. Start Home Assistant opnieuw zodat Google Assistant de configuratie opnieuw laadt.",
    refreshEntities: "Entiteiten vernieuwen",
    loadingEntities: "Entiteiten laden…",
    searchPlaceholder: "Zoeken op naam, entiteit-ID of ruimte…",
    searchLabel: "Entiteiten zoeken",
    filterLabel: "Entiteiten filteren",
    filterAll: "Alle entiteiten",
    filterWith: "Met HVLS",
    filterWithout: "Zonder HVLS",
    filterEligibleWithout: "Zonder HVLS — in aanmerking",
    assistantReportIssue: "Een probleem melden op GitHub",
    filterIneligible: "Niet in aanmerking",
    actionAdd: "TOEVOEGEN",
    actionRemove: "VERWIJDEREN",
    confirmLabel: "HVLS-label {action}?",
    otherLabelsPreserved: "Alle andere labels blijven behouden.",
    ineligibleWarning: "Let op: deze entiteit komt momenteel niet in aanmerking.",
    updateFailed: "Bijwerken van het HVLS-label geweigerd voor {entity}:",
    reloadFailed: "Het label is in HA bijgewerkt, maar de entiteitencatalogus kon niet opnieuw worden geladen. Gebruik 'Entiteiten vernieuwen'.",
    domainsSupported: "Domeinen ondersteund door HVLS",
    domainsUnsupported: "Niet-ondersteunde domeinen",
    domainCount: "{count} domeinen · {entities} entiteiten",
    entitiesCount: "{count} entiteiten",
    catalogStatus: "{matching} overeenkomende entiteiten · {labeled} gelabeld van {total} · Label: {label}",
    noMatches: "Geen entiteiten komen overeen met de filters.",
    noArea: "Geen ruimte",
    withoutHVLS: "— Geen HVLS-label",
    unknownHVLS: "HVLS · status onbekend",
    ineligibleState: "Niet in aanmerking",
    notEligible: "Deze entiteit voldoet niet aan de selectieregels van HVLS.",
    exclusionIntro: "Uitgesloten van de Google Assistant-configuratie die HVLS genereert:",
    reasonDomain: "het domein wordt niet ondersteund door HVLS.",
    reasonClass: "de klasse (sensor, binaire sensor of gebeurtenis) wordt niet ondersteund door HVLS.",
    reasonDisabled: "ze is uitgeschakeld in Home Assistant.",
    reasonHidden: "ze is verborgen in Home Assistant.",
    reasonCategory: "het is een configuratie- of diagnose-entiteit.",
    exclusionHelp: "Waarom deze entiteit is uitgesloten",
    exclusionFootnote: "Ze blijft in Home Assistant. HVLS selecteert haar niet voor Google Assistant.",
    moreDomain: "Nog 100 tonen ({shown}/{total})",
    moreEntities: "Nog 100 entiteiten tonen",
    excludedTitle: "Uitgesloten entiteiten ({count})",
    excludedExplanation: "Entiteiten met het HVLS-label die niet voldoen aan de huidige selectieregels.",
    excludedEmpty: "Er zijn geen gelabelde entiteiten uitgesloten.",
    excludedNote: "De diagnose gebruikt de huidige registers. De getoonde YAML komt uit de laatst gegenereerde Preview.",
    unknownReason: "Onbekende reden",
    reasonFilterTitle: "Redenen waarom niet in aanmerking",
    reasonFilterAll: "Alles selecteren",
    reasonFilterOnly: "alleen",
    reasonFilterOnlyAria: "Alleen tonen: {reason}",
    reasonFilterNone: "Geen reden geselecteerd. Selecteer minstens één reden om entiteiten te tonen.",
    reasonShort_domain_not_enabled: "Niet-ondersteund domein",
    reasonShort_unsupported_device_class: "Niet-ondersteunde klasse",
    reasonShort_disabled: "Uitgeschakeld",
    reasonShort_hidden: "Verborgen",
    reasonShort_entity_category: "Configuratie / diagnose",
    reasonShort_other: "Onbekende reden",
    reasonDetailDomain: "domein: {domain}",
    reasonDetailClass: "klasse: {deviceClass}",
    reasonDetailNoClass: "klasse: geen",
    reasonDetailConfig: "categorie: configuratie",
    reasonDetailDiagnostic: "categorie: diagnose",
    reasonCategoryFull: "Configuratie- of diagnose-entiteit",
    metricEntities: "Entiteiten in productie",
    productionStatsUnavailable: "Productiestatistieken niet beschikbaar: bestand ontbreekt, is onleesbaar of ongeldig.",
    initialLabelsDetected: "{count} entiteiten met het HVLS-label gevonden in Home Assistant. Je kunt de eerste YAML maken op basis van deze selectie.",
    initialLabelsPreview: "Eerste Preview voorbereiden ({count} entiteiten)",
    initialPendingPreview: "Openstaande Preview controleren ({count} wijziging(en))",
    initialYamlPreview: "Eerste configuratie: {count} entiteiten voorgesteld op basis van de huidige HA-labels. De YAML wordt pas na goedkeuring aangemaakt.",
    productionRemoval: "Verwijdering openstaand in de Preview: de entiteit staat nog in productie",
    metricRooms: "Ruimtes",
    byDomain: "Per domein",
    byArea: "Per ruimte",
    disabledDomains: "Domeinen uitgesloten van de HVLS-selectie",
    noDisabledDomains: "Geen uitgeschakelde domeinen gevonden.",
    labeledOnly: "Alleen entiteiten met het HVLS-label.",
    comparisonTitle: "Verschillen Preview / productie",
    pendingChanges: "{count} wijziging(en) te controleren voordat je toepast",
    pendingAction: "Preview openen",
    productionValidated: "Al aanwezig in de productie-YAML",
    productionPending: "Toevoeging aan de productie-YAML openstaand",
    productionModified: "Aanwezig in productie, wijzigingen openstaand",
    productionUnknown: "Productiestatus onbekend: vernieuw de Preview",
    comparisonMissing: "Kan niet vergelijken: het productiebestand ontbreekt.",
    comparisonFailed: "Kan niet vergelijken ({status}): {reason}",
    unreadableFile: "onleesbaar bestand",
    added: "Toegevoegd",
    removed: "Verwijderd",
    modified: "Gewijzigd",
    unchanged: "Ongewijzigd",
    identicalYaml: "✓ Geen verschillen: de YAML komt overeen met de productie.",
    identicalEntities: "✓ Zelfde configuratie per entiteit (alleen verschillen in YAML-opmaak).",
    entitiesAdded: "Toegevoegde entiteiten",
    entitiesRemoved: "Verwijderde entiteiten",
    removalReasonProposal: "Reden: HVLS-label verwijderd in dit voorstel.",
    removalReasonBackup: "Reden: vandaag blootgesteld, maar niet aanwezig in de back-up.",
    removalReasonNoLabel: "Reden: heeft het HVLS-label niet meer in Home Assistant.",
    removalReasonMissing: "Reden: bestaat niet meer in Home Assistant.",
    removalReasonIneligible: "Reden: {detail}",
    entitiesModified: "Gewijzigde entiteiten",
    previewLoading: "Preview laden…",
    previewMissing: "Geen Preview beschikbaar. Genereer er eerst een.",
    previewReady: "Preview: {path} — Productie: {production}",
    previewLoadFailed: "Kan Preview niet laden: {error}",
    previewGenerating: "Preview genereren…",
    previewGenerated: "Preview gegenereerd: {count} entiteiten. Controleer de verschillen voordat je toepast.",
    previewGenerateFailed: "Genereren van de Preview mislukt: {error}",
    applyInfoLabel: "Waarom is 'Toepassen' uitgeschakeld?",
    cancelPreview: "Annuleren",
    previewCancelled: "Preview geannuleerd: er is niets gewijzigd.",
    backupIgnoreUpdating: "Preview herberekenen met uitsluitingen…",
    backupIgnoreFailed: "Kan Preview niet herberekenen: {error}. YAML en labels ongewijzigd.",
    backupIgnoreSelected: "Keuzes opgeslagen: {count} genegeerde entiteit(en), {refreshed} hersteld met huidige naam en ruimte. Geen bestand of label gewijzigd.",
    restoreBlockerField: "{field}: back-up \"{before}\" → Home Assistant vandaag \"{after}\"",
    restoreFieldName: "naam",
    restoreFieldRoom: "ruimte",
    restoreValueAbsent: "(geen)",
    planCol_out: "Niet hersteld ({count})",
    planCol_current: "Naam of ruimte gewijzigd ({count})",
    planCol_result: "Resultaat voor Google ({count})",
    planSub_out: "Voor deze entiteiten verandert er niets.",
    planSub_current: "Hersteld met de huidige Home Assistant-waarden.",
    planSub_result: "Wat er werkelijk wordt geschreven.",
    planHelpLabel: "Help",
    planHelp_out: "Entiteiten uit de back-up die niet worden teruggezet. 'Onmogelijk': ze bestaan niet meer, komen niet meer in aanmerking of hebben opties die HVLS niet genereert. Voor de andere heb je gekozen ze niet te herstellen: hun huidige staat verandert niet.",
    planHelp_current: "Deze entiteiten zijn sinds de back-up hernoemd of verplaatst in Home Assistant. Ze worden hersteld met de naam en ruimte van vandaag, niet die uit de back-up. 'Intrekken' verplaatst ze naar 'Niet hersteld'.",
    planHelp_result: "De exacte lijst van entiteiten die na het herstel aan Google worden blootgesteld. 'Toegevoegd': vandaag niet blootgesteld. 'Al blootgesteld': geen wijziging. In rood: vandaag blootgesteld maar niet in de back-up; wordt verwijderd tenzij je de entiteit behoudt.",
    planSumRestored: "Hersteld uit de back-up",
    planSumExposed: "Blootgesteld na herstel",
    planSumAdded: "Toegevoegd door de back-up",
    planSumAlready: "Vandaag al blootgesteld",
    planSumRemoved: "Niet langer blootgesteld",
    planNotReady: "Sommige entiteiten moeten nog worden opgelost voordat dit herstel kan worden toegepast.",
    planActionRestore: "Herstellen →",
    planActionWithdraw: "← Intrekken",
    planActionKeep: "Behouden",
    planActionSkip: "Niet herstellen",
    planTagPending: "op te lossen",
    planTagLocked: "onmogelijk",
    planTagRemoved: "verwijderd",
    planTagKept: "behouden",
    planTagCurrent: "huidige naam/ruimte",
    planTagAdded: "toegevoegd",
    planTagAlready: "al blootgesteld",
    planKeepQuestion: "{count} vandaag blootgestelde entiteit(en) ontbreken in de back-up. Behouden?",
    planKeepAll: "Alles behouden",
    planRemoveAll: "Alles verwijderen",
    planRecommended: "↺ Terug naar de aanbeveling",
    planEmpty: "Geen",
    planReasonMissing: "ontbreekt in Home Assistant",
    planReasonNotExposed: "niet blootgesteld in de back-up",
    planReasonIneligible: "komt niet in aanmerking ({reason})",
    planReasonOptions: "niet reproduceerbare opties: {fields}",
    planReasonConflict: "niet reproduceerbaar verschil",
    planReasonRemoved: "vandaag blootgesteld, niet in de back-up",
    planReasonNoLabel: "vandaag blootgesteld, maar heeft het HVLS-label niet meer in Home Assistant",
    planTechDetails: "Technische details: Home Assistant-labels",
    planConfirmSummary: "Na herstel: {exposed} entiteit(en) blootgesteld aan Google ({added} toegevoegd, {already} al blootgesteld).",
    planConfirmRemoved: "Niet langer blootgesteld ({count}): {entities}.",
    planConfirmCurrent: "Met huidige naam en ruimte ({count}): {entities}.",
    planConfirmOut: "Niet hersteld ({count}): {entities}.",
    applyNoChanges: "Geen wijzigingen om toe te passen: de Preview komt al overeen met de productie.",
    applyReasonMissingIdentity: "De identiteit van de HVLS-installatie is niet beschikbaar.",
    applyReasonUnsafePath: "Het uitvoer- of registerpad is onveilig. Controleer op symbolische koppelingen.",
    applyReasonReservedPath: "Het uitvoerpad conflicteert met gereserveerde HVLS-metadata.",
    applyReasonRegistryInvalid: "Het HVLS-eigendomsregister is ongeldig of onleesbaar. Controle is vereist.",
    applyReasonOtherInstallation: "Dit bestand hoort bij een andere HVLS-installatie. Schrijven is verboden.",
    applyReasonUnmanagedOutput: "Een bestaand YAML-bestand is niet gecontroleerd als eigendom van HVLS. Het blijft beveiligd.",
    applyUnmanagedAssistantHint: "De Assistent kan dit bestand alleen-lezen inspecteren. Inspectie schakelt 'Toepassen' niet automatisch in.",
    applyUnmanagedAssistantAction: "Inspecteren in de Assistent",
    applyReasonMissingDirectory: "De uitvoermap is niet beschikbaar.",
    applyReasonVerificationFailed: "Veiligheidscontrole van het bestand mislukt. 'Toepassen' blijft uitgeschakeld.",
    applyReasonOutputPathMismatch: "Het uitvoerpad komt niet meer overeen met het pad dat HVLS heeft geregistreerd.",
    applyReasonPendingOperation: "Een HVLS-bewerking is onvolledig. Een gecontroleerd herstel is nodig vóór 'Toepassen'.",
    applyReasonManagedOutputMissing: "Het uitvoerbestand dat eerder door HVLS werd beheerd, ontbreekt.",
    missingRebuildAction: "Ontbrekende YAML opnieuw opbouwen",
    missingRebuildReview: "De YAML die eerder door HVLS werd beheerd, ontbreekt. {count} entiteiten kunnen opnieuw worden opgebouwd op basis van de huidige HA-labels. Controleer de YAML voordat je bevestigt.",
    missingRebuildConfirm: "Het HVLS-productiebestand ontbreekt. Opnieuw aanmaken op basis van de gecontroleerde Preview en de huidige HA-labels? Er worden geen labels gewijzigd en bestaande back-ups blijven behouden. Als het bestand weer verschijnt, wordt deze bewerking geweigerd.",
    missingRebuildApplied: "YAML opnieuw opgebouwd: {path} — {bytes} bytes geschreven. HA-labels ongewijzigd.",
    missingRebuildBackups: "Back-ups bekijken",
    missingRebuildDetected: "Het HVLS-productiebestand ontbreekt. Je kunt een back-up herstellen of het opnieuw opbouwen op basis van {count} in HA gelabelde entiteiten, na controle van de Preview.",
    applyReasonOutputChanged: "Het door HVLS beheerde bestand is gewijzigd sinds de laatste SHA-256-controle.",
    applyReasonNotConfigured: "HVLS is nog niet geconfigureerd.",
    applyVerificationUnavailable: "Kan 'Toepassen' niet valideren: ontbrekende of inconsistente beveiligingsinformatie. Vernieuw de Preview.",
    bulkRemovalWarning: "LET OP: {removed} van de {before} entiteiten worden uit de productie-YAML verwijderd (na toepassen: {after}). Controleer de rode verwijderingen voordat je verdergaat.",
    emptySelectionConfirm: "Hiermee wordt de laatste HVLS-entiteit verwijderd: er blijven geen entiteiten blootgesteld in de YAML. Verwijderen van alle entiteiten bevestigen?",
    bulkRemovalConfirm: "GROTE VERWIJDERING: {removed} van de {before} entiteiten worden uit de productie-YAML verwijderd (nieuw totaal: {after}). Deze bewerking kan ook HA-labels verwijderen. Bevestig je deze verwijderingen expliciet?",
    applyConfirm: "Deze Preview toepassen op de Google Assistant-configuratie?",
    applyWarning: "Van het huidige bestand wordt een back-up gemaakt als back-ups zijn ingeschakeld. De bewerking wordt geweigerd als er sinds je controle wijzigingen zijn gedetecteerd.",
    previewApplying: "Preview valideren en toepassen…",
    previewApplied: "Preview toegepast: {path} — {bytes} bytes geschreven{backup}",
    backupCreated: "Back-up: {path}",
    previewApplyFailed: "Toepassen geweigerd: {error}. Vernieuw de Preview voordat je het opnieuw probeert.",
    noYaml: "Geen YAML om te kopiëren.",
    copyUnsupported: "Kopiëren via de browser mislukt.",
    yamlCopied: "YAML gekopieerd — {path}",
    copyFailed: "Kan niet kopiëren: {error}",
    registriesLoading: "HA-registers laden…",
    entitiesLoadFailed: "Kan entiteiten niet laden: {error}",
    inconsistentRegistry: "Inconsistent antwoord van het HA-register",
    waitingHA: "Wachten op Home Assistant…",
    tabsLabel: "HVLS-secties",
    rawDiffSummary: "Gedetailleerde YAML-diff",
    hvlsLabelAria: "HVLS-label: {entity}",
    entityMoreInfo: "Details van {entity} tonen in Home Assistant",
    catalogWarning: "Waarschuwing: {warnings}",
    absentValue: "(afwezig)",
    showPreviewYaml: "YAML van de Preview tonen",
    changesProposed: "Voorgestelde Google Assistant-wijzigingen",
    recoveryDiffTitle: "Verschillen tussen oude en nieuwe YAML",
    recoveryDiffSummary: "Oud bestand: {before} entiteiten → Voorgesteld nieuw bestand: {after} entiteiten.",
    changesIntro: "Controleer de verschillen voordat je de configuratie toepast.",
    noChanges: "Geen entiteitswijzigingen om toe te passen.",
    removalNote: "Een entiteit hier verwijderen, verwijdert haar niet uit Home Assistant: alleen haar Google Assistant-configuratie verandert.",
    firstProduction: "Geen bestaande productieconfiguratie: verschillen met een eerder bestand kunnen niet worden berekend.",
    fieldBefore: "Vóór",
    fieldAfter: "Na",
    fileIssue_invalid_entity_file_path: "ongeldig pad",
    fileIssue_sensitive_file_reference: "gevoelig bestand",
    fileIssue_symlink_entity_file_not_allowed: "symbolische koppeling verboden",
    fileIssue_include_missing: "bestand niet gevonden",
    fileIssue_yaml_syntax_error: "ongeldige YAML",
    fileIssue_duplicate_mapping_key: "dubbele YAML-sleutel",
    fileIssue_yaml_file_too_large: "bestand te groot",
    fileIssue_expected_mapping: "ongeldige YAML-structuur",
    fileIssue_unreadable_yaml_file: "onleesbaar bestand",
    fileIssue_entity_file_unavailable: "bestand niet beschikbaar",
    fileIssue_invalid_entity_id: "ongeldige entiteit-ID",
    fileIssue_invalid_entity_options: "ongeldige entiteitsopties",
    fileIssue_invalid_expose_value: "ongeldige expose-waarde",
    fileIssue_invalid_room_option: "ongeldige room-optie",
    fileIssue_invalid_name_option: "ongeldige name-optie",
    fileIssue_invalid_aliases_option: "ongeldige aliases-optie",
    fileIssue_unhandled_entity_option: "niet-ondersteunde optie",
    fileIssueUnknown: "onbekend probleem",
    fileIssueLine: "regel",
  },
  en: {
    generate: "Generate Preview",
    refresh: "Refresh all data",
    copy: "Copy YAML",
    apply: "Apply Preview",
    settings: "Settings",
    menu: "Open Home Assistant menu",
    tabStats: "Statistics",
    tabExclusions: "Excluded entities",
    tabEntities: "HVLS Entity Management",
    tabPreview: "Preview",
    tabBackups: "Backups",
    tabMigration: "Assistant",
    migrationIntro: "HVLS generates your entity YAML from Home Assistant labels. Managing labels does not require a Google Assistant connection. Inspection is read-only; label updates and Apply require explicit confirmation.",
    migrationGuideTitle: "Let's identify your situation",
    migrationGuideStepIdentify: "Step 1 — Identify your situation",
    migrationGuideStepVerify: "Step 2 of 2 — Review the recommended checks",
    assistantProvenanceStepVerify: "Inspect the YAML file you want to reuse",
    migrationManagedNotice: "HVLS now manages the production entity file. Use Preview for changes. Earlier diagnostics remain available under advanced tools.",
    migrationGuideDetected: "No google_assistant: declaration detected. This does not prevent HVLS from managing and generating an entity YAML file.",
    migrationGuideCandidate: "A google_assistant_entities.yaml file exists. You can reuse it to initialize HVLS labels, even without a Google Assistant connection.",
    migrationGuideNoCandidate: "No usual google_assistant_entities.yaml file was detected. Other sources may still exist.",
    migrationGuideQuestion: "How would you like to start using HVLS?",
    migrationGuideNew: "Select my entities in HA",
    migrationGuideExisting: "Reuse an existing entity file",
    migrationGuideUnsure: "Choose another file",
    migrationGuideNextNew: "Select entities under Manage HVLS entities. Existing labels remain unchanged. Preview approval is still required before any write.",
    migrationGuideNextExisting: "Inspect the entity file, then review the labels to import. No Google Assistant connection is needed.",
    migrationGuideNextUnsure: "Enter the relative path of the YAML file to reuse, then inspect it.",
    migrationGuideAwaitChoice: "Choose whether to reuse this file, select another file or start fresh.",
    migrationGuideNoAuthorization: "This choice stays on this screen; it neither approves migration nor permits writes.",
    assistantSourceFound: "Google Assistant configuration detected",
    assistantSourceSummary: "{entries} explicit entity declarations. Inspected files: {paths}. No Google Home exposure certified.",
    assistantPackagesDetected: "Packages configuration detected: classified as « Other configuration », not automatically inspected.",
    assistantPackagesQuestion: "Enter the entity YAML file path to inspect manually.",
    assistantFileHelp: "ⓘ Show YAML syntax examples",
    assistantGoogleConnectionHint: "No Google Assistant connection detected in the inspected configuration. Review the examples below to check configuration.yaml. HVLS can still manage entities without this connection.",
    assistantExampleDirect: "In configuration.yaml:",
    assistantExampleProjectId: "YOUR_PROJECT_ID",
    assistantExampleInclude: "Alternative with an included file in configuration.yaml:",
    assistantExampleIncludedContent: "In google_assistant.yaml:",
    assistantExampleNote: "Replace project_id with your Google project and SERVICE_ACCOUNT.json with your service-account file (never display its contents). project_id and service_account are required for manual setup; report_state is optional. Review active settings before changing them: these examples do not establish a working Google Home connection. secure_devices_pin (optional, uncomment it) is the code you say to unlock a lock, disarm an alarm or open a door or gate; keep it in secrets.yaml, in quotes (for example google_secure_pin: \"1234\").",
    assistantFileTitle: "Entity file",
    assistantFileCandidate: "Suggested detected file; you can edit this path.",
    assistantFileManual: "Enter the path to the entity YAML file.",
    assistantFilePathLabel: "Path relative to the Home Assistant configuration folder",
    assistantFilePlaceholder: "google_assistant_entities.yaml",
    assistantFileCheck: "Inspect file (read-only)",
    assistantFileChecking: "Read-only inspection…",
    assistantFileNotChecked: "No file inspected yet.",
    assistantFileChecked: "{entries} declared entity/ies · {anomalies} local structural issue(s) detected.",
    assistantFileIssues: "Review: {issues}. Correct if necessary, then recheck.",
    assistantFileNoIssues: "No structural issues found. This does not guarantee active configuration or Google Home exposure.",
    assistantFileCannotRead: "Unable to inspect the file: {reason}.",
    assistantFileUnavailable: "Inspection unavailable. No changes made.",
    assistantFileSafety: "Inspecting a file does not prove Google Home exposure. No labels or YAML are changed without a separate confirmed action.",
    migrationGuideSelectedExisting: "Reuse an existing file selected. You can change your choice.",
    migrationGuideSelectedNew: "Selected path: new configuration. You may change your choice below.",
    migrationGuideSelectedUnsure: "Choose another file selected. Enter its path below.",
    assistantFileMetricEntries: "Declared entities",
    assistantFileMetricTrue: "expose: true",
    assistantFileMetricFalse: "expose: false",
    assistantFileMetricUnset: "expose missing",
    assistantFileMetricIssues: "Entities to review",
    assistantFileUnreferencedConclusion: "This readable file can initialize HVLS labels. Missing Google Assistant linkage is a warning, not a blocker for entity management. The original file will be preserved.",
    assistantFilePackagesConclusion: "A readable file does not identify which configuration is used by packages. Packages remain classified as « Other configuration » and are not eligible for automatic migration.",
    assistantFileGeneralConclusion: "This check only analyzes the file contents; it does not establish global Google Assistant rules or effective Google Home exposure.",
    assistantFileUnsetExplanation: "An entry without expose is not treated as expose: true. Any exposure depends on other settings and is not established here.",
    assistantFileResultsTitle: "File inspection summary",
    assistantAdoptTitle: "Reuse entities in HVLS",
    assistantAdoptIntro: "Recover the previous YAML using entities currently available in HA. First back up and take ownership, then prepare the Preview. No changes without approval.",
    assistantAdoptNoCatalog: "Home Assistant entity catalog is not loaded. Refresh the comparison to continue.",
    assistantAdoptRefresh: "Refresh label comparison",
    assistantAdoptCounts: "{total} in old YAML · {recoverable} recoverable · {existingNew} more already labeled in HA · {nextTotal} proposed total · {missing} missing · {ineligible} ineligible · {review} to review.",
    assistantAdoptReview: "Entity details and suggested decisions",
    assistantAdoptReasonAdd: "Add HVLS label",
    assistantAdoptReasonAlready: "Already in HVLS",
    assistantAdoptReasonExclude: "Excluded (expose: false) — no addition",
    assistantAdoptReasonReview: "Requires manual review",
    assistantAdoptReviewYamlIssue: "YAML declaration issue",
    assistantAdoptReviewInvalidExposure: "Invalid expose directive",
    assistantAdoptReviewMissingEntity: "Entity absent from HA catalog",
    assistantAdoptReviewImplicitExposure: "Missing expose directive: intent unknown",
    assistantAdoptReviewUnknownLabel: "HVLS label status unknown",
    assistantAdoptReviewExcludedLabeled: "expose: false but HVLS label is present",
    assistantAdoptReviewIneligible: "Entity ineligible for generation",
    assistantAdoptReviewUnlabeledCustom: "No HVLS label; preserve YAML customizations",
    assistantAdoptCustomValuesUnverified: "YAML name, room or aliases not compared to generated values",
    assistantAdoptLimits: "Missing or ineligible entities will be removed from the new YAML only. Preview also shows changes to names, rooms and aliases: review these before approval.",
    assistantAdoptAction: "Prepare recovery Preview ({count} entities)",
    assistantAdoptNone: "No recoverable entities: cannot prepare a new YAML.",
    assistantTakeoverTitle: "Let HVLS manage the existing YAML",
    migrationChangeChoice: "Change setup method (optional)",
    importPreviewDanger: "WARNING: this ordinary Preview uses the current HA labels; it is NOT an import of the existing YAML. {count} of {total} entities would be removed from YAML. Do not Apply until you have completed the Assistant recovery.",
    importPreviewReturn: "Return to Assistant",
    assistantReinstallTitle: "Recover YAML management after reinstalling",
    assistantReinstallIntro: "The old configuration is analyzed against current HA entities. HVLS backs up the file before taking ownership. Review the changes in Preview afterward.",
    assistantReinstallAction: "Verify and recover management",
    assistantRecoveryTakeoverConfirm: "Previous YAML: {total} entities.\nRecoverable: {recoverable}.\nMissing in HA: {missing}.\nIneligible: {ineligible}.\n\nCreate a verified backup and let HVLS manage this file? No YAML or labels change at this step.",
    assistantRecoveryChangedNote: "Warning: the current file differs from the previous installation's recorded file. The backup protects the CURRENT file.\n\n",
    assistantRecoveryReady: "Management recovered after a verified backup. Now prepare the recovery Preview.",
    assistantRecoveryPreviewPrepared: "Recovery Preview prepared. Review YAML removals and modifications before applying.",
    assistantRecoveryPreviewFailed: "Preview preparation refused: {error}. No YAML or labels changed.",
    assistantRecoveryNotPrepared: "No recovery Preview prepared yet. Pending additions, removals and modifications: zero. Start from Assistant.",
    assistantRecoveryPreviewBack: "Open Assistant",
    assistantRecoveryApply: "Apply recovered configuration",
    assistantRecoveryApplyConfirm: "Apply the reviewed recovery? A mandatory backup of the current YAML will be made before updating labels and the file. Retired entities are removed from YAML only.",
    assistantRecoveryApplied: "Recovery complete: {count} entities in new YAML. Backup: {backup}.",
    assistantReinstallConfirm: "Transfer management of {path} to this HVLS installation?\n\nThe previous installation must be absent from Home Assistant. Both YAML and registry will be verified and a backup will be made. No automatic Apply or HA label changes.",
    assistantReinstallChangedConfirm: "WARNING: the current file is DIFFERENT from the one registered by the old installation.\n\nPrevious SHA-256: {oldSha}\nCurrent SHA-256: {newSha}\nCurrent entities: {entities}\nOrdinary Preview: {added} added, {removed} removed, {modified} changed.\n\nAuthorize ONLY a management takeover after a verified backup? No YAML or labels will be modified. DO NOT apply the ordinary Preview until the entities have been reconciled.",
    assistantReinstallChangedSuccess: "Management of the replaced YAML recovered with verified backup: {backup}. No entities or YAML changed. WARNING: ordinary Preview differs; do not apply it until entity reconciliation.",

    assistantTakeoverIntro: "Check recoverable entities. HVLS backs up the file and takes ownership. YAML is updated only after Preview approval.",
    assistantTakeoverAction: "Review and take over this file",
    assistantTakeoverConfirm: "Let HVLS manage {path}?\n\nCurrent entities: {entities} ({issues} to review).\nPreview differences: {added} added, {removed} removed, {modified} modified.\n\nA mandatory backup will be created. Production will NOT be edited and no Apply will run. This only authorizes future HVLS management.",
    assistantTakeoverSuccess: "HVLS now manages this YAML. Verified backup: {backup}. No Apply performed. Review Preview differences before applying.",
    assistantTakeoverFailure: "Takeover refused or incomplete: check the YAML, backups and ownership status, then refresh. No automatic Apply.",
    assistantTakeoverRegistrationFailed: "Backup created, but ownership was not transferred. Check the Home Assistant logs (HVLS recovery). Do not repeat the takeover before diagnosis.",
    assistantTakeoverBusy: "Verifying and backing up existing YAML…",
    assistantAdoptConfirm: "Add HVLS labels to {count} eligible entities? Neither the source YAML nor Google Assistant will be changed. Each addition is checked independently: if one fails, earlier successful additions remain and are reported.",
    assistantAdoptBusy: "Adding HVLS labels: {done} / {total}",
    assistantAdoptDone: "{count} label(s) added. Original YAML preserved; a new Preview was requested. Review it before applying.",
    assistantAdoptStopped: "{count} label addition(s) confirmed before interruption. Check the refreshed catalog: an unanswered operation might still have succeeded. No automatic retry.",
    assistantAdoptStale: "File or catalog changed since inspection. Recheck before preparing a Preview.",
    assistantAdoptNeedsReview: "Differences between old YAML and current HA appear in Preview. Missing and ineligible entities do not block the others.",
    assistantAdoptTruncated: "File contains too many entries for a complete reuse plan; no bulk label additions are suggested.",
    assistantProvenanceAdvanced: "ⓘ File origin and historical backup checks (optional)",
    assistantProvenanceStep: "File origin (optional)",
    assistantProvenanceQuestion: "As far as you know, where did this file come from?",
    assistantProvenanceOld: "It belonged to a previous Google Assistant configuration",
    assistantProvenanceUnknown: "I do not know its origin",
    assistantProvenanceNew: "It was prepared for a new configuration",
    assistantProvenanceVerifiedTitle: "What HVLS verified",
    assistantProvenanceVerified: "The YAML file was read and its declarations were counted. Nothing was changed.",
    assistantProvenanceAnomalies: "{count} entity/ies have local issues: other entries remain inspectable. Each issue needs review before deciding what to do with that entity.",
    assistantProvenanceMissingTitle: "What remains unverified",
    assistantProvenanceMissing: "No google_assistant: reference to this file was found in the analyzed configuration. Global exposure rules, the configuration actually loaded, and the device state in Google Home are not established.",
    assistantProvenanceNextTitle: "Recommended next check",
    assistantProvenanceNextOld: "Look for an older configuration.yaml backup and any included google_assistant.yaml. Check whether entity_config referenced this file and which expose_by_default and exposed_domains settings applied. Do not enable anything merely to check this.",
    assistantProvenanceNextUnknown: "Review Home Assistant backups and old Google Assistant files for an explicit reference to this file and its global rules. Until its origin is established, treat it as a clue, not a migration source.",
    assistantProvenanceNextNew: "This file might be used to prepare a new configuration, but it is not a verified migration. Return to the new-configuration path if that is your goal; do not automatically activate Google Assistant.",
    assistantProvenanceNextChoose: "Choose the file's origin above to see checks relevant to your situation.",
    assistantProvenanceSafety: "Your answer is local to this screen and is not saved. It does not certify previous exposure or Google Home state and does not unlock migration.",
    assistantProvenanceCategory: "Stated origin, not verified",
    assistantProvenanceSourceLabel: "Inspected file",
    assistantProvenanceChecklistTitle: "How do I find the original configuration?",
    assistantProvenanceChecklistTrigger: "ⓘ Practical guide: where to look in a backup",
    assistantProvenanceChecklistIntro: "These checks are manual and use a backup copy. HVLS does not search, extract or modify any backup during this step.",
    assistantProvenanceChecklist1: "Open a copy of an older Home Assistant backup without restoring it to your active installation.",
    assistantProvenanceChecklist2: "In configuration.yaml, look for a direct google_assistant: declaration or google_assistant: !include file.yaml.",
    assistantProvenanceChecklist3: "If a file is included, inspect it in the copy. Look for entity_config: !include ... and compare its reference with the inspected file.",
    assistantProvenanceChecklist4: "Record only relevant settings (expose_by_default, exposed_domains). Do not share secrets, keys or service accounts.",
    assistantProvenanceChecklistEnd: "A reference found in a backup is a possible historical configuration clue; it alone does not prove that Google Home actually exposed these entities.",
    assistantProvenanceSourceLabelUnknown: "No backup copy is automatically analyzed here.",
    assistantHistoryTitle: "Inspect a copy of an older configuration",
    assistantHistoryHow: "In your HA file editor, create hvls-history-review in the configuration folder. Put only copies of the older configuration.yaml and the YAML files it includes for Google Assistant there, preserving relative folders. Do not restore any archive or copy secrets.",
    assistantHistoryFolder: "Copy folder: hvls-history-review (beside configuration.yaml, never replacing it).",
    assistantHistoryAction: "Inspect historical copy (read-only)",
    assistantHistoryBusy: "Inspecting isolated copy…",
    assistantHistoryIdle: "No historical copy reviewed in this path yet.",
    assistantHistoryNoFolder: "hvls-history-review is missing. Create it manually and place only the YAML files to review inside.",
    assistantHistoryNoConfig: "configuration.yaml was not found inside hvls-history-review.",
    assistantHistoryBlocked: "Inspection refused: {reason}. Check the copy only; do not change active configuration.",
    assistantHistoryUnavailable: "Historical inspection unavailable. No files were modified.",
    assistantHistoryFound: "Historical declaration: {declaration}.",
    assistantHistoryDeclDirect: "directly in configuration.yaml",
    assistantHistoryDeclIncluded: "through a !include file",
    assistantHistoryDeclAbsent: "not found in the copy",
    assistantHistoryDeclUnknown: "not determined",
    assistantHistoryRules: "Historical global rule: expose_by_default = {defaultValue} ({origin}). exposed_domains: {domains}.",
    assistantHistoryRuleExplicit: "explicitly declared",
    assistantHistoryRuleImplicit: "parser-assumed default",
    assistantHistoryRuleUnknown: "not established",
    assistantHistoryDomainsNone: "field not declared",
    assistantHistoryDomainsEmpty: "explicitly empty list",
    assistantHistorySource: "entity_config source: {source}.",
    assistantHistorySourceInline: "entities declared inline",
    assistantHistorySourceAbsent: "no entity_config field",
    assistantHistorySourceUnknown: "unresolved",
    assistantHistoryCompare: "Reference to selected entity file: {pathStatus}. File contents: {contentStatus}.",
    assistantHistoryPathSame: "same relative path",
    assistantHistoryPathDifferent: "different relative path",
    assistantHistoryPathUnknown: "not determined",
    assistantHistoryContentIdentical: "matching checksums at inspection time",
    assistantHistoryContentDifferent: "different checksums",
    assistantHistoryContentUnknown: "not compared",
    assistantHistoryCounts: "{entries} declared entities in the copy; {anomalies} with structural issues.",
    assistantHistoryIssues: "Review needed: {issues}. Other entities remain inspectable.",
    assistantHistoryIssueHistoricalMissing: "included entity file missing from the copy",
    assistantHistoryIssueNoConfig: "no Google Assistant declaration in the copy",
    assistantHistoryIssueNoEntity: "no entity_config field in the copy",
    assistantHistoryIssueInline: "entities defined inline rather than in the selected file",
    assistantHistoryIssueCurrentUnavailable: "could not compare the currently selected entity file",
    assistantHistoryReasonUnsafe: "YAML reference outside or prohibited in isolated folder",
    assistantHistoryReasonPackages: "packages configuration unsupported",
    assistantHistoryReasonSyntax: "invalid YAML syntax, structure or duplicate key",
    assistantHistoryReasonSymlink: "symbolic link not allowed",
    assistantHistoryReasonTooLarge: "file too large",
    assistantHistoryReasonMissing: "included file missing",
    assistantHistoryReasonOther: "unsupported file or structure",
    assistantHistorySafety: "A matching path or checksum only matches inspected files. It does not prove historical use or actual Google Home exposure. No migration or write is authorized.",
    migrationAnalyze: "Analyze the configuration again (read-only)",
    migrationLoading: "Analyzing the Google Assistant configuration (read-only)…",
    migrationFailed: "Analysis unavailable: {error}",
    migrationStatus: "Review status",
    backupIntro: "Select a backup to prepare changes in Preview. No YAML or labels will be changed.",
    backupLoading: "Loading backups…",
    backupEmpty: "No backups available.",
    backupTypeAuto: "Automatic",
    backupTypeSafety: "Safety",
    backupTypeLegacy: "Legacy",
    backupHistorySummary: "{total} backups · {auto} automatic · {safety} safety · {legacy} legacy",
    backupShowOlder: "Show {count} older backups",
    backupShowRecent: "Show only the 10 most recent",
    backupCleanupPrepare: "Preview backup cleanup",
    backupCleanupReview: "Proposed cleanup: keep {keep} backups, delete {count} backups. No deletions performed.",
    backupCleanupNoop: "No backups selected for deletion.",
    backupCleanupPick: "Check the backups to delete; uncheck those to keep. The 10 newest are kept by default.",
    backupCleanupSelection: "{count} to delete · {kept} to keep",
    backupCleanupSelectionTitle: "Choose backups to delete",
    backupCleanupCheck: "Delete this backup",
    backupCleanupNone: "Uncheck all",
    backupCleanupReset: "Restore suggested selection",
    backupCleanupKeepOne: "Keep at least one backup.",
    backupCleanupDeleteCount: "Delete {count} selected backups",
    backupCleanupDeleteOne: "Delete the selected backup",
    backupCleanupConfirmButton: "Confirm cleanup",
    backupCleanupCancel: "Cancel cleanup",
    backupCleanupConfirm: "Permanently delete the {count} listed backups? The {keep} newest will be kept. This cannot be undone.",
    backupCleanupDone: "Cleanup complete: {count} backups deleted.",
    backupCleanupFailed: "Cleanup refused: {error}. Refresh the list and review again.",
    backupReviewing: "Comparing with production…",
    backupMissingReview: "Production is missing. Selected backup: {count} entities. You can prepare it in Preview, then review entities and HA labels before confirming.",
    backupMissingPreview: "Production is missing. This backup proposes {count} entities. Resolve differences with current HA labels before rebuilding the YAML.",
    backupMissingNoSafety: "None (production file was missing)",
    backupReviewFailed: "Cannot compare: {error}",
    backupLoadFailed: "Cannot load backups: {error}",
    backupRestore: "Prepare this backup in Preview",
    backupPreviewPrepared: "Restoration ready. When applied: {added} added, {removed} removed, {modified} modified. Nothing is written to the YAML or labels until you select \"Apply this restoration\".",
    backupPreviewNotExecutable: "Restore Preview: review the changes and HA labels before validation.",
    backupPreviewApply: "Apply this restoration",
    backupPreviewConfirm: "Apply the reviewed backup? Production YAML and HA labels will be updated. A safety backup will be created.",
    backupPreviewApplying: "Applying reviewed restoration…",
    backupPreviewApplied: "Restore completed: {entities} entities, {added} labels added, {removed} removed. Safety backup: {backup}.",
    backupPreviewApplyFailed: "Restoration refused or incomplete: {error}. Check production and any reconciliation notice.",
    backupPreviewLabels: "Planned HA labels: {added} add, {removed} remove, {review} need review.",
    manualLabelPending: "Pending review",
    manualLabelPreparing: "Simulating labels and YAML without writing…",
    manualLabelPrepared: "{count} label change(s) prepared in Preview. No labels or YAML modified.",
    manualLabelHelp: "Proposal saved locally in this browser for your Home Assistant account. It will be rechecked on return; no label or YAML is changed before Apply.",
    savedDraftRestored: "{count} pending change(s) found and revalidated. Review the Preview before Apply.",
    savedDraftRestoredDetail: "Saved proposal found and revalidated: {count} change(s) ({added} added, {removed} removed, {modified} modified). Review the Preview before Apply.",
    savedDraftBlocked: "Saved draft retained but cannot be applied: the configuration, entities or safety guards have changed. No writes are allowed. Review the situation, then choose Cancel to start again from the current state.",
    savedDraftStorageUnavailable: "The browser could not save this proposal. It may disappear when leaving HVLS. Apply or cancel it now.",
    backupAlreadyStaged: "This backup is already prepared in Preview.",
    backupReplaceRestoreConfirm: "A restoration is already pending in Preview. Cancel it and prepare this backup instead? If you answer no, nothing changes.",
    backupReplaceProposalConfirm: "An unapplied label proposal is pending in Preview. Cancel it and prepare this backup instead? If you answer no, nothing changes.",
    backupReplaceKept: "Nothing changed: the pending proposal is kept in Preview.",
    pendingDraftProtect: "An unapplied proposal is still pending. Review it in Preview and apply or cancel it before refreshing or starting another operation.",
    manualLabelApply: "Apply label changes",
    manualLabelConfirm: "Apply the reviewed label changes and YAML? A safety backup will be made when production exists.",
    manualLabelApplied: "Changes applied: {added} label(s) added, {removed} removed. YAML and labels verified.",
    manualLabelFailed: "Preview preparation refused: {error}. No labels or YAML modified.",
    manualLabelApplyFailed: "Apply refused or incomplete: {error}. Check production and reconciliation protections.",
    backupLabelAdd: "Labels to add",
    backupLabelRemove: "Labels to remove",
    backupLabelReview: "Entities requiring review",
    backupConfirm: "Restore this YAML to production? A safety copy of the current production file will always be created. HA labels will not be changed.",
    backupRestoreFailed: "Restore refused: {error}",
    backupRestored: "Restore completed. Safety backup: {backup}",
    backupRestorePendingRemoval: "Warning: {count} entities in the restored production YAML are missing from Preview: {entities}. The next Apply would remove them again. HA labels were not restored; restore those labels if you want to keep these entities.",
    backupRestorePendingOther: "After restoring, Preview still proposes {added} additions, {removed} removals and {modified} modifications. HA labels were not restored. Review changes before any Apply.",
    backupRestoreNotVerified: "Production YAML was restored, but its updated Preview comparison could not be verified. Refresh Preview and review differences before any Apply.",
    backupRestoreAligned: "The restored YAML and Preview have the same per-entity configuration. HA labels were not restored.",
    restoreReconcileTitle: "Complete the HVLS restoration",
    restoreReconcileSummary: "The restored YAML is protected. HVLS cannot rewrite production until you decide how to resolve its differences with Home Assistant labels.",
    restoreReconcilePending: "The restoration stays protected even after restart. Finish it in Preview before another Apply.",
    restoreReconcileAddLabels: "Restore labels for restored entities",
    restoreReconcileAligned: "Confirm matching configuration and finish restoration",
    restoreReconcileKeepCurrent: "Keep current labels (separate Apply)",
    restoreReconcileAddConfirm: "Restore HVLS labels to {count} restored entities?\n{entities}\n\nNo Apply or production YAML modification.",
    restoreReconcileKeepConfirm: "You chose the current HA labels. Differences from restored YAML: {added} additions, {removed} removals, {modified} modifications. A future Apply may replace the restored configuration. The backup remains available. Only unlock a separate Apply (without running it)?",
    restoreReconcileAlignedConfirm: "Preview now matches the restored YAML entities. End restore protection without changing production or performing Apply?",
    restoreReconcileCannotAdd: "Labels cannot safely be restored for all these entities (missing or ineligible). Inspect them in HVLS Entity Management.",
    restoreReconcileAfterLabels: "Labels were restored, but Preview still differs from restored YAML. Apply remains blocked. Check customizations.",
    restoreReconcileResolved: "Restoration reconciled. Production YAML unchanged; no Apply performed.",
    restoreReconcileError: "Reconciliation refused or incomplete. Writes remain protected. Refresh and review differences.",
    restoreReconcileWorking: "Reconciling labels and verifying state…",
    restoreReconcileDiff: "Preview / restored production differences: {added} added, {removed} removed, {modified} modified.",
    restoreReconcileCancelFailed: "Cancel interrupted restoration",
    restoreReconcileCancelFailedConfirm: "Restoration stopped before editing production YAML. Original file state was verified. Remove the restore protection without changing labels or YAML?",
    restoreReconcileUncertain: "YAML state could not be verified after interruption. No automatic unlock; inspect backups and ownership.",
    backupNoDiff: "YAML matches production.",
    backupTextOnlyDiff: "No per-entity differences. Only the YAML text differs (for example, comments, ordering or formatting). Restoring would replace the production file text, after a safety backup.",
    backupRestoreTextOnly: "Preview YAML text differences",
    backupConfirmTextOnly: "Entity configurations are identical but YAML text differs. Restore the backup's exact text to production? A safety copy of current production will always be created. HA labels will not be modified.",
    backupDiffTitle: "Changes if this backup is restored",
    backupSize: "{size} bytes",
    backupEntities: "{count} entities",
    backupRestartHint: "The YAML file has been restored on disk. Restart Home Assistant so Google Assistant reloads its configuration.",
    refreshEntities: "Refresh entities",
    loadingEntities: "Loading entities…",
    searchPlaceholder: "Search by name, entity ID or area…",
    searchLabel: "Search entities",
    filterLabel: "Filter entities",
    filterAll: "All entities",
    filterWith: "With HVLS",
    filterWithout: "Without HVLS",
    filterEligibleWithout: "Without HVLS — eligible",
    assistantReportIssue: "Report an issue on GitHub",
    filterIneligible: "Ineligible",
    actionAdd: "ADD",
    actionRemove: "REMOVE",
    confirmLabel: "{action} the HVLS label?",
    otherLabelsPreserved: "All other labels will be preserved.",
    ineligibleWarning: "Warning: this entity is currently not eligible.",
    updateFailed: "HVLS label update refused for {entity}:",
    reloadFailed: "The label was updated in HA, but the entity catalog could not be refreshed. Use 'Refresh entities'.",
    domainsSupported: "Domains supported by HVLS",
    domainsUnsupported: "Unsupported domains",
    domainCount: "{count} domains · {entities} entities",
    entitiesCount: "{count} entities",
    catalogStatus: "{matching} matching entities · {labeled} labeled out of {total} · Label: {label}",
    noMatches: "No entities match the filters.",
    noArea: "No area",
    withoutHVLS: "— No HVLS label",
    unknownHVLS: "HVLS · unknown status",
    ineligibleState: "Ineligible",
    notEligible: "This entity does not meet HVLS selection rules.",
    exclusionIntro: "Excluded from the Google Assistant configuration generated by HVLS:",
    reasonDomain: "its domain is not supported by HVLS.",
    reasonClass: "its class (sensor, binary sensor or event) is not supported by HVLS.",
    reasonDisabled: "it is disabled in Home Assistant.",
    reasonHidden: "it is hidden in Home Assistant.",
    reasonCategory: "it is a configuration or diagnostic entity.",
    exclusionHelp: "Why this entity is excluded",
    exclusionFootnote: "It remains in Home Assistant. HVLS does not select it for Google Assistant.",
    moreDomain: "Show 100 more ({shown}/{total})",
    moreEntities: "Show 100 more entities",
    excludedTitle: "Excluded entities ({count})",
    excludedExplanation: "Entities carrying the HVLS label that do not meet the current selection rules.",
    excludedEmpty: "No labeled entities are excluded.",
    excludedNote: "Diagnostics use the current registries. The displayed YAML comes from the last generated Preview.",
    unknownReason: "Unknown reason",
    reasonFilterTitle: "Ineligibility reasons",
    reasonFilterAll: "Select all",
    reasonFilterOnly: "only",
    reasonFilterOnlyAria: "Show only: {reason}",
    reasonFilterNone: "No reason selected. Select at least one reason to show entities.",
    reasonShort_domain_not_enabled: "Unsupported domain",
    reasonShort_unsupported_device_class: "Unsupported class",
    reasonShort_disabled: "Disabled",
    reasonShort_hidden: "Hidden",
    reasonShort_entity_category: "Configuration / diagnostic",
    reasonShort_other: "Unknown reason",
    reasonDetailDomain: "domain: {domain}",
    reasonDetailClass: "class: {deviceClass}",
    reasonDetailNoClass: "class: none",
    reasonDetailConfig: "category: configuration",
    reasonDetailDiagnostic: "category: diagnostic",
    reasonCategoryFull: "Configuration or diagnostic entity",
    metricEntities: "Production entities",
    productionStatsUnavailable: "Production statistics unavailable: file missing, unreadable or invalid.",
    initialLabelsDetected: "{count} HVLS-labeled entities found in Home Assistant. You can create the first YAML from this selection.",
    initialLabelsPreview: "Prepare initial Preview ({count} entities)",
    initialPendingPreview: "Review pending Preview ({count} change(s))",
    initialYamlPreview: "First configuration: {count} entities proposed from current HA labels. YAML will be created only after approval.",
    productionRemoval: "Pending removal in Preview: entity is still present in production",
    metricRooms: "Areas",
    byDomain: "By domain",
    byArea: "By area",
    disabledDomains: "Domains excluded from HVLS selection",
    noDisabledDomains: "No disabled domains detected.",
    labeledOnly: "Only HVLS-labeled entities.",
    comparisonTitle: "Preview / Production diff",
    pendingChanges: "{count} change(s) to review before applying",
    pendingAction: "Open Preview",
    productionValidated: "Already present in the production YAML",
    productionPending: "Pending addition to the production YAML",
    productionModified: "Present in production, pending changes",
    productionUnknown: "Production status unknown: refresh Preview",
    comparisonMissing: "Cannot compare: production file is missing.",
    comparisonFailed: "Cannot compare ({status}): {reason}",
    unreadableFile: "unreadable file",
    added: "Added",
    removed: "Removed",
    modified: "Modified",
    unchanged: "Unchanged",
    identicalYaml: "✓ No differences: YAML matches production.",
    identicalEntities: "✓ Same configuration per entity (YAML formatting differences only).",
    entitiesAdded: "Added entities",
    entitiesRemoved: "Removed entities",
    removalReasonProposal: "Reason: HVLS label removed in this proposal.",
    removalReasonBackup: "Reason: exposed today, but absent from the backup.",
    removalReasonNoLabel: "Reason: no longer has the HVLS label in Home Assistant.",
    removalReasonMissing: "Reason: no longer exists in Home Assistant.",
    removalReasonIneligible: "Reason: {detail}",
    entitiesModified: "Modified entities",
    previewLoading: "Loading Preview…",
    previewMissing: "No Preview available. Generate one first.",
    previewReady: "Preview: {path} — Production: {production}",
    previewLoadFailed: "Unable to load Preview: {error}",
    previewGenerating: "Generating Preview…",
    previewGenerated: "Preview generated: {count} entities. Review differences before applying.",
    previewGenerateFailed: "Failed to generate Preview: {error}",
    applyInfoLabel: "Why is Apply disabled?",
    cancelPreview: "Cancel",
    previewCancelled: "Preview canceled: nothing changed.",
    backupIgnoreUpdating: "Recalculating Preview with exclusions…",
    backupIgnoreFailed: "Unable to recalculate Preview: {error}. No YAML or labels changed.",
    backupIgnoreSelected: "Choices saved: {count} ignored entity(ies), {refreshed} restored with current name and room. No file or label changed.",
    restoreBlockerField: "{field}: backup \"{before}\" → Home Assistant today \"{after}\"",
    restoreFieldName: "name",
    restoreFieldRoom: "room",
    restoreValueAbsent: "(none)",
    planCol_out: "Not restored ({count})",
    planCol_current: "Name or room changed ({count})",
    planCol_result: "Result for Google ({count})",
    planSub_out: "Nothing changes for them.",
    planSub_current: "Restored with current Home Assistant values.",
    planSub_result: "What will actually be written.",
    planHelpLabel: "Help",
    planHelp_out: "Backup entities that will not be brought back. \"Impossible\": they no longer exist, are no longer eligible or have options HVLS does not generate. For the others, you chose not to restore them: their current state does not change.",
    planHelp_current: "These entities were renamed or moved in Home Assistant since the backup. They will be restored with today's name and room, not the backup ones. \"Withdraw\" moves them to \"Not restored\".",
    planHelp_result: "The exact list of entities exposed to Google after the restoration. \"Added\": not exposed today. \"Already exposed\": no change. In red: exposed today but absent from the backup; it will be removed unless you keep it.",
    planSumRestored: "Restored from the backup",
    planSumExposed: "Exposed after restoration",
    planSumAdded: "Added by the backup",
    planSumAlready: "Already exposed today",
    planSumRemoved: "No longer exposed",
    planNotReady: "Some entities still need to be resolved before this restoration can be applied.",
    planActionRestore: "Restore →",
    planActionWithdraw: "← Withdraw",
    planActionKeep: "Keep",
    planActionSkip: "Don't restore",
    planTagPending: "to resolve",
    planTagLocked: "impossible",
    planTagRemoved: "removed",
    planTagKept: "kept",
    planTagCurrent: "current name/room",
    planTagAdded: "added",
    planTagAlready: "already exposed",
    planKeepQuestion: "{count} entity(ies) exposed today are absent from the backup. Keep them?",
    planKeepAll: "Keep all",
    planRemoveAll: "Remove all",
    planRecommended: "↺ Back to the recommendation",
    planEmpty: "None",
    planReasonMissing: "missing from Home Assistant",
    planReasonNotExposed: "not exposed in the backup",
    planReasonIneligible: "not eligible ({reason})",
    planReasonOptions: "options that cannot be reproduced: {fields}",
    planReasonConflict: "difference that cannot be reproduced",
    planReasonRemoved: "exposed today, absent from the backup",
    planReasonNoLabel: "exposed today, but no longer has the HVLS label in Home Assistant",
    planTechDetails: "Technical details: Home Assistant labels",
    planConfirmSummary: "After restoration: {exposed} entity(ies) exposed to Google ({added} added, {already} already exposed).",
    planConfirmRemoved: "No longer exposed ({count}): {entities}.",
    planConfirmCurrent: "With current name and room ({count}): {entities}.",
    planConfirmOut: "Not restored ({count}): {entities}.",
    applyNoChanges: "No changes to apply: the Preview already matches production.",
    applyReasonMissingIdentity: "The HVLS installation identity is unavailable.",
    applyReasonUnsafePath: "The output or registry path is unsafe. Check for symbolic links.",
    applyReasonReservedPath: "The output path conflicts with reserved HVLS metadata.",
    applyReasonRegistryInvalid: "The HVLS ownership registry is invalid or unreadable. Verification is required.",
    applyReasonOtherInstallation: "This file belongs to another HVLS installation. Writing is prohibited.",
    applyReasonUnmanagedOutput: "An existing YAML file is not verified as HVLS-owned. It remains protected.",
    applyUnmanagedAssistantHint: "The Assistant can inspect this file in read-only mode. Inspection does not automatically enable Apply.",
    applyUnmanagedAssistantAction: "Inspect in Assistant",
    applyReasonMissingDirectory: "The output directory is unavailable.",
    applyReasonVerificationFailed: "File safety verification failed. Apply remains disabled.",
    applyReasonOutputPathMismatch: "The output path no longer matches the path registered by HVLS.",
    applyReasonPendingOperation: "An HVLS operation is incomplete. Controlled recovery is required before Apply.",
    applyReasonManagedOutputMissing: "The previously HVLS-managed output file is missing.",
    missingRebuildAction: "Rebuild missing YAML",
    missingRebuildReview: "The YAML previously managed by HVLS is missing. {count} entities can be rebuilt from current HA labels. Review the YAML before confirming.",
    missingRebuildConfirm: "The HVLS production file is missing. Recreate it from the verified Preview and current HA labels? No labels will be changed and existing backups are preserved. If the file reappears, this operation is refused.",
    missingRebuildApplied: "YAML rebuilt: {path} — {bytes} bytes written. HA labels unchanged.",
    missingRebuildBackups: "Review backups",
    missingRebuildDetected: "HVLS production file is missing. You can restore a backup or rebuild from {count} entities labeled in HA, after Preview review.",
    applyReasonOutputChanged: "The HVLS-managed file has changed since its last SHA-256 verification.",
    applyReasonNotConfigured: "HVLS is not configured yet.",
    applyVerificationUnavailable: "Cannot validate Apply: missing or inconsistent security information. Refresh the Preview.",
    bulkRemovalWarning: "WARNING: {removed} of {before} entities will be removed from production YAML (after Apply: {after}). Review the red removals before continuing.",
    emptySelectionConfirm: "This removes the last HVLS entity: no entities will remain exposed in the YAML. Confirm removing all entities?",
    bulkRemovalConfirm: "LARGE REMOVAL: {removed} of {before} entities will be removed from production YAML (new total: {after}). This operation may also remove HA labels. Do you explicitly confirm these removals?",
    applyConfirm: "Apply this Preview to the Google Assistant configuration?",
    applyWarning: "The current file will be backed up if backups are enabled. The operation will be rejected if changes are detected since your review.",
    previewApplying: "Validating and applying Preview…",
    previewApplied: "Preview applied: {path} — {bytes} bytes written{backup}",
    backupCreated: "Backup: {path}",
    previewApplyFailed: "Apply rejected: {error}. Refresh Preview before trying again.",
    noYaml: "No YAML to copy.",
    copyUnsupported: "Browser copy operation failed.",
    yamlCopied: "YAML copied — {path}",
    copyFailed: "Unable to copy: {error}",
    registriesLoading: "Loading HA registries…",
    entitiesLoadFailed: "Unable to load entities: {error}",
    inconsistentRegistry: "Inconsistent response from the HA registry",
    waitingHA: "Waiting for Home Assistant…",
    tabsLabel: "HVLS sections",
    rawDiffSummary: "Detailed YAML diff",
    hvlsLabelAria: "HVLS label: {entity}",
    entityMoreInfo: "Show {entity} details in Home Assistant",
    catalogWarning: "Warning: {warnings}",
    absentValue: "(absent)",
    showPreviewYaml: "Show Preview YAML",
    changesProposed: "Proposed Google Assistant changes",
    recoveryDiffTitle: "Differences between old and new YAML",
    recoveryDiffSummary: "Old file: {before} entities → Proposed new file: {after} entities.",
    changesIntro: "Review the differences before applying the configuration.",
    noChanges: "No entity changes to apply.",
    removalNote: "Removing an entity here does not delete it from Home Assistant: only its Google Assistant configuration changes.",
    firstProduction: "No existing production configuration: differences cannot be calculated against a previous file.",
    fieldBefore: "Before",
    fieldAfter: "After",
    fileIssue_invalid_entity_file_path: "invalid path",
    fileIssue_sensitive_file_reference: "sensitive file",
    fileIssue_symlink_entity_file_not_allowed: "symlink prohibited",
    fileIssue_include_missing: "file not found",
    fileIssue_yaml_syntax_error: "invalid YAML",
    fileIssue_duplicate_mapping_key: "duplicate YAML key",
    fileIssue_yaml_file_too_large: "file too large",
    fileIssue_expected_mapping: "invalid YAML structure",
    fileIssue_unreadable_yaml_file: "unreadable file",
    fileIssue_entity_file_unavailable: "file unavailable",
    fileIssue_invalid_entity_id: "invalid entity ID",
    fileIssue_invalid_entity_options: "invalid entity options",
    fileIssue_invalid_expose_value: "invalid expose value",
    fileIssue_invalid_room_option: "invalid room option",
    fileIssue_invalid_name_option: "invalid name option",
    fileIssue_invalid_aliases_option: "invalid aliases option",
    fileIssue_unhandled_entity_option: "unsupported option",
    fileIssueUnknown: "unknown issue",
    fileIssueLine: "line"
  }
};

// Map a Home Assistant language ("de", "pt-BR", "zh-Hans"...) to a panel
// dictionary; unknown languages fall back to English.
function hvlsResolveLanguage(language) {
  const code = String(language || "en").trim().toLowerCase().replace("_", "-");
  if (HVLS_TRANSLATIONS[code]) return code;
  const base = code.split("-")[0];
  return HVLS_TRANSLATIONS[base] ? base : "en";
}

const HVLS_APPLY_REASON_KEYS = Object.freeze({
  "missing_identity": "applyReasonMissingIdentity",
  "unsafe_path": "applyReasonUnsafePath",
  "reserved_path": "applyReasonReservedPath",
  "registry_invalid": "applyReasonRegistryInvalid",
  "owned_by_other_installation": "applyReasonOtherInstallation",
  "unmanaged_output": "applyReasonUnmanagedOutput",
  "missing_directory": "applyReasonMissingDirectory",
  "verification_failed": "applyReasonVerificationFailed",
  "output_path_mismatch": "applyReasonOutputPathMismatch",
  "pending_operation": "applyReasonPendingOperation",
  "restore_reconciliation_required": "restoreReconcilePending",
  "managed_output_missing": "applyReasonManagedOutputMissing",
  "output_changed": "applyReasonOutputChanged",
  "not_configured": "applyReasonNotConfigured",
  "no_changes": "applyNoChanges",
});

class HVLSPreviewPanel extends HTMLElement {
  _t(key) {
    const language = this._language || "en";
    return HVLS_TRANSLATIONS[language]?.[key]
      ?? HVLS_TRANSLATIONS.en[key]
      ?? key;
  }

  _tf(key, values = {}) {
    return this._t(key).replace(/\{(\w+)\}/g,
      (match, name) => String(values[name] ?? match)
    );
  }

  _setStatusKey(key, values = {}) {
    const displayValues = key === "previewApplied" && values.backupPath
      ? {...values, backup: ` — ${this._tf("backupCreated", {path: values.backupPath})}`}
      : values;
    this._setStatus(this._tf(key, displayValues));
    this._statusKey = key;
    this._statusValues = values;
  }

  _translateStatic() {
    const menuToggle = this.querySelector("#menuToggle");
    if (menuToggle) {
      menuToggle.setAttribute("aria-label", this._t("menu"));
      menuToggle.title = this._t("menu");
    }
    const globalRefresh = this.querySelector("#refresh");
    if (globalRefresh) {
      globalRefresh.setAttribute("aria-label", this._t("refresh"));
      globalRefresh.title = this._t("refresh");
    }

    const applyInfoSummary = this.querySelector(
      "#applyInfo > summary"
    );
    if (applyInfoSummary) {
      applyInfoSummary.setAttribute(
        "aria-label", this._t("applyInfoLabel")
      );
      applyInfoSummary.title = this._t("applyInfoLabel");
    }

    // Apply has three contextual labels (normal, restore, manual labels).
    // Never overwrite that state-specific label during routine HA refresh.
    const texts = {
      copy: "copy",
      settings: "settings",
      refreshEntities: "refreshEntities",
      entityMore: "moreEntities"
    };

    for (const [id, key] of Object.entries(texts)) {
      const element = this.querySelector(`#${id}`);
      if (element) {
        element.textContent = key === "settings"
          ? `⚙ ${this._t(key)}`
          : this._t(key);
      }
    }

    this._updateTabLabels();

    const heading = this.querySelector(
      "#entityManager .entity-manager-header h2"
    );
    if (heading) heading.textContent = this._t("tabEntities");

    const issueLink = this.querySelector("#assistantReportIssue");
    if (issueLink) issueLink.textContent = this._t("assistantReportIssue");

    const search = this.querySelector("#entitySearch");
    if (search) {
      search.placeholder = this._t("searchPlaceholder");
      search.setAttribute("aria-label", this._t("searchLabel"));
    }

    const filter = this.querySelector("#entityFilter");
    if (filter) {
      filter.setAttribute("aria-label", this._t("filterLabel"));

      for (const [value, key] of [
        ["all", "filterAll"],
        ["yes", "filterWith"],
        ["no", "filterWithout"],
        ["eligible_no", "filterEligibleWithout"],
        ["ineligible", "filterIneligible"]
      ]) {
        const option = filter.querySelector(
          `option[value="${value}"]`
        );
        if (option) option.textContent = this._t(key);
      }
    }

    const yamlSummary = this.querySelector("#previewYamlDetails > summary");
    if (yamlSummary) yamlSummary.textContent = this._t("showPreviewYaml");
    const diffSummary = this.querySelector("#rawDiffDetails summary");
    if (diffSummary) diffSummary.textContent = this._t("rawDiffSummary");
    const status = this.querySelector("#entityStatus");
    if (status && !this._entityCatalog && !this._entityLoading && !this._entityLoadError) {
      status.textContent = this._t("loadingEntities");
    }
    const backupIntro = this.querySelector("#backupIntro");
    if (backupIntro) backupIntro.textContent = this._t("backupIntro");
    const restore = this.querySelector("#restoreBackup");
    if (restore) restore.textContent = this._t("backupRestore");
    const migrationIntro = this.querySelector("#migrationIntro");
    if (migrationIntro) migrationIntro.textContent = this._t("migrationIntro");
    const migrationAnalyze = this.querySelector("#migrationAnalyze");
    if (migrationAnalyze) migrationAnalyze.textContent = this._t("migrationAnalyze");
    this._renderMigrationGuide();
    this._renderAssistantFileStatus();
    this.querySelectorAll?.(".assistant-example-project").forEach(item => {
      item.textContent = this._t("assistantExampleProjectId");
    });
    const nav = this.querySelector(".hvls-tabs");
    if (nav) nav.setAttribute("aria-label", this._t("tabsLabel"));
  }

  _pendingChangeCount() {
    const staged = this._stagedRestore;

    // A blocked browser draft still represents an unresolved user selection,
    // not an authorization to Apply. Keep it discoverable in Preview.
    if (staged?.mode === "saved_draft_blocked") {
      return this._manualLabelChanges?.size || staged.changes?.length || 0;
    }
    // In ordinary manual selection, count every affected entity: each net
    // checkbox change, plus YAML changes that come from Home Assistant
    // itself (label removed elsewhere, area changed, ...). Counting only the
    // checkboxes showed "Preview (1)" next to three listed changes.
    const manual = staged?.mode === "label_preview" && staged.recovery !== true;
    const manualChanges = manual && Array.isArray(staged.changes)
      ? staged.changes.length : 0;

    // Normal Preview is actionable only after its server-side review.
    const active = staged || (this._review ? this._lastAnalysis : null);
    if (!active) return 0;
    const comparison = active.comparison;
    if (!["ok", "missing"].includes(comparison?.status)) return manualChanges;

    // Recovery/backup proposals may change both the YAML and HA labels.
    // Count each affected entity once, even when both need updating.
    const entities = new Set();
    const addEntities = items => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const id = typeof item === "string" ? item : item?.entity_id;
        if (typeof id === "string") entities.add(id);
      }
    };
    for (const operation of ["added", "removed", "modified"]) {
      addEntities(comparison[operation]);
    }
    if (staged) {
      addEntities(staged.label_plan?.add);
      addEntities(staged.label_plan?.remove);
      if (manual) addEntities(staged.changes);
    }
    const diffCount = comparison.status === "ok"
      ? ["added", "removed", "modified"].reduce(
          (count, operation) => count + (comparison[operation]?.length || 0), 0
        )
      : 0;
    const missingCount = comparison.status === "missing" &&
      Number.isSafeInteger(active.summary?.total)
        ? active.summary.total : 0;
    return Math.max(entities.size, diffCount, missingCount);
  }

  _updateTabLabels() {
    const pending = this._pendingChangeCount();
    const tabs = [
      ["summary", "tabStats"],
      ["exclusions", "tabExclusions"],
      ["entities", "tabEntities"],
      ["preview", "tabPreview"],
      ["backups", "tabBackups"],
      ["migration", "tabMigration"],
    ];
    let number = 0;
    for (const [tab, key] of tabs) {
      const button = this.querySelector(`.hvls-tab[data-tab="${tab}"]`);
      if (!button) continue;
      if (button.hidden) continue;
      number += 1;
      const count = tab === "exclusions" && this._excludedCount != null
        ? ` (${this._excludedCount})`
        : tab === "preview" && pending > 0 ? ` (${pending})` : "";
      button.classList?.toggle("has-pending", tab === "preview" && pending > 0);
      button.textContent = `${number} · ${this._t(key)}${count}`;
    }
  }

  _syncExclusionsTab(exclusions) {
    // Never interpret absent diagnostics (loading/error) as zero exclusions.
    if (!exclusions || !Array.isArray(exclusions.entities)) return;
    const button = this.querySelector('.hvls-tab[data-tab="exclusions"]');
    if (!button) return;
    this._excludedCount = exclusions.entities.length;
    button.hidden = this._excludedCount === 0;

    if (button.hidden && button.getAttribute("aria-selected") === "true") {
      this._activateTab("entities");
    }
    this._updateTabLabels();
  }

  _entityMatchesFilter(entity, filter) {
    if (filter === "yes") return entity.has_label === true;
    if (filter === "no") return entity.has_label !== true;
    if (filter === "eligible_no")
      return entity.eligible === true && entity.has_label !== true;
    if (filter === "ineligible") return entity.eligible !== true;
    return true;
  }

  _ineligibleReasonCode(entity) {
    const reason = entity?.exclusion_reason;
    return HVLS_INELIGIBLE_REASONS.includes(reason) && reason !== "other"
      ? reason : "other";
  }

  _reasonFilterStorageKey() {
    // Same per-user scoping as the label draft. This is only a display
    // preference: it never grants or blocks any write.
    const userId = this._hass?.user?.id;
    return typeof userId === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(userId)
      ? "hvls:ineligible-reasons:v1:" + userId : null;
  }

  _reasonFilterSelection() {
    if (this._reasonFilter instanceof Set) return this._reasonFilter;
    let selected = new Set(HVLS_INELIGIBLE_REASONS);
    const key = this._reasonFilterStorageKey();
    if (key) {
      try {
        const saved = JSON.parse(window.localStorage?.getItem(key) || "null");
        if (Array.isArray(saved)) {
          selected = new Set(
            saved.filter(code => HVLS_INELIGIBLE_REASONS.includes(code))
          );
        }
      } catch (_error) {
        // Malformed browser data: fall back to every reason.
      }
    }
    this._reasonFilter = selected;
    return selected;
  }

  _setReasonFilter(codes) {
    this._reasonFilter = new Set(
      codes.filter(code => HVLS_INELIGIBLE_REASONS.includes(code))
    );
    const key = this._reasonFilterStorageKey();
    if (key) {
      try {
        window.localStorage?.setItem(key, JSON.stringify(
          HVLS_INELIGIBLE_REASONS.filter(code => this._reasonFilter.has(code))
        ));
      } catch (_error) {
        // Storage unavailable: keep the choice for this session only.
      }
    }
    this._entityLimit = 100;
    this._renderEntities();
  }

  _reasonDetail(entity) {
    const reason = this._ineligibleReasonCode(entity);
    if (reason === "domain_not_enabled") {
      return this._tf("reasonDetailDomain", {domain: entity.domain || ""});
    }
    if (reason === "unsupported_device_class") {
      return typeof entity.device_class === "string" && entity.device_class
        ? this._tf("reasonDetailClass", {deviceClass: entity.device_class})
        : this._t("reasonDetailNoClass");
    }
    if (reason === "entity_category") {
      if (entity.category === "config") return this._t("reasonDetailConfig");
      if (entity.category === "diagnostic") {
        return this._t("reasonDetailDiagnostic");
      }
    }
    return "";
  }

  _renderReasonFilter(container, ineligible, visible) {
    if (!container) return;
    container.hidden = !visible;
    if (!visible) {
      container.replaceChildren();
      return;
    }
    const selected = this._reasonFilterSelection();
    const counts = new Map(HVLS_INELIGIBLE_REASONS.map(code => [code, 0]));
    for (const entity of ineligible) {
      const code = this._ineligibleReasonCode(entity);
      counts.set(code, counts.get(code) + 1);
    }

    const header = document.createElement("div");
    header.className = "ineligible-reasons-header";
    const title = document.createElement("strong");
    title.textContent = this._t("reasonFilterTitle");
    const all = document.createElement("button");
    all.type = "button";
    all.className = "reason-filter-link";
    all.textContent = this._t("reasonFilterAll");
    all.addEventListener("click", () => {
      this._setReasonFilter([...HVLS_INELIGIBLE_REASONS]);
    });
    header.append(title, all);

    const chips = document.createElement("div");
    chips.className = "ineligible-reasons-chips";
    for (const code of HVLS_INELIGIBLE_REASONS) {
      // "Other" only appears when the server sent an unknown reason.
      if (code === "other" && !counts.get(code)) continue;
      const reasonLabel = this._t("reasonShort_" + code);
      const chip = document.createElement("span");
      chip.className = "reason-filter-chip";

      const option = document.createElement("label");
      option.className = "reason-filter-option";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = selected.has(code);
      box.dataset.reason = code;
      box.addEventListener("change", () => {
        const next = new Set(this._reasonFilterSelection());
        if (box.checked) next.add(code); else next.delete(code);
        this._setReasonFilter([...next]);
      });
      const badge = document.createElement("span");
      badge.className = `reason-badge reason-${code}`;
      badge.textContent = reasonLabel;
      const count = document.createElement("span");
      count.className = "reason-filter-count";
      count.textContent = String(counts.get(code));
      option.append(box, badge, count);

      const only = document.createElement("button");
      only.type = "button";
      only.className = "reason-filter-link";
      only.textContent = this._t("reasonFilterOnly");
      only.setAttribute("aria-label", this._tf("reasonFilterOnlyAria", {
        reason: reasonLabel,
      }));
      only.addEventListener("click", () => this._setReasonFilter([code]));

      chip.append(option, only);
      chips.appendChild(chip);
    }
    container.replaceChildren(header, chips);
  }

  set hass(hass) {
    this._hass = hass;
    const oldLanguage = this._language;
    this._language = hvlsResolveLanguage(hass?.language);
    if (!this._initialized) {
      this._initialized = true;
      this._render();
      // Home Assistant destroys/recreates custom panels on navigation.
      // Restore only user intent after *both* fresh server snapshots arrive;
      // never reuse a cached Apply authorization.
      Promise.all([this._loadPreview(), this._loadEntities()])
        .then(() => this._resumeSavedLabelDraft())
        .catch(() => {});
    }
    this._loadBrandIcon();
    this._translateStatic();
    this._syncMenuVisibility();
    if (oldLanguage && oldLanguage !== this._language) {
      this._updateApplyButton();
      if (this._lastAnalysis) this._renderAnalysis(this._lastAnalysis);
      if (this._entityCatalog && !this._entityLoading && !this._entityWritePending) {
        this._renderEntities();
      }
      if (this._statusKey) this._setStatusKey(this._statusKey, this._statusValues);
      this._renderBackups();
      this._renderBackupDiff();
      this._renderMigrationReview();
      if (this._entityLoadError) {
        const entityStatus = this.querySelector("#entityStatus");
        if (entityStatus) entityStatus.textContent = this._tf("entitiesLoadFailed", {error: this._entityLoadError});
      }
    }
  }

  set narrow(narrow) {
    this._narrow = Boolean(narrow);
    this._syncMenuVisibility();
  }

  _syncMenuVisibility() {
    const menu = this.querySelector("#menuToggle");
    if (menu) {
      menu.hidden = !(this._narrow || this._hass?.dockedSidebar === "always_hidden");
    }
  }

  _toggleMenu() {
    this.dispatchEvent(new Event("hass-toggle-menu", {
      bubbles: true,
      composed: true
    }));
  }

  set panel(panel) {
    this._panel = panel;
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      this._render();
      this._syncMenuVisibility();
    }
  }

  async _loadBrandIcon() {
    const icon = this.querySelector("#hvlsBrandIcon");
    if (!this._hass || !icon || this._brandIconStarted) return;

    this._brandIconStarted = true;

    try {
      const response = await this._hass.callWS({
        type: "brands/access_token",
      });
      const token = typeof response === "string"
        ? response
        : response?.token || response?.access_token;

      if (!token) throw new Error("Jeton de marque indisponible");

      icon.onload = () => { icon.hidden = false; };
      icon.onerror = () => { icon.hidden = true; };

      icon.src =
        "/api/brands/integration/ha_voice_label_sync/icon.png" +
        "?placeholder=no&token=" + encodeURIComponent(token);
    } catch (error) {
      icon.hidden = true;
      console.warn("HVLS : logo non disponible", error);
    }
  }

  _draftStorageKey() {
    // Scope browser-local drafts to the authenticated HA user. The browser
    // origin scopes them to this HA instance; never share across users.
    const userId = this._hass?.user?.id;
    return typeof userId === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(userId)
      ? "hvls:label-draft:v1:" + userId : null;
  }

  _readSavedLabelDraft() {
    const key = this._draftStorageKey();
    if (!key) return null;
    try {
      const raw = window.localStorage?.getItem(key);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (draft?.version !== 1 ||
          typeof draft.productionPath !== "string" ||
          !draft.productionPath.startsWith("/") ||
          !(draft.productionSha === null ||
            /^[0-9a-f]{64}$/.test(draft.productionSha)) ||
          !Array.isArray(draft.changes) ||
          draft.changes.length < 1 || draft.changes.length > 500) return null;
      const ids = new Set();
      for (const item of draft.changes) {
        if (!item || typeof item.entity_id !== "string" ||
            !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(item.entity_id) ||
            typeof item.enabled !== "boolean" ||
            typeof item.base_label !== "boolean" ||
            ids.has(item.entity_id)) return null;
        ids.add(item.entity_id);
      }
      return draft;
    } catch (_error) {
      return null; // Never trust malformed browser data or grant Apply.
    }
  }

  _clearSavedLabelDraft() {
    const key = this._draftStorageKey();
    if (!key) return;
    try {
      window.localStorage?.removeItem(key);
    } catch (_error) {
      this._setStatusKey("savedDraftStorageUnavailable");
    }
  }

  _savePendingLabelDraft(choices, stage) {
    const key = this._draftStorageKey();
    const catalog = this._entityCatalog?.entities;
    const productionPath = this._lastAnalysis?.production_path ||
      stage?.production_path;
    if (!key || !Array.isArray(catalog) ||
        typeof productionPath !== "string" ||
        !(stage?.production_sha256 === null ||
          /^[0-9a-f]{64}$/.test(stage?.production_sha256))) return false;
    const entities = new Map(catalog.map(item => [item.entity_id, item]));
    const changes = [];
    for (const [entity_id, enabled] of choices) {
      const entity = entities.get(entity_id);
      if (!entity || typeof enabled !== "boolean" ||
          (enabled && entity.eligible !== true) ||
          entity.has_label === enabled) return false;
      changes.push({
        entity_id, enabled, base_label: entity.has_label === true,
      });
    }
    if (!changes.length || changes.length > 500) return false;
    changes.sort((a, b) => a.entity_id.localeCompare(b.entity_id));
    try {
      window.localStorage.setItem(key, JSON.stringify({
        version: 1, productionPath,
        productionSha: stage.production_sha256,
        changes,
      }));
      return true;
    } catch (_error) {
      return false;
    }
  }

  _blockSavedLabelDraft(draft) {
    // The browser stores *intent*, not a trusted approval. Even if the
    // server cannot revalidate, preserve the user's list until explicit
    // Cancel; the synthetic stage can never satisfy the Apply predicates.
    this._review = null;
    this._manualLabelChanges = new Map(
      draft.changes.map(item => [item.entity_id, item.enabled])
    );
    this._stagedRestore = {
      mode: "saved_draft_blocked", changes: draft.changes,
      projection: {ready: false},
    };
    this._applyBlockReason = this._t("savedDraftBlocked");
    this._applyBlockReasonCode = null;
    this._updateApplyButton();
    if (this._entityCatalog) this._renderEntities();
    if (this._lastAnalysis) this._renderAnalysis(this._lastAnalysis);
    this._setStatusKey("savedDraftBlocked");
    this._activateTab("preview");
  }

  async _resumeSavedLabelDraft() {
    const draft = this._readSavedLabelDraft();
    if (!draft || !this._hass || this._stagedRestore ||
        this._entityWritePending || this._applying) return;
    const baseline = this._lastAnalysis;
    const catalog = this._entityCatalog?.entities;
    const sameProduction = baseline?.production_path === draft.productionPath &&
      baseline.production_sha256 === draft.productionSha &&
      baseline.available === true && !baseline.error &&
      baseline.ownership?.write_allowed === true &&
      !baseline.recovery_pending && !this._restoreReconcilePending;
    const entities = new Map((catalog || []).map(entity =>
      [entity.entity_id, entity]
    ));
    const sameLabels = Array.isArray(catalog) &&
      draft.changes.every(item => {
        const entity = entities.get(item.entity_id);
        return entity && entity.has_label === item.base_label &&
          item.enabled !== item.base_label &&
          (!item.enabled || entity.eligible === true);
      });
    if (!sameProduction || !sameLabels) {
      this._blockSavedLabelDraft(draft);
      return;
    }

    // Server recalculates the proposed YAML, label plan and fingerprints.
    // No label/YAML write is performed, and the old review is discarded.
    this._entityWritePending = true;
    const loadId = (this._loadId || 0) + 1;
    this._loadId = loadId;
    this._review = null;
    this._updateApplyButton();
    try {
      const requested = draft.changes.map(({entity_id, enabled}) =>
        ({entity_id, enabled})
      );
      const stage = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_manual_label_preview",
        changes: requested,
      });
      if (loadId !== this._loadId) return;
      const returned = stage?.changes?.map(({entity_id, enabled}) =>
        ({entity_id, enabled})
      );
      if (stage?.mode !== "label_preview" ||
          stage.recovery === true ||
          stage.projection?.ready !== true ||
          !/^[a-f0-9]{64}$/.test(stage.label_plan_sha256 || "") ||
          stage.production_sha256 !== draft.productionSha ||
          JSON.stringify(returned) !== JSON.stringify(requested)) {
        throw new Error("stale_draft_preview");
      }
      this._manualLabelChanges = new Map(
        requested.map(item => [item.entity_id, item.enabled])
      );
      this._stagedRestore = stage;
      this._previewContent = stage.content;
      this._previewPath = stage.path;
      this._applyBlockReason = this._t("manualLabelHelp");
      this._applyBlockReasonCode = null;
      this._renderAnalysis(stage);
      this._setContent(stage.content);
      // Announce the same figures as the Preview tab and its change list.
      const diff = stage.comparison;
      if (diff?.status === "ok") {
        this._setStatusKey("savedDraftRestoredDetail", {
          count: this._pendingChangeCount(),
          added: diff.added?.length || 0,
          removed: diff.removed?.length || 0,
          modified: diff.modified?.length || 0,
        });
      } else {
        this._setStatusKey("savedDraftRestored", {count: requested.length});
      }
      this._activateTab("preview");
    } catch (_error) {
      if (loadId === this._loadId) this._blockSavedLabelDraft(draft);
    } finally {
      this._entityWritePending = false;
      this._updateApplyButton();
      if (this._entityCatalog) this._renderEntities();
    }
  }

  // Preparing another backup while a proposal is pending: ask explicitly.
  // "No" keeps the pending proposal and does nothing else. "Yes" discards
  // it locally (like Cancel): nothing is written to YAML or labels.
  _replacePendingProposal(data) {
    const staged = this._stagedRestore;
    if (staged.mode === "restore_preview" &&
        staged.backup_id === data.backup_id) {
      this._activateTab("preview");
      this._setStatusKey("backupAlreadyStaged");
      return false;
    }
    const key = staged.mode === "restore_preview"
      ? "backupReplaceRestoreConfirm" : "backupReplaceProposalConfirm";
    if (!window.confirm(this._t(key))) {
      this._setStatusKey("backupReplaceKept");
      return false;
    }
    this._loadId = (this._loadId || 0) + 1;
    this._stagedRestore = null;
    this._manualLabelChanges = null;
    this._clearSavedLabelDraft();
    this._review = null;
    this._applyBlockReason = null;
    this._applyBlockReasonCode = null;
    this._updateApplyButton();
    if (this._entityCatalog) this._renderEntities();
    return true;
  }

  _protectPendingDraft() {
    // Only explicit Cancel and completed/failed Apply may clear a staged
    // proposal. A navigation, refresh or migration must never silently
    // discard the user's unpublished selection.
    if (!this._stagedRestore) return false;
    this._activateTab("preview");
    this._setStatusKey("pendingDraftProtect");
    return true;
  }

  async _loadPreview(afterApply = false) {
    if (!this._hass || (this._applying && !afterApply)) return;
    if (!afterApply && this._protectPendingDraft()) return;
    const loadId = (this._loadId || 0) + 1;
    this._loadId = loadId;
    this._stagedRestore = null; // Normal Preview replaces an obsolete staging plan.
    this._manualLabelChanges = null;
    this._review = null;
    this._applyBlockReason = null;
    this._applyBlockReasonCode = null;
    this._updateApplyButton();
    this._setStatusKey("previewLoading");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/get_preview",
      });
      if (loadId !== this._loadId || (this._applying && !afterApply)) return;
      this._previewPath = result.path;
      this._previewContent = result.content;
      // The setup choice is guidance only; it never authorizes a write.
      this._onboardingMode = ["new", "existing"].includes(result.onboarding_mode)
        ? result.onboarding_mode : null;
      this._recoveryPending = result.recovery_pending === true;
      this._ownershipManaged = result.ownership?.status === "managed" &&
        result.ownership?.write_allowed === true;
      const validHash = value =>
        typeof value === "string" &&
        /^[0-9a-f]{64}$/.test(value);

      const ownership = result.ownership;

      const ownershipConsistent =
        ownership?.write_allowed === true &&
        (
          (
            ownership.status === "new" &&
            result.production_sha256 === null
          ) ||
          (
            ownership.status === "managed" &&
            validHash(result.production_sha256)
          )
        );

      this._restoreReconcilePending =
        ownership?.reason_code === "restore_reconciliation_required";
      this._restoreReconcileState = this._restoreReconcilePending
        ? result.restore_reconciliation?.state || "uncertain" : null;
      this._restoreReconcileReview = this._restoreReconcilePending &&
        validHash(result.production_sha256) &&
        validHash(result.preview_sha256)
          ? {production_sha256: result.production_sha256,
             preview_sha256: result.preview_sha256}
          : null;

      // A verified, unchanged production file needs no normal Apply.
      // A staged restoration must stay independent: identical YAML can still
      // require label reconciliation.
      const hasNoChanges =
        result.comparison?.status === "ok" &&
        ["added", "removed", "modified"].every(key =>
          Array.isArray(result.comparison[key]) &&
          result.comparison[key].length === 0
        );
      const allowedBySafety =
        result.available === true &&
        result.error == null &&
        result.can_apply === true &&
        ownershipConsistent &&
        validHash(result.preview_sha256);
      const canReview = allowedBySafety && !hasNoChanges;
      const canRebuildMissing =
        result.available === true &&
        result.error == null &&
        validHash(result.preview_sha256) &&
        result.production_sha256 === null &&
        result.comparison?.status === "missing" &&
        Number.isSafeInteger(result.summary?.total) &&
        result.summary.total > 0 &&
        ownership?.status === "missing" &&
        ownership?.reason_code === "managed_output_missing";

      this._review = (canReview || canRebuildMissing) && !this._recoveryPending
        ? {
            preview_sha256: result.preview_sha256,
            production_sha256: result.production_sha256,
            ...(canRebuildMissing ? {rebuild_missing: true} : {}),
          }
        : null;

      const serverReason =
        ownership?.write_allowed === false &&
        typeof ownership.reason === "string" &&
        ownership.reason.trim()
          ? ownership.reason
          : null;

      const shouldExplain =
        result.available === true &&
        !canReview &&
        !canRebuildMissing &&
        (
          result.can_apply === true ||
          ownership?.write_allowed === false
        );

      this._applyBlockReason = shouldExplain
        ? (
            allowedBySafety && hasNoChanges
              ? this._t("applyNoChanges")
              : serverReason || this._t("applyVerificationUnavailable")
          )
        : null;

      this._applyBlockReasonCode = shouldExplain && allowedBySafety && hasNoChanges
        ? "no_changes"
        : shouldExplain && typeof ownership?.reason_code === "string"
          ? ownership.reason_code
          : null;

      this._updateApplyButton();
      this._renderAssistantAdoption();
      this._renderMigrationManagedNotice();
      this._setContent(this._recoveryPending ? "" : result.content || "");
      if (this._recoveryPending) this._previewContent = "";
      this._renderAnalysis(result);
      // Guide only the initial panel opening. Do not override a user-selected tab.
      if (!this._onboardingAutoNavigated && this._initialized &&
          this.querySelector('.hvls-tab[data-tab="summary"]')?.getAttribute(
            "aria-selected"
          ) === "true") {
        const reason = result.ownership?.reason_code;
        const target = this._onboardingMode === "existing" &&
          ["unmanaged_output", "owned_by_other_installation"].includes(reason)
            ? "migration"
            : this._onboardingMode === "new" && reason === "new_output"
              ? "entities" : null;
        if (target) {
          this._onboardingAutoNavigated = true;
          this._activateTab(target);
        }
      }
      if (!result.available) {
        this._setStatus(result.error || this._t("previewMissing"));
      } else if (result.error) {
        this._setStatus(result.error);
      } else {
        this._setStatusKey("previewReady", {path: result.path, production: result.production_path});
      }
    } catch (error) {
      if (loadId !== this._loadId || (this._applying && !afterApply)) return;
      this._review = null;
      this._updateApplyButton();
      this._setStatusKey("previewLoadFailed", {error: error.message || String(error)});
      this._setContent("");
      this._renderAnalysis({available: false});
    }
  }

  _updateApplyButton() {
    this._updateTabLabels();
    this._syncRestoreControls();
    const button = this.querySelector("#apply");
    if (button) {
      const staged = this._stagedRestore;
      const canApplyRestoration =
        staged?.mode === "restore_preview" &&
        staged.projection?.ready === true &&
        staged.label_plan?.review?.length === 0 &&
        ["ok", "missing"].includes(staged.comparison?.status) &&
        (
          staged.comparison?.status === "missing" ||
          staged.comparison?.identical_entities === false ||
          staged.comparison?.identical_text === false ||
          (staged.label_plan?.add?.length || 0) > 0 ||
          (staged.label_plan?.remove?.length || 0) > 0
        ) &&
        /^[0-9a-f]{64}$/.test(staged.label_plan_sha256 || "");
      const canApplyManualLabels =
        staged?.mode === "label_preview" &&
        staged.projection?.ready === true &&
        Array.isArray(staged.changes) &&
        (staged.recovery === true || staged.changes.length > 0) &&
        staged.label_plan?.review?.length === 0 &&
        ["ok", "missing"].includes(staged.comparison?.status) &&
        /^[0-9a-f]{64}$/.test(staged.label_plan_sha256 || "");
      button.disabled = (!this._review && !canApplyRestoration &&
        !canApplyManualLabels) ||
        this._applying === true || this._restoring === true ||
        this._generating === true || this._refreshing === true ||
        this._entityWritePending === true;
      button.textContent = staged?.mode === "label_preview"
        ? this._t(staged.recovery === true ? "assistantRecoveryApply" : "manualLabelApply")
        : staged ? this._t("backupPreviewApply")
        : this._review?.rebuild_missing === true
          ? this._t("missingRebuildAction") : this._t("apply");
    }
    const cancel = this.querySelector("#cancelPreview");
    if (cancel) {
      cancel.hidden = !this._review && !this._stagedRestore;
      cancel.disabled = this._applying === true || this._restoring === true ||
        this._generating === true || this._refreshing === true ||
        this._entityWritePending === true;
      cancel.textContent = this._t("cancelPreview");
    }
    let displayReason = this._applyBlockReason || "";

    if (displayReason && this._applyBlockReasonCode) {
      const code = this._applyBlockReasonCode;
      const key = Object.prototype.hasOwnProperty.call(
        HVLS_APPLY_REASON_KEYS, code
      ) ? HVLS_APPLY_REASON_KEYS[code] : null;

      displayReason = this._t(
        key || "applyVerificationUnavailable"
      );
    }

    const info = this.querySelector("#applyInfo");
    if (info) {
      info.hidden = !displayReason;
      info.title = displayReason;
      if (info.hidden) info.open = false;
    }

    const explanation = this.querySelector("#applyBlockReason");
    if (explanation) {
      explanation.textContent = displayReason;
    }

    // Unmanaged files can be inspected, not automatically adopted as HVLS-owned.
    const showAssistant = Boolean(displayReason) &&
      this._applyBlockReasonCode === "unmanaged_output";
    const assistantHint = this.querySelector("#applyUnmanagedAssistantHint");
    if (assistantHint) {
      assistantHint.hidden = !showAssistant;
      assistantHint.textContent = showAssistant
        ? this._t("applyUnmanagedAssistantHint") : "";
    }
    const assistantAction = this.querySelector("#applyUnmanagedAssistant");
    if (assistantAction) {
      assistantAction.hidden = !showAssistant;
      assistantAction.textContent = this._t("applyUnmanagedAssistantAction");
    }

    const refresh = this.querySelector("#refresh");
    if (refresh) refresh.disabled =
      this._applying === true || this._generating === true || this._refreshing === true;
    const restore = this.querySelector("#restoreBackup");
    if (restore) restore.disabled = !this._backupReview ||
      this._restoring ||
      this._applying || this._refreshing || this._generating || this._entityWritePending;
    const generate = this.querySelector("#generate");
    if (generate) generate.disabled =
      this._applying === true || this._generating === true || this._refreshing === true;
  }

  async _generatePreview(fromRefresh = false) {
    if (!this._hass || this._generating || this._applying || this._restoring || (this._refreshing && !fromRefresh)) return;
    // Normal generation uses only SAVED HA labels; it would replace either
    // a staged label or backup Preview. Preserve both kinds of proposal.
    if (this._protectPendingDraft()) return;

    this._generating = true;
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    this._setStatusKey("previewGenerating");

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/generate_preview",
      });
      await this._loadPreview();
      this._setStatusKey("previewGenerated", {count: result.entity_count});
    } catch (error) {
      this._review = null;
      this._setStatusKey("previewGenerateFailed", {error: error.message || String(error)});
    } finally {
      this._generating = false;
      this._updateApplyButton();
    }
  }

  async _refreshAll() {
    if (!this._hass || this._refreshing || this._generating ||
        this._applying || this._restoring || this._entityWritePending || this._entityLoading) return;
    if (this._protectPendingDraft()) return;

    this._refreshing = true;
    // A refresh can change the input registry or the YAML. Invalidate any
    // earlier approval before the first asynchronous operation.
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();

    try {
      const entitiesLoaded = await this._loadEntities();
      if (!entitiesLoaded) {
        this._setStatusKey("entitiesLoadFailed", {
          error: this._entityLoadError || this._t("inconsistentRegistry")
        });
        return;
      }
      // Regenerates the Preview, then fetches the updated statistics,
      // exclusions and production diff. This does NOT apply to production.
      await this._generatePreview(true);
    } finally {
      this._refreshing = false;
      this._updateApplyButton();
    }
  }

  async _cancelPreview() {
    if (this._applying || this._restoring || this._refreshing ||
        this._generating || this._entityWritePending) return;
    // Local cancellation only. Never write YAML, labels or ownership state.
    this._loadId = (this._loadId || 0) + 1;
    this._stagedRestore = null;
    this._manualLabelChanges = null;
    this._clearSavedLabelDraft();
    this._review = null;
    this._applyBlockReason = null;
    this._applyBlockReasonCode = null;
    this._updateApplyButton();
    await this._loadPreview();
    if (this._entityCatalog) this._renderEntities();
    this._review = null;  // Cancel also discards normal Preview approval.
    this._updateApplyButton();
    this._setStatusKey("previewCancelled");
  }

  // ---- Restore plan table (server-classified rows) ----

  _restoreRowReason(row) {
    if (row.case === "impossible") {
      if (row.reason === "missing_ha_entity") return this._t("planReasonMissing");
      if (row.reason === "not_explicitly_exposed") {
        return this._t("planReasonNotExposed");
      }
      return this._tf("planReasonIneligible", {reason: row.reason || "?"});
    }
    if (row.case === "conflict") {
      return Array.isArray(row.fields) && row.fields.length
        ? this._tf("planReasonOptions", {fields: row.fields.join(", ")})
        : this._t("planReasonConflict");
    }
    if (row.case === "renamed" && row.fields) {
      const labels = {name: "restoreFieldName", room: "restoreFieldRoom"};
      const shown = value => {
        const text = value === null || value === undefined
          ? this._t("restoreValueAbsent") : String(value);
        return text.length > 80 ? text.slice(0, 79) + "…" : text;
      };
      return Object.entries(row.fields).map(([field, change]) =>
        this._tf("restoreBlockerField", {
          field: labels[field] ? this._t(labels[field]) : field,
          before: shown(change?.before), after: shown(change?.after),
        })).join(" ; ");
    }
    if (row.case === "removed") {
      return this._t(row.reason === "no_label"
        ? "planReasonNoLabel" : "planReasonRemoved");
    }
    return null;
  }

  // Translate one row choice into the explicit server-side selection.
  _setRestoreRowChoice(entityId, choice) {
    const staged = this._stagedRestore;
    const row = (staged?.restore_rows || []).find(r => r.entity_id === entityId);
    if (!row || row.choice === choice || !row.choices?.includes(choice)) return;
    const ignored = new Set(staged.ignored_entities || []);
    const refreshed = new Set(staged.refreshed_entities || []);
    if (choice === "out" || choice === "keep") {
      ignored.add(entityId);
      refreshed.delete(entityId);
    } else if (choice === "current") {
      ignored.delete(entityId);
      refreshed.add(entityId);
    } else {  // "in" or "remove"
      ignored.delete(entityId);
    }
    return this._setRestoreSelection(staged, ignored, refreshed);
  }

  _setRestoreKeepAll(keep) {
    const staged = this._stagedRestore;
    const target = keep ? "keep" : "remove";
    const rows = (staged?.restore_rows || []).filter(row =>
      row.case === "removed" && row.choice !== target &&
      row.choices?.includes(target));
    if (!rows.length) return;
    const ignored = new Set(staged.ignored_entities || []);
    for (const row of rows) {
      if (keep) ignored.add(row.entity_id);
      else ignored.delete(row.entity_id);
    }
    return this._setRestoreSelection(
      staged, ignored, new Set(staged.refreshed_entities || []));
  }

  _restoreRecommended() {
    const staged = this._stagedRestore;
    if (!staged) return;
    return this._setRestoreSelection(staged, new Set(), new Set(),
      {recommended: true});
  }

  _planButton(label, onClick, ariaEntity) {
    const button = this._restoreIgnoreControl(document.createElement("button"));
    button.type = "button";
    button.className = "secondary";
    button.textContent = label;
    if (ariaEntity) button.setAttribute("aria-label", label + ": " + ariaEntity);
    button.addEventListener("click", onClick);
    return button;
  }

  _planTag(label, kind) {
    const tag = document.createElement("span");
    tag.className = "restore-tag restore-tag-" + kind;
    tag.textContent = label;
    return tag;
  }

  _planRow(row, actions) {
    const entry = document.createElement("div");
    entry.className = "restore-row";
    const text = document.createElement("div");
    text.className = "restore-row-text";
    const id = document.createElement("span");
    id.className = "restore-row-id";
    id.textContent = row.entity_id;
    text.appendChild(id);
    const reason = this._restoreRowReason(row);
    if (reason) {
      const why = document.createElement("span");
      why.className = "restore-row-why";
      why.textContent = reason;
      text.appendChild(why);
    }
    const side = document.createElement("div");
    side.className = "restore-row-actions";
    side.append(...actions);
    entry.append(text, side);
    return entry;
  }

  _planColumn(key, rows) {
    const column = document.createElement("section");
    column.className = "restore-col";
    const head = document.createElement("div");
    head.className = "restore-col-head";
    const title = document.createElement("h3");
    title.textContent = this._tf("planCol_" + key, {count: rows.length});
    const info = document.createElement("button");
    info.type = "button";
    info.className = "restore-info";
    info.textContent = "ⓘ";
    info.setAttribute("aria-label", this._t("planHelpLabel") + " : " +
      this._tf("planCol_" + key, {count: rows.length}));
    if (!this._restoreHelpOpen) this._restoreHelpOpen = new Set();
    const help = document.createElement("p");
    help.className = "restore-help";
    help.textContent = this._t("planHelp_" + key);
    help.hidden = !this._restoreHelpOpen.has(key);
    info.setAttribute("aria-expanded", String(!help.hidden));
    info.addEventListener("click", () => {
      help.hidden = !help.hidden;
      info.setAttribute("aria-expanded", String(!help.hidden));
      if (help.hidden) this._restoreHelpOpen.delete(key);
      else this._restoreHelpOpen.add(key);
    });
    head.append(title, info);
    const subtitle = document.createElement("p");
    subtitle.className = "restore-col-sub";
    subtitle.textContent = this._t("planSub_" + key);
    column.append(head, help, subtitle);
    return column;
  }

  _renderRestorePlan(container) {
    const staged = this._stagedRestore;
    const rows = staged.restore_rows || [];
    const summary = staged.restore_summary || {};

    const metrics = document.createElement("div");
    metrics.className = "metrics";
    this._addMetric(metrics, this._t("planSumRestored"),
      `${summary.restored_from_backup ?? 0} / ${summary.backup_total ?? 0}`);
    this._addMetric(metrics, this._t("planSumExposed"), summary.exposed_after ?? 0);
    this._addMetric(metrics, this._t("planSumAdded"), summary.added ?? 0);
    this._addMetric(metrics, this._t("planSumAlready"),
      summary.already_exposed ?? 0);
    this._addMetric(metrics, this._t("planSumRemoved"), summary.removed ?? 0);
    container.appendChild(metrics);

    if (staged.projection?.ready !== true || summary.pending) {
      const warning = document.createElement("p");
      warning.className = "diagnostic-note restore-warning";
      warning.textContent = this._t("planNotReady");
      container.appendChild(warning);
    }

    const grid = document.createElement("div");
    grid.className = "restore-plan-grid";
    const notRestored = rows.filter(row => row.case !== "removed" &&
      (row.choice === "out" || row.choice === "pending"));
    const current = rows.filter(row => row.case === "renamed" &&
      row.choice === "current");
    const result = rows.filter(row =>
      (row.case === "removed") ||
      (row.choice === "in" || row.choice === "current"));

    const col1 = this._planColumn("out", notRestored);
    for (const row of notRestored) {
      const actions = [];
      const back = row.case === "renamed" ? "current" : "in";
      if (row.choices?.includes(back)) {
        actions.push(this._planButton(this._t("planActionRestore"),
          () => this._setRestoreRowChoice(row.entity_id, back), row.entity_id));
      } else {
        actions.push(this._planTag(
          row.choice === "pending" ? this._t("planTagPending")
            : this._t("planTagLocked"),
          row.choice === "pending" ? "warn" : "muted"));
      }
      col1.appendChild(this._planRow(row, actions));
    }
    if (!notRestored.length) col1.appendChild(this._planEmpty());

    const col2 = this._planColumn("current", current);
    for (const row of current) {
      const actions = row.choices?.includes("out")
        ? [this._planButton(this._t("planActionWithdraw"),
          () => this._setRestoreRowChoice(row.entity_id, "out"), row.entity_id)]
        : [];
      col2.appendChild(this._planRow(row, actions));
    }
    if (!current.length) col2.appendChild(this._planEmpty());

    // The title counts what will be exposed, not the entities removed.
    const col3 = this._planColumn("result", result.filter(row =>
      !(row.case === "removed" && row.choice === "remove")));
    const removable = rows.filter(row => row.case === "removed" &&
      row.choices?.includes("keep"));
    if (removable.length) {
      const question = document.createElement("div");
      question.className = "restore-question";
      const text = document.createElement("p");
      text.textContent = this._tf("planKeepQuestion", {count: removable.length});
      question.appendChild(text);
      const allKept = removable.every(row => row.choice === "keep");
      question.appendChild(allKept
        ? this._planButton(this._t("planRemoveAll"),
          () => this._setRestoreKeepAll(false))
        : this._planButton(this._t("planKeepAll"),
          () => this._setRestoreKeepAll(true)));
      col3.appendChild(question);
    }
    for (const row of result) {
      let actions;
      if (row.case === "removed") {
        actions = row.choice === "remove"
          ? [this._planTag(this._t("planTagRemoved"), "danger"),
            ...(row.choices.includes("keep") ? [this._planButton(
              this._t("planActionKeep"),
              () => this._setRestoreRowChoice(row.entity_id, "keep"),
              row.entity_id)] : [])]
          : [this._planTag(this._t("planTagKept"), "success"),
            this._planButton(this._t("planActionWithdraw"),
              () => this._setRestoreRowChoice(row.entity_id, "remove"),
              row.entity_id)];
      } else if (row.case === "renamed") {
        actions = [this._planTag(this._t("planTagCurrent"), "accent")];
      } else if (row.case === "added") {
        actions = [this._planTag(this._t("planTagAdded"), "accent"),
          ...(row.choices?.includes("out") ? [this._planButton(
            this._t("planActionSkip"),
            () => this._setRestoreRowChoice(row.entity_id, "out"),
            row.entity_id)] : [])];
      } else {
        actions = [this._planTag(this._t("planTagAlready"), "muted")];
      }
      // Rows in the result column only repeat the reason for removals.
      const shown = row.case === "removed" ? row : {...row, case: "result"};
      col3.appendChild(this._planRow(shown, actions));
    }
    if (!result.length) col3.appendChild(this._planEmpty());

    grid.append(col1, col2, col3);
    container.appendChild(grid);

    const footer = document.createElement("div");
    footer.className = "restore-footer";
    footer.appendChild(this._planButton(this._t("planRecommended"),
      () => this._restoreRecommended()));
    container.appendChild(footer);
  }

  _planEmpty() {
    const empty = document.createElement("p");
    empty.className = "restore-col-sub";
    empty.textContent = this._t("planEmpty");
    return empty;
  }

  async _setRestoreSelection(staged, ignoredSet, refreshedSet, options = {}) {
    if (this._restoring || this._applying || this._refreshing ||
        this._generating || this._entityWritePending) return;
    const recommended = options.recommended === true;
    const proposed = [...ignoredSet].sort();
    const proposedRefreshed = [...refreshedSet].sort();
    const same = (left, right) =>
      left.length === right.length && left.every((item, i) => item === right[i]);
    if (!recommended &&
        same(proposed, [...(staged.ignored_entities || [])].sort()) &&
        same(proposedRefreshed,
          [...(staged.refreshed_entities || [])].sort())) return;

    const requestId = (this._loadId || 0) + 1;
    this._loadId = requestId;
    this._restoring = true;
    this._stagedRestore = null;  // Existing approval is now invalid.
    this._review = null;
    this._updateApplyButton();
    this._setStatusKey("backupIgnoreUpdating");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_backup_preview",
        backup_id: staged.backup_id,
        backup_sha256: staged.backup_sha256,
        production_sha256: staged.production_sha256,
        ...(recommended ? {recommended: true} : {
          ignored_entities: proposed,
          refreshed_entities: proposedRefreshed,
        }),
      });
      if (this._loadId !== requestId) return;
      if (result?.mode !== "restore_preview" ||
          !["ok", "missing"].includes(result?.comparison?.status) ||
          !Array.isArray(result.ignored_entities) ||
          (result.refreshed_entities !== undefined &&
            !Array.isArray(result.refreshed_entities)) ||
          !result.label_plan || !result.projection ||
          !/^[0-9a-f]{64}$/.test(result.label_plan_sha256 || "")) {
        throw new Error("Invalid restore Preview response");
      }
      this._stagedRestore = result;
      this._previewContent = result.content;
      this._previewPath = result.path;
      this._applyBlockReason =
        result.comparison.identical_text === true &&
        !(result.label_plan.add?.length || result.label_plan.remove?.length)
          ? this._t("applyNoChanges")
          : this._t("backupPreviewNotExecutable");
      this._applyBlockReasonCode = null;
      this._renderAnalysis(result);
      this._setContent(result.content);
      this._setStatusKey("backupIgnoreSelected", {
        count: (result.ignored_entities || []).length,
        refreshed: (result.refreshed_entities || []).length,
      });
    } catch (error) {
      if (this._loadId === requestId) {
        this._stagedRestore = staged;
        this._renderAnalysis(staged);
        this._setStatusKey("backupIgnoreFailed", {
          error: error.message || String(error),
        });
      }
    } finally {
      this._restoring = false;
      this._updateApplyButton();
    }
  }

  // Ignore/restore controls of the rendered restore Preview follow the
  // panel's busy state; _updateApplyButton re-syncs them after every
  // operation, including the initial restore preparation.
  _restoreControlsBusy() {
    return Boolean(this._restoring || this._applying || this._refreshing ||
      this._generating || this._entityWritePending);
  }

  _syncRestoreControls() {
    const busy = this._restoreControlsBusy();
    for (const control of this._restoreIgnoreControls || []) {
      control.disabled = busy;
    }
  }

  _restoreIgnoreControl(control) {
    control.disabled = this._restoreControlsBusy();
    if (!this._restoreIgnoreControls) this._restoreIgnoreControls = [];
    this._restoreIgnoreControls.push(control);
    return control;
  }

  async _applyStagedRestore() {
    const staged = this._stagedRestore;
    if (!this._hass || !staged || this._applying || this._restoring ||
        this._refreshing || this._generating || this._entityWritePending ||
        staged.projection?.ready !== true ||
        staged.label_plan?.review?.length !== 0 ||
        (staged.comparison?.status === "ok" &&
         staged.comparison?.identical_text === true &&
         !(staged.label_plan?.add?.length || staged.label_plan?.remove?.length)) ||
        !/^[0-9a-f]{64}$/.test(staged.label_plan_sha256 || "")) return;
    const bulkApproved = this._confirmWithBulkRemoval(
      staged, this._restoreConfirmMessage(staged),
    );
    if (bulkApproved === null) return;

    this._applying = true;
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    this._setStatusKey("backupPreviewApplying");
    let applied = null;
    try {
      applied = await this._hass.callWS({
        type: "ha_voice_label_sync/apply_backup_preview",
        backup_id: staged.backup_id,
        backup_sha256: staged.backup_sha256,
        production_sha256: staged.production_sha256,
        label_plan_sha256: staged.label_plan_sha256,
        ignored_entities: staged.ignored_entities || [],
        refreshed_entities: staged.refreshed_entities || [],
        ...(bulkApproved > 0 ? {acknowledged_bulk_removals: bulkApproved} : {}),
      });
      if (applied?.applied !== true || applied?.reconciled !== true) {
        throw new Error("Invalid restore verification response");
      }
      this._stagedRestore = null;
      this._backupList = null;
      this._backupReview = null;
      this._selectedBackup = null;
      this._backupReviewNumber = (this._backupReviewNumber || 0) + 1;
      // The normal Preview must be regenerated from the actual post-restore
      // HA registry; do not keep an obsolete Preview from before restoration.
      await this._hass.callWS({type: "ha_voice_label_sync/generate_preview"});
      await this._loadPreview(true);
      await this._loadEntities();
      this._setStatusKey("backupPreviewApplied", {
        entities: applied.yaml_entities,
        added: applied.label_additions,
        removed: applied.label_removals,
        backup: applied.safety_backup || this._t("backupMissingNoSafety"),
      });
    } catch (error) {
      // The server may have changed production before a partial failure:
      // discard the old approval and load any durable reconciliation guard.
      this._stagedRestore = null;
      await this._loadPreview(true);
      if (applied?.applied === true) {
        this._setStatusKey("backupPreviewApplied", {
          entities: applied.yaml_entities,
          added: applied.label_additions,
          removed: applied.label_removals,
          backup: applied.safety_backup || this._t("backupMissingNoSafety"),
        });
      } else {
        this._setStatusKey("backupPreviewApplyFailed", {
          error: error.message || String(error),
        });
      }
    } finally {
      this._applying = false;
      this._updateApplyButton();
    }
  }

  _bulkRemovalDetails(result) {
    const comparison = result?.comparison;
    const removed = comparison?.removed;
    const added = comparison?.added;
    const before = result?.production_summary?.total;
    if (comparison?.status !== "ok" ||
        !Number.isSafeInteger(before) || before <= 0 ||
        !Array.isArray(removed) || !Array.isArray(added)) return null;
    const count = removed.length;
    if (count < 3 || count * 2 < before) return null;
    return {removed: count, before, after: before - count + added.length};
  }

  // A partial restoration must be visible in the final confirmation itself.
  _restoreConfirmMessage(staged) {
    if (!staged?.restore_summary || !Array.isArray(staged.restore_rows)) {
      return this._t("backupPreviewConfirm");
    }
    const list = items => items.slice(0, 10).join(", ") +
      (items.length > 10 ? ", …" : "");
    const rows = staged.restore_rows;
    const summary = staged.restore_summary;
    const pick = test => rows.filter(test).map(row => row.entity_id).sort();
    const parts = [this._tf("planConfirmSummary", {
      exposed: summary.exposed_after ?? 0, added: summary.added ?? 0,
      already: summary.already_exposed ?? 0,
    })];
    for (const [key, ids] of [
      ["planConfirmRemoved", pick(row =>
        row.case === "removed" && row.choice === "remove")],
      ["planConfirmCurrent", pick(row => row.choice === "current")],
      ["planConfirmOut", pick(row =>
        row.case !== "removed" && row.choice === "out")],
    ]) {
      if (ids.length) {
        parts.push(this._tf(key, {count: ids.length, entities: list(ids)}));
      }
    }
    parts.push(this._t("backupPreviewConfirm"));
    return parts.join("\n\n");
  }

  _confirmWithBulkRemoval(result, regularMessage) {
    const bulk = this._bulkRemovalDetails(result);
    const removalToEmpty =
      result?.mode === "label_preview" &&
      result?.summary?.total === 0 &&
      Number.isSafeInteger(result?.production_summary?.total) &&
      result.production_summary.total > 0 &&
      result?.comparison?.status === "ok" &&
      Array.isArray(result.comparison.removed) &&
      result.comparison.removed.length > 0;
    const message = bulk
      ? this._tf("bulkRemovalConfirm", bulk) + "\n\n" + regularMessage
      : removalToEmpty
        ? this._t("emptySelectionConfirm") + "\n\n" + regularMessage
        : regularMessage;
    if (!window.confirm(message)) return null;
    // Exact count is a one-time intent, not a reusable or saved approval.
    return bulk?.removed || 0;
  }

  async _applyPreview() {
    if (this._stagedRestore?.mode === "label_preview") {
      return this._applyManualLabelPreview();
    }
    if (this._stagedRestore) return this._applyStagedRestore();
    if (!this._hass || !this._review || this._applying || this._restoring || this._refreshing || this._generating || this._entityWritePending) return;

    const review = {...this._review};

    const bulkApproved = this._confirmWithBulkRemoval(
      this._lastAnalysis,
      review.rebuild_missing === true
        ? this._t("missingRebuildConfirm")
        : this._t("applyConfirm") + "\n\n" + this._t("applyWarning"),
    );
    if (bulkApproved === null) return;

    this._applying = true;
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    this._setStatusKey("previewApplying");

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/apply_preview",
        ...review,
        ...(bulkApproved > 0 ? {acknowledged_bulk_removals: bulkApproved} : {}),
      });
      // A successful apply may create a new backup. Invalidate the list
      // immediately so the next Backups visit always reflects disk state.
      this._backupList = null;
      this._backupReview = null;
      this._selectedBackup = null;
      this._backupReviewNumber = (this._backupReviewNumber || 0) + 1;
      this._updateApplyButton();
      // Keep Apply locked throughout the post-apply refresh.
      this._backupRestoreCompleted = false;
      this._renderRestoreWarning();
      await this._loadPreview(true);
      this._setStatusKey(
        review.rebuild_missing === true ? "missingRebuildApplied" : "previewApplied",
        {
          path: result.output_path, bytes: result.bytes_written,
          backupPath: result.backup_path || null, backup: "",
        },
      );
    } catch (error) {
      this._setStatusKey("previewApplyFailed", {error: error.message || String(error)});
    } finally {
      this._applying = false;
      this._updateApplyButton();
    }
  }

  async _copyPreview() {
    if (!this._previewContent) {
      this._setStatusKey("noYaml");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this._previewContent);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = this._previewContent;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) throw new Error(this._t("copyUnsupported"));
      }
      this._setStatusKey("yamlCopied", {path: this._previewPath});
    } catch (error) {
      this._setStatusKey("copyFailed", {error: error.message || String(error)});
    }
  }

  // The server uses the French "Sans pièce" bucket for entities without an
  // area; always display it in the panel language.
  _roomLabel(room) {
    return !room || room === "Sans pièce" ? this._t("noArea") : room;
  }

  _addMetric(parent, label, value) {
    const card = document.createElement("div");
    card.className = "metric";
    const count = document.createElement("strong");
    count.textContent = String(value);
    const caption = document.createElement("span");
    caption.textContent = label;
    card.append(count, caption);
    parent.appendChild(card);
  }

  _addGroup(parent, heading, items) {
    if (!items.length) return;
    const section = document.createElement("div");
    section.className = "change-group";
    const title = document.createElement("h3");
    title.textContent = heading;
    section.appendChild(title);
    const list = document.createElement("ul");
    for (const item of items) {
      const li = document.createElement("li");
      if (typeof item === "string") {
        li.textContent = item;
      } else {
        const lines = Object.entries(item.fields || {}).map(([field, values]) =>
          `${field}: ${values.before === null ? this._t("absentValue") : values.before} → ${values.after === null ? this._t("absentValue") : values.after}`
        );
        li.textContent = `${item.entity_id}\n  ${lines.join("\n  ")}`;
        li.style.whiteSpace = "pre-wrap";
      }
      list.appendChild(li);
    }
    section.appendChild(list);
    parent.appendChild(section);
  }

  // Why an entity leaves the generated YAML. Display only, from data the
  // panel already has; returns null when the cause cannot be determined.
  _removalReason(entityId) {
    const staged = this._stagedRestore;
    if (staged?.mode === "restore_preview") {
      const row = (staged.restore_rows || []).find(r => r.entity_id === entityId);
      if (row?.case === "removed") {
        return this._t(row.reason === "no_label"
          ? "removalReasonNoLabel" : "removalReasonBackup");
      }
    }
    if (staged?.label_plan?.remove?.includes(entityId)) {
      return this._t("removalReasonProposal");
    }
    if (!this._entityCatalog) return null;
    const entity = (this._entityCatalog.entities || [])
      .find(item => item.entity_id === entityId);
    if (!entity) return this._t("removalReasonMissing");
    if (entity.eligible !== true) {
      const keys = {
        domain_not_enabled: "reasonDomain",
        unsupported_device_class: "reasonClass",
        disabled: "reasonDisabled",
        hidden: "reasonHidden",
        entity_category: "reasonCategory",
      };
      return this._tf("removalReasonIneligible", {
        detail: this._t(keys[entity.exclusion_reason] || "notEligible"),
      });
    }
    if (entity.has_label !== true) return this._t("removalReasonNoLabel");
    return null;
  }

  _eligibilityExplanation(reason) {
    const keys = {
      domain_not_enabled: "reasonDomain",
      unsupported_device_class: "reasonClass",
      disabled: "reasonDisabled",
      hidden: "reasonHidden",
      entity_category: "reasonCategory",
    };
    return `${this._t("exclusionIntro")} ${this._t(keys[reason] || "notEligible")} ${this._t("exclusionFootnote")}`;
  }

  _renderExclusions(parent, exclusions) {
    if (!exclusions || !Array.isArray(exclusions.entities)) return;

    const entities = exclusions.entities;
    const section = document.createElement("section");
    section.className = "change-group";

    const heading = document.createElement("h2");
    heading.textContent = this._tf("excludedTitle", {count: entities.length});
    section.appendChild(heading);

    const explanation = document.createElement("p");
    explanation.textContent =
      this._t("excludedExplanation");
    section.appendChild(explanation);

    if (entities.length === 0) {
      const success = document.createElement("p");
      success.textContent = this._t("excludedEmpty");
      section.appendChild(success);
    } else {
      const list = document.createElement("ul");

      for (const entity of entities) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = entity.name || entity.entity_id;

        const identifier = document.createElement("div");
        identifier.textContent = entity.entity_id;

        const reason = document.createElement("div");
        reason.textContent =
          this._eligibilityExplanation(entity.reason);

        item.append(title, identifier, reason);
        list.appendChild(item);
      }

      section.appendChild(list);
    }

    const note = document.createElement("p");
    note.className = "diagnostic-note";
    note.textContent =
      this._t("excludedNote");
    section.appendChild(note);

    parent.appendChild(section);
  }

  _renderPreviewChanges(result) {
    const panel = this.querySelector("#previewChanges");
    if (!panel) return;
    panel.replaceChildren();

    const heading = document.createElement("h2");
    const isRecoveryPreview = this._stagedRestore?.recovery === true;
    heading.textContent = this._t(
      isRecoveryPreview ? "recoveryDiffTitle" : "changesProposed"
    );
    panel.appendChild(heading);

    // An ordinary generation based on old labels is NOT a recovery plan.
    // Before the first reviewed recovery, show no pending operations.
    if (this._recoveryPending && this._stagedRestore?.recovery !== true) {
      const counters = document.createElement("div");
      counters.className = "metrics";
      for (const key of ["added", "removed", "modified"]) {
        this._addMetric(counters, this._t(key), 0);
      }
      panel.appendChild(counters);
      const note = document.createElement("p");
      note.className = "diagnostic-note";
      note.textContent = this._t("assistantRecoveryNotPrepared");
      panel.appendChild(note);
      const back = document.createElement("button");
      back.type = "button";
      back.className = "secondary";
      back.textContent = this._t("assistantRecoveryPreviewBack");
      back.addEventListener("click", () => this._activateTab("migration"));
      panel.appendChild(back);
      return;
    }

    if (!result.available || !result.summary) {
      const note = document.createElement("p");
      note.className = "diagnostic-note";
      note.textContent = result.error || this._t("previewMissing");
      panel.appendChild(note);
      return;
    }

    const comparison = result.comparison || {status: "missing"};
    if (comparison.status !== "ok") {
      const note = document.createElement("p");
      note.className = "diagnostic-note";
      const managedMissing = result.ownership?.reason_code ===
        "managed_output_missing";
      const missingBackup = this._stagedRestore?.mode === "restore_preview" &&
        this._stagedRestore.production_missing === true;
      note.textContent = comparison.status === "missing"
        ? missingBackup
          ? this._tf("backupMissingPreview", {count: result.summary.total})
          : managedMissing
          ? this._tf("missingRebuildReview", {count: result.summary.total})
          : this._onboardingMode === "new" && result.summary.total > 0
            ? this._tf("initialYamlPreview", {count: result.summary.total})
            : this._t("firstProduction")
        : this._tf("comparisonFailed", {
            status: comparison.status,
            reason: comparison.reason || this._t("unreadableFile")
          });
      panel.appendChild(note);
      if (managedMissing) {
        const backups = document.createElement("button");
        backups.type = "button";
        backups.className = "secondary";
        backups.textContent = this._t("missingRebuildBackups");
        backups.addEventListener("click", () => this._activateTab("backups"));
        panel.appendChild(backups);
      }
      return;
    }

    if (isRecoveryPreview &&
        Number.isSafeInteger(result.production_summary?.total) &&
        Number.isSafeInteger(result.summary.total)) {
      const summary = document.createElement("p");
      summary.className = "diagnostic-note";
      summary.textContent = this._tf("recoveryDiffSummary", {
        before: result.production_summary.total,
        after: result.summary.total,
      });
      panel.appendChild(summary);
    }

    const added = Array.isArray(comparison.added) ? comparison.added : [];
    const removed = Array.isArray(comparison.removed) ? comparison.removed : [];
    const modified = Array.isArray(comparison.modified) ? comparison.modified : [];
    // Prevent an ordinary label-generated Preview from looking like a
    // successful legacy YAML import. This is only a UI warning: all
    // existing ownership and Apply guards remain in force.
    const bulkRemoval = this._bulkRemovalDetails(result);
    if (bulkRemoval) {
      const caution = document.createElement("p");
      caution.className = "diagnostic-note";
      caution.setAttribute("role", "alert");
      caution.textContent = this._onboardingMode === "existing"
        ? this._tf("importPreviewDanger", {
            count: bulkRemoval.removed, total: bulkRemoval.before,
          })
        : this._tf("bulkRemovalWarning", bulkRemoval);
      panel.appendChild(caution);
      if (this._onboardingMode === "existing") {
        const back = document.createElement("button");
        back.type = "button";
        back.className = "secondary";
        back.textContent = this._t("importPreviewReturn");
        back.addEventListener("click", () => this._activateTab("migration"));
        panel.appendChild(back);
      }
    }
    const counters = document.createElement("div");
    counters.className = "metrics";
    for (const [key, count] of [
      ["added", added.length], ["removed", removed.length], ["modified", modified.length]
    ]) {
      this._addMetric(counters, this._t(key), count);
    }
    panel.appendChild(counters);

    if (added.length + removed.length + modified.length === 0) {
      const note = document.createElement("p");
      note.className = "diagnostic-note";
      note.textContent = comparison.identical_text
        ? this._t("noChanges")
        : this._t("identicalEntities");
      panel.appendChild(note);
      return;
    }

    const intro = document.createElement("p");
    intro.className = "diagnostic-note";
    intro.textContent = this._t("changesIntro");
    panel.appendChild(intro);

    const names = new Map((result.summary.entities || []).map(
      (entity) => [entity.entity_id, entity.name]
    ));
    for (const [key, items] of [
      ["entitiesAdded", added], ["entitiesRemoved", removed], ["entitiesModified", modified]
    ]) {
      if (!items.length) continue;
      const details = document.createElement("details");
      details.className = "preview-change-group";
      const summary = document.createElement("summary");
      summary.textContent = `${this._t(key)} (${items.length})`;
      details.appendChild(summary);

      if (key === "entitiesRemoved") {
        const warning = document.createElement("p");
        warning.className = "diagnostic-note";
        warning.textContent = this._t("removalNote");
        details.appendChild(warning);
      }

      const list = document.createElement("div");
      list.className = "preview-change-list";
      for (const item of items) {
        const entityId = typeof item === "string" ? item : item.entity_id;
        const row = document.createElement("div");
        row.className = "preview-change-item";

        // Reuse Home Assistant's native More Info dialog, as in the
        // Statistics and Entity Management tabs. This is read-only.
        const entityButton = document.createElement("button");
        entityButton.type = "button";
        entityButton.className = "entity-more-info";
        entityButton.setAttribute("aria-label", this._tf("entityMoreInfo", {
          entity: names.get(entityId) || entityId
        }));
        const name = document.createElement("strong");
        name.textContent = names.get(entityId) || entityId;
        entityButton.appendChild(name);
        if (names.get(entityId) && names.get(entityId) !== entityId) {
          const id = document.createElement("small");
          id.textContent = entityId;
          entityButton.appendChild(id);
        }
        entityButton.addEventListener("click", () => {
          this._openEntityDetails(entityId);
        });
        row.appendChild(entityButton);

        if (key === "entitiesRemoved") {
          const reason = this._removalReason(entityId);
          if (reason) {
            const why = document.createElement("small");
            why.className = "preview-removal-reason";
            why.textContent = reason;
            row.appendChild(why);
          }
        }

        if (typeof item !== "string") {
          for (const [field, values] of Object.entries(item.fields || {})) {
            const change = document.createElement("div");
            change.className = "preview-field-change";
            const fieldName = document.createElement("strong");
            fieldName.textContent = field;
            const before = values.before == null ? this._t("absentValue") : values.before;
            const after = values.after == null ? this._t("absentValue") : values.after;
            const comparisonText = document.createElement("span");
            comparisonText.textContent =
              `${this._t("fieldBefore")}: ${before}  →  ${this._t("fieldAfter")}: ${after}`;
            change.append(fieldName, comparisonText);
            row.appendChild(change);
          }
        }
        list.appendChild(row);
      }
      details.appendChild(list);
      panel.appendChild(details);
    }
  }

  _productionStatus(entityId, result) {
    if (this._recoveryPending && this._stagedRestore?.recovery !== true) {
      return "unknown";
    }
    const comparison = result?.comparison;
    // A missing, invalid or unreviewable comparison is not proof of
    // production presence. Do not show a green badge in that case.
    if (!result?.available || !result.production_summary || comparison?.status !== "ok" ||
        !Array.isArray(comparison.added) ||
        !Array.isArray(comparison.removed) ||
        !Array.isArray(comparison.modified)) {
      return "unknown";
    }
    const hasEntity = (entries) => entries.some(
      (item) => (typeof item === "string" ? item : item?.entity_id) === entityId
    );
    if (hasEntity(comparison.removed)) return "removal";
    if (hasEntity(comparison.modified)) return "modified";
    if (hasEntity(comparison.added)) return "pending";
    // These rows are read from the actual production file.
    return "validated";
  }

  _renderStagedRestorePlan() {
    const previewNotice = this.querySelector("#backupPreviewNotice");
    if (previewNotice) {
      previewNotice.hidden = !this._stagedRestore;
      previewNotice.replaceChildren();
      if (this._stagedRestore?.mode === "saved_draft_blocked") {
        const warning = document.createElement("p");
        warning.className = "diagnostic-note";
        warning.textContent = this._t("savedDraftBlocked");
        previewNotice.appendChild(warning);
        return;
      }
      if (this._stagedRestore?.mode === "restore_preview" &&
          Array.isArray(this._stagedRestore.restore_rows)) {
        this._restoreIgnoreControls = [];
        this._renderRestorePlan(previewNotice);
        const technical = document.createElement("details");
        technical.open = this._restoreTechnicalOpen === true;
        technical.addEventListener("toggle", () => {
          this._restoreTechnicalOpen = technical.open;
        });
        const heading = document.createElement("summary");
        heading.textContent = this._t("planTechDetails");
        technical.appendChild(heading);
        this._appendLabelPlanDetails(
          technical, this._stagedRestore.label_plan || {});
        previewNotice.appendChild(technical);
        return;
      }
      if (this._stagedRestore) {
        const plan = this._stagedRestore.label_plan || {};
        const isManual = this._stagedRestore.mode === "label_preview";
        const description = document.createElement("p");
        description.textContent = this._t(
          isManual ? "manualLabelHelp" : "backupPreviewNotExecutable"
        ) + " " + this._tf("backupPreviewLabels", {
            added: plan.add?.length || 0,
            removed: plan.remove?.length || 0,
            review: plan.review?.length || 0,
          });
        previewNotice.appendChild(description);
        // The actual proposed HA-label operations must be visible individually,
        // including exceptional entities. The Preview is never an implicit write.
        this._appendLabelPlanDetails(previewNotice, plan);
      }
    }
  }

  _appendLabelPlanDetails(parent, plan) {
    for (const [action, label, items] of [
      ["add", "backupLabelAdd", plan.add || []],
      ["remove", "backupLabelRemove", plan.remove || []],
      ["review", "backupLabelReview", plan.review || []],
    ]) {
      if (!items.length) continue;
      const details = document.createElement("details");
      details.className = "domain-details";
      const heading = document.createElement("summary");
      heading.textContent = `${this._t(label)} (${items.length})`;
      details.appendChild(heading);
      const list = document.createElement("ul");
      for (const item of items) {
        const row = document.createElement("li");
        const entityId = typeof item === "string" ? item : item.entity_id;
        row.textContent = action === "review"
          ? `${entityId} — ${item.reason || this._t("unknownHVLS")}`
          : entityId;
        list.appendChild(row);
      }
      details.appendChild(list);
      parent.appendChild(details);
    }
  }

  _renderAnalysis(result) {
    const panel = this.querySelector("#analysis");
    // Statistics may contain expanded domain/room lists with checkboxes.
    // Preserve them while a proposal refreshes its counters and statuses.
    const openGroups = new Set(
      Array.from(panel.querySelectorAll?.("details[data-stats-group]") || [])
        .filter(group => group.open)
        .map(group => group.dataset.statsGroup)
    );
    panel.replaceChildren();
    this.querySelector("#exclusions").replaceChildren();
    this.querySelector("#unifiedDiff").textContent = "";
    this.querySelector("#rawDiffDetails").hidden = true;
    this._lastAnalysis = result;
    this._updateTabLabels();
    this._syncExclusionsTab(result.exclusions);
    this._renderExclusions(this.querySelector("#exclusions"), result.exclusions);
    this._renderPreviewChanges(result);
    this._renderRestoreWarning();
    this._renderRestoreReconciliation();
    this._renderStagedRestorePlan();
    // The dashboard describes what is on disk, not the changes proposed by
    // Preview. A missing/unreadable production must never show Preview counts.
    const stats = result.production_summary;
    if (stats) {
    const productionStatuses = new Map((stats.entities || []).map(
      (entity) => [entity.entity_id, this._productionStatus(entity.entity_id, result)]
    ));
    const metrics = document.createElement("div");
    metrics.className = "metrics";
    this._addMetric(metrics, this._t("metricEntities"), stats.total);
    this._addMetric(metrics, this._t("metricRooms"), stats.rooms);
    this._addMetric(metrics, this._t("noArea"), stats.without_room);
    panel.appendChild(metrics);

    const breakdown = document.createElement("div");
    breakdown.className = "breakdowns";
    for (const [type, title, values] of [["domain", this._t("byDomain"), stats.domains], ["area", this._t("byArea"), stats.by_room]]) {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      heading.textContent = title;
      section.appendChild(heading);
      // "Sans pièce" is a fallback bucket, not a real room: list it last.
      // Keep the original ordering of actual rooms and domains unchanged.
      const entries = Object.entries(values || {});
      if (type === "area") {
        const unassigned = entries.find(([name]) =>
          name === "Sans pièce" || name === this._t("noArea")
        );
        if (unassigned) {
          entries.splice(entries.indexOf(unassigned), 1);
          entries.push(unassigned);
        }
      }
      for (const [name, count] of entries) {
        const row = document.createElement("div");
        row.className = "breakdown-row";
        const label = document.createElement("span");
        label.textContent = type === "area" ? this._roomLabel(name) : name;
        const total = document.createElement("strong");
        total.textContent = String(count);
        row.append(label, total);
        // The domain and room views share the same expandable entity list.
        {
          const details = document.createElement("details");
          details.className = "domain-details";
          details.dataset.statsGroup = JSON.stringify([type, name]);
          details.open = openGroups.has(details.dataset.statsGroup);

          const summary = document.createElement("summary");
          summary.className = "breakdown-row";
          summary.append(label, total);
          details.appendChild(summary);

          const entities = (stats.entities || []).filter(
            (entity) => type === "domain"
              ? entity.domain === name
              : (entity.room || this._t("noArea")) === name
          );

          const list = document.createElement("div");
          list.className = "domain-entity-list";

          for (const entity of entities) {
            const item = document.createElement("div");
            item.className = "domain-entity-item";

            // The entity name opens HA More Info; a separate checkbox
            // removes its HVLS label using the existing confirmed workflow.
            const entityButton = document.createElement("button");
            entityButton.type = "button";
            entityButton.className = "entity-more-info";
            entityButton.setAttribute("aria-label", this._tf("entityMoreInfo", {
              entity: entity.name || entity.entity_id
            }));

            const friendlyName = document.createElement("strong");
            friendlyName.textContent = entity.name || entity.entity_id;

            const info = document.createElement("small");
            info.textContent = type === "domain"
              ? `${entity.entity_id} · ${this._roomLabel(entity.room)}`
              : `${entity.entity_id} · ${entity.domain}`;

            entityButton.append(friendlyName, info);
            entityButton.addEventListener("click", () => {
              this._openEntityDetails(entity.entity_id);
            });
            const itemRow = document.createElement("div");
            itemRow.className = "stats-entity-row";
            itemRow.appendChild(entityButton);

            // Statistics are derived from the last Preview, which can lag
            // behind live HA. Never act on a Preview-only label assumption.
            const catalogEntity = (this._entityCatalog?.entities || []).find(
              (current) => current.entity_id === entity.entity_id
            );
            if (catalogEntity?.has_label === true) {
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.className = "entity-hvls-checkbox";
              checkbox.checked = this._manualLabelChanges?.has(entity.entity_id)
                ? this._manualLabelChanges.get(entity.entity_id) : true;
              checkbox.dataset.ineligible = "false";
              checkbox.disabled = Boolean(this._entityWritePending);
              checkbox.setAttribute("aria-label", this._tf("hvlsLabelAria", {
                entity: entity.entity_id
              }));
              checkbox.addEventListener("change", () => {
                this._setEntityLabel(catalogEntity, checkbox);
              });
              itemRow.appendChild(this._createEntityHVLSControl(
                checkbox, this._manualLabelChanges?.has(entity.entity_id) === true
              ));
            }

            // A removal remains visible even if its HA label is already
            // absent: the YAML production still contains this entity.
            const status = productionStatuses.get(entity.entity_id) || "unknown";
            const statusKey = {
              validated: "productionValidated",
              pending: "productionPending",
              modified: "productionModified",
              removal: "productionRemoval",
              unknown: "productionUnknown",
            }[status];
            const indicator = document.createElement("span");
            indicator.className = `production-status production-status--${status}`;
            indicator.textContent = status === "validated" ? "✓" :
              status === "removal" ? "−" : status === "unknown" ? "?" : "•";
            indicator.title = this._t(statusKey);
            indicator.setAttribute("role", "img");
            indicator.setAttribute("aria-label", this._t(statusKey));
            itemRow.appendChild(indicator);
            item.appendChild(itemRow);
            list.appendChild(item);
          }

          details.appendChild(list);
          section.appendChild(details);
        }
      }
      if (type === "domain") {
        const excluded = result.exclusions?.entities || [];
        const unsupported = {};

        for (const entity of excluded) {
          if (entity.reason !== "domain_not_enabled") continue;
          if (!entity.domain) continue;

          unsupported[entity.domain] =
            (unsupported[entity.domain] || 0) + 1;
        }

        const entries = Object.entries(unsupported)
          .sort(([a], [b]) => a.localeCompare(b));

        // No empty diagnostic section in Statistics. Do not imply that every
        // HA domain is supported merely because no labeled entity is excluded.
        if (entries.length > 0) {
          const subtitle = document.createElement("h3");
          subtitle.textContent = this._t("disabledDomains");
          subtitle.style.marginTop = "20px";
          section.appendChild(subtitle);

          for (const [name, count] of entries) {
            const row = document.createElement("div");
            row.className = "breakdown-row";

            const label = document.createElement("span");
            label.textContent = name;

            const total = document.createElement("strong");
            total.textContent = String(count);

            row.append(label, total);
            section.appendChild(row);
          }

          const note = document.createElement("p");
          note.className = "diagnostic-note";
          note.textContent = this._t("labeledOnly");
          section.appendChild(note);
        }
      }

      breakdown.appendChild(section);
    }
    panel.appendChild(breakdown);
    } else {
      const unavailable = document.createElement("p");
      unavailable.className = "diagnostic-note";
      unavailable.textContent = this._t("productionStatsUnavailable");
      panel.appendChild(unavailable);
      if ((this._onboardingMode === "new" ||
           result.ownership?.reason_code === "managed_output_missing") &&
          this._entityCatalog && !this._recoveryPending) {
        const selected = this._entityCatalog.entities.filter(
          entity => entity.has_label === true && entity.eligible === true
        ).length;
        if (selected > 0) {
          const explanation = document.createElement("p");
          explanation.className = "diagnostic-note";
          explanation.textContent = this._tf(
            result.ownership?.reason_code === "managed_output_missing"
              ? "missingRebuildDetected" : "initialLabelsDetected",
            {count: selected},
          );
          panel.appendChild(explanation);
          const prepare = document.createElement("button");
          prepare.type = "button";
          prepare.className = "secondary";
          const pending = this._stagedRestore?.mode === "label_preview"
            ? this._stagedRestore.changes?.length || 0 : 0;
          prepare.textContent = this._tf(
            pending ? "initialPendingPreview" : "initialLabelsPreview",
            {count: pending || selected},
          );
          prepare.disabled = this._generating || this._applying ||
            this._entityWritePending || this._restoring;
          prepare.addEventListener("click", async () => {
            if (this._stagedRestore?.mode === "label_preview") {
              this._activateTab("preview");
              return;
            }
            await this._generatePreview();
            if (this._review) this._activateTab("preview");
          });
          panel.appendChild(prepare);
        }
      }
    }

    const comparison = result.comparison || {status: "missing"};
    const heading = document.createElement("h2");
    heading.textContent = this._t("comparisonTitle");
    panel.appendChild(heading);
    if (this._recoveryPending && this._stagedRestore?.recovery !== true) {
      const counters = document.createElement("div");
      counters.className = "metrics";
      for (const key of ["added", "removed", "modified"]) {
        this._addMetric(counters, this._t(key), 0);
      }
      panel.appendChild(counters);
      const note = document.createElement("p");
      note.className = "diagnostic-note";
      note.textContent = this._t("assistantRecoveryNotPrepared");
      panel.appendChild(note);
      return;
    }
    const pendingCount = this._pendingChangeCount();
    // The Statistics hint reflects the same pending proposal as the Preview
    // tab, whether it originated here or in Entity Management. It is only
    // a navigation hint: no auto-Apply or automatic tab switching.
    if (pendingCount > 0 && (this._review ||
        (this._stagedRestore &&
         this._stagedRestore.mode !== "saved_draft_blocked"))) {
      const alert = document.createElement("div");
      alert.className = "preview-pending-alert";
      alert.setAttribute("role", "status");
      const message = document.createElement("strong");
      message.textContent = this._tf("pendingChanges", {count: pendingCount});
      const action = document.createElement("button");
      action.type = "button";
      action.className = "secondary";
      action.textContent = this._t("pendingAction");
      action.addEventListener("click", () => this._activateTab("preview"));
      alert.append(message, action);
      panel.appendChild(alert);
    }
    if (comparison.status !== "ok") {
      const warning = document.createElement("p");
      warning.textContent = comparison.status === "missing"
        ? this._t("comparisonMissing")
        : this._tf("comparisonFailed", {status: comparison.status, reason: comparison.reason || this._t("unreadableFile")});
      panel.appendChild(warning);
      return;
    }
    const counters = document.createElement("div");
    counters.className = "metrics";
    this._addMetric(counters, this._t("added"), comparison.added.length);
    this._addMetric(counters, this._t("removed"), comparison.removed.length);
    this._addMetric(counters, this._t("modified"), comparison.modified.length);
    this._addMetric(counters, this._t("unchanged"), comparison.unchanged);
    panel.appendChild(counters);

    if (comparison.identical_entities) {
      const ok = document.createElement("p");
      ok.textContent = comparison.identical_text
        ? this._t("identicalYaml")
        : this._t("identicalEntities");
      panel.appendChild(ok);
    }

    if (comparison.unified_diff) {
      this.querySelector("#rawDiffDetails").hidden = false;
      this.querySelector("#unifiedDiff").textContent = comparison.unified_diff;
    }
  }

  _render() {
    this.innerHTML = `
      <style>
        :host { display:block; padding:24px; box-sizing:border-box; }
        .container { max-width:1200px; margin:0 auto; }
        .header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
        h1 { margin:0; font-size:28px; font-weight:500; }
        .migration-controls { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
        .migration-controls select { max-width: 220px; font: inherit; }
        .migration-controls label { display: flex; gap: 4px; align-items: center; }
        #assistantAdoption { border-top: 1px solid var(--divider-color); padding-top: 12px; margin-top: 16px; }
        #assistantAdoption[hidden] { display: none; }
        #assistantAdoptRows { max-height: 20rem; overflow-y: auto; overflow-wrap: anywhere; }
        #assistantAdoptRows p { margin: 5px 0; }
        #assistantFilePath {
          flex: 1 1 30rem;
          min-width: min(100%, 18rem);
          width: min(100%, 42rem);
          max-width: 100%;
          box-sizing: border-box;
        }
        .assistant-file-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 145px), 1fr));
          gap: 10px;
          margin: 12px 0;
        }
        .assistant-file-metrics[hidden] { display: none; }
        .assistant-file-metric {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 12px;
        }
        .assistant-file-metric strong { font-size: 1.4rem; font-weight: 600; }
        .assistant-file-metric span { font-size: 0.83rem; color: var(--secondary-text-color); }
        #assistantProvenance { border-top: 1px solid var(--divider-color); margin-top: 16px; padding-top: 12px; }
        #assistantProvenance[hidden] { display: none; }
        .assistant-provenance-choice[aria-pressed="true"] {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        .assistant-provenance-facts { display: grid; gap: 12px; margin: 16px 0; }
        .assistant-provenance-card {
          padding: 12px 16px;
          border: 1px solid var(--divider-color);
          border-radius: 10px;
          overflow-wrap: anywhere;
        }
        .assistant-provenance-card h4 { margin: 0 0 8px; font-size: 0.95rem; }
        .assistant-provenance-card p { margin: 0; line-height: 1.55; }
        #assistantProvenanceAnomalies:not([hidden]) { display: block; margin-top: 8px; }
        #assistantProvenanceHelp { margin-top: 12px; }
        #assistantProvenanceHelp[hidden] { display: none; }
        #assistantProvenanceHelp ol { padding-left: 22px; line-height: 1.55; }
        #assistantProvenanceHelp li { margin-bottom: 10px; }
        #assistantHistorical { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--divider-color); }
        #assistantHistorical[hidden] { display: none; }
        .assistant-history-result { overflow-wrap: anywhere; line-height: 1.5; }
        .assistant-history-result p { margin: 8px 0; }
        #assistantProvenanceHelp code { overflow-wrap: anywhere; }
        .migration-review-note { color: var(--secondary-text-color); }
        .hvls-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .menu-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          padding: 0;
          font-size: 26px;
          line-height: 1;
          flex-shrink: 0;
          background: transparent;
          color: var(--primary-text-color);
        }
        .menu-toggle[hidden] { display: none; }
        .menu-toggle:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        .hvls-brand img {
          width: 44px;
          height: 44px;
          object-fit: contain;
          flex-shrink: 0;
        }
        h2 { font-size:20px; margin-top:24px; }
        h3 { font-size:16px; margin:12px 0; }
        .actions { display:flex; gap:8px; }
        button { border:0; border-radius:10px; padding:10px 16px; cursor:pointer; background:var(--primary-color); color:var(--text-primary-color); font:inherit; }
        button.icon-action {
          width:44px; height:44px; padding:0; font-size:25px;
          display:inline-flex; justify-content:center; align-items:center;
        }
        button.icon-action:focus-visible {
          outline:2px solid var(--primary-color); outline-offset:2px;
        }
        button.secondary { background:var(--secondary-background-color); color:var(--primary-text-color); }
        #generate { background:#1976d2; color:#ffffff; }
        #apply { background:#238455; color:#ffffff; }

        button:disabled { opacity:0.45; cursor:not-allowed; }
        #status { margin-bottom:16px; color:var(--secondary-text-color); overflow-wrap:anywhere; }
        .metrics { display:flex; flex-wrap:wrap; gap:12px; margin:16px 0; }
        .metric { min-width:110px; flex:1; display:flex; flex-direction:column; gap:6px; background:var(--card-background-color); border:1px solid var(--divider-color); border-radius:12px; padding:16px; }
        .metric strong { font-size:26px; }
        .metric span { color:var(--secondary-text-color); font-size:13px; }
        .restore-plan-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin:12px 0; align-items:start; }
        .restore-col { background:var(--card-background-color); border:1px solid var(--divider-color); border-radius:12px; padding:12px; min-width:0; }
        .restore-col-head { display:flex; align-items:center; gap:6px; }
        .restore-col-head h3 { margin:0; font-size:15px; font-weight:500; }
        .restore-info { border:none; background:none; color:var(--secondary-text-color); cursor:pointer; font-size:16px; padding:0 4px; }
        .restore-help { margin:6px 0 0; padding:8px; border-radius:8px; background:var(--secondary-background-color); font-size:13px; line-height:1.45; }
        .restore-col-sub { margin:4px 0 8px; color:var(--secondary-text-color); font-size:12px; }
        .restore-row { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:6px 8px; border-top:1px solid var(--divider-color); padding:6px 0; }
        .restore-row-text { min-width:0; flex:1 1 160px; }
        .restore-row-id { display:block; font-family:var(--code-font-family, monospace); font-size:12px; overflow-wrap:anywhere; }
        .restore-row-why { display:block; color:var(--secondary-text-color); font-size:12px; }
        .restore-row-actions { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
        .restore-tag { font-size:11px; padding:2px 8px; border-radius:8px; white-space:nowrap; border:1px solid var(--divider-color); }
        .restore-tag-accent { color:var(--primary-color); border-color:var(--primary-color); }
        .restore-tag-danger { color:var(--error-color); border-color:var(--error-color); }
        .restore-tag-success { color:var(--success-color); border-color:var(--success-color); }
        .restore-tag-warn { color:var(--warning-color); border-color:var(--warning-color); }
        .restore-tag-muted { color:var(--secondary-text-color); }
        .restore-question { margin:4px 0 8px; padding:8px; border-radius:8px; border:1px solid var(--error-color); font-size:13px; }
        .restore-question p { margin:0 0 6px; }
        .restore-warning { color:var(--warning-color); }
        .restore-footer { display:flex; justify-content:flex-end; margin:4px 0 12px; }
        .breakdowns { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
        .breakdowns section { padding:12px 16px; background:var(--card-background-color); border-radius:12px; }
        .breakdown-row { display:flex; justify-content:space-between; gap:12px; padding:5px 0; border-bottom:1px solid var(--divider-color); }

        /* Expandable domain lists */
        .domain-details > summary {
          display: flex;
          align-items: center;
          cursor: pointer;
          list-style: none;
          gap: 10px;
        }
        .domain-details > summary::-webkit-details-marker {
          display: none;
        }
        .domain-details > summary::before {
          content: "▸";
          color: var(--secondary-text-color);
          transition: transform 0.15s ease;
        }
        .domain-details[open] > summary::before {
          transform: rotate(90deg);
        }
        .domain-details > summary strong {
          margin-left: auto;
        }
        .domain-entity-list {
          padding: 8px 12px 10px 24px;
          background: var(--secondary-background-color);
          border-radius: 6px;
          margin: 4px 0 8px;
        }
        .domain-entity-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 7px 0;
          border-bottom: 1px solid var(--divider-color);
          overflow-wrap: anywhere;
        }
        .domain-entity-item:last-child {
          border-bottom: none;
        }
        .stats-entity-row {
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }
        .stats-entity-row > .entity-more-info { flex:1; min-width:0; }
        .stats-entity-row > .entity-hvls-control-area { flex-shrink:0; }
        .production-status {
          display:inline-flex; align-items:center; justify-content:center;
          width:15px; min-width:15px; height:15px;
          border-radius:50%; font-size:12px; font-weight:700;
          line-height:1; flex-shrink:0;
        }
        .production-status--validated { color:var(--success-color, #238455); }
        .production-status--pending, .production-status--modified {
          color:var(--warning-color, #d89a22);
        }
        .production-status--removal { color:var(--error-color, #d32f2f); }
        .production-status--unknown { color:var(--secondary-text-color); }
        .domain-entity-item strong {
          font-size: 13px;
        }
        .domain-entity-item .entity-more-info {
          padding: 4px 6px;
        }
        .domain-entity-item small {
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        #entityManager {
          margin: 24px 0;
          padding: 16px;
          background: var(--card-background-color);
          border-radius: 12px;
          border: 1px solid var(--divider-color);
        }
        .entity-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .entity-manager-header h2 { margin: 0; }
        .entity-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 14px 0;
        }
        .entity-controls input,
        .entity-controls select {
          padding: 10px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }
        .entity-controls input { flex: 1; min-width: 200px; }
        .entity-controls select { min-width: 170px; }
        .entity-catalog-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 4px;
          border-bottom: 1px solid var(--divider-color);
        }
        .entity-catalog-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .entity-catalog-info small {
          color: var(--secondary-text-color);
        }
        .entity-catalog-label {
          white-space: nowrap;
          font-size: 12px;
          flex-shrink: 0;
        }
        .entity-catalog-label.active {
          color: var(--success-color, #238455);
        }
        #entityMore { margin-top: 12px; }

        .hvls-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 22px 0 16px;
          border-bottom: 1px solid var(--divider-color);
        }
        .hvls-tab {
          background: transparent;
          color: var(--primary-text-color);
          border-radius: 8px 8px 0 0;
          border-bottom: 3px solid transparent;
          padding: 12px 14px;
        }
        .hvls-tab[hidden] { display: none !important; }
        .hvls-tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
          font-weight: 600;
        }
        .hvls-tab.has-pending,
        .hvls-tab.has-pending.active {
          color: var(--error-color, #d32f2f);
          border-bottom-color: var(--error-color, #d32f2f);
          font-weight: 700;
        }
        .hvls-tab-panel[hidden] { display: none !important; }
        #entityManager { margin-top: 0; }
        .backup-item { display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--divider-color); cursor:pointer; }
        .backup-item input { width:18px; height:18px; }
        #backupDiff { margin:20px 0; }
        #restoreBackup { background:#b35427; color:#fff; }

        .entity-catalog-domain {
          margin: 6px 0;
          border-bottom: 1px solid var(--divider-color);
        }
        .entity-catalog-domain > summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 8px;
          font-weight: 500;
        }
        .entity-catalog-domain > summary span {
          color: var(--secondary-text-color);
          font-size: 13px;
        }
        .entity-catalog-group {
          padding: 4px 12px 12px 24px;
          background: var(--secondary-background-color);
          border-radius: 8px;
        }
        .entity-catalog-label.eligible {
          color: var(--success-color, #238455);
          font-weight: 600;
        }
        .entity-catalog-label.not-eligible {
          color: var(--secondary-text-color);
        }
        .entity-catalog-label.ineligible {
          color: var(--error-color, #db4437);
          font-weight: 600;
        }

        .entity-domain-section {
          margin: 18px 0;
        }
        .entity-domain-section h3 {
          color: var(--success-color, #238455);
          margin-bottom: 12px;
        }
        .unsupported-domain-section {
          margin: 22px 0;
          border-top: 1px solid var(--divider-color);
          padding-top: 12px;
        }
        .unsupported-domain-section > summary {
          font-weight: 600;
          color: var(--secondary-text-color);
        }
        .unsupported-domain-section > div {
          margin-top: 10px;
        }

        .entity-hvls-control-area {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 7px;
        }
        .entity-hvls-review-link {
          padding: 0;
          margin: 0;
          border: 0;
          background: none;
          color: #e6a23c;
          font: inherit;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .entity-hvls-review-link:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
          border-radius: 3px;
        }
        .entity-hvls-control {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: 12px;
          white-space: nowrap;
          cursor: pointer;
          font-size: 12px;
        }
        .entity-hvls-control.pending { color:#e6a23c; }
        .entity-hvls-control.pending .entity-hvls-checkbox {
          outline: 2px solid #e6a23c;
          outline-offset: 2px;
        }
        .entity-hvls-checkbox {
          cursor: pointer;
          accent-color: var(--primary-color);
        }
        .entity-hvls-checkbox:disabled {
          cursor: not-allowed;
        }
        .entity-eligibility-info {
          border: 0;
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }
        .ineligible-reasons {
          margin: 0 0 14px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--secondary-background-color);
        }
        .ineligible-reasons[hidden] { display: none !important; }
        .ineligible-reasons-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 8px;
        }
        .ineligible-reasons-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
        }
        .reason-filter-chip,
        .reason-filter-option {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .reason-filter-option { cursor: pointer; }
        .reason-filter-option input { accent-color: var(--primary-color); }
        .reason-filter-count {
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        .reason-filter-link {
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--primary-color);
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }
        .reason-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 12px;
          line-height: 1.5;
          color: var(--secondary-text-color);
          background: rgba(136, 135, 128, 0.18);
        }
        .reason-badge.reason-domain_not_enabled {
          color: #8f87e6; background: rgba(127, 119, 221, 0.18);
        }
        .reason-badge.reason-unsupported_device_class {
          color: #e0952a; background: rgba(239, 159, 39, 0.18);
        }
        .reason-badge.reason-hidden {
          color: #2aa880; background: rgba(29, 158, 117, 0.18);
        }
        .reason-badge.reason-entity_category {
          color: #d9628a; background: rgba(212, 83, 126, 0.18);
        }
        .entity-reason-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 8px;
          margin-top: 4px;
        }
        .entity-reason-detail {
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        .entity-eligibility-info:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        .entity-eligibility-detail {
          margin: 4px 0 8px;
          padding: 8px 10px;
          border-left: 2px solid var(--primary-color);
          color: var(--secondary-text-color);
          font-size: 12px;
          overflow-wrap: anywhere;
        }
        .entity-eligibility-detail[hidden] { display: none !important; }

        /* Alignement des trois colonnes du gestionnaire */
        .entity-catalog-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 110px 72px;
          align-items: center;
          gap: 12px;
        }
        .entity-catalog-info {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .entity-more-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          width: 100%;
          min-width: 0;
          padding: 3px 5px;
          background: transparent;
          color: var(--primary-text-color);
          border-radius: 6px;
          text-align: left;
          overflow-wrap: anywhere;
        }
        .entity-more-info:hover {
          background: var(--secondary-background-color);
          color: var(--primary-color);
        }
        .entity-more-info:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        .entity-more-info small {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .entity-catalog-label {
          text-align: center;
          justify-self: center;
        }
        .entity-hvls-control {
          justify-self: center;
          justify-content: center;
          margin-left: 0;
        }
        @media (max-width: 600px) {
          .entity-catalog-row {
            grid-template-columns: minmax(0, 1fr) 85px 62px;
            gap: 6px;
          }
        }

        .entity-domain-more {
          margin: 12px 0 4px;
          font-size: 12px;
        }

        .preview-pending-alert {
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:12px; padding:12px 16px; margin:12px 0;
          border:2px solid #c62828; border-radius:10px;
          background:rgba(198,40,40,.12); color:var(--primary-text-color);
          animation:hvls-pending-pulse 2.6s ease-in-out infinite;
        }
        .preview-pending-alert strong { color:#ef5350; }
        @keyframes hvls-pending-pulse {
          0%,100% { border-color:#c62828; }
          50% { border-color:#ef9a9a; }
        }
        @media (prefers-reduced-motion:reduce) {
          .preview-pending-alert { animation:none; }
        }
        .preview-actions { display:flex; align-items:center; justify-content:flex-end; gap:10px; flex-wrap:wrap; margin-top:16px; }
        .apply-info { margin:0; max-width:340px; }
        .apply-info > summary {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:6px 10px;
          border:1px solid var(--divider-color);
          border-radius:50%;
          cursor:pointer;
          font-weight:600;
          list-style:none;
        }
        .apply-info > summary::-webkit-details-marker { display:none; }
        .apply-info > summary:focus-visible {
          outline:2px solid var(--primary-color);
          outline-offset:2px;
        }
        .apply-info > p {
          margin:6px 0 0;
          padding:8px 10px;
          border:1px solid var(--divider-color);
          border-radius:8px;
          overflow-wrap:anywhere;
        }
        .apply-info > .apply-assistant-action {
          display:block;
          margin-top:8px;
          max-width:100%;
          white-space:normal;
        }
        .apply-info > .apply-assistant-action[hidden] { display:none; }
        .preview-yaml-tools { display:flex; align-items:center; justify-content:flex-end; margin:8px 0; }
        .preview-change-group {
          margin:10px 0;
          padding:0 14px;
          border:1px solid var(--divider-color);
          border-radius:10px;
          background:var(--card-background-color);
        }
        .preview-change-group > summary { font-weight:600; padding:14px 0; }
        .preview-change-list { padding-bottom:12px; }
        .preview-removal-reason { display:block; color:var(--secondary-text-color); font-size:12px; margin:2px 0 0; }
        .preview-change-item {
          display:flex; flex-direction:column; gap:4px; min-width:0;
          padding:10px 0; border-top:1px solid var(--divider-color);
          overflow-wrap:anywhere;
        }
        .preview-change-item > small { color:var(--secondary-text-color); }
        .preview-field-change { display:flex; flex-direction:column; gap:2px; padding-left:10px; }
        .preview-field-change > span { white-space:pre-wrap; font-size:13px; }
        .change-group { margin:12px 0; }
        .change-group li { overflow-wrap:anywhere; padding:4px 0; }
        .diagnostic-note { color:var(--secondary-text-color); font-size:13px; }
        pre { margin:0; padding:20px; max-height:700px; overflow:auto; border-radius:12px; background:var(--card-background-color); color:var(--primary-text-color); box-shadow:var(--ha-card-box-shadow,none); font-family:var(--code-font-family,monospace); font-size:14px; line-height:1.5; white-space:pre; }
        details { margin:16px 0; }
        summary { cursor:pointer; padding:8px 0; }
      </style>
      <div class="container">
        <div class="header">
          <div class="hvls-brand">
            <button id="menuToggle" class="menu-toggle" type="button" hidden
              aria-label="${this._t("menu")}" title="${this._t("menu")}">☰</button>
            <img id="hvlsBrandIcon" alt="" hidden>
            <h1>HA Voice Label Sync</h1>
          </div>
          <div class="actions">
            <button id="refresh" class="secondary icon-action" type="button"
              aria-label="${this._t("refresh")}" title="${this._t("refresh")}">↻</button>
            <button id="settings" class="secondary">⚙ Paramètres</button>
          </div>
        </div>
        <div id="status">${this._t("waitingHA")}</div>
        <nav class="hvls-tabs" aria-label="${this._t("tabsLabel")}" role="tablist">
          <button class="hvls-tab active" type="button"
            data-tab="summary" role="tab" aria-selected="true">
            1 · Statistiques
          </button>
          <button class="hvls-tab" type="button"
            data-tab="exclusions" role="tab" aria-selected="false">
            2 · Entités exclues
          </button>
          <button class="hvls-tab" type="button"
            data-tab="entities" role="tab" aria-selected="false">
            3 · Gestion des entités HVLS
          </button>
          <button class="hvls-tab" type="button"
            data-tab="preview" role="tab" aria-selected="false">
            4 · Preview
          </button>
          <button class="hvls-tab" type="button"
            data-tab="backups" role="tab" aria-selected="false">
            5 · Sauvegardes
          </button>
          <button class="hvls-tab" type="button"
            data-tab="migration" role="tab" aria-selected="false">
            6 · Migration
          </button>
        </nav>

        <section id="tab-summary" class="hvls-tab-panel" role="tabpanel">
          <p id="restoreSummaryNotice" class="diagnostic-note"
            role="status" hidden></p>
          <div id="analysis"></div>
        </section>

        <section id="tab-exclusions" class="hvls-tab-panel"
          role="tabpanel" hidden>
          <div id="exclusions"></div>
        </section>

        <section id="entityManager" class="hvls-tab-panel"
          role="tabpanel" hidden>
          <div class="entity-manager-header">
            <h2>Gestion des entités HVLS</h2>
            <button id="refreshEntities" class="secondary">
              Actualiser les entités
            </button>
          </div>
          <p id="entityStatus" class="diagnostic-note">
            Chargement des entités…
          </p>
          <div class="entity-controls">
            <input id="entitySearch" type="search"
              placeholder="Rechercher un nom, identifiant ou une pièce…"
              aria-label="Rechercher une entité">
            <select id="entityFilter" aria-label="Filtrer les entités">
              <option value="all">Toutes les entités</option>
              <option value="yes">Avec HVLS</option>
              <option value="no">Sans HVLS</option>
              <option value="eligible_no" selected>Sans HVLS — éligibles</option>
              <option value="ineligible">Non éligibles</option>
            </select>
          </div>
          <div id="ineligibleReasons" class="ineligible-reasons" hidden></div>
          <div id="entityList"></div>
          <button id="entityMore" class="secondary" hidden>
            Afficher 100 entités supplémentaires
          </button>
        </section>
        <section id="tab-preview" class="hvls-tab-panel"
          role="tabpanel" hidden>
        <div id="backupPreviewNotice" class="diagnostic-note" role="status" hidden></div>
        <div id="restoreReconcilePanel" class="migration-review-note"
          role="status" hidden>
          <h3 id="restoreReconcileTitle"></h3>
          <p id="restoreReconcileSummary" class="diagnostic-note"></p>
          <p id="restoreReconcileDetails" class="diagnostic-note"></p>
          <div class="migration-controls">
            <button id="restoreReconcileAddLabels" class="secondary"
              type="button" hidden></button>
            <button id="restoreReconcileAligned" class="secondary"
              type="button" hidden></button>
            <button id="restoreReconcileKeepCurrent" class="secondary"
              type="button" hidden></button>
            <button id="restoreReconcileCancelFailed" class="secondary"
              type="button" hidden></button>
          </div>
          <p id="restoreReconcileStatus" role="status"></p>
        </div>
        <div id="previewChanges"></div>
        <details id="rawDiffDetails" hidden>
          <summary>${this._t("rawDiffSummary")}</summary>
          <pre id="unifiedDiff"></pre>
        </details>
        <details id="previewYamlDetails">
          <summary>${this._t("showPreviewYaml")}</summary>
          <div class="preview-yaml-tools">
            <button id="copy" class="secondary" type="button">${this._t("copy")}</button>
          </div>
          <pre id="content"></pre>
        </details>
        <div class="preview-actions">
          <details id="applyInfo" class="apply-info" hidden>
            <summary aria-label="${this._t("applyInfoLabel")}">ⓘ</summary>
            <p id="applyBlockReason" class="diagnostic-note"></p>
            <p id="applyUnmanagedAssistantHint" class="diagnostic-note" hidden></p>
            <button id="applyUnmanagedAssistant" type="button"
              class="secondary apply-assistant-action" hidden>
              ${this._t("applyUnmanagedAssistantAction")}
            </button>
          </details>
          <button id="cancelPreview" class="secondary" type="button" hidden>${this._t("cancelPreview")}</button>
          <button id="apply" type="button" disabled>${this._t("apply")}</button>
        </div>
        </section>
        <section id="tab-migration" class="hvls-tab-panel" role="tabpanel" hidden>
          <h2>${this._t("tabMigration")}</h2>
          <p id="migrationIntro" class="diagnostic-note">${this._t("migrationIntro")}</p>
          <p class="diagnostic-note">
            <a id="assistantReportIssue"
              href="https://github.com/flimo44/ha-voice-label-sync/issues/new"
              target="_blank" rel="noopener noreferrer">${this._t("assistantReportIssue")}</a>
          </p>
          <p id="assistantGoogleConnectionHint" class="diagnostic-note" role="status" hidden></p>
          <details id="assistantFileExamples">
            <summary>${this._t("assistantFileHelp")}</summary>
            <p>${this._t("assistantExampleDirect")}</p>
            <pre>google_assistant:
  project_id: <span class="assistant-example-project">${this._t("assistantExampleProjectId")}</span>
  service_account: !include SERVICE_ACCOUNT.json
  report_state: true
  expose_by_default: false
  # secure_devices_pin: !secret google_secure_pin
  entity_config: !include google_assistant_entities.yaml</pre>
            <p>${this._t("assistantExampleInclude")}</p>
            <pre>google_assistant: !include google_assistant.yaml</pre>
            <p>${this._t("assistantExampleIncludedContent")}</p>
            <pre>project_id: <span class="assistant-example-project">${this._t("assistantExampleProjectId")}</span>
service_account: !include SERVICE_ACCOUNT.json
report_state: true
expose_by_default: false
# secure_devices_pin: !secret google_secure_pin
entity_config: !include google_assistant_entities.yaml</pre>
            <p class="diagnostic-note">${this._t("assistantExampleNote")}</p>
          </details>
          <div id="migrationGuide" class="migration-review-note" role="group"
            aria-label="${this._t("migrationGuideTitle")}" hidden>
            <h3 id="migrationGuideTitle">${this._t("migrationGuideTitle")}</h3>
            <p id="migrationGuideStep" class="diagnostic-note">
              ${this._t("migrationGuideStepIdentify")}
            </p>
            <p id="migrationGuideDetected"></p>
            <p id="migrationGuideCandidate"></p>
            <p id="migrationGuideQuestion">${this._t("migrationGuideQuestion")}</p>
            <details id="migrationChoiceDetails">
              <summary id="migrationChoiceTitle">${this._t("migrationChangeChoice")}</summary>
              <div class="migration-controls">
                <button id="migrationIntentNew" type="button" class="secondary"
                  aria-pressed="false">${this._t("migrationGuideNew")}</button>
                <button id="migrationIntentExisting" type="button" class="secondary"
                  aria-pressed="false">${this._t("migrationGuideExisting")}</button>
                <button id="migrationIntentUnsure" type="button" class="secondary"
                  aria-pressed="false">${this._t("migrationGuideUnsure")}</button>
              </div>
            </details>
            <p id="migrationGuideNext" role="status"></p>
            <div id="assistantFileSection" hidden>
              <h4 id="assistantFileTitle">${this._t("assistantFileTitle")}</h4>
              <p id="assistantFileHint"></p>
              <label id="assistantFilePathLabel" for="assistantFilePath">
                ${this._t("assistantFilePathLabel")}
              </label>
              <div class="migration-controls">
                <input id="assistantFilePath" type="text" maxlength="240"
                  autocomplete="off" spellcheck="false"
                  placeholder="${this._t("assistantFilePlaceholder")}">
                <button id="assistantFileCheck" type="button" class="secondary" disabled>
                  ${this._t("assistantFileCheck")}
                </button>
              </div>
              <p id="assistantFileResult" role="status" class="diagnostic-note"></p>
              <div id="assistantFileMetrics" class="assistant-file-metrics"
                aria-label="${this._t("assistantFileResultsTitle")}" hidden>
                <div class="assistant-file-metric">
                  <strong id="assistantMetricEntries">—</strong>
                  <span id="assistantLabelEntries">${this._t("assistantFileMetricEntries")}</span>
                </div>
                <div class="assistant-file-metric">
                  <strong id="assistantMetricTrue">—</strong>
                  <span id="assistantLabelTrue">${this._t("assistantFileMetricTrue")}</span>
                </div>
                <div class="assistant-file-metric">
                  <strong id="assistantMetricFalse">—</strong>
                  <span id="assistantLabelFalse">${this._t("assistantFileMetricFalse")}</span>
                </div>
                <div class="assistant-file-metric">
                  <strong id="assistantMetricUnset">—</strong>
                  <span id="assistantLabelUnset">${this._t("assistantFileMetricUnset")}</span>
                </div>
                <div class="assistant-file-metric">
                  <strong id="assistantMetricIssues">—</strong>
                  <span id="assistantLabelIssues">${this._t("assistantFileMetricIssues")}</span>
                </div>
              </div>
              <p id="assistantFileUnsetExplanation" class="diagnostic-note" hidden></p>
              <p id="assistantFileConclusion" class="diagnostic-note" hidden></p>
              <p id="assistantFileSafety" class="diagnostic-note">
                ${this._t("assistantFileSafety")}
              </p>
                <section id="assistantTakeoverSection" hidden
                  aria-labelledby="assistantTakeoverTitle">
                  <h4 id="assistantTakeoverTitle"></h4>
                  <p id="assistantTakeoverIntro" class="diagnostic-note"></p>
                  <button id="assistantTakeoverButton" type="button"
                    class="secondary"></button>
                  <p id="assistantTakeoverResult" role="status"></p>
                </section>
              <section id="assistantAdoption" hidden aria-labelledby="assistantAdoptTitle">
                <h4 id="assistantAdoptTitle"></h4>
                <p id="assistantAdoptIntro"></p>
                <p id="assistantAdoptSummary" role="status"></p>
                <p id="assistantAdoptLimits" class="diagnostic-note"></p>
                <button id="assistantAdoptRefresh" type="button" class="secondary"></button>
                <details id="assistantAdoptDetails">
                  <summary id="assistantAdoptReview"></summary>
                  <div id="assistantAdoptRows"></div>
                </details>
                <p id="assistantAdoptNeedsReview" class="diagnostic-note"></p>
                <button id="assistantAdoptApply" type="button" disabled></button>
                <p id="assistantAdoptResult" role="status"></p>

              </section>
              <details id="assistantProvenanceAdvanced">
                <summary id="assistantProvenanceAdvancedTitle">${this._t("assistantProvenanceAdvanced")}</summary>
              <section id="assistantProvenance" hidden aria-labelledby="assistantProvenanceStep">
                <h3 id="assistantProvenanceStep">${this._t("assistantProvenanceStep")}</h3>
                <p id="assistantProvenanceQuestion">${this._t("assistantProvenanceQuestion")}</p>
                <div class="migration-controls" role="group"
                  aria-label="${this._t("assistantProvenanceCategory")}">
                  <button id="assistantProvenanceOld" type="button" class="secondary assistant-provenance-choice"
                    aria-pressed="false">${this._t("assistantProvenanceOld")}</button>
                  <button id="assistantProvenanceUnknown" type="button" class="secondary assistant-provenance-choice"
                    aria-pressed="false">${this._t("assistantProvenanceUnknown")}</button>
                  <button id="assistantProvenanceNew" type="button" class="secondary assistant-provenance-choice"
                    aria-pressed="false">${this._t("assistantProvenanceNew")}</button>
                </div>
                <div class="assistant-provenance-facts">
                  <section class="assistant-provenance-card"
                    aria-labelledby="assistantProvenanceVerifiedTitle">
                    <h4 id="assistantProvenanceVerifiedTitle">${this._t("assistantProvenanceVerifiedTitle")}</h4>
                    <p id="assistantProvenanceVerified">${this._t("assistantProvenanceVerified")}</p>
                    <p id="assistantProvenanceSource"></p>
                    <p id="assistantProvenanceAnomalies" hidden></p>
                  </section>
                  <section class="assistant-provenance-card"
                    aria-labelledby="assistantProvenanceMissingTitle">
                    <h4 id="assistantProvenanceMissingTitle">${this._t("assistantProvenanceMissingTitle")}</h4>
                    <p id="assistantProvenanceMissing">${this._t("assistantProvenanceMissing")}</p>
                  </section>
                  <section class="assistant-provenance-card"
                    aria-labelledby="assistantProvenanceNextTitle">
                    <h4 id="assistantProvenanceNextTitle">${this._t("assistantProvenanceNextTitle")}</h4>
                    <p id="assistantProvenanceNext" role="status">${this._t("assistantProvenanceNextChoose")}</p>
                    <details id="assistantProvenanceHelp" hidden>
                      <summary id="assistantProvenanceHelpTrigger">${this._t("assistantProvenanceChecklistTrigger")}</summary>
                      <p id="assistantProvenanceChecklistIntro">${this._t("assistantProvenanceChecklistIntro")}</p>
                      <ol>
                        <li id="assistantProvenanceChecklist1">${this._t("assistantProvenanceChecklist1")}</li>
                        <li id="assistantProvenanceChecklist2">${this._t("assistantProvenanceChecklist2")}</li>
                        <li id="assistantProvenanceChecklist3">${this._t("assistantProvenanceChecklist3")}</li>
                        <li id="assistantProvenanceChecklist4">${this._t("assistantProvenanceChecklist4")}</li>
                      </ol>
                      <p id="assistantProvenanceChecklistEnd">${this._t("assistantProvenanceChecklistEnd")}</p>
                    </details>
                  </section>
                </div>
                <section id="assistantHistorical" hidden
                  aria-labelledby="assistantHistoryTitle">
                  <h4 id="assistantHistoryTitle">${this._t("assistantHistoryTitle")}</h4>
                  <p id="assistantHistoryHow">${this._t("assistantHistoryHow")}</p>
                  <p id="assistantHistoryFolder" class="diagnostic-note">
                    ${this._t("assistantHistoryFolder")}
                  </p>
                  <button id="assistantHistoryInspect" type="button" class="secondary">
                    ${this._t("assistantHistoryAction")}
                  </button>
                  <div id="assistantHistoryResult" class="assistant-history-result"
                    role="status"></div>
                  <p id="assistantHistorySafety" class="diagnostic-note">
                    ${this._t("assistantHistorySafety")}
                  </p>
                </section>
                <p id="assistantProvenanceSafety" class="diagnostic-note">
                  ${this._t("assistantProvenanceSafety")}
                </p>
              </section>
              </details>
            </div>
            <p id="migrationGuideSafety" class="diagnostic-note">${this._t("migrationGuideNoAuthorization")}</p>
          </div>
          <div id="assistantSourceDetected" class="migration-review-note" hidden>
            <h3 id="assistantSourceTitle">${this._t("assistantSourceFound")}</h3>
            <p id="assistantSourceSummary"></p>
          </div>
          <button id="migrationAnalyze" type="button" class="secondary">
            ${this._t("migrationAnalyze")}
          </button>
          <p id="migrationManagedNotice" role="status" class="diagnostic-note" hidden></p>
          <p id="migrationStatus" role="status" class="diagnostic-note"></p>
        </section>
        <section id="tab-backups" class="hvls-tab-panel" role="tabpanel" hidden>
          <h2>${this._t("tabBackups")}</h2>
          <p id="backupIntro" class="diagnostic-note">${this._t("backupIntro")}</p>
          <p id="backupStatus" role="status"></p>
          <p id="backupRestoreNotice" class="diagnostic-note"
            role="status" hidden></p>
          <div id="backupList"></div>
          <button id="backupMore" class="secondary" type="button" hidden></button>
          <div id="backupDiff"></div>
          <button id="restoreBackup" type="button" disabled>${this._t("backupRestore")}</button>
          <div class="migration-controls" style="margin-top:20px">
            <button id="backupCleanupPrepare" class="secondary" type="button">${this._t("backupCleanupPrepare")}</button>
            <button id="backupCleanupCancel" class="secondary" type="button" hidden>${this._t("backupCleanupCancel")}</button>
            <button id="backupCleanupApply" type="button" hidden>${this._t("backupCleanupConfirmButton")}</button>
          </div>
          <div id="backupCleanupPreview"></div>
          <p id="backupCleanupStatus" class="diagnostic-note" role="status"></p>
        </section>
      </div>
    `;
    this.querySelector("#entitySearch").addEventListener("input", () => {
      this._entityLimit = 100;
      this._renderEntities();
    });
    this.querySelector("#entityFilter").addEventListener("change", () => {
      this._entityLimit = 100;
      this._renderEntities();
    });
    this.querySelector("#entityMore").addEventListener("click", () => {
      this._entityLimit = (this._entityLimit || 100) + 100;
      this._renderEntities();
    });
    this.querySelector("#refreshEntities").addEventListener(
      "click", () => this._loadEntities()
    );
    this.querySelectorAll(".hvls-tab").forEach((button) => {
      button.addEventListener("click", () => {
        this._activateTab(button.dataset.tab);
      });
    });
    this.querySelector("#menuToggle").addEventListener("click", () => this._toggleMenu());
    this._syncMenuVisibility();
    this.querySelector("#refresh").addEventListener("click", () => this._refreshAll());
    this.querySelector("#copy").addEventListener("click", () => this._copyPreview());
    this.querySelector("#apply").addEventListener("click", () => this._applyPreview());
    this.querySelector("#cancelPreview").addEventListener("click", () => this._cancelPreview());
    this.querySelector("#applyUnmanagedAssistant").addEventListener(
      "click", () => this._activateTab("migration")
    );
    this.querySelector("#restoreBackup").addEventListener("click", () => this._restoreBackup());
    this.querySelector("#backupMore").addEventListener("click", () => {
      this._backupVisibleAll = !this._backupVisibleAll;
      this._renderBackups();
    });
    this.querySelector("#backupCleanupPrepare").addEventListener(
      "click", () => this._prepareBackupCleanup()
    );
    this.querySelector("#backupCleanupCancel").addEventListener("click", () => {
      this._backupCleanupPlan = null;
      this._backupCleanupSelected = null;
      this._renderBackupCleanup();
      const status = this.querySelector("#backupCleanupStatus");
      if (status) status.textContent = "";
    });
    this.querySelector("#backupCleanupApply").addEventListener(
      "click", () => this._applyBackupCleanup()
    );
    this.querySelector("#restoreReconcileAddLabels").addEventListener(
      "click", () => this._restoreMissingLabels()
    );
    this.querySelector("#restoreReconcileAligned").addEventListener(
      "click", () => this._resolveRestoreReconciliation("keep_restored")
    );
    this.querySelector("#restoreReconcileKeepCurrent").addEventListener(
      "click", () => this._resolveRestoreReconciliation("keep_current_labels")
    );
    this.querySelector("#restoreReconcileCancelFailed").addEventListener(
      "click", () => this._resolveRestoreReconciliation("cancel_failed")
    );
    this.querySelector("#migrationAnalyze").addEventListener("click", () => this._loadMigrationReview());
    this.querySelector("#migrationIntentNew").addEventListener("click", () => this._startNewSelection());
    this.querySelector("#migrationIntentExisting").addEventListener("click", () => this._chooseMigrationIntent("existing"));
    this.querySelector("#migrationIntentUnsure").addEventListener("click", () => this._chooseMigrationIntent("unsure"));
    this.querySelector("#assistantFilePath").addEventListener("input", event => {
      this._assistantFilePath = event.target.value;
      this._assistantFileRequestId = (this._assistantFileRequestId || 0) + 1;
      this._assistantFileReport = null;
      this._assistantFileError = null;
      this._assistantFileChecking = false;
      this._assistantProvenanceChoice = null;
      this._assistantAdoptMessage = null;
      this._assistantTakeoverMessage = null;
      this._invalidateHistoricalReview();
      this._renderAssistantFileStatus();
    });
    this.querySelector("#assistantFileCheck").addEventListener(
      "click", () => this._checkAssistantEntityFile()
    );
    this.querySelector("#assistantAdoptRefresh").addEventListener(
      "click", () => this._loadEntities()
    );
    this.querySelector("#assistantAdoptApply").addEventListener(
      "click", () => this._adoptAssistantFile()
    );
    this.querySelector("#assistantTakeoverButton").addEventListener(
      "click", () => this._takeOverAssistantFile()
    );
    this.querySelector("#assistantHistoryInspect").addEventListener(
      "click", () => this._inspectHistoricalYaml()
    );
    for (const [id, origin] of [
      ["assistantProvenanceOld", "old"],
      ["assistantProvenanceUnknown", "unknown"],
      ["assistantProvenanceNew", "new"],
    ]) {
      this.querySelector("#" + id).addEventListener(
        "click", () => this._chooseAssistantProvenance(origin)
      );
    }
    this.querySelector("#settings").addEventListener("click", () => {
      window.location.assign("/config/integrations/integration/ha_voice_label_sync");
    });
  }


  async _loadEntities() {
    if (!this._hass || this._entityLoading) return false;

    this._entityLoading = true;
    const refresh = this.querySelector("#refreshEntities");
    const status = this.querySelector("#entityStatus");

    if (refresh) refresh.disabled = true;
    if (status) status.textContent = this._t("registriesLoading");

    try {
      const catalog = await this._hass.callWS({
        type: "ha_voice_label_sync/get_entities",
      });

      this._entityCatalog = catalog;
      this._entityLoadError = null;
      this._entityLimit = 100;
      this._renderEntities();
      this._renderAssistantAdoption();
      // Statistics may have loaded before the registry catalog.
      // Render removal controls only from the current HA label state.
      if (this._lastAnalysis) this._renderAnalysis(this._lastAnalysis);
      return true;
    } catch (error) {
      this._entityCatalog = null;
      this._renderAssistantAdoption();
      this._entityLoadError = error.message || String(error);
      this.querySelector("#entityList")?.replaceChildren();
      const more = this.querySelector("#entityMore");
      if (more) more.hidden = true;
      if (status) {
        status.textContent =
          this._tf("entitiesLoadFailed", {error: error.message || String(error)});
      }
      return false;
    } finally {
      this._entityLoading = false;
      if (refresh) refresh.disabled = false;
    }
  }

  async _setEntityLabel(entity, checkbox) {
    // A checkbox change is ONLY a proposal. The existing HA entity label
    // remains unchanged until the user approves the Preview.
    const current = entity.has_label === true;
    const wanted = checkbox.checked === true;
    if (!this._hass || this._entityWritePending ||
        this._applying || this._restoring || this._generating ||
        this._refreshing ||
        (this._stagedRestore && this._stagedRestore.mode !== "label_preview")) {
      checkbox.checked = this._manualLabelChanges?.get(entity.entity_id) ?? current;
      return;
    }
    if (wanted && !current && entity.eligible !== true) {
      checkbox.checked = current;
      return;
    }

    const previousStage = this._stagedRestore;
    const previousChoices = this._manualLabelChanges;
    const choices = new Map(previousChoices || []);
    if (wanted === current) choices.delete(entity.entity_id);
    else choices.set(entity.entity_id, wanted);

    this._entityWritePending = true;
    this._loadId = (this._loadId || 0) + 1;
    this._stagedRestore = null;
    this._review = null;
    this._updateApplyButton();
    this._setStatusKey("manualLabelPreparing");
    try {
      if (!choices.size) {
        this._manualLabelChanges = null;
        this._clearSavedLabelDraft();
        await this._loadPreview();
        return;
      }
      const changes = [...choices.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([entity_id, enabled]) => ({entity_id, enabled}));
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_manual_label_preview",
        changes,
      });
      if (result?.mode !== "label_preview" ||
          result.projection?.ready !== true ||
          !Array.isArray(result.changes) ||
          !/^[0-9a-f]{64}$/.test(result.label_plan_sha256 || "")) {
        throw new Error("Invalid manual-label Preview");
      }
      this._manualLabelChanges = choices;
      this._stagedRestore = result;
      this._previewContent = result.content;
      this._previewPath = result.path;
      this._applyBlockReason = this._t("manualLabelHelp");
      this._applyBlockReasonCode = null;
      this._renderAnalysis(result);
      this._setContent(result.content);
      // Only a manual-label proposal is durable. Legacy recovery and
      // backup plans continue through their own explicit recovery guards.
      const saved = this._savePendingLabelDraft(choices, result);
      this._setStatusKey(saved ? "manualLabelPrepared" :
        "savedDraftStorageUnavailable", {count: choices.size});
    } catch (error) {
      // A failed second proposal must not silently destroy the first valid
      // draft, its cached user intent, or the last approved Preview plan.
      checkbox.checked = previousChoices?.get(entity.entity_id) ?? current;
      if (previousStage?.mode === "label_preview") {
        this._manualLabelChanges = previousChoices;
        this._stagedRestore = previousStage;
        this._previewContent = previousStage.content;
        this._previewPath = previousStage.path;
        this._renderAnalysis(previousStage);
        this._setContent(previousStage.content);
      } else {
        this._manualLabelChanges = null;
        this._stagedRestore = null;
        await this._loadPreview();
      }
      this._review = null; // Never reuse a normal Apply approval.
      this._setStatusKey("manualLabelFailed", {
        error: error.message || String(error),
      });
    } finally {
      this._entityWritePending = false;
      if (this._entityCatalog) this._renderEntities();
      if (this._lastAnalysis) this._renderAnalysis(this._lastAnalysis);
      this._updateApplyButton();
    }
  }

  async _applyManualLabelPreview() {
    const stage = this._stagedRestore;
    if (!this._hass || stage?.mode !== "label_preview" ||
        stage.projection?.ready !== true ||
        (!stage.recovery && !stage.changes?.length) ||
        !/^[0-9a-f]{64}$/.test(stage.label_plan_sha256 || "") ||
        this._entityWritePending || this._restoring || this._applying ||
        this._generating || this._refreshing) return;
    const bulkApproved = this._confirmWithBulkRemoval(
      stage, this._t(stage.recovery === true
        ? "assistantRecoveryApplyConfirm" : "manualLabelConfirm"),
    );
    if (bulkApproved === null) return;

    this._applying = true;
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    let applied = null;
    try {
      applied = await this._hass.callWS({
        type: "ha_voice_label_sync/apply_manual_label_preview",
        changes: stage.changes,
        preview_sha256: stage.preview_sha256,
        production_sha256: stage.production_sha256,
        label_plan_sha256: stage.label_plan_sha256,
        recovery: stage.recovery === true,
        ...(bulkApproved > 0 ? {acknowledged_bulk_removals: bulkApproved} : {}),
      });
      if (applied?.applied !== true || applied?.reconciled !== true) {
        throw new Error("Unverified label-Preview Apply response");
      }
      this._manualLabelChanges = null;
      this._stagedRestore = null;
      this._clearSavedLabelDraft();
      if (stage.recovery === true) {
        this._assistantFileReport = null;
        this._assistantAdoptMessage = null;
      }
      this._backupList = null;
      await this._hass.callWS({
        type: "ha_voice_label_sync/generate_preview",
      });
      await this._loadPreview(true);
      await this._loadEntities();
      if (stage.recovery === true) {
        this._setStatusKey("assistantRecoveryApplied", {
          count: applied.yaml_entities, backup: applied.safety_backup || "—",
        });
      } else {
        this._setStatusKey("manualLabelApplied", {
          added: applied.label_additions, removed: applied.label_removals,
        });
      }
    } catch (error) {
      // A partial server failure may have installed the durable guard.
      // Always discard the old approval and show the current HA state.
      this._stagedRestore = null;
      this._manualLabelChanges = null;
      await this._loadPreview(true);
      await this._loadEntities();
      this._setStatusKey("manualLabelApplyFailed", {
        error: error.message || String(error),
      });
    } finally {
      this._applying = false;
      this._updateApplyButton();
    }
  }

  _openEntityDetails(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: {entityId},
      bubbles: true,
      composed: true
    }));
  }

  _createEntityHVLSControl(checkbox, pending) {
    const area = document.createElement("span");
    area.className = "entity-hvls-control-area";
    const control = document.createElement("label");
    control.className = pending
      ? "entity-hvls-control pending" : "entity-hvls-control";
    const text = document.createElement("span");
    text.textContent = "HVLS";
    control.append(checkbox, text);
    area.appendChild(control);

    if (pending) {
      // The review action must NOT be a descendant of the checkbox label:
      // clicking that label would otherwise toggle and cancel the proposal.
      const review = document.createElement("button");
      review.type = "button";
      review.className = "entity-hvls-review-link";
      review.textContent = this._t("manualLabelPending");
      review.title = this._t("pendingAction");
      review.setAttribute("aria-label", this._t("pendingAction"));
      review.addEventListener("click", () => this._activateTab("preview"));
      area.appendChild(review);
    }
    return area;
  }

  _renderEntities() {
    const catalog = this._entityCatalog;
    if (!catalog) return;

    const list = this.querySelector("#entityList");
    const status = this.querySelector("#entityStatus");
    const legacyMore = this.querySelector("#entityMore");

    if (!list || !status) return;

    // Ancienne pagination globale : désactivée.
    if (legacyMore) legacyMore.hidden = true;

    const query = (this.querySelector("#entitySearch")?.value || "")
      .trim().toLocaleLowerCase();
    const filter = this.querySelector("#entityFilter")?.value || "eligible_no";

    // Mémoriser les domaines ouverts.
    const openDomains = new Set(
      Array.from(
        list.querySelectorAll(".entity-catalog-domain[open]")
      ).map((details) => details.dataset.domain)
    );

    // Recherche sur l'ensemble du catalogue HA.
    const searched = (catalog.entities || []).filter((entity) => {
      if (!this._entityMatchesFilter(entity, filter)) return false;

      const searchable = [
        entity.name,
        entity.entity_id,
        entity.room,
        this._roomLabel(entity.room),
        entity.domain
      ].join(" ").toLocaleLowerCase();

      return searchable.includes(query);
    });

    // In the ineligible view, the reason checkboxes narrow the list. Counts
    // follow the search so they always describe what can be shown.
    this._renderReasonFilter(
      this.querySelector("#ineligibleReasons"), searched,
      filter === "ineligible"
    );
    const reasons = filter === "ineligible"
      ? this._reasonFilterSelection() : null;
    const matching = reasons
      ? searched.filter(entity =>
        reasons.has(this._ineligibleReasonCode(entity)))
      : searched;

    matching.sort((a, b) =>
      a.domain.localeCompare(b.domain) ||
      a.entity_id.localeCompare(b.entity_id)
    );

    // Tous les domaines, sans limite globale.
    const grouped = new Map();

    for (const entity of matching) {
      if (!grouped.has(entity.domain)) {
        grouped.set(entity.domain, []);
      }
      grouped.get(entity.domain).push(entity);
    }

    // Pagination indépendante pour chaque domaine.
    this._domainLimits ||= new Map();

    const fragment = document.createDocumentFragment();
    const supportedDomains = new Set(catalog.supported_domains || []);

    const supportedSection = document.createElement("section");
    supportedSection.className = "entity-domain-section";

    const supportedHeading = document.createElement("h3");
    supportedHeading.textContent = "✓ Domaines pris en charge par HVLS";
    supportedSection.appendChild(supportedHeading);

    const supportedList = document.createElement("div");
    supportedSection.appendChild(supportedList);

    const unsupportedDetails = document.createElement("details");
    unsupportedDetails.className = "unsupported-domain-section";
    unsupportedDetails.open =
      Boolean(query) || Boolean(this._unsupportedDomainsOpen);

    const unsupportedHeading = document.createElement("summary");
    unsupportedDetails.appendChild(unsupportedHeading);

    const unsupportedList = document.createElement("div");
    unsupportedDetails.appendChild(unsupportedList);

    let supportedCount = 0;
    let unsupportedCount = 0;
    let supportedDomainCount = 0;
    let unsupportedDomainCount = 0;

    for (const [domain, entities] of grouped) {
      const details = document.createElement("details");
      details.className = "entity-catalog-domain";
      details.dataset.domain = domain;
      details.open = Boolean(query) || openDomains.has(domain);

      const heading = document.createElement("summary");
      heading.className = "breakdown-row";

      const title = document.createElement("strong");
      title.textContent = domain;

      const count = document.createElement("span");
      count.textContent = this._tf("entitiesCount", {count: entities.length});

      heading.append(title, count);
      details.appendChild(heading);

      const group = document.createElement("div");
      group.className = "entity-catalog-group";
      details.appendChild(group);

      const renderDomain = () => {
        const limit = this._domainLimits.get(domain) || 100;
        const visible = entities.slice(0, limit);
        const rows = document.createDocumentFragment();

        for (const entity of visible) {
          const row = document.createElement("div");
          row.className = "entity-catalog-row";

          const info = document.createElement("div");
          info.className = "entity-catalog-info";

          // The name/ID opens HA's native More Info dialog. The HVLS
          // checkbox remains a separate control and does not trigger it.
          const entityButton = document.createElement("button");
          entityButton.type = "button";
          entityButton.className = "entity-more-info";
          entityButton.setAttribute("aria-label", this._tf("entityMoreInfo", {
            entity: entity.name || entity.entity_id
          }));
          const name = document.createElement("strong");
          name.textContent = entity.name || entity.entity_id;

          const description = document.createElement("small");
          description.textContent =
            `${entity.entity_id} · ${this._roomLabel(entity.room)}`;

          entityButton.append(name, description);
          entityButton.addEventListener("click", () => {
            this._openEntityDetails(entity.entity_id);
          });
          info.appendChild(entityButton);

          const label = document.createElement("span");
          label.className = "entity-catalog-label";

          if (entity.has_label && entity.eligible === true) {
            label.classList.add("eligible");
            label.textContent = "✓ HVLS";
          } else if (entity.has_label && entity.eligible === false) {
            label.classList.add("ineligible");
            label.textContent = "✕ HVLS";
          } else if (entity.has_label) {
            label.textContent = this._t("unknownHVLS");
          } else if (entity.eligible === false) {
            // Nothing to do here: HVLS could not export it even with the label.
            label.classList.add("not-eligible");
            label.textContent = this._t("ineligibleState");
          } else {
            label.textContent = this._t("withoutHVLS");
          }

          if (entity.eligible === false) {
            // A touch/keyboard-accessible explanation, not a hover-only tooltip.
            const explanation = this._eligibilityExplanation(entity.exclusion_reason);
            const reasonCode = this._ineligibleReasonCode(entity);
            const reasonLine = document.createElement("div");
            reasonLine.className = "entity-reason-line";
            const reason = document.createElement("button");
            reason.type = "button";
            reason.className =
              `entity-eligibility-info reason-badge reason-${reasonCode}`;
            reason.textContent = this._t("reasonShort_" + reasonCode);
            reason.title = explanation;
            reason.setAttribute("aria-label",
              `${this._t("reasonShort_" + reasonCode)} — ${this._t("exclusionHelp")}`);
            reason.setAttribute("aria-expanded", "false");
            reasonLine.appendChild(reason);
            const detailText = this._reasonDetail(entity);
            if (detailText) {
              const detail = document.createElement("small");
              detail.className = "entity-reason-detail";
              detail.textContent = detailText;
              reasonLine.appendChild(detail);
            }

            const explanationText = document.createElement("p");
            explanationText.className = "entity-eligibility-detail";
            explanationText.textContent = explanation;
            explanationText.hidden = true;
            reason.addEventListener("click", () => {
              explanationText.hidden = !explanationText.hidden;
              reason.setAttribute("aria-expanded", String(!explanationText.hidden));
            });
            info.append(reasonLine, explanationText);
          }

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "entity-hvls-checkbox";
          checkbox.checked = this._manualLabelChanges?.has(entity.entity_id)
            ? this._manualLabelChanges.get(entity.entity_id)
            : entity.has_label === true;
          const ineligibleToAdd = entity.eligible !== true && entity.has_label !== true;
          checkbox.dataset.ineligible = String(ineligibleToAdd);
          checkbox.disabled = Boolean(this._entityWritePending) || ineligibleToAdd;
          checkbox.setAttribute(
            "aria-label",
            this._tf("hvlsLabelAria", {entity: entity.entity_id})
          );

          checkbox.addEventListener("change", () => {
            this._setEntityLabel(entity, checkbox);
          });

          const pendingChange =
            this._manualLabelChanges?.has(entity.entity_id) === true;
          let controlArea;
          if (ineligibleToAdd && !pendingChange) {
            // No checkbox for an ineligible entity without the label: adding
            // it would change nothing. One that has the label keeps its box
            // so the label can still be removed.
            controlArea = document.createElement("span");
            controlArea.className = "entity-hvls-control-area";
          } else {
            controlArea = this._createEntityHVLSControl(checkbox, pendingChange);
          }
          row.append(info, label, controlArea);
          rows.appendChild(row);
        }

        group.replaceChildren(rows);

        if (visible.length < entities.length) {
          const more = document.createElement("button");
          more.className = "secondary entity-domain-more";
          more.type = "button";
          more.textContent =
            this._tf("moreDomain", {shown: visible.length, total: entities.length});

          more.addEventListener("click", (event) => {
            event.stopPropagation();
            this._domainLimits.set(domain, limit + 100);
            renderDomain();
          });

          group.appendChild(more);
        }
      };

      // Ne créer les lignes qu'à l'ouverture du domaine.
      details.addEventListener("toggle", () => {
        if (details.open && !group.hasChildNodes()) {
          renderDomain();
        }
      });

      if (details.open) {
        renderDomain();
      }

      if (supportedDomains.has(domain)) {
        supportedList.appendChild(details);
        supportedCount += entities.length;
        supportedDomainCount++;
      } else {
        unsupportedList.appendChild(details);
        unsupportedCount += entities.length;
        unsupportedDomainCount++;
      }
    }

    supportedHeading.textContent =
      `✓ ${this._t("domainsSupported")} ` +
      `(${this._tf("domainCount", {
        count: supportedDomainCount, entities: supportedCount
      })})`;

    unsupportedHeading.textContent =
      `${this._t("domainsUnsupported")} ` +
      `(${this._tf("domainCount", {
        count: unsupportedDomainCount, entities: unsupportedCount
      })})`;

    if (!supportedDomainCount && unsupportedDomainCount) {
      unsupportedDetails.open = true;
    }

    unsupportedDetails.addEventListener("toggle", () => {
      this._unsupportedDomainsOpen = unsupportedDetails.open;
    });

    if (supportedDomainCount) {
      fragment.appendChild(supportedSection);
    }

    if (unsupportedDomainCount) {
      fragment.appendChild(unsupportedDetails);
    }

    if (matching.length === 0) {
      const empty = document.createElement("p");
      empty.className = "diagnostic-note";
      empty.textContent = reasons && !reasons.size
        ? this._t("reasonFilterNone") : this._t("noMatches");
      fragment.appendChild(empty);
    }

    list.replaceChildren(fragment);

    status.textContent = this._tf("catalogStatus", {
      matching: matching.length,
      labeled: catalog.labeled,
      total: catalog.total,
      label: catalog.label,
    });

    if (catalog.warnings?.length) {
      status.textContent +=
        ` · ${this._tf("catalogWarning", {warnings: catalog.warnings.join("; ")})}`;
    }
  }


  async _loadBackups() {
    if (!this._hass || this._backupLoading || this._restoring) return;
    this._backupLoading = true;
    this._backupReview = null;
    this._backupList = null;
    this._backupCleanupPlan = null;
    this._backupCleanupSelected = null;
    this._renderBackupCleanup();
    // Never leave a previous comparison visible without a current selection.
    this._renderBackupDiff();
    this._updateApplyButton();
    const status = this.querySelector("#backupStatus");
    if (status) status.textContent = this._t("backupLoading");
    try {
      const result = await this._hass.callWS({type: "ha_voice_label_sync/list_backups"});
      this._backupList = result.backups || [];
      if (status) status.textContent = this._backupList.length
        ? "" : this._t("backupEmpty");
      this._renderBackups();
    } catch (error) {
      if (status) status.textContent = this._tf("backupLoadFailed", {
        error: error.message || String(error)
      });
    } finally {
      this._backupLoading = false;
    }
  }

  _renderBackups() {
    const list = this.querySelector("#backupList");
    if (!list || !Array.isArray(this._backupList)) return;
    list.replaceChildren();
    const kinds = {auto: 0, safety: 0, legacy: 0};
    for (const item of this._backupList) {
      const kind = item.kind in kinds ? item.kind : "legacy";
      kinds[kind]++;
    }
    const summary = document.createElement("p");
    summary.className = "diagnostic-note";
    summary.textContent = this._tf("backupHistorySummary", {
      total: this._backupList.length, ...kinds,
    });
    list.appendChild(summary);

    const group = document.createElement("div");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", this._t("tabBackups"));
    const visible = this._backupVisibleAll
      ? this._backupList : this._backupList.slice(0, 10);
    for (const item of visible) {
      const label = document.createElement("label");
      label.className = "backup-item";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "hvls_backup_selection";
      radio.value = item.id;
      radio.checked = item.id === this._selectedBackup;
      radio.addEventListener("change", () => this._reviewBackup(item.id));
      const info = document.createElement("span");
      const kind = item.kind === "auto" ? "backupTypeAuto"
        : item.kind === "safety" ? "backupTypeSafety" : "backupTypeLegacy";
      info.textContent = `${item.timestamp} · ${this._t(kind)} · ${this._tf("backupEntities", {count: item.entities_count})} · ${this._tf("backupSize", {size: item.size})}`;
      label.append(radio, info);
      group.appendChild(label);
    }
    list.appendChild(group);
    const more = this.querySelector("#backupMore");
    if (more) {
      more.hidden = this._backupList.length <= 10;
      more.textContent = this._backupVisibleAll
        ? this._t("backupShowRecent")
        : this._tf("backupShowOlder", {count: this._backupList.length - 10});
    }
  }

  _renderBackupCleanup() {
    const plan = this._backupCleanupPlan;
    const selected = this._backupCleanupSelected || new Set();
    const entries = plan ? [...plan.kept, ...plan.to_delete] : [];
    const count = entries.filter(item => selected.has(item.id)).length;
    const kept = entries.length - count;
    const container = this.querySelector("#backupCleanupPreview");
    if (container) {
      container.replaceChildren();
      if (plan) {
        const instruction = document.createElement("p");
        instruction.className = "diagnostic-note";
        instruction.textContent = this._t("backupCleanupPick");
        container.appendChild(instruction);

        const heading = document.createElement("p");
        heading.textContent = count
          ? this._tf("backupCleanupSelection", {count, kept})
          : this._t("backupCleanupNoop");
        container.appendChild(heading);

        const controls = document.createElement("div");
        controls.className = "migration-controls";
        const reset = document.createElement("button");
        reset.type = "button";
        reset.className = "secondary";
        reset.textContent = this._t("backupCleanupReset");
        reset.addEventListener("click", () => {
          this._backupCleanupSelected = new Set(plan.to_delete.map(item => item.id));
          this._renderBackupCleanup();
        });
        const none = document.createElement("button");
        none.type = "button";
        none.className = "secondary";
        none.textContent = this._t("backupCleanupNone");
        none.addEventListener("click", () => {
          this._backupCleanupSelected = new Set();
          this._renderBackupCleanup();
        });
        controls.append(reset, none);
        container.appendChild(controls);

        const details = document.createElement("details");
        details.open = true;
        const summary = document.createElement("summary");
        summary.textContent = `${entries.length} · ${this._t("backupCleanupSelectionTitle")}`;
        details.appendChild(summary);
        const list = document.createElement("ul");
        for (const item of entries) {
          const li = document.createElement("li");
          const label = document.createElement("label");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = selected.has(item.id);
          checkbox.setAttribute("aria-label",
            `${this._t("backupCleanupCheck")} : ${item.timestamp || item.id}`);
          checkbox.addEventListener("change", () => {
            if (!this._backupCleanupPlan || this._backupLoading) return;
            if (checkbox.checked) this._backupCleanupSelected.add(item.id);
            else this._backupCleanupSelected.delete(item.id);
            this._renderBackupCleanup();
          });
          const info = document.createElement("span");
          const kind = item.kind === "auto" ? "backupTypeAuto"
            : item.kind === "safety" ? "backupTypeSafety" : "backupTypeLegacy";
          info.textContent = ` ${item.timestamp} · ${this._t(kind)} · ${this._tf("backupEntities", {count: item.entities_count})}`;
          label.append(checkbox, info);
          li.appendChild(label);
          list.appendChild(li);
        }
        details.appendChild(list);
        container.appendChild(details);
        if (count === entries.length && entries.length > 0) {
          const warning = document.createElement("p");
          warning.textContent = this._t("backupCleanupKeepOne");
          container.appendChild(warning);
        }
      }
    }
    const apply = this.querySelector("#backupCleanupApply");
    if (apply) {
      apply.hidden = !plan;
      apply.disabled = !plan || count === 0 || count >= entries.length ||
        this._backupLoading === true;
      apply.textContent = count === 1
        ? this._t("backupCleanupDeleteOne")
        : this._tf("backupCleanupDeleteCount", {count});
    }
    const cancel = this.querySelector("#backupCleanupCancel");
    if (cancel) cancel.hidden = !plan;
  }

  async _prepareBackupCleanup() {
    if (!this._hass || this._backupLoading || this._applying ||
        this._restoring || this._stagedRestore) return;
    this._backupLoading = true;
    this._backupCleanupPlan = null;
    this._backupCleanupSelected = null;
    this._renderBackupCleanup();
    const status = this.querySelector("#backupCleanupStatus");
    if (status) status.textContent = this._t("backupLoading");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/preview_backup_cleanup",
      });
      if (!result || !Array.isArray(result.kept) ||
          !Array.isArray(result.to_delete) ||
          !/^[0-9a-f]{64}$/.test(result.evidence_sha256 || "")) {
        throw new Error("Invalid cleanup Preview");
      }
      this._backupCleanupPlan = result;
      this._backupCleanupSelected = new Set(
        result.to_delete.map(item => item.id)
      );
      this._renderBackupCleanup();
      if (status) status.textContent = "";
    } catch (error) {
      if (status) status.textContent = this._tf("backupCleanupFailed", {
        error: error.message || String(error),
      });
    } finally {
      this._backupLoading = false;
      this._renderBackupCleanup();
    }
  }

  async _applyBackupCleanup() {
    const plan = this._backupCleanupPlan;
    if (!plan || !this._backupCleanupSelected ||
        !this._hass || this._backupLoading ||
        this._applying || this._restoring || this._stagedRestore) return;
    const entries = [...plan.kept, ...plan.to_delete];
    const selected = [...this._backupCleanupSelected].sort();
    const valid = new Set(entries.map(item => item.id));
    if (!selected.length || selected.length >= entries.length ||
        selected.some(id => !valid.has(id))) return;
    if (!window.confirm(this._tf("backupCleanupConfirm", {
      count: selected.length, keep: entries.length - selected.length,
    }))) return;
    this._backupLoading = true;
    const status = this.querySelector("#backupCleanupStatus");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/apply_backup_cleanup",
        keep: plan.keep,
        evidence_sha256: plan.evidence_sha256,
        delete_ids: selected,
        confirmed: true,
      });
      if (!result || result.deleted_count !== selected.length) {
        throw new Error("Cleanup result did not match reviewed count");
      }
      this._backupCleanupPlan = null;
      this._backupCleanupSelected = null;
      this._selectedBackup = null;
      this._backupReview = null;
      this._renderBackupCleanup();
      this._renderBackupDiff();
      this._backupLoading = false;
      await this._loadBackups();
      if (status) status.textContent = this._tf("backupCleanupDone", {
        count: result.deleted_count,
      });
    } catch (error) {
      this._backupCleanupPlan = null;
      this._backupCleanupSelected = null;
      this._renderBackupCleanup();
      if (status) status.textContent = this._tf("backupCleanupFailed", {
        error: error.message || String(error),
      });
    } finally {
      this._backupLoading = false;
    }
  }

  async _reviewBackup(id) {
    if (!this._hass || this._restoring || this._applying) return;
    this._selectedBackup = id;
    this._backupReview = null;
    const reviewNumber = (this._backupReviewNumber || 0) + 1;
    this._backupReviewNumber = reviewNumber;
    this._updateApplyButton();
    this._renderBackups();
    const status = this.querySelector("#backupStatus");
    if (status) status.textContent = this._t("backupReviewing");
    this.querySelector("#backupDiff")?.replaceChildren();
    try {
      const data = await this._hass.callWS({
        type: "ha_voice_label_sync/review_backup", backup_id: id
      });
      if (reviewNumber !== this._backupReviewNumber) return;
      this._backupReview = data;
      if (status) status.textContent = "";
      this._renderBackupDiff();
    } catch (error) {
      if (reviewNumber !== this._backupReviewNumber) return;
      if (status) status.textContent = this._tf("backupReviewFailed", {
        error: error.message || String(error)
      });
    } finally {
      if (reviewNumber === this._backupReviewNumber) this._updateApplyButton();
    }
  }

  _renderBackupDiff() {
    const container = this.querySelector("#backupDiff");
    if (!container) return;
    container.replaceChildren();
    const restore = this.querySelector("#restoreBackup");
    if (restore) restore.textContent = this._t("backupRestore");
    const data = this._backupReview;
    if (!data || !data.comparison ||
        !["ok", "missing"].includes(data.comparison.status)) {
      if (restore) restore.disabled = true;
      return;
    }
    if (data.comparison.status === "missing") {
      const note = document.createElement("p");
      note.className = "diagnostic-note";
      note.textContent = this._tf("backupMissingReview", {
        count: data.summary?.total || 0,
      });
      container.appendChild(note);
      if (restore) {
        restore.disabled = Boolean(
          this._restoring || this._applying || this._refreshing ||
          this._generating || this._entityWritePending
        );
      }
      return;
    }
    const heading = document.createElement("h3");
    heading.textContent = this._t("backupDiffTitle");
    container.appendChild(heading);
    const comparison = data.comparison;
    const metrics = document.createElement("div");
    metrics.className = "metrics";
    for (const [key, n] of [
      ["added", comparison.added.length],
      ["removed", comparison.removed.length],
      ["modified", comparison.modified.length],
      ["unchanged", comparison.unchanged]
    ]) this._addMetric(metrics, this._t(key), n);
    container.appendChild(metrics);
    for (const [key, values] of [
      ["entitiesAdded", comparison.added],
      ["entitiesRemoved", comparison.removed],
      ["entitiesModified", comparison.modified.map(x => x.entity_id)]
    ]) {
      if (!values.length) continue;
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = `${this._t(key)} (${values.length})`;
      details.appendChild(summary);
      const items = document.createElement("ul");
      for (const id of values) {
        const li = document.createElement("li");
        li.textContent = id;
        if (key === "entitiesModified") {
          const changed = comparison.modified.find(item => item.entity_id === id);
          for (const [field, pair] of Object.entries(changed?.fields || {})) {
            const detail = document.createElement("div");
            const before = pair.before == null ? this._t("absentValue") : pair.before;
            const after = pair.after == null ? this._t("absentValue") : pair.after;
            detail.textContent = `${field}: ${this._t("fieldBefore")} ${before} → ${this._t("fieldAfter")} ${after}`;
            li.appendChild(detail);
          }
        }
        items.appendChild(li);
      }
      details.appendChild(items);
      container.appendChild(details);
    }
    const textOnly = comparison.identical_entities === true &&
      comparison.identical_text === false;
    if (restore) {
      restore.textContent = this._t(textOnly
        ? "backupRestoreTextOnly" : "backupRestore");
      restore.disabled = Boolean(
        this._restoring || this._applying || this._refreshing ||
        this._generating || this._entityWritePending);
    }
    if (comparison.identical_text === true || textOnly) {
      const text = document.createElement("p");
      text.className = "diagnostic-note";
      text.textContent = this._t(textOnly
        ? "backupTextOnlyDiff" : "backupNoDiff");
      container.appendChild(text);
    }
  }

  _renderRestoreWarning() {
    const analysis = this._lastAnalysis;
    const comparison = analysis?.comparison;
    let message = "";
    if (this._backupRestoreCompleted === true ||
        this._restoreReconcilePending === true) {
      if (!analysis?.available || analysis.error ||
          comparison?.status !== "ok" ||
          !Array.isArray(comparison.added) ||
          !Array.isArray(comparison.removed) ||
          !Array.isArray(comparison.modified)) {
        message = this._t("backupRestoreNotVerified");
      } else if (comparison.removed.length) {
        // In this diff, "removed" means present in production, absent in
        // Preview. Applying Preview would delete those restored entries.
        const ids = comparison.removed.slice(0, 5);
        const more = comparison.removed.length > ids.length
          ? ` (+${comparison.removed.length - ids.length})` : "";
        message = this._tf("backupRestorePendingRemoval", {
          count: comparison.removed.length,
          entities: ids.join(", ") + more,
        });
      } else if (comparison.added.length || comparison.modified.length) {
        message = this._tf("backupRestorePendingOther", {
          added: comparison.added.length,
          removed: comparison.removed.length,
          modified: comparison.modified.length,
        });
      } else {
        message = this._restoreReconcilePending
          ? this._t("restoreReconcilePending")
          : this._t("backupRestoreAligned");
      }
      if (this._restoreReconcilePending && comparison?.removed?.length) {
        message += " " + this._t("restoreReconcilePending");
      }
    }
    for (const id of ["backupRestoreNotice", "restoreSummaryNotice"]) {
      const node = this.querySelector("#" + id);
      if (node) {
        node.hidden = !message;
        node.textContent = message;
      }
    }
  }

  _renderRestoreReconciliation() {
    const panel = this.querySelector("#restoreReconcilePanel");
    if (!panel) return;
    panel.hidden = this._restoreReconcilePending !== true;
    if (panel.hidden) return;
    const comparison = this._lastAnalysis?.comparison;
    const valid = comparison?.status === "ok" &&
      Array.isArray(comparison.added) &&
      Array.isArray(comparison.removed) &&
      Array.isArray(comparison.modified) &&
      !!this._restoreReconcileReview;
    const restored = this._restoreReconcileState === "restored";
    const notWritten = this._restoreReconcileState === "not_written";
    const aligned = valid && restored && comparison.identical_entities === true;
    const canAdd = valid && restored && comparison.removed.length > 0 &&
      comparison.added.length === 0 && comparison.modified.length === 0;
    for (const [id, key] of [
      ["restoreReconcileTitle", "restoreReconcileTitle"],
      ["restoreReconcileSummary", "restoreReconcileSummary"],
    ]) {
      const node = this.querySelector("#" + id);
      if (node) node.textContent = this._t(key);
    }
    const details = this.querySelector("#restoreReconcileDetails");
    if (details) {
      details.textContent = valid && (restored || notWritten)
        ? this._tf("restoreReconcileDiff", {
            added: comparison.added.length,
            removed: comparison.removed.length,
            modified: comparison.modified.length,
          })
        : this._t("restoreReconcileUncertain");
    }
    for (const [id, key, visible] of [
      ["restoreReconcileAddLabels", "restoreReconcileAddLabels", canAdd],
      ["restoreReconcileAligned", "restoreReconcileAligned", aligned],
      ["restoreReconcileKeepCurrent", "restoreReconcileKeepCurrent",
        valid && restored && !aligned],
      ["restoreReconcileCancelFailed", "restoreReconcileCancelFailed",
        valid && notWritten],
    ]) {
      const button = this.querySelector("#" + id);
      if (!button) continue;
      button.hidden = !visible;
      button.disabled = !visible || this._restoreReconcileBusy === true ||
        this._restoring === true || this._applying === true;
      button.textContent = this._t(key);
    }
    const status = this.querySelector("#restoreReconcileStatus");
    if (status) status.textContent = this._restoreReconcileMessage || "";
  }

  async _resolveRestoreReconciliation(mode) {
    if (!this._hass || !this._restoreReconcilePending ||
        !this._restoreReconcileReview || this._restoreReconcileBusy) return false;
    const comparison = this._lastAnalysis?.comparison;
    if (comparison?.status !== "ok") return false;
    const restored = this._restoreReconcileState === "restored";
    const notWritten = this._restoreReconcileState === "not_written";
    if (mode === "keep_restored" &&
        (!restored || comparison.identical_entities !== true)) return false;
    if (mode === "keep_current_labels" && !restored) return false;
    if (mode === "cancel_failed" && !notWritten) return false;
    if (!["keep_restored", "keep_current_labels", "cancel_failed"].includes(
      mode
    )) return false;
    const confirmKey = mode === "keep_restored"
      ? "restoreReconcileAlignedConfirm" : mode === "cancel_failed"
        ? "restoreReconcileCancelFailedConfirm" : "restoreReconcileKeepConfirm";
    const message = mode !== "keep_current_labels" ? this._t(confirmKey)
      : this._tf(confirmKey, {
          added: comparison.added.length, removed: comparison.removed.length,
          modified: comparison.modified.length,
        });
    if (!window.confirm(message)) return false;
    this._restoreReconcileBusy = true;
    this._renderRestoreReconciliation();
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/resolve_restored_output",
        ...this._restoreReconcileReview,
        resolution: mode, confirmed: true,
      });
      if (result?.resolved !== true || result?.apply_performed !== false ||
          result?.production_unchanged !== true) {
        throw new Error("invalid_reconciliation");
      }
      this._restoreReconcileMessage = this._t("restoreReconcileResolved");
      await this._loadPreview();
      return true;
    } catch (_error) {
      this._restoreReconcileMessage = this._t("restoreReconcileError");
      await this._loadPreview();
      return false;
    } finally {
      this._restoreReconcileBusy = false;
      this._renderRestoreReconciliation();
    }
  }

  async _restoreMissingLabels() {
    const comparison = this._lastAnalysis?.comparison;
    if (!this._hass || !this._restoreReconcilePending ||
        this._restoreReconcileState !== "restored" ||
        !this._restoreReconcileReview || this._restoreReconcileBusy ||
        comparison?.status !== "ok" ||
        comparison.added?.length !== 0 ||
        comparison.modified?.length !== 0 ||
        !Array.isArray(comparison.removed) ||
        comparison.removed.length === 0 || comparison.removed.length > 100) return;
    const ids = [...comparison.removed];
    this._restoreReconcileBusy = true;
    this._renderRestoreReconciliation();
    try {
      // Use a fresh live HA registry; never infer labels from an old UI cache.
      const catalog = await this._hass.callWS({
        type: "ha_voice_label_sync/get_entities",
      });
      const entities = catalog?.entities || [];
      if (!ids.every(id => {
        const entity = entities.find(item => item.entity_id === id);
        return entity?.eligible === true && entity?.has_label === false;
      })) {
        this._restoreReconcileMessage = this._t("restoreReconcileCannotAdd");
        return;
      }
      if (!window.confirm(this._tf("restoreReconcileAddConfirm", {
        count: ids.length, entities: ids.join(", "),
      }))) return;
      for (const entity_id of ids) {
        await this._hass.callWS({
          type: "ha_voice_label_sync/set_entity_label",
          entity_id, enabled: true, expected_enabled: false,
        });
      }
      // Generate only the Preview. The durable writer hold protects production.
      await this._hass.callWS({type: "ha_voice_label_sync/generate_preview"});
      await this._loadPreview();
      if (this._lastAnalysis?.comparison?.identical_entities === true &&
          this._restoreReconcilePending === true) {
        // The user already confirmed restoring these labels. Ending the
        // hold is still a separate explicit server-side verified decision.
        const review = this._restoreReconcileReview;
        const resolved = await this._hass.callWS({
          type: "ha_voice_label_sync/resolve_restored_output",
          ...review, resolution: "keep_restored", confirmed: true,
        });
        if (resolved?.resolved !== true ||
            resolved?.production_unchanged !== true ||
            resolved?.apply_performed !== false) {
          throw new Error("reconciliation_failed");
        }
        this._restoreReconcileMessage = this._t("restoreReconcileResolved");
      } else {
        this._restoreReconcileMessage = this._t("restoreReconcileAfterLabels");
      }
    } catch (_error) {
      // Partial label changes can occur; the production hold remains in place
      // until the server verifies an explicit final reconciliation.
      this._restoreReconcileMessage = this._t("restoreReconcileError");
    } finally {
      await this._loadPreview();
      this._restoreReconcileBusy = false;
      this._renderRestoreReconciliation();
    }
  }

  async _restoreBackup() {
    // A backup is only a proposed configuration at this point. Do not write
    // google_assistant_entities.yaml or modify native HA labels here.
    const data = this._backupReview;
    const preparable = data &&
      ["ok", "missing"].includes(data.comparison?.status);
    if (this._stagedRestore && !preparable) {
      this._protectPendingDraft();
      return;
    }
    if (!preparable || this._restoring || this._applying ||
        this._refreshing || this._generating || this._entityWritePending) return;
    if (this._stagedRestore && !this._replacePendingProposal(data)) return;

    this._restoring = true;
    const requestId = (this._loadId || 0) + 1;
    this._loadId = requestId;
    this._review = null; // Never allow normal Apply for a staged restoration.
    this._updateApplyButton();
    const status = this.querySelector("#backupStatus");
    if (status) status.textContent = this._t("backupReviewing");

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_backup_preview",
        backup_id: data.backup_id,
        backup_sha256: data.backup_sha256,
        production_sha256: data.production_sha256,
        recommended: true,
      });
      if (this._loadId !== requestId) return;
      if (result?.mode !== "restore_preview" ||
          result?.available !== true || result?.can_apply !== false ||
          !["ok", "missing"].includes(result?.comparison?.status) ||
          typeof result?.content !== "string" ||
          !/^[0-9a-f]{64}$/.test(result.label_plan_sha256 || "") ||
          !result.label_plan || !result.projection) {
        throw new Error("Invalid restore Preview response");
      }
      this._stagedRestore = result;
      this._backupRestoreCompleted = false;
      this._previewContent = result.content;
      this._previewPath = result.path;
      this._applyBlockReason =
        result.comparison.identical_text === true &&
        !(result.label_plan.add?.length || result.label_plan.remove?.length)
          ? this._t("applyNoChanges")
          : this._t("backupPreviewNotExecutable");
      this._applyBlockReasonCode = null;
      this._renderAnalysis(result);
      this._setContent(result.content);
      this._updateApplyButton();
      this._activateTab("preview");
      const diff = result.comparison;
      const counts = diff.status === "missing" ? {
        added: result.summary?.total || 0, removed: 0, modified: 0,
      } : {
        added: diff.added.length, removed: diff.removed.length,
        modified: diff.modified.length,
      };
      this._setStatusKey("backupPreviewPrepared", counts);
      if (status) status.textContent = this._tf("backupPreviewPrepared", counts);
    } catch (error) {
      if (status) status.textContent = this._tf("backupReviewFailed", {
        error: error.message || String(error),
      });
    } finally {
      this._restoring = false;
      this._updateApplyButton();
    }
  }

  _invalidateHistoricalReview() {
    this._assistantHistoryRequestId = (this._assistantHistoryRequestId || 0) + 1;
    this._assistantHistoryBusy = false;
    this._assistantHistoryReport = null;
    this._assistantHistoryError = false;
  }

  _startNewSelection() {
    // Starting from the Assistant means choosing exposed entities, not
    // clearing existing HA labels or silently creating a YAML file.
    this._chooseMigrationIntent("new");
    this._activateTab("entities");
  }

  _chooseMigrationIntent(intent) {
    if (!["new", "existing", "unsure"].includes(intent)) return;
    // Only a local preference; this is never sent as migration authorization.
    this._migrationIntent = intent;
    this._assistantFileRequestId = (this._assistantFileRequestId || 0) + 1;
    this._assistantFileReport = null;
    this._assistantFileError = null;
    this._assistantFileChecking = false;
    this._assistantProvenanceChoice = null;
    this._assistantAdoptMessage = null;
    this._invalidateHistoricalReview();
    this._renderMigrationGuide();
    this._renderAssistantFileStatus();
  }

  _assistantPackagesDetected() {
    return this._migrationReport?.diagnostic?.global_blockers
      ?.includes("packages_not_yet_supported") === true;
  }

  _assistantFileExplanation(code) {
    const key = "fileIssue_" + code;
    return HVLS_TRANSLATIONS.en[key] ? this._t(key) : this._t("fileIssueUnknown");
  }

  _assistantHistoryEligible() {
    return this._assistantProvenanceAvailable() &&
      ["old", "unknown"].includes(this._assistantProvenanceChoice) &&
      !!(this._assistantFilePath || "").trim();
  }

  _assistantHistoryReason(code) {
    const mapping = {
      historical_review_folder_missing: "assistantHistoryNoFolder",
      historical_configuration_missing: "assistantHistoryNoConfig",
      packages_not_yet_supported: "assistantHistoryReasonPackages",
      symlink_historical_folder_not_allowed: "assistantHistoryReasonSymlink",
      symlink_historical_file_not_allowed: "assistantHistoryReasonSymlink",
      yaml_file_too_large: "assistantHistoryReasonTooLarge",
      include_missing: "assistantHistoryReasonMissing",
      invalid_entity_file_path: "assistantHistoryReasonUnsafe",
      sensitive_file_reference: "assistantHistoryReasonUnsafe",
      include_outside_review_directory: "assistantHistoryReasonUnsafe",
      invalid_historical_path: "assistantHistoryReasonUnsafe",
      yaml_syntax_error: "assistantHistoryReasonSyntax",
      duplicate_mapping_key: "assistantHistoryReasonSyntax",
      expected_mapping: "assistantHistoryReasonSyntax",
      invalid_exposed_domains: "assistantHistoryReasonSyntax",
      invalid_expose_by_default: "assistantHistoryReasonSyntax",
    };
    return this._t(mapping[code] || "assistantHistoryReasonOther");
  }

  _renderAssistantHistoryStatus() {
    const panel = this.querySelector("#assistantHistorical");
    if (!panel) return;
    const eligible = this._assistantHistoryEligible();
    panel.hidden = !eligible;
    if (!eligible) return;
    const heading = this.querySelector("#assistantHistoryTitle");
    const desc = this.querySelector("#assistantHistoryHow");
    const folder = this.querySelector("#assistantHistoryFolder");
    const safe = this.querySelector("#assistantHistorySafety");
    const action = this.querySelector("#assistantHistoryInspect");
    if (heading) heading.textContent = this._t("assistantHistoryTitle");
    if (desc) desc.textContent = this._t("assistantHistoryHow");
    if (folder) folder.textContent = this._t("assistantHistoryFolder");
    if (safe) safe.textContent = this._t("assistantHistorySafety");
    if (action) {
      action.textContent = this._t("assistantHistoryAction");
      action.disabled = this._assistantHistoryBusy === true;
    }
    const target = this.querySelector("#assistantHistoryResult");
    if (!target) return;
    target.replaceChildren();
    const add = (message) => {
      const p = document.createElement("p");
      p.textContent = message;
      target.appendChild(p);
    };
    if (this._assistantHistoryBusy) {
      add(this._t("assistantHistoryBusy"));
      return;
    }
    if (this._assistantHistoryError) {
      add(this._t("assistantHistoryUnavailable"));
      return;
    }
    const report = this._assistantHistoryReport;
    if (!report) {
      add(this._t("assistantHistoryIdle"));
      return;
    }
    if (report.status === "not_found") {
      add(this._assistantHistoryReason(report.reason));
      return;
    }
    if (report.status === "blocked") {
      add(this._tf("assistantHistoryBlocked", {
        reason: this._assistantHistoryReason(report.reason),
      }));
      return;
    }
    if (!["parsed", "review_required"].includes(report.status)) {
      add(this._t("assistantHistoryUnavailable"));
      return;
    }
    const declaration = {
      direct: "assistantHistoryDeclDirect",
      included: "assistantHistoryDeclIncluded",
      absent: "assistantHistoryDeclAbsent",
    };
    add(this._tf("assistantHistoryFound", {
      declaration: this._t(declaration[report.declaration] || "assistantHistoryDeclUnknown"),
    }));
    const rules = report.rules || {};
    if (["true", "false"].includes(rules.expose_by_default)) {
      const domainList = Array.isArray(rules.exposed_domains)
        ? rules.exposed_domains : [];
      const domains = !rules.exposed_domains_declared
        ? this._t("assistantHistoryDomainsNone")
        : domainList.length ? domainList.join(", ") :
          this._t("assistantHistoryDomainsEmpty");
      add(this._tf("assistantHistoryRules", {
        defaultValue: rules.expose_by_default,
        origin: this._t(rules.expose_by_default_explicit
          ? "assistantHistoryRuleExplicit" : "assistantHistoryRuleImplicit"),
        domains,
      }));
    }
    const source = report.entity_source || {};
    const sourceName = source.mode === "include"
      ? source.path || this._t("assistantHistorySourceUnknown")
      : source.mode === "inline" ? this._t("assistantHistorySourceInline")
      : source.mode === "not_declared" ? this._t("assistantHistorySourceAbsent")
      : this._t("assistantHistorySourceUnknown");
    add(this._tf("assistantHistorySource", {source: sourceName}));
    const matching = {
      same: "assistantHistoryPathSame",
      different: "assistantHistoryPathDifferent",
    };
    const matchingContent = {
      identical: "assistantHistoryContentIdentical",
      different: "assistantHistoryContentDifferent",
    };
    add(this._tf("assistantHistoryCompare", {
      pathStatus: this._t(matching[source.path_relation] || "assistantHistoryPathUnknown"),
      contentStatus: this._t(matchingContent[source.content_relation] ||
        "assistantHistoryContentUnknown"),
    }));
    if (source.counts && Number.isSafeInteger(source.counts.entries) &&
        Number.isSafeInteger(source.counts.entries_with_anomalies)) {
      add(this._tf("assistantHistoryCounts", {
        entries: source.counts.entries,
        anomalies: source.counts.entries_with_anomalies,
      }));
    }
    const issueTranslations = {
      historical_entity_file_missing: "assistantHistoryIssueHistoricalMissing",
      historical_google_assistant_absent: "assistantHistoryIssueNoConfig",
      historical_entity_config_absent: "assistantHistoryIssueNoEntity",
      historical_inline_entity_config: "assistantHistoryIssueInline",
      selected_current_entity_unavailable: "assistantHistoryIssueCurrentUnavailable",
    };
    const issues = (report.issues || []).slice(0, 12);
    if (issues.length) add(this._tf("assistantHistoryIssues", {
      issues: issues.map(code => this._t(
        issueTranslations[code] || "assistantHistoryReasonOther"
      )).join(" ; "),
    }));
  }

  async _inspectHistoricalYaml() {
    if (!this._hass || !this._assistantHistoryEligible() ||
        this._assistantHistoryBusy) return;
    const requestId = (this._assistantHistoryRequestId || 0) + 1;
    this._assistantHistoryRequestId = requestId;
    this._assistantHistoryBusy = true;
    this._assistantHistoryError = false;
    this._assistantHistoryReport = null;
    this._renderAssistantHistoryStatus();
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/inspect_historical_google_yaml",
        entity_path: this._assistantFilePath.trim(),
      });
      if (requestId !== this._assistantHistoryRequestId) return;
      if (result?.read_only === true &&
          result?.source_active_verified === false &&
          result?.historical_runtime_verified === false &&
          result?.google_home_state_verified === false &&
          result?.migration_authorized === false &&
          result?.stage_allowed === false &&
          result?.apply_allowed === false &&
          result?.cutover_allowed === false &&
          ["parsed", "review_required", "blocked", "not_found"].includes(result.status)) {
        this._assistantHistoryReport = result;
      } else {
        this._assistantHistoryError = true;
      }
    } catch (_error) {
      if (requestId === this._assistantHistoryRequestId) {
        this._assistantHistoryError = true;
      }
    } finally {
      if (requestId === this._assistantHistoryRequestId) {
        this._assistantHistoryBusy = false;
        this._renderAssistantHistoryStatus();
      }
    }
  }

  _assistantNeedsOutputTakeover() {
    const diag = this._migrationReport?.diagnostic;
    return diag?.mode === "assisted_migration" &&
      diag?.source?.status === "resolved" &&
      !this._assistantPackagesDetected() &&
      ["unmanaged_output", "owned_by_other_installation"].includes(
        this._applyBlockReasonCode
      );
  }

  _assistantAdoptionAvailable() {
    const diag = this._migrationReport?.diagnostic;
    const report = this._assistantFileReport;
    return (
      (diag?.mode === "new_configuration" &&
        diag?.source?.status === "resolved" &&
        !this._assistantPackagesDetected()) ||
      this._assistantNeedsOutputTakeover()
    ) &&
      ["existing", "unsure"].includes(this._migrationIntent) &&
      !this._assistantFileChecking && !this._assistantFileError &&
      ["parsed", "review_required"].includes(report?.status) &&
      report?.read_only === true &&
      report?.source_active_verified === false &&
      report?.migration_authorized === false &&
      report?.stage_allowed === false &&
      report?.apply_allowed === false &&
      report?.cutover_allowed === false &&
      /^[a-f0-9]{64}$/.test(report?.file_sha256 || "") &&
      Array.isArray(report?.adoption_entries);
  }

  _assistantAdoptionPlan() {
    if (!this._assistantAdoptionAvailable() ||
        !Array.isArray(this._entityCatalog?.entities)) return null;
    const report = this._assistantFileReport;
    const catalog = new Map(this._entityCatalog.entities.map(
      entity => [entity.entity_id, entity]
    ));
    const rows = [], candidates = [], recoverable = [], seen = new Set();
    const totals = {total: report.counts?.entries || 0,
      ready: 0, already: 0, recoverable: 0, missing: 0,
      ineligible: 0, excluded: 0, review: 0};
    for (const entry of report.adoption_entries) {
      if (!entry || typeof entry.entity_id !== "string" ||
          !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entry.entity_id) ||
          seen.has(entry.entity_id) ||
          !["expose", "exclude", "unset", "invalid"].includes(entry.exposure) ||
          typeof entry.has_customizations !== "boolean" ||
          !Array.isArray(entry.reasons)) return null;
      seen.add(entry.entity_id);
      const entity = catalog.get(entry.entity_id);
      let category = "review", reasonKey = null, noteKey = null;
      if (entry.reasons.length) {
        reasonKey = "assistantAdoptReviewYamlIssue";
      } else if (entry.exposure === "exclude") {
        category = "excluded";
        if (entity?.has_label === true) {
          noteKey = "assistantAdoptReviewExcludedLabeled";
        }
      } else if (entry.exposure !== "expose") {
        reasonKey = entry.exposure === "unset" ?
          "assistantAdoptReviewImplicitExposure" : "assistantAdoptReviewInvalidExposure";
      } else if (!entity) {
        category = "missing";
        reasonKey = "assistantAdoptReviewMissingEntity";
      } else if (entity.eligible !== true) {
        category = "ineligible";
        reasonKey = "assistantAdoptReviewIneligible";
      } else if (entity.has_label === true) {
        category = "already";
        recoverable.push(entry.entity_id);
      } else if (entity.has_label === false) {
        category = "ready";
        recoverable.push(entry.entity_id);
        candidates.push(entry.entity_id);
      } else {
        reasonKey = "assistantAdoptReviewUnknownLabel";
      }
      if (entry.has_customizations && ["ready", "already"].includes(category)) {
        noteKey = "assistantAdoptCustomValuesUnverified";
      }
      totals[category] += 1;
      rows.push({entity_id: entry.entity_id, category, reasonKey, noteKey});
    }
    const unlisted = Math.max(0, totals.total - rows.length);
    totals.review += unlisted;
    totals.recoverable = recoverable.length;
    const recovered = new Set(recoverable);
    totals.existingNew = this._entityCatalog.entities.filter(
      entity => entity.eligible === true && entity.has_label === true &&
        !recovered.has(entity.entity_id)
    ).length;
    totals.nextTotal = totals.recoverable + totals.existingNew;
    return {
      candidates, recoverable, rows, totals,
      complete: report.adoption_entries_complete === true &&
        unlisted <= (report.counts?.entries_with_anomalies || 0),
      canWrite: Array.isArray(this._entityCatalog.label_ids) &&
        this._entityCatalog.label_ids.length === 1,
    };
  }

  _renderAssistantAdoption() {
    const section = this.querySelector("#assistantAdoption");
    if (!section) return;
    section.hidden = !this._assistantAdoptionAvailable();
    if (section.hidden) {
      const takeover = this.querySelector("#assistantTakeoverSection");
      if (takeover) takeover.hidden = true;
      return;
    }
    for (const id of ["assistantAdoptTitle", "assistantAdoptIntro",
                      "assistantAdoptLimits", "assistantAdoptRefresh",
                      "assistantAdoptReview"]) {
      const node = this.querySelector("#" + id);
      if (node) node.textContent = this._t(id);
    }
    const plan = this._assistantAdoptionPlan();
    const summary = this.querySelector("#assistantAdoptSummary");
    if (summary) summary.textContent = !plan
      ? this._t("assistantAdoptNoCatalog")
      : this._tf("assistantAdoptCounts", plan.totals);
    const caution = this.querySelector("#assistantAdoptNeedsReview");
    if (caution) {
      caution.hidden = !plan || (plan.totals.review === 0 &&
        !plan.rows.some(row => row.noteKey));
      caution.textContent = this._t("assistantAdoptNeedsReview");
    }
    const refresh = this.querySelector("#assistantAdoptRefresh");
    if (refresh) refresh.disabled = this._assistantAdoptBusy === true ||
      this._entityLoading === true;
    const action = this.querySelector("#assistantAdoptApply");
    if (action) {
      action.textContent = plan?.recoverable.length
        ? this._tf("assistantAdoptAction", {count: plan.totals.nextTotal})
        : this._t("assistantAdoptNone");
      action.disabled = this._assistantAdoptBusy === true ||
        this._entityWritePending === true ||
        this._entityLoading === true ||
        !plan?.complete || !plan?.canWrite || !plan.recoverable.length ||
        !this._ownershipManaged || !this._recoveryPending;
    }
    const result = this.querySelector("#assistantAdoptResult");
    if (result) result.textContent = this._assistantAdoptMessage ||
      (plan && !plan.complete ? this._t("assistantAdoptTruncated") : "");
    const takeoverSection = this.querySelector("#assistantTakeoverSection");
    const takeoverVisible = this._assistantAdoptionAvailable() &&
      ["unmanaged_output", "owned_by_other_installation"].includes(
        this._applyBlockReasonCode
      );
    const reinstall = this._applyBlockReasonCode ===
      "owned_by_other_installation";
    if (takeoverSection) takeoverSection.hidden = !takeoverVisible &&
      !this._assistantTakeoverMessage;
    for (const id of ["assistantTakeoverTitle", "assistantTakeoverIntro",
                      "assistantTakeoverButton"]) {
      const node = this.querySelector("#" + id);
      if (!node) continue;
      const key = reinstall
        ? {assistantTakeoverTitle: "assistantReinstallTitle",
           assistantTakeoverIntro: "assistantReinstallIntro",
           assistantTakeoverButton: "assistantReinstallAction"}[id]
        : id === "assistantTakeoverButton" ? "assistantTakeoverAction" : id;
      node.textContent = this._t(key);
    }
    const takeoverAction = this.querySelector("#assistantTakeoverButton");
    if (takeoverAction) takeoverAction.hidden = !takeoverVisible;
    if (takeoverAction) takeoverAction.disabled = !takeoverVisible ||
      this._assistantTakeoverBusy === true ||
      this._assistantAdoptBusy === true ||
      this._entityWritePending === true || this._generating === true ||
      this._applying === true || this._restoring === true ||
      this._refreshing === true;
    const takeoverResult = this.querySelector("#assistantTakeoverResult");
    if (takeoverResult) takeoverResult.textContent = this._assistantTakeoverMessage || "";
    const container = this.querySelector("#assistantAdoptRows");
    if (container) {
      container.replaceChildren();
      for (const entry of (plan?.rows || []).slice(0, 200)) {
        const line = document.createElement("p");
        const key = {
          ready: "assistantAdoptReasonAdd",
          already: "assistantAdoptReasonAlready",
          excluded: "assistantAdoptReasonExclude",
          missing: "assistantAdoptReasonReview",
          ineligible: "assistantAdoptReasonReview",
          review: "assistantAdoptReasonReview",
        }[entry.category];
        const details = [entry.reasonKey, entry.noteKey]
          .filter(Boolean).map(reasonKey => this._t(reasonKey));
        line.textContent = entry.entity_id + " — " + this._t(key) +
          (details.length ? " (" + details.join("; ") + ")" : "");
        container.appendChild(line);
      }
    }
  }

  async _takeOverAssistantFile() {
    if (this._protectPendingDraft()) return;
    if (!this._hass || !this._assistantAdoptionAvailable() ||
        !["unmanaged_output", "owned_by_other_installation"].includes(
          this._applyBlockReasonCode
        ) ||
        this._assistantTakeoverBusy || this._assistantAdoptBusy ||
        this._entityWritePending || this._generating ||
        this._applying || this._restoring || this._refreshing) return;
    const path = this._assistantFilePath.trim();
    const requestId = this._assistantFileRequestId || 0;
    const originalDigest = this._assistantFileReport?.file_sha256;
    this._assistantTakeoverBusy = true;
    this._assistantTakeoverMessage = this._t("assistantTakeoverBusy");
    this._renderAssistantAdoption();
    try {
      const prepared = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_existing_output_takeover", path,
      });
      if (requestId !== (this._assistantFileRequestId || 0) ||
          this._assistantFilePath.trim() !== path ||
          this._assistantFileReport?.file_sha256 !== originalDigest ||
          prepared?.eligible !== true ||
          prepared.selected_path !== path ||
          prepared.production_sha256 !== originalDigest ||
          !/^[0-9a-f]{64}$/.test(prepared.preview_sha256 || "")) {
        throw new Error("stale_source");
      }
      const plan = this._assistantAdoptionPlan();
      if (!plan?.complete || !plan.canWrite ||
          prepared.entities !== plan.totals.total) {
        throw new Error("recovery_inventory_changed");
      }
      const confirmed = window.confirm(
        (prepared.recorded_sha_mismatch ?
          this._t("assistantRecoveryChangedNote") : "") +
        this._tf("assistantRecoveryTakeoverConfirm", plan.totals)
      );
      if (!confirmed) {
        this._assistantTakeoverMessage = "";
        return;
      }
      // Confirm rechecks both hashes server-side under the common writer lock.
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/confirm_existing_output_takeover",
        path, production_sha256: prepared.production_sha256,
        preview_sha256: prepared.preview_sha256, confirmed: true,
        previous_entry_id: prepared.previous_entry_id,
        previous_sha256: prepared.previous_sha256,
        ownership_revision: prepared.ownership_revision,
        acknowledge_changed_output: prepared.recorded_sha_mismatch === true,
      });
      if (result?.taken_over !== true ||
          result?.production_unchanged !== true ||
          result?.apply_performed !== false ||
          typeof result.backup_name !== "string") {
        throw new Error("unverified_result");
      }
      this._assistantTakeoverMessage = this._t("assistantRecoveryReady") +
        " " + result.backup_name;
      // Refresh the server's ownership evaluation, never apply the Preview.
      await this._loadPreview();
    } catch (error) {
      const message = String(error?.message || "");
      this._assistantTakeoverMessage = message.includes(
        "ownership_registration_failed_after_backup"
      ) ? this._t("assistantTakeoverRegistrationFailed")
        : this._t("assistantTakeoverFailure");
      // A backup or ownership record may already exist; always reread.
      await this._loadPreview();
    } finally {
      this._assistantTakeoverBusy = false;
      this._renderAssistantAdoption();
    }
  }

  async _adoptAssistantFile() {
    if (this._protectPendingDraft()) return;
    const plan = this._assistantAdoptionPlan();
    if (!this._hass || !plan?.complete || !plan.canWrite ||
        !plan.recoverable.length || !this._ownershipManaged ||
        !this._recoveryPending || this._assistantAdoptBusy ||
        this._entityWritePending || this._entityLoading ||
        this._applying || this._restoring || this._generating) return;
    const path = this._assistantFilePath.trim();
    const original = this._assistantFileReport;
    const requestId = this._assistantFileRequestId || 0;
    this._assistantAdoptBusy = true;
    this._entityWritePending = true;
    this._stagedRestore = null;
    this._review = null;
    this._updateApplyButton();
    try {
      const fresh = await this._hass.callWS({
        type: "ha_voice_label_sync/inspect_assistant_entity_file", path,
      });
      if (requestId !== (this._assistantFileRequestId || 0) ||
          this._assistantFilePath.trim() !== path ||
          fresh?.file_sha256 !== original?.file_sha256 ||
          JSON.stringify(fresh.adoption_entries) !==
            JSON.stringify(original?.adoption_entries)) {
        throw new Error("stale_source");
      }
      if (!await this._loadEntities()) throw new Error("catalog_unavailable");
      const current = this._assistantAdoptionPlan();
      if (!current?.complete || !current.canWrite ||
          JSON.stringify(current.recoverable.slice().sort()) !==
            JSON.stringify(plan.recoverable.slice().sort())) {
        throw new Error("stale_catalog");
      }
      // Start from the old YAML selection but use CURRENT HA eligibility.
      // Any former entity missing from HA is removed from the NEW YAML only.
      const desired = new Set(current.recoverable);
      // Current HA labels are a newer explicit selection than the old YAML.
      // A recovery may ADD the missing labels, but never silently REMOVE
      // existing HVLS labels just because the legacy file omitted them.
      const extraSelected = this._entityCatalog.entities.filter(
        entity => entity.eligible === true && entity.has_label === true &&
          !desired.has(entity.entity_id)
      );
      extraSelected.forEach(entity => desired.add(entity.entity_id));
      const changes = this._entityCatalog.entities
        .filter(entity =>
          desired.has(entity.entity_id) && entity.has_label === false)
        .map(entity => ({
          entity_id: entity.entity_id, enabled: true,
        }))
        .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
      if (changes.length > 500) throw new Error("too_many_label_changes");
      const preview = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_manual_label_preview",
        changes, recovery: true,
      });
      if (preview?.mode !== "label_preview" ||
          preview.recovery !== true || preview.projection?.ready !== true ||
          !Array.isArray(preview.changes) ||
          !/^[a-f0-9]{64}$/.test(preview.label_plan_sha256 || "") ||
          preview.production_sha256 !== original.file_sha256 ||
          preview.summary?.total !== desired.size) {
        throw new Error("recovery_preview_inconsistent");
      }
      this._manualLabelChanges = new Map(changes.map(
        item => [item.entity_id, item.enabled]
      ));
      this._stagedRestore = preview;
      this._previewContent = preview.content;
      this._previewPath = preview.path;
      this._applyBlockReason = this._t("manualLabelHelp");
      this._applyBlockReasonCode = null;
      this._renderAnalysis(preview);
      this._setContent(preview.content);
      this._assistantAdoptMessage = this._t("assistantRecoveryPreviewPrepared");
      this._activateTab("preview");
    } catch (error) {
      this._stagedRestore = null;
      this._manualLabelChanges = null;
      this._assistantAdoptMessage = this._tf("assistantRecoveryPreviewFailed", {
        error: error?.message || String(error),
      });
    } finally {
      this._entityWritePending = false;
      this._assistantAdoptBusy = false;
      this._renderAssistantAdoption();
      this._updateApplyButton();
    }
  }

  _assistantProvenanceAvailable() {
    const diag = this._migrationReport?.diagnostic;
    const report = this._assistantFileReport;
    return diag?.mode === "new_configuration" &&
      diag?.source?.status === "resolved" &&
      ["existing", "unsure"].includes(this._migrationIntent) &&
      !this._assistantFileChecking && !this._assistantFileError &&
      ["parsed", "review_required"].includes(report?.status) &&
      report?.read_only === true &&
      report?.source_active_verified === false &&
      report?.migration_authorized === false &&
      report?.stage_allowed === false &&
      report?.apply_allowed === false &&
      report?.cutover_allowed === false;
  }

  _chooseAssistantProvenance(choice) {
    if (!["old", "unknown", "new"].includes(choice) ||
        !this._assistantProvenanceAvailable()) return;
    // User recollection is local UI context only. Not provenance evidence.
    // Never pass it to migration APIs or persist it in HA.
    this._assistantProvenanceChoice = choice;
    this._invalidateHistoricalReview();
    // The next-step guide is tied to this local selection, not evidence.
    const help = this.querySelector("#assistantProvenanceHelp");
    if (help) help.open = false;
    this._renderAssistantProvenance();
  }

  _renderAssistantProvenance() {
    const section = this.querySelector("#assistantProvenance");
    if (!section) return;
    const visible = this._assistantProvenanceAvailable();
    section.hidden = !visible;
    if (!visible) {
      this._renderAssistantHistoryStatus();
      return;
    }
    const textIds = {
      assistantProvenanceStep: "assistantProvenanceStep",
      assistantProvenanceQuestion: "assistantProvenanceQuestion",
      assistantProvenanceVerifiedTitle: "assistantProvenanceVerifiedTitle",
      assistantProvenanceVerified: "assistantProvenanceVerified",
      assistantProvenanceMissingTitle: "assistantProvenanceMissingTitle",
      assistantProvenanceMissing: "assistantProvenanceMissing",
      assistantProvenanceNextTitle: "assistantProvenanceNextTitle",
      assistantProvenanceSafety: "assistantProvenanceSafety",
    };
    for (const [id, key] of Object.entries(textIds)) {
      const node = this.querySelector("#" + id);
      if (node) node.textContent = this._t(key);
    }
    const choices = {
      old: ["assistantProvenanceOld", "assistantProvenanceNextOld"],
      unknown: ["assistantProvenanceUnknown", "assistantProvenanceNextUnknown"],
      new: ["assistantProvenanceNew", "assistantProvenanceNextNew"],
    };
    for (const [value, [id]] of Object.entries(choices)) {
      const button = this.querySelector("#" + id);
      if (!button) continue;
      button.textContent = this._t(id);
      button.setAttribute(
        "aria-pressed", String(this._assistantProvenanceChoice === value)
      );
    }
    const next = this.querySelector("#assistantProvenanceNext");
    if (next) next.textContent = this._t(
      choices[this._assistantProvenanceChoice]?.[1] ||
      "assistantProvenanceNextChoose"
    );
    const source = this.querySelector("#assistantProvenanceSource");
    if (source) source.textContent = this._assistantFilePath
      ? this._t("assistantProvenanceSourceLabel") + " : " + this._assistantFilePath
      : this._t("assistantProvenanceSourceLabelUnknown");
    const help = this.querySelector("#assistantProvenanceHelp");
    if (help) {
      // "New configuration" must not suggest recovering historical evidence.
      help.hidden = !["old", "unknown"].includes(this._assistantProvenanceChoice);
      if (help.hidden) help.open = false;
    }
    const guideIds = [
      "assistantProvenanceChecklistTrigger",
      "assistantProvenanceChecklistIntro",
      "assistantProvenanceChecklist1",
      "assistantProvenanceChecklist2",
      "assistantProvenanceChecklist3",
      "assistantProvenanceChecklist4",
      "assistantProvenanceChecklistEnd",
    ];
    for (const id of guideIds) {
      const node = this.querySelector("#" + id);
      if (node) node.textContent = this._t(id);
    }
    const advancedTitle = this.querySelector("#assistantProvenanceAdvancedTitle");
    if (advancedTitle) advancedTitle.textContent = this._t("assistantProvenanceAdvanced");
    this._renderAssistantHistoryStatus();
    const anomalies = this._assistantFileReport?.counts?.entries_with_anomalies;
    const issues = this.querySelector("#assistantProvenanceAnomalies");
    if (issues) {
      issues.hidden = !Number.isSafeInteger(anomalies) || anomalies <= 0;
      issues.textContent = issues.hidden ? "" :
        this._tf("assistantProvenanceAnomalies", {count: anomalies});
    }
  }

  _renderAssistantFileStatus() {
    const input = this.querySelector("#assistantFilePath");
    const button = this.querySelector("#assistantFileCheck");
    const status = this.querySelector("#assistantFileResult");
    const safe = this.querySelector("#assistantFileSafety");
    const title = this.querySelector("#assistantFileTitle");
    const label = this.querySelector("#assistantFilePathLabel");
    const examples = this.querySelector("#assistantFileExamples > summary");
    if (title) title.textContent = this._t("assistantFileTitle");
    if (label) label.textContent = this._t("assistantFilePathLabel");
    if (examples) examples.textContent = this._t("assistantFileHelp");
    if (safe) safe.textContent = this._t("assistantFileSafety");
    if (input) {
      input.placeholder = this._t("assistantFilePlaceholder");
      if (input.value !== (this._assistantFilePath || "")) {
        input.value = this._assistantFilePath || "";
      }
    }
    if (button) {
      button.textContent = this._t("assistantFileCheck");
      button.disabled = this._assistantFileChecking === true ||
        !(this._assistantFilePath || "").trim();
    }
    const report = this._assistantFileReport;
    const counts = report?.counts || {};
    const inspected = !this._assistantFileChecking && !this._assistantFileError &&
      ["parsed", "review_required"].includes(report?.status);
    const fields = [
      ["Entries", "entries", "assistantFileMetricEntries"],
      ["True", "explicitly_exposed", "assistantFileMetricTrue"],
      ["False", "explicitly_excluded", "assistantFileMetricFalse"],
      ["Unset", "expose_not_set", "assistantFileMetricUnset"],
      ["Issues", "entries_with_anomalies", "assistantFileMetricIssues"],
    ];
    const metrics = this.querySelector("#assistantFileMetrics");
    const complete = inspected && fields.every(
      ([, key]) => Number.isSafeInteger(counts[key]) && counts[key] >= 0
    );
    if (metrics) {
      metrics.hidden = !complete;
      metrics.setAttribute("aria-label", this._t("assistantFileResultsTitle"));
    }
    for (const [name, key, labelKey] of fields) {
      const number = this.querySelector("#assistantMetric" + name);
      const label = this.querySelector("#assistantLabel" + name);
      if (number) number.textContent = complete ? String(counts[key]) : "—";
      if (label) label.textContent = this._t(labelKey);
    }
    const unset = this.querySelector("#assistantFileUnsetExplanation");
    if (unset) {
      unset.hidden = !complete || counts.expose_not_set === 0;
      unset.textContent = this._t("assistantFileUnsetExplanation");
    }
    const conclusion = this.querySelector("#assistantFileConclusion");
    if (conclusion) {
      const diag = this._migrationReport?.diagnostic;
      const note = this._assistantPackagesDetected()
        ? "assistantFilePackagesConclusion"
        : diag?.mode === "new_configuration"
          ? "assistantFileUnreferencedConclusion"
          : "assistantFileGeneralConclusion";
      conclusion.hidden = !inspected;
      conclusion.textContent = inspected ? this._t(note) : "";
    }
    if (!status) return;
    if (this._assistantFileChecking) {
      status.textContent = this._t("assistantFileChecking");
    } else if (this._assistantFileError) {
      status.textContent = this._t("assistantFileUnavailable");
    } else if (!report) {
      status.textContent = this._t("assistantFileNotChecked");
    } else if (report.status === "blocked") {
      status.textContent = this._tf("assistantFileCannotRead", {
        reason: this._assistantFileExplanation(report.reason),
      });
    } else if (["parsed", "review_required"].includes(report.status)) {
      const intro = this._tf("assistantFileChecked", {
        entries: counts.entries ?? 0,
        anomalies: counts.entries_with_anomalies ?? 0,
      });
      const issueList = (report.issue_examples || []).slice(0, 20).map(issue => {
        const reasons = (issue.reasons || []).map(
          code => this._assistantFileExplanation(code)
        ).join(", ");
        const line = this._t("fileIssueLine");
        return `${issue.entity_id || "—"} (${line} ${issue.line}: ${reasons})`;
      });
      status.textContent = intro + " " + (issueList.length
        ? this._tf("assistantFileIssues", {issues: issueList.join(" ; ")})
        : this._t("assistantFileNoIssues"));
    } else {
      status.textContent = this._t("assistantFileUnavailable");
    }
    this._renderAssistantAdoption();
    this._renderAssistantProvenance();
  }

  async _checkAssistantEntityFile() {
    const path = (this._assistantFilePath || "").trim();
    if (!this._hass || this._assistantFileChecking || !path) return;
    const relevant = this._migrationReport?.diagnostic?.mode === "new_configuration" ||
      this._assistantPackagesDetected() || this._assistantNeedsOutputTakeover();
    if (!relevant || this._migrationIntent === "new") return;
    const requestId = (this._assistantFileRequestId || 0) + 1;
    this._assistantFileRequestId = requestId;
    this._assistantFileChecking = true;
    this._assistantFileReport = null;
    this._assistantFileError = null;
    this._assistantProvenanceChoice = null;
    this._invalidateHistoricalReview();
    this._renderAssistantFileStatus();
    try {
      const report = await this._hass.callWS({
        type: "ha_voice_label_sync/inspect_assistant_entity_file",
        path,
      });
      if (requestId === this._assistantFileRequestId &&
          report?.read_only === true && report?.migration_authorized === false &&
          report?.stage_allowed === false && report?.apply_allowed === false &&
          report?.cutover_allowed === false &&
          report?.source_active_verified === false) {
        this._assistantFileReport = report;
      } else if (requestId === this._assistantFileRequestId) {
        this._assistantFileError = true;
      }
    } catch (_error) {
      if (requestId === this._assistantFileRequestId) {
        this._assistantFileError = true;
      }
    } finally {
      // A previous answer must never overwrite results of a changed path.
      if (requestId === this._assistantFileRequestId) {
        this._assistantFileChecking = false;
        this._renderAssistantFileStatus();
      }
    }
  }

  _renderMigrationGuide() {
    const guide = this.querySelector("#migrationGuide");
    if (!guide) return;
    const diag = this._migrationReport?.diagnostic;
    const packages = this._assistantPackagesDetected();
    const isNew = diag?.mode === "new_configuration" &&
      diag?.source?.status === "resolved";
    const needsTakeover = this._assistantNeedsOutputTakeover();
    // The YAML connection help remains available outside entity-file import.
    // Do not interpret an unknown diagnosis as a missing declaration.
    const connectionHint = this.querySelector("#assistantGoogleConnectionHint");
    if (connectionHint) {
      connectionHint.hidden = !isNew;
      connectionHint.textContent = isNew
        ? this._t("assistantGoogleConnectionHint") : "";
    }
    const examples = this.querySelector("#assistantFileExamples");
    if (examples && diag && !this._assistantExamplesInitialized) {
      examples.open = isNew;
      this._assistantExamplesInitialized = true;
    }
    const relevant = isNew || packages || needsTakeover;
    const detected = this.querySelector("#assistantSourceDetected");
    if (detected) {
      const found = diag?.mode === "assisted_migration" &&
        diag?.source?.status === "resolved";
      detected.hidden = !found;
      if (found) {
        const title = this.querySelector("#assistantSourceTitle");
        if (title) title.textContent = this._t("assistantSourceFound");
        const summary = this.querySelector("#assistantSourceSummary");
        if (summary) summary.textContent = this._tf("assistantSourceSummary", {
          entries: diag.counts?.explicit_yaml_entries ?? 0,
          paths: (diag.source?.locations || []).map(x => x.path).join(", "),
        });
      }
    }
    guide.hidden = !relevant;
    if (needsTakeover && !this._migrationIntent) {
      // Production YAML already exists but is protected. Open the safe
      // inspection/takeover path, not the unrelated 6404-entity audit.
      this._migrationIntent = "existing";
    }
    if (relevant && !this._migrationIntent && !this._onboardingChoiceApplied &&
        ["new", "existing"].includes(this._onboardingMode) && !packages) {
      // Carry the initial installer choice forward rather than asking again.
      // The user can still choose a different path explicitly at any time.
      this._migrationIntent = this._onboardingMode;
      this._onboardingChoiceApplied = true;
    }
    if (!relevant) {
      this._migrationIntent = null;
      this._assistantFileReport = null;
      this._assistantProvenanceChoice = null;
      this._renderAssistantAdoption();
      this._renderAssistantProvenance();
      return;
    }
    guide.setAttribute("aria-label", this._t("migrationGuideTitle"));
    const keys = {
      migrationGuideTitle: "migrationGuideTitle",
      migrationGuideDetected: "migrationGuideDetected",
      migrationGuideQuestion: "migrationGuideQuestion",
      migrationGuideSafety: "migrationGuideNoAuthorization",
      migrationIntentNew: "migrationGuideNew",
      migrationIntentExisting: "migrationGuideExisting",
      migrationIntentUnsure: "migrationGuideUnsure",
    };
    for (const [id, key] of Object.entries(keys)) {
      const element = this.querySelector("#" + id);
      if (element) element.textContent = this._t(key);
    }
    const hasCandidate = diag?.source?.unreferenced_google_entity_file_present === true ||
      (needsTakeover && (diag.source.locations || []).some(
        location => location.path === "google_assistant_entities.yaml"
      ));
    const candidate = this.querySelector("#migrationGuideCandidate");
    if (candidate) candidate.textContent = this._t(packages
      ? "assistantPackagesDetected"
      : hasCandidate ? "migrationGuideCandidate" : "migrationGuideNoCandidate"
    );
    const detectedNote = this.querySelector("#migrationGuideDetected");
    if (detectedNote) detectedNote.textContent = isNew && !packages
      ? this._t("migrationGuideDetected") : "";
    const question = this.querySelector("#migrationGuideQuestion");
    const questionKey = packages ? "assistantPackagesQuestion" :
      this._migrationIntent === "new" ? "migrationGuideSelectedNew" :
      this._migrationIntent === "existing" ? "migrationGuideSelectedExisting" :
      this._migrationIntent === "unsure" ? "migrationGuideSelectedUnsure" :
      "migrationGuideQuestion";
    if (question) question.textContent = this._t(questionKey);
    const choiceDetails = this.querySelector("#migrationChoiceDetails");
    if (choiceDetails) {
      choiceDetails.hidden = packages;
      if (!this._onboardingChoiceDisplaySet) {
        choiceDetails.open = !["existing", "new"].includes(this._onboardingMode);
        this._onboardingChoiceDisplaySet = true;
      }
    }
    const choiceTitle = this.querySelector("#migrationChoiceTitle");
    if (choiceTitle) choiceTitle.textContent = this._t("migrationChangeChoice");
    const intentControls = ["migrationIntentNew", "migrationIntentExisting", "migrationIntentUnsure"];
    for (const id of intentControls) {
      const element = this.querySelector("#" + id);
      if (element) element.hidden = packages;
    }
    const options = {
      new: ["migrationIntentNew", "migrationGuideNextNew"],
      existing: ["migrationIntentExisting", "migrationGuideNextExisting"],
      unsure: ["migrationIntentUnsure", "migrationGuideNextUnsure"],
    };
    for (const [value, [id]] of Object.entries(options)) {
      this.querySelector("#" + id)?.setAttribute(
        "aria-pressed", String(this._migrationIntent === value)
      );
    }
    const step = this.querySelector("#migrationGuideStep");
    const stepKey = packages || this._migrationIntent === "new"
      ? "migrationGuideStepVerify"
      : ["existing", "unsure"].includes(this._migrationIntent)
        ? "assistantProvenanceStepVerify" : "migrationGuideStepIdentify";
    if (step) step.textContent = this._t(stepKey);
    const next = this.querySelector("#migrationGuideNext");
    if (next) next.textContent = packages ? this._t("assistantPackagesQuestion") :
      this._t(options[this._migrationIntent]?.[1] || "migrationGuideAwaitChoice");
    const fileSection = this.querySelector("#assistantFileSection");
    const showFile = packages || this._migrationIntent === "existing" ||
      this._migrationIntent === "unsure";
    if (fileSection) fileSection.hidden = !showFile;
    if (showFile && this._assistantFilePath == null) {
      this._assistantFilePath = !packages && hasCandidate
        ? "google_assistant_entities.yaml" : "";
    }
    const hint = this.querySelector("#assistantFileHint");
    if (hint) hint.textContent = this._t(!packages && hasCandidate
      ? "assistantFileCandidate" : "assistantFileManual");
    this._renderAssistantFileStatus();
  }

  _activateTab(tab) {
    const panels = {
      summary: "#tab-summary",
      exclusions: "#tab-exclusions",
      entities: "#entityManager",
      preview: "#tab-preview",
      backups: "#tab-backups",
      migration: "#tab-migration",
    };

    if (!Object.hasOwn(panels, tab)) return;
    if (tab === "exclusions" &&
        this.querySelector('.hvls-tab[data-tab="exclusions"]')?.hidden) return;

    for (const [name, selector] of Object.entries(panels)) {
      this.querySelector(selector).hidden = name !== tab;
    }

    this.querySelectorAll(".hvls-tab").forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    // Read the live filesystem each time the Backups tab is opened.
    if (tab === "backups") this._loadBackups();
    if (tab === "migration" && !this._migrationReport && !this._migrationLoading) {
      this._loadMigrationReview();
    }
  }

  async _loadMigrationReview() {
    if (!this._hass || this._migrationLoading) return;
    this._migrationLoading = true;
    const requestId = (this._migrationRequestId || 0) + 1;
    this._migrationRequestId = requestId;
    // A refreshed HA diagnostic invalidates any earlier standalone file check.
    this._assistantFileRequestId = (this._assistantFileRequestId || 0) + 1;
    this._assistantFileReport = null;
    this._assistantFileError = null;
    this._assistantFileChecking = false;
    this._assistantProvenanceChoice = null;
    this._invalidateHistoricalReview();
    const button = this.querySelector("#migrationAnalyze");
    if (button) button.disabled = true;
    this._renderMigrationReview();
    try {
      // Admin-only and read-only: how Google Assistant is configured today.
      const diagnostic = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_diagnostic",
      });
      if (requestId !== this._migrationRequestId) return;
      this._migrationReport = {diagnostic};
      this._migrationError = null;
    } catch (_error) {
      if (requestId !== this._migrationRequestId) return;
      // Do not display arbitrary backend exception text in the admin UI.
      this._migrationError = "migration_diagnostic_unavailable";
      this._migrationReport = null;
    } finally {
      if (requestId === this._migrationRequestId) {
        this._migrationLoading = false;
        if (button) button.disabled = false;
        this._renderMigrationReview();
      }
    }
  }

  _renderMigrationReview() {
    this._renderMigrationGuide();
    this._renderMigrationManagedNotice();
    const status = this.querySelector("#migrationStatus");
    if (!status) return;
    status.textContent = this._migrationLoading
      ? this._t("migrationLoading")
      : this._migrationError
        ? this._tf("migrationFailed", {error: this._migrationError})
        : "";
  }

  _renderMigrationManagedNotice() {
    // Once HVLS owns the YAML and no restore or recovery is pending, say so:
    // the Preview is where changes are made.
    const managed = this._ownershipManaged === true &&
      this._recoveryPending === false &&
      this._restoreReconcilePending !== true;
    const notice = this.querySelector("#migrationManagedNotice");
    if (notice) {
      notice.hidden = !managed;
      notice.textContent = managed ? this._t("migrationManagedNotice") : "";
    }
  }

  _setStatus(message) {
    this._statusKey = null;
    const status = this.querySelector("#status");
    if (status) status.textContent = message;
  }

  _setContent(content) {
    const preview = this.querySelector("#content");
    if (preview) preview.textContent = content;
  }
}

customElements.define("hvls-preview-panel", HVLSPreviewPanel);
