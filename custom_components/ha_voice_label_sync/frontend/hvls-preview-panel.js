class HVLSPreviewPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._render();
      this._loadPreview();
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
      button.disabled = !this._review || this._applying === true;
    }
    const refresh = this.querySelector("#refresh");
    if (refresh) refresh.disabled = this._applying === true;
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
        section.appendChild(row);
      }
      breakdown.appendChild(section);
    }
    panel.appendChild(breakdown);

    this._renderExclusions(panel, result.exclusions);

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
        button:disabled { opacity:0.45; cursor:not-allowed; }
        #status { margin-bottom:16px; color:var(--secondary-text-color); overflow-wrap:anywhere; }
        .metrics { display:flex; flex-wrap:wrap; gap:12px; margin:16px 0; }
        .metric { min-width:110px; flex:1; display:flex; flex-direction:column; gap:6px; background:var(--card-background-color); border:1px solid var(--divider-color); border-radius:12px; padding:16px; }
        .metric strong { font-size:26px; }
        .metric span { color:var(--secondary-text-color); font-size:13px; }
        .breakdowns { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
        .breakdowns section { padding:12px 16px; background:var(--card-background-color); border-radius:12px; }
        .breakdown-row { display:flex; justify-content:space-between; gap:12px; padding:5px 0; border-bottom:1px solid var(--divider-color); }
        .change-group { margin:12px 0; }
        .change-group li { overflow-wrap:anywhere; padding:4px 0; }
        .diagnostic-note { color:var(--secondary-text-color); font-size:13px; }
        pre { margin:0; padding:20px; max-height:700px; overflow:auto; border-radius:12px; background:var(--card-background-color); color:var(--primary-text-color); box-shadow:var(--ha-card-box-shadow,none); font-family:var(--code-font-family,monospace); font-size:14px; line-height:1.5; white-space:pre; }
        details { margin:16px 0; }
        summary { cursor:pointer; padding:8px 0; }
      </style>
      <div class="container">
        <div class="header">
          <h1>HA Voice Label Sync — Preview</h1>
          <div class="actions">
            <button id="refresh">Actualiser</button>
            <button id="copy" class="secondary">Copier YAML</button>
            <button id="apply" disabled>Appliquer le Preview</button>
          </div>
        </div>
        <div id="status">En attente de Home Assistant…</div>
        <div id="analysis"></div>
        <details id="rawDiffDetails" hidden>
          <summary>Diff YAML détaillé</summary>
          <pre id="unifiedDiff"></pre>
        </details>
        <details>
          <summary>Afficher le YAML du Preview</summary>
          <pre id="content"></pre>
        </details>
      </div>
    `;
    this.querySelector("#refresh").addEventListener("click", () => this._loadPreview());
    this.querySelector("#copy").addEventListener("click", () => this._copyPreview());
    this.querySelector("#apply").addEventListener("click", () => this._applyPreview());
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
