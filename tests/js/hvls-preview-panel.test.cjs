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
          setAttribute(name, value) { this[name] = value; },
          addEventListener(name, callback) { this["on_" + name] = callback; },
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
    ownership: {
      status: "new",
      write_allowed: true,
      reason: "New output can be created by HVLS.",
    },
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

test("Statistics domain entities open native HA details separately from label removal", () => {
  const start = source.indexOf('const entities = (stats.entities || []).filter(');
  const end = source.indexOf('details.appendChild(list);', start);
  const block = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /entityButton\.type = "button"/);
  assert.match(block, /entityButton\.className = "entity-more-info"/);
  assert.match(block, /entityButton\.setAttribute\("aria-label"/);
  assert.match(block, /this\._openEntityDetails\(entity\.entity_id\)/);
  assert.match(block, /entityButton\.append\(friendlyName, info\)/);
  assert.match(block, /this\._setEntityLabel\(catalogEntity, checkbox\)/);
  assert.match(block, /catalogEntity\?\.has_label === true/);
  assert.match(block, /checkbox\.className = "entity-hvls-checkbox"/);
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


test("Backup tab is present and uses admin-only WS actions", () => {
  assert.match(source, /data-tab="backups"/);
  assert.match(source, /id="tab-backups"/);
  assert.match(source, /ha_voice_label_sync\/list_backups/);
  assert.match(source, /ha_voice_label_sync\/review_backup/);
  assert.match(source, /ha_voice_label_sync\/restore_backup/);
});

test("Backup review is invalidated when a different snapshot is selected", async () => {
  const pending = deferred();
  const calls = [];
  const { panel } = makePanel(async message => {
    calls.push(message);
    if (message.backup_id === "first") return pending.promise;
    return {
      backup_id: "second", backup_sha256: "b".repeat(64),
      production_sha256: "p".repeat(64),
      comparison: {status: "ok", added: [], removed: [], modified: [],
        unchanged: 0, identical_text: true}
    };
  });
  panel._renderBackups = () => {};
  panel._renderBackupDiff = () => {};
  const first = panel._reviewBackup("first");
  const second = panel._reviewBackup("second");
  await second;
  pending.resolve({backup_id: "first"});
  await first;
  assert.equal(panel._backupReview.backup_id, "second");
  assert.equal(panel._selectedBackup, "second");
  assert.deepEqual(calls.map(c => c.backup_id), ["first", "second"]);
});

test("Cancelled backup restore never sends any restore command", async () => {
  const calls = [];
  const { panel } = makePanel(async message => {
    calls.push(message.type);
    return {};
  }, () => false);
  panel._backupReview = {
    backup_id: "google.yaml.20261108-220000.bak",
    backup_sha256: "b".repeat(64),
    production_sha256: "a".repeat(64),
    comparison: {identical_text: false}
  };
  await panel._restoreBackup();
  assert.deepEqual(calls, []);
  assert.equal(panel._backupReview.backup_id, "google.yaml.20261108-220000.bak");
});

test("Confirmed backup restore transmits reviewed hashes and refreshes Preview", async () => {
  const calls = [];
  const { panel, controls } = makePanel(async message => {
    calls.push(message);
    return {restored: true, safety_backup: "safety.bak"};
  });
  panel._backupReview = {
    backup_id: "google.yaml.20261108-220000.bak",
    backup_sha256: "b".repeat(64),
    production_sha256: "a".repeat(64),
    comparison: {identical_text: false}
  };
  let refreshed = false, backupsRefreshed = false;
  panel._loadPreview = async () => { refreshed = true; };
  panel._loadBackups = async () => { backupsRefreshed = true; };
  await panel._restoreBackup();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "ha_voice_label_sync/restore_backup");
  assert.equal(calls[0].backup_id, "google.yaml.20261108-220000.bak");
  assert.equal(calls[0].backup_sha256, "b".repeat(64));
  assert.equal(calls[0].production_sha256, "a".repeat(64));
  assert.equal(refreshed, true);
  assert.equal(backupsRefreshed, true);
  assert.equal(controls.apply.disabled, true);
});

test("Identical backup is never restored even with confirmation", async () => {
  const calls = [];
  const { panel } = makePanel(async message => { calls.push(message); });
  panel._backupReview = {
    backup_id: "foo", comparison: {identical_text: true}
  };
  await panel._restoreBackup();
  assert.equal(calls.length, 0);
});


test("Successful Apply invalidates cached backups so new snapshots become visible", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message.type);
    if (message.type === "ha_voice_label_sync/apply_preview")
      return {output_path: "/config/google_entities.yaml", bytes_written: 77,
        backup_path: "/config/.hvls_backups/new.bak"};
    return preview();
  });
  panel._review = {preview_sha256: "a".repeat(64), production_sha256: null};
  panel._backupList = [{id: "old.bak"}];
  panel._backupReview = {backup_id: "old.bak"};
  panel._selectedBackup = "old.bak";
  await panel._applyPreview();
  assert.equal(panel._backupList, null);
  assert.equal(panel._backupReview, null);
  assert.equal(panel._selectedBackup, null);
  assert.ok(calls.includes("ha_voice_label_sync/apply_preview"));
});

test("Opening Backups fetches live list even when it was already cached", () => {
  const {panel} = makePanel(async () => ({}));
  const panels = {};
  const buttons = ["summary", "entities", "preview", "backups"].map(tab => ({
    dataset: {tab}, classList: {toggle() {}}, setAttribute() {},
  }));
  panel.querySelector = selector => {
    if (selector.startsWith("#")) return panels[selector] ||= {hidden: true};
    return null;
  };
  panel.querySelectorAll = () => buttons;
  let loads = 0;
  panel._backupList = [{id: "cached.bak"}];
  panel._loadBackups = () => {loads++};
  panel._activateTab("backups");
  assert.equal(loads, 1);
});


test("Preview change rows expose native HA More Info for added, removed and modified entities", () => {
  const start = source.indexOf("  _renderPreviewChanges(result) {");
  const end = source.indexOf("  _renderAnalysis(result) {", start);
  const block = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /const entityId = typeof item === "string" \? item : item\.entity_id/);
  assert.match(block, /entityButton\.type = "button"/);
  assert.match(block, /entityButton\.className = "entity-more-info"/);
  assert.match(block, /entityButton\.setAttribute\("aria-label"/);
  assert.match(block, /entityButton\.addEventListener\("click"/);
  assert.match(block, /this\._openEntityDetails\(entityId\)/);
  assert.doesNotMatch(block, /_setEntityLabel\(/);
  assert.doesNotMatch(block, /apply_preview/);
});

test("Statistics room rows expand to matching entities including unassigned ones", () => {
  const start = source.indexOf('for (const [type, title, values] of [["domain"');
  const end = source.indexOf('if (type === "domain") {\n        const excluded', start);
  const section = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(section, /const details = document\.createElement\("details"\)/);
  assert.match(section, /type === "domain"/);
  assert.match(section, /entity\.domain === name/);
  assert.match(section, /\(entity\.room \|\| this\._t\("noArea"\)\) === name/);
  assert.match(section, /this\._openEntityDetails\(entity\.entity_id\)/);
  assert.match(section, /details\.appendChild\(list\)/);
  assert.match(section, /this\._setEntityLabel\(catalogEntity, checkbox\)/);
});

test("Statistics lists the unassigned room bucket last without changing domain order", () => {
  const start = source.indexOf('for (const [type, title, values] of [["domain"');
  const end = source.indexOf('const row = document.createElement("div");', start);
  const block = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /if \(type === "area"\)/);
  assert.match(block, /name === "Sans pièce"/);
  assert.match(block, /entries\.splice\(entries\.indexOf\(unassigned\), 1\)/);
  assert.match(block, /entries\.push\(unassigned\)/);
  assert.match(block, /for \(const \[name, count\] of entries\)/);
});


test("Statistics signals only actionable pending Preview changes", () => {
  const start = source.indexOf('const pendingCount = comparison.added.length +');
  const end = source.indexOf('const counters = document.createElement("div");', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /comparison\.removed\.length \+ comparison\.modified\.length/);
  assert.match(block, /pendingCount > 0 && this\._review/);
  assert.match(block, /preview-pending-alert/);
  assert.match(block, /this\._activateTab\("preview"\)/);
  assert.doesNotMatch(block, /_applyPreview\(/);
  assert.match(source, /prefers-reduced-motion:reduce/);
});

test("Statistics quick removal uses current HA labels and the confirmed existing workflow", () => {
  const start = source.indexOf("const catalogEntity = (this._entityCatalog?.entities || []).find(");
  const end = source.indexOf("item.appendChild(itemRow);", start);
  const block = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /catalogEntity\?\.has_label === true/);
  assert.match(block, /checkbox\.checked = true/);
  assert.match(block, /checkbox\.dataset\.ineligible = "false"/);
  assert.match(block, /checkbox\.disabled = Boolean\(this\._entityWritePending\)/);
  assert.match(block, /checkbox\.addEventListener\("change"/);
  assert.match(block, /this\._setEntityLabel\(catalogEntity, checkbox\)/);
  assert.doesNotMatch(block, /set_entity_label|apply_preview/);
  assert.match(source, /if \(this\._lastAnalysis\) this\._renderAnalysis\(this\._lastAnalysis\)/);
});


test("Production status distinguishes reviewed additions, modifications and unchanged entities", () => {
  const {panel} = makePanel(async () => ({}));
  panel._review = {preview_sha256: "a".repeat(64), production_sha256: "b".repeat(64)};
  const result = {
    available: true,
    comparison: {
      status: "ok",
      added: ["switch.pending"],
      modified: [{entity_id: "switch.changed", fields: {name: {before: "A", after: "B"}}}],
      removed: ["switch.removed"],
      unchanged: 1,
    },
  };
  assert.equal(panel._productionStatus("switch.pending", result), "pending");
  assert.equal(panel._productionStatus("switch.changed", result), "modified");
  assert.equal(panel._productionStatus("switch.saved", result), "validated");
});

test("Production status never implies validation without a current actionable comparison", () => {
  const {panel} = makePanel(async () => ({}));
  const result = {
    available: true,
    comparison: {status: "ok", added: [], modified: []},
  };
  assert.equal(panel._productionStatus("switch.saved", result), "unknown");
  panel._review = {preview_sha256: "a".repeat(64), production_sha256: null};
  assert.equal(panel._productionStatus("switch.saved", {...result, available: false}), "unknown");
  assert.equal(panel._productionStatus("switch.saved", {...result, comparison: {status: "missing"}}), "unknown");
  assert.equal(panel._productionStatus("switch.saved", {...result, comparison: {status: "invalid"}}), "unknown");
  assert.equal(panel._productionStatus("switch.saved", {...result, comparison: {status: "ok", added: []}}), "unknown");
});

test("Statistics production indicators are informational and do not apply or change labels", () => {
  const start = source.indexOf('const status = productionStatuses.get(entity.entity_id)');
  const end = source.indexOf("item.appendChild(itemRow);", start);
  assert.ok(start > -1 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /production-status--/);
  assert.match(block, /indicator\.title = this\._t\(statusKey\)/);
  assert.match(block, /indicator\.setAttribute\("aria-label"/);
  assert.doesNotMatch(block, /addEventListener|apply_preview|_setEntityLabel/);
  assert.match(source, /\.production-status--validated/);
  assert.match(source, /\.production-status--pending/);
});


test("Migration tab exposes a review-only action and no cutover button", () => {
  assert.match(source, /data-tab="migration"/);
  assert.match(source, /id="tab-migration"/);
  assert.match(source, /id="migrationAnalyze"/);
  assert.ok(source.includes("ha_voice_label_sync/get_migration_review"));
  const tabStart = source.indexOf('<section id="tab-migration"');
  const tabEnd = source.indexOf('<section id="tab-backups"', tabStart);
  assert.ok(tabStart >= 0 && tabEnd > tabStart);
  const markup = source.slice(tabStart, tabEnd);
  assert.doesNotMatch(markup, /id="apply"|id="restoreBackup"/);
  assert.doesNotMatch(markup, /set_entity_label|apply_preview/);
});

test("Migration review loads only diagnostic and never calls write APIs", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    return {
      protected_baseline_status: "not_verified",
      diagnostic: {review_status: "pending_review", entities: [
        {entity_id: "light.good", disk_ha_sync_projection: "exposed",
          category: "candidate_for_review", customization_fields_present: []},
      ]},
      preflight: {
        entities: [
          {entity_id: "light.good", status: "needs_review",
            reasons: ["decision_required"]},
        ],
        summary: {needs_review: 1, proposed_label_additions: 0},
      },
      simulation: null,
      read_only: true, apply_allowed: false, cutover_allowed: false,
    };
  });
  const controls = {
    migrationAnalyze: {disabled: false},
    migrationStatus: {textContent: ""},
    migrationSummary: {textContent: ""},
    migrationRows: {
      children: [], replaceChildren(...children) { this.children = children; },
      append(child) { this.children.push(child); },
    },
    migrationMore: {hidden: false},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationReview();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].type, "ha_voice_label_sync/get_migration_review");
  assert.equal(Object.keys(requests[0].decisions).length, 0);
  assert.match(controls.migrationSummary.textContent, /non vérifiée/);
  assert.match(controls.migrationSummary.textContent, /apply_allowed=false/);
  assert.match(controls.migrationStatus.textContent, /pending_review/);
  assert.equal(controls.migrationAnalyze.disabled, false);
  assert.equal(controls.migrationRows.children.length, 1);
  panel._setMigrationChoice("light.good", "action", "import");
  assert.equal(panel._migrationDecisions["light.good"].action, "import");
  assert.equal(requests.length, 1, "changing a choice never sends a write");
  assert.match(controls.migrationStatus.textContent, /relancez l’analyse/);
  await panel._loadMigrationReview();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].decisions["light.good"].action, "import");
  assert.equal(requests[1].type, "ha_voice_label_sync/get_migration_review");
});

test("Migration backend failures show a sanitized message without writing", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    throw new Error("private YAML secret value");
  });
  const controls = {
    migrationAnalyze: {disabled: false},
    migrationStatus: {textContent: ""},
    migrationSummary: {textContent: ""},
    migrationRows: {
      replaceChildren() {}, append() {},
    },
    migrationMore: {hidden: false},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationReview();
  assert.equal(requests.length, 1);
  assert.doesNotMatch(controls.migrationStatus.textContent, /private YAML/);
  assert.match(controls.migrationStatus.textContent, /indisponible/);
  assert.equal(controls.migrationAnalyze.disabled, false);
});


test("Protected baseline preparation alone never calls initialization", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    return {
      status: "awaiting_explicit_confirmation",
      confirmation_token: "one-use-secret",
      source_files: 2,
      explicit_entities: 3,
      implicit_exposure_warning: false,
    };
  });
  const controls = {
    migrationPrepareBaseline: {disabled: false},
    migrationConfirmBaseline: {disabled: true, hidden: true},
    migrationBaselineStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "assisted_migration",
    review_status: "pending_review",
    source: {status: "resolved"},
    global_blockers: [],
  }};
  await panel._prepareMigrationBaseline();
  assert.deepEqual(requests.map(r => r.type), [
    "ha_voice_label_sync/prepare_migration_baseline",
  ]);
  assert.equal(panel._baselineChallenge, "one-use-secret");
  assert.equal(controls.migrationConfirmBaseline.hidden, false);
  assert.match(controls.migrationBaselineStatus.textContent, /2/);
});

test("Cancelled baseline confirmation makes no filesystem-write request", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {};
  }, () => false);
  panel._baselineChallenge = "secret";
  panel._baselinePrepared = {source_files: 2, explicit_entities: 3};
  panel.querySelector = () => null;
  await panel._confirmMigrationBaseline();
  assert.equal(calls.length, 0);
  assert.equal(panel._baselineChallenge, "secret");
});

test("Confirmed baseline uses one-time token and refreshes review", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {
      status: "baseline_and_journal_verified",
      baseline_verified: true,
      journal_phase: "baseline_ready",
      journal_revision: 0,
    };
  });
  let refreshes = 0;
  panel._loadMigrationReview = async () => { refreshes++; };
  const controls = {
    migrationPrepareBaseline: {disabled: false},
    migrationConfirmBaseline: {disabled: false, hidden: false},
    migrationBaselineStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._baselineChallenge = "reviewed-secret";
  panel._baselinePrepared = {source_files: 2, explicit_entities: 3};
  await panel._confirmMigrationBaseline();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "ha_voice_label_sync/initialize_migration_baseline");
  assert.equal(calls[0].confirmation_token, "reviewed-secret");
  assert.equal(calls[0].confirmed, true);
  assert.equal(refreshes, 1);
  assert.equal(panel._baselineChallenge, null);
  assert.equal(controls.migrationConfirmBaseline.disabled, true);
  assert.equal(controls.migrationConfirmBaseline.hidden, true);
  assert.match(controls.migrationBaselineStatus.textContent, /Sauvegarde vérifiée/);
  await panel._confirmMigrationBaseline();
  assert.equal(calls.length, 1, "token cannot be reused by a second click");
});

test("Baseline initialization failure never exposes backend private error", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    throw new Error("PRIVATE_YAML_SECRET");
  });
  panel._baselineChallenge = "one-use";
  panel._baselinePrepared = {source_files: 2, explicit_entities: 2};
  const controls = {
    migrationPrepareBaseline: {disabled: false},
    migrationConfirmBaseline: {disabled: false, hidden: false},
    migrationBaselineStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._confirmMigrationBaseline();
  assert.equal(calls.length, 1);
  assert.match(controls.migrationBaselineStatus.textContent, /refusée/);
  assert.doesNotMatch(controls.migrationBaselineStatus.textContent, /PRIVATE_YAML_SECRET/);
  assert.equal(panel._baselineChallenge, null);
});

test("Migration tab contains no automatic confirmed initialization", () => {
  const start = source.indexOf('if (tab === "migration"');
  const tabEnd = source.indexOf("\n  }", start);
  assert.ok(start > -1 && tabEnd > start);
  const block = source.slice(start, tabEnd);
  assert.match(block, /_loadMigrationReview\(\)/);
  assert.doesNotMatch(block, /_prepareMigrationBaseline|_confirmMigrationBaseline/);
  assert.match(source, /window\.confirm\(this\._tf\("migrationBaselineConfirm"/);
  assert.doesNotMatch(source, /setTimeout\([^)]*initialize_migration_baseline/);
});


test("Saving migration choices never calls any label or YAML write", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    if (request.type === "ha_voice_label_sync/get_migration_decision_draft") {
      return {
        status: "not_saved", draft_revision: -1,
        journal_revision: 0,
        baseline_manifest_sha256: "b".repeat(64),
        decisions: {},
      };
    }
    if (request.type === "ha_voice_label_sync/save_migration_decision_draft") {
      return {
        status: "saved_unapproved_draft", draft_revision: 0,
        saved_decision_count: 1, cutover_allowed: false,
      };
    }
    throw new Error("Unexpected endpoint");
  });
  const controls = {
    migrationSaveDraft: {disabled: false},
    migrationRestoreDraft: {disabled: false},
    migrationDraftStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: "a".repeat(64)},
  };
  panel._migrationDecisions = {"light.safe": {action: "import"}};
  panel._migrationDirty = false;
  await panel._saveMigrationDecisionDraft();
  assert.deepEqual(requests.map(r => r.type), [
    "ha_voice_label_sync/get_migration_decision_draft",
    "ha_voice_label_sync/save_migration_decision_draft",
  ]);
  assert.equal(requests[1].decisions["light.safe"].action, "import");
  assert.equal(requests[1].draft_revision, -1);
  assert.equal(requests[1].review_token_sha256, "a".repeat(64));
  assert.equal(panel._draftExpectedRevision, 0);
  assert.match(controls.migrationDraftStatus.textContent, /PAS une autorisation/);
});

test("Migration draft refuses silent overwrite of unseen administrator changes", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    return {
      status: "saved_unapproved_draft", draft_revision: 2,
      journal_revision: 0,
      baseline_manifest_sha256: "b".repeat(64),
      decisions: {"light.other": {action: "keep"}},
    };
  });
  const controls = {
    migrationSaveDraft: {disabled: false},
    migrationRestoreDraft: {disabled: false},
    migrationDraftStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: "a".repeat(64)},
  };
  panel._migrationDecisions = {"light.safe": {action: "import"}};
  panel._migrationDirty = false;
  await panel._saveMigrationDecisionDraft();
  assert.equal(requests.length, 1);
  assert.match(controls.migrationDraftStatus.textContent, /Un brouillon existe/);
  assert.equal(panel._draftExpectedRevision, undefined);
});

test("Restored migration draft survives UI reopening but needs fresh analysis", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    return {
      stored_choices_unapproved: true,
      status: "saved_unapproved_draft",
      draft_revision: 4,
      decisions: {
        "light.safe": {action: "import"},
        "light.bad": {action: "keep"},
      },
    };
  });
  const controls = {
    migrationSaveDraft: {disabled: false},
    migrationRestoreDraft: {disabled: false},
    migrationDraftStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  let refreshed = 0;
  panel._loadMigrationReview = async () => { refreshed++; };
  await panel._restoreMigrationDecisionDraft();
  assert.equal(panel._draftExpectedRevision, 4);
  assert.equal(panel._migrationDecisions["light.safe"].action, "import");
  assert.equal(panel._migrationDecisions["light.bad"].action, "keep");
  assert.equal(refreshed, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].type,
    "ha_voice_label_sync/get_migration_decision_draft");
});

test("Draft choice edits do not autosave or mutate labels", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request.type);
    return {};
  });
  panel.querySelector = () => null;
  panel._setMigrationChoice("light.safe", "action", "keep");
  panel._setMigrationChoice("light.safe", "metadata_policy",
    "retain_manual_yaml");
  assert.equal(requests.length, 0);
  assert.equal(panel._migrationDirty, true);
});

test("Unsaved or stale migration analysis cannot persist decisions", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    return {};
  });
  const controls = {migrationDraftStatus: {textContent: ""}};
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationDirty = true;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: "a".repeat(64)},
  };
  await panel._saveMigrationDecisionDraft();
  assert.equal(requests.length, 0);
  assert.match(controls.migrationDraftStatus.textContent,
    /Actualisez d’abord/);
});

test("Cancel save migration selections sends no write", async () => {
  const requests = [];
  const {panel} = makePanel(async request => {
    requests.push(request);
    return {};
  }, () => false);
  panel._migrationDirty = false;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: "a".repeat(64)},
  };
  panel.querySelector = () => null;
  await panel._saveMigrationDecisionDraft();
  assert.equal(requests.length, 0);
});


test("Read-only human attestation check never calls any write API", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {
      status: "stale_review_attestation",
      attestation_revision: 1,
      review_is_not_execution_authorization: true,
      cutover_allowed: false,
    };
  });
  const controls = {
    migrationReadAttestation: {disabled: false},
    migrationAttestReview: {disabled: false},
    migrationAttestationStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._readMigrationAttestation();
  assert.deepEqual(calls.map(r => r.type), [
    "ha_voice_label_sync/get_migration_review_attestation",
  ]);
  assert.match(controls.migrationAttestationStatus.textContent, /stale_review_attestation/);
  assert.match(controls.migrationAttestationStatus.textContent, /Aucun droit d’exécution/);
});

test("Explicit no-issue review attestation never stages a label", async () => {
  const requests = [];
  const sha = "a".repeat(64);
  const fingerprint = "c".repeat(64);
  const {panel} = makePanel(async request => {
    requests.push(request);
    if (request.type === "ha_voice_label_sync/get_migration_review_attestation") {
      return {
        status: "not_attested",
        attestation_revision: -1,
        cutover_allowed: false,
        review_is_not_execution_authorization: true,
        fresh_review_evidence: {
          status: "reviewed_without_detected_issues",
          review_evidence_sha256: fingerprint,
          review_token_sha256: sha,
          observed_issues: false,
        },
      };
    }
    if (request.type === "ha_voice_label_sync/get_migration_decision_draft") {
      return {
        status: "saved_unapproved_draft",
        draft_revision: 2, journal_revision: 0,
        baseline_manifest_sha256: "b".repeat(64),
        review_token_sha256: sha,
      };
    }
    if (request.type === "ha_voice_label_sync/attest_migration_review") {
      return {
        status: "reviewed_without_detected_issues",
        attestation_revision: 0,
        cutover_allowed: false,
        observed_issues: false,
        review_is_not_execution_authorization: true,
      };
    }
    throw new Error("Unexpected operation: " + request.type);
  });
  const controls = {
    migrationReadAttestation: {disabled: false},
    migrationAttestReview: {disabled: false},
    migrationAttestationStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationDirty = false;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: sha},
  };
  panel._draftExpectedRevision = 2;
  await panel._attestMigrationReview();
  assert.deepEqual(requests.map(r => r.type), [
    "ha_voice_label_sync/get_migration_review_attestation",
    "ha_voice_label_sync/get_migration_decision_draft",
    "ha_voice_label_sync/attest_migration_review",
  ]);
  assert.equal(requests[2].confirmed, true);
  assert.equal(requests[2].acknowledge_issues, false);
  assert.equal(requests[2].attestation_revision, -1);
  assert.equal(requests[2].draft_revision, 2);
  assert.equal(requests[2].review_evidence_sha256, fingerprint);
  assert.match(controls.migrationAttestationStatus.textContent, /PAS une autorisation/);
});

test("Attestation with unresolved issues carries explicit acknowledgment", async () => {
  const sha = "a".repeat(64);
  const calls = [];
  let warningPrompt = "";
  const {panel} = makePanel(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/get_migration_review_attestation") {
      return {
        attestation_revision: -1,
        cutover_allowed: false,
        fresh_review_evidence: {
          status: "reviewed_with_open_issues",
          review_token_sha256: sha,
          review_evidence_sha256: "c".repeat(64),
          observed_issues: true,
        },
      };
    }
    if (request.type === "ha_voice_label_sync/get_migration_decision_draft") {
      return {
        status: "saved_unapproved_draft",
        draft_revision: 0, journal_revision: 0,
        review_token_sha256: sha,
        baseline_manifest_sha256: "b".repeat(64),
      };
    }
    return {
      status: "reviewed_with_open_issues",
      attestation_revision: 0,
      observed_issues: true, cutover_allowed: false,
      review_is_not_execution_authorization: true,
    };
  }, msg => {warningPrompt = msg; return true;});
  const controls = {
    migrationReadAttestation: {disabled: false},
    migrationAttestReview: {disabled: false},
    migrationAttestationStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: sha},
  };
  panel._draftExpectedRevision = 0;
  panel._migrationDirty = false;
  await panel._attestMigrationReview();
  assert.match(warningPrompt, /anomalies ou décisions non résolues/);
  assert.equal(calls[2].acknowledge_issues, true);
  assert.equal(calls[2].confirmed, true);
  assert.match(controls.migrationAttestationStatus.textContent, /AVEC anomalies/);
});

test("Cancelling human review attestation never writes a record", async () => {
  const sha = "a".repeat(64);
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    if (request.type === "ha_voice_label_sync/get_migration_review_attestation") {
      return {
        attestation_revision: -1, cutover_allowed: false,
        fresh_review_evidence: {
          status: "reviewed_without_detected_issues",
          review_token_sha256: sha,
          review_evidence_sha256: "c".repeat(64),
          observed_issues: false,
        },
      };
    }
    return {
      status: "saved_unapproved_draft", draft_revision: 0,
      journal_revision: 0, review_token_sha256: sha,
      baseline_manifest_sha256: "b".repeat(64),
    };
  }, () => false);
  const controls = {
    migrationReadAttestation: {disabled: false},
    migrationAttestReview: {disabled: false},
    migrationAttestationStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._draftExpectedRevision = 0;
  panel._migrationDirty = false;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: sha},
  };
  await panel._attestMigrationReview();
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_migration_review_attestation",
    "ha_voice_label_sync/get_migration_decision_draft",
  ]);
});

test("Unsaved choice change prevents review attestation requests", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {};
  });
  const controls = {
    migrationReadAttestation: {disabled: false},
    migrationAttestReview: {disabled: false},
    migrationAttestationStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationDirty = true;
  panel._draftExpectedRevision = 1;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: "a".repeat(64)},
  };
  await panel._attestMigrationReview();
  assert.equal(calls.length, 0);
  assert.match(controls.migrationAttestationStatus.textContent, /Enregistrez d’abord/);
});

test("Review evidence conflict cannot be silently acknowledged", async () => {
  const sha = "a".repeat(64);
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    return {
      attestation_revision: 0, cutover_allowed: false,
      fresh_review_evidence: {
        status: "reviewed_without_detected_issues",
        review_token_sha256: "b".repeat(64),
        review_evidence_sha256: "c".repeat(64),
      },
    };
  });
  const controls = {
    migrationReadAttestation: {disabled: false},
    migrationAttestReview: {disabled: false},
    migrationAttestationStatus: {textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._draftExpectedRevision = 1;
  panel._migrationDirty = false;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {review_token_sha256: sha},
  };
  await panel._attestMigrationReview();
  assert.equal(calls.length, 1);
  assert.match(controls.migrationAttestationStatus.textContent, /périmée/);
});


test("Loaded manual Google impact appears as an explicitly non-authorizing status", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    return {
      protected_baseline_status: "not_verified",
      diagnostic: {
        entities: [
          {entity_id: "light.good", disk_ha_sync_projection: "exposed"},
          {entity_id: "light.uncertain", disk_ha_sync_projection: "unknown"},
        ],
        review_status: "pending_review",
      },
      preflight: {
        summary: {needs_review: 1, proposed_label_additions: 2},
        entities: [],
      },
      pre_stage_impact: {
        status: "local_review_pending",
        stage_allowed: false,
        cutover_allowed: false,
        entities: [
          {entity_id: "light.good", reasons: [],
            status: "no_manual_policy_delta_detected"},
          {entity_id: "light.uncertain",
            reasons: ["manual_google_runtime_rule_disagreement"],
            status: "needs_review"},
        ],
      },
      simulation: null,
      read_only: true, apply_allowed: false, cutover_allowed: false,
    };
  });
  const controls = {
    migrationAnalyze: {disabled: false},
    migrationStatus: {textContent: ""},
    migrationSummary: {textContent: ""},
    migrationRows: {
      children: [], replaceChildren(...children) { this.children = children; },
      append(child) { this.children.push(child); },
    },
    migrationMore: {hidden: false},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationReview();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_migration_review"]);
  assert.match(controls.migrationSummary.textContent, /local_review_pending/);
  assert.match(controls.migrationSummary.textContent, /Staging interdit/);
  assert.match(controls.migrationSummary.textContent, /non vérifiés/);
  assert.doesNotMatch(controls.migrationSummary.textContent, /stage_allowed=true/);
  assert.equal(controls.migrationRows.children.length, 1);
});

test("Unknown Google staging impact is never rendered as permission to stage", () => {
  const {panel} = makePanel(async () => ({}));
  const controls = {
    migrationStatus: {textContent: ""},
    migrationSummary: {textContent: ""},
    migrationRows: {replaceChildren() {}, append() {}},
    migrationMore: {hidden: true},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {
    protected_baseline_status: "not_verified",
    preflight: {summary: {needs_review: 1}},
    diagnostic: {entities: [{entity_id: "light.test"}]},
    pre_stage_impact: {
      status: "global_review_blocked",
      stage_allowed: false,
      entities: [],
    },
  };
  panel._renderMigrationReview();
  assert.match(controls.migrationSummary.textContent, /global_review_blocked/);
  assert.match(controls.migrationSummary.textContent, /Staging interdit/);
  assert.ok(!source.includes("ha_voice_label_sync/stage_one_approved_label"));
});


test("Indirect consumer audit warns even without references or Google delta", () => {
  const {panel} = makePanel(async () => ({}));
  const controls = {
    migrationStatus: {textContent: ""},
    migrationSummary: {textContent: ""},
    migrationRows: {replaceChildren() {}, append() {}},
    migrationMore: {hidden: true},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {
    protected_baseline_status: "not_verified",
    preflight: {summary: {needs_review: 0, proposed_label_additions: 1}},
    diagnostic: {entities: [{entity_id: "light.test"}]},
    pre_stage_impact: {
      status: "no_manual_policy_delta_detected",
      stage_allowed: false, entities: [],
    },
    indirect_consumer_audit: {
      status: "indirect_effects_unverified",
      observed_standard_yaml_files: 3,
      original_google_source_overlap: false,
      reference_counts: {
        explicit_hvls_generate_references: 0,
        registry_event_references: 0,
        label_template_references: 0,
      },
      stage_allowed: false,
    },
  };
  panel._renderMigrationReview();
  assert.match(controls.migrationSummary.textContent, /3 fichiers YAML inspectés/);
  assert.match(controls.migrationSummary.textContent, /Effets externes non certifiés/);
  assert.match(controls.migrationSummary.textContent, /staging interdit/i);
  assert.ok(!source.includes("ha_voice_label_sync/stage_one_approved_label"));
});

test("V1 output overlap produces persistent no-write warning", () => {
  const {panel} = makePanel(async () => ({}));
  const controls = {
    migrationStatus: {textContent: ""},
    migrationSummary: {textContent: ""},
    migrationRows: {replaceChildren() {}, append() {}},
    migrationMore: {hidden: true},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {
    protected_baseline_status: "verified",
    preflight: {summary: {}},
    diagnostic: {entities: [{entity_id: "light.test"}]},
    indirect_consumer_audit: {
      status: "indirect_effects_unverified",
      observed_standard_yaml_files: 3,
      reference_counts: {
        explicit_hvls_generate_references: 1,
        registry_event_references: 1,
        label_template_references: 1,
      },
      original_google_source_overlap: true,
      stage_allowed: false,
    },
  };
  panel._renderMigrationReview();
  assert.match(controls.migrationSummary.textContent, /1 références à la génération/);
  assert.match(controls.migrationSummary.textContent, /source Google manuelle protégée/);
  assert.match(controls.migrationSummary.textContent, /staging interdit/i);
});


test("Recovery view is strictly read-only and displays pending intent", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message.type);
    return {
      read_only: true, automatic_recovery_allowed: false,
      stage_allowed: false, cutover_allowed: false,
      status: "review_required", needs_review: true,
      phase: "labels_staging", journal_revision: 2,
      source_integrity: "verified_unchanged",
      summary: {total: 1, unconfirmed: 1, other_issues: 0},
      operations: [{
        entity_id: "light.test", operation_status: "intent",
        observed_status: "unconfirmed_intent", membership: "present",
        needs_review: true,
      }],
    };
  });
  const controls = {
    migrationRecoveryRefresh: {disabled: false},
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {
      children: [], replaceChildren() {this.children = [];},
      append(row) {this.children.push(row);},
    },
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationRecovery();
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_migration_recovery_status",
  ]);
  assert.match(controls.migrationRecoveryStatus.textContent, /Examen manuel requis/);
  assert.match(controls.migrationRecoveryStatus.textContent, /non acquittées : 1/);
  assert.match(controls.migrationRecoveryStatus.textContent, /aucun droit de staging/);
  assert.equal(controls.migrationRecoveryRows.children.length, 1);
  assert.match(controls.migrationRecoveryRows.children[0].textContent, /unconfirmed_intent/);
  assert.equal(controls.migrationRecoveryRefresh.disabled, false);
  assert.ok(!calls.some(c => /apply|stage|resume|rollback|ack/.test(c)));
});

test("Missing migration journal is displayed without any initialization", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message.type);
    return {
      read_only: true, automatic_recovery_allowed: false,
      stage_allowed: false, cutover_allowed: false,
      status: "not_initialized", operations: [],
    };
  });
  const controls = {
    migrationRecoveryRefresh: {disabled: false},
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {
      replaceChildren() {}, append() { throw Error("unexpected rows"); },
    },
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationRecovery();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_migration_recovery_status"]);
  assert.match(controls.migrationRecoveryStatus.textContent, /Journal non initialisé/);
});

test("Corrupted or stale recovery status never becomes permission", async () => {
  const {panel} = makePanel(async message => {
    assert.equal(message.type, "ha_voice_label_sync/get_migration_recovery_status");
    return {
      read_only: true, automatic_recovery_allowed: false,
      stage_allowed: false, cutover_allowed: false,
      status: "unavailable", operations: [],
      reason: "protected_journal_or_baseline_invalid",
    };
  });
  const controls = {
    migrationRecoveryRefresh: {disabled: false},
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {replaceChildren() {}, append() {}},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationRecovery();
  assert.match(controls.migrationRecoveryStatus.textContent, /indisponible/);
});

test("Any allegedly authorized recovery backend payload is rejected", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message.type);
    return {
      read_only: true,
      automatic_recovery_allowed: true,
      stage_allowed: true, cutover_allowed: false,
      status: "observed_no_pending",
    };
  });
  const controls = {
    migrationRecoveryRefresh: {disabled: false},
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {replaceChildren() {}, append() {}},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationRecovery();
  assert.match(controls.migrationRecoveryStatus.textContent, /indisponible/);
  assert.equal(panel._migrationRecoveryReport, null);
  assert.deepEqual(calls, ["ha_voice_label_sync/get_migration_recovery_status"]);
});

test("A long recovery report is bounded to 100 visible rows", () => {
  const {panel} = makePanel(async () => ({}));
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {
      children: [], replaceChildren() {this.children = [];},
      append(row) {this.children.push(row);},
    },
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationRecoveryReport = {
    status: "review_required", phase: "labels_staging",
    journal_revision: 201, needs_review: true,
    source_integrity: "verified_unchanged",
    summary: {total: 150, unconfirmed: 150, other_issues: 0},
    operations: Array.from({length: 150}, (_, i) => ({
      entity_id: "light.test_" + i, operation_status: "intent",
      observed_status: "unconfirmed_intent",
      membership: "unknown", needs_review: true,
    })),
  };
  panel._renderMigrationRecovery();
  assert.equal(controls.migrationRecoveryRows.children.length, 100);
  assert.match(controls.migrationRecoveryStatus.textContent, /Opérations : 150/);
});

test("Opening migration tab always rechecks recovery independently of review", () => {
  const {panel} = makePanel(async () => ({}));
  const opened = [];
  const panels = {};
  for (const id of [
    "tab-summary", "tab-exclusions", "entityManager", "tab-preview",
    "tab-backups", "tab-migration",
  ]) panels["#" + id] = {hidden: false};
  panel.querySelector = selector => panels[selector] || null;
  panel.querySelectorAll = () => [];
  panel._migrationReport = {};
  panel._loadMigrationRecovery = () => opened.push("recovery");
  panel._loadMigrationReview = () => opened.push("review");
  panel._activateTab("migration");
  panel._activateTab("migration");
  assert.deepEqual(opened, ["recovery", "recovery"]);
});


test("Recovery intent matching desired label remains a non-authorizing simulation", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message.type);
    return {
      status: "review_required", read_only: true,
      automatic_recovery_allowed: false,
      stage_allowed: false, cutover_allowed: false,
      needs_review: true, phase: "labels_staging",
      journal_revision: 2, source_integrity: "verified_unchanged",
      summary: {total: 1, unconfirmed: 1, other_issues: 0},
      operations: [{
        entity_id: "light.test", operation_status: "intent",
        observed_status: "unconfirmed_intent",
        membership: "present", needs_review: true,
      }],
      resolution_scenarios: {
        status: "investigation_required", read_only: true,
        automatic_recovery_allowed: false, journal_ack_allowed: false,
        retry_allowed: false, rollback_allowed: false,
        stage_allowed: false, apply_allowed: false, cutover_allowed: false,
        evidence_is_not_execution_authorization: true,
        summary: {
          unconfirmed: 1, requires_investigation: 1, quarantined: 0,
        },
        operations: [{
          entity_id: "light.test", category: "investigation",
          scenario: "intent_desired_membership_observed",
          reason_codes: ["journal_intent_still_unconfirmed"],
          resolution_authorized: false,
        }],
      },
    };
  });
  const controls = {
    migrationRecoveryRefresh: {disabled: false},
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {
      children: [], replaceChildren() {this.children = [];},
      append(node) {this.children.push(node);},
    },
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  await panel._loadMigrationRecovery();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_migration_recovery_status"]);
  assert.match(controls.migrationRecoveryStatus.textContent, /simulation seulement/);
  assert.match(controls.migrationRecoveryRows.children[0].textContent,
    /intention NON acquittée/);
  assert.match(controls.migrationRecoveryRows.children[0].textContent,
    /journal_intent_still_unconfirmed/);
  assert.equal(controls.migrationRecoveryRefresh.disabled, false);
  assert.ok(!source.includes("ha_voice_label_sync/resolve_migration_intent"));
});

test("Untrusted recovery scenario claiming authorization is not rendered", async () => {
  const {panel} = makePanel(async () => ({}));
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {
      children: [], replaceChildren() {this.children = [];},
      append(node) {this.children.push(node);},
    },
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationRecoveryReport = {
    status: "review_required", needs_review: true,
    phase: "labels_staging", journal_revision: 1,
    source_integrity: "changed_or_unavailable",
    summary: {total: 1, unconfirmed: 1, other_issues: 0},
    operations: [{
      entity_id: "light.test", operation_status: "intent",
      observed_status: "unconfirmed_intent",
      membership: "absent", needs_review: true,
    }],
    resolution_scenarios: {
      status: "investigation_required", read_only: true,
      automatic_recovery_allowed: false, journal_ack_allowed: true,
      retry_allowed: true, rollback_allowed: true,
      cutover_allowed: false, summary: {unconfirmed: 0},
      operations: [{
        entity_id: "light.test", category: "observation_only",
        scenario: "applied_record_matches_observation",
        resolution_authorized: true,
      }],
    },
  };
  panel._renderMigrationRecovery();
  assert.doesNotMatch(controls.migrationRecoveryStatus.textContent,
    /simulation seulement/);
  assert.doesNotMatch(controls.migrationRecoveryRows.children[0].textContent,
    /Hypothèse/);
  assert.match(controls.migrationRecoveryStatus.textContent,
    /Examen manuel requis/);
});


function recoverySimulationFixture() {
  return {
    status: "review_required", read_only: true,
    automatic_recovery_allowed: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
    needs_review: true, phase: "labels_staging", journal_revision: 2,
    journal_evidence_sha256: "f".repeat(64),
    source_integrity: "verified_unchanged",
    summary: {total: 1, unconfirmed: 1, other_issues: 0},
    operations: [{
      entity_id: "light.sandbox", operation_status: "intent",
      observed_status: "unconfirmed_intent", membership: "present",
      needs_review: true,
    }],
    resolution_scenarios: {
      status: "investigation_required",
      read_only: true, automatic_recovery_allowed: false,
      journal_ack_allowed: false, retry_allowed: false,
      rollback_allowed: false, stage_allowed: false,
      apply_allowed: false, cutover_allowed: false,
      evidence_is_not_execution_authorization: true,
      summary: {unconfirmed: 1, requires_investigation: 1, quarantined: 0},
      operations: [{
        entity_id: "light.sandbox", category: "investigation",
        scenario: "intent_desired_membership_observed",
        human_investigation_required: true,
        resolution_authorized: false,
        reason_codes: ["journal_intent_still_unconfirmed"],
      }],
    },
  };
}

test("Recovery simulation runs two admin-only steps without mutation requests", async () => {
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req);
    if (req.type === "ha_voice_label_sync/prepare_migration_recovery_decision") {
      assert.equal(req.entity_id, "light.sandbox");
      assert.equal(req.disposition, "inspect_external_effects");
      return {
        status: "awaiting_simulated_human_confirmation",
        entity_id: req.entity_id, disposition: req.disposition,
        confirmation_token: "single_use_challenge",
        read_only: true, execution_authorized: false,
        stage_allowed: false, cutover_allowed: false,
      };
    }
    assert.equal(req.type,
      "ha_voice_label_sync/confirm_migration_recovery_decision");
    assert.equal(req.confirmation_token, "single_use_challenge");
    assert.equal(req.confirmed, true);
    assert.equal(req.acknowledge_external_uncertainty, true);
    return {
      status: "simulated_review_confirmation_no_execution",
      entity_id: req.entity_id, read_only: true,
      no_action_was_performed: true, execution_authorized: false,
      journal_ack_allowed: false, retry_allowed: false,
      rollback_allowed: false, stage_allowed: false,
      apply_allowed: false, cutover_allowed: false,
    };
  });
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryDecisionStatus: {textContent: ""},
    migrationRecoveryRows: {
      children: [], replaceChildren() {this.children = [];},
      append(node) {this.children.push(node);},
    },
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationRecoveryReport = recoverySimulationFixture();
  panel._renderMigrationRecovery();
  const first = controls.migrationRecoveryRows.children[0];
  assert.equal(first.children.length, 3);
  assert.equal(first.children[2].tag, "button");
  assert.equal(first.children[0].tag, "select");
  assert.equal(first.children[1].tag, "button");
  assert.equal(first.children[0].value, "inspect_external_effects");
  assert.equal(typeof first.children[1].on_click, "function");
  await panel._simulateRecoveryDecision(
    "light.sandbox", "inspect_external_effects"
  );
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/prepare_migration_recovery_decision",
    "ha_voice_label_sync/confirm_migration_recovery_decision",
  ]);
  assert.match(controls.migrationRecoveryDecisionStatus.textContent,
    /Simulation confirmée/);
  assert.match(controls.migrationRecoveryDecisionStatus.textContent,
    /Aucun journal, label ou YAML modifié/);
  assert.ok(!calls.some(c => /apply|stage|rollback|retry/.test(c.type)));
});

test("Canceled recovery simulation sends preparation only", async () => {
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req.type);
    return {
      status: "awaiting_simulated_human_confirmation",
      entity_id: "light.sandbox",
      disposition: "defer_until_further_evidence",
      confirmation_token: "unused",
      read_only: true, execution_authorized: false,
      stage_allowed: false, cutover_allowed: false,
    };
  }, () => false);
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryDecisionStatus: {textContent: ""},
    migrationRecoveryRows: {
      replaceChildren() {}, append() {},
    },
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationRecoveryReport = recoverySimulationFixture();
  await panel._simulateRecoveryDecision(
    "light.sandbox", "defer_until_further_evidence"
  );
  assert.deepEqual(calls, [
    "ha_voice_label_sync/prepare_migration_recovery_decision"
  ]);
  assert.match(controls.migrationRecoveryDecisionStatus.textContent,
    /Simulation annulée/);
});

test("Unsafe recovery evidence hides simulation buttons", () => {
  const {panel} = makePanel(async () => ({}));
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {
      children: [], replaceChildren() {this.children = [];},
      append(node) {this.children.push(node);},
    },
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  const report = recoverySimulationFixture();
  report.source_integrity = "changed_or_unavailable";
  panel._migrationRecoveryReport = report;
  panel._renderMigrationRecovery();
  assert.equal(controls.migrationRecoveryRows.children[0].children.length, 0);
  report.source_integrity = "verified_unchanged";
  report.resolution_scenarios.operations[0].resolution_authorized = true;
  panel._renderMigrationRecovery();
  assert.equal(controls.migrationRecoveryRows.children[0].children.length, 0);
});

test("Forged recovery confirmation claiming writes is refused in UI", async () => {
  const {panel} = makePanel(async req => {
    if (req.type.includes("prepare")) return {
      status: "awaiting_simulated_human_confirmation",
      entity_id: "light.sandbox",
      disposition: "inspect_external_effects",
      confirmation_token: "challenge",
      read_only: true, execution_authorized: false,
      stage_allowed: false, cutover_allowed: false,
    };
    return {
      status: "simulated_review_confirmation_no_execution",
      entity_id: "light.sandbox", read_only: true,
      no_action_was_performed: true, execution_authorized: true,
      journal_ack_allowed: true, retry_allowed: true,
      rollback_allowed: true, stage_allowed: true,
      apply_allowed: true, cutover_allowed: true,
    };
  });
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryDecisionStatus: {textContent: ""},
    migrationRecoveryRows: {replaceChildren() {}, append() {}},
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationRecoveryReport = recoverySimulationFixture();
  await panel._simulateRecoveryDecision(
    "light.sandbox", "inspect_external_effects"
  );
  assert.match(controls.migrationRecoveryDecisionStatus.textContent,
    /Simulation refusée/);
});


test("Recording recovery investigation sends exactly two non-execution calls", async () => {
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req);
    if (req.type === "ha_voice_label_sync/prepare_migration_investigation_record") {
      return {
        status: "awaiting_durable_investigation_confirmation",
        confirmation_token: "one_time",
        entity_id: "light.sandbox", disposition: "inspect_external_effects",
        journal_ack_allowed: false, execution_authorized: false,
        stage_allowed: false, cutover_allowed: false,
      };
    }
    if (req.type === "ha_voice_label_sync/confirm_migration_investigation_record") {
      assert.equal(req.confirmed, true);
      assert.equal(req.acknowledge_external_uncertainty, true);
      assert.equal(req.confirmation_token, "one_time");
      return {
        status: "durable_investigation_recorded_no_execution",
        record: {sequence: 1, entity_id: "light.sandbox",
          disposition: "inspect_external_effects"},
        execution_authorized: false, journal_ack_allowed: false,
        retry_allowed: false, rollback_allowed: false,
        stage_allowed: false, apply_allowed: false,
        cutover_allowed: false, label_changed: false,
        journal_changed: false, production_yaml_changed: false,
      };
    }
    if (req.type === "ha_voice_label_sync/get_migration_investigation_history") {
      return {
        status: "verified_investigation_history",
        history_read_only: true, record_count: 1,
        execution_authorized: false, stage_allowed: false,
        cutover_allowed: false, records: [{
          sequence: 1, entity_id: "light.sandbox",
          disposition: "inspect_external_effects",
          evidence_relation: "matching_current_observation",
        }],
      };
    }
    throw Error("unexpected or mutating request: " + req.type);
  });
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryDecisionStatus: {textContent: ""},
    migrationRecoveryRows: {
      children: [], replaceChildren() {this.children = [];},
      append(node) {this.children.push(node);},
    },
    migrationLedgerStatus: {textContent: ""},
    migrationLedgerRefresh: {disabled: false},
    migrationLedgerRows: {
      children: [], replaceChildren() {this.children = [];},
      append(node) {this.children.push(node);},
    },
  };
  panel.querySelector = s => controls[s.slice(1)] || null;
  panel._migrationRecoveryReport = recoverySimulationFixture();
  panel._renderMigrationRecovery();
  assert.equal(controls.migrationRecoveryRows.children[0].children.length, 3);
  assert.equal(controls.migrationRecoveryRows.children[0].children[2].tag, "button");
  await panel._recordRecoveryInvestigation(
    "light.sandbox", "inspect_external_effects"
  );
  assert.deepEqual(calls.map(c => c.type), [
    "ha_voice_label_sync/prepare_migration_investigation_record",
    "ha_voice_label_sync/confirm_migration_investigation_record",
    "ha_voice_label_sync/get_migration_investigation_history",
  ]);
  assert.match(controls.migrationRecoveryDecisionStatus.textContent,
    /n°1 enregistrée/);
  assert.match(controls.migrationLedgerStatus.textContent,
    /1 décisions d’enquête/);
  assert.equal(controls.migrationLedgerRows.children.length, 1);
  assert.ok(!calls.some(c => /rollback|stage|ack|apply|retry/.test(c.type)));
});

test("Cancelled protected history prompt does not send confirm or create record", async () => {
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req.type);
    return {
      status: "awaiting_durable_investigation_confirmation",
      entity_id: "light.sandbox",
      disposition: "quarantine_for_investigation",
      confirmation_token: "not_used",
      execution_authorized: false, journal_ack_allowed: false,
      stage_allowed: false, cutover_allowed: false,
    };
  }, () => false);
  const controls = {
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {replaceChildren() {}, append() {}},
    migrationRecoveryDecisionStatus: {textContent: ""},
  };
  panel.querySelector = s => controls[s.slice(1)] || null;
  panel._migrationRecoveryReport = recoverySimulationFixture();
  await panel._recordRecoveryInvestigation(
    "light.sandbox", "quarantine_for_investigation"
  );
  assert.deepEqual(calls, [
    "ha_voice_label_sync/prepare_migration_investigation_record"
  ]);
  assert.match(controls.migrationRecoveryDecisionStatus.textContent, /annulé/);
});

test("Forged durable history success is rejected without pretending anything saved", async () => {
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req.type);
    if (req.type.includes("prepare")) return {
      status: "awaiting_durable_investigation_confirmation",
      entity_id: "light.sandbox", disposition: "inspect_external_effects",
      confirmation_token: "ephemeral", execution_authorized: false,
      journal_ack_allowed: false, stage_allowed: false,
      cutover_allowed: false,
    };
    return {
      status: "durable_investigation_recorded_no_execution",
      record: {sequence: 1, entity_id: "light.sandbox",
        disposition: "inspect_external_effects"},
      execution_authorized: true, journal_ack_allowed: true,
      stage_allowed: true, apply_allowed: true,
      cutover_allowed: true, label_changed: true,
      journal_changed: true, production_yaml_changed: true,
    };
  });
  const controls = {
    migrationRecoveryDecisionStatus: {textContent: ""},
    migrationRecoveryStatus: {textContent: ""},
    migrationRecoveryRows: {replaceChildren() {}, append() {}},
  };
  panel.querySelector = s => controls[s.slice(1)] || null;
  panel._migrationRecoveryReport = recoverySimulationFixture();
  await panel._recordRecoveryInvestigation(
    "light.sandbox", "inspect_external_effects"
  );
  assert.match(controls.migrationRecoveryDecisionStatus.textContent,
    /Enregistrement refusé/);
  assert.equal(calls.length, 2);
});

test("Invalid protected history response is never displayed as verified", async () => {
  const {panel} = makePanel(async req => {
    assert.equal(req.type,
      "ha_voice_label_sync/get_migration_investigation_history");
    return {
      status: "verified_investigation_history", record_count: 1,
      history_read_only: true, execution_authorized: true,
      stage_allowed: true, cutover_allowed: true,
      records: [{sequence: 1, entity_id: "light.sandbox"}],
    };
  });
  const controls = {
    migrationLedgerRefresh: {disabled: false},
    migrationLedgerStatus: {textContent: ""},
    migrationLedgerRows: {replaceChildren() {}, append() {}},
  };
  panel.querySelector = s => controls[s.slice(1)] || null;
  await panel._loadMigrationInvestigationHistory();
  assert.match(controls.migrationLedgerStatus.textContent, /indisponible/);
  assert.equal(controls.migrationLedgerRefresh.disabled, false);
});


test("Unmanaged Apply displays its reason without enabling writes", async () => {
  const reason = "Existing manual or unregistered YAML is protected.";
  const calls = [];

  const { panel, controls } = makePanel(async message => {
    calls.push(message.type);
    return {
      ...preview(false),
      ownership: {
        status: "unmanaged",
        write_allowed: false,
        reason,
      },
    };
  });

  const info = { hidden: true, title: "" };
  const explanation = { textContent: "" };
  const originalQuery = panel.querySelector.bind(panel);

  panel.querySelector = selector => {
    if (selector === "#applyInfo") return info;
    if (selector === "#applyBlockReason") return explanation;
    return originalQuery(selector);
  };

  await panel._loadPreview();

  assert.equal(controls.apply.disabled, true);
  assert.equal(info.hidden, false);
  assert.equal(explanation.textContent, reason);
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
});


test("Apply ownership contract: contradictory denial", async () => {
  const calls = [];
  const response = {
    ...preview(true),
    ownership: {
      status: "unmanaged",
      write_allowed: false,
      reason: "Manual YAML is protected.",
    },
  };

  const {panel, controls} = makePanel(async message => {
    calls.push(message.type);
    return response;
  });

  await panel._loadPreview();
  assert.equal(controls.apply.disabled, true);
  assert.equal(panel._review, null);

  await panel._applyPreview();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
});

test("Apply ownership contract: missing evidence", async () => {
  const response = preview(true);
  delete response.ownership;

  const {panel, controls} = makePanel(async () => response);
  await panel._loadPreview();

  assert.equal(controls.apply.disabled, true);
  assert.equal(panel._review, null);
});

test("Apply ownership contract: invalid state and digests", async () => {
  const responses = [
    {
      ...preview(true),
      ownership: {status: "unknown", write_allowed: true},
    },
    {
      ...preview(true),
      ownership: {status: "managed", write_allowed: true},
      // Managed requires a known production digest.
      production_sha256: null,
    },
    {
      ...preview(true),
      ownership: {status: "new", write_allowed: true},
      production_sha256: "b".repeat(64),
    },
    {
      ...preview(true),
      preview_sha256: "invalid-digest",
    },
  ];

  for (const response of responses) {
    const {panel, controls} = makePanel(async () => response);
    await panel._loadPreview();
    assert.equal(controls.apply.disabled, true);
    assert.equal(panel._review, null);
  }
});

test("Apply ownership contract: legitimate new and managed", async () => {
  for (const status of ["new", "managed"]) {
    const response = {
      ...preview(true),
      ownership: {status, write_allowed: true},
      production_sha256: status === "managed"
        ? "b".repeat(64)
        : null,
    };

    const {panel, controls} = makePanel(async () => response);
    await panel._loadPreview();

    assert.equal(controls.apply.disabled, false);
    assert.equal(panel._review.preview_sha256, "a".repeat(64));
    assert.equal(
      panel._review.production_sha256,
      response.production_sha256
    );
  }
});

test("Apply ownership contract: explanation clears on recovery", async () => {
  let blocked = true;
  const info = {hidden: true, open: false, title: ""};
  const explanation = {textContent: ""};

  const {panel, controls} = makePanel(async () => blocked
    ? {
        ...preview(true),
        ownership: {
          status: "unmanaged",
          write_allowed: false,
          reason: "Manual YAML is protected.",
        },
      }
    : preview(true)
  );

  const originalQuery = panel.querySelector.bind(panel);
  panel.querySelector = selector => {
    if (selector === "#applyInfo") return info;
    if (selector === "#applyBlockReason") return explanation;
    return originalQuery(selector);
  };

  await panel._loadPreview();
  assert.equal(controls.apply.disabled, true);
  assert.equal(info.hidden, false);
  assert.equal(explanation.textContent, "Manual YAML is protected.");

  info.open = true;
  blocked = false;

  await panel._loadPreview();
  assert.equal(controls.apply.disabled, false);
  assert.equal(info.hidden, true);
  assert.equal(info.open, false);
  assert.equal(explanation.textContent, "");
});


test("Apply reason code: French localization", async () => {
  const response = {
    ...preview(false),
    ownership: {
      status: "unmanaged",
      write_allowed: false,
      reason_code: "unmanaged_output",
      reason: "Existing manual or unregistered YAML is protected.",
    },
  };

  const {panel, controls} = makePanel(async () => response);
  const info = {hidden: true, title: ""};
  const explanation = {textContent: ""};
  const originalQuery = panel.querySelector.bind(panel);

  panel.querySelector = selector => {
    if (selector === "#applyInfo") return info;
    if (selector === "#applyBlockReason") return explanation;
    return originalQuery(selector);
  };

  await panel._loadPreview();

  assert.equal(controls.apply.disabled, true);
  assert.equal(info.hidden, false);
  assert.match(explanation.textContent, /fichier YAML/i);
  assert.match(explanation.textContent, /HVLS/i);
  assert.doesNotMatch(explanation.textContent, /Existing manual/i);
});

test("Apply reason code: language change without new WebSocket", async () => {
  let calls = 0;

  const {panel, controls} = makePanel(async () => {
    calls++;
    return {
      ...preview(false),
      ownership: {
        status: "pending",
        write_allowed: false,
        reason_code: "pending_operation",
        reason: "An incomplete operation requires controlled recovery.",
      },
    };
  });

  const info = {hidden: true, title: ""};
  const explanation = {textContent: ""};
  const originalQuery = panel.querySelector.bind(panel);

  panel.querySelector = selector => {
    if (selector === "#applyInfo") return info;
    if (selector === "#applyBlockReason") return explanation;
    return originalQuery(selector);
  };

  await panel._loadPreview();

  assert.equal(controls.apply.disabled, true);
  assert.match(explanation.textContent, /opération|reprise|récupération/i);

  panel._language = "en";
  panel._updateApplyButton();

  assert.match(explanation.textContent, /operation|recovery/i);
  assert.equal(calls, 1);
  assert.equal(controls.apply.disabled, true);
});

test("Apply reason code: unknown code uses localized fallback", async () => {
  const {panel, controls} = makePanel(async () => ({
    ...preview(true),
    ownership: {
      status: "unexpected",
      write_allowed: true,
      reason_code: "unknown_future_code",
      reason: "Unexpected server state.",
    },
  }));

  const info = {hidden: true, title: ""};
  const explanation = {textContent: ""};
  const originalQuery = panel.querySelector.bind(panel);

  panel.querySelector = selector => {
    if (selector === "#applyInfo") return info;
    if (selector === "#applyBlockReason") return explanation;
    return originalQuery(selector);
  };

  await panel._loadPreview();

  assert.equal(controls.apply.disabled, true);
  assert.equal(info.hidden, false);
  assert.match(explanation.textContent, /Impossible de valider Apply/i);
  assert.doesNotMatch(explanation.textContent, /Unexpected server state/i);
});


test("Guided setup reports unreferenced YAML without assuming an active setup", () => {
  const requests = [];
  const {panel} = makePanel(async message => { requests.push(message); });
  const controls = {};
  for (const id of [
    "migrationGuide", "migrationGuideTitle", "migrationGuideDetected",
    "migrationGuideCandidate", "migrationGuideQuestion",
    "migrationGuideSafety", "migrationIntentNew",
    "migrationIntentExisting", "migrationIntentUnsure",
    "migrationGuideNext",
  ]) {
    controls[id] = {
      textContent: "", hidden: true,
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
    };
  }
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration",
    review_status: "not_applicable",
    source: {
      status: "resolved",
      unreferenced_google_entity_file_present: true,
    },
  }};
  panel._renderMigrationGuide();
  assert.equal(controls.migrationGuide.hidden, false);
  assert.match(controls.migrationGuideDetected.textContent, /gérer et générer/);
  assert.match(controls.migrationGuideCandidate.textContent, /fichier google_assistant_entities.yaml existe/);
  assert.match(controls.migrationGuideNext.textContent, /Choisissez : reprendre/);
  panel._chooseMigrationIntent("existing");
  assert.equal(controls.migrationIntentExisting.attributes["aria-pressed"], "true");
  assert.match(controls.migrationGuideNext.textContent, /labels à reprendre/);
  assert.match(controls.migrationGuideSafety.textContent, /aucune écriture/);
  assert.deepEqual(requests, []);
  panel._chooseMigrationIntent("new");
  assert.match(controls.migrationGuideNext.textContent, /Rien n'a été créé ni écrasé/);
  assert.deepEqual(requests, []);
});

test("Guided setup handles absent candidate and unknown intent", () => {
  const {panel} = makePanel(async () => {});
  const controls = {};
  for (const id of ["migrationGuide", "migrationGuideCandidate", "migrationGuideNext"]) {
    controls[id] = {
      textContent: "", hidden: true,
      setAttribute() {},
    };
  }
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration",
    source: {status: "resolved", unreferenced_google_entity_file_present: false},
  }};
  panel._chooseMigrationIntent("unsure");
  assert.equal(controls.migrationGuide.hidden, false);
  assert.match(controls.migrationGuideCandidate.textContent, /Aucun fichier/);
  assert.match(controls.migrationGuideNext.textContent, /Indiquez le chemin/);
  panel._migrationReport = {diagnostic: {mode: "assisted_migration"}};
  panel._renderMigrationGuide();
  assert.equal(controls.migrationGuide.hidden, true);
  assert.equal(panel._migrationIntent, null);
});

test("Guided intent cannot bypass protected baseline preconditions", async () => {
  const requests = [];
  const {panel} = makePanel(async message => { requests.push(message); });
  const controls = {
    migrationPrepareBaseline: {disabled: false},
    migrationConfirmBaseline: {disabled: false, hidden: false},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration",
    review_status: "not_applicable",
    source: {status: "resolved", unreferenced_google_entity_file_present: true},
    global_blockers: [],
  }};
  panel._migrationIntent = "existing";
  panel._migrationBaselineControls();
  assert.equal(controls.migrationPrepareBaseline.disabled, true);
  await panel._prepareMigrationBaseline();
  assert.deepEqual(requests, []);
  panel._migrationReport = {diagnostic: {
    mode: "assisted_migration", review_status: "blocked",
    source: {status: "ambiguous"}, global_blockers: ["duplicate_mapping_key"],
  }};
  panel._migrationBaselineControls();
  assert.equal(controls.migrationPrepareBaseline.disabled, true);
  await panel._prepareMigrationBaseline();
  assert.deepEqual(requests, []);
});


test("Assistant is the user-facing tab name in French and English", () => {
  assert.match(source, /tabMigration: "Assistant",/);
  const occurrences = source.match(/tabMigration: "Assistant",/g) || [];
  assert.equal(occurrences.length, 2);
  assert.doesNotMatch(source, /tabMigration: "Migration",/);
  // Preserve the internal route so existing navigation remains compatible.
  assert.match(source, /\["migration", "tabMigration"\]/);
  assert.match(source, /id="tab-migration"/);
});


test("Assistant keeps advanced tools out of the initial new-setup path", () => {
  const requests = [];
  const {panel} = makePanel(async request => { requests.push(request); });
  const controls = {
    migrationAdvanced: {open: true},
    migrationRecoveryAttention: {hidden: true, textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {mode: "new_configuration",
    source: {status: "resolved"}}};
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, false);
  assert.equal(controls.migrationRecoveryAttention.hidden, true);
  assert.deepEqual(requests, []);
});

test("Assistant leaves the migration tools reachable when migration is detected", () => {
  const {panel} = makePanel(async () => {});
  const controls = {
    migrationAdvanced: {open: false},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {mode: "assisted_migration"}};
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, true);
  controls.migrationAdvanced.open = false; // User can close it manually.
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, false); // No forced reset.
  panel._migrationReport.diagnostic.mode = "new_configuration";
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, false);
});

test("Assistant raises a visible alert and opens tools for interrupted recovery", () => {
  const {panel} = makePanel(async () => {});
  const controls = {
    migrationAdvanced: {open: false},
    migrationRecoveryAttention: {hidden: true, textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {mode: "new_configuration"}};
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, false);
  panel._migrationRecoveryReport = {status: "review_required", needs_review: true};
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, true);
  assert.equal(controls.migrationRecoveryAttention.hidden, false);
  assert.match(controls.migrationRecoveryAttention.textContent, /vérification/);
});

test("Assistant changes step text after local user choice, without writes", () => {
  const requests = [];
  const {panel} = makePanel(async request => { requests.push(request); });
  const controls = {};
  for (const id of ["migrationGuide", "migrationGuideStep", "migrationGuideNext"]) {
    controls[id] = {hidden: true, textContent: "", setAttribute() {}};
  }
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"}
  }};
  panel._renderMigrationGuide();
  assert.match(controls.migrationGuideStep.textContent, /Étape 1 —/);
  panel._chooseMigrationIntent("existing");
  assert.match(controls.migrationGuideStep.textContent, /Étape 2 sur 3/);
  assert.match(controls.migrationGuideNext.textContent, /labels à reprendre/);
  panel._chooseMigrationIntent("new");
  assert.match(controls.migrationGuideStep.textContent, /Étape 2 sur 2/);
  assert.deepEqual(requests, []);
});

test("Assistant markup keeps diagnostics behind a native accessible details panel", () => {
  const assistant = source.slice(
    source.indexOf('<section id="tab-migration"'),
    source.indexOf('<section id="tab-backups"')
  );
  assert.match(assistant, /<details id="migrationAdvanced">\s*<summary>/);
  assert.ok(assistant.indexOf('id="migrationGuide"') <
    assistant.indexOf('id="migrationAdvanced"'));
  assert.ok(assistant.indexOf('id="migrationAnalyze"') <
    assistant.indexOf('id="migrationAdvanced"'));
  assert.ok(assistant.indexOf('id="migrationStatus"') >
    assistant.indexOf('id="migrationAdvanced"'));
  assert.match(assistant, /<\/details>/);
});


test("Assistant proposes detected file and inspects it without migration writes", async () => {
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req);
    return {
      read_only: true, source_active_verified: false,
      migration_authorized: false, stage_allowed: false,
      apply_allowed: false, cutover_allowed: false,
      status: "parsed",
      counts: {
        entries: 52, requested_exposure: 51,
        explicitly_excluded: 1, entries_with_anomalies: 0,
      },
      issue_examples: [],
    };
  });
  const ids = [
    "migrationGuide", "migrationGuideCandidate", "migrationGuideDetected",
    "migrationGuideQuestion", "assistantFileSection", "assistantFilePath",
    "assistantFileCheck", "assistantFileResult", "assistantFileSafety",
    "assistantFileHint", "migrationGuideNext",
  ];
  const controls = Object.fromEntries(ids.map(id => [id, {
    textContent: "", hidden: false, value: "", disabled: false,
    setAttribute() {},
  }]));
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {
      status: "resolved", unreferenced_google_entity_file_present: true,
    },
    counts: {explicit_yaml_entries: 0},
  }};
  panel._renderMigrationGuide();
  assert.equal(controls.assistantFileSection.hidden, true);
  panel._chooseMigrationIntent("existing");
  assert.equal(controls.assistantFileSection.hidden, false);
  assert.equal(controls.assistantFilePath.value, "google_assistant_entities.yaml");
  assert.equal(controls.assistantFileCheck.disabled, false);
  assert.match(controls.migrationGuideQuestion.textContent, /Reprise d.un fichier/);
  assert.doesNotMatch(controls.migrationGuideQuestion.textContent, /Comment souhaitez-vous/);
  assert.equal(calls.length, 0);
  await panel._checkAssistantEntityFile();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/inspect_assistant_entity_file",
  ]);
  assert.equal(calls[0].path, "google_assistant_entities.yaml");
  assert.match(controls.assistantFileResult.textContent, /52 entité/);
  assert.match(controls.assistantFileResult.textContent, /0 anomalie/);
  assert.match(controls.assistantFileSafety.textContent, /Aucune migration/);
});

test("Assistant offers packages as unsupported other configuration", () => {
  const {panel} = makePanel(async () => {});
  const ids = [
    "migrationGuide", "migrationGuideCandidate", "migrationGuideDetected",
    "migrationGuideQuestion", "assistantFileSection", "assistantFilePath",
    "assistantFileCheck", "assistantFileHint", "migrationGuideNext",
    "migrationIntentNew", "migrationIntentExisting", "migrationIntentUnsure",
  ];
  const controls = Object.fromEntries(ids.map(id => [id, {
    textContent: "", hidden: false, value: "", disabled: false,
    setAttribute() {},
  }]));
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "unsupported", source: {status: "ambiguous"},
    global_blockers: ["packages_not_yet_supported"],
  }};
  panel._renderMigrationGuide();
  assert.equal(controls.migrationGuide.hidden, false);
  assert.match(controls.migrationGuideCandidate.textContent, /packages/);
  assert.equal(controls.assistantFileSection.hidden, false);
  assert.equal(controls.assistantFilePath.value, "");
  assert.equal(controls.assistantFileCheck.disabled, true);
  assert.equal(controls.migrationIntentNew.hidden, true);
});

test("Assistant rejects a forged inspection claiming migration authorization", async () => {
  const {panel} = makePanel(async () => ({
    read_only: true, source_active_verified: false,
    migration_authorized: true, stage_allowed: true,
    apply_allowed: true, cutover_allowed: true, status: "parsed",
  }));
  const result = {textContent: ""};
  panel.querySelector = sel => sel === "#assistantFileResult" ? result : null;
  panel._migrationReport = {diagnostic: {mode: "new_configuration"}};
  panel._migrationIntent = "existing";
  panel._assistantFilePath = "entities.yaml";
  await panel._checkAssistantEntityFile();
  assert.equal(panel._assistantFileReport, null);
  assert.match(result.textContent, /indisponible/);
});

test("Assistant discards a stale file-check response after path change", async () => {
  const pending = deferred();
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req);
    return pending.promise;
  });
  const status = {textContent: ""};
  panel.querySelector = sel => sel === "#assistantFileResult" ? status : null;
  panel._migrationReport = {diagnostic: {mode: "new_configuration"}};
  panel._migrationIntent = "existing";
  panel._assistantFilePath = "old.yaml";
  const checking = panel._checkAssistantEntityFile();
  panel._assistantFilePath = "new.yaml";
  panel._assistantFileRequestId++;
  panel._assistantFileChecking = false;
  panel._assistantFileReport = null;
  pending.resolve({
    read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false, status: "parsed",
    counts: {entries: 1},
  });
  await checking;
  assert.equal(calls[0].path, "old.yaml");
  assert.equal(panel._assistantFileReport, null);
  assert.equal(panel._assistantFileChecking, false);
});

test("Assistant examples show both Google Assistant include shapes", () => {
  assert.match(source, /id="assistantFileExamples"/);
  assert.match(source, /google_assistant: !include google_assistant.yaml/);
  assert.match(source, /entity_config: !include google_assistant_entities.yaml/);
  assert.match(source, /id="assistantFilePath"/);
  assert.match(source, /id="assistantFileCheck"/);
});

test("Assistant presents explicit exposure indicators and cautions independently", () => {
  const {panel} = makePanel(async () => ({}));
  const ids = [
    "assistantFileResult", "assistantFileMetrics", "assistantFileUnsetExplanation",
    "assistantFileConclusion", "assistantMetricEntries", "assistantMetricTrue",
    "assistantMetricFalse", "assistantMetricUnset", "assistantMetricIssues",
    "assistantLabelEntries", "assistantLabelTrue", "assistantLabelFalse",
    "assistantLabelUnset", "assistantLabelIssues",
  ];
  const controls = Object.fromEntries(ids.map(id => [id, {
    textContent: "", hidden: true, setAttribute(key, value) {this[key] = value;},
  }]));
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {mode: "new_configuration"}};
  panel._assistantFileReport = {
    read_only: true, status: "parsed", source_active_verified: false,
    counts: {
      entries: 52, requested_exposure: 52,
      explicitly_exposed: 28, explicitly_excluded: 0,
      expose_not_set: 24, invalid_expose: 0,
      entries_with_anomalies: 0,
    },
    issue_examples: [],
  };
  panel._renderAssistantFileStatus();
  assert.equal(controls.assistantFileMetrics.hidden, false);
  assert.equal(controls.assistantMetricEntries.textContent, "52");
  assert.equal(controls.assistantMetricTrue.textContent, "28");
  assert.equal(controls.assistantMetricFalse.textContent, "0");
  assert.equal(controls.assistantMetricUnset.textContent, "24");
  assert.equal(controls.assistantMetricIssues.textContent, "0");
  assert.equal(controls.assistantFileUnsetExplanation.hidden, false);
  assert.match(controls.assistantFileUnsetExplanation.textContent,
    /n'est pas considérée comme expose: true/);
  assert.equal(controls.assistantFileConclusion.hidden, false);
  assert.match(controls.assistantFileConclusion.textContent,
    /absence de raccordement Google Assistant/i);
  assert.match(controls.assistantFileResult.textContent, /52 entité/);
  assert.match(controls.assistantFileResult.textContent, /0 anomalie/);

  panel._assistantFileReport = null;
  panel._renderAssistantFileStatus();
  assert.equal(controls.assistantFileMetrics.hidden, true);
  assert.equal(controls.assistantFileConclusion.hidden, true);
});

test("Assistant keeps packages as Other after standalone YAML parses", () => {
  const {panel} = makePanel(async () => ({}));
  const status = {textContent: ""};
  const conclusion = {textContent: "", hidden: true};
  panel.querySelector = sel => ({
    "#assistantFileResult": status,
    "#assistantFileConclusion": conclusion,
  })[sel] || null;
  panel._migrationReport = {diagnostic: {
    mode: "unsupported", global_blockers: ["packages_not_yet_supported"],
  }};
  panel._assistantFileReport = {
    status: "parsed", counts: {
      entries: 1, requested_exposure: 1, explicitly_exposed: 1,
      explicitly_excluded: 0, expose_not_set: 0,
      entries_with_anomalies: 0,
    },
  };
  panel._renderAssistantFileStatus();
  assert.equal(conclusion.hidden, false);
  assert.match(conclusion.textContent, /Autre configuration/);
  assert.match(conclusion.textContent, /ne peuvent pas être migrés automatiquement/);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Assistant selected path labels follow the choice without changing eligibility", () => {
  const {panel} = makePanel(async () => ({}));
  const ids = [
    "migrationGuide", "migrationGuideCandidate", "migrationGuideDetected",
    "migrationGuideQuestion", "assistantFileSection", "assistantFilePath",
    "assistantFileCheck", "migrationGuideNext",
  ];
  const controls = Object.fromEntries(ids.map(id => [id, {
    textContent: "", hidden: false, value: "", disabled: false,
    setAttribute() {},
  }]));
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {
      status: "resolved", unreferenced_google_entity_file_present: true,
    },
  }};
  panel._renderMigrationGuide();
  assert.match(controls.migrationGuideQuestion.textContent, /Comment souhaitez-vous/);
  panel._chooseMigrationIntent("existing");
  assert.match(controls.migrationGuideQuestion.textContent, /Reprise d.un fichier/);
  panel._chooseMigrationIntent("unsure");
  assert.match(controls.migrationGuideQuestion.textContent, /Choix d.un autre fichier/);
  panel._chooseMigrationIntent("new");
  assert.match(controls.migrationGuideQuestion.textContent, /nouvelle configuration/);
  assert.equal(controls.assistantFileSection.hidden, true);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Assistant metrics CSS and accessible labels remain responsive", () => {
  assert.match(source, /#assistantFilePath\s*\{[\s\S]*?flex:\s*1 1 30rem/);
  assert.match(source, /\.assistant-file-metrics\s*\{[\s\S]*?grid-template-columns/);
  assert.match(source, /\.assistant-file-metrics\[hidden\]\s*\{\s*display:\s*none/);
  for (const id of ["Entries", "True", "False", "Unset", "Issues"]) {
    assert.ok(source.includes('id="assistantMetric' + id + '"'));
    assert.ok(source.includes('id="assistantLabel' + id + '"'));
  }
});

test("Assistant origin guide appears only after safe independent inspection", () => {
  const calls = [];
  const {panel} = makePanel(async req => { calls.push(req); });
  const ids = [
    "assistantProvenance", "assistantProvenanceStep", "assistantProvenanceQuestion",
    "assistantProvenanceVerifiedTitle", "assistantProvenanceVerified",
    "assistantProvenanceMissingTitle", "assistantProvenanceMissing",
    "assistantProvenanceNextTitle", "assistantProvenanceSafety",
    "assistantProvenanceOld", "assistantProvenanceUnknown", "assistantProvenanceNew",
    "assistantProvenanceNext", "assistantProvenanceAnomalies",
  ];
  const controls = Object.fromEntries(ids.map(id => [id, {
    hidden: true, textContent: "", setAttribute(name, value) {this[name] = value;},
  }]));
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "existing";
  panel._renderAssistantProvenance();
  assert.equal(controls.assistantProvenance.hidden, true);

  panel._assistantFileReport = {
    read_only: true, status: "parsed", source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
    counts: {entries_with_anomalies: 0},
  };
  panel._renderAssistantProvenance();
  assert.equal(controls.assistantProvenance.hidden, false);
  assert.match(controls.assistantProvenanceVerified.textContent,
    /fichier YAML a été lu/);
  assert.match(controls.assistantProvenanceMissing.textContent,
    /L.es règles globales d.exposition|Les règles globales d.exposition/i);
  assert.match(controls.assistantProvenanceNext.textContent,
    /Choisissez une provenance/);
  panel._chooseAssistantProvenance("old");
  assert.equal(controls.assistantProvenanceOld["aria-pressed"], "true");
  assert.equal(controls.assistantProvenanceUnknown["aria-pressed"], "false");
  assert.match(controls.assistantProvenanceNext.textContent,
    /ancienne sauvegarde de configuration.yaml/);
  assert.match(controls.assistantProvenanceSafety.textContent,
    /non enregistrée/);
  assert.equal(calls.length, 0);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Assistant anomalous entries remain inspectable and origin is only a recollection", () => {
  const {panel} = makePanel(async () => { throw Error("must not call WS"); });
  const ids = [
    "assistantProvenance", "assistantProvenanceOld",
    "assistantProvenanceUnknown", "assistantProvenanceNew",
    "assistantProvenanceNext", "assistantProvenanceAnomalies",
  ];
  const controls = Object.fromEntries(ids.map(id => [id, {
    hidden: true, textContent: "", setAttribute(name, value) {this[name] = value;},
  }]));
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "unsure";
  panel._assistantFileReport = {
    read_only: true, status: "review_required", source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
    counts: {entries_with_anomalies: 3},
  };
  panel._chooseAssistantProvenance("unknown");
  assert.equal(controls.assistantProvenance.hidden, false);
  assert.equal(controls.assistantProvenanceUnknown["aria-pressed"], "true");
  assert.match(controls.assistantProvenanceAnomalies.textContent, /3 entité/);
  assert.equal(controls.assistantProvenanceAnomalies.hidden, false);
  assert.match(controls.assistantProvenanceNext.textContent,
    /vos sauvegardes Home Assistant/);
  panel._chooseAssistantProvenance("new");
  assert.equal(controls.assistantProvenanceNew["aria-pressed"], "true");
  assert.match(controls.assistantProvenanceNext.textContent,
    /n'est pas une migration attestée/);
  assert.equal(panel._migrationIntent, "unsure");
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Assistant origin cannot be selected before file review or in packages", () => {
  const {panel} = makePanel(async () => {});
  const section = {hidden: false};
  panel.querySelector = sel => sel === "#assistantProvenance" ? section : null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "existing";
  panel._assistantFileReport = {status: "blocked", read_only: true};
  panel._chooseAssistantProvenance("old");
  assert.equal(panel._assistantProvenanceChoice, undefined);
  panel._renderAssistantProvenance();
  assert.equal(section.hidden, true);

  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
  };
  panel._migrationReport = {diagnostic: {
    mode: "unsupported", global_blockers: ["packages_not_yet_supported"],
  }};
  panel._chooseAssistantProvenance("old");
  assert.equal(panel._assistantProvenanceChoice, undefined);
  panel._renderAssistantProvenance();
  assert.equal(section.hidden, true);

  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._assistantFileReport.migration_authorized = true;
  panel._chooseAssistantProvenance("old");
  assert.equal(panel._assistantProvenanceChoice, undefined);
  panel._renderAssistantProvenance();
  assert.equal(section.hidden, true);
});

test("Assistant resets local recollection when file path, intent or snapshot changes", async () => {
  const {panel} = makePanel(async () => ({diagnostic: {mode: "new_configuration"}}));
  const controls = {
    assistantFilePath: {value: "entities.yaml"},
    assistantFileCheck: {disabled: false},
    migrationAnalyze: {disabled: false},
    migrationStatus: {textContent: ""},
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._assistantProvenanceChoice = "old";
  panel._assistantFilePath = "entities.yaml";
  panel._assistantFileReport = {status: "parsed"};
  panel._chooseMigrationIntent("unsure");
  assert.equal(panel._assistantProvenanceChoice, null);
  panel._assistantProvenanceChoice = "old";
  panel._migrationIntent = "existing";
  await panel._loadMigrationReview();
  assert.equal(panel._assistantProvenanceChoice, null);
  assert.equal(panel._assistantFileReport, null);
});

test("Assistant origin guide is a local non-authorizing step with bilingual copy", () => {
  assert.match(source, /id="assistantProvenance" hidden/);
  assert.match(source, /_assistantProvenanceAvailable\(\)/);
  assert.match(source, /report\?\.source_active_verified === false/);
  assert.match(source, /report\?\.cutover_allowed === false/);
  assert.match(source, /_assistantProvenanceChoice = null/);
  assert.match(source, /aria-pressed="false"/);
  assert.match(source, /Étape 3 sur 3/);
  assert.match(source, /Step 3 of 3/);
});

test("Assistant provenance sections have separate accessible headings and safe manual guide", () => {
  const slice = source.slice(
    source.indexOf('<section id="assistantProvenance"'),
    source.indexOf('<div id="assistantSourceDetected"')
  );
  assert.match(slice, /class="assistant-provenance-facts"/);
  assert.match(slice, /<section class="assistant-provenance-card"\s+aria-labelledby="assistantProvenanceVerifiedTitle">/);
  assert.match(slice, /<section class="assistant-provenance-card"\s+aria-labelledby="assistantProvenanceMissingTitle">/);
  assert.match(slice, /<section class="assistant-provenance-card"\s+aria-labelledby="assistantProvenanceNextTitle">/);
  assert.match(slice, /<h4 id="assistantProvenanceVerifiedTitle">/);
  assert.match(slice, /<h4 id="assistantProvenanceMissingTitle">/);
  assert.match(slice, /<h4 id="assistantProvenanceNextTitle">/);
  assert.match(slice, /<details id="assistantProvenanceHelp" hidden>/);
  assert.match(slice, /<ol>/);
  assert.ok(!slice.includes('class="assistant-provenance-facts"><li>'));
  assert.match(source, /#assistantProvenanceHelp\[hidden\]\s*\{ display: none; \}/);
});

test("Assistant backup guide appears only for old or unknown local provenance", () => {
  const calls = [];
  const {panel} = makePanel(async request => {calls.push(request);});
  const ids = [
    "assistantProvenance", "assistantProvenanceOld", "assistantProvenanceUnknown",
    "assistantProvenanceNew", "assistantProvenanceNext", "assistantProvenanceHelp",
    "assistantProvenanceSource", "assistantProvenanceChecklistTrigger",
    "assistantProvenanceChecklistIntro", "assistantProvenanceChecklist1",
    "assistantProvenanceChecklist2", "assistantProvenanceChecklist3",
    "assistantProvenanceChecklist4", "assistantProvenanceChecklistEnd",
  ];
  const controls = Object.fromEntries(ids.map(id => [id, {
    hidden: false, open: false, textContent: "",
    setAttribute(name, value) {this[name] = value;},
  }]));
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "existing";
  panel._assistantFilePath = "google_assistant_entities.yaml";
  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
    counts: {entries: 52, entries_with_anomalies: 0},
  };
  panel._renderAssistantProvenance();
  assert.equal(controls.assistantProvenanceHelp.hidden, true);
  assert.match(controls.assistantProvenanceSource.textContent, /google_assistant_entities.yaml/);
  panel._chooseAssistantProvenance("old");
  assert.equal(controls.assistantProvenanceHelp.hidden, false);
  assert.match(controls.assistantProvenanceChecklist1.textContent,
    /sans la restaurer/);
  assert.match(controls.assistantProvenanceChecklist2.textContent,
    /configuration.yaml/);
  assert.match(controls.assistantProvenanceChecklist3.textContent,
    /entity_config:/);
  assert.match(controls.assistantProvenanceChecklist4.textContent,
    /expose_by_default/);
  assert.match(controls.assistantProvenanceChecklist4.textContent,
    /Ne communiquez ni secrets/);
  assert.match(controls.assistantProvenanceChecklistEnd.textContent,
    /ne démontre pas/);

  controls.assistantProvenanceHelp.open = true;
  panel._chooseAssistantProvenance("unknown");
  assert.equal(controls.assistantProvenanceHelp.hidden, false);
  assert.equal(controls.assistantProvenanceHelp.open, false);

  controls.assistantProvenanceHelp.open = true;
  panel._chooseAssistantProvenance("new");
  assert.equal(controls.assistantProvenanceHelp.hidden, true);
  assert.equal(controls.assistantProvenanceHelp.open, false);
  assert.match(controls.assistantProvenanceNext.textContent, /nouvelle configuration/);
  assert.deepEqual(calls, []);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Assistant hides backup guide after file check becomes invalid", () => {
  const {panel} = makePanel(async () => {});
  const controls = {
    assistantProvenance: {hidden: false},
    assistantProvenanceHelp: {hidden: false, open: true},
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "existing";
  panel._assistantProvenanceChoice = "old";
  panel._assistantFileReport = {status: "blocked"};
  panel._renderAssistantProvenance();
  assert.equal(controls.assistantProvenance.hidden, true);
  // A hidden parent suppresses the entire guide even if it was expanded earlier.
  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false, apply_allowed: false,
    cutover_allowed: false,
  };
  panel._renderAssistantProvenance();
  assert.equal(controls.assistantProvenance.hidden, false);
  panel._assistantFileReport = null;
  panel._renderAssistantProvenance();
  assert.equal(controls.assistantProvenance.hidden, true);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Assistant manual backup instructions work in English without private file access", () => {
  const requests = [];
  const {panel} = makePanel(async req => requests.push(req));
  const controls = {
    assistantProvenance: {hidden: true},
    assistantProvenanceHelp: {hidden: true, open: false},
    assistantProvenanceChecklistIntro: {textContent: ""},
    assistantProvenanceChecklistEnd: {textContent: ""},
    assistantProvenanceNext: {textContent: ""},
    assistantProvenanceOld: {textContent: "", setAttribute() {}},
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._language = "en";
  panel._migrationIntent = "existing";
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
  };
  panel._chooseAssistantProvenance("old");
  assert.equal(controls.assistantProvenanceHelp.hidden, false);
  assert.match(controls.assistantProvenanceChecklistIntro.textContent,
    /does not search, extract or modify/);
  assert.match(controls.assistantProvenanceChecklistEnd.textContent,
    /does not prove/);
  assert.deepEqual(requests, []);
});

test("Historical config review requires a prior non-authorizing entity inspection", async () => {
  const requests = [];
  const {panel} = makePanel(async req => {
    requests.push(req);
    return {};
  });
  const controls = {
    assistantHistorical: {hidden: true},
    assistantHistoryInspect: {disabled: false, textContent: ""},
    assistantHistoryResult: {
      children: [], replaceChildren() {this.children = [];},
      appendChild(child) {this.children.push(child);},
    },
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "existing";
  panel._assistantFilePath = "google_assistant_entities.yaml";
  panel._assistantProvenanceChoice = "old";
  await panel._inspectHistoricalYaml();
  assert.equal(requests.length, 0);
  panel._renderAssistantHistoryStatus();
  assert.equal(controls.assistantHistorical.hidden, true);

  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
  };
  panel._renderAssistantHistoryStatus();
  assert.equal(controls.assistantHistorical.hidden, false);
  assert.match(controls.assistantHistoryResult.children[0].textContent,
    /Aucune ancienne copie/);

  panel._assistantProvenanceChoice = "new";
  panel._renderAssistantHistoryStatus();
  assert.equal(controls.assistantHistorical.hidden, true);
  panel._assistantProvenanceChoice = "unknown";
  panel._renderAssistantHistoryStatus();
  assert.equal(controls.assistantHistorical.hidden, false);
  panel._migrationReport = {diagnostic: {
    mode: "unsupported", global_blockers: ["packages_not_yet_supported"],
  }};
  panel._renderAssistantHistoryStatus();
  assert.equal(controls.assistantHistorical.hidden, true);
});

test("Historical review makes one admin read-only request and shows bounded evidence", async () => {
  const requests = [];
  const {panel} = makePanel(async req => {
    requests.push(req);
    return {
      schema_version: 1, read_only: true, status: "parsed",
      source_active_verified: false, historical_runtime_verified: false,
      google_home_state_verified: false, migration_authorized: false,
      stage_allowed: false, apply_allowed: false, cutover_allowed: false,
      declaration: "included",
      rules: {
        expose_by_default: "false", expose_by_default_explicit: true,
        exposed_domains_declared: true, exposed_domains: ["light", "switch"],
      },
      entity_source: {
        mode: "include", path: "google_assistant_entities.yaml",
        path_relation: "same", content_relation: "identical",
        file_present: true,
        counts: {entries: 52, entries_with_anomalies: 0},
      },
      issues: [],
    };
  });
  const controls = {
    assistantHistorical: {hidden: true},
    assistantHistoryInspect: {disabled: false, textContent: ""},
    assistantHistoryResult: {
      children: [],
      replaceChildren() {this.children = [];},
      appendChild(child) {this.children.push(child);},
    },
    assistantHistorySafety: {textContent: ""},
  };
  panel.querySelector = sel => controls[sel.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "existing";
  panel._assistantProvenanceChoice = "old";
  panel._assistantFilePath = "google_assistant_entities.yaml";
  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
  };
  await panel._inspectHistoricalYaml();
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ["entity_path", "type"]);
  assert.equal(requests[0].type,
    "ha_voice_label_sync/inspect_historical_google_yaml");
  assert.equal(requests[0].entity_path, "google_assistant_entities.yaml");
  const message = controls.assistantHistoryResult.children
    .map(child => child.textContent).join(" ");
  assert.match(message, /fichier !include/);
  assert.match(message, /expose_by_default = false/);
  assert.match(message, /light, switch/);
  assert.match(message, /chemin identique/);
  assert.match(message, /empreintes identiques/);
  assert.match(message, /52 entité/);
  assert.match(controls.assistantHistorySafety.textContent, /Aucune migration/);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Historical review displays missing staging folder without exposing backend errors", async () => {
  const {panel} = makePanel(async () => ({
    read_only: true, status: "not_found",
    reason: "historical_review_folder_missing",
    source_active_verified: false, historical_runtime_verified: false,
    google_home_state_verified: false, migration_authorized: false,
    stage_allowed: false, apply_allowed: false, cutover_allowed: false,
  }));
  const summary = {
    children: [], replaceChildren() {this.children = [];},
    appendChild(child) {this.children.push(child);},
  };
  panel.querySelector = sel => sel === "#assistantHistoryResult"
    ? summary : sel === "#assistantHistorical" ? {hidden: false} : null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "unsure";
  panel._assistantProvenanceChoice = "unknown";
  panel._assistantFilePath = "google_assistant_entities.yaml";
  panel._assistantFileReport = {
    status: "review_required", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
  };
  await panel._inspectHistoricalYaml();
  assert.match(summary.children.map(x => x.textContent).join(" "),
    /dossier hvls-history-review est absent/);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Historical review rejects false authority and stale asynchronous responses", async () => {
  const wait = deferred();
  const calls = [];
  const {panel} = makePanel(async req => {
    calls.push(req);
    return wait.promise;
  });
  const result = {
    children: [], replaceChildren() {this.children = [];},
    appendChild(child) {this.children.push(child);},
  };
  panel.querySelector = sel => sel === "#assistantHistoryResult"
    ? result : sel === "#assistantHistorical" ? {hidden: false} : null;
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved"},
  }};
  panel._migrationIntent = "existing";
  panel._assistantFilePath = "old.yaml";
  panel._assistantProvenanceChoice = "old";
  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
  };
  const task = panel._inspectHistoricalYaml();
  panel._assistantFilePath = "new.yaml";
  panel._invalidateHistoricalReview();
  wait.resolve({
    status: "parsed", read_only: true,
    source_active_verified: false, historical_runtime_verified: false,
    google_home_state_verified: false, migration_authorized: false,
    stage_allowed: false, apply_allowed: false, cutover_allowed: false,
  });
  await task;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].entity_path, "old.yaml");
  assert.equal(panel._assistantHistoryReport, null);

  panel._assistantFilePath = "new.yaml";
  panel._hass.callWS = async () => ({
    status: "parsed", read_only: true,
    source_active_verified: true, historical_runtime_verified: false,
    google_home_state_verified: false, migration_authorized: true,
    stage_allowed: true, apply_allowed: true, cutover_allowed: true,
  });
  await panel._inspectHistoricalYaml();
  assert.equal(panel._assistantHistoryReport, null);
  assert.equal(panel._assistantHistoryError, true);
  assert.match(result.children.map(x => x.textContent).join(" "),
    /indisponible/);
});

test("Historical review is separate from migration approvals and has localized copy", () => {
  assert.match(source, /id="assistantHistorical" hidden/);
  assert.match(source, /id="assistantHistoryInspect"/);
  assert.match(source, /_assistantHistoryEligible\(\)/);
  assert.match(source, /historical_runtime_verified === false/);
  assert.match(source, /cutover_allowed === false/);
  assert.match(source, /this\._invalidateHistoricalReview\(\)/);
  assert.match(source, /hvls-history-review/);
  assert.match(source, /Historical declaration/);
  assert.match(source, /Déclaration historique/);
});


function standardAdoptionFixture(callWS, confirm = () => true) {
  const {panel} = makePanel(callWS, confirm);
  const nodes = {
    assistantAdoption: {hidden: true},
    assistantAdoptTitle: {textContent: ""},
    assistantAdoptIntro: {textContent: ""},
    assistantAdoptSummary: {textContent: ""},
    assistantAdoptLimits: {textContent: ""},
    assistantAdoptRefresh: {textContent: "", disabled: false},
    assistantAdoptReview: {textContent: ""},
    assistantAdoptApply: {textContent: "", disabled: false},
    assistantAdoptNeedsReview: {textContent: "", hidden: true},
    assistantAdoptResult: {textContent: ""},
    assistantAdoptRows: {
      children: [], replaceChildren() {this.children = [];},
      appendChild(child) {this.children.push(child);},
    },
  };
  panel.querySelector = selector => nodes[selector.slice(1)] || null;
  panel.querySelectorAll = () => [];
  panel._updateApplyButton = () => {};
  panel._migrationReport = {diagnostic: {
    mode: "new_configuration", source: {status: "resolved",
      unreferenced_google_entity_file_present: true},
  }};
  panel._migrationIntent = "existing";
  panel._assistantFilePath = "google_assistant_entities.yaml";
  panel._assistantFileReport = {
    status: "parsed", read_only: true, source_active_verified: false,
    migration_authorized: false, stage_allowed: false,
    apply_allowed: false, cutover_allowed: false,
    file_sha256: "a".repeat(64), adoption_entries_complete: true,
    counts: {entries: 5, entries_with_anomalies: 0},
    adoption_entries: [
      {entity_id: "light.new", exposure: "expose",
        has_customizations: false, reasons: []},
      {entity_id: "light.already", exposure: "expose",
        has_customizations: false, reasons: []},
      {entity_id: "switch.excluded", exposure: "exclude",
        has_customizations: false, reasons: []},
      {entity_id: "light.custom", exposure: "expose",
        has_customizations: true, reasons: []},
      {entity_id: "light.unknown", exposure: "unset",
        has_customizations: false, reasons: []},
    ],
  };
  panel._entityCatalog = {
    label_ids: ["hvls"], entities: [
      {entity_id: "light.new", eligible: true, has_label: false},
      {entity_id: "light.already", eligible: true, has_label: true},
      {entity_id: "switch.excluded", eligible: true, has_label: false},
      {entity_id: "light.custom", eligible: true, has_label: false},
      {entity_id: "light.unknown", eligible: true, has_label: false},
    ],
  };
  return {panel, nodes};
}

function cloneAdoptionReport(obj) {
  return JSON.parse(JSON.stringify(obj));
}

test("Unreferenced YAML offers HVLS label reuse, not a Google connectivity blocker", () => {
  const {panel, nodes} = standardAdoptionFixture(async () => {
    throw Error("No requests expected");
  });
  const plan = panel._assistantAdoptionPlan();
  assert.deepEqual(Array.from(plan.candidates), ["light.new"]);
  assert.equal(plan.totals.ready, 1);
  assert.equal(plan.totals.already, 1);
  assert.equal(plan.totals.excluded, 1);
  assert.equal(plan.totals.review, 2);
  panel._renderAssistantAdoption();
  assert.equal(nodes.assistantAdoption.hidden, false);
  assert.match(nodes.assistantAdoptSummary.textContent, /1 à ajouter/);
  assert.match(nodes.assistantAdoptIntro.textContent, /sans configurer Google Assistant/);
  assert.equal(nodes.assistantAdoptApply.disabled, false);
  assert.equal(nodes.assistantAdoptRows.children.length, 5);
  assert.match(nodes.assistantAdoptRows.children[2].textContent, /aucun ajout/);
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Confirmed reuse only updates an explicit compatible entity using existing API", async () => {
  const calls = [];
  const {panel, nodes} = standardAdoptionFixture(async req => {
    calls.push(req);
    if (req.type === "ha_voice_label_sync/inspect_assistant_entity_file") {
      return cloneAdoptionReport(panel._assistantFileReport);
    }
    if (req.type === "ha_voice_label_sync/set_entity_label") {
      assert.equal(req.entity_id, "light.new");
      assert.equal(req.enabled, true);
      assert.equal(req.expected_enabled, false);
      panel._entityCatalog.entities[0].has_label = true;
      return {entity_id: req.entity_id, has_label: true, changed: true};
    }
    throw Error("Unexpected operation");
  });
  let previews = 0;
  panel._loadEntities = async () => true;
  panel._generatePreview = async () => { previews++; };
  await panel._adoptAssistantFile();
  assert.deepEqual(calls.map(req => req.type), [
    "ha_voice_label_sync/inspect_assistant_entity_file",
    "ha_voice_label_sync/set_entity_label",
  ]);
  assert.equal(previews, 1);
  assert.match(nodes.assistantAdoptResult.textContent, /1 label/);
  assert.deepEqual(Array.from(panel._assistantAdoptionPlan().candidates), []);
});

test("Reuse cancel sends nothing; changed YAML rejects writes before labels", async () => {
  const requests = [];
  const {panel} = standardAdoptionFixture(async req => {
    requests.push(req);
  }, () => false);
  await panel._adoptAssistantFile();
  assert.equal(requests.length, 0);
  const {panel: current, nodes} = standardAdoptionFixture(async req => {
    requests.push(req);
    return {...cloneAdoptionReport(current._assistantFileReport),
      file_sha256: "b".repeat(64)};
  });
  current._loadEntities = async () => true;
  await current._adoptAssistantFile();
  assert.deepEqual(requests.map(req => req.type),
    ["ha_voice_label_sync/inspect_assistant_entity_file"]);
  assert.match(nodes.assistantAdoptResult.textContent, /Fichier ou catalogue modifié/);
});

test("Reuse rejects forged authority, incomplete inventory or ambiguous label", async () => {
  const {panel, nodes} = standardAdoptionFixture(async () => {
    throw Error("No WebSocket allowed");
  });
  panel._assistantFileReport.stage_allowed = true;
  assert.equal(panel._assistantAdoptionPlan(), null);
  panel._renderAssistantAdoption();
  assert.equal(nodes.assistantAdoption.hidden, true);
  panel._assistantFileReport.stage_allowed = false;
  panel._assistantFileReport.adoption_entries_complete = false;
  panel._renderAssistantAdoption();
  assert.equal(nodes.assistantAdoptApply.disabled, true);
  panel._assistantFileReport.adoption_entries_complete = true;
  panel._entityCatalog.label_ids = ["one", "two"];
  panel._renderAssistantAdoption();
  assert.equal(nodes.assistantAdoptApply.disabled, true);
  await panel._adoptAssistantFile();
});

test("An uncertain second label update stops without hiding first success", async () => {
  const calls = [];
  const {panel, nodes} = standardAdoptionFixture(async req => {
    calls.push(req);
    if (req.type === "ha_voice_label_sync/inspect_assistant_entity_file") {
      return cloneAdoptionReport(panel._assistantFileReport);
    }
    if (req.type === "ha_voice_label_sync/set_entity_label") {
      if (req.entity_id === "light.new") {
        return {entity_id: req.entity_id, has_label: true, changed: true};
      }
      throw Error("Simulated failure");
    }
    throw Error("Unexpected operation");
  });
  panel._assistantFileReport.adoption_entries.push({
    entity_id: "light.second", exposure: "expose",
    has_customizations: false, reasons: [],
  });
  panel._assistantFileReport.counts.entries = 6;
  panel._entityCatalog.entities.push({
    entity_id: "light.second", eligible: true, has_label: false,
  });
  panel._loadEntities = async () => true;
  panel._generatePreview = async () => {};
  await panel._adoptAssistantFile();
  assert.deepEqual(calls.map(req => req.type), [
    "ha_voice_label_sync/inspect_assistant_entity_file",
    "ha_voice_label_sync/set_entity_label",
    "ha_voice_label_sync/set_entity_label",
  ]);
  assert.match(nodes.assistantAdoptResult.textContent, /1 label/);
  assert.match(nodes.assistantAdoptResult.textContent, /interruption/);
  assert.equal(panel._assistantAdoptBusy, false);
});
