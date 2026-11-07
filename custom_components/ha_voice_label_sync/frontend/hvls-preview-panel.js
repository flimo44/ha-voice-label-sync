class HVLSPreviewPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._render();
      this._loadPreview();
      this._loadEntities();
    }
  }

  set panel(panel) {
    this._panel = panel;
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      this._render();
    }
  }

  async _loadPreview(afterApply = false) {
    if (!this._hass || (this._applying && !afterApply)) return;
    const loadId = (this._loadId || 0) + 1;
    this._loadId = loadId;
    this._review = null;
    this._updateApplyButton();
    this._setStatus("Chargement du Preview…");
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
        this._setStatus(result.error || "Aucun Preview disponible. Lancez Preview d'abord.");
      } else if (result.error) {
        this._setStatus(result.error);
      } else {
        this._setStatus(`Preview : ${result.path} — Production : ${result.production_path}`);
      }
    } catch (error) {
      if (loadId !== this._loadId || (this._applying && !afterApply)) return;
      this._review = null;
      this._updateApplyButton();
      this._setStatus(`Impossible de charger le Preview : ${error.message}`);
      this._setContent("");
      this._renderAnalysis({available: false});
    }
  }

  _updateApplyButton() {
    const button = this.querySelector("#apply");
    if (button) {
      button.disabled = !this._review || this._applying === true || this._generating === true;
    }
    const refresh = this.querySelector("#refresh");
    if (refresh) refresh.disabled =
      this._applying === true || this._generating === true;
    const generate = this.querySelector("#generate");
    if (generate) generate.disabled =
      this._applying === true || this._generating === true;
  }

  async _generatePreview() {
    if (!this._hass || this._generating || this._applying) return;

    this._generating = true;
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    this._setStatus("Génération du Preview en cours…");

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/generate_preview",
      });
      await this._loadPreview();
      this._setStatus(
        `Preview généré : ${result.entity_count} entités. ` +
        "Vérifiez les différences avant application."
      );
    } catch (error) {
      this._review = null;
      this._setStatus(
        `Échec de génération du Preview : ${error.message || String(error)}`
      );
    } finally {
      this._generating = false;
      this._updateApplyButton();
    }
  }

  async _applyPreview() {
    if (!this._hass || !this._review || this._applying) return;

    const review = {...this._review};

    if (!window.confirm(
      "Appliquer ce Preview à la configuration Google Assistant ?\\n\\n" +
      "Le fichier actuel sera sauvegardé si les sauvegardes sont activées. " +
      "Toute modification détectée depuis l'examen entraînera un refus."
    )) return;

    this._applying = true;
    this._loadId = (this._loadId || 0) + 1;
    this._review = null;
    this._updateApplyButton();
    this._setStatus("Vérification et application du Preview…");

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/apply_preview",
        ...review,
      });
      // Keep Apply locked throughout the post-apply refresh.
      await this._loadPreview(true);
      this._setStatus(
        `Preview appliqué : ${result.output_path} — ` +
        `${result.bytes_written} octets écrits` +
        (result.backup_path ? ` — Sauvegarde : ${result.backup_path}` : "")
      );
    } catch (error) {
      this._setStatus(
        `Application refusée : ${error.message || String(error)}. ` +
        "Actualisez le Preview avant de réessayer."
      );
    } finally {
      this._applying = false;
      this._updateApplyButton();
    }
  }

  async _copyPreview() {
    if (!this._previewContent) {
      this._setStatus("Aucun YAML à copier.");
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
        if (!copied) throw new Error("Browser copy command failed");
      }
      this._setStatus(`YAML copié — ${this._previewPath}`);
    } catch (error) {
      this._setStatus(`Impossible de copier : ${error.message}`);
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
          `${field}: ${values.before === null ? "(absent)" : values.before} → ${values.after === null ? "(absent)" : values.after}`
        );
        li.textContent = `${item.entity_id}\n  ${lines.join("\n  ")}`;
        li.style.whiteSpace = "pre-wrap";
      }
      list.appendChild(li);
    }
    section.appendChild(list);
    parent.appendChild(section);
  }

  _renderExclusions(parent, exclusions) {
    if (!exclusions || !Array.isArray(exclusions.entities)) return;

    const entities = exclusions.entities;
    const section = document.createElement("section");
    section.className = "change-group";

    const heading = document.createElement("h2");
    heading.textContent = `Entités exclues (${entities.length})`;
    section.appendChild(heading);

    const explanation = document.createElement("p");
    explanation.textContent =
      "Entités portant l'étiquette HVLS mais non retenues par les règles actuelles.";
    section.appendChild(explanation);

    if (entities.length === 0) {
      const success = document.createElement("p");
      success.textContent = "Aucune entité étiquetée exclue.";
      section.appendChild(success);
    } else {
      const reasons = {
        domain_not_enabled: "Domaine non autorisé",
        unsupported_device_class: "Classe de capteur non compatible",
        disabled: "Entité désactivée",
        hidden: "Entité masquée",
        entity_category: "Entité de configuration ou de diagnostic",
      };

      const list = document.createElement("ul");

      for (const entity of entities) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = entity.name || entity.entity_id;

        const identifier = document.createElement("div");
        identifier.textContent = entity.entity_id;

        const reason = document.createElement("div");
        reason.textContent =
          reasons[entity.reason] || entity.detail || "Motif inconnu";

        item.append(title, identifier, reason);
        list.appendChild(item);
      }

      section.appendChild(list);
    }

    const note = document.createElement("p");
    note.className = "diagnostic-note";
    note.textContent =
      "Diagnostic calculé sur les registres actuels. " +
      "Le YAML affiché provient du dernier Preview généré.";
    section.appendChild(note);

    parent.appendChild(section);
  }

  _renderAnalysis(result) {
    const panel = this.querySelector("#analysis");
    panel.replaceChildren();
    this.querySelector("#exclusions").replaceChildren();
    this.querySelector("#unifiedDiff").textContent = "";
    this.querySelector("#rawDiffDetails").hidden = true;
    if (!result.available || !result.summary) return;

    const stats = result.summary;
    const metrics = document.createElement("div");
    metrics.className = "metrics";
    this._addMetric(metrics, "Entités", stats.total);
    this._addMetric(metrics, "Pièces", stats.rooms);
    this._addMetric(metrics, "Sans pièce", stats.without_room);
    panel.appendChild(metrics);

    const breakdown = document.createElement("div");
    breakdown.className = "breakdowns";
    for (const [title, values] of [["Par domaine", stats.domains], ["Par pièce", stats.by_room]]) {
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
        if (title === "Par domaine") {
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

            const friendlyName = document.createElement("strong");
            friendlyName.textContent = entity.name || entity.entity_id;

            const info = document.createElement("small");
            info.textContent =
              `${entity.entity_id} · ${entity.room || "Sans pièce"}`;

            item.append(friendlyName, info);
            list.appendChild(item);
          }

          details.appendChild(list);
          section.appendChild(details);
        } else {
          row.append(label, total);
          section.appendChild(row);
        }
      }
      if (title === "Par domaine") {
        const excluded = result.exclusions?.entities || [];
        const unsupported = {};

        for (const entity of excluded) {
          if (entity.reason !== "domain_not_enabled") continue;
          if (!entity.domain) continue;

          unsupported[entity.domain] =
            (unsupported[entity.domain] || 0) + 1;
        }

        const subtitle = document.createElement("h3");
        subtitle.textContent = "Domaines non activés";
        subtitle.style.marginTop = "20px";
        section.appendChild(subtitle);

        const entries = Object.entries(unsupported)
          .sort(([a], [b]) => a.localeCompare(b));

        if (entries.length === 0) {
          const empty = document.createElement("p");
          empty.className = "diagnostic-note";
          empty.textContent = "Aucun domaine non activé détecté.";
          section.appendChild(empty);
        }

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
        note.textContent =
          "Entités étiquetées HVLS uniquement.";
        section.appendChild(note);
      }

      breakdown.appendChild(section);
    }
    panel.appendChild(breakdown);

    this._renderExclusions(this.querySelector("#exclusions"), result.exclusions);

    const comparison = result.comparison || {status: "missing"};
    const heading = document.createElement("h2");
    heading.textContent = "Diff Preview / Production";
    panel.appendChild(heading);
    if (comparison.status !== "ok") {
      const warning = document.createElement("p");
      warning.textContent = comparison.status === "missing"
        ? "Comparaison impossible : fichier de production absent."
        : `Comparaison impossible (${comparison.status}) : ${comparison.reason || "fichier illisible"}`;
      panel.appendChild(warning);
      return;
    }
    const counters = document.createElement("div");
    counters.className = "metrics";
    this._addMetric(counters, "Ajoutées", comparison.added.length);
    this._addMetric(counters, "Supprimées", comparison.removed.length);
    this._addMetric(counters, "Modifiées", comparison.modified.length);
    this._addMetric(counters, "Inchangées", comparison.unchanged);
    panel.appendChild(counters);

    if (comparison.identical_entities) {
      const ok = document.createElement("p");
      ok.textContent = comparison.identical_text
        ? "✓ Aucune différence : YAML identique à la production."
        : "✓ Même configuration par entité (différences de présentation YAML uniquement).";
      panel.appendChild(ok);
    }
    this._addGroup(panel, "Entités ajoutées", comparison.added);
    this._addGroup(panel, "Entités supprimées", comparison.removed);
    this._addGroup(panel, "Entités modifiées", comparison.modified);

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
        h2 { font-size:20px; margin-top:24px; }
        h3 { font-size:16px; margin:12px 0; }
        .actions { display:flex; gap:8px; }
        button { border:0; border-radius:10px; padding:10px 16px; cursor:pointer; background:var(--primary-color); color:var(--text-primary-color); font:inherit; }
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
        .hvls-tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
          font-weight: 600;
        }
        .hvls-tab-panel[hidden] { display: none !important; }
        #entityManager { margin-top: 0; }

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

        .entity-domain-more {
          margin: 12px 0 4px;
          font-size: 12px;
        }

        .change-group { margin:12px 0; }
        .change-group li { overflow-wrap:anywhere; padding:4px 0; }
        .diagnostic-note { color:var(--secondary-text-color); font-size:13px; }
        pre { margin:0; padding:20px; max-height:700px; overflow:auto; border-radius:12px; background:var(--card-background-color); color:var(--primary-text-color); box-shadow:var(--ha-card-box-shadow,none); font-family:var(--code-font-family,monospace); font-size:14px; line-height:1.5; white-space:pre; }
        details { margin:16px 0; }
        summary { cursor:pointer; padding:8px 0; }
      </style>
      <div class="container">
        <div class="header">
          <h1>HA Voice Label Sync</h1>
          <div class="actions">
            <button id="generate">Générer le Preview</button>
            <button id="refresh" class="secondary">Actualiser</button>
            <button id="copy" class="secondary">Copier YAML</button>
            <button id="apply" disabled>Appliquer le Preview</button>
            <button id="settings" class="secondary">⚙ Paramètres</button>
          </div>
        </div>
        <div id="status">En attente de Home Assistant…</div>
        <nav class="hvls-tabs" aria-label="Sections HVLS" role="tablist">
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
            </select>
          </div>
          <div id="entityList"></div>
          <button id="entityMore" class="secondary" hidden>
            Afficher 100 entités supplémentaires
          </button>
        </section>
        <section id="tab-preview" class="hvls-tab-panel"
          role="tabpanel" hidden>
        <details id="rawDiffDetails" hidden>
          <summary>Diff YAML détaillé</summary>
          <pre id="unifiedDiff"></pre>
        </details>
        <details>
          <summary>Afficher le YAML du Preview</summary>
          <pre id="content"></pre>
        </details>
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
    this.querySelector("#generate").addEventListener("click", () => this._generatePreview());
    this.querySelector("#refresh").addEventListener("click", () => this._loadPreview());
    this.querySelector("#copy").addEventListener("click", () => this._copyPreview());
    this.querySelector("#apply").addEventListener("click", () => this._applyPreview());
    this.querySelector("#settings").addEventListener("click", () => {
      window.location.assign("/config/integrations/integration/ha_voice_label_sync");
    });
  }


  async _loadEntities() {
    if (!this._hass || this._entityLoading) return;

    this._entityLoading = true;
    const refresh = this.querySelector("#refreshEntities");
    const status = this.querySelector("#entityStatus");

    if (refresh) refresh.disabled = true;
    if (status) status.textContent = "Chargement des registres HA…";

    try {
      const catalog = await this._hass.callWS({
        type: "ha_voice_label_sync/get_entities",
      });

      this._entityCatalog = catalog;
      this._entityLimit = 100;
      this._renderEntities();
    } catch (error) {
      this._entityCatalog = null;
      this.querySelector("#entityList")?.replaceChildren();
      const more = this.querySelector("#entityMore");
      if (more) more.hidden = true;
      if (status) {
        status.textContent =
          `Impossible de charger les entités : ${error.message || String(error)}`;
      }
    } finally {
      this._entityLoading = false;
      if (refresh) refresh.disabled = false;
    }
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

    const reasons = {
      domain_not_enabled: "Domaine non autorisé",
      unsupported_device_class: "Classe de capteur non compatible",
      disabled: "Entité désactivée",
      hidden: "Entité masquée",
      entity_category: "Configuration ou diagnostic",
    };

    // Mémoriser les domaines ouverts.
    const openDomains = new Set(
      Array.from(
        list.querySelectorAll(".entity-catalog-domain[open]")
      ).map((details) => details.dataset.domain)
    );

    // Recherche sur l'ensemble du catalogue HA.
    const matching = (catalog.entities || []).filter((entity) => {
      if (filter === "yes" && !entity.has_label) return false;
      if (filter === "no" && entity.has_label) return false;

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
      count.textContent = `${entities.length} entités`;

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

          const name = document.createElement("strong");
          name.textContent = entity.name || entity.entity_id;

          const description = document.createElement("small");
          description.textContent =
            `${entity.entity_id} · ${entity.room || "Sans pièce"}`;

          info.append(name, description);

          const label = document.createElement("span");
          label.className = "entity-catalog-label";

          if (entity.has_label && entity.eligible === true) {
            label.classList.add("eligible");
            label.textContent = "✓ HVLS";
          } else if (entity.has_label && entity.eligible === false) {
            label.classList.add("ineligible");
            label.textContent = "✕ HVLS";
          } else if (entity.has_label) {
            label.textContent = "HVLS · statut inconnu";
          } else {
            label.textContent = "— Sans HVLS";
          }

          if (entity.eligible === false) {
            const reason = document.createElement("small");
            reason.textContent =
              reasons[entity.exclusion_reason] || "Non éligible";
            info.appendChild(reason);
          }

          row.append(info, label);
          rows.appendChild(row);
        }

        group.replaceChildren(rows);

        if (visible.length < entities.length) {
          const more = document.createElement("button");
          more.className = "secondary entity-domain-more";
          more.type = "button";
          more.textContent =
            `Afficher 100 de plus (${visible.length}/${entities.length})`;

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
      `✓ Domaines pris en charge par HVLS ` +
      `(${supportedDomainCount} domaines · ${supportedCount} entités)`;

    unsupportedHeading.textContent =
      `Domaines non pris en charge ` +
      `(${unsupportedDomainCount} domaines · ${unsupportedCount} entités)`;

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
      empty.textContent = "Aucune entité correspondant aux filtres.";
      fragment.appendChild(empty);
    }

    list.replaceChildren(fragment);

    status.textContent =
      `${matching.length} entités correspondant aux filtres · ` +
      `${catalog.labeled} étiquetées sur ${catalog.total} · ` +
      `Étiquette : ${catalog.label}`;

    if (catalog.warnings?.length) {
      status.textContent +=
        ` · Attention : ${catalog.warnings.join("; ")}`;
    }
  }

  _activateTab(tab) {
    const panels = {
      summary: "#tab-summary",
      exclusions: "#tab-exclusions",
      entities: "#entityManager",
      preview: "#tab-preview",
    };

    if (!Object.hasOwn(panels, tab)) return;

    for (const [name, selector] of Object.entries(panels)) {
      this.querySelector(selector).hidden = name !== tab;
    }

    this.querySelectorAll(".hvls-tab").forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  _setStatus(message) {
    const status = this.querySelector("#status");
    if (status) status.textContent = message;
  }

  _setContent(content) {
    const preview = this.querySelector("#content");
    if (preview) preview.textContent = content;
  }
}

customElements.define("hvls-preview-panel", HVLSPreviewPanel);
