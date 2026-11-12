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
    tabMigration: "Migration",
    migrationIntro: "Les simulations ne modifient ni HA, ni labels, ni YAML. La sauvegarde et le journal sont créés uniquement après votre confirmation.",
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
    backupIntro: "Choisissez une sauvegarde pour voir ses différences avec la production. Seul le YAML Google Assistant sera restauré, jamais les étiquettes Home Assistant.",
    backupLoading: "Chargement des sauvegardes…",
    backupEmpty: "Aucune sauvegarde disponible.",
    backupReviewing: "Comparaison avec la production…",
    backupReviewFailed: "Comparaison impossible : {error}",
    backupLoadFailed: "Chargement impossible : {error}",
    backupRestore: "Restaurer cette sauvegarde",
    backupConfirm: "Restaurer ce YAML en production ? Une copie de sécurité de la production actuelle sera créée obligatoirement. Les étiquettes HA ne seront pas modifiées.",
    backupRestoreFailed: "Restauration refusée : {error}",
    backupRestored: "Restauration terminée. Copie de sécurité : {backup}",
    backupNoDiff: "YAML identique à la production.",
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
    metricEntities: "Entités",
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
    tabMigration: "Migration",
    migrationIntro: "Simulation does not change HA, labels or YAML. The protected backup and journal are created only after explicit confirmation.",
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
    backupIntro: "Select a backup to compare it with current production. Only the Google Assistant YAML file is restored, never Home Assistant labels.",
    backupLoading: "Loading backups…",
    backupEmpty: "No backups available.",
    backupReviewing: "Comparing with production…",
    backupReviewFailed: "Cannot compare: {error}",
    backupLoadFailed: "Cannot load backups: {error}",
    backupRestore: "Restore this backup",
    backupConfirm: "Restore this YAML to production? A safety copy of the current production file will always be created. HA labels will not be changed.",
    backupRestoreFailed: "Restore refused: {error}",
    backupRestored: "Restore completed. Safety backup: {backup}",
    backupNoDiff: "YAML matches production.",
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
    metricEntities: "Entities",
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
    this._review = null;
    this._updateApplyButton();
    this._setStatusKey("previewLoading");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/get_preview",
      });
      if (loadId !== this._loadId || (this._applying && !afterApply)) return;
      this._previewPath = result.path;
      this._previewContent = result.content;
      this._review = result.can_apply && result.preview_sha256 &&
        (result.production_sha256 === null ||
         typeof result.production_sha256 === "string")
        ? {
            preview_sha256: result.preview_sha256,
            production_sha256: result.production_sha256,
          }
        : null;
      this._updateApplyButton();
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
    if (!result?.available || !this._review || comparison?.status !== "ok" ||
        !Array.isArray(comparison.added) ||
        !Array.isArray(comparison.modified)) {
      return "unknown";
    }
    const hasEntity = (entries) => entries.some(
      (item) => (typeof item === "string" ? item : item?.entity_id) === entityId
    );
    if (hasEntity(comparison.added)) return "pending";
    if (hasEntity(comparison.modified)) return "modified";
    // This list is made from Preview entities. If an entity is neither
    // added nor modified, it is already represented in production.
    return "validated";
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
    if (!result.available || !result.summary) return;

    const stats = result.summary;
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

              const status = productionStatuses.get(entity.entity_id) || "unknown";
              const statusKey = {
                validated: "productionValidated",
                pending: "productionPending",
                modified: "productionModified",
                unknown: "productionUnknown",
              }[status];
              const indicator = document.createElement("span");
              indicator.className = `production-status production-status--${status}`;
              indicator.textContent = status === "validated" ? "✓" : status === "unknown" ? "?" : "•";
              indicator.title = this._t(statusKey);
              indicator.setAttribute("role", "img");
              indicator.setAttribute("aria-label", this._t(statusKey));
              itemRow.appendChild(indicator);
            }
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
          <button id="apply" type="button" disabled>${this._t("apply")}</button>
        </div>
        </section>
        <section id="tab-migration" class="hvls-tab-panel" role="tabpanel" hidden>
          <h2>${this._t("tabMigration")}</h2>
          <p id="migrationIntro" class="diagnostic-note">${this._t("migrationIntro")}</p>
          <button id="migrationAnalyze" type="button" class="secondary">
            ${this._t("migrationAnalyze")}
          </button>
          <div class="migration-controls">
            <button id="migrationPrepareBaseline" type="button" class="secondary">
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

          <p id="migrationStatus" role="status">${this._t("migrationEmpty")}</p>
          <div id="migrationSummary" class="migration-review-note"></div>
          <div id="migrationRows" class="migration-scroll"></div>
          <button id="migrationMore" type="button" class="secondary" hidden>
            ${this._t("migrationMore")}
          </button>
        </section>
        <section id="tab-backups" class="hvls-tab-panel" role="tabpanel" hidden>
          <h2>${this._t("tabBackups")}</h2>
          <p id="backupIntro" class="diagnostic-note">${this._t("backupIntro")}</p>
          <p id="backupStatus" role="status"></p>
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
    this.querySelector("#restoreBackup").addEventListener("click", () => this._restoreBackup());
    this.querySelector("#migrationAnalyze").addEventListener("click", () => this._loadMigrationReview());
    this.querySelector("#migrationPrepareBaseline").addEventListener("click", () => this._prepareMigrationBaseline());
    this.querySelector("#migrationConfirmBaseline").addEventListener("click", () => this._confirmMigrationBaseline());
    this.querySelector("#migrationRestoreDraft").addEventListener("click", () => this._restoreMigrationDecisionDraft());
    this.querySelector("#migrationSaveDraft").addEventListener("click", () => this._saveMigrationDecisionDraft());
    this.querySelector("#migrationReadAttestation").addEventListener("click", () => this._readMigrationAttestation());
    this.querySelector("#migrationAttestReview").addEventListener("click", () => this._attestMigrationReview());
    this.querySelector("#migrationRecoveryRefresh").addEventListener("click", () => this._loadMigrationRecovery());
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
      // Statistics may have loaded before the registry catalog.
      // Render removal controls only from the current HA label state.
      if (this._lastAnalysis) this._renderAnalysis(this._lastAnalysis);
      return true;
    } catch (error) {
      this._entityCatalog = null;
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
    const data = this._backupReview;
    if (!data || !data.comparison || data.comparison.status !== "ok") return;
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
    const restore = this.querySelector("#restoreBackup");
    if (restore) restore.disabled = comparison.identical_text || this._restoring ||
      this._applying || this._refreshing || this._generating || this._entityWritePending;
    if (comparison.identical_text) {
      const text = document.createElement("p");
      text.textContent = this._t("backupNoDiff");
      container.appendChild(text);
    }
  }

  async _restoreBackup() {
    const data = this._backupReview;
    if (!data || this._restoring || this._applying ||
        this._refreshing || this._generating || this._entityWritePending ||
        data.comparison?.identical_text) return;
    if (!window.confirm(this._t("backupConfirm"))) return;
    this._restoring = true;
    this._backupReviewNumber = (this._backupReviewNumber || 0) + 1;
    this._backupReview = null;
    this._review = null; // An earlier Preview is never approved after a restore.
    this._updateApplyButton();
    const status = this.querySelector("#backupStatus");
    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/restore_backup",
        backup_id: data.backup_id,
        backup_sha256: data.backup_sha256,
        production_sha256: data.production_sha256,
      });
      this._restoreResult = result.safety_backup;
      await this._loadPreview(true);
      this._backupList = null;
      this._selectedBackup = null;
    } catch (error) {
      this._restoreError = error.message || String(error);
    } finally {
      this._restoring = false;
      this._updateApplyButton();
      await this._loadBackups();
      if (this._restoreResult && status) {
        status.textContent = this._tf("backupRestored", {backup: this._restoreResult})
          + " " + this._t("backupRestartHint");
        this._restoreResult = null;
      } else if (this._restoreError && status) {
        status.textContent = this._tf("backupRestoreFailed", {error: this._restoreError});
        this._restoreError = null;
      }
    }
  }

  _migrationBaselineControls() {
    const prepare = this.querySelector("#migrationPrepareBaseline");
    const confirm = this.querySelector("#migrationConfirmBaseline");
    if (prepare) prepare.disabled = this._baselineBusy === true;
    if (confirm) {
      confirm.hidden = !this._baselineChallenge;
      confirm.disabled = this._baselineBusy === true || !this._baselineChallenge;
    }
  }

  async _prepareMigrationBaseline() {
    if (!this._hass || this._baselineBusy) return;
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
    const scenarioRows = new Map((scenarios?.operations || []).map(
      item => [item.entity_id, item]
    ));
    if (scenarios?.read_only === true &&
        scenarios?.automatic_recovery_allowed === false &&
        scenarios?.journal_ack_allowed === false &&
        scenarios?.retry_allowed === false &&
        scenarios?.rollback_allowed === false &&
        scenarios?.cutover_allowed === false) {
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
      container.append(line);
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
