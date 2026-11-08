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

        const name = document.createElement("strong");
        name.textContent = names.get(entityId) || entityId;
        row.appendChild(name);
        if (names.get(entityId) && names.get(entityId) !== entityId) {
          const id = document.createElement("small");
          id.textContent = entityId;
          row.appendChild(id);
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
      for (const [name, count] of Object.entries(values || {})) {
        const row = document.createElement("div");
        row.className = "breakdown-row";
        const label = document.createElement("span");
        label.textContent = name;
        const total = document.createElement("strong");
        total.textContent = String(count);
        row.append(label, total);
        if (type === "domain") {
          const details = document.createElement("details");
          details.className = "domain-details";

          const summary = document.createElement("summary");
          summary.className = "breakdown-row";
          summary.append(label, total);
          details.appendChild(summary);

          const entities = (stats.entities || []).filter(
            (entity) => entity.domain === name
          );

          const list = document.createElement("div");
          list.className = "domain-entity-list";

          for (const entity of entities) {
            const item = document.createElement("div");
            item.className = "domain-entity-item";

            // Reuse the native HA More Info event; do not navigate away from
            // the Statistics tab or change the entity's HVLS label.
            const entityButton = document.createElement("button");
            entityButton.type = "button";
            entityButton.className = "entity-more-info";
            entityButton.setAttribute("aria-label", this._tf("entityMoreInfo", {
              entity: entity.name || entity.entity_id
            }));

            const friendlyName = document.createElement("strong");
            friendlyName.textContent = entity.name || entity.entity_id;

            const info = document.createElement("small");
            info.textContent =
              `${entity.entity_id} · ${entity.room || this._t("noArea")}`;

            entityButton.append(friendlyName, info);
            entityButton.addEventListener("click", () => {
              this._openEntityDetails(entity.entity_id);
            });
            item.appendChild(entityButton);
            list.appendChild(item);
          }

          details.appendChild(list);
          section.appendChild(details);
        } else {
          row.append(label, total);
          section.appendChild(row);
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

  _activateTab(tab) {
    const panels = {
      summary: "#tab-summary",
      exclusions: "#tab-exclusions",
      entities: "#entityManager",
      preview: "#tab-preview",
      backups: "#tab-backups",
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
    if (tab === "backups" && !this._backupList && !this._backupLoading) this._loadBackups();
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
