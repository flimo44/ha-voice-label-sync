const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(
    "custom_components/ha_voice_label_sync/frontend/hvls-preview-panel.js"
  ),
  "utf8"
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makePanel(callWS, confirm = () => true) {
  let Panel;

  const context = vm.createContext({
    HTMLElement: class {},
    customElements: {
      define(name, component) {
        assert.equal(name, "hvls-preview-panel");
        Panel = component;
      },
    },
    window: { confirm, alert: () => {} },
    document: {
      createElement(tag) {
        return {
          tag, children: [], textContent: "", className: "",
          appendChild(child) { this.children.push(child); },
          append(...children) { this.children.push(...children); },
          replaceChildren(...children) { this.children = children; },
        };
      },
    },
    CustomEvent: class {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
        this.bubbles = options.bubbles;
        this.composed = options.composed;
      }
    },
    Event: class {
      constructor(type, options = {}) {
        this.type = type;
        this.bubbles = options.bubbles;
        this.composed = options.composed;
      }
    },
    console,
  });

  vm.runInContext(source, context);

  const panel = new Panel();
  // Test messages against the French UI locale expected by these assertions.
  panel._language = "fr";
  const controls = {
    apply: { disabled: true },
    refresh: { disabled: false },
    generate: { disabled: false },
  };

  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._hass = { callWS };

  // These methods are unrelated to the interactions under test.
  panel._setStatus = message => { panel.status = message; };
  panel._setContent = content => { panel.content = content; };
  panel._renderAnalysis = () => {};

  return { panel, controls };
}

function preview(canApply = true) {
  return {
    available: true,
    path: "/config/.hvls/preview.yaml",
    production_path: "/config/google_assistant_entities.yaml",
    content: "switch.test:\n  expose: true\n",
    can_apply: canApply,
    preview_sha256: "a".repeat(64),
    production_sha256: null,
  };
}

test("Apply disabled without an approved Preview", async () => {
  const { panel, controls } = makePanel(async () => preview(false));

  await panel._loadPreview();

  assert.equal(controls.apply.disabled, true);
});

test("Cancelled confirmation sends no apply command", async () => {
  const calls = [];
  const { panel } = makePanel(
    async message => {
      calls.push(message.type);
      return preview();
    },
    () => false
  );

  await panel._loadPreview();
  await panel._applyPreview();

  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
});

test("Successful apply refreshes Preview", async () => {
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);

    if (message.type === "ha_voice_label_sync/apply_preview") {
      assert.equal(message.preview_sha256, "a".repeat(64));
      assert.equal(message.production_sha256, null);
      return {
        applied: true,
        output_path: "/config/google_assistant_entities.yaml",
        bytes_written: 42,
        backup_path: null,
      };
    }

    // After applying, production and Preview are now identical.
    return preview(calls.length === 1);
  });

  await panel._loadPreview();
  assert.equal(controls.apply.disabled, false);

  await panel._applyPreview();

  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/apply_preview",
    "ha_voice_label_sync/get_preview",
  ]);

  assert.equal(controls.apply.disabled, true);
  assert.equal(controls.refresh.disabled, false);
  assert.match(panel.status, /Preview appliqué/);
});

test("Stale Preview response cannot replace a newer one", async () => {
  const first = deferred();
  let count = 0;

  const { panel, controls } = makePanel(async () => {
    count++;
    if (count === 1) return first.promise;
    return preview(false);
  });

  const oldLoad = panel._loadPreview();
  await panel._loadPreview();

  first.resolve(preview(true));
  await oldLoad;

  assert.equal(controls.apply.disabled, true);
  assert.equal(panel._review, null);
});

test("Failed apply requires a fresh Preview review", async () => {
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);
    if (message.type === "ha_voice_label_sync/apply_preview") {
      throw new Error("Production changed");
    }
    return preview(true);
  });

  await panel._loadPreview();
  await panel._applyPreview();

  assert.equal(controls.apply.disabled, true);
  assert.match(panel.status, /Application refusée/);
  assert.equal(calls.length, 2);
});

test("Generate Preview regenerates YAML and refreshes panel", async () => {
  const calls = [];

  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);

    if (message.type === "ha_voice_label_sync/generate_preview") {
      assert.equal(controls.apply.disabled, true);
      assert.equal(controls.refresh.disabled, true);
      return { generated: true, entity_count: 32 };
    }

    return preview(true);
  });

  await panel._loadPreview();
  assert.equal(controls.apply.disabled, false);

  await panel._generatePreview();

  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/generate_preview",
    "ha_voice_label_sync/get_preview",
  ]);

  assert.equal(controls.apply.disabled, false);
  assert.equal(controls.refresh.disabled, false);
  assert.match(panel.status, /32 entités/);
});

test("Generate Preview prevents applying stale review", async () => {
  const pending = deferred();
  const calls = [];

  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);

    if (message.type === "ha_voice_label_sync/generate_preview") {
      return pending.promise;
    }

    return preview(true);
  });

  await panel._loadPreview();

  const generation = panel._generatePreview();

  assert.equal(controls.apply.disabled, true);
  assert.equal(controls.refresh.disabled, true);

  // An attempted application during generation must do nothing.
  await panel._applyPreview();

  assert.equal(
    calls.includes("ha_voice_label_sync/apply_preview"),
    false
  );

  pending.resolve({ generated: true, entity_count: 32 });
  await generation;

  assert.equal(controls.refresh.disabled, false);
});

test("Failed generation invalidates previously approved Preview", async () => {
  const calls = [];

  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);

    if (message.type === "ha_voice_label_sync/generate_preview") {
      throw new Error("Generation failed");
    }

    return preview(true);
  });

  await panel._loadPreview();
  assert.equal(controls.apply.disabled, false);

  await panel._generatePreview();

  assert.equal(controls.apply.disabled, true);
  assert.match(panel.status, /Échec de génération/);
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/generate_preview",
  ]);
});


test("Ineligible unlabelled entity cannot be added from the panel", async () => {
  const calls = [];
  const { panel } = makePanel(async message => {
    calls.push(message);
    return {};
  });
  const checkbox = { checked: true };
  await panel._setEntityLabel(
    { entity_id: "sensor.blocked", has_label: false, eligible: false },
    checkbox
  );
  assert.equal(checkbox.checked, false);
  assert.equal(calls.length, 0);
});

test("Ineligible previously labelled entity can be cleaned up", async () => {
  const calls = [];
  const { panel } = makePanel(async message => {
    calls.push(message);
    return { entity_id: message.entity_id, has_label: false };
  });
  const checkbox = { checked: false, disabled: false, dataset: { ineligible: "false" } };
  panel.querySelectorAll = () => [checkbox];
  panel._loadEntities = async () => true;
  panel._generatePreview = async () => {};
  await panel._setEntityLabel(
    { entity_id: "sensor.legacy", name: "Legacy", has_label: true, eligible: false },
    checkbox
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].enabled, false);
  assert.equal(calls[0].expected_enabled, true);
  assert.equal(checkbox.disabled, false);
});

test("Mobile menu follows the native Home Assistant narrow property", () => {
  const { panel } = makePanel(async () => preview());
  const menu = { hidden: true };
  panel.querySelector = selector => selector === "#menuToggle" ? menu : null;

  panel.narrow = true;
  assert.equal(menu.hidden, false);

  panel.narrow = false;
  assert.equal(menu.hidden, true);

  panel._hass.dockedSidebar = "always_hidden";
  panel._syncMenuVisibility();
  assert.equal(menu.hidden, false);
});

test("Mobile menu dispatches Home Assistant sidebar toggle event", () => {
  const { panel } = makePanel(async () => preview());
  let dispatched;
  panel.dispatchEvent = event => { dispatched = event; };

  panel._toggleMenu();

  assert.equal(dispatched.type, "hass-toggle-menu");
  assert.equal(dispatched.bubbles, true);
  assert.equal(dispatched.composed, true);
});

test("Mobile menu is rendered with an accessible label", () => {
  assert.match(source, /id="menuToggle"[^>]*aria-label=/);
  assert.match(source, /class="menu-toggle"[^>]*type="button"/);
});

test("Global refresh reloads entities, regenerates Preview and does not apply", async () => {
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);
    if (message.type === "ha_voice_label_sync/get_entities") return {};
    if (message.type === "ha_voice_label_sync/generate_preview") {
      assert.equal(controls.apply.disabled, true);
      return { generated: true, entity_count: 12 };
    }
    return preview(true);
  });
  panel._loadEntities = async () => {
    calls.push("ha_voice_label_sync/get_entities");
    return true;
  };

  await panel._loadPreview();
  await panel._refreshAll();

  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/get_entities",
    "ha_voice_label_sync/generate_preview",
    "ha_voice_label_sync/get_preview",
  ]);
  assert.equal(controls.apply.disabled, false);
  assert.equal(controls.refresh.disabled, false);
  assert.equal(calls.includes("ha_voice_label_sync/apply_preview"), false);
});

test("Global refresh blocks overlapping refresh and Apply", async () => {
  const pending = deferred();
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);
    return preview(true);
  });
  await panel._loadPreview();
  panel._loadEntities = () => pending.promise;

  const task = panel._refreshAll();
  assert.equal(controls.refresh.disabled, true);
  assert.equal(controls.apply.disabled, true);
  await panel._refreshAll();
  await panel._applyPreview();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);

  pending.resolve(true);
  await task;
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/generate_preview",
    "ha_voice_label_sync/get_preview",
  ]);
});

test("Failed registry refresh refuses to reuse an old approved Preview", async () => {
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);
    return preview(true);
  });
  await panel._loadPreview();
  panel._loadEntities = async () => {
    panel._entityLoadError = "Registry failed";
    return false;
  };
  await panel._refreshAll();

  assert.equal(controls.apply.disabled, true);
  assert.equal(controls.refresh.disabled, false);
  assert.equal(panel._review, null);
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
  assert.match(panel.status, /Registry failed/);
});

test("Global refresh is an accessible compact icon action", () => {
  assert.match(source, /id="refresh" class="secondary icon-action" type="button"/);
  assert.match(source, /id="refresh"[^>]*aria-label=/);
  assert.match(source, /this\._refreshAll\(\)/);
});

test("Label change regenerates Preview after registry reload without production Apply", async () => {
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);
    if (message.type === "ha_voice_label_sync/set_entity_label") {
      assert.equal(controls.apply.disabled, true);
      return { entity_id: message.entity_id, has_label: message.enabled };
    }
    if (message.type === "ha_voice_label_sync/generate_preview")
      return { generated: true, entity_count: 41 };
    return preview(true);
  });
  const checkbox = { checked: true, disabled: false, dataset: { ineligible: "false" } };
  panel.querySelectorAll = () => [checkbox];
  panel._loadEntities = async () => { calls.push("reloaded_entities"); return true; };
  await panel._loadPreview();
  await panel._setEntityLabel(
    { entity_id: "light.salon", name: "Salon", has_label: false, eligible: true },
    checkbox
  );
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/set_entity_label",
    "reloaded_entities",
    "ha_voice_label_sync/generate_preview",
    "ha_voice_label_sync/get_preview",
  ]);
  assert.equal(calls.includes("ha_voice_label_sync/apply_preview"), false);
  assert.equal(controls.apply.disabled, false);
});

test("Failed label write invalidates previous Preview approval", async () => {
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);
    if (message.type === "ha_voice_label_sync/set_entity_label")
      throw new Error("Write failed");
    return preview(true);
  });
  const checkbox = { checked: false, disabled: false, dataset: { ineligible: "false" } };
  panel.querySelectorAll = () => [checkbox];
  panel._loadEntities = async () => true;
  await panel._loadPreview();
  assert.equal(controls.apply.disabled, false);
  panel._generatePreview = () => { throw new Error("Must not regenerate"); };
  await panel._setEntityLabel(
    { entity_id: "light.salon", name: "Salon", has_label: false, eligible: true },
    checkbox
  );
  assert.equal(controls.apply.disabled, true);
  assert.equal(panel._review, null);
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/set_entity_label",
  ]);
});

test("Preview contains the Copy YAML and Apply actions, not the header", () => {
  const header = source.match(/<div class="header">([\s\S]*?)<div id="status">/)?.[1];
  const previewPanel = source.match(/<section id="tab-preview"([\s\S]*?)<\/section>/)?.[1];
  assert.ok(header);
  assert.ok(previewPanel);
  assert.doesNotMatch(header, /id="generate"|id="copy"|id="apply"/);
  assert.match(previewPanel, /id="copy"/);
  assert.match(previewPanel, /id="apply"/);
  assert.match(header, /id="refresh"/);
  assert.match(header, /id="settings"/);
});

test("Preview diff view groups changes before YAML and Apply", () => {
  const previewStart = source.indexOf('<section id="tab-preview"');
  const changes = source.indexOf('id="previewChanges"', previewStart);
  const yaml = source.indexOf('id="content"', previewStart);
  const apply = source.indexOf('id="apply"', previewStart);
  assert.ok(previewStart >= 0 && changes > previewStart);
  assert.ok(changes < yaml && yaml < apply);
  assert.match(source, /_renderPreviewChanges\(result\)/);
  assert.doesNotMatch(source, /this\._addGroup\(panel, this\._t\("entitiesAdded"\)/);
});

test("Preview diff uses backend comparison and explains removals", () => {
  assert.match(source, /comparison\.added/);
  assert.match(source, /comparison\.removed/);
  assert.match(source, /comparison\.modified/);
  assert.match(source, /removalNote:/);
  assert.match(source, /fieldBefore:/);
  assert.match(source, /fieldAfter:/);
});

test("Preview differences show an explicit state when production is absent", () => {
  assert.match(source, /comparison\.status === "missing"/);
  assert.match(source, /this\._t\("firstProduction"\)/);
  assert.match(source, /this\._t\("noChanges"\)/);
});

function flattenText(node) {
  return [node.textContent || "", ...(node.children || []).map(flattenText)].join(" | ");
}

test("Preview renders grouped entity changes and modified fields", () => {
  const { panel } = makePanel(async () => preview());
  const container = {
    children: [],
    appendChild(node) { this.children.push(node); },
    replaceChildren() { this.children = []; },
  };
  panel.querySelector = selector => selector === "#previewChanges" ? container : null;
  panel._renderPreviewChanges({
    available: true,
    summary: { entities: [
      { entity_id: "light.new", name: "Living room" },
      { entity_id: "switch.changed", name: "Garden" },
    ]},
    comparison: {
      status: "ok", added: ["light.new"], removed: ["light.old"],
      modified: [{
        entity_id: "switch.changed",
        fields: { name: { before: "Old", after: "Garden" } }
      }],
    },
  });
  const rendered = flattenText(container);
  assert.match(rendered, /Entités ajoutées \(1\)/);
  assert.match(rendered, /Entités supprimées \(1\)/);
  assert.match(rendered, /Entités modifiées \(1\)/);
  assert.match(rendered, /Living room/);
  assert.match(rendered, /light.old/);
  assert.match(rendered, /Avant: Old/);
  assert.match(rendered, /Après: Garden/);
  assert.match(rendered, /ne la supprime pas de Home Assistant/);
});

test("Preview clearly reports missing production and identical configurations", () => {
  const { panel } = makePanel(async () => preview());
  const container = {
    children: [],
    appendChild(node) { this.children.push(node); },
    replaceChildren() { this.children = []; },
  };
  panel.querySelector = selector => selector === "#previewChanges" ? container : null;
  panel._renderPreviewChanges({
    available: true,
    summary: {entities: []},
    comparison: {status: "missing"},
  });
  assert.match(flattenText(container), /Aucune configuration de production existante/);
  panel._renderPreviewChanges({
    available: true,
    summary: {entities: []},
    comparison: {
      status: "ok", added: [], removed: [], modified: [],
      identical_text: true,
    },
  });
  assert.match(flattenText(container), /Aucun changement d’entité/);
});

test("Preview YAML translation targets only the real YAML section", () => {
  assert.match(source, /id="previewYamlDetails"/);
  assert.match(source, /querySelector\("#previewYamlDetails > summary"\)/);
  assert.doesNotMatch(source, /#tab-preview details:not\(#rawDiffDetails\) summary/);
});

test("Eligible unlabelled filter is distinct from all unlabelled entities", () => {
  const { panel } = makePanel(async () => preview());
  const eligible = { eligible: true, has_label: false };
  const ineligible = { eligible: false, has_label: false };
  const labeled = { eligible: true, has_label: true };
  assert.equal(panel._entityMatchesFilter(eligible, "eligible_no"), true);
  assert.equal(panel._entityMatchesFilter(ineligible, "eligible_no"), false);
  assert.equal(panel._entityMatchesFilter(labeled, "eligible_no"), false);
  assert.equal(panel._entityMatchesFilter(ineligible, "no"), true);
  assert.equal(panel._entityMatchesFilter(ineligible, "ineligible"), true);
  assert.equal(panel._entityMatchesFilter(eligible, "ineligible"), false);
});

test("Exclusions tab hidden only when diagnostic count is confirmed zero", () => {
  const { panel } = makePanel(async () => preview());
  const button = {
    hidden: false, textContent: "", attributes: { "aria-selected": "false" },
    getAttribute(key) { return this.attributes[key]; },
  };
  const otherTabs = {
    summary: { hidden: false, textContent: "" },
    entities: { hidden: false, textContent: "" },
    preview: { hidden: false, textContent: "" },
  };
  panel.querySelector = selector => {
    const match = selector.match(/data-tab="([^"]+)"/);
    return match ? (match[1] === "exclusions" ? button : otherTabs[match[1]]) : null;
  };
  panel._syncExclusionsTab(null);
  assert.equal(button.hidden, false);
  panel._syncExclusionsTab({ entities: [{entity_id: "sensor.old"}] });
  assert.equal(button.hidden, false);
  assert.match(button.textContent, /Entités exclues \(1\)/);
  panel._syncExclusionsTab({ entities: [] });
  assert.equal(button.hidden, true);
  assert.equal(otherTabs.entities.textContent, "2 · Gestion des entités HVLS");
  panel._syncExclusionsTab({status: "error"});
  assert.equal(button.hidden, true);
});

test("Removing the final exclusion navigates to entity manager", () => {
  const { panel } = makePanel(async () => preview());
  const button = {
    hidden: false, textContent: "",
    getAttribute: key => key === "aria-selected" ? "true" : null,
  };
  const tabs = {
    summary: { hidden: false, textContent: "" },
    entities: { hidden: false, textContent: "" },
    preview: { hidden: false, textContent: "" },
  };
  panel.querySelector = selector => {
    const match = selector.match(/data-tab="([^"]+)"/);
    return match ? (match[1] === "exclusions" ? button : tabs[match[1]]) : null;
  };
  let switched = null;
  panel._activateTab = tab => { switched = tab; };
  panel._syncExclusionsTab({entities: []});
  assert.equal(switched, "entities");
  assert.equal(button.hidden, true);
});

test("Entity filter options and exclusions tab count are translated", () => {
  assert.match(source, /option value="eligible_no"/);
  assert.match(source, /option value="ineligible"/);
  assert.match(source, /this\._updateTabLabels\(\)/);
  assert.match(source, /this\._syncExclusionsTab\(result\.exclusions\)/);
});

test("Hidden exclusions tab has an explicit CSS visibility rule", () => {
  assert.match(source, /\.hvls-tab\[hidden\] \{ display: none !important; \}/);
});

test("Clicking an entity opens the native Home Assistant More Info dialog", () => {
  const { panel } = makePanel(async () => preview());
  let event;
  panel.dispatchEvent = dispatched => { event = dispatched; };
  panel._openEntityDetails("switch.pompe_piscine");
  assert.equal(event.type, "hass-more-info");
  assert.equal(event.detail.entityId, "switch.pompe_piscine");
  assert.equal(event.bubbles, true);
  assert.equal(event.composed, true);
});

test("More Info ignores an empty entity ID", () => {
  const { panel } = makePanel(async () => preview());
  let count = 0;
  panel.dispatchEvent = () => { count++; };
  panel._openEntityDetails("");
  assert.equal(count, 0);
});

test("Entity details use their own keyboard-accessible button, not the HVLS checkbox", () => {
  assert.match(source, /entityButton\.type = "button"/);
  assert.match(source, /entityButton\.className = "entity-more-info"/);
  assert.match(source, /entityButton\.setAttribute\("aria-label"/);
  assert.match(source, /entityButton\.addEventListener\("click"/);
  assert.match(source, /this\._openEntityDetails\(entity\.entity_id\)/);
  assert.match(source, /checkbox\.addEventListener\("change"/);
  assert.match(source, /entityButton\.append\(name, description\)/);
});

test("Statistics domain entities open native HA details without changing HVLS labels", () => {
  const start = source.indexOf('const entities = (stats.entities || []).filter(');
  const end = source.indexOf('details.appendChild(list);', start);
  const block = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /entityButton\.type = "button"/);
  assert.match(block, /entityButton\.className = "entity-more-info"/);
  assert.match(block, /entityButton\.setAttribute\("aria-label"/);
  assert.match(block, /this\._openEntityDetails\(entity\.entity_id\)/);
  assert.match(block, /entityButton\.append\(friendlyName, info\)/);
  assert.doesNotMatch(block, /_setEntityLabel|set_entity_label/);
});

test("Eligibility explanations distinguish Home Assistant state from Google exposure", () => {
  const { panel } = makePanel(async () => preview());
  const actual = {
    disabled: /désactivée dans Home Assistant/,
    hidden: /masquée dans Home Assistant/,
    domain_not_enabled: /domaine n’est pas pris en charge/,
    unsupported_device_class: /classe de capteur n’est pas prise en charge/,
    entity_category: /configuration ou de diagnostic/,
  };
  for (const [reason, expected] of Object.entries(actual)) {
    const explanation = panel._eligibilityExplanation(reason);
    assert.match(explanation, expected);
    assert.match(explanation, /Exclue de la configuration Google Assistant générée par HVLS/);
    assert.match(explanation, /Elle reste dans Home Assistant/);
  }
});

test("Eligibility information can be expanded by keyboard or touch", () => {
  assert.match(source, /reason\.type = "button"/);
  assert.match(source, /reason\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(source, /reason\.addEventListener\("click"/);
  assert.match(source, /explanationText\.hidden = !explanationText\.hidden/);
  assert.match(source, /entity-eligibility-detail\[hidden\]/);
  assert.match(source, /this\._eligibilityExplanation\(entity\.exclusion_reason\)/);
});

test("FR and EN exclusion diagnostics share the same explanation helper", () => {
  const { panel } = makePanel(async () => preview());
  panel._language = "en";
  assert.match(panel._eligibilityExplanation("disabled"), /disabled in Home Assistant/);
  assert.match(panel._eligibilityExplanation("disabled"), /It remains in Home Assistant/);
  assert.match(source, /this\._eligibilityExplanation\(entity\.reason\)/);
});

test("Statistics shows excluded domains only when labeled entities actually have unsupported domains", () => {
  const start = source.indexOf('const excluded = result.exclusions?.entities || []');
  const end = source.indexOf('breakdown.appendChild(section);', start);
  const block = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /entity\.reason !== "domain_not_enabled"/);
  assert.match(block, /if \(entries\.length > 0\) \{/);
  assert.match(block, /subtitle\.textContent = this\._t\("disabledDomains"\)/);
  assert.doesNotMatch(block, /noDisabledDomains/);
  assert.match(source, /disabledDomains: "Domaines exclus de la sélection HVLS"/);
  assert.match(source, /disabledDomains: "Domains excluded from HVLS selection"/);
});
