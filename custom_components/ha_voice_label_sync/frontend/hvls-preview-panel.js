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

  async _loadPreview() {
    if (!this._hass) {
      return;
    }

    this._setStatus("Loading preview…");

    try {
      const result = await this._hass.callWS({
        type: "ha_voice_label_sync/get_preview",
      });

      this._previewPath = result.path;
      this._previewContent = result.content;

      if (!result.available) {
        this._setStatus(
          "No preview is available yet. Run Preview configuration first."
        );
        this._setContent("");
        return;
      }

      this._setStatus(`Preview file: ${result.path}`);
      this._setContent(result.content);
    } catch (error) {
      this._setStatus(`Unable to load preview: ${error.message}`);
      this._setContent("");
    }
  }

    async _copyPreview() {
    if (!this._previewContent) {
      this._setStatus("No preview content to copy.");
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

        if (!copied) {
          throw new Error("Browser copy command failed");
        }
      }

      this._setStatus(`YAML copied — ${this._previewPath}`);
    } catch (error) {
      this._setStatus(`Unable to copy preview: ${error.message}`);
    }
  }

  _render() {
    this.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 24px;
          box-sizing: border-box;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 500;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        button {
          border: 0;
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          background: var(--primary-color);
          color: var(--text-primary-color);
          font: inherit;
        }

        button.secondary {
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
        }

        #status {
          margin-bottom: 16px;
          color: var(--secondary-text-color);
          overflow-wrap: anywhere;
        }

        pre {
          margin: 0;
          padding: 20px;
          min-height: 320px;
          overflow: auto;
          border-radius: 12px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          box-shadow: var(--ha-card-box-shadow, none);
          font-family: var(--code-font-family, monospace);
          font-size: 14px;
          line-height: 1.5;
          white-space: pre;
        }
      </style>

      <div class="container">
        <div class="header">
          <h1>HA Voice Label Sync — Preview</h1>

          <div class="actions">
            <button id="refresh">Refresh</button>
            <button id="copy" class="secondary">Copy YAML</button>
          </div>
        </div>

        <div id="status">Waiting for Home Assistant…</div>
        <pre id="content"></pre>
      </div>
    `;

    this.querySelector("#refresh").addEventListener(
      "click",
      () => this._loadPreview()
    );

    this.querySelector("#copy").addEventListener(
      "click",
      () => this._copyPreview()
    );
  }

  _setStatus(message) {
    const status = this.querySelector("#status");

    if (status) {
      status.textContent = message;
    }
  }

  _setContent(content) {
    const preview = this.querySelector("#content");

    if (preview) {
      preview.textContent = content;
    }
  }
}

customElements.define("hvls-preview-panel", HVLSPreviewPanel);
