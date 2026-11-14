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

function managedPreviewWithComparison(overrides = {}) {
  return {
    ...preview(true),
    ownership: {status: "managed", write_allowed: true},
    production_sha256: "b".repeat(64),
    comparison: {
      status: "ok",
      added: [], removed: [], modified: [],
      unchanged: 4,
      identical_entities: true,
      identical_text: true,
      ...overrides,
    },
  };
}

test("Identical managed Preview disables normal Apply with a clear reason", async () => {
  for (const identicalText of [true, false]) {
    const calls = [];
    const {panel, controls} = makePanel(async request => {
      calls.push(request.type);
      return managedPreviewWithComparison({identical_text: identicalText});
    });
    const info = {hidden: true, open: false, title: ""};
    const explanation = {textContent: ""};
    const originalQuery = panel.querySelector.bind(panel);
    panel.querySelector = selector => {
      if (selector === "#applyInfo") return info;
      if (selector === "#applyBlockReason") return explanation;
      return originalQuery(selector);
    };

    await panel._loadPreview();

    assert.equal(controls.apply.disabled, true);
    assert.equal(panel._review, null);
    assert.equal(info.hidden, false);
    assert.match(explanation.textContent, /Aucune modification à appliquer/);
    await panel._applyPreview();
    assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);

    // Reason uses the active locale, even after a UI language change.
    panel._language = "en";
    panel._updateApplyButton();
    assert.match(explanation.textContent, /No changes to apply/);
  }
});

test("A subsequent Preview with an added entity enables normal Apply again", async () => {
  let hasChanges = false;
  const {panel, controls} = makePanel(async () =>
    managedPreviewWithComparison(hasChanges
      ? {added: ["switch.new"], identical_entities: false, identical_text: false}
      : {}
    )
  );
  const info = {hidden: true, open: false};
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
  hasChanges = true;
  await panel._loadPreview();

  assert.equal(controls.apply.disabled, false);
  assert.equal(info.hidden, true);
  assert.equal(explanation.textContent, "");
  assert.equal(panel._review.production_sha256, "b".repeat(64));
});

test("A missing production file can still be created with normal Apply", async () => {
  const {panel, controls} = makePanel(async () => ({
    ...preview(true),
    comparison: {status: "missing"},
  }));

  await panel._loadPreview();

  assert.equal(controls.apply.disabled, false);
  assert.ok(panel._review);
});

test("A protected existing file keeps its ownership warning even with no changes", async () => {
  const response = managedPreviewWithComparison();
  response.ownership = {
    status: "unmanaged",
    write_allowed: false,
    reason_code: "unmanaged_output",
    reason: "Existing manual YAML is protected.",
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
  assert.match(explanation.textContent, /propriété n'est pas vérifiée/);
  assert.doesNotMatch(explanation.textContent, /Aucune modification/);
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


function manualStage(changes) {
  const added = changes.filter(x => x.enabled).map(x => x.entity_id);
  const removed = changes.filter(x => !x.enabled).map(x => x.entity_id);
  return {
    mode: "label_preview", available: true,
    content: "switch.a:\\n  expose: true\\n",
    path: "Proposition HVLS",
    preview_sha256: "b".repeat(64),
    production_sha256: "a".repeat(64),
    label_plan_sha256: "c".repeat(64),
    label_plan: {add: added, remove: removed, review: []},
    changes,
    projection: {ready: true},
    comparison: {status: "ok", identical_entities: false,
      added, removed, modified: []},
  };
}

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

test("Ineligible previously labelled entity can be staged for removal", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request);
    return manualStage(request.changes);
  });
  panel._activateTab = () => {};
  const checkbox = {checked: false};
  await panel._setEntityLabel(
    {entity_id: "sensor.legacy", name: "Legacy",
      has_label: true, eligible: false},
    checkbox
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "ha_voice_label_sync/prepare_manual_label_preview");
  assert.equal(calls[0].changes[0].enabled, false);
  assert.equal(controls.apply.disabled, false);
  assert.equal(panel._manualLabelChanges.get("sensor.legacy"), false);
  assert.equal(panel._stagedRestore.mode, "label_preview");
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

test("Entity label click stages YAML and HA labels without writing either one", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    if (request.type === "ha_voice_label_sync/prepare_manual_label_preview")
      return manualStage(request.changes);
    return preview(true);
  });
  panel._activateTab = tab => {panel.openedTab = tab;};
  const checkbox = {checked: true};
  await panel._loadPreview();
  await panel._setEntityLabel(
    {entity_id: "light.salon", name: "Salon", has_label: false, eligible: true},
    checkbox
  );
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/prepare_manual_label_preview",
  ]);
  assert.equal(panel._stagedRestore.mode, "label_preview");
  assert.equal(panel.openedTab, "preview");
  assert.equal(panel._manualLabelChanges.get("light.salon"), true);
  assert.equal(controls.apply.disabled, false);
  assert.equal(calls.includes("ha_voice_label_sync/set_entity_label"), false);
  assert.equal(calls.includes("ha_voice_label_sync/apply_preview"), false);
});

test("Failed label preparation rejects old approval and never writes HA", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    if (request.type === "ha_voice_label_sync/prepare_manual_label_preview")
      throw new Error("Planning failed");
    return preview(true);
  });
  panel._activateTab = () => {};
  const checkbox = {checked: true};
  await panel._loadPreview();
  assert.equal(controls.apply.disabled, false);
  await panel._setEntityLabel(
    {entity_id: "light.salon", name: "Salon", has_label: false, eligible: true},
    checkbox
  );
  assert.equal(controls.apply.disabled, true);
  assert.equal(panel._review, null);
  assert.equal(panel._stagedRestore, null);
  assert.equal(checkbox.checked, false);
  assert.deepEqual(calls, [
    "ha_voice_label_sync/get_preview",
    "ha_voice_label_sync/prepare_manual_label_preview",
    "ha_voice_label_sync/get_preview",
  ]);
});

test("Two checkbox choices are both included in the staged Preview, no HA writes", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request);
    return manualStage(request.changes);
  });
  panel._activateTab = () => {};
  await panel._setEntityLabel(
    {entity_id: "switch.one", name: "One", has_label: true, eligible: true},
    {checked: false}
  );
  await panel._setEntityLabel(
    {entity_id: "switch.two", name: "Two", has_label: false, eligible: true},
    {checked: true}
  );
  assert.equal(calls.length, 2);
  assert.deepEqual([...calls[1].changes.map(x => x.entity_id)], [
    "switch.one", "switch.two"
  ]);
  assert.equal(controls.apply.disabled, false);
  assert.equal(panel._manualLabelChanges.size, 2);
  assert.ok(calls.every(x => x.type ===
    "ha_voice_label_sync/prepare_manual_label_preview"));
});

test("Cancelling a staged manual-label Preview discards pending choices without write", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    return preview(true);
  });
  panel._manualLabelChanges = new Map([["switch.two", true]]);
  panel._stagedRestore = manualStage([
    {entity_id: "switch.two", enabled: true}
  ]);
  await panel._cancelPreview();
  assert.equal(panel._manualLabelChanges, null);
  assert.equal(panel._stagedRestore, null);
  assert.equal(controls.apply.disabled, true);
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
  assert.match(panel.status, /Preview annulé/);
});

test("Manual-label Preview Apply uses one reviewed server action, not direct setter", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/apply_manual_label_preview") {
      return {applied: true, reconciled: true,
        label_additions: 1, label_removals: 0, yaml_entities: 2};
    }
    if (request.type === "ha_voice_label_sync/generate_preview") {
      return {generated: true};
    }
    throw new Error("Unexpected request");
  });
  panel._stagedRestore = manualStage([
    {entity_id: "switch.two", enabled: true}
  ]);
  panel._manualLabelChanges = new Map([["switch.two", true]]);
  panel._loadPreview = async () => {};
  panel._loadEntities = async () => {};
  panel._updateApplyButton();
  assert.equal(controls.apply.disabled, false);
  await panel._applyPreview();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/apply_manual_label_preview",
    "ha_voice_label_sync/generate_preview",
  ]);
  assert.equal(calls[0].label_plan_sha256, "c".repeat(64));
  assert.deepEqual([...calls[0].changes], [
    {entity_id: "switch.two", enabled: true},
  ]);
  assert.equal(panel._manualLabelChanges, null);
  assert.equal(panel._stagedRestore, null);
  assert.doesNotMatch(calls.map(x => x.type).join(","), /set_entity_label/);
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
  assert.match(source, /ha_voice_label_sync\/prepare_backup_preview/);
});

test("Backup history shows 10 entries by default and labels all types", () => {
  const {panel} = makePanel(async () => ({}));
  const list = {children: [], replaceChildren(...items) {this.children = items;},
    appendChild(item) {this.children.push(item);}};
  const more = {hidden: true, textContent: ""};
  panel.querySelector = selector => ({
    "#backupList": list, "#backupMore": more,
  }[selector] || null);
  panel._backupList = Array.from({length: 12}, (_, idx) => ({
    id: "backup-" + idx + ".bak",
    timestamp: "2026-11-14T15:00:00",
    entities_count: 4, size: 516,
    kind: ["auto", "safety", "legacy"][idx % 3],
  }));

  panel._renderBackups();
  assert.equal(list.children.length, 2);
  assert.match(list.children[0].textContent, /12 sauvegarde/);
  assert.equal(list.children[1].children.length, 10);
  assert.equal(more.hidden, false);
  assert.match(more.textContent, /2 anciennes/);
  assert.match(list.children[1].children[0].children[1].textContent, /Automatique/);
  assert.match(list.children[1].children[1].children[1].textContent, /Sécurité/);
  assert.match(list.children[1].children[2].children[1].textContent, /Ancienne/);

  panel._backupVisibleAll = true;
  panel._renderBackups();
  assert.equal(list.children[1].children.length, 12);
  assert.match(more.textContent, /10 dernières/);
});

test("Cleanup preparation is read-only and previews exactly what would be deleted", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {
      keep: 10, kept: Array.from({length: 10}, (_, i) => ({id: "" + i})),
      to_delete: [{id: "old.safety.bak", kind: "safety",
        timestamp: "2026-11-13T14:00:00", entities_count: 4}],
      evidence_sha256: "a".repeat(64),
    };
  });
  const previewNode = {children: [], replaceChildren(...items) {this.children = items;},
    appendChild(item) {this.children.push(item);}};
  const apply = {hidden: true};
  const cancel = {hidden: true};
  const status = {textContent: ""};
  panel.querySelector = selector => ({
    "#backupCleanupPreview": previewNode,
    "#backupCleanupApply": apply,
    "#backupCleanupCancel": cancel,
    "#backupCleanupStatus": status,
  }[selector] || null);
  await panel._prepareBackupCleanup();

  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/preview_backup_cleanup",
  ]);
  assert.equal(panel._backupCleanupPlan.to_delete.length, 1);
  assert.equal(previewNode.children.length, 4);
  assert.match(previewNode.children[1].textContent, /1 à supprimer/);
  const item = previewNode.children[3].children[1].children[10];
  assert.equal(item.children[0].children[0].checked, true);
  assert.match(item.children[0].children[1].textContent, /Sécurité/);
  assert.equal(apply.hidden, false);
  assert.equal(apply.disabled, false);
  assert.equal(cancel.hidden, false);
});

test("Cleanup requires confirmation and posts exact review evidence", async () => {
  const calls = [], confirmations = [];
  let allow = false;
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {deleted_count: 1, kept_count: 10};
  }, message => {
    confirmations.push(message);
    return allow;
  });
  const plan = {
    keep: 10, kept: Array.from({length: 10}, (_, i) => ({id: "" + i})),
    to_delete: [{id: "old.safety.bak"}],
    evidence_sha256: "b".repeat(64),
  };
  panel._backupCleanupPlan = plan;
  panel._backupCleanupSelected = new Set(["old.safety.bak"]);
  panel._renderBackupCleanup = () => {};
  panel._renderBackupDiff = () => {};
  panel._loadBackups = async () => {};
  const status = {textContent: ""};
  panel.querySelector = selector => selector === "#backupCleanupStatus"
    ? status : null;

  await panel._applyBackupCleanup();
  assert.equal(calls.length, 0);
  assert.equal(panel._backupCleanupPlan, plan);
  allow = true;
  await panel._applyBackupCleanup();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/apply_backup_cleanup",
  ]);
  assert.equal(calls[0].keep, 10);
  assert.equal(calls[0].evidence_sha256, "b".repeat(64));
  assert.deepEqual([...calls[0].delete_ids], ["old.safety.bak"]);
  assert.equal(calls[0].confirmed, true);
  assert.equal(panel._backupCleanupPlan, null);
  assert.match(status.textContent, /1 sauvegarde/);
  assert.equal(confirmations.length, 2);
});

test("Backup cleanup checkboxes let users keep old or delete recent snapshots", () => {
  const {panel} = makePanel(async () => ({}));
  const container = {children: [], replaceChildren(...items) {this.children = items;},
    appendChild(item) {this.children.push(item);}};
  const apply = {hidden: true, disabled: true, textContent: ""};
  const cancel = {hidden: true};
  panel.querySelector = selector => ({
    "#backupCleanupPreview": container,
    "#backupCleanupApply": apply,
    "#backupCleanupCancel": cancel,
  }[selector] || null);
  panel._backupCleanupPlan = {
    keep: 1,
    kept: [{id: "newest.safety.bak", timestamp: "Newest",
      kind: "safety", entities_count: 4}],
    to_delete: [{id: "old.auto.bak", timestamp: "Older",
      kind: "auto", entities_count: 3}],
    evidence_sha256: "a".repeat(64),
  };
  panel._backupCleanupSelected = new Set(["old.auto.bak"]);
  panel._renderBackupCleanup();

  // Newest begins unchecked; old begins checked.
  let items = container.children[3].children[1].children;
  const recent = items[0].children[0].children[0];
  const old = items[1].children[0].children[0];
  assert.equal(recent.checked, false);
  assert.equal(old.checked, true);
  assert.equal(apply.disabled, false);
  assert.match(apply.textContent, /Supprimer la sauvegarde/);

  // Keep the older backup and choose the more recent one for deletion.
  old.checked = false;
  old.on_change();
  items = container.children[3].children[1].children;
  const recentAgain = items[0].children[0].children[0];
  recentAgain.checked = true;
  recentAgain.on_change();
  assert.deepEqual([...panel._backupCleanupSelected], ["newest.safety.bak"]);
  assert.match(container.children[1].textContent, /1 à supprimer/);
  assert.equal(apply.disabled, false);
});

test("Backup cleanup cannot confirm zero or all snapshots selected", async () => {
  const calls = [], confirmations = [];
  const {panel} = makePanel(async request => {calls.push(request);}, message => {
    confirmations.push(message);
    return true;
  });
  const apply = {hidden: true, disabled: true, textContent: ""};
  panel.querySelector = selector => selector === "#backupCleanupApply"
    ? apply : null;
  panel._backupCleanupPlan = {
    keep: 1, kept: [{id: "recent.bak"}],
    to_delete: [{id: "old.bak"}], evidence_sha256: "a".repeat(64),
  };

  panel._backupCleanupSelected = new Set();
  panel._renderBackupCleanup();
  assert.equal(apply.disabled, true);
  await panel._applyBackupCleanup();
  assert.equal(calls.length, 0);

  panel._backupCleanupSelected = new Set(["recent.bak", "old.bak"]);
  panel._renderBackupCleanup();
  assert.equal(apply.disabled, true);
  await panel._applyBackupCleanup();
  assert.equal(calls.length, 0);
  assert.equal(confirmations.length, 0);
});

test("Backup cleanup can reset the proposed selection or deselect all", () => {
  const {panel} = makePanel(async () => ({}));
  const container = {children: [], replaceChildren(...items) {this.children = items;},
    appendChild(item) {this.children.push(item);}};
  panel.querySelector = selector => selector === "#backupCleanupPreview"
    ? container : null;
  panel._backupCleanupPlan = {
    keep: 1, kept: [{id: "latest.bak"}],
    to_delete: [{id: "old.bak"}], evidence_sha256: "a".repeat(64),
  };
  panel._backupCleanupSelected = new Set(["old.bak"]);
  panel._renderBackupCleanup();

  const none = container.children[2].children[1];
  none.on_click();
  assert.equal(panel._backupCleanupSelected.size, 0);
  const reset = container.children[2].children[0];
  reset.on_click();
  assert.deepEqual([...panel._backupCleanupSelected], ["old.bak"]);
});

test("Backup cleanup actions are distinct from restoration Apply", () => {
  assert.match(source, /id="backupCleanupPrepare"/);
  assert.match(source, /id="backupCleanupApply"/);
  assert.match(source, /id="backupCleanupCancel"/);
  assert.match(source, /id="backupMore"/);
  assert.match(source, /ha_voice_label_sync\/preview_backup_cleanup/);
  assert.match(source, /ha_voice_label_sync\/apply_backup_cleanup/);
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

test("Restore preparation never writes production or HA labels", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request);
    return {
      mode: "restore_preview", available: true, can_apply: false,
      content: "switch.a:\\n  expose: true\\n",
      path: "Backup: backup.bak",
      summary: {total: 1},
      production_summary: {total: 2},
      comparison: {
        status: "ok", added: [], removed: ["switch.b"],
        modified: [], unchanged: 1, identical_text: false,
      },
      label_plan: {add: [], remove: ["switch.b"], review: []},
      label_plan_sha256: "c".repeat(64), projection: {ready: false},
    };
  });
  panel._backupReview = {
    backup_id: "backup.bak",
    backup_sha256: "b".repeat(64),
    production_sha256: "a".repeat(64),
    comparison: {status: "ok", identical_text: false},
  };
  let openedTab = null;
  panel._activateTab = tab => {openedTab = tab;};
  await panel._restoreBackup();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/prepare_backup_preview",
  ]);
  assert.equal(calls[0].backup_id, "backup.bak");
  assert.equal(calls[0].backup_sha256, "b".repeat(64));
  assert.equal(calls[0].production_sha256, "a".repeat(64));
  assert.equal(controls.apply.disabled, true);
  assert.equal(panel._review, null);
  assert.equal(panel._stagedRestore.mode, "restore_preview");
  assert.equal(panel._stagedRestore.production_summary.total, 2);
  assert.equal(panel._stagedRestore.summary.total, 1);
  assert.deepEqual([...panel._stagedRestore.comparison.removed], ["switch.b"]);
  assert.equal(openedTab, "preview");
  assert.doesNotMatch(calls.map(x => x.type).join(","), /restore_backup|set_entity_label|apply_preview/);
});

test("Preparing a backup is read-only and requires no write confirmation", async () => {
  const calls = [], confirmations = [];
  const {panel} = makePanel(async req => {
    calls.push(req.type);
    return {mode: "restore_preview", available: true, can_apply: false,
      content: "switch.a: {}\\n", comparison: {status: "ok",
      added: [], removed: [], modified: [], unchanged: 1},
      label_plan: {add: [], remove: [], review: []},
      label_plan_sha256: "c".repeat(64), projection: {ready: false}};
  }, message => {confirmations.push(message); return false;});
  panel._backupReview = {backup_id: "backup.bak",
    backup_sha256: "a".repeat(64), production_sha256: "b".repeat(64),
    comparison: {status: "ok", identical_text: false}};
  panel._activateTab = () => {};
  await panel._restoreBackup();
  assert.deepEqual(calls, ["ha_voice_label_sync/prepare_backup_preview"]);
  assert.equal(confirmations.length, 0);
});

test("Restore Preview shows individual HA label operations and exceptional entities", () => {
  const {panel} = makePanel(async () => ({}));
  const notice = {hidden: true, children: [],
    replaceChildren(...items) {this.children = items;},
    appendChild(item) {this.children.push(item);},
  };
  const originalQuery = panel.querySelector.bind(panel);
  panel.querySelector = selector => selector === "#backupPreviewNotice"
    ? notice : originalQuery(selector);
  panel._stagedRestore = {
    label_plan: {
      add: ["switch.new"],
      remove: ["switch.old"],
      review: [{entity_id: "switch.missing", reason: "missing_ha_entity"}],
    },
  };
  panel._renderStagedRestorePlan();
  assert.equal(notice.hidden, false);
  assert.equal(notice.children.length, 4);
  assert.match(notice.children[0].textContent, /contrôlez les changements/);
  assert.match(notice.children[1].children[0].textContent, /Étiquettes à ajouter/);
  assert.equal(notice.children[1].children[1].children[0].textContent, "switch.new");
  assert.match(notice.children[2].children[0].textContent, /Étiquettes à retirer/);
  assert.equal(notice.children[2].children[1].children[0].textContent, "switch.old");
  assert.match(notice.children[3].children[0].textContent, /Entités à examiner/);
  assert.match(notice.children[3].children[1].children[0].textContent,
    /switch.missing.*missing_ha_entity/);
  panel._stagedRestore = null;
  panel._renderStagedRestorePlan();
  assert.equal(notice.hidden, true);
  assert.deepEqual(notice.children, []);
});

test("Confirmed restoration applies reviewed YAML and labels then refreshes", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/apply_backup_preview") {
      return {applied: true, reconciled: true, yaml_entities: 40,
        label_additions: 0, label_removals: 12, safety_backup: "safety.bak"};
    }
    if (request.type === "ha_voice_label_sync/generate_preview") {
      return {entity_count: 40};
    }
    throw new Error("Unexpected request");
  });
  panel._stagedRestore = {mode: "restore_preview",
    backup_id: "backup.bak", backup_sha256: "b".repeat(64),
    production_sha256: "a".repeat(64),
    label_plan_sha256: "c".repeat(64),
    label_plan: {add: [], remove: ["switch.old"], review: []},
    comparison: {status: "ok", identical_entities: false},
    projection: {ready: true}};
  let refreshed = false, loaded = false;
  panel._loadPreview = async () => {refreshed = true;};
  panel._loadEntities = async () => {loaded = true;};
  panel._updateApplyButton();
  assert.equal(controls.apply.disabled, false);
  await panel._applyPreview();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/apply_backup_preview",
    "ha_voice_label_sync/generate_preview",
  ]);
  assert.equal(calls[0].backup_id, "backup.bak");
  assert.equal(calls[0].backup_sha256, "b".repeat(64));
  assert.equal(calls[0].production_sha256, "a".repeat(64));
  assert.equal(calls[0].label_plan_sha256, "c".repeat(64));
  assert.equal(refreshed, true);
  assert.equal(loaded, true);
  assert.equal(panel._stagedRestore, null);
  assert.equal(controls.apply.disabled, true);
  assert.match(panel.status, /Restauration validée/);
});

test("Restore with mismatched HA generation cannot be applied", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {calls.push(request);});
  panel._stagedRestore = {mode: "restore_preview",
    label_plan_sha256: "c".repeat(64),
    projection: {ready: false}, label_plan: {review: []}};
  panel._updateApplyButton();
  assert.equal(controls.apply.disabled, true);
  await panel._applyPreview();
  assert.deepEqual(calls, []);
});

test("Failed restore Apply clears stale approval and reloads guard", async () => {
  const {panel, controls} = makePanel(async request => {
    if (request.type === "ha_voice_label_sync/apply_backup_preview") {
      throw new Error("Incomplete restoration");
    }
    throw new Error("Unexpected request");
  });
  panel._stagedRestore = {mode: "restore_preview",
    backup_id: "backup.bak", backup_sha256: "b".repeat(64),
    production_sha256: "a".repeat(64),
    label_plan_sha256: "c".repeat(64),
    projection: {ready: true}, label_plan: {review: [], add: ["switch.new"], remove: []},
    comparison: {status: "ok", identical_entities: false}};
  let refreshed = false;
  panel._loadPreview = async () => {refreshed = true;};
  await panel._applyPreview();
  assert.equal(refreshed, true);
  assert.equal(panel._stagedRestore, null);
  assert.equal(controls.apply.disabled, true);
  assert.match(panel.status, /Restauration refusée ou incomplète/);
});

test("Cancel discards a staged restoration without changing HA or production", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    return preview(true);
  });
  panel._stagedRestore = {
    mode: "restore_preview",
    ignored_entities: ["switch.absent"],
    label_plan: {add: [], remove: [], review: []},
    comparison: {status: "ok", identical_entities: true},
    projection: {ready: true},
  };
  await panel._cancelPreview();

  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
  assert.equal(panel._stagedRestore, null);
  assert.equal(panel._review, null);
  assert.equal(controls.apply.disabled, true);
  assert.match(panel.status, /Preview annulé/);
  assert.match(source, /id="cancelPreview"[^>]*>.*cancelPreview/);
});

test("Ignoring missing backup entity recalculates server-side without applying", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request);
    assert.equal(request.type, "ha_voice_label_sync/prepare_backup_preview");
    return {
      ...staged,
      ignored_entities: ["switch.absent"],
      comparison: {status: "ok", added: [], removed: [],
        modified: [], identical_entities: true},
      label_plan: {add: [], remove: [], review: []},
      projection: {ready: true},
    };
  });
  const staged = {
    mode: "restore_preview", backup_id: "backup.bak",
    backup_sha256: "b".repeat(64), production_sha256: "a".repeat(64),
    label_plan_sha256: "c".repeat(64), ignored_entities: [],
    ignore_candidates: ["switch.absent"],
    comparison: {status: "ok", added: ["switch.absent"],
      removed: [], modified: [], identical_entities: false},
    label_plan: {add: [], remove: [],
      review: [{entity_id: "switch.absent", reason: "missing_ha_entity"}]},
    projection: {ready: false},
  };
  panel._stagedRestore = staged;
  await panel._setRestoreIgnored("switch.absent", true);

  assert.deepEqual([...calls[0].ignored_entities], ["switch.absent"]);
  assert.equal(calls[0].backup_sha256, "b".repeat(64));
  assert.equal(calls.length, 1);
  assert.deepEqual([...panel._stagedRestore.ignored_entities], ["switch.absent"]);
  assert.equal(panel._stagedRestore.label_plan.review.length, 0);
  assert.equal(controls.apply.disabled, true); // All proposed changes skipped.
  assert.equal(panel._review, null);
});

test("Ignored choice is sent unchanged during valid partial restoration Apply", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/apply_backup_preview") {
      return {applied: true, reconciled: true, yaml_entities: 3,
        label_additions: 1, label_removals: 0, safety_backup: "safety.bak"};
    }
    if (request.type === "ha_voice_label_sync/generate_preview") {
      return {generated: true};
    }
    throw new Error("Unexpected request");
  });
  panel._stagedRestore = {
    mode: "restore_preview", backup_id: "backup.bak",
    backup_sha256: "b".repeat(64), production_sha256: "a".repeat(64),
    label_plan_sha256: "c".repeat(64),
    ignored_entities: ["switch.absent"],
    label_plan: {add: ["switch.new"], remove: [], review: []},
    comparison: {status: "ok", identical_entities: false,
      added: ["switch.new"], removed: [], modified: []},
    projection: {ready: true},
  };
  panel._loadPreview = async () => {};
  panel._loadEntities = async () => {};
  panel._updateApplyButton();
  assert.equal(controls.apply.disabled, false);
  await panel._applyPreview();
  assert.deepEqual([...calls[0].ignored_entities], ["switch.absent"]);
  assert.equal(panel._stagedRestore, null);
});

test("Cancel while a new ignore Preview is being prepared cannot revive it", async () => {
  const pending = deferred();
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    if (request.type === "ha_voice_label_sync/prepare_backup_preview") {
      return pending.promise;
    }
    return preview();
  });
  panel._stagedRestore = {
    mode: "restore_preview", backup_id: "backup.bak",
    backup_sha256: "b".repeat(64), production_sha256: "a".repeat(64),
    label_plan_sha256: "c".repeat(64), ignored_entities: [],
    ignore_candidates: ["switch.absent"],
    label_plan: {add: [], remove: [], review: []},
    comparison: {status: "ok", identical_entities: false},
    projection: {ready: false},
  };
  const updating = panel._setRestoreIgnored("switch.absent", true);
  assert.equal(panel._restoring, true);
  await panel._cancelPreview(); // Busy state must prevent accidental cancel.
  assert.equal(calls.length, 1);
  pending.resolve({
    ...panel._stagedRestore, mode: "restore_preview",
    ignored_entities: ["switch.absent"],
    label_plan: {add: [], remove: [], review: []},
    label_plan_sha256: "c".repeat(64),
    comparison: {status: "ok", identical_entities: true},
    projection: {ready: true},
  });
  await updating;
  assert.equal(panel._restoring, false);
});

test("Backup text-only differences are identified without direct restore", () => {
  const {panel} = makePanel(async () => ({}));
  const nodes = {
    backupDiff: {children: [], replaceChildren(...children) {
      this.children = children;
    }, appendChild(child) {this.children.push(child);}},
    restoreBackup: {disabled: true, textContent: ""},
  };
  const origQuery = panel.querySelector.bind(panel);
  panel.querySelector = selector => nodes[selector.slice(1)] || origQuery(selector);
  panel._backupReview = {comparison: {
    status: "ok", added: [], removed: [], modified: [],
    unchanged: 4, identical_entities: true, identical_text: false,
  }};
  panel._renderBackupDiff();
  assert.equal(nodes.restoreBackup.disabled, false);
  assert.equal(nodes.restoreBackup.textContent, "Préparer la comparaison du texte YAML");
  assert.equal(nodes.backupDiff.children.length, 3);
  panel._backupReview.comparison.identical_text = true;
  panel._renderBackupDiff();
  // Identical YAML can still require HA-label reconciliation.
  assert.equal(nodes.restoreBackup.disabled, false);
  assert.equal(nodes.restoreBackup.textContent,
    "Préparer cette sauvegarde dans le Preview");
});

test("Restore staging leaves previous production untouched after 4 over 3", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    return {mode: "restore_preview", available: true, can_apply: false,
      content: "switch.a: {}\\nswitch.b: {}\\nswitch.c: {}\\nswitch.d: {}\\n",
      production_summary: {total: 3},
      summary: {total: 4},
      comparison: {status: "ok", added: ["switch.d"], removed: [],
        modified: [], unchanged: 3},
      label_plan: {add: ["switch.d"], remove: [], review: []},
      label_plan_sha256: "c".repeat(64), projection: {ready: false}};
  });
  panel._backupReview = {backup_id: "backup-4.bak",
    backup_sha256: "b".repeat(64), production_sha256: "a".repeat(64),
    comparison: {status: "ok", identical_text: false}};
  panel._activateTab = () => {};
  await panel._restoreBackup();
  assert.deepEqual(calls, ["ha_voice_label_sync/prepare_backup_preview"]);
  assert.equal(panel._stagedRestore.production_summary.total, 3);
  assert.equal(panel._stagedRestore.comparison.added.length, 1);
  assert.equal(panel._stagedRestore.comparison.removed.length, 0);
  assert.equal(controls.apply.disabled, true);
});

test("Restore warnings reflect fresh Preview comparison, including uncertainty", () => {
  const {panel} = makePanel(async () => ({}));
  const nodes = {
    backupRestoreNotice: {hidden: true, textContent: ""},
    restoreSummaryNotice: {hidden: true, textContent: ""},
  };
  panel.querySelector = selector => nodes[selector.slice(1)] || null;
  panel._backupRestoreCompleted = true;
  panel._lastAnalysis = {available: false};
  panel._renderRestoreWarning();
  assert.match(nodes.backupRestoreNotice.textContent, /pas vérifiée/);

  panel._lastAnalysis = {available: true, comparison: {
    status: "ok", added: ["light.new"], removed: [],
    modified: [], unchanged: 3,
  }};
  panel._renderRestoreWarning();
  assert.match(nodes.backupRestoreNotice.textContent, /1 ajout/);
  assert.doesNotMatch(nodes.backupRestoreNotice.textContent, /supprimerait/);

  panel._lastAnalysis = {available: true, comparison: {
    status: "ok", added: [], removed: [], modified: [], unchanged: 4,
  }};
  panel._renderRestoreWarning();
  assert.match(nodes.backupRestoreNotice.textContent, /même configuration/);

  panel._backupRestoreCompleted = false;
  panel._renderRestoreWarning();
  assert.equal(nodes.backupRestoreNotice.hidden, true);
  assert.equal(nodes.restoreSummaryNotice.hidden, true);
  assert.equal(nodes.backupRestoreNotice.textContent, "");
});

test("Statistics explicitly use the real production baseline, not proposed Preview", () => {
  assert.match(source, /metricEntities: "Entités en production"/);
  assert.match(source, /metricEntities: "Production entities"/);
  assert.match(source, /const stats = result\.production_summary/);
  assert.doesNotMatch(source, /const stats = result\.summary/);
  assert.match(source, /productionStatsUnavailable/);
  assert.match(source, /id="backupRestoreNotice"/);
  assert.match(source, /id="restoreSummaryNotice"/);
});

test("Durable restore protection offers safe choices after panel reload", () => {
  const {panel} = makePanel(async () => ({}));
  const nodes = {};
  for (const id of [
    "restoreReconcilePanel", "restoreReconcileTitle", "restoreReconcileSummary",
    "restoreReconcileDetails", "restoreReconcileAddLabels",
    "restoreReconcileAligned", "restoreReconcileKeepCurrent",
    "restoreReconcileCancelFailed", "restoreReconcileStatus",
  ]) nodes[id] = {hidden: true, disabled: true, textContent: ""};
  panel.querySelector = selector => nodes[selector.slice(1)] || null;
  panel._restoreReconcilePending = true;
  panel._restoreReconcileState = "restored";
  panel._restoreReconcileReview = {
    production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
  };
  panel._lastAnalysis = {comparison: {
    status: "ok", added: [], removed: ["switch.piscine_chauffage"],
    modified: [], unchanged: 3, identical_entities: false,
  }};
  panel._renderRestoreReconciliation();
  assert.equal(nodes.restoreReconcilePanel.hidden, false);
  assert.equal(nodes.restoreReconcileAddLabels.hidden, false);
  assert.equal(nodes.restoreReconcileAddLabels.disabled, false);
  assert.equal(nodes.restoreReconcileKeepCurrent.hidden, false);
  assert.equal(nodes.restoreReconcileAligned.hidden, true);
  assert.match(nodes.restoreReconcileSummary.textContent, /YAML restauré est protégé/);
  assert.match(nodes.restoreReconcileDetails.textContent, /1 suppression/);
  panel._lastAnalysis.comparison = {...panel._lastAnalysis.comparison,
    removed: [], identical_entities: true, unchanged: 4};
  panel._renderRestoreReconciliation();
  assert.equal(nodes.restoreReconcileAddLabels.hidden, true);
  assert.equal(nodes.restoreReconcileAligned.hidden, false);
  assert.equal(nodes.restoreReconcileKeepCurrent.hidden, true);
});

test("Restoring a missing HVLS label reconciles without touching production", async () => {
  const calls = [], confirmations = [];
  let restored = false, resolved = false;
  const {panel} = makePanel(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/get_entities") {
      return {entities: [{entity_id: "switch.piscine_chauffage",
        eligible: true, has_label: false}]};
    }
    if (request.type === "ha_voice_label_sync/set_entity_label") {
      assert.equal(request.entity_id, "switch.piscine_chauffage");
      assert.equal(request.enabled, true);
      assert.equal(request.expected_enabled, false);
      restored = true;
      return {changed: true, has_label: true};
    }
    if (request.type === "ha_voice_label_sync/generate_preview") {
      assert.equal(restored, true);
      return {generated: true};
    }
    if (request.type === "ha_voice_label_sync/resolve_restored_output") {
      assert.equal(request.resolution, "keep_restored");
      assert.equal(request.confirmed, true);
      resolved = true;
      return {resolved: true, production_unchanged: true,
        apply_performed: false};
    }
    throw new Error("Unexpected network operation");
  }, message => {confirmations.push(message); return true;});
  panel._restoreReconcilePending = true;
  panel._restoreReconcileState = "restored";
  panel._restoreReconcileReview = {
    production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
  };
  panel._lastAnalysis = {comparison: {status: "ok", added: [],
    removed: ["switch.piscine_chauffage"], modified: [],
    unchanged: 3, identical_entities: false}};
  panel._renderRestoreReconciliation = () => {};
  panel._loadPreview = async () => {
    panel._lastAnalysis.comparison = {
      status: "ok", added: [], removed: [], modified: [],
      unchanged: 4, identical_entities: true,
    };
    panel._restoreReconcilePending = !resolved;
  };
  await panel._restoreMissingLabels();
  assert.equal(resolved, true);
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/get_entities",
    "ha_voice_label_sync/set_entity_label",
    "ha_voice_label_sync/generate_preview",
    "ha_voice_label_sync/resolve_restored_output",
  ]);
  assert.match(confirmations[0], /switch.piscine_chauffage/);
  assert.doesNotMatch(calls.map(x => x.type).join(","), /apply_preview|restore_backup/);
  assert.equal(panel._restoreReconcilePending, false);
});

test("Ineligible restored entity cannot be silently relabeled", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    return {entities: [{entity_id: "switch.piscine_chauffage",
      eligible: false, has_label: false}]};
  });
  panel._restoreReconcilePending = true;
  panel._restoreReconcileState = "restored";
  panel._restoreReconcileReview = {
    production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
  };
  panel._lastAnalysis = {comparison: {status: "ok", added: [],
    removed: ["switch.piscine_chauffage"], modified: [],
    unchanged: 3, identical_entities: false}};
  panel._renderRestoreReconciliation = () => {};
  panel._loadPreview = async () => {};
  await panel._restoreMissingLabels();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_entities"]);
  assert.match(panel._restoreReconcileMessage, /ne peuvent pas être rétablis/);
});

test("Interrupted restore can be cancelled only in verified original state", async () => {
  const calls = [], confirmations = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {resolved: true, production_unchanged: true,
      apply_performed: false};
  }, message => {confirmations.push(message); return true;});
  const nodes = {};
  for (const id of [
    "restoreReconcilePanel", "restoreReconcileTitle", "restoreReconcileSummary",
    "restoreReconcileDetails", "restoreReconcileAddLabels",
    "restoreReconcileAligned", "restoreReconcileKeepCurrent",
    "restoreReconcileCancelFailed", "restoreReconcileStatus",
  ]) nodes[id] = {hidden: true, disabled: true, textContent: ""};
  panel.querySelector = selector => nodes[selector.slice(1)] || null;
  panel._restoreReconcilePending = true;
  panel._restoreReconcileState = "not_written";
  panel._restoreReconcileReview = {
    production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
  };
  panel._lastAnalysis = {comparison: {status: "ok", added: [],
    removed: [], modified: [], unchanged: 3, identical_entities: true}};
  panel._renderRestoreReconciliation();
  assert.equal(nodes.restoreReconcileCancelFailed.hidden, false);
  assert.equal(nodes.restoreReconcileAligned.hidden, true);
  assert.equal(nodes.restoreReconcileKeepCurrent.hidden, true);
  panel._loadPreview = async () => {panel._restoreReconcilePending = false;};
  assert.equal(await panel._resolveRestoreReconciliation("cancel_failed"), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].resolution, "cancel_failed");
  assert.match(confirmations[0], /interrompue avant de modifier/);
});

test("Choosing current labels only unlocks a future separate Apply", async () => {
  const calls = [], confirms = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {resolved: true, production_unchanged: true,
      apply_performed: false};
  }, message => {confirms.push(message); return true;});
  panel._restoreReconcilePending = true;
  panel._restoreReconcileState = "restored";
  panel._restoreReconcileReview = {
    production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
  };
  panel._lastAnalysis = {comparison: {
    status: "ok", added: [], removed: ["switch.piscine_chauffage"],
    modified: [], unchanged: 3, identical_entities: false,
  }};
  panel._renderRestoreReconciliation = () => {};
  panel._loadPreview = async () => {panel._restoreReconcilePending = false;};
  assert.equal(await panel._resolveRestoreReconciliation("keep_current_labels"), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "ha_voice_label_sync/resolve_restored_output");
  assert.equal(calls[0].resolution, "keep_current_labels");
  assert.match(confirms[0], /futur Apply pourra remplacer/);
  assert.equal(panel._restoreReconcilePending, false);
});

test("Identical backup still prepares Preview when HA labels may differ", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    return {mode: "restore_preview", available: true, can_apply: false,
      backup_id: "same.bak", backup_sha256: "a".repeat(64),
      production_sha256: "b".repeat(64),
      label_plan_sha256: "c".repeat(64),
      content: "switch.kept:\\n  expose: true\\n",
      summary: {total: 40}, production_summary: {total: 40},
      comparison: {status: "ok", identical_text: true, added: [],
        removed: [], modified: [], unchanged: 40},
      label_plan: {add: [], remove: ["switch.extra"], review: []},
      projection: {ready: true, comparison: {
        status: "ok", identical_entities: true}}};
  });
  panel._backupReview = {backup_id: "same.bak",
    backup_sha256: "a".repeat(64), production_sha256: "b".repeat(64),
    comparison: {identical_text: true, status: "ok"}};
  panel._activateTab = () => {};
  await panel._restoreBackup();
  assert.deepEqual(calls, ["ha_voice_label_sync/prepare_backup_preview"]);
  assert.equal(panel._stagedRestore.label_plan.remove.length, 1);
  assert.equal(panel._stagedRestore.production_summary.total, 40);
  assert.equal(controls.apply.disabled, false);
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

test("Statistics quick removal stages a review instead of direct HA writes", () => {
  const start = source.indexOf("const catalogEntity = (this._entityCatalog?.entities || []).find(");
  const end = source.indexOf("item.appendChild(itemRow);", start);
  const block = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /catalogEntity\?\.has_label === true/);
  assert.match(block, /this\._manualLabelChanges\?\.has\(entity\.entity_id\)/);
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
    production_summary: {total: 3},
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
  assert.equal(panel._productionStatus("switch.removed", result), "removal");
  assert.equal(panel._productionStatus("switch.saved", result), "validated");
});

test("Production status never implies validation without a current actionable comparison", () => {
  const {panel} = makePanel(async () => ({}));
  const result = {
    available: true,
    production_summary: {total: 1},
    comparison: {status: "ok", added: [], removed: [], modified: []},
  };
  assert.equal(panel._productionStatus("switch.saved", result), "validated");
  assert.equal(panel._productionStatus("switch.saved",
    {...result, production_summary: null}), "unknown");
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
  assert.match(source, /\.production-status--removal/);
  assert.match(block, /removal: "productionRemoval"/);
  assert.match(block, /indicator\.textContent = status === "validated"/);
  assert.match(block, /status === "removal" \? "−"/);
  assert.match(source, /productionRemoval: "Suppression prévue/);
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

test("Unmanaged YAML offers Assistant inspection without unlocking Apply", async () => {
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    return {
      ...preview(false),
      ownership: {
        status: "unmanaged", write_allowed: false,
        reason_code: "unmanaged_output",
        reason: "Protected manual YAML",
      },
    };
  });
  const info = {hidden: true, open: false, title: ""};
  const explanation = {textContent: ""};
  const hint = {hidden: true, textContent: ""};
  const action = {hidden: true, textContent: ""};
  const originalQuery = panel.querySelector.bind(panel);
  panel.querySelector = selector => ({
    "#applyInfo": info,
    "#applyBlockReason": explanation,
    "#applyUnmanagedAssistantHint": hint,
    "#applyUnmanagedAssistant": action,
  }[selector] || originalQuery(selector));

  await panel._loadPreview();
  assert.equal(controls.apply.disabled, true);
  assert.equal(panel._review, null);
  assert.equal(info.hidden, false);
  assert.equal(hint.hidden, false);
  assert.equal(action.hidden, false);
  assert.match(hint.textContent, /lecture seule/);
  assert.match(hint.textContent, /pas automatiquement/);
  assert.equal(action.textContent, "Examiner dans l'Assistant");
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
  assert.match(source, /querySelector\("#applyUnmanagedAssistant"\)\.addEventListener\(/);
  assert.match(source, /"click", \(\) => this\._activateTab\("migration"\)/);
  panel._language = "en";
  panel._updateApplyButton();
  assert.match(hint.textContent, /read-only/);
  assert.equal(action.textContent, "Inspect in Assistant");
  assert.equal(controls.apply.disabled, true);
  assert.equal(calls.length, 1);
});

test("Assistant shortcut is hidden for unrelated Apply refusals and healthy output", async () => {
  let denied = true;
  const {panel, controls} = makePanel(async () => denied
    ? {...preview(false), ownership: {
        status: "unmanaged", write_allowed: false,
        reason_code: "verification_failed", reason: "Check failed",
      }}
    : preview(true)
  );
  const hint = {hidden: false, textContent: ""};
  const action = {hidden: false, textContent: ""};
  const originalQuery = panel.querySelector.bind(panel);
  panel.querySelector = selector => ({
    "#applyUnmanagedAssistantHint": hint,
    "#applyUnmanagedAssistant": action,
  }[selector] || originalQuery(selector));
  await panel._loadPreview();
  assert.equal(controls.apply.disabled, true);
  assert.equal(hint.hidden, true);
  assert.equal(action.hidden, true);
  denied = false;
  await panel._loadPreview();
  assert.equal(controls.apply.disabled, false);
  assert.equal(hint.hidden, true);
  assert.equal(action.hidden, true);
  assert.equal(hint.textContent, "");
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
  assert.match(controls.assistantFileSafety.textContent, /Aucun label ni YAML/);
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
    assistantTakeoverSection: {hidden: true},
    assistantTakeoverTitle: {textContent: ""},
    assistantTakeoverIntro: {textContent: ""},
    assistantTakeoverButton: {hidden: true, disabled: true, textContent: ""},
    assistantTakeoverResult: {textContent: ""},
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

test("Confirmed existing file takeover shows diff, calls only prepare/confirm and never Apply", async () => {
  const calls = [];
  const confirmations = [];
  const {panel, nodes} = standardAdoptionFixture(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/prepare_existing_output_takeover") {
      assert.equal(request.path, "google_assistant_entities.yaml");
      return {
        eligible: true, selected_path: request.path,
        production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
        entities: 4, issues: 0,
        changes: {added: 0, removed: 1, modified: 2},
      };
    }
    if (request.type === "ha_voice_label_sync/confirm_existing_output_takeover") {
      assert.equal(request.confirmed, true);
      assert.equal(request.production_sha256, "a".repeat(64));
      assert.equal(request.preview_sha256, "b".repeat(64));
      return {
        taken_over: true, backup_name: "google_assistant_entities.yaml.safety.bak",
        production_unchanged: true, apply_performed: false,
      };
    }
    throw Error("No other operation expected");
  }, message => { confirmations.push(message); return true; });
  panel._applyBlockReasonCode = "unmanaged_output";
  let previewReloads = 0;
  panel._loadPreview = async () => {
    previewReloads += 1;
    panel._applyBlockReasonCode = null;
  };
  panel._renderAssistantAdoption();
  assert.equal(nodes.assistantTakeoverSection.hidden, false);
  assert.equal(nodes.assistantTakeoverButton.disabled, false);
  await panel._takeOverAssistantFile();
  assert.equal(previewReloads, 1);
  assert.deepEqual(calls.map(r => r.type), [
    "ha_voice_label_sync/prepare_existing_output_takeover",
    "ha_voice_label_sync/confirm_existing_output_takeover",
  ]);
  assert.match(confirmations[0], /1 suppression/);
  assert.match(confirmations[0], /2 modification/);
  assert.match(confirmations[0], /aucun Apply/i);
  assert.match(confirmations[0], /\?\n\nEntités actuelles/);
  assert.match(confirmations[0], /\nDifférences proposées par le Preview/);
  assert.doesNotMatch(confirmations[0], /\\n/);
  assert.match(nodes.assistantTakeoverResult.textContent, /Sauvegarde vérifiée/);
  assert.equal(nodes.assistantTakeoverButton.hidden, true);
});

test("English takeover confirmation has real line breaks", async () => {
  const confirmations = [];
  const {panel} = standardAdoptionFixture(async request => {
    assert.equal(request.type, "ha_voice_label_sync/prepare_existing_output_takeover");
    return {
      eligible: true, selected_path: "google_assistant_entities.yaml",
      production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
      entities: 4, issues: 0,
      changes: {added: 0, removed: 0, modified: 0},
    };
  }, message => { confirmations.push(message); return false; });
  panel._language = "en";
  panel._applyBlockReasonCode = "unmanaged_output";
  await panel._takeOverAssistantFile();
  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /\?\n\nCurrent entities/);
  assert.match(confirmations[0], /\nPreview differences:/);
  assert.doesNotMatch(confirmations[0], /\\n/);
});

test("Existing file takeover rejects stale source, cancellation and unsupported status", async () => {
  for (const testCase of ["cancel", "stale", "not_unmanaged"]) {
    const calls = [];
    const {panel, nodes} = standardAdoptionFixture(async request => {
      calls.push(request.type);
      return {
        eligible: true, selected_path: "google_assistant_entities.yaml",
        production_sha256: testCase === "stale"
          ? "f".repeat(64) : "a".repeat(64),
        preview_sha256: "b".repeat(64), entities: 4, issues: 0,
        changes: {added: 0, removed: 0, modified: 0},
      };
    }, () => false);
    panel._applyBlockReasonCode = testCase === "not_unmanaged"
      ? "registry_invalid" : "unmanaged_output";
    panel._loadPreview = async () => {};
    await panel._takeOverAssistantFile();
    if (testCase === "not_unmanaged") {
      assert.deepEqual(calls, []);
    } else {
      assert.deepEqual(calls, ["ha_voice_label_sync/prepare_existing_output_takeover"]);
    }
    assert.equal(nodes.assistantTakeoverResult.textContent.includes("Fichier repris"), false);
  }
});

test("Already labeled entities with generated name/room are recognized without any write", () => {
  const {panel, nodes} = standardAdoptionFixture(async () => {
    throw Error("No write requests expected");
  });
  const ids = [
    "switch.sonoff_10007b6160_1", "switch.sonoff_10007b6160_2",
    "switch.piscine_chauffage", "switch.pompe_piscine_prise",
  ];
  panel._assistantFileReport.adoption_entries = ids.map(entity_id => ({
    entity_id, exposure: "expose", has_customizations: true, reasons: [],
  }));
  panel._assistantFileReport.counts.entries = 4;
  panel._entityCatalog.entities = ids.map(entity_id => ({
    entity_id, eligible: true, has_label: true,
  }));
  const plan = panel._assistantAdoptionPlan();
  assert.equal(plan.totals.ready, 0);
  assert.equal(plan.totals.already, 4);
  assert.equal(plan.totals.excluded, 0);
  assert.equal(plan.totals.review, 0);
  assert.deepEqual(Array.from(plan.candidates), []);
  panel._renderAssistantAdoption();
  assert.equal(nodes.assistantAdoptApply.disabled, true);
  assert.equal(nodes.assistantAdoptNeedsReview.hidden, false);
  assert.equal(nodes.assistantAdoptRows.children.length, 4);
  for (const row of nodes.assistantAdoptRows.children) {
    assert.match(row.textContent, /Déjà dans HVLS/);
    assert.match(row.textContent, /non comparés/);
    assert.doesNotMatch(row.textContent, /À examiner manuellement/);
  }
  assert.equal(panel._migrationBaselineEligible(), false);
});

test("Entity review shows the specific reason and never auto-adds risky entries", () => {
  const {panel, nodes} = standardAdoptionFixture(async () => {
    throw Error("No write requests expected");
  });
  const extra = [
    ["switch.conflict", "exclude", false, []],
    ["light.absent", "expose", false, []],
    ["light.ineligible", "expose", false, []],
    ["light.invalid", "invalid", false, ["invalid_expose"]],
  ];
  for (const [entity_id, exposure, has_customizations, reasons] of extra) {
    panel._assistantFileReport.adoption_entries.push({
      entity_id, exposure, has_customizations, reasons,
    });
  }
  panel._assistantFileReport.counts.entries += extra.length;
  panel._entityCatalog.entities.push(
    {entity_id: "switch.conflict", eligible: true, has_label: true},
    {entity_id: "light.ineligible", eligible: false, has_label: false},
    {entity_id: "light.invalid", eligible: true, has_label: false},
  );
  panel._renderAssistantAdoption();
  const rows = nodes.assistantAdoptRows.children.map(row => row.textContent);
  assert.match(rows.find(row => row.startsWith("light.custom")), /personnalisations YAML/);
  assert.match(rows.find(row => row.startsWith("light.unknown")), /Directive expose absente/);
  assert.match(rows.find(row => row.startsWith("switch.conflict")), /expose: false mais label/);
  assert.match(rows.find(row => row.startsWith("light.absent")), /absente du catalogue/);
  assert.match(rows.find(row => row.startsWith("light.ineligible")), /non éligible/);
  assert.match(rows.find(row => row.startsWith("light.invalid")), /Anomalie dans la déclaration/);
  assert.deepEqual(Array.from(panel._assistantAdoptionPlan().candidates), ["light.new"]);
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
