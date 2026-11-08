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
