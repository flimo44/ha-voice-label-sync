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
    assistantProvenanceStepVerify: "Étape 2 sur 3 — Vérifiez le fichier YAML",
    migrationAdvancedTitle: "Outils de diagnostic et de migration (avancé)",
    migrationRecoveryAttention: "Une opération antérieure nécessite une vérification. Ouvrez les outils avancés avant de continuer.",
    migrationGuideDetected: "Aucune déclaration google_assistant: détectée. Cela n'empêche pas HVLS de gérer et générer le fichier d'entités.",
    migrationGuideCandidate: "Un fichier google_assistant_entities.yaml existe. Vous pouvez le reprendre pour initialiser vos labels HVLS, même sans connexion Google Assistant.",
    migrationGuideNoCandidate: "Aucun fichier google_assistant_entities.yaml habituel n'a été détecté. D'autres sources peuvent néanmoins exister.",
    migrationGuideQuestion: "Comment souhaitez-vous démarrer HVLS ?",
    migrationGuideNew: "Partir d'une sélection vide",
    migrationGuideExisting: "Reprendre un fichier d'entités",
    migrationGuideUnsure: "Choisir un autre fichier",
    migrationGuideNextNew: "Parcours nouvelle configuration choisi pour cet écran. Avant toute génération, vérifiez les fichiers déjà présents. Rien n'a été créé ni écrasé.",
    migrationGuideNextExisting: "Vérifiez le fichier d'entités, puis examinez les labels à reprendre. Aucune connexion Google Assistant n'est requise.",
    migrationGuideNextUnsure: "Indiquez le chemin relatif du fichier YAML à reprendre, puis vérifiez son contenu.",
    migrationGuideAwaitChoice: "Choisissez : reprendre le fichier, choisir un autre fichier ou repartir de zéro.",
    migrationGuideNoAuthorization: "Ce choix est local à cet écran ; il ne valide aucune migration et n'autorise aucune écriture.",
    assistantSourceFound: "Configuration Google Assistant détectée",
    assistantSourceSummary: "{entries} entité(s) déclarée(s). Fichiers analysés : {paths}. Aucune exposition Google Home certifiée.",
    assistantPackagesDetected: "Configuration par packages détectée : classée « Autre configuration », non analysée automatiquement.",
    assistantPackagesQuestion: "Indiquez manuellement le fichier YAML contenant les entités à examiner.",
    assistantFileHelp: "ⓘ Voir les exemples de syntaxe YAML",
    assistantExampleDirect: "Dans configuration.yaml :",
    assistantExampleInclude: "Variante avec fichier inclus dans configuration.yaml :",
    assistantExampleIncludedContent: "Dans google_assistant.yaml :",
    assistantExampleNote: "Exemples structurels seulement : d'autres paramètres sont nécessaires. Ne les ajoutez pas à une configuration active sans vérifier les effets Google Home.",
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
    assistantAdoptIntro: "Vous pouvez reprendre les entités de ce fichier pour gérer vos labels et générer un Preview YAML, sans configurer Google Assistant. Le fichier d'origine reste intact.",
    assistantAdoptNoCatalog: "Le catalogue des entités Home Assistant n'est pas chargé. Actualisez la comparaison avant de poursuivre.",
    assistantAdoptRefresh: "Actualiser la comparaison des labels",
    assistantAdoptCounts: "{ready} à ajouter · {already} déjà dans HVLS · {excluded} exclusions conservées · {review} à examiner.",
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
    assistantAdoptLimits: "Ajout proposé uniquement pour expose: true, sans personnalisation et avec entité éligible. Les autres restent visibles sans bloquer l'ensemble.",
    assistantAdoptAction: "Ajouter {count} label(s) HVLS",
    assistantAdoptNone: "Aucun ajout automatique proposé. Vous pouvez toujours gérer les entités individuellement dans l'onglet Gestion des entités HVLS.",
    assistantTakeoverTitle: "Confier le fichier existant à HVLS",
    assistantTakeoverIntro: "Si ce fichier est le fichier de production configuré, HVLS peut le sauvegarder puis enregistrer sa prise en charge, sans réécrire son contenu. Les différences avec le Preview restent soumises à un Apply distinct.",
    assistantTakeoverAction: "Vérifier et reprendre ce fichier",
    assistantTakeoverConfirm: "Confier le fichier {path} à HVLS ?\n\nEntités actuelles : {entities} ({issues} à examiner).\nDifférences proposées par le Preview : {added} ajout(s), {removed} suppression(s), {modified} modification(s).\n\nUne sauvegarde obligatoire sera créée. Le fichier de production ne sera PAS modifié et aucun Apply ne sera lancé. Seule sa gestion future par HVLS sera autorisée.",
    assistantTakeoverSuccess: "Fichier repris par HVLS. Sauvegarde vérifiée : {backup}. Aucun Apply effectué. Examinez les différences dans Preview avant toute application.",
    assistantTakeoverFailure: "Reprise refusée ou incomplète : vérifiez le fichier, les sauvegardes et le statut de propriété, puis actualisez. Aucun Apply automatique.",
    assistantTakeoverBusy: "Vérification et sauvegarde du fichier en cours…",
    assistantAdoptConfirm: "Ajouter les labels HVLS aux {count} entités compatibles ? Le fichier YAML source et Google Assistant ne seront pas modifiés. Chaque ajout est contrôlé séparément : en cas d'échec, les ajouts déjà effectués sont conservés et signalés.",
    assistantAdoptBusy: "Ajout des labels HVLS : {done} / {total}",
    assistantAdoptDone: "{count} label(s) ajouté(s). Le YAML d'origine est conservé ; un nouveau Preview a été demandé. Vérifiez-le avant toute application.",
    assistantAdoptStopped: "{count} label(s) confirmé(s) avant interruption. Vérifiez le catalogue actualisé : une opération sans réponse peut avoir été appliquée. Aucun réessai automatique.",
    assistantAdoptStale: "Fichier ou catalogue modifié depuis la vérification. Aucune nouvelle action : vérifiez à nouveau.",
    assistantAdoptNeedsReview: "Un label HVLS confirme la sélection, pas l'identité des noms, pièces ou alias YAML. Les entités signalées « À examiner » ne sont pas ajoutées automatiquement.",
    assistantAdoptTruncated: "Le fichier comporte trop d'entrées pour une reprise complète ; aucun ajout groupé n'est proposé.",
    assistantProvenanceAdvanced: "ⓘ Origine du fichier et recherches dans les sauvegardes (facultatif)",
    assistantProvenanceStep: "Étape 3 sur 3 — Comprendre l'origine du fichier",
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
    migrationAnalyze: "Actualiser la simulation (lecture seule)",
    migrationLoading: "Analyse de migration en lecture seule…",
    migrationEmpty: "Ouvrez cette section pour vérifier la configuration Google Assistant.",
    migrationFailed: "Revue indisponible : {error}",
    migrationBaseline: "Sauvegarde source protégée",
    migrationBaselineMissing: "non vérifiée — simulation complète indisponible",
    migrationBaselineOk: "vérifiée",
    migrationStatus: "État de la revue",
    migrationToRecheck: "Décisions locales modifiées : relancez l’analyse.",
    migrationDecisions: "Décisions provisoires (non enregistrées)",
    migrationNoChoice: "À examiner",
    migrationImport: "Importer",
    migrationKeep: "Conserver",
    migrationDisable: "Désactiver",
    migrationRemove: "Retirer",
    migrationRetain: "Conserver les personnalisations",
    migrationDiscard: "Abandonner après revue",
    migrationMetadataChoice: "Personnalisations",
    migrationAcknowledge: "J’ai pris connaissance du changement",
    migrationSensitive: "Confirmer l’exposition sensible",
    migrationBefore: "Avant (projection)",
    migrationAfter: "Après (hypothèse)",
    migrationReasons: "Motifs / état",
    migrationMore: "Afficher 100 entités supplémentaires",
    migrationBaselinePrepare: "Examiner la sauvegarde protégée",
    migrationBaselinePrepared: "Fichiers à protéger : {files} · Entités déclarées : {entities}. Autorisation valable 5 minutes.",
    migrationBaselineConfirmAction: "Confirmer la sauvegarde",
    migrationBaselineConfirm: "Créer maintenant une copie protégée des {files} fichiers YAML Google Assistant ({entities} entités déclarées) et initialiser le journal HVLS ? Aucun label, fichier de production ou réglage Google Assistant ne sera modifié.",
    migrationBaselinePreparing: "Vérification des fichiers source en lecture seule…",
    migrationBaselineInitializing: "Création et vérification de la sauvegarde et du journal…",
    migrationBaselineSuccess: "Sauvegarde vérifiée. Journal : {phase} (révision {revision}). Les labels et le YAML sont inchangés.",
    migrationBaselinePartial: "Sauvegarde vérifiée, mais journal indisponible : examen manuel requis. Aucun changement des labels ou du YAML.",
    migrationBaselineError: "Préparation ou initialisation refusée. Revérifiez le diagnostic et les fichiers protégés.",
    migrationBaselineWarning: "Attention : exposition implicite possible. La sauvegarde ne valide pas l’exposition Google.",
    migrationDraftLoad: "Recharger les choix sauvegardés",
    migrationDraftSave: "Enregistrer mes choix",
    migrationDraftSaving: "Vérification des sources et enregistrement des choix…",
    migrationDraftLoading: "Lecture des choix sauvegardés…",
    migrationDraftLoaded: "{count} choix récupéré(s). Relisez les résultats de la simulation.",
    migrationDraftStale: "Attention : les choix sauvegardés sont liés à une ancienne version du journal. Nouvelle revue indispensable.",
    migrationDraftSaved: "{count} choix enregistrés (révision {revision}). Ce n’est PAS une autorisation de migration.",
    migrationDraftSaveConfirm: "Enregistrer ces {count} décisions comme brouillon privé et non autorisant ? Les labels et fichiers Google Assistant resteront inchangés.",
    migrationDraftNotReady: "Actualisez d’abord la simulation après vos modifications et vérifiez la sauvegarde protégée.",
    migrationDraftError: "Lecture ou sauvegarde des choix refusée. Revérifiez le diagnostic, le journal et les fichiers protégés.",
    migrationDraftConflict: "Un brouillon existe ou a changé. Rechargez-le avant de remplacer vos décisions, puis relancez la simulation.",
    migrationAttestationRead: "Vérifier l’état de la revue",
    migrationAttestationConfirmAction: "Attester ma revue",
    migrationAttestationReading: "Relecture du brouillon et contrôle des preuves…",
    migrationAttestationConfirm: "Attester que j’ai examiné les décisions enregistrées et leur simulation actuelle ? Cette attestation ne permet ni l’ajout de labels, ni la modification de Google Assistant.",
    migrationAttestationConfirmIssues: "Des anomalies ou décisions non résolues subsistent. Confirmez-vous les avoir examinées et accepter de les conserver comme problèmes ouverts ? Aucun changement ne sera autorisé ou exécuté.",
    migrationAttestationDone: "Revue attestée (révision {revision}). Ce n’est PAS une autorisation d’exécuter la migration.",
    migrationAttestationWithIssues: "Revue attestée AVEC anomalies non résolues : aucune action de migration n’est autorisée.",
    migrationAttestationFresh: "État de la revue enregistrée : {status}. Aucun droit d’exécution.",
    migrationAttestationUnavailable: "Attestation indisponible ou périmée. Rechargez les choix enregistrés, actualisez la simulation et vérifiez les anomalies.",
    migrationAttestationNotReady: "Enregistrez d’abord vos choix et actualisez la simulation. Aucun changement n’a été effectué.",
    migrationRecoveryTitle: "État de reprise après interruption (lecture seule)",
    migrationRecoveryRead: "Revérifier le journal et les labels",
    migrationRecoveryLoading: "Lecture du journal protégé et des registres natifs…",
    migrationRecoveryNotInitialized: "Journal non initialisé. Aucune opération de migration enregistrée ici.",
    migrationRecoveryUnavailable: "État de reprise indisponible ou incomplet. Vérification manuelle nécessaire.",
    migrationRecoveryChanged: "Journal modifié pendant la lecture : actualiser et examiner avant toute décision.",
    migrationRecoveryRequired: "Examen manuel requis — une intention peut être restée en suspens ; aucune reprise automatique.",
    migrationRecoveryObserved: "État observé, non autorisant. Aucune reprise automatique ni bascule Google.",
    migrationRecoverySummary: "Phase : {phase} · Révision : {revision} · Opérations : {total} · Intentions non acquittées : {pending} · Autres anomalies : {issues} · Sources YAML : {sources}.",
    migrationRecoveryRow: "{entity} · journal : {journal} · registre : {observed} · label : {membership} · revue : {review}",
    migrationRecoverySafeView: "Observation instantanée uniquement ; aucun droit de staging ni de bascule.",
    migrationRecoverySimulationTitle: "Validation humaine simulée (sans écriture)",
    migrationRecoverySimulationAction: "Tester ma décision",
    migrationRecoverySimulationInspect: "Enquêter sur les effets externes",
    migrationRecoverySimulationQuarantine: "Isoler cette entité pour examen",
    migrationRecoverySimulationDefer: "Reporter jusqu’à de nouvelles preuves",
    migrationRecoverySimulationPreparing: "Nouvelle vérification du journal, du YAML et des labels…",
    migrationRecoverySimulationConfirm: "SIMULATION UNIQUEMENT. Confirmer la décision « {disposition} » pour {entity} ? Les effets externes et Google Home restent inconnus. Cette confirmation n’est pas sauvegardée et ne réalise aucune correction.",
    migrationRecoverySimulationComplete: "Simulation confirmée pour {entity} : preuves revérifiées, jeton consommé. Aucun journal, label ou YAML modifié ; aucune autorisation d’exécution.",
    migrationRecoverySimulationDeclined: "Simulation annulée. Aucune action effectuée.",
    migrationRecoverySimulationRefused: "Simulation refusée : preuves périmées, incertaines ou confirmation invalide. Actualisez le diagnostic avant une nouvelle tentative.",
    migrationLedgerTitle: "Historique protégé des décisions d’enquête (sans correction)",
    migrationLedgerRead: "Consulter l’historique vérifié",
    migrationLedgerButton: "Enregistrer ce choix d’enquête",
    migrationLedgerConfirm: "ENREGISTREMENT DURABLE : consigner « {disposition} » pour {entity} dans l’historique privé ? Ceci écrit UNIQUEMENT une preuve de décision, pas le journal de migration, les labels ni Google Assistant.",
    migrationLedgerSaving: "Vérification des preuves et préparation de l’enregistrement…",
    migrationLedgerRecorded: "Décision d’enquête n°{sequence} enregistrée et synchronisée sur disque. Aucun label ni YAML modifié, aucune reprise autorisée.",
    migrationLedgerCount: "{count} décisions d’enquête archivées et chaînées. Ces entrées ne sont jamais des autorisations d’exécution.",
    migrationLedgerRow: "n°{sequence} · {entity} · {disposition} · preuves : {relation}",
    migrationLedgerUnavailable: "Historique indisponible ou suspect : aucune décision ne peut être enregistrée.",
    migrationLedgerRejected: "Enregistrement refusé : preuves modifiées, jeton expiré ou historique non vérifiable. Réexaminer la situation.",
    migrationLedgerCancelled: "Enregistrement annulé, aucune écriture.",
    migrationLedgerReading: "Vérification intégrale de la chaîne des décisions…",
    migrationResolutionSummary: "Scénarios d’enquête (simulation seulement) : {pending} intentions non acquittées, {investigate} à examiner, {quarantine} cas à isoler. Aucune décision n’a été appliquée.",
    migrationResolutionLine: "Hypothèse : {scenario} · catégorie : {category} · vérifications : {reasons}.",
    migrationScenario_intent_desired_membership_observed: "état voulu observé, intention NON acquittée",
    migrationScenario_intent_original_membership_observed: "état initial observé, intention NON acquittée",
    migrationScenario_identity_or_membership_unknown: "identité ou appartenance indéterminée",
    migrationScenario_recorded_state_no_longer_matches: "divergence entre journal et registre",
    migrationScenario_applied_record_matches_observation: "application enregistrée, état local cohérent uniquement",
    migrationScenario_rollback_record_matches_observation: "retour arrière enregistré, état local cohérent uniquement",
    migrationScenario_inconsistent_journal_observation: "journal et observations incohérents",
    migrationStagingImpact: "Impact prévisionnel des labels sur Google Assistant manuel : {status}. Les autres consommateurs de labels et Google Home restent non vérifiés. Staging interdit.",
    migrationConsumerAudit: "Audit indirect limité : {files} fichiers YAML inspectés, {writers} références à la génération HVLS, {events} références à un événement du registre, {labels} références à des fonctions de label. Effets externes non certifiés ; staging interdit.",
    migrationConsumerOverlap: "Attention : le fichier de sortie HVLS correspond à une source Google manuelle protégée. Toute génération V1 pourrait modifier cette source.",
    backupIntro: "Choisissez une sauvegarde pour préparer ses modifications dans le Preview. Aucune restauration directe ni modification d'étiquette.",
    backupLoading: "Chargement des sauvegardes…",
    backupEmpty: "Aucune sauvegarde disponible.",
    backupReviewing: "Comparaison avec la production…",
    backupReviewFailed: "Comparaison impossible : {error}",
    backupLoadFailed: "Chargement impossible : {error}",
    backupRestore: "Préparer cette sauvegarde dans le Preview",
    backupPreviewPrepared: "Restauration préparée : {added} ajout(s), {removed} suppression(s), {modified} modification(s). Aucun fichier ni label modifié.",
    backupPreviewNotExecutable: "Preview de restauration : contrôlez les changements. L'application de cette restauration n'est pas encore activée dans cette version.",
    backupPreviewLabels: "Étiquettes envisagées : {added} ajout(s), {removed} retrait(s), {review} entité(s) à examiner.",
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
    notEligible: "Cette entité ne respecte pas les règles de sélection de HVLS.",
    exclusionIntro: "Exclue de la configuration Google Assistant générée par HVLS :",
    reasonDomain: "son domaine n’est pas pris en charge par HVLS.",
    reasonClass: "sa classe de capteur n’est pas prise en charge par HVLS.",
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
    reasonCategoryFull: "Entité de configuration ou de diagnostic",
    metricEntities: "Entités en production",
    productionStatsUnavailable: "Statistiques de production indisponibles : fichier absent, illisible ou invalide.",
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
    entitiesModified: "Entités modifiées",
    previewLoading: "Chargement du Preview…",
    previewMissing: "Aucun Preview disponible. Lancez d’abord une génération.",
    previewReady: "Preview : {path} — Production : {production}",
    previewLoadFailed: "Impossible de charger le Preview : {error}",
    previewGenerating: "Génération du Preview en cours…",
    previewGenerated: "Preview généré : {count} entités. Vérifiez les différences avant application.",
    previewGenerateFailed: "Échec de génération du Preview : {error}",
    applyInfoLabel: "Pourquoi Apply est-il désactivé ?",
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
    applyReasonOutputChanged: "Le fichier géré par HVLS a été modifié depuis son dernier contrôle SHA-256.",
    applyReasonNotConfigured: "HVLS n'est pas encore configuré.",
    applyVerificationUnavailable: "Impossible de valider Apply : informations de sécurité manquantes ou incohérentes. Actualisez le Preview.",
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
    changesIntro: "Vérifiez les différences avant d’appliquer la configuration.",
    noChanges: "Aucun changement d’entité à appliquer.",
    removalNote: "Retirer une entité ici ne la supprime pas de Home Assistant : seule sa configuration Google Assistant change.",
    firstProduction: "Aucune configuration de production existante : impossible de calculer les différences avec un fichier précédent.",
    fieldBefore: "Avant",
    fieldAfter: "Après"
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
    assistantProvenanceStepVerify: "Step 2 of 3 — Inspect the YAML file",
    migrationAdvancedTitle: "Diagnostics and migration tools (advanced)",
    migrationRecoveryAttention: "A previous operation needs review. Open the advanced tools before continuing.",
    migrationGuideDetected: "No google_assistant: declaration detected. This does not prevent HVLS from managing and generating an entity YAML file.",
    migrationGuideCandidate: "A google_assistant_entities.yaml file exists. You can reuse it to initialize HVLS labels, even without a Google Assistant connection.",
    migrationGuideNoCandidate: "No usual google_assistant_entities.yaml file was detected. Other sources may still exist.",
    migrationGuideQuestion: "How would you like to start using HVLS?",
    migrationGuideNew: "Start with an empty selection",
    migrationGuideExisting: "Reuse an existing entity file",
    migrationGuideUnsure: "Choose another file",
    migrationGuideNextNew: "New setup selected for this screen. Check any existing files before generating configuration. Nothing has been created or overwritten.",
    migrationGuideNextExisting: "Inspect the entity file, then review the labels to import. No Google Assistant connection is needed.",
    migrationGuideNextUnsure: "Enter the relative path of the YAML file to reuse, then inspect it.",
    migrationGuideAwaitChoice: "Choose whether to reuse this file, select another file or start fresh.",
    migrationGuideNoAuthorization: "This choice stays on this screen; it neither approves migration nor permits writes.",
    assistantSourceFound: "Google Assistant configuration detected",
    assistantSourceSummary: "{entries} explicit entity declarations. Inspected files: {paths}. No Google Home exposure certified.",
    assistantPackagesDetected: "Packages configuration detected: classified as « Other configuration », not automatically inspected.",
    assistantPackagesQuestion: "Enter the entity YAML file path to inspect manually.",
    assistantFileHelp: "ⓘ Show YAML syntax examples",
    assistantExampleDirect: "In configuration.yaml:",
    assistantExampleInclude: "Alternative with an included file in configuration.yaml:",
    assistantExampleIncludedContent: "In google_assistant.yaml:",
    assistantExampleNote: "Structural examples only: additional settings are required. Do not add these to an active configuration without checking Google Home effects.",
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
    assistantAdoptIntro: "Use entities from this file to manage labels and generate a YAML Preview without configuring Google Assistant. The original file stays unchanged.",
    assistantAdoptNoCatalog: "Home Assistant entity catalog is not loaded. Refresh the comparison to continue.",
    assistantAdoptRefresh: "Refresh label comparison",
    assistantAdoptCounts: "{ready} to add · {already} already in HVLS · {excluded} exclusions kept · {review} need review.",
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
    assistantAdoptLimits: "Only explicit expose: true entries with no customizations and eligible HA entities are suggested for label addition. Other entries remain visible.",
    assistantAdoptAction: "Add {count} HVLS label(s)",
    assistantAdoptNone: "No automatic additions suggested. You can still manage each entity in the HVLS Entity management tab.",
    assistantTakeoverTitle: "Let HVLS manage the existing YAML",
    assistantTakeoverIntro: "If this is the configured production YAML, HVLS can back it up and register its ownership without rewriting its contents. Preview differences still require a separate Apply.",
    assistantTakeoverAction: "Review and take over this file",
    assistantTakeoverConfirm: "Let HVLS manage {path}?\n\nCurrent entities: {entities} ({issues} to review).\nPreview differences: {added} added, {removed} removed, {modified} modified.\n\nA mandatory backup will be created. Production will NOT be edited and no Apply will run. This only authorizes future HVLS management.",
    assistantTakeoverSuccess: "HVLS now manages this YAML. Verified backup: {backup}. No Apply performed. Review Preview differences before applying.",
    assistantTakeoverFailure: "Takeover refused or incomplete: check the YAML, backups and ownership status, then refresh. No automatic Apply.",
    assistantTakeoverBusy: "Verifying and backing up existing YAML…",
    assistantAdoptConfirm: "Add HVLS labels to {count} eligible entities? Neither the source YAML nor Google Assistant will be changed. Each addition is checked independently: if one fails, earlier successful additions remain and are reported.",
    assistantAdoptBusy: "Adding HVLS labels: {done} / {total}",
    assistantAdoptDone: "{count} label(s) added. Original YAML preserved; a new Preview was requested. Review it before applying.",
    assistantAdoptStopped: "{count} label addition(s) confirmed before interruption. Check the refreshed catalog: an unanswered operation might still have succeeded. No automatic retry.",
    assistantAdoptStale: "File or catalog changed since inspection. No new action taken: inspect it again.",
    assistantAdoptNeedsReview: "An HVLS label confirms selection, not matching YAML name, room or alias values. Entries marked 'Requires manual review' are never added automatically.",
    assistantAdoptTruncated: "File contains too many entries for a complete reuse plan; no bulk label additions are suggested.",
    assistantProvenanceAdvanced: "ⓘ File origin and historical backup checks (optional)",
    assistantProvenanceStep: "Step 3 of 3 — Understand the file's origin",
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
    migrationAnalyze: "Refresh simulation (read-only)",
    migrationLoading: "Running read-only migration assessment…",
    migrationEmpty: "Open this section to review Google Assistant configuration.",
    migrationFailed: "Review unavailable: {error}",
    migrationBaseline: "Protected source backup",
    migrationBaselineMissing: "not verified — complete simulation unavailable",
    migrationBaselineOk: "verified",
    migrationStatus: "Review status",
    migrationToRecheck: "Local decisions changed: run the review again.",
    migrationDecisions: "Provisional decisions (not saved)",
    migrationNoChoice: "To review",
    migrationImport: "Import",
    migrationKeep: "Keep",
    migrationDisable: "Disable",
    migrationRemove: "Remove",
    migrationRetain: "Retain manual customizations",
    migrationDiscard: "Discard after review",
    migrationMetadataChoice: "Customizations",
    migrationAcknowledge: "I acknowledge this change",
    migrationSensitive: "Acknowledge sensitive exposure",
    migrationBefore: "Before (projected)",
    migrationAfter: "After (hypothetical)",
    migrationReasons: "Reasons / status",
    migrationMore: "Show 100 more entities",
    migrationBaselinePrepare: "Review protected backup",
    migrationBaselinePrepared: "Source files: {files} · Explicit entries: {entities}. Confirmation expires in 5 minutes.",
    migrationBaselineConfirmAction: "Confirm backup creation",
    migrationBaselineConfirm: "Create a protected copy of {files} Google Assistant YAML files ({entities} explicit entries) and initialize the HVLS journal? No labels, production YAML or loaded Google Assistant settings will change.",
    migrationBaselinePreparing: "Checking current source files without modifying them…",
    migrationBaselineInitializing: "Creating and verifying protected backup and journal…",
    migrationBaselineSuccess: "Protected backup verified. Journal: {phase} (revision {revision}). Labels and YAML unchanged.",
    migrationBaselinePartial: "Protected backup verified, but journal unavailable: manual review required. No labels or YAML changed.",
    migrationBaselineError: "Preparation or initialization refused. Recheck diagnostic and protected files.",
    migrationBaselineWarning: "Warning: implicit exposure is possible. Backing up does not verify Google exposure.",
    migrationDraftLoad: "Restore saved selections",
    migrationDraftSave: "Save my selections",
    migrationDraftSaving: "Verifying sources and saving selections…",
    migrationDraftLoading: "Reading saved selections…",
    migrationDraftLoaded: "{count} saved selection(s) restored. Review the refreshed simulation.",
    migrationDraftStale: "Warning: saved selections refer to an earlier journal revision. A new review is required.",
    migrationDraftSaved: "{count} selection(s) saved (revision {revision}). This is NOT authorization to migrate.",
    migrationDraftSaveConfirm: "Save these {count} decisions as a private non-authorizing draft? HA labels and Google Assistant YAML will remain unchanged.",
    migrationDraftNotReady: "Refresh simulation after editing selections and verify the protected baseline first.",
    migrationDraftError: "Cannot restore or save selections. Recheck diagnostic, journal and protected files.",
    migrationDraftConflict: "A draft already exists or has changed. Restore it before replacing selections, then refresh the simulation.",
    migrationAttestationRead: "Check review status",
    migrationAttestationConfirmAction: "Attest my review",
    migrationAttestationReading: "Re-reading draft and verifying evidence…",
    migrationAttestationConfirm: "Attest that I examined the saved decisions and current simulation? This does not authorize HA label changes or Google Assistant cutover.",
    migrationAttestationConfirmIssues: "Open anomalies or unresolved decisions remain. Confirm that you examined them and acknowledge they remain OPEN? No migration change will be authorized or executed.",
    migrationAttestationDone: "Review attested (revision {revision}). This is NOT permission to execute migration.",
    migrationAttestationWithIssues: "Attested review WITH open issues: no migration action is authorized.",
    migrationAttestationFresh: "Saved review status: {status}. No execution capability.",
    migrationAttestationUnavailable: "Attestation unavailable or stale. Restore saved choices, refresh the simulation and inspect anomalies.",
    migrationAttestationNotReady: "Save choices and refresh the simulation first. No changes were made.",
    migrationRecoveryTitle: "Interrupted operation recovery status (read-only)",
    migrationRecoveryRead: "Recheck journal and labels",
    migrationRecoveryLoading: "Reading protected journal and native registries…",
    migrationRecoveryNotInitialized: "Journal not initialized. No migration operations recorded here.",
    migrationRecoveryUnavailable: "Recovery status unavailable or incomplete. Manual verification required.",
    migrationRecoveryChanged: "Journal changed while reading: refresh and inspect before any decision.",
    migrationRecoveryRequired: "Manual review required — an intent may still be pending; no automatic recovery.",
    migrationRecoveryObserved: "Observed state, not authorization. No automatic recovery or Google cutover.",
    migrationRecoverySummary: "Phase: {phase} · Revision: {revision} · Operations: {total} · Unacknowledged intents: {pending} · Other issues: {issues} · Source YAML: {sources}.",
    migrationRecoveryRow: "{entity} · journal: {journal} · registry: {observed} · label: {membership} · review: {review}",
    migrationRecoverySafeView: "Snapshot only; no staging or cutover permission.",
    migrationRecoverySimulationTitle: "Simulated human confirmation (no writes)",
    migrationRecoverySimulationAction: "Test my decision",
    migrationRecoverySimulationInspect: "Investigate external effects",
    migrationRecoverySimulationQuarantine: "Quarantine this entity for investigation",
    migrationRecoverySimulationDefer: "Defer until further evidence",
    migrationRecoverySimulationPreparing: "Rechecking journal, YAML and native labels…",
    migrationRecoverySimulationConfirm: "SIMULATION ONLY. Confirm the « {disposition} » choice for {entity}? External effects and Google Home remain unknown. This confirmation is not saved and cannot fix anything.",
    migrationRecoverySimulationComplete: "Simulation confirmed for {entity}: fresh evidence rechecked, challenge consumed. No journal, label or YAML changed; no execution permission.",
    migrationRecoverySimulationDeclined: "Simulation canceled. No action performed.",
    migrationRecoverySimulationRefused: "Simulation refused: changed/uncertain evidence or invalid confirmation. Refresh the recovery report before trying again.",
    migrationLedgerTitle: "Protected investigation decision history (no remediation)",
    migrationLedgerRead: "Read verified investigation history",
    migrationLedgerButton: "Record this investigation choice",
    migrationLedgerConfirm: "DURABLE RECORD: save « {disposition} » for {entity} in private audit history? This writes ONLY a decision record, NOT the migration journal, labels or Google Assistant.",
    migrationLedgerSaving: "Rechecking evidence and preparing the record…",
    migrationLedgerRecorded: "Investigation record #{sequence} saved and synced. No labels or YAML changed; no recovery authorized.",
    migrationLedgerCount: "{count} chained, archived investigation decisions. None authorize execution.",
    migrationLedgerRow: "#{sequence} · {entity} · {disposition} · evidence: {relation}",
    migrationLedgerUnavailable: "History unavailable or suspect: no decision can be saved.",
    migrationLedgerRejected: "Record refused: evidence changed, expired challenge or history not verified. Reinvestigate.",
    migrationLedgerCancelled: "Record canceled without writing.",
    migrationLedgerReading: "Verifying the complete investigation chain…",
    migrationResolutionSummary: "Investigation scenarios (simulation only): {pending} unacknowledged intents, {investigate} require inspection, {quarantine} quarantined. No decision has been applied.",
    migrationResolutionLine: "Hypothesis: {scenario} · category: {category} · checks: {reasons}.",
    migrationScenario_intent_desired_membership_observed: "desired membership observed, intent NOT acknowledged",
    migrationScenario_intent_original_membership_observed: "original membership observed, intent NOT acknowledged",
    migrationScenario_identity_or_membership_unknown: "identity or membership unknown",
    migrationScenario_recorded_state_no_longer_matches: "journal and registry disagree",
    migrationScenario_applied_record_matches_observation: "applied record matches local observation only",
    migrationScenario_rollback_record_matches_observation: "rollback record matches local observation only",
    migrationScenario_inconsistent_journal_observation: "inconsistent journal and observation",
    migrationStagingImpact: "Projected label impact on manual Google Assistant: {status}. Other label consumers and Google Home remain unverified. Staging is forbidden.",
    migrationConsumerAudit: "Limited indirect audit: {files} YAML files inspected, {writers} HVLS generation references, {events} entity-registry event references, {labels} label-function references. External effects remain unverified; staging forbidden.",
    migrationConsumerOverlap: "Warning: the HVLS output file overlaps a protected manual Google Assistant source. Any V1 generation may change that source.",
    backupIntro: "Select a backup to prepare changes in Preview. No YAML or labels will be changed.",
    backupLoading: "Loading backups…",
    backupEmpty: "No backups available.",
    backupReviewing: "Comparing with production…",
    backupReviewFailed: "Cannot compare: {error}",
    backupLoadFailed: "Cannot load backups: {error}",
    backupRestore: "Prepare this backup in Preview",
    backupPreviewPrepared: "Restore staged: {added} added, {removed} removed, {modified} modified. No YAML or labels changed.",
    backupPreviewNotExecutable: "Restore Preview: review the changes. Applying this restoration is not enabled in this version yet.",
    backupPreviewLabels: "Planned HA labels: {added} add, {removed} remove, {review} need review.",
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
    notEligible: "This entity does not meet HVLS selection rules.",
    exclusionIntro: "Excluded from the Google Assistant configuration generated by HVLS:",
    reasonDomain: "its domain is not supported by HVLS.",
    reasonClass: "its sensor or binary sensor class is not supported by HVLS.",
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
    reasonCategoryFull: "Configuration or diagnostic entity",
    metricEntities: "Production entities",
    productionStatsUnavailable: "Production statistics unavailable: file missing, unreadable or invalid.",
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
    entitiesModified: "Modified entities",
    previewLoading: "Loading Preview…",
    previewMissing: "No Preview available. Generate one first.",
    previewReady: "Preview: {path} — Production: {production}",
    previewLoadFailed: "Unable to load Preview: {error}",
    previewGenerating: "Generating Preview…",
    previewGenerated: "Preview generated: {count} entities. Review differences before applying.",
    previewGenerateFailed: "Failed to generate Preview: {error}",
    applyInfoLabel: "Why is Apply disabled?",
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
    applyReasonOutputChanged: "The HVLS-managed file has changed since its last SHA-256 verification.",
    applyReasonNotConfigured: "HVLS is not configured yet.",
    applyVerificationUnavailable: "Cannot validate Apply: missing or inconsistent security information. Refresh the Preview.",
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
    changesIntro: "Review the differences before applying the configuration.",
    noChanges: "No entity changes to apply.",
    removalNote: "Removing an entity here does not delete it from Home Assistant: only its Google Assistant configuration changes.",
    firstProduction: "No existing production configuration: differences cannot be calculated against a previous file.",
    fieldBefore: "Before",
    fieldAfter: "After"
  }
};

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

    const texts = {
      copy: "copy",
      apply: "apply",
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
    const advancedSummary = this.querySelector("#migrationAdvanced > summary");
    if (advancedSummary) advancedSummary.textContent = this._t("migrationAdvancedTitle");
    const migrationPrepare = this.querySelector("#migrationPrepareBaseline");
    if (migrationPrepare) migrationPrepare.textContent = this._t("migrationBaselinePrepare");
    const migrationConfirm = this.querySelector("#migrationConfirmBaseline");
    if (migrationConfirm) migrationConfirm.textContent = this._t("migrationBaselineConfirmAction");
    const migrationRestoreDraft = this.querySelector("#migrationRestoreDraft");
    if (migrationRestoreDraft) migrationRestoreDraft.textContent = this._t("migrationDraftLoad");
    const migrationSaveDraft = this.querySelector("#migrationSaveDraft");
    if (migrationSaveDraft) migrationSaveDraft.textContent = this._t("migrationDraftSave");
    const migrationReadAttestation = this.querySelector("#migrationReadAttestation");
    if (migrationReadAttestation) migrationReadAttestation.textContent = this._t("migrationAttestationRead");
    const migrationAttestReview = this.querySelector("#migrationAttestReview");
    if (migrationAttestReview) migrationAttestReview.textContent = this._t("migrationAttestationConfirmAction");
    const recoveryTitle = this.querySelector("#migrationRecoveryTitle");
    if (recoveryTitle) recoveryTitle.textContent = this._t("migrationRecoveryTitle");
    const recoveryRead = this.querySelector("#migrationRecoveryRefresh");
    if (recoveryRead) recoveryRead.textContent = this._t("migrationRecoveryRead");
    if (this._migrationRecoveryReport) this._renderMigrationRecovery();
    const ledgerTitle = this.querySelector("#migrationLedgerTitle");
    if (ledgerTitle) ledgerTitle.textContent = this._t("migrationLedgerTitle");
    const ledgerRefresh = this.querySelector("#migrationLedgerRefresh");
    if (ledgerRefresh) ledgerRefresh.textContent = this._t("migrationLedgerRead");
    const migrationMore = this.querySelector("#migrationMore");
    if (migrationMore) migrationMore.textContent = this._t("migrationMore");
    const nav = this.querySelector(".hvls-tabs");
    if (nav) nav.setAttribute("aria-label", this._t("tabsLabel"));
  }

  _updateTabLabels() {
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
        ? ` (${this._excludedCount})` : "";
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

  set hass(hass) {
    this._hass = hass;
    const oldLanguage = this._language;
    this._language = String(hass?.language || "en")
      .toLowerCase()
      .startsWith("fr") ? "fr" : "en";
    if (!this._initialized) {
      this._initialized = true;
      this._render();
      this._loadPreview();
      this._loadEntities();
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

  async _loadPreview(afterApply = false) {
    if (!this._hass || (this._applying && !afterApply)) return;
    const loadId = (this._loadId || 0) + 1;
    this._loadId = loadId;
    this._stagedRestore = null; // Normal Preview replaces a staged backup only by user action.
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

      const canReview =
        result.available === true &&
        result.error == null &&
        result.can_apply === true &&
        ownershipConsistent &&
        validHash(result.preview_sha256);

      this._review = canReview
        ? {
            preview_sha256: result.preview_sha256,
            production_sha256: result.production_sha256,
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
        (
          result.can_apply === true ||
          ownership?.write_allowed === false
        );

      this._applyBlockReason = shouldExplain
        ? (
            serverReason ||
            this._t("applyVerificationUnavailable")
          )
        : null;

      this._applyBlockReasonCode = shouldExplain &&
        typeof ownership?.reason_code === "string"
          ? ownership.reason_code
          : null;

      this._updateApplyButton();
      this._renderAssistantAdoption();
      this._setContent(result.content || "");
      this._renderAnalysis(result);
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
    const button = this.querySelector("#apply");
    if (button) {
      button.disabled = !this._review || this._applying === true || this._restoring === true ||
        this._generating === true || this._refreshing === true ||
        this._entityWritePending === true;
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
      this._backupReview?.comparison?.identical_text === true || this._restoring ||
      this._applying || this._refreshing || this._generating || this._entityWritePending;
    const generate = this.querySelector("#generate");
    if (generate) generate.disabled =
      this._applying === true || this._generating === true || this._refreshing === true;
  }

  async _generatePreview(fromRefresh = false) {
    if (!this._hass || this._generating || this._applying || this._restoring || (this._refreshing && !fromRefresh)) return;

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

  async _applyPreview() {
    if (!this._hass || !this._review || this._applying || this._restoring || this._refreshing || this._generating || this._entityWritePending) return;

    const review = {...this._review};

    if (!window.confirm(
      this._t("applyConfirm") + "\n\n" + this._t("applyWarning")
    )) return;

    this._applying = true;
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    this._setStatusKey("previewApplying");

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/apply_preview",
        ...review,
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
      this._setStatusKey("previewApplied", {
        path: result.output_path, bytes: result.bytes_written,
        backupPath: result.backup_path || null, backup: ""
      });
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
    heading.textContent = this._t("changesProposed");
    panel.appendChild(heading);

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
      note.textContent = comparison.status === "missing"
        ? this._t("firstProduction")
        : this._tf("comparisonFailed", {
            status: comparison.status,
            reason: comparison.reason || this._t("unreadableFile")
          });
      panel.appendChild(note);
      return;
    }

    const added = Array.isArray(comparison.added) ? comparison.added : [];
    const removed = Array.isArray(comparison.removed) ? comparison.removed : [];
    const modified = Array.isArray(comparison.modified) ? comparison.modified : [];
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
      if (this._stagedRestore) {
        const plan = this._stagedRestore.label_plan || {};
        const description = document.createElement("p");
        description.textContent = this._t("backupPreviewNotExecutable") +
          " " + this._tf("backupPreviewLabels", {
            added: plan.add?.length || 0,
            removed: plan.remove?.length || 0,
            review: plan.review?.length || 0,
          });
        previewNotice.appendChild(description);
        // The actual proposed HA-label operations must be visible individually,
        // including exceptional entities. The Preview is never an implicit write.
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
          previewNotice.appendChild(details);
        }
      }
    }
  }

  _renderAnalysis(result) {
    const panel = this.querySelector("#analysis");
    panel.replaceChildren();
    this.querySelector("#exclusions").replaceChildren();
    this.querySelector("#unifiedDiff").textContent = "";
    this.querySelector("#rawDiffDetails").hidden = true;
    this._lastAnalysis = result;
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
        label.textContent = name;
        const total = document.createElement("strong");
        total.textContent = String(count);
        row.append(label, total);
        // The domain and room views share the same expandable entity list.
        {
          const details = document.createElement("details");
          details.className = "domain-details";

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
              ? `${entity.entity_id} · ${entity.room || this._t("noArea")}`
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
              const control = document.createElement("label");
              control.className = "entity-hvls-control";
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.className = "entity-hvls-checkbox";
              checkbox.checked = true;
              checkbox.dataset.ineligible = "false";
              checkbox.disabled = Boolean(this._entityWritePending);
              checkbox.setAttribute("aria-label", this._tf("hvlsLabelAria", {
                entity: entity.entity_id
              }));
              checkbox.addEventListener("change", () => {
                this._setEntityLabel(catalogEntity, checkbox);
              });
              const caption = document.createElement("span");
              caption.textContent = "HVLS";
              control.append(checkbox, caption);
              itemRow.appendChild(control);
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
    }

    const comparison = result.comparison || {status: "missing"};
    const heading = document.createElement("h2");
    heading.textContent = this._t("comparisonTitle");
    panel.appendChild(heading);
    if (comparison.status !== "ok") {
      const warning = document.createElement("p");
      warning.textContent = comparison.status === "missing"
        ? this._t("comparisonMissing")
        : this._tf("comparisonFailed", {status: comparison.status, reason: comparison.reason || this._t("unreadableFile")});
      panel.appendChild(warning);
      return;
    }
    const pendingCount = comparison.added.length +
      comparison.removed.length + comparison.modified.length;
    // A visible alert is shown only for a valid, actionable Preview.
    // No notification is emitted or applied automatically.
    if (pendingCount > 0 && this._review) {
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
        .migration-scroll { overflow-x: auto; max-width: 100%; }
        .migration-table { border-collapse: collapse; width: 100%; font-size: 0.88rem; }
        .migration-table th, .migration-table td { padding: 8px; text-align: left; border-bottom: 1px solid var(--divider-color); vertical-align: top; }
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
        .stats-entity-row > .entity-hvls-control { flex-shrink:0; }
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

        .entity-hvls-control {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: 12px;
          white-space: nowrap;
          cursor: pointer;
          font-size: 12px;
        }
        .entity-hvls-checkbox {
          cursor: pointer;
          accent-color: var(--primary-color);
        }
        .entity-hvls-checkbox:disabled {
          cursor: not-allowed;
        }
        .entity-eligibility-info {
          margin-left: 6px;
          padding: 2px 7px;
          border-radius: 6px;
          background: transparent;
          color: var(--secondary-text-color);
          cursor: pointer;
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
              <option value="eligible_no">Sans HVLS — éligibles</option>
              <option value="ineligible">Non éligibles</option>
            </select>
          </div>
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
          <button id="apply" type="button" disabled>${this._t("apply")}</button>
        </div>
        </section>
        <section id="tab-migration" class="hvls-tab-panel" role="tabpanel" hidden>
          <h2>${this._t("tabMigration")}</h2>
          <p id="migrationIntro" class="diagnostic-note">${this._t("migrationIntro")}</p>
          <div id="migrationGuide" class="migration-review-note" role="group"
            aria-label="${this._t("migrationGuideTitle")}" hidden>
            <h3 id="migrationGuideTitle">${this._t("migrationGuideTitle")}</h3>
            <p id="migrationGuideStep" class="diagnostic-note">
              ${this._t("migrationGuideStepIdentify")}
            </p>
            <p id="migrationGuideDetected"></p>
            <p id="migrationGuideCandidate"></p>
            <p id="migrationGuideQuestion">${this._t("migrationGuideQuestion")}</p>
            <div class="migration-controls">
              <button id="migrationIntentNew" type="button" class="secondary"
                aria-pressed="false">${this._t("migrationGuideNew")}</button>
              <button id="migrationIntentExisting" type="button" class="secondary"
                aria-pressed="false">${this._t("migrationGuideExisting")}</button>
              <button id="migrationIntentUnsure" type="button" class="secondary"
                aria-pressed="false">${this._t("migrationGuideUnsure")}</button>
            </div>
            <p id="migrationGuideNext" role="status"></p>
            <div id="assistantFileSection" hidden>
              <details id="assistantFileExamples">
                <summary>${this._t("assistantFileHelp")}</summary>
                <p>${this._t("assistantExampleDirect")}</p>
                <pre>google_assistant:
  expose_by_default: false
  entity_config: !include google_assistant_entities.yaml</pre>
                <p>${this._t("assistantExampleInclude")}</p>
                <pre>google_assistant: !include google_assistant.yaml</pre>
                <p>${this._t("assistantExampleIncludedContent")}</p>
                <pre>expose_by_default: false
entity_config: !include google_assistant_entities.yaml</pre>
                <p class="diagnostic-note">${this._t("assistantExampleNote")}</p>
              </details>
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
                <section id="assistantTakeoverSection" hidden
                  aria-labelledby="assistantTakeoverTitle">
                  <h4 id="assistantTakeoverTitle"></h4>
                  <p id="assistantTakeoverIntro" class="diagnostic-note"></p>
                  <button id="assistantTakeoverButton" type="button"
                    class="secondary"></button>
                  <p id="assistantTakeoverResult" role="status"></p>
                </section>
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
          <p id="migrationRecoveryAttention" role="alert" class="diagnostic-note" hidden></p>
          <details id="migrationAdvanced">
            <summary>${this._t("migrationAdvancedTitle")}</summary>
          <div class="migration-controls">
            <button id="migrationPrepareBaseline" type="button" class="secondary" disabled>
              ${this._t("migrationBaselinePrepare")}
            </button>
            <button id="migrationConfirmBaseline" type="button" disabled hidden>
              ${this._t("migrationBaselineConfirmAction")}
            </button>
          </div>
          <p id="migrationBaselineStatus" role="status" class="diagnostic-note"></p>
          <div class="migration-controls">
            <button id="migrationRestoreDraft" type="button" class="secondary">
              ${this._t("migrationDraftLoad")}
            </button>
            <button id="migrationSaveDraft" type="button" class="secondary">
              ${this._t("migrationDraftSave")}
            </button>
          </div>
          <p id="migrationDraftStatus" role="status" class="diagnostic-note"></p>
          <div class="migration-controls">
            <button id="migrationReadAttestation" type="button" class="secondary">
              ${this._t("migrationAttestationRead")}
            </button>
            <button id="migrationAttestReview" type="button" class="secondary">
              ${this._t("migrationAttestationConfirmAction")}
            </button>
          </div>
          <p id="migrationAttestationStatus" role="status" class="diagnostic-note"></p>
          <h3 id="migrationRecoveryTitle">${this._t("migrationRecoveryTitle")}</h3>
          <button id="migrationRecoveryRefresh" type="button" class="secondary">
            ${this._t("migrationRecoveryRead")}
          </button>
          <p id="migrationRecoveryStatus" role="status" class="diagnostic-note"></p>
          <div id="migrationRecoveryRows" class="migration-scroll"></div>
          <p id="migrationRecoveryDecisionStatus" role="status" class="diagnostic-note"></p>
          <h3 id="migrationLedgerTitle">${this._t("migrationLedgerTitle")}</h3>
          <button id="migrationLedgerRefresh" class="secondary" type="button">
            ${this._t("migrationLedgerRead")}
          </button>
          <p id="migrationLedgerStatus" role="status" class="diagnostic-note"></p>
          <div id="migrationLedgerRows" class="migration-scroll"></div>

          <p id="migrationStatus" role="status">${this._t("migrationEmpty")}</p>
          <div id="migrationSummary" class="migration-review-note"></div>
          <div id="migrationRows" class="migration-scroll"></div>
          <button id="migrationMore" type="button" class="secondary" hidden>
            ${this._t("migrationMore")}
          </button>
          </details>
        </section>
        <section id="tab-backups" class="hvls-tab-panel" role="tabpanel" hidden>
          <h2>${this._t("tabBackups")}</h2>
          <p id="backupIntro" class="diagnostic-note">${this._t("backupIntro")}</p>
          <p id="backupStatus" role="status"></p>
          <p id="backupRestoreNotice" class="diagnostic-note"
            role="status" hidden></p>
          <div id="backupList"></div>
          <div id="backupDiff"></div>
          <button id="restoreBackup" type="button" disabled>${this._t("backupRestore")}</button>
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
    this.querySelector("#applyUnmanagedAssistant").addEventListener(
      "click", () => this._activateTab("migration")
    );
    this.querySelector("#restoreBackup").addEventListener("click", () => this._restoreBackup());
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
    this.querySelector("#migrationIntentNew").addEventListener("click", () => this._chooseMigrationIntent("new"));
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
    this.querySelector("#migrationPrepareBaseline").addEventListener("click", () => this._prepareMigrationBaseline());
    this.querySelector("#migrationConfirmBaseline").addEventListener("click", () => this._confirmMigrationBaseline());
    this.querySelector("#migrationRestoreDraft").addEventListener("click", () => this._restoreMigrationDecisionDraft());
    this.querySelector("#migrationSaveDraft").addEventListener("click", () => this._saveMigrationDecisionDraft());
    this.querySelector("#migrationReadAttestation").addEventListener("click", () => this._readMigrationAttestation());
    this.querySelector("#migrationAttestReview").addEventListener("click", () => this._attestMigrationReview());
    this.querySelector("#migrationRecoveryRefresh").addEventListener("click", () => this._loadMigrationRecovery());
    this.querySelector("#migrationLedgerRefresh").addEventListener(
      "click", () => this._loadMigrationInvestigationHistory()
    );
    this.querySelector("#migrationMore").addEventListener("click", () => {
      this._migrationLimit = (this._migrationLimit || 100) + 100;
      this._renderMigrationReview();
    });
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
    const current = entity.has_label === true;
    const enabled = !current;
    const action = this._t(enabled ? "actionAdd" : "actionRemove");

    // Ne jamais considérer la case comme modifiée avant confirmation.
    checkbox.checked = current;

    if (this._entityWritePending) return;

    // A stale UI or a programmatic call cannot add an ineligible entity.
    if (enabled && entity.eligible !== true) return;

    const confirmed = window.confirm(
      this._tf("confirmLabel", {action}) + "\n\n" +
      `${entity.name || entity.entity_id}\n` +
      `${entity.entity_id}\n\n` +
      this._t("otherLabelsPreserved")
    );

    if (!confirmed) return;

    this._entityWritePending = true;
    // The previous Preview approval predates this label change.
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    let reloadSucceeded = false;

    const controls = Array.from(
      this.querySelectorAll(".entity-hvls-checkbox")
    );
    controls.forEach((control) => { control.disabled = true; });

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/set_entity_label",
        entity_id: entity.entity_id,
        enabled,
        expected_enabled: current,
      });

      if (result.entity_id !== entity.entity_id ||
          result.has_label !== enabled) {
        throw new Error(this._t("inconsistentRegistry"));
      }

      // Le catalogue est relu depuis les registres réels de HA.
      const reloaded = await this._loadEntities();
      reloadSucceeded = reloaded;
      if (!reloaded) {
        window.alert(
          this._t("reloadFailed")
        );
      }
    } catch (error) {
      checkbox.checked = current;
      window.alert(
        this._tf("updateFailed", {entity: entity.entity_id}) + "\n" +
        (error.message || String(error))
      );
    } finally {
      this._entityWritePending = false;
      this.querySelectorAll(".entity-hvls-checkbox").forEach(
        (control) => { control.disabled = control.dataset.ineligible === "true"; }
      );
    }
    // Regenerate only after successful label update + catalog reload.
    // This writes the Preview file, never the Google Assistant production file.
    if (reloadSucceeded) await this._generatePreview();
  }

  _openEntityDetails(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: {entityId},
      bubbles: true,
      composed: true
    }));
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
    const filter = this.querySelector("#entityFilter")?.value || "all";

    // Mémoriser les domaines ouverts.
    const openDomains = new Set(
      Array.from(
        list.querySelectorAll(".entity-catalog-domain[open]")
      ).map((details) => details.dataset.domain)
    );

    // Recherche sur l'ensemble du catalogue HA.
    const matching = (catalog.entities || []).filter((entity) => {
      if (!this._entityMatchesFilter(entity, filter)) return false;

      const searchable = [
        entity.name,
        entity.entity_id,
        entity.room,
        entity.domain
      ].join(" ").toLocaleLowerCase();

      return searchable.includes(query);
    });

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
            `${entity.entity_id} · ${entity.room || this._t("noArea")}`;

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
          } else {
            label.textContent = this._t("withoutHVLS");
          }

          if (entity.eligible === false) {
            // A touch/keyboard-accessible explanation, not a hover-only tooltip.
            const explanation = this._eligibilityExplanation(entity.exclusion_reason);
            const reason = document.createElement("button");
            reason.type = "button";
            reason.className = "entity-eligibility-info";
            reason.textContent = "ⓘ";
            reason.title = explanation;
            reason.setAttribute("aria-label", this._t("exclusionHelp"));
            reason.setAttribute("aria-expanded", "false");

            const explanationText = document.createElement("p");
            explanationText.className = "entity-eligibility-detail";
            explanationText.textContent = explanation;
            explanationText.hidden = true;
            reason.addEventListener("click", () => {
              explanationText.hidden = !explanationText.hidden;
              reason.setAttribute("aria-expanded", String(!explanationText.hidden));
            });
            info.append(reason, explanationText);
          }

          const control = document.createElement("label");
          control.className = "entity-hvls-control";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "entity-hvls-checkbox";
          checkbox.checked = entity.has_label === true;
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

          const controlText = document.createElement("span");
          controlText.textContent = "HVLS";

          control.append(checkbox, controlText);
          row.append(info, label, control);
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
      empty.textContent = this._t("noMatches");
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
    const group = document.createElement("div");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", this._t("tabBackups"));
    for (const item of this._backupList) {
      const label = document.createElement("label");
      label.className = "backup-item";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "hvls_backup_selection";
      radio.value = item.id;
      radio.checked = item.id === this._selectedBackup;
      radio.addEventListener("change", () => this._reviewBackup(item.id));
      const info = document.createElement("span");
      info.textContent = `${item.timestamp} · ${this._tf("backupEntities", {count: item.entities_count})} · ${this._tf("backupSize", {size: item.size})}`;
      label.append(radio, info);
      group.appendChild(label);
    }
    list.appendChild(group);
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
    if (!data || !data.comparison || data.comparison.status !== "ok") {
      if (restore) restore.disabled = true;
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
      restore.disabled = Boolean(comparison.identical_text === true ||
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
    if (!data || this._restoring || this._applying ||
        this._refreshing || this._generating || this._entityWritePending ||
        data.comparison?.identical_text === true) return;

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
      });
      if (this._loadId !== requestId) return;
      if (result?.mode !== "restore_preview" ||
          result?.available !== true || result?.can_apply !== false ||
          result?.comparison?.status !== "ok" ||
          typeof result?.content !== "string") {
        throw new Error("Invalid restore Preview response");
      }
      this._stagedRestore = result;
      this._backupRestoreCompleted = false;
      this._previewContent = result.content;
      this._previewPath = result.path;
      this._applyBlockReason = this._t("backupPreviewNotExecutable");
      this._applyBlockReasonCode = null;
      this._renderAnalysis(result);
      this._setContent(result.content);
      this._updateApplyButton();
      this._activateTab("preview");
      const diff = result.comparison;
      const counts = {
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

  _renderMigrationAdvanced() {
    const advanced = this.querySelector("#migrationAdvanced");
    if (!advanced) return;
    const mode = this._migrationReport?.diagnostic?.mode;
    const recovery = this._migrationRecoveryReport;
    const recoveryNeedsAttention = recovery?.needs_review === true ||
      ["review_required", "snapshot_changed", "unavailable"].includes(recovery?.status);
    const alert = this.querySelector("#migrationRecoveryAttention");
    if (alert) {
      alert.hidden = !recoveryNeedsAttention;
      alert.textContent = recoveryNeedsAttention
        ? this._t("migrationRecoveryAttention") : "";
    }
    // Never conceal recovery needing attention behind a collapsed section.
    // For an unblocked new-configuration diagnosis, keep the tools folded.
    const key = String(mode || "loading") + ":" + String(recoveryNeedsAttention);
    if (this._migrationAdvancedContext !== key) {
      if (mode || recoveryNeedsAttention) {
        advanced.open = recoveryNeedsAttention || mode !== "new_configuration";
        this._migrationAdvancedContext = key;
      }
    }
  }

  _assistantPackagesDetected() {
    return this._migrationReport?.diagnostic?.global_blockers
      ?.includes("packages_not_yet_supported") === true;
  }

  _assistantFileExplanation(code) {
    const reasons = {
      invalid_entity_file_path: ["chemin invalide", "invalid path"],
      sensitive_file_reference: ["fichier sensible", "sensitive file"],
      symlink_entity_file_not_allowed: ["lien symbolique interdit", "symlink prohibited"],
      include_missing: ["fichier introuvable", "file not found"],
      yaml_syntax_error: ["syntaxe YAML incorrecte", "invalid YAML"],
      duplicate_mapping_key: ["clé YAML en double", "duplicate YAML key"],
      yaml_file_too_large: ["fichier trop volumineux", "file too large"],
      expected_mapping: ["structure YAML incorrecte", "invalid YAML structure"],
      unreadable_yaml_file: ["fichier illisible", "unreadable file"],
      entity_file_unavailable: ["fichier inaccessible", "file unavailable"],
      invalid_entity_id: ["identifiant d'entité incorrect", "invalid entity ID"],
      invalid_entity_options: ["options d'entité incorrectes", "invalid entity options"],
      invalid_expose_value: ["valeur expose incorrecte", "invalid expose value"],
      invalid_room_option: ["option room incorrecte", "invalid room option"],
      invalid_name_option: ["option name incorrecte", "invalid name option"],
      invalid_aliases_option: ["option aliases incorrecte", "invalid aliases option"],
      unhandled_entity_option: ["option non prise en charge", "unsupported option"],
    };
    const translated = reasons[code];
    return translated
      ? translated[this._language === "fr" ? 0 : 1]
      : (this._language === "fr" ? "problème non identifié" : "unknown issue");
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

  _assistantAdoptionAvailable() {
    const diag = this._migrationReport?.diagnostic;
    const report = this._assistantFileReport;
    return diag?.mode === "new_configuration" &&
      diag?.source?.status === "resolved" &&
      !this._assistantPackagesDetected() &&
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
    const seen = new Set();
    const rows = [];
    const candidates = [];
    const totals = {ready: 0, already: 0, excluded: 0, review: 0};
    for (const entry of report.adoption_entries) {
      if (!entry || typeof entry.entity_id !== "string" ||
          !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entry.entity_id) ||
          seen.has(entry.entity_id) ||
          !["expose", "exclude", "unset", "invalid"].includes(entry.exposure) ||
          typeof entry.has_customizations !== "boolean" ||
          !Array.isArray(entry.reasons)) return null;
      seen.add(entry.entity_id);
      const entity = catalog.get(entry.entity_id);
      let category = "review";
      let reasonKey = null;
      let noteKey = null;
      if (entry.reasons.length) {
        reasonKey = "assistantAdoptReviewYamlIssue";
      } else if (entry.exposure === "invalid") {
        reasonKey = "assistantAdoptReviewInvalidExposure";
      } else if (!entity) {
        reasonKey = "assistantAdoptReviewMissingEntity";
      } else if (entry.exposure === "unset") {
        reasonKey = "assistantAdoptReviewImplicitExposure";
      } else if (entity.has_label !== true && entity.has_label !== false) {
        reasonKey = "assistantAdoptReviewUnknownLabel";
      } else if (entry.exposure === "exclude") {
        if (entity.has_label === false) {
          category = "excluded";
          if (entry.has_customizations) {
            noteKey = "assistantAdoptCustomValuesUnverified";
          }
        } else {
          reasonKey = "assistantAdoptReviewExcludedLabeled";
        }
      } else if (entity.eligible !== true) {
        reasonKey = "assistantAdoptReviewIneligible";
      } else if (entity.has_label === true) {
        // The label is already present. name/room are generated by HVLS too:
        // their presence alone must not turn a labeled entity into "review".
        // Do not claim YAML values match; the inspector never returns them.
        category = "already";
        if (entry.has_customizations) {
          noteKey = "assistantAdoptCustomValuesUnverified";
        }
      } else if (entry.has_customizations) {
        reasonKey = "assistantAdoptReviewUnlabeledCustom";
      } else {
        category = "ready";
        candidates.push(entry.entity_id);
      }
      totals[category] += 1;
      rows.push({entity_id: entry.entity_id, category, reasonKey, noteKey});
    }
    // Invalid YAML keys have no safe entity ID to display, but remain
    // local issues. Do not silently classify them as importable entries.
    const unlisted = Math.max(0, (report.counts?.entries || 0) - rows.length);
    totals.review += unlisted;
    return {
      candidates, rows, totals,
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
    if (section.hidden) return;
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
      action.textContent = plan?.candidates.length
        ? this._tf("assistantAdoptAction", {count: plan.candidates.length})
        : this._t("assistantAdoptNone");
      action.disabled = this._assistantAdoptBusy === true ||
        this._entityWritePending === true ||
        this._entityLoading === true ||
        !plan?.complete || !plan?.canWrite || !plan.candidates.length;
    }
    const result = this.querySelector("#assistantAdoptResult");
    if (result) result.textContent = this._assistantAdoptMessage ||
      (plan && !plan.complete ? this._t("assistantAdoptTruncated") : "");
    const takeoverSection = this.querySelector("#assistantTakeoverSection");
    const takeoverVisible = this._assistantAdoptionAvailable() &&
      this._applyBlockReasonCode === "unmanaged_output";
    if (takeoverSection) takeoverSection.hidden = !takeoverVisible &&
      !this._assistantTakeoverMessage;
    for (const id of ["assistantTakeoverTitle", "assistantTakeoverIntro",
                      "assistantTakeoverButton"]) {
      const node = this.querySelector("#" + id);
      if (!node) continue;
      node.textContent = this._t(id === "assistantTakeoverButton"
        ? "assistantTakeoverAction" : id);
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
    if (!this._hass || !this._assistantAdoptionAvailable() ||
        this._applyBlockReasonCode !== "unmanaged_output" ||
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
      const diff = prepared.changes || {};
      const confirmed = window.confirm(this._tf("assistantTakeoverConfirm", {
        path, entities: prepared.entities, issues: prepared.issues,
        added: diff.added, removed: diff.removed, modified: diff.modified,
      }));
      if (!confirmed) {
        this._assistantTakeoverMessage = "";
        return;
      }
      // Confirm rechecks both hashes server-side under the common writer lock.
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/confirm_existing_output_takeover",
        path, production_sha256: prepared.production_sha256,
        preview_sha256: prepared.preview_sha256, confirmed: true,
      });
      if (result?.taken_over !== true ||
          result?.production_unchanged !== true ||
          result?.apply_performed !== false ||
          typeof result.backup_name !== "string") {
        throw new Error("unverified_result");
      }
      this._assistantTakeoverMessage = this._tf("assistantTakeoverSuccess", {
        backup: result.backup_name,
      });
      // Refresh the server's ownership evaluation, never apply the Preview.
      await this._loadPreview();
    } catch (_error) {
      this._assistantTakeoverMessage = this._t("assistantTakeoverFailure");
      // A backup or ownership record may already exist; always reread.
      await this._loadPreview();
    } finally {
      this._assistantTakeoverBusy = false;
      this._renderAssistantAdoption();
    }
  }

  async _adoptAssistantFile() {
    const plan = this._assistantAdoptionPlan();
    if (!this._hass || !plan?.complete || !plan.canWrite ||
        !plan.candidates.length || this._assistantAdoptBusy ||
        this._entityWritePending || this._entityLoading ||
        this._applying || this._restoring || this._generating) return;
    const ids = [...plan.candidates];
    const path = this._assistantFilePath.trim();
    const original = this._assistantFileReport;
    const requestId = this._assistantFileRequestId || 0;
    if (!window.confirm(this._tf("assistantAdoptConfirm", {
      count: ids.length,
    }))) return;

    this._assistantAdoptBusy = true;
    this._entityWritePending = true;
    this._review = null;  // Label changes invalidate previous Preview approval.
    this._loadId = (this._loadId || 0) + 1;
    this._updateApplyButton();
    let completed = 0;
    let finished = false;
    let writeAttempted = false;
    this._assistantAdoptMessage = this._tf("assistantAdoptBusy", {
      done: completed, total: ids.length,
    });
    this._renderAssistantAdoption();
    try {
      const fresh = await this._hass.callWS({
        type: "ha_voice_label_sync/inspect_assistant_entity_file", path,
      });
      if (!this._assistantAdoptionAvailable() ||
          requestId !== (this._assistantFileRequestId || 0) ||
          this._assistantFilePath.trim() !== path ||
          fresh?.read_only !== true ||
          fresh?.source_active_verified !== false ||
          fresh?.migration_authorized !== false ||
          fresh?.stage_allowed !== false ||
          fresh?.apply_allowed !== false ||
          fresh?.cutover_allowed !== false ||
          !["parsed", "review_required"].includes(fresh.status) ||
          fresh.file_sha256 !== original.file_sha256 ||
          JSON.stringify(fresh.adoption_entries) !==
            JSON.stringify(original.adoption_entries)) {
        throw new Error("stale_source");
      }
      // Revalidate current labels and eligibility before starting any write.
      if (!await this._loadEntities()) throw new Error("catalog_unavailable");
      const verified = this._assistantAdoptionPlan();
      if (!verified?.complete || !verified.canWrite ||
          JSON.stringify(verified.candidates) !== JSON.stringify(ids)) {
        throw new Error("stale_catalog");
      }
      for (const entity_id of ids) {
        if (requestId !== (this._assistantFileRequestId || 0) ||
            this._assistantFilePath.trim() !== path) {
          throw new Error("context_changed");
        }
        // Existing admin-only, per-entity, eligibility-checked HA label API.
        // No migration staging API, source YAML write or Google cutover.
        writeAttempted = true;
        const response = await this._hass.callWS({
          type: "ha_voice_label_sync/set_entity_label",
          entity_id, enabled: true, expected_enabled: false,
        });
        if (response?.entity_id !== entity_id ||
            response?.has_label !== true || response?.changed !== true) {
          throw new Error("label_not_confirmed");
        }
        completed += 1;
        this._assistantAdoptMessage = this._tf("assistantAdoptBusy", {
          done: completed, total: ids.length,
        });
        this._renderAssistantAdoption();
      }
      finished = true;
    } catch (_error) {
      // Fail at the first uncertain result. Never guess a rollback.
    } finally {
      if (writeAttempted) {
        await this._loadEntities();
        await this._generatePreview(); // Preview only; never Apply YAML.
      }
      this._entityWritePending = false;
      this._assistantAdoptBusy = false;
      this._assistantAdoptMessage = this._tf(
        finished ? "assistantAdoptDone" :
          writeAttempted ? "assistantAdoptStopped" : "assistantAdoptStale",
        {count: completed}
      );
      this._updateApplyButton();
      this._renderAssistantAdoption();
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
        const line = this._language === "fr" ? "ligne" : "line";
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
      this._assistantPackagesDetected();
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
    const relevant = isNew || packages;
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
    const candidate = this.querySelector("#migrationGuideCandidate");
    if (candidate) candidate.textContent = this._t(packages
      ? "assistantPackagesDetected"
      : diag.source.unreferenced_google_entity_file_present === true
        ? "migrationGuideCandidate" : "migrationGuideNoCandidate"
    );
    const detectedNote = this.querySelector("#migrationGuideDetected");
    if (detectedNote) detectedNote.textContent = packages
      ? "" : this._t("migrationGuideDetected");
    const question = this.querySelector("#migrationGuideQuestion");
    const questionKey = packages ? "assistantPackagesQuestion" :
      this._migrationIntent === "new" ? "migrationGuideSelectedNew" :
      this._migrationIntent === "existing" ? "migrationGuideSelectedExisting" :
      this._migrationIntent === "unsure" ? "migrationGuideSelectedUnsure" :
      "migrationGuideQuestion";
    if (question) question.textContent = this._t(questionKey);
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
      this._assistantFilePath = !packages &&
        diag.source.unreferenced_google_entity_file_present === true
          ? "google_assistant_entities.yaml" : "";
    }
    const hint = this.querySelector("#assistantFileHint");
    if (hint) hint.textContent = this._t(!packages &&
      diag.source.unreferenced_google_entity_file_present === true
        ? "assistantFileCandidate" : "assistantFileManual");
    this._renderAssistantFileStatus();
  }

  _migrationBaselineEligible() {
    const diag = this._migrationReport?.diagnostic;
    return diag?.mode === "assisted_migration" &&
      diag?.review_status === "pending_review" &&
      diag?.source?.status === "resolved" &&
      Array.isArray(diag.global_blockers) &&
      diag.global_blockers.length === 0;
  }

  _migrationBaselineControls() {
    const prepare = this.querySelector("#migrationPrepareBaseline");
    const confirm = this.querySelector("#migrationConfirmBaseline");
    if (prepare) prepare.disabled = this._baselineBusy === true ||
      !this._migrationBaselineEligible();
    if (confirm) {
      confirm.hidden = !this._baselineChallenge;
      confirm.disabled = this._baselineBusy === true ||
        !this._baselineChallenge || !this._migrationBaselineEligible();
    }
  }

  async _prepareMigrationBaseline() {
    if (!this._hass || this._baselineBusy || !this._migrationBaselineEligible()) return;
    this._baselineBusy = true;
    this._baselineChallenge = null;
    this._baselinePrepared = null;
    this._migrationBaselineControls();
    const status = this.querySelector("#migrationBaselineStatus");
    if (status) status.textContent = this._t("migrationBaselinePreparing");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_migration_baseline",
      });
      if (result?.status !== "awaiting_explicit_confirmation" ||
          typeof result.confirmation_token !== "string") {
        throw new Error("preflight_unavailable");
      }
      this._baselineChallenge = result.confirmation_token;
      this._baselinePrepared = result;
      if (status) {
        status.textContent = this._tf("migrationBaselinePrepared", {
          files: result.source_files, entities: result.explicit_entities,
        }) + (result.implicit_exposure_warning
          ? " " + this._t("migrationBaselineWarning") : "");
      }
    } catch (_error) {
      if (status) status.textContent = this._t("migrationBaselineError");
    } finally {
      this._baselineBusy = false;
      this._migrationBaselineControls();
    }
  }

  async _confirmMigrationBaseline() {
    const prepared = this._baselinePrepared;
    const challenge = this._baselineChallenge;
    if (!this._hass || !challenge || !prepared || this._baselineBusy) return;
    const accepted = window.confirm(this._tf("migrationBaselineConfirm", {
      files: prepared.source_files,
      entities: prepared.explicit_entities,
    }));
    if (!accepted) return;
    // Consume the browser copy immediately; multiple clicks cannot replay.
    this._baselineChallenge = null;
    this._baselinePrepared = null;
    this._baselineBusy = true;
    this._migrationBaselineControls();
    const status = this.querySelector("#migrationBaselineStatus");
    if (status) status.textContent = this._t("migrationBaselineInitializing");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/initialize_migration_baseline",
        confirmation_token: challenge,
        confirmed: true,
      });
      if (status) {
        status.textContent = result.status === "baseline_and_journal_verified"
          ? this._tf("migrationBaselineSuccess", {
              phase: result.journal_phase,
              revision: result.journal_revision,
            })
          : this._t("migrationBaselinePartial");
      }
      await this._loadMigrationReview();
    } catch (_error) {
      if (status) status.textContent = this._t("migrationBaselineError");
    } finally {
      this._baselineBusy = false;
      this._migrationBaselineControls();
    }
  }

  _renderMigrationRecovery() {
    const status = this.querySelector("#migrationRecoveryStatus");
    const container = this.querySelector("#migrationRecoveryRows");
    if (!status || !container) return;
    container.replaceChildren();
    const result = this._migrationRecoveryReport;
    this._renderMigrationAdvanced();
    if (!result) return;
    if (result.status === "not_initialized") {
      status.textContent = this._t("migrationRecoveryNotInitialized");
      return;
    }
    if (result.status === "unavailable") {
      status.textContent = this._t("migrationRecoveryUnavailable");
      return;
    }
    if (result.status === "snapshot_changed") {
      status.textContent = this._t("migrationRecoveryChanged");
      return;
    }
    if (!["review_required", "observed_no_pending"].includes(result.status)) {
      status.textContent = this._t("migrationRecoveryUnavailable");
      return;
    }
    status.textContent =
      this._t(result.needs_review
        ? "migrationRecoveryRequired" : "migrationRecoveryObserved") +
      " " + this._tf("migrationRecoverySummary", {
        phase: result.phase,
        revision: result.journal_revision,
        total: result.summary?.total ?? 0,
        pending: result.summary?.unconfirmed ?? 0,
        issues: result.summary?.other_issues ?? 0,
        sources: result.source_integrity,
      }) + " " + this._t("migrationRecoverySafeView");
    const scenarios = result.resolution_scenarios;
    const scenariosSafe = scenarios?.read_only === true &&
      scenarios?.automatic_recovery_allowed === false &&
      scenarios?.journal_ack_allowed === false &&
      scenarios?.retry_allowed === false &&
      scenarios?.rollback_allowed === false &&
      scenarios?.stage_allowed === false &&
      scenarios?.apply_allowed === false &&
      scenarios?.cutover_allowed === false &&
      scenarios?.evidence_is_not_execution_authorization === true &&
      Array.isArray(scenarios?.operations) &&
      scenarios.operations.every(item => item.resolution_authorized === false);
    const scenarioRows = new Map(
      (scenariosSafe ? scenarios.operations : []).map(
        item => [item.entity_id, item]
      )
    );
    if (scenariosSafe) {
      status.textContent += " " + this._tf("migrationResolutionSummary", {
        pending: scenarios.summary?.unconfirmed ?? 0,
        investigate: scenarios.summary?.requires_investigation ?? 0,
        quarantine: scenarios.summary?.quarantined ?? 0,
      });
    }
    // Bound rendering independently of the backend's 2,000-operation cap.
    for (const row of (result.operations || []).slice(0, 100)) {
      const line = document.createElement("p");
      line.className = "diagnostic-note";
      line.textContent = this._tf("migrationRecoveryRow", {
        entity: row.entity_id,
        journal: row.operation_status,
        observed: row.observed_status,
        membership: row.membership,
        review: row.needs_review ? "required" : "observed",
      });
      const hypothesis = scenarioRows.get(row.entity_id);
      if (hypothesis?.resolution_authorized === false) {
        line.textContent += " " + this._tf("migrationResolutionLine", {
          scenario: this._t("migrationScenario_" + hypothesis.scenario),
          category: hypothesis.category,
          reasons: (hypothesis.reason_codes || []).join(", ") || "—",
        });
      }
      // A review simulation is offered ONLY for a fresh-looking, intact
      // source and a uniquely diagnosed unresolved case. It cannot write.
      if (scenariosSafe && result.read_only === true &&
          result.automatic_recovery_allowed === false &&
          result.stage_allowed === false &&
          result.apply_allowed === false &&
          result.cutover_allowed === false &&
          result.source_integrity === "verified_unchanged" &&
          result.phase === "labels_staging" &&
          /^[0-9a-f]{64}$/.test(result.journal_evidence_sha256 || "") &&
          row.needs_review === true &&
          hypothesis?.human_investigation_required === true &&
          hypothesis?.resolution_authorized === false) {
        const choice = document.createElement("select");
        choice.setAttribute("aria-label",
          this._t("migrationRecoverySimulationTitle"));
        const available = [
          ["inspect_external_effects", "migrationRecoverySimulationInspect"],
          ["quarantine_for_investigation", "migrationRecoverySimulationQuarantine"],
          ["defer_until_further_evidence", "migrationRecoverySimulationDefer"],
        ];
        for (const [value, key] of available) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = this._t(key);
          choice.append(option);
        }
        choice.value = hypothesis.category === "quarantine"
          ? "quarantine_for_investigation" : "inspect_external_effects";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = this._t("migrationRecoverySimulationAction");
        button.disabled = this._recoverySimulationBusy === true;
        button.addEventListener("click", () => {
          this._simulateRecoveryDecision(row.entity_id, choice.value);
        });
        const durable = document.createElement("button");
        durable.type = "button";
        durable.className = "secondary";
        durable.textContent = this._t("migrationLedgerButton");
        durable.disabled = this._recoveryLedgerBusy === true;
        durable.addEventListener("click", () => {
          this._recordRecoveryInvestigation(row.entity_id, choice.value);
        });
        line.append(choice, button, durable);
      }
      container.append(line);
    }
  }

  async _simulateRecoveryDecision(entityId, disposition) {
    if (!this._hass || this._recoverySimulationBusy) return;
    this._recoverySimulationBusy = true;
    const status = this.querySelector("#migrationRecoveryDecisionStatus");
    if (status) status.textContent = this._t("migrationRecoverySimulationPreparing");
    // Remove clickable controls while awaiting a fresh server preparation.
    this._renderMigrationRecovery();
    try {
      const prepared = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_migration_recovery_decision",
        entity_id: entityId, disposition,
      });
      if (prepared?.status !== "awaiting_simulated_human_confirmation" ||
          prepared.entity_id !== entityId ||
          prepared.disposition !== disposition ||
          typeof prepared.confirmation_token !== "string" ||
          prepared.read_only !== true ||
          prepared.execution_authorized !== false ||
          prepared.stage_allowed !== false ||
          prepared.cutover_allowed !== false) {
        throw new Error("invalid_simulation_prepare");
      }
      const confirmed = window.confirm(this._tf(
        "migrationRecoverySimulationConfirm", {
          entity: entityId,
          disposition: this._t({
            inspect_external_effects: "migrationRecoverySimulationInspect",
            quarantine_for_investigation: "migrationRecoverySimulationQuarantine",
            defer_until_further_evidence: "migrationRecoverySimulationDefer",
          }[disposition]),
        }
      ));
      if (!confirmed) {
        if (status) status.textContent =
          this._t("migrationRecoverySimulationDeclined");
        return;
      }
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/confirm_migration_recovery_decision",
        entity_id: entityId, disposition,
        confirmation_token: prepared.confirmation_token,
        confirmed: true,
        acknowledge_external_uncertainty: true,
      });
      if (result?.status !== "simulated_review_confirmation_no_execution" ||
          result.entity_id !== entityId ||
          result.read_only !== true ||
          result.no_action_was_performed !== true ||
          result.execution_authorized !== false ||
          result.journal_ack_allowed !== false ||
          result.retry_allowed !== false ||
          result.rollback_allowed !== false ||
          result.stage_allowed !== false ||
          result.apply_allowed !== false ||
          result.cutover_allowed !== false) {
        throw new Error("invalid_simulation_confirmation");
      }
      if (status) status.textContent = this._tf(
        "migrationRecoverySimulationComplete", {entity: entityId}
      );
    } catch (_error) {
      if (status) status.textContent =
        this._t("migrationRecoverySimulationRefused");
    } finally {
      this._recoverySimulationBusy = false;
      this._renderMigrationRecovery();
    }
  }

  async _recordRecoveryInvestigation(entityId, disposition) {
    if (!this._hass || this._recoveryLedgerBusy) return;
    this._recoveryLedgerBusy = true;
    const status = this.querySelector("#migrationRecoveryDecisionStatus");
    if (status) status.textContent = this._t("migrationLedgerSaving");
    this._renderMigrationRecovery();
    try {
      const prepared = await this._hass.callWS({
        type: "ha_voice_label_sync/prepare_migration_investigation_record",
        entity_id: entityId, disposition,
      });
      if (prepared?.status !== "awaiting_durable_investigation_confirmation" ||
          prepared.entity_id !== entityId ||
          prepared.disposition !== disposition ||
          typeof prepared.confirmation_token !== "string" ||
          prepared.execution_authorized !== false ||
          prepared.journal_ack_allowed !== false ||
          prepared.stage_allowed !== false ||
          prepared.cutover_allowed !== false) {
        throw new Error("invalid_durable_prepare");
      }
      const accepted = window.confirm(this._tf("migrationLedgerConfirm", {
        entity: entityId,
        disposition: this._t({
          inspect_external_effects: "migrationRecoverySimulationInspect",
          quarantine_for_investigation: "migrationRecoverySimulationQuarantine",
          defer_until_further_evidence: "migrationRecoverySimulationDefer",
        }[disposition]),
      }));
      if (!accepted) {
        if (status) status.textContent = this._t("migrationLedgerCancelled");
        return;
      }
      const saved = await this._hass.callWS({
        type: "ha_voice_label_sync/confirm_migration_investigation_record",
        entity_id: entityId, disposition,
        confirmation_token: prepared.confirmation_token,
        confirmed: true, acknowledge_external_uncertainty: true,
      });
      if (saved?.status !== "durable_investigation_recorded_no_execution" ||
          saved.record?.entity_id !== entityId ||
          saved.record?.disposition !== disposition ||
          saved.execution_authorized !== false ||
          saved.journal_ack_allowed !== false ||
          saved.retry_allowed !== false ||
          saved.rollback_allowed !== false ||
          saved.stage_allowed !== false ||
          saved.apply_allowed !== false ||
          saved.cutover_allowed !== false ||
          saved.label_changed !== false ||
          saved.journal_changed !== false ||
          saved.production_yaml_changed !== false) {
        throw new Error("invalid_durable_result");
      }
      if (status) status.textContent = this._tf("migrationLedgerRecorded", {
        sequence: saved.record.sequence,
      });
      await this._loadMigrationInvestigationHistory();
    } catch (_error) {
      if (status) status.textContent = this._t("migrationLedgerRejected");
    } finally {
      this._recoveryLedgerBusy = false;
      this._renderMigrationRecovery();
    }
  }

  async _loadMigrationInvestigationHistory() {
    if (!this._hass || this._ledgerLoading) return;
    this._ledgerLoading = true;
    const button = this.querySelector("#migrationLedgerRefresh");
    const status = this.querySelector("#migrationLedgerStatus");
    const container = this.querySelector("#migrationLedgerRows");
    if (button) button.disabled = true;
    if (status) status.textContent = this._t("migrationLedgerReading");
    try {
      const ledger = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_investigation_history",
      });
      if (ledger?.status !== "verified_investigation_history" ||
          ledger.execution_authorized !== false ||
          ledger.stage_allowed !== false ||
          ledger.cutover_allowed !== false ||
          ledger.history_read_only !== true ||
          !Array.isArray(ledger.records)) {
        throw new Error("invalid_history");
      }
      if (status) status.textContent = this._tf("migrationLedgerCount", {
        count: ledger.record_count,
      });
      if (container) {
        container.replaceChildren();
        for (const record of ledger.records.slice(-50)) {
          const row = document.createElement("p");
          row.className = "diagnostic-note";
          row.textContent = this._tf("migrationLedgerRow", {
            sequence: record.sequence,
            entity: record.entity_id,
            disposition: record.disposition,
            relation: record.evidence_relation,
          });
          container.append(row);
        }
      }
    } catch (_error) {
      if (container) container.replaceChildren();
      if (status) status.textContent = this._t("migrationLedgerUnavailable");
    } finally {
      this._ledgerLoading = false;
      if (button) button.disabled = false;
    }
  }

  async _loadMigrationRecovery() {
    if (!this._hass || this._migrationRecoveryLoading) return;
    this._migrationRecoveryLoading = true;
    const button = this.querySelector("#migrationRecoveryRefresh");
    const status = this.querySelector("#migrationRecoveryStatus");
    if (button) button.disabled = true;
    if (status) status.textContent = this._t("migrationRecoveryLoading");
    try {
      const report = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_recovery_status",
      });
      if (!report || report.read_only !== true ||
          report.automatic_recovery_allowed !== false ||
          report.stage_allowed !== false ||
          report.cutover_allowed !== false) {
        throw new Error("invalid_recovery_response");
      }
      this._migrationRecoveryReport = report;
      this._renderMigrationRecovery();
    } catch (_error) {
      this._migrationRecoveryReport = null;
      this.querySelector("#migrationRecoveryRows")?.replaceChildren();
      if (status) status.textContent = this._t("migrationRecoveryUnavailable");
    } finally {
      this._migrationRecoveryLoading = false;
      if (button) button.disabled = false;
    }
  }

  _attestationControls() {
    const read = this.querySelector("#migrationReadAttestation");
    const attest = this.querySelector("#migrationAttestReview");
    if (read) read.disabled = this._attestationBusy === true;
    if (attest) attest.disabled = this._attestationBusy === true;
  }

  async _readMigrationAttestation() {
    if (!this._hass || this._attestationBusy || this._migrationLoading) return;
    this._attestationBusy = true;
    this._attestationControls();
    const status = this.querySelector("#migrationAttestationStatus");
    if (status) status.textContent = this._t("migrationAttestationReading");
    try {
      const observed = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_review_attestation",
      });
      if (!observed || observed.cutover_allowed !== false ||
          observed.review_is_not_execution_authorization !== true) {
        throw new Error("attestation_state_invalid");
      }
      if (status) status.textContent = this._tf(
        "migrationAttestationFresh", {status: observed.status}
      );
    } catch (_error) {
      if (status) status.textContent = this._t("migrationAttestationUnavailable");
    } finally {
      this._attestationBusy = false;
      this._attestationControls();
    }
  }

  async _attestMigrationReview() {
    if (!this._hass || this._attestationBusy || this._migrationLoading) return;
    const report = this._migrationReport;
    const status = this.querySelector("#migrationAttestationStatus");
    if (this._migrationDirty || !report ||
        report.protected_baseline_status !== "verified" ||
        this._draftExpectedRevision == null) {
      if (status) status.textContent = this._t("migrationAttestationNotReady");
      return;
    }
    this._attestationBusy = true;
    this._attestationControls();
    if (status) status.textContent = this._t("migrationAttestationReading");
    try {
      // Fresh backend evidence is recomputed from the PROTECTED SAVED
      // decisions, not from untrusted browser choices.
      const current = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_review_attestation",
      });
      const evidence = current?.fresh_review_evidence;
      if (!evidence ||
          !["reviewed_with_open_issues",
            "reviewed_without_detected_issues"].includes(evidence.status) ||
          evidence.review_token_sha256 !== report.preflight?.review_token_sha256 ||
          current.cutover_allowed !== false ||
          typeof current.attestation_revision !== "number") {
        throw new Error("review_changed");
      }
      // The server handles CAS for the draft and journal; a changed draft
      // will be refused even if an old preview still appears on screen.
      const saved = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_decision_draft",
      });
      if (saved?.status !== "saved_unapproved_draft" ||
          saved.draft_revision !== this._draftExpectedRevision ||
          saved.review_token_sha256 !== evidence.review_token_sha256 ||
          typeof saved.journal_revision !== "number") {
        throw new Error("saved_choices_changed");
      }
      const prompt = evidence.observed_issues
        ? this._t("migrationAttestationConfirmIssues")
        : this._t("migrationAttestationConfirm");
      if (!window.confirm(prompt)) {
        if (status) status.textContent = "";
        return;
      }
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/attest_migration_review",
        confirmed: true,
        acknowledge_issues: evidence.observed_issues === true,
        attestation_revision: current.attestation_revision,
        draft_revision: saved.draft_revision,
        journal_revision: saved.journal_revision,
        baseline_manifest_sha256: saved.baseline_manifest_sha256,
        review_evidence_sha256: evidence.review_evidence_sha256,
      });
      if (!result || result.cutover_allowed !== false ||
          result.review_is_not_execution_authorization !== true ||
          !["reviewed_with_open_issues",
            "reviewed_without_detected_issues"].includes(result.status)) {
        throw new Error("attestation_result_invalid");
      }
      if (status) {
        status.textContent = this._tf("migrationAttestationDone", {
          revision: result.attestation_revision,
        }) + (result.observed_issues
          ? " " + this._t("migrationAttestationWithIssues") : "");
      }
    } catch (_error) {
      if (status) status.textContent = this._t("migrationAttestationUnavailable");
    } finally {
      this._attestationBusy = false;
      this._attestationControls();
    }
  }

  _draftControls() {
    const save = this.querySelector("#migrationSaveDraft");
    const restore = this.querySelector("#migrationRestoreDraft");
    if (save) save.disabled = this._draftBusy === true;
    if (restore) restore.disabled = this._draftBusy === true;
  }

  async _restoreMigrationDecisionDraft() {
    if (!this._hass || this._draftBusy || this._migrationLoading) return;
    this._draftBusy = true;
    this._draftControls();
    const status = this.querySelector("#migrationDraftStatus");
    if (status) status.textContent = this._t("migrationDraftLoading");
    try {
      const saved = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_decision_draft",
      });
      if (!saved || !saved.stored_choices_unapproved ||
          !saved.decisions || typeof saved.decisions !== "object") {
        throw new Error("unavailable_draft");
      }
      const prior = saved.status === "stale_journal" || saved.status === "stale_source";
      this._migrationDecisions = Object.assign(
        Object.create(null), saved.decisions
      );
      this._draftExpectedRevision = saved.draft_revision;
      this._migrationDirty = true;
      await this._loadMigrationReview();
      if (status) {
        status.textContent = this._tf("migrationDraftLoaded", {
          count: Object.keys(saved.decisions).length,
        }) + (prior ? " " + this._t("migrationDraftStale") : "");
      }
    } catch (_error) {
      if (status) status.textContent = this._t("migrationDraftError");
    } finally {
      this._draftBusy = false;
      this._draftControls();
    }
  }

  async _saveMigrationDecisionDraft() {
    if (!this._hass || this._draftBusy || this._migrationLoading) return;
    const report = this._migrationReport;
    const plan = report?.preflight;
    if (this._migrationDirty ||
        report?.protected_baseline_status !== "verified" ||
        !plan?.review_token_sha256) {
      const status = this.querySelector("#migrationDraftStatus");
      if (status) status.textContent = this._t("migrationDraftNotReady");
      return;
    }
    this._migrationDecisions ||= Object.create(null);
    const decisions = {...this._migrationDecisions};
    if (!window.confirm(this._tf("migrationDraftSaveConfirm", {
      count: Object.keys(decisions).length,
    }))) return;

    this._draftBusy = true;
    this._draftControls();
    const status = this.querySelector("#migrationDraftStatus");
    if (status) status.textContent = this._t("migrationDraftSaving");
    try {
      const current = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_decision_draft",
      });
      if (!current || typeof current.journal_revision !== "number" ||
          typeof current.draft_revision !== "number" ||
          typeof current.baseline_manifest_sha256 !== "string") {
        throw new Error("draft_state_invalid");
      }
      if (this._draftExpectedRevision == null) {
        if (current.draft_revision !== -1) {
          throw new Error("draft_conflict_needs_restore");
        }
        this._draftExpectedRevision = -1;
      }
      if (current.draft_revision !== this._draftExpectedRevision) {
        throw new Error("draft_conflict_needs_restore");
      }
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/save_migration_decision_draft",
        decisions,
        review_token_sha256: plan.review_token_sha256,
        baseline_manifest_sha256: current.baseline_manifest_sha256,
        journal_revision: current.journal_revision,
        draft_revision: this._draftExpectedRevision,
      });
      if (result?.status !== "saved_unapproved_draft" ||
          result.cutover_allowed !== false) {
        throw new Error("draft_result_invalid");
      }
      this._draftExpectedRevision = result.draft_revision;
      if (status) status.textContent = this._tf("migrationDraftSaved", {
        count: result.saved_decision_count,
        revision: result.draft_revision,
      });
    } catch (error) {
      // A lost WS response may follow a durable write. Don't retry on a
      // guessed revision; the administrator must inspect and refresh.
      if (status) status.textContent = error?.message === "draft_conflict_needs_restore"
        ? this._t("migrationDraftConflict") : this._t("migrationDraftError");
    } finally {
      this._draftBusy = false;
      this._draftControls();
    }
  }

  async _loadMigrationReview() {
    if (!this._hass || this._migrationLoading) return;
    this._migrationDecisions ||= Object.create(null);
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
    const status = this.querySelector("#migrationStatus");
    if (button) button.disabled = true;
    if (status) status.textContent = this._t("migrationLoading");
    try {
      // This endpoint is admin-only and read-only. Decisions live solely in
      // this panel's memory, never in a HA service or migration journal.
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/get_migration_review",
        decisions: {...this._migrationDecisions},
      });
      if (requestId !== this._migrationRequestId) return;
      this._migrationReport = result;
      this._migrationError = null;
      this._migrationDirty = false;
    } catch (_error) {
      if (requestId !== this._migrationRequestId) return;
      // Do not display arbitrary backend exception text in the admin UI.
      this._migrationError = "migration_review_unavailable";
      this._migrationReport = null;
    } finally {
      if (requestId === this._migrationRequestId) {
        this._migrationLoading = false;
        if (button) button.disabled = false;
        this._renderMigrationReview();
      }
    }
  }

  _setMigrationChoice(entityId, field, value) {
    this._migrationDecisions ||= Object.create(null);
    const current = {...(this._migrationDecisions[entityId] || {})};
    if (field === "action" && !value) {
      delete this._migrationDecisions[entityId];
    } else {
      current[field] = value;
      this._migrationDecisions[entityId] = current;
    }
    this._migrationDirty = true;
    this._renderMigrationReview();
  }

  _renderMigrationReview() {
    const status = this.querySelector("#migrationStatus");
    const summary = this.querySelector("#migrationSummary");
    const content = this.querySelector("#migrationRows");
    const more = this.querySelector("#migrationMore");
    this._renderMigrationGuide();
    this._renderMigrationAdvanced();
    this._migrationBaselineControls();
    if (!status || !summary || !content || !more) return;
    content.replaceChildren();
    const report = this._migrationReport;
    if (!report) {
      summary.textContent = "";
      more.hidden = true;
      if (!this._migrationLoading) {
        status.textContent = this._migrationError
          ? this._tf("migrationFailed", {error: this._migrationError})
          : this._t("migrationEmpty");
      }
      return;
    }

    const diag = report.diagnostic || {};
    const plan = report.preflight || {};
    const simulation = report.simulation;
    const preStageImpact = report.pre_stage_impact;
    const consumerAudit = report.indirect_consumer_audit;
    const baseline = report.protected_baseline_status === "verified"
      ? this._t("migrationBaselineOk")
      : this._t("migrationBaselineMissing");
    status.textContent = this._migrationDirty
      ? this._t("migrationToRecheck")
      : `${this._t("migrationStatus")}: ${simulation?.status || diag.review_status || "unknown"}`;
    const total = Array.isArray(diag.entities) ? diag.entities.length : 0;
    const needReview = plan.summary?.needs_review ?? total;
    const stageable = plan.summary?.proposed_label_additions ?? 0;
    summary.textContent =
      `${this._t("migrationBaseline")}: ${baseline}. ` +
      `${this._t("migrationDecisions")}: ${total}; ` +
      `needs_review=${needReview}; proposed_label_additions=${stageable}. ` +
      "apply_allowed=false; cutover_allowed=false. " +
      (preStageImpact && preStageImpact.stage_allowed === false
        ? this._tf("migrationStagingImpact", {
            status: preStageImpact.status || "unavailable",
          })
        : "") +
      (consumerAudit && consumerAudit.stage_allowed === false
        ? " " + this._tf("migrationConsumerAudit", {
            files: consumerAudit.observed_standard_yaml_files ?? 0,
            writers: consumerAudit.reference_counts?.explicit_hvls_generate_references ?? 0,
            events: consumerAudit.reference_counts?.registry_event_references ?? 0,
            labels: consumerAudit.reference_counts?.label_template_references ?? 0,
          }) + (consumerAudit.original_google_source_overlap === true
            ? " " + this._t("migrationConsumerOverlap") : "")
        : "");

    if (!Array.isArray(diag.entities)) {
      more.hidden = true;
      return;
    }
    this._migrationDecisions ||= Object.create(null);
    const plans = new Map((plan.entities || []).map(item => [item.entity_id, item]));
    const simulations = new Map((simulation?.entities || []).map(
      item => [item.entity_id, item]
    ));
    const impactRows = new Map((preStageImpact?.entities || []).map(
      item => [item.entity_id, item]
    ));
    const table = document.createElement("table");
    table.className = "migration-table";
    const head = document.createElement("thead");
    const tr = document.createElement("tr");
    for (const heading of [
      "Entity ID", this._t("migrationBefore"), this._t("migrationAfter"),
      this._t("migrationDecisions"), this._t("migrationReasons")
    ]) {
      const th = document.createElement("th");
      th.textContent = heading;
      tr.append(th);
    }
    head.append(tr);
    table.append(head);
    const body = document.createElement("tbody");
    const max = Math.min(diag.entities.length, this._migrationLimit || 100);
    for (const entity of diag.entities.slice(0, max)) {
      const entityId = entity.entity_id;
      const proposal = plans.get(entityId);
      const simulated = simulations.get(entityId);
      const impactRow = impactRows.get(entityId);
      const choice = this._migrationDecisions[entityId] || {};
      const row = document.createElement("tr");
      for (const value of [
        entityId,
        entity.disk_ha_sync_projection || "unknown",
        simulated?.hypothetical_after || "unknown",
      ]) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.append(cell);
      }
      const controlCell = document.createElement("td");
      const controls = document.createElement("div");
      controls.className = "migration-controls";
      const action = document.createElement("select");
      action.setAttribute("aria-label", `Migration decision: ${entityId}`);
      for (const [value, key] of [
        ["", "migrationNoChoice"],
        ["import", "migrationImport"],
        ["keep", "migrationKeep"],
        ["disable", "migrationDisable"],
        ["remove", "migrationRemove"],
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = this._t(key);
        action.append(option);
      }
      action.value = choice.action || "";
      action.addEventListener("change", () => {
        this._setMigrationChoice(entityId, "action", action.value);
      });
      controls.append(action);

      if (entity.customization_fields_present?.length) {
        const metadata = document.createElement("select");
        metadata.setAttribute("aria-label", `${this._t("migrationMetadataChoice")}: ${entityId}`);
        for (const [value, label] of [
          ["", "migrationMetadataChoice"],
          ["retain_manual_yaml", "migrationRetain"],
          ["discard_after_review", "migrationDiscard"],
        ]) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = this._t(label);
          metadata.append(option);
        }
        metadata.value = choice.metadata_policy || "";
        metadata.addEventListener("change", () => {
          this._setMigrationChoice(entityId, "metadata_policy", metadata.value || null);
        });
        controls.append(metadata);
      }

      const addCheck = (key, text, enabled) => {
        if (!enabled) return;
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = choice[key] === true;
        input.addEventListener("change", () => {
          this._setMigrationChoice(entityId, key, input.checked);
        });
        const span = document.createElement("span");
        span.textContent = text;
        label.append(input, span);
        controls.append(label);
      };
      addCheck("acknowledge_change", this._t("migrationAcknowledge"),
        ["disable", "remove"].includes(choice.action) ||
        choice.metadata_policy === "discard_after_review");
      addCheck("acknowledge_sensitive_exposure", this._t("migrationSensitive"),
        ["lock", "cover", "alarm_control_panel"].includes(entityId.split(".")[0]) &&
        choice.action === "import");

      controlCell.append(controls);
      row.append(controlCell);
      const reasonsCell = document.createElement("td");
      const reasons = [
        ...(proposal?.reasons || []),
        ...(simulated?.reasons || []),
        ...(impactRow?.reasons || []),
      ];
      reasonsCell.textContent = reasons.length
        ? [...new Set(reasons)].join(", ")
        : proposal?.status || entity.category || "unknown";
      row.append(reasonsCell);
      body.append(row);
    }
    table.append(body);
    content.append(table);
    more.hidden = max >= diag.entities.length;
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
    if (tab === "migration") this._loadMigrationRecovery();
    if (tab === "migration" && !this._migrationReport && !this._migrationLoading) {
      this._loadMigrationReview();
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
