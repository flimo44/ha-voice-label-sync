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

function makePanel(callWS, confirm = () => true, storage = undefined) {
  let Panel;

  const context = vm.createContext({
    HTMLElement: class {},
    customElements: {
      define(name, component) {
        assert.equal(name, "hvls-preview-panel");
        Panel = component;
      },
    },
    window: { confirm, alert: () => {}, localStorage: storage },
    document: {
      createElement(tag) {
        return {
          tag, children: [], textContent: "", className: "", dataset: {},
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

function fakeLocalStorage() {
  const items = new Map();
  return {
    items,
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: key => items.delete(key),
  };
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

test("Unapplied checkbox selection survives leaving and reopening the HA panel", async () => {
  const store = fakeLocalStorage();
  const calls = [];
  const userId = "a12345678-user";
  const entity = {entity_id: "climate.thermostat_sejour_2_2",
    eligible: true, has_label: false};
  const baseline = {
    ...preview(true), production_sha256: "a".repeat(64),
    ownership: {status: "managed", write_allowed: true},
  };
  const server = async request => {
    calls.push(request.type);
    if (request.type === "ha_voice_label_sync/get_preview") return baseline;
    if (request.type === "ha_voice_label_sync/prepare_manual_label_preview")
      return {...manualStage(request.changes),
        production_path: baseline.production_path};
    throw Error("Unexpected server request: " + request.type);
  };

  // Panel instance 1: stage a label without Apply.
  const first = makePanel(server, () => true, store).panel;
  first._hass.user = {id: userId};
  first._entityCatalog = {entities: [entity]};
  first._lastAnalysis = baseline; // normal Preview was already loaded
  first._activateTab = () => {};
  await first._setEntityLabel(entity, {checked: true});
  assert.equal(first._manualLabelChanges.get(entity.entity_id), true);
  assert.equal(store.items.size, 1);
  assert.equal(JSON.parse([...store.items.values()][0]).changes[0].base_label,
    false);
  assert.ok(!calls.some(c => /apply|set_entity_label/.test(c)));

  // Home Assistant destroys the panel while another app is open.
  // A *new* panel with an empty memory cache reads the saved intent.
  const reopened = makePanel(server, () => true, store);
  reopened.panel._hass.user = {id: userId};
  reopened.panel._entityCatalog = {entities: [entity]};
  reopened.panel._lastAnalysis = baseline;
  reopened.panel._activateTab = tab => {reopened.panel.openedTab = tab;};
  assert.equal(reopened.panel._draftStorageKey(),
    "hvls:label-draft:v1:" + userId);
  assert.notEqual(reopened.panel._readSavedLabelDraft(), null,
    JSON.stringify([...store.items]));
  await reopened.panel._resumeSavedLabelDraft();
  assert.equal(reopened.panel._manualLabelChanges.get(entity.entity_id), true);
  assert.equal(reopened.panel._stagedRestore.mode, "label_preview");
  assert.equal(reopened.panel.openedTab, "preview");
  assert.equal(reopened.controls.apply.disabled, false);
  assert.match(reopened.panel.status, /retrouvée/);
  assert.equal(calls.filter(c =>
    c === "ha_voice_label_sync/prepare_manual_label_preview").length, 2);
  assert.ok(!calls.some(c => /apply|set_entity_label/.test(c)));
});

test("Saved draft is blocked when production or HA label state changed", async () => {
  for (const changed of ["production", "label", "ownership"]) {
    const store = fakeLocalStorage();
    const userId = "a12345678-user";
    const key = "hvls:label-draft:v1:" + userId;
    const changes = [{entity_id: "switch.garage", enabled: true,
      base_label: false}];
    store.setItem(key, JSON.stringify({
      version: 1,
      productionPath: "/config/google_assistant_entities.yaml",
      productionSha: "a".repeat(64),
      changes,
    }));
    const calls = [];
    const {panel, controls} = makePanel(async req => {
      calls.push(req.type);
      throw Error("Must not call backend to replay stale draft");
    }, () => true, store);
    panel._hass.user = {id: userId};
    panel._entityCatalog = {entities: [{
      entity_id: "switch.garage", eligible: true,
      has_label: changed === "label",
    }]};
    panel._lastAnalysis = {
      ...preview(true),
      production_sha256: changed === "production" ?
        "f".repeat(64) : "a".repeat(64),
      ownership: changed === "ownership" ?
        {status: "unknown", write_allowed: false} :
        {status: "managed", write_allowed: true},
    };
    panel._activateTab = () => {};
    await panel._resumeSavedLabelDraft();
    assert.equal(panel._stagedRestore.mode, "saved_draft_blocked", changed);
    assert.equal(controls.apply.disabled, true, changed);
    assert.equal(panel._manualLabelChanges.get("switch.garage"), true);
    assert.equal(store.getItem(key) !== null, true);
    assert.deepEqual(calls, []);
    await panel._applyPreview();
    assert.deepEqual(calls, []);
    await panel._cancelPreview();
    assert.equal(store.getItem(key), null);
  }
});

test("A failed second checkbox preparation preserves the earlier saved draft", async () => {
  const storage = fakeLocalStorage(), calls = [];
  const entities = [
    {entity_id: "switch.first", has_label: false, eligible: true},
    {entity_id: "switch.second", has_label: false, eligible: true},
  ];
  const baseline = {
    ...preview(true),
    production_sha256: "a".repeat(64),
    ownership: {status: "managed", write_allowed: true},
  };
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    if (request.changes.length === 1) return {
      ...manualStage(request.changes),
      production_path: baseline.production_path,
    };
    throw Error("New proposal failed");
  }, () => true, storage);
  panel._hass.user = {id: "alice-user-12"};
  panel._lastAnalysis = baseline;
  panel._entityCatalog = {entities};
  panel._activateTab = () => {};

  await panel._setEntityLabel(entities[0], {checked: true});
  const earlier = panel._stagedRestore;
  assert.equal(panel._manualLabelChanges.size, 1);
  const secondCheckbox = {checked: true};
  await panel._setEntityLabel(entities[1], secondCheckbox);
  assert.strictEqual(panel._stagedRestore, earlier);
  assert.equal(panel._manualLabelChanges.size, 1);
  assert.equal(panel._manualLabelChanges.get("switch.first"), true);
  assert.equal(secondCheckbox.checked, false);
  assert.equal(controls.apply.disabled, false);
  const saved = panel._readSavedLabelDraft();
  assert.equal(saved.changes.length, 1);
  assert.equal(saved.changes[0].entity_id, "switch.first");
  assert.deepEqual(calls, [
    "ha_voice_label_sync/prepare_manual_label_preview",
    "ha_voice_label_sync/prepare_manual_label_preview",
  ]);
});

test("A saved proposal is isolated to the authenticated HA user", async () => {
  const storage = fakeLocalStorage();
  storage.setItem("hvls:label-draft:v1:alice-user-12", JSON.stringify({
    version: 1, productionPath: "/config/google_assistant_entities.yaml",
    productionSha: null,
    changes: [{entity_id: "light.bedroom", enabled: true, base_label: false}],
  }));
  const {panel} = makePanel(async () => {
    throw Error("No backend requests expected");
  }, () => true, storage);
  panel._hass.user = {id: "bob-user-123"};
  await panel._resumeSavedLabelDraft();
  assert.equal(panel._stagedRestore, undefined);
  assert.equal(storage.items.size, 1);
});

test("Saved draft never reuses previous Preview approval when backend rejects", async () => {
  const storage = fakeLocalStorage();
  const key = "hvls:label-draft:v1:alice-user-12";
  storage.setItem(key, JSON.stringify({
    version: 1, productionPath: "/config/google_assistant_entities.yaml",
    productionSha: "a".repeat(64),
    changes: [{entity_id: "light.bedroom", enabled: true, base_label: false}],
  }));
  const calls = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    throw Error("Preview changed");
  }, () => true, storage);
  panel._hass.user = {id: "alice-user-12"};
  panel._entityCatalog = {entities: [{
    entity_id: "light.bedroom", has_label: false, eligible: true,
  }]};
  panel._lastAnalysis = {
    ...preview(true), production_sha256: "a".repeat(64),
    ownership: {status: "managed", write_allowed: true},
  };
  panel._activateTab = () => {};
  assert.notEqual(panel._readSavedLabelDraft(), null,
    JSON.stringify([...storage.items]));
  await panel._resumeSavedLabelDraft();
  assert.deepEqual(calls, ["ha_voice_label_sync/prepare_manual_label_preview"]);
  assert.equal(panel._stagedRestore.mode, "saved_draft_blocked");
  assert.equal(panel._review, null);
  assert.equal(controls.apply.disabled, true);
  assert.notEqual(storage.getItem(key), null);
});

test("Initial panel loading resumes saved proposals only after both fresh snapshots", () => {
  const start = source.indexOf("set hass(hass) {");
  const end = source.indexOf("  set narrow(narrow)", start);
  const text = source.slice(start, end);
  assert.match(text, /Promise\.all\(\[this\._loadPreview\(\), this\._loadEntities\(\)\]\)/);
  assert.match(text, /\.then\(\(\) => this\._resumeSavedLabelDraft\(\)\)/);
});

test("À valider opens Preview without toggling pending HVLS selection", () => {
  const ws = [];
  const {panel} = makePanel(async request => {
    ws.push(request);
    return {};
  });
  panel._manualLabelChanges = new Map([
    ["climate.thermostat_sejour_2_2", true],
  ]);
  const navigated = [];
  panel._activateTab = tab => navigated.push(tab);
  const checkbox = {tag: "input", type: "checkbox", checked: true};
  const area = panel._createEntityHVLSControl(checkbox, true);
  assert.equal(area.className, "entity-hvls-control-area");
  assert.equal(area.children.length, 2);
  const [label, review] = area.children;
  assert.equal(label.tag, "label");
  assert.equal(label.children[0], checkbox);
  assert.equal(label.children[1].textContent, "HVLS");
  assert.equal(review.tag, "button");
  assert.equal(review.type, "button");
  assert.equal(review.textContent, "À valider");
  assert.equal(review["aria-label"], "Ouvrir le Preview");
  assert.equal(label.children.includes(review), false,
    "Review action cannot be inside the checkbox label");
  review.on_click();
  assert.deepEqual(navigated, ["preview"]);
  assert.equal(checkbox.checked, true);
  assert.equal(panel._manualLabelChanges.get("climate.thermostat_sejour_2_2"), true);
  assert.deepEqual(ws, []);
});

test("Entity HVLS control without pending change has no review action", () => {
  const {panel} = makePanel(async () => {});
  const area = panel._createEntityHVLSControl(
    {tag: "input", checked: false}, false
  );
  assert.equal(area.children.length, 1);
  assert.equal(area.children[0].tag, "label");
  assert.equal(area.children[0].children[1].textContent, "HVLS");
  assert.equal(area.children[0].className, "entity-hvls-control");
});

test("Both management and Statistics use an independent pending Preview action", () => {
  const block = source.slice(
    source.indexOf("_createEntityHVLSControl(checkbox, pending)"),
    source.indexOf("  _renderEntities()")
  );
  assert.match(block, /review\.addEventListener\("click", \(\) => this\._activateTab\("preview"\)\)/);
  assert.match(block, /control\.append\(checkbox, text\)/);
  assert.doesNotMatch(block, /control\.append\([^\n]*review/);
  const uses = [...source.matchAll(/this\._createEntityHVLSControl\(/g)];
  assert.equal(uses.length, 2);
  assert.doesNotMatch(source, /"HVLS · " \+ this\._t\("manualLabelPending"\)/);
});

test("Onboarding setup choice is read-only guidance in preview response", async () => {
  const {panel} = makePanel(async () => ({
    ...preview(false),
    onboarding_mode: "existing",
  }));
  await panel._loadPreview();
  assert.equal(panel._onboardingMode, "existing");
  assert.equal(panel._migrationIntent, undefined);
});

test("Assistant honors installer's initial existing-file choice without asking again", () => {
  const {panel} = makePanel(async () => preview(false));
  panel._migrationReport = {
    diagnostic: {
      mode: "new_configuration",
      source: {status: "resolved", unreferenced_google_entity_file_present: true},
    },
  };
  panel._onboardingMode = "existing";
  panel._assistantPackagesDetected = () => false;
  panel._renderAssistantFileStatus = () => {};
  const nodes = new Map();
  panel.querySelector = selector => {
    if (!nodes.has(selector)) {
      nodes.set(selector, {
        hidden: false, textContent: "", value: "",
        setAttribute(name, value) {this[name] = value;},
      });
    }
    return nodes.get(selector);
  };
  panel._renderMigrationGuide();
  assert.equal(panel._migrationIntent, "existing");
  assert.equal(nodes.get("#assistantFileSection").hidden, false);
  assert.equal(nodes.get("#migrationIntentExisting")["aria-pressed"], "true");

  // User deliberately changes the choice; a refresh must not undo it.
  panel._migrationIntent = "new";
  panel._renderMigrationGuide();
  assert.equal(panel._migrationIntent, "new");
  assert.equal(nodes.get("#assistantFileSection").hidden, true);
});

test("First opening of existing-file install navigates directly to Assistant once", async () => {
  const response = managedPreviewWithComparison();
  response.onboarding_mode = "existing";
  response.ownership = {
    status: "unknown", write_allowed: false,
    reason_code: "owned_by_other_installation",
    reason: "Old installation owns output",
  };
  const {panel} = makePanel(async () => response);
  panel._initialized = true;
  const original = panel.querySelector.bind(panel);
  panel.querySelector = selector => selector.includes('data-tab="summary"')
    ? {getAttribute: () => "true"} : original(selector);
  const navigated = [];
  panel._activateTab = name => navigated.push(name);
  await panel._loadPreview();
  await panel._loadPreview();
  assert.deepEqual(navigated, ["migration"]);
});


test("New installation goes to entity selection, not another setup choice", async () => {
  const response = {...preview(), onboarding_mode: "new"};
  response.ownership.reason_code = "new_output";
  const {panel} = makePanel(async () => response);
  panel._initialized = true;
  const original = panel.querySelector.bind(panel);
  panel.querySelector = selector => selector.includes('data-tab="summary"')
    ? {getAttribute: () => "true"} : original(selector);
  const navigated = [];
  panel._activateTab = name => navigated.push(name);
  await panel._loadPreview();
  assert.deepEqual(navigated, ["entities"]);
});


test("Guided onboarding never overrides a tab already selected by the user", async () => {
  const response = {...preview(), onboarding_mode: "existing"};
  response.ownership = {
    status: "unmanaged", write_allowed: false,
    reason_code: "unmanaged_output", reason: "Existing manual YAML",
  };
  const {panel} = makePanel(async () => response);
  panel._initialized = true;
  const original = panel.querySelector.bind(panel);
  panel.querySelector = selector => selector.includes('data-tab="summary"')
    ? {getAttribute: () => "false"} : original(selector);
  let navigated = false;
  panel._activateTab = () => {navigated = true;};
  await panel._loadPreview();
  assert.equal(navigated, false);
});


test("Recovered file action appears before the long per-entity review", () => {
  const takeover = source.indexOf('<section id="assistantTakeoverSection"');
  const adoption = source.indexOf('<section id="assistantAdoption"');
  assert.ok(takeover > 0 && adoption > takeover);
  assert.ok(source.includes('id="migrationChoiceDetails"'));
});

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

test("Missing owned production enables reviewed rebuild without changing labels", async () => {
  const calls = [];
  let repaired = false;
  const {panel, controls} = makePanel(async message => {
    calls.push(message);
    if (message.type === "ha_voice_label_sync/apply_preview") {
      assert.equal(message.rebuild_missing, true);
      assert.equal(message.production_sha256, null);
      assert.equal(message.preview_sha256, "a".repeat(64));
      repaired = true;
      return {
        output_path: "/config/google_assistant_entities.yaml",
        bytes_written: 2708, backup_path: null,
      };
    }
    return repaired ? {
      ...preview(false),
      ownership: {status: "managed", write_allowed: true},
      production_sha256: "a".repeat(64),
      comparison: {status: "ok", added: [], removed: [], modified: []},
      summary: {total: 28},
    } : {
      ...preview(false),
      onboarding_mode: "new",
      ownership: {
        status: "missing", reason_code: "managed_output_missing",
        write_allowed: false,
      },
      summary: {total: 28},
      comparison: {status: "missing"},
    };
  });
  await panel._loadPreview();
  assert.equal(panel._review.rebuild_missing, true);
  assert.equal(controls.apply.disabled, false);
  assert.match(controls.apply.textContent, /Reconstruire le fichier YAML/);
  await panel._applyPreview();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/get_preview", "ha_voice_label_sync/apply_preview",
    "ha_voice_label_sync/get_preview",
  ]);
  assert.match(panel.status, /Fichier YAML reconstruit/);
});

test("No missing-file rebuild for unowned, foreign or pending outputs", async () => {
  for (const reason_code of [
    "unmanaged_output", "owned_by_other_installation", "pending_operation",
    "registry_invalid", "output_changed",
  ]) {
    const calls = [];
    const {panel, controls} = makePanel(async message => {
      calls.push(message.type);
      return {
        ...preview(false),
        ownership: {status: "unknown", reason_code, write_allowed: false},
        summary: {total: 28}, comparison: {status: "missing"},
      };
    });
    await panel._loadPreview();
    assert.equal(panel._review, null, reason_code);
    assert.equal(controls.apply.disabled, true, reason_code);
    await panel._applyPreview();
    assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
  }
});

test("Operator cancellation never attempts missing-file recovery", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message.type);
    return {
      ...preview(false),
      ownership: {
        status: "missing", reason_code: "managed_output_missing",
        write_allowed: false,
      },
      summary: {total: 28}, comparison: {status: "missing"},
    };
  }, () => false);
  await panel._loadPreview();
  assert.equal(panel._review.rebuild_missing, true);
  await panel._applyPreview();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
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

test("Pending label draft survives ordinary Preview reload without any write", async () => {
  const calls = [], tabs = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    return preview(true);
  });
  panel._activateTab = tab => tabs.push(tab);
  const staged = {
    mode: "label_preview", projection: {ready: true},
    changes: [{entity_id: "climate.thermostat_sejour_2_2", enabled: true}],
    label_plan: {review: []}, comparison: {status: "ok"},
    label_plan_sha256: "a".repeat(64),
  };
  panel._stagedRestore = staged;
  panel._manualLabelChanges = new Map([["climate.thermostat_sejour_2_2", true]]);
  await panel._loadPreview();

  assert.deepEqual(calls, [], "reloading draft must not fetch/replace normal Preview");
  assert.deepEqual(tabs, ["preview"]);
  assert.strictEqual(panel._stagedRestore, staged);
  assert.equal(panel._manualLabelChanges.get("climate.thermostat_sejour_2_2"), true);
  assert.equal(controls.apply.disabled, true,
    "without a current safety evaluation the test fixture cannot approve");
  assert.match(panel.status, /proposition non appliquée/);
});

test("Pending backup draft also blocks normal generation and global refresh", async () => {
  const calls = [], tabs = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    return preview(true);
  });
  panel._activateTab = tab => tabs.push(tab);
  const stage = {mode: "restore_preview", backup_id: "save-1",
    label_plan: {add: [], remove: [], review: []},
    comparison: {status: "ok"}, projection: {ready: true}};
  panel._stagedRestore = stage;
  await panel._generatePreview();
  await panel._refreshAll();
  await panel._restoreBackup();

  assert.deepEqual(calls, []);
  assert.strictEqual(panel._stagedRestore, stage);
  assert.deepEqual(tabs, ["preview", "preview", "preview"]);
  assert.match(panel.status, /appliquez-la ou annulez-la/);
});

test("Pending draft blocks takeover and recovery preparation before any WS action", async () => {
  const calls = [], tabs = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    return {};
  });
  panel._activateTab = tab => tabs.push(tab);
  panel._stagedRestore = {
    mode: "label_preview", changes: [{entity_id: "switch.test", enabled: true}],
  };
  await panel._takeOverAssistantFile();
  await panel._adoptAssistantFile();
  assert.deepEqual(calls, []);
  assert.deepEqual(tabs, ["preview", "preview"]);
  assert.equal(panel._stagedRestore.mode, "label_preview");
});

test("After explicit Cancel or Apply, ordinary Preview fetch is allowed", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request.type);
    return preview(true);
  });
  panel._activateTab = () => {};
  panel._stagedRestore = {
    mode: "label_preview", changes: [{entity_id: "switch.test", enabled: true}],
  };
  panel._manualLabelChanges = new Map([["switch.test", true]]);
  await panel._cancelPreview();
  assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"]);
  assert.equal(panel._stagedRestore, null);
  assert.equal(panel._manualLabelChanges, null);

  panel._stagedRestore = {mode: "restore_preview"};
  await panel._loadPreview(true); // completed/failed server Apply refresh only
  assert.equal(panel._stagedRestore, null);
  assert.equal(calls.length, 2);
});

test("Interrupted recovery and reconciliation always block normal Apply", async () => {
  for (const scenario of [
    {recovery_pending: true},
    {ownership: {
      status: "pending", write_allowed: false, reason_code: "pending_operation",
    }},
    {ownership: {
      status: "unknown", write_allowed: false,
      reason_code: "restore_reconciliation_required",
    }},
  ]) {
    const calls = [];
    const {panel, controls} = makePanel(async request => {
      calls.push(request.type);
      return {
        ...managedPreviewWithComparison({
          added: ["switch.unapplied"], identical_entities: false,
          identical_text: false,
        }),
        ...scenario,
      };
    });
    await panel._loadPreview();
    assert.equal(panel._review, null, JSON.stringify(scenario));
    assert.equal(controls.apply.disabled, true, JSON.stringify(scenario));
    await panel._applyPreview();
    assert.deepEqual(calls, ["ha_voice_label_sync/get_preview"],
      "never issue Apply while recovery is not finalized");
  }
});

test("Generating normal Preview must not discard a pending HA label proposal", async () => {
  const calls = [], tabs = [];
  const {panel, controls} = makePanel(async request => {
    calls.push(request.type);
    return preview(true);
  });
  panel._activateTab = tab => tabs.push(tab);
  const staged = {
    mode: "label_preview",
    changes: [{entity_id: "climate.thermostat_test", enabled: true}],
    projection: {ready: true},
  };
  panel._stagedRestore = staged;
  panel._manualLabelChanges = new Map([
    ["climate.thermostat_test", true],
  ]);
  await panel._generatePreview();
  assert.deepEqual(calls, []);
  assert.deepEqual(tabs, ["preview"]);
  assert.strictEqual(panel._stagedRestore, staged);
  assert.equal(panel._manualLabelChanges.get("climate.thermostat_test"), true);
  assert.equal(controls.generate.disabled, false);
});

test("Initial Preview button uses a prepared label Preview when one exists", () => {
  const start = source.indexOf('const pending = this._stagedRestore?.mode === "label_preview"');
  const end = source.indexOf('panel.appendChild(prepare);', start);
  const fragment = source.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(fragment, /initialPendingPreview/);
  assert.match(fragment, /this._activateTab\("preview"\)/);
  assert.match(fragment, /if \(this._stagedRestore\?\.mode === "label_preview"\)/);
  assert.doesNotMatch(fragment, /apply_preview|set_entity_label/);
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
  assert.equal(panel.openedTab, undefined, "Selection must stay on current tab");
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

test("HA refresh translation preserves contextual Apply label for staged changes", () => {
  const {panel, controls} = makePanel(async () => preview());
  controls.refresh.setAttribute = () => {};
  panel._renderMigrationGuide = () => {};
  panel._renderAssistantFileStatus = () => {};

  const changes = [{entity_id: "switch.two", enabled: false}];
  panel._stagedRestore = manualStage(changes);
  panel._updateApplyButton();
  assert.equal(controls.apply.textContent, "Appliquer les changements d'étiquettes");
  panel._translateStatic(); // Called at every Home Assistant hass setter update.
  assert.equal(controls.apply.textContent, "Appliquer les changements d'étiquettes");

  panel._stagedRestore = {
    mode: "restore_preview",
    projection: {ready: true}, label_plan: {review: [], remove: ["switch.two"]},
    comparison: {status: "ok", identical_entities: false},
    label_plan_sha256: "c".repeat(64),
  };
  panel._updateApplyButton();
  assert.equal(controls.apply.textContent, "Appliquer cette restauration");
  panel._translateStatic();
  assert.equal(controls.apply.textContent, "Appliquer cette restauration");
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

test("Recovery Preview explains old-to-new YAML totals without changing diff counts", () => {
  const {panel} = makePanel(async () => preview());
  panel._recoveryPending = true;
  panel._stagedRestore = {recovery: true, mode: "label_preview"};
  const container = {
    children: [],
    appendChild(node) { this.children.push(node); },
    replaceChildren() { this.children = []; },
  };
  panel.querySelector = selector => selector === "#previewChanges" ? container : null;
  panel._renderPreviewChanges({
    available: true,
    production_summary: {total: 40},
    summary: {total: 25, entities: []},
    comparison: {
      status: "ok", added: [],
      removed: Array.from({length: 15}, (_, i) => "switch.old_" + i),
      modified: Array.from({length: 16}, (_, i) => ({
        entity_id: "switch.changed_" + i,
        fields: {name: {before: "Old", after: "Current"}},
      })),
    },
  });
  const rendered = flattenText(container);
  assert.match(rendered, /Différences entre l'ancien et le nouveau YAML/);
  assert.match(rendered, /Ancien fichier : 40 entités/);
  assert.match(rendered, /Nouveau fichier proposé : 25 entités/);
  assert.match(rendered, /Entités supprimées \(15\)/);
  assert.match(rendered, /Entités modifiées \(16\)/);
  assert.doesNotMatch(rendered, /Entités ajoutées \(1\)/);
});

test("Normal Preview keeps its original title and shows no recovery totals", () => {
  const {panel} = makePanel(async () => preview());
  const container = {
    children: [],
    appendChild(node) { this.children.push(node); },
    replaceChildren() { this.children = []; },
  };
  panel.querySelector = selector => selector === "#previewChanges" ? container : null;
  panel._renderPreviewChanges({
    available: true,
    production_summary: {total: 40},
    summary: {total: 25, entities: []},
    comparison: {
      status: "ok", added: [], removed: ["switch.old"], modified: [],
    },
  });
  const rendered = flattenText(container);
  assert.match(rendered, /Changements proposés à Google Assistant/);
  assert.doesNotMatch(rendered, /Ancien fichier : 40 entités/);
});

test("Fresh installation without YAML explains existing HVLS labels and Preview action", () => {
  assert.match(source, /initialLabelsDetected:.*28|initialLabelsDetected:/);
  const start = source.indexOf('unavailable.textContent = this._t("productionStatsUnavailable")');
  const end = source.indexOf("const comparison = result.comparison ||", start);
  assert.ok(start > 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /this._onboardingMode === "new"/);
  assert.match(block, /entity.has_label === true && entity.eligible === true/);
  assert.match(block, /"initialLabelsDetected"/);
  assert.match(block, /this._generatePreview\(\)/);
  assert.match(block, /this._activateTab\("preview"\)/);
  assert.doesNotMatch(block, /apply_preview|set_entity_label|write_owned_output/);
});

test("The initial YAML Preview remains a reviewed proposal, not an Apply", () => {
  const start = source.indexOf('  _renderPreviewChanges(result) {');
  const end = source.indexOf('  _productionStatus(', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /this._tf\("initialYamlPreview", \{count: result.summary.total\}\)/);
  assert.doesNotMatch(block, /write_owned_output|set_entity_label/);
});

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

test("Import of 40 entities with 39 ordinary Preview removals is flagged", () => {
  const {panel} = makePanel(async () => preview(false));
  panel._onboardingMode = "existing";
  const container = {
    children: [],
    replaceChildren() {this.children = [];},
    appendChild(child) {this.children.push(child);},
    append(...children) {this.children.push(...children);},
  };
  panel.querySelector = selector => selector === "#previewChanges" ? container : null;
  panel._renderPreviewChanges({
    available: true,
    summary: {entities: []},
    production_summary: {total: 40},
    comparison: {
      status: "ok",
      added: ["switch.one", "switch.two", "switch.three"],
      removed: Array.from({length: 39}, (_, i) => "switch.old_" + i),
      modified: [],
    },
  });
  const rendered = flattenText(container);
  assert.match(rendered, /ce n'est PAS une reprise/);
  assert.match(rendered, /39 entités sur 40/);
  assert.match(rendered, /Retourner à l'Assistant/);
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

test("Selected backup stays reviewable when production YAML is missing", () => {
  const {panel} = makePanel(async () => ({}));
  const diff = {
    children: [], replaceChildren() {this.children = [];},
    appendChild(item) {this.children.push(item);},
  };
  const restore = {disabled: true, textContent: ""};
  panel.querySelector = selector => selector === "#backupDiff" ? diff :
    selector === "#restoreBackup" ? restore : null;
  panel._backupReview = {
    backup_id: "historical.safety.bak",
    production_sha256: null, production_missing: true,
    summary: {total: 40}, comparison: {status: "missing"},
  };
  panel._renderBackupDiff();
  assert.equal(restore.disabled, false);
  assert.match(diff.children[0].textContent, /production est absent/);
  assert.match(diff.children[0].textContent, /40 entités/);
});

test("Missing-production backup stages a read-only Preview with unresolved labels", async () => {
  const requests = [], tabs = [];
  const {panel, controls} = makePanel(async request => {
    requests.push(request);
    return {
      mode: "restore_preview", available: true, can_apply: false,
      production_missing: true, content: "switch.test: {}\n",
      comparison: {status: "missing"}, summary: {total: 40},
      projection: {ready: false},
      label_plan: {review: [{entity_id: "switch.absent", reason: "missing_ha_entity"}],
        add: [], remove: []},
      label_plan_sha256: "c".repeat(64),
    };
  });
  panel._activateTab = tab => tabs.push(tab);
  panel._backupReview = {
    backup_id: "historical.safety.bak", backup_sha256: "b".repeat(64),
    production_sha256: null, comparison: {status: "missing"},
  };
  await panel._restoreBackup();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].type, "ha_voice_label_sync/prepare_backup_preview");
  assert.equal(requests[0].production_sha256, null);
  assert.equal(panel._stagedRestore.mode, "restore_preview");
  assert.deepEqual(tabs, ["preview"]);
  assert.equal(controls.apply.disabled, true);
  assert.match(panel.status, /Restauration préparée/);
});

test("Reviewed missing-YAML backup restores only with aligned labels", async () => {
  const requests = [];
  const {panel, controls} = makePanel(async request => {
    requests.push(request);
    if (request.type === "ha_voice_label_sync/apply_backup_preview") {
      return {applied: true, reconciled: true, yaml_entities: 28,
        label_additions: 0, label_removals: 0, safety_backup: null};
    }
    if (request.type === "ha_voice_label_sync/generate_preview") {
      return {entity_count: 28};
    }
    throw new Error("Unexpected request");
  });
  panel._stagedRestore = {
    mode: "restore_preview", production_missing: true,
    backup_id: "historical.safety.bak", backup_sha256: "b".repeat(64),
    production_sha256: null, label_plan_sha256: "c".repeat(64),
    label_plan: {add: [], remove: [], review: []},
    comparison: {status: "missing"}, projection: {ready: true},
  };
  panel._loadPreview = async () => {};
  panel._loadEntities = async () => {};
  panel._updateApplyButton();
  assert.equal(controls.apply.disabled, false);
  await panel._applyPreview();
  assert.deepEqual(requests.map(x => x.type), [
    "ha_voice_label_sync/apply_backup_preview",
    "ha_voice_label_sync/generate_preview",
  ]);
  assert.equal(requests[0].production_sha256, null);
  assert.match(panel.status, /Restauration validée/);
  assert.match(panel.status, /fichier de production était absent/);
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


test("Statistics signals prepared manual or reviewed normal changes", () => {
  const start = source.indexOf('const pendingCount = this._pendingChangeCount();');
  const end = source.indexOf('const counters = document.createElement("div");', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /pendingCount > 0 && \(this\._review/);
  assert.match(block, /this\._stagedRestore/);
  assert.match(block, /saved_draft_blocked/);
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
  assert.match(controls.migrationGuideNext.textContent, /étiquettes déjà présentes sont conservées/);
  assert.deepEqual(requests, []);
});

test("Assistant new-selection button navigates to entity manager without modifying labels", () => {
  const requests = [];
  const tabs = [];
  const {panel} = makePanel(async request => {requests.push(request);});
  const catalog = {
    entities: [{entity_id: "switch.existing", has_label: true, eligible: true}],
    labeled: 1,
  };
  panel._entityCatalog = catalog;
  panel._renderMigrationGuide = () => {};
  panel._renderAssistantFileStatus = () => {};
  panel._activateTab = tab => tabs.push(tab);

  panel._startNewSelection();

  assert.deepEqual(tabs, ["entities"]);
  assert.equal(panel._migrationIntent, "new");
  assert.strictEqual(panel._entityCatalog, catalog);
  assert.equal(catalog.entities[0].has_label, true);
  assert.deepEqual(requests, []);
  assert.match(source, /migrationIntentNew"\)\.addEventListener\("click", \(\) => this\._startNewSelection\(\)\)/);
  assert.match(source, /migrationGuideNew: "Choisir mes entités dans HA"/);
  assert.doesNotMatch(source, /Partir d'une sélection vide/);
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

test("Assistant folds the legacy audit after an existing YAML recovery", () => {
  const calls = [];
  const {panel} = makePanel(async request => { calls.push(request); });
  const controls = {
    migrationAdvanced: {open: true},
    migrationRecoveryAttention: {hidden: true, textContent: ""},
    migrationManagedNotice: {hidden: true, textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "assisted_migration",
    review_status: "pending_review",
    entities: Array.from({length: 6408}, (_, i) => ({
      entity_id: "sensor.test_" + i,
    })),
  }};
  panel._ownershipManaged = true;
  panel._recoveryPending = false;
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, false);
  assert.equal(controls.migrationManagedNotice.hidden, false);
  assert.match(controls.migrationManagedNotice.textContent, /pris en charge/);
  assert.equal(controls.migrationRecoveryAttention.hidden, true);
  // The expert can still expand the audit deliberately.
  controls.migrationAdvanced.open = true;
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, true);
  assert.deepEqual(calls, []);
});

test("Assistant never hides interrupted recovery despite managed ownership", () => {
  const {panel} = makePanel(async () => {});
  const controls = {
    migrationAdvanced: {open: false},
    migrationRecoveryAttention: {hidden: true, textContent: ""},
    migrationManagedNotice: {hidden: true, textContent: ""},
  };
  panel.querySelector = selector => controls[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {mode: "assisted_migration"}};
  panel._ownershipManaged = true;
  panel._recoveryPending = false;
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, false);
  panel._migrationRecoveryReport = {status: "review_required", needs_review: true};
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, true);
  assert.equal(controls.migrationRecoveryAttention.hidden, false);
  assert.equal(controls.migrationManagedNotice.hidden, true);
  // A pending recovery and restore reconciliation are not completed.
  panel._migrationRecoveryReport = null;
  panel._recoveryPending = true;
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, true);
  assert.equal(controls.migrationManagedNotice.hidden, true);
  panel._recoveryPending = false;
  panel._restoreReconcilePending = true;
  panel._renderMigrationAdvanced();
  assert.equal(controls.migrationAdvanced.open, true);
  assert.equal(controls.migrationManagedNotice.hidden, true);
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
  assert.match(controls.migrationGuideStep.textContent, /Vérifiez le fichier YAML à reprendre/);
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

test("Existing active Google Assistant YAML offers safe takeover when HVLS does not own it", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {
      read_only: true, source_active_verified: false,
      migration_authorized: false, stage_allowed: false,
      apply_allowed: false, cutover_allowed: false,
      status: "parsed", file_sha256: "a".repeat(64),
      adoption_entries_complete: true,
      adoption_entries: [{entity_id: "switch.existing", exposure: "expose",
        has_customizations: false, reasons: []}],
      counts: {entries: 1, entries_with_anomalies: 0},
    };
  });
  const ids = [
    "migrationGuide", "migrationGuideCandidate", "migrationGuideDetected",
    "migrationGuideQuestion", "assistantSourceDetected",
    "assistantSourceTitle", "assistantSourceSummary",
    "assistantFileSection", "assistantFilePath", "assistantFileCheck",
    "assistantFileResult", "assistantFileSafety", "assistantFileHint",
    "migrationGuideNext",
  ];
  const nodes = Object.fromEntries(ids.map(id => [id, {
    hidden: true, textContent: "", value: "", disabled: false,
    setAttribute() {},
  }]));
  panel.querySelector = selector => nodes[selector.slice(1)] || null;
  panel._migrationReport = {diagnostic: {
    mode: "assisted_migration", source: {
      status: "resolved",
      locations: [
        {path: "configuration.yaml"},
        {path: "google_assistant_entities.yaml"},
      ],
    }, counts: {explicit_yaml_entries: 40},
  }};
  panel._assistantFilePath = null;
  panel._applyBlockReasonCode = "unmanaged_output";
  panel._renderMigrationGuide();
  assert.equal(nodes.migrationGuide.hidden, false);
  assert.equal(nodes.assistantSourceDetected.hidden, false);
  assert.equal(nodes.assistantFileSection.hidden, false);
  assert.equal(panel._migrationIntent, "existing");
  assert.equal(nodes.assistantFilePath.value, "google_assistant_entities.yaml");
  assert.equal(nodes.assistantFileCheck.disabled, false);
  assert.match(nodes.assistantSourceSummary.textContent, /40 entité/);
  assert.equal(nodes.migrationGuideDetected.textContent, "");
  assert.equal(calls.length, 0);
  await panel._checkAssistantEntityFile();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/inspect_assistant_entity_file",
  ]);
  assert.equal(calls[0].path, "google_assistant_entities.yaml");
  assert.equal(panel._assistantAdoptionAvailable(), true);
  assert.match(nodes.assistantFileResult.textContent, /1 entité/);
});

test("Assistant takeover appears only for unmanaged or former-owner YAML", () => {
  const {panel} = makePanel(async () => {
    throw Error("No WS operation should run");
  });
  const guide = {hidden: true, setAttribute() {}};
  panel.querySelector = selector => selector === "#migrationGuide" ? guide : null;
  panel._migrationReport = {diagnostic: {
    mode: "assisted_migration", source: {status: "resolved", locations: []},
  }};
  for (const reason of ["unmanaged_output", "owned_by_other_installation"]) {
    panel._applyBlockReasonCode = reason;
    panel._renderMigrationGuide();
    assert.equal(guide.hidden, false, reason);
  }
  for (const reason of [null, "managed_output_missing", "no_changes"]) {
    panel._applyBlockReasonCode = reason;
    panel._renderMigrationGuide();
    assert.equal(guide.hidden, true, String(reason));
  }
  panel._applyBlockReasonCode = "unmanaged_output";
  panel._migrationReport.diagnostic.source.status = "ambiguous";
  panel._renderMigrationGuide();
  assert.equal(guide.hidden, true);
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
  assert.match(source, /Origine du fichier \(facultatif\)/);
  assert.match(source, /File origin \(optional\)/);
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

test("Recovery identifies eligible old entities, independent of existing HVLS labels", () => {
  const {panel, nodes} = standardAdoptionFixture(async () => {
    throw Error("Read-only comparison must not write");
  });
  const plan = panel._assistantAdoptionPlan();
  assert.deepEqual(Array.from(plan.candidates), ["light.new", "light.custom"]);
  assert.deepEqual(Array.from(plan.recoverable), ["light.new", "light.already", "light.custom"]);
  assert.equal(plan.totals.total, 5);
  assert.equal(plan.totals.recoverable, 3);
  assert.equal(plan.totals.ready, 2);
  assert.equal(plan.totals.already, 1);
  assert.equal(plan.totals.excluded, 1);
  assert.equal(plan.totals.review, 1); // Missing expose: no implicit exposure.
  panel._renderAssistantAdoption();
  assert.match(nodes.assistantAdoptSummary.textContent, /3 récupérables/);
  assert.equal(nodes.assistantAdoptApply.disabled, true); // Ownership first.
  panel._ownershipManaged = true;
  panel._recoveryPending = true;
  panel._renderAssistantAdoption();
  assert.equal(nodes.assistantAdoptApply.disabled, false);
});

test("40 old entities result in 25 recoverable, 14 absent and 1 ineligible", () => {
  const {panel} = standardAdoptionFixture(async () => {});
  panel._assistantFileReport.adoption_entries = [
    ...Array.from({length: 25}, (_, i) => ({
      entity_id: "light.item_" + i, exposure: "expose",
      has_customizations: true, reasons: [],
    })),
    ...Array.from({length: 14}, (_, i) => ({
      entity_id: "climate.old_" + i, exposure: "expose",
      has_customizations: false, reasons: [],
    })),
    {entity_id: "binary_sensor.rain", exposure: "expose",
      has_customizations: false, reasons: []},
  ];
  panel._assistantFileReport.counts.entries = 40;
  panel._entityCatalog.entities = [
    ...Array.from({length: 25}, (_, i) => ({
      entity_id: "light.item_" + i, eligible: true, has_label: i === 0,
    })),
    {entity_id: "binary_sensor.rain", eligible: false, has_label: false},
  ];
  const plan = panel._assistantAdoptionPlan();
  assert.deepEqual({...plan.totals}, {
    total: 40, ready: 24, already: 1, recoverable: 25,
    missing: 14, ineligible: 1, excluded: 0, review: 0,
    existingNew: 0, nextTotal: 25,
  });
  assert.equal(plan.complete, true);
  assert.equal(plan.recoverable.length, 25);
});

test("Taking over a former YAML saves it first and displays recovery counts, not ordinary Preview", async () => {
  const calls = [], confirmations = [];
  const {panel, nodes} = standardAdoptionFixture(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/prepare_existing_output_takeover") {
      return {
        eligible: true, selected_path: request.path, entities: 5,
        production_sha256: "a".repeat(64), preview_sha256: "b".repeat(64),
        recorded_sha_mismatch: true, previous_sha256: "c".repeat(64),
        previous_entry_id: "old", ownership_revision: 1,
        changes: {added: 2, removed: 4, modified: 1},
      };
    }
    if (request.type === "ha_voice_label_sync/confirm_existing_output_takeover") {
      assert.equal(request.confirmed, true);
      assert.equal(request.acknowledge_changed_output, true);
      return {
        taken_over: true, backup_name: "old.safety.bak",
        production_unchanged: true, apply_performed: false,
      };
    }
    throw Error("No automatic Apply or label write allowed");
  }, message => {confirmations.push(message);return true;});
  panel._applyBlockReasonCode = "owned_by_other_installation";
  panel._loadPreview = async () => {
    panel._applyBlockReasonCode = null;
    panel._ownershipManaged = true;
    panel._recoveryPending = true;
  };
  await panel._takeOverAssistantFile();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/prepare_existing_output_takeover",
    "ha_voice_label_sync/confirm_existing_output_takeover",
  ]);
  assert.match(confirmations[0], /5 entités/);
  assert.match(confirmations[0], /3\./);
  assert.doesNotMatch(confirmations[0], /SHA-256|Preview ordinaire|4 suppression/);
  assert.match(nodes.assistantTakeoverResult.textContent, /sauvegarde vérifiée/i);
  assert.equal(nodes.assistantAdoptApply.disabled, false);
});

test("Takeover cancellation and source digest mismatch never transfer ownership", async () => {
  for (const mode of ["cancel", "stale"]) {
    const calls = [];
    const {panel} = standardAdoptionFixture(async req => {
      calls.push(req.type);
      return {
        eligible: true, selected_path: req.path, entities: 5,
        production_sha256: mode === "stale" ? "f".repeat(64) : "a".repeat(64),
        preview_sha256: "b".repeat(64),
      };
    }, () => false);
    panel._applyBlockReasonCode = "unmanaged_output";
    panel._loadPreview = async () => {};
    await panel._takeOverAssistantFile();
    assert.deepEqual(calls, ["ha_voice_label_sync/prepare_existing_output_takeover"]);
  }
});

test("Recovery stage shows 25 entities and never calls direct set_entity_label", async () => {
  const calls = [], navigated = [];
  const {panel} = standardAdoptionFixture(async req => {
    calls.push(req);
    if (req.type === "ha_voice_label_sync/inspect_assistant_entity_file") {
      return cloneAdoptionReport(panel._assistantFileReport);
    }
    if (req.type === "ha_voice_label_sync/prepare_manual_label_preview") {
      assert.equal(req.recovery, true);
      assert.deepEqual(JSON.parse(JSON.stringify(req.changes)), [
        {entity_id: "light.custom", enabled: true},
        {entity_id: "light.new", enabled: true},
      ]);
      return {
        mode: "label_preview", recovery: true,
        projection: {ready: true}, changes: req.changes,
        preview_sha256: "f".repeat(64), label_plan_sha256: "b".repeat(64),
        production_sha256: "a".repeat(64), path: "Recovery Preview",
        content: "light.new:\n  expose: true\n",
        summary: {total: 3},
      };
    }
    throw Error("Unexpected WS mutation");
  });
  panel._ownershipManaged = true;
  panel._recoveryPending = true;
  panel._loadEntities = async () => true;
  panel._activateTab = tab => navigated.push(tab);
  panel._renderAnalysis = () => {};
  await panel._adoptAssistantFile();
  assert.deepEqual(calls.map(x => x.type), [
    "ha_voice_label_sync/inspect_assistant_entity_file",
    "ha_voice_label_sync/prepare_manual_label_preview",
  ]);
  assert.equal(panel._stagedRestore.recovery, true);
  assert.deepEqual(navigated, ["preview"]);
  assert.equal(panel._assistantAdoptBusy, false);
});

test("Recovery preserves previously labeled entities absent from the old YAML", async () => {
  const {panel} = standardAdoptionFixture(async req => {
    if (req.type === "ha_voice_label_sync/inspect_assistant_entity_file") {
      return cloneAdoptionReport(panel._assistantFileReport);
    }
    assert.equal(req.type, "ha_voice_label_sync/prepare_manual_label_preview");
    assert.ok(!req.changes.some(x => x.entity_id === "light.extra"));
    assert.ok(req.changes.some(x => x.entity_id === "light.custom" && x.enabled === true));
    return {mode: "label_preview", recovery: true,
      projection: {ready: true}, changes: req.changes,
      preview_sha256: "c".repeat(64), label_plan_sha256: "b".repeat(64),
      production_sha256: "a".repeat(64), path: "Recovery",
      content: "light.new:\n  expose: true\n", summary: {total: 4}};
  });
  panel._entityCatalog.entities.push({
    entity_id: "light.extra", eligible: true, has_label: true,
  });
  panel._ownershipManaged = true;
  panel._recoveryPending = true;
  panel._loadEntities = async () => true;
  panel._activateTab = () => {};
  await panel._adoptAssistantFile();
  assert.equal(panel._stagedRestore?.recovery, true);
});

test("Recovery stage fails closed when the original YAML has changed", async () => {
  const calls = [];
  const {panel,nodes} = standardAdoptionFixture(async req => {
    calls.push(req.type);
    return {...cloneAdoptionReport(panel._assistantFileReport),
      file_sha256: "f".repeat(64)};
  });
  panel._ownershipManaged = true;
  panel._recoveryPending = true;
  panel._loadEntities = async () => true;
  await panel._adoptAssistantFile();
  assert.deepEqual(calls, ["ha_voice_label_sync/inspect_assistant_entity_file"]);
  assert.equal(panel._stagedRestore, null);
  assert.match(nodes.assistantAdoptResult.textContent, /refusée/);
});

test("Unmanaged file cannot stage a recovery even with a forged click", async () => {
  const {panel} = standardAdoptionFixture(async () => {
    throw Error("No WS call accepted");
  });
  panel._recoveryPending = true;
  await panel._adoptAssistantFile();
  assert.equal(panel._stagedRestore, undefined);
});

test("Empty label changes can still Apply a recovery cleanup of obsolete YAML", () => {
  const {panel, controls} = makePanel(async () => {});
  panel._stagedRestore = {mode: "label_preview", recovery: true,
    changes: [], projection: {ready: true},
    label_plan: {review: []}, label_plan_sha256: "a".repeat(64),
    comparison: {status: "ok"},};
  panel._updateApplyButton();
  assert.equal(controls.apply.disabled, false);
});


test("Large removal in normal Apply requires counted confirmation", async () => {
  const calls = [];
  const prompts = [];
  const bulk = {
    production_summary: {total: 80},
    comparison: {
      status: "ok", added: [],
      removed: Array.from({length: 77}, (_, i) => "switch.old_" + i),
    },
  };
  let accept = false;
  const {panel} = makePanel(async message => {
    calls.push(message);
    return {output_path: "/config/entities.yaml", bytes_written: 42};
  }, message => { prompts.push(message); return accept; });
  panel._review = {
    preview_sha256: "a".repeat(64),
    production_sha256: "b".repeat(64),
  };
  panel._lastAnalysis = bulk;
  panel._loadPreview = async () => {};

  await panel._applyPreview();
  assert.equal(calls.length, 0);
  assert.match(prompts[0], /77/);
  assert.match(prompts[0], /80/);
  assert.match(prompts[0], /3/);
  assert.match(prompts[0], /SUPPRESSION IMPORTANTE/);

  accept = true;
  await panel._applyPreview();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "ha_voice_label_sync/apply_preview");
  assert.equal(calls[0].acknowledged_bulk_removals, 77);
});


test("Large removal from manual labels includes approval count", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message);
    if (message.type === "ha_voice_label_sync/apply_manual_label_preview")
      return {applied: true, reconciled: true, label_additions: 0,
        label_removals: 77};
    return {generated: true};
  });
  panel._stagedRestore = {
    ...manualStage([{entity_id: "switch.old_0", enabled: false}]),
    production_summary: {total: 80},
    comparison: {
      status: "ok", added: [],
      removed: Array.from({length: 77}, (_, i) => "switch.old_" + i),
    },
  };
  panel._loadPreview = async () => {};
  panel._loadEntities = async () => {};
  await panel._applyPreview();
  assert.equal(calls[0].type, "ha_voice_label_sync/apply_manual_label_preview");
  assert.equal(calls[0].acknowledged_bulk_removals, 77);
});


test("Large removal from backup restoration includes approval count", async () => {
  const calls = [];
  const {panel} = makePanel(async message => {
    calls.push(message);
    if (message.type === "ha_voice_label_sync/apply_backup_preview")
      return {applied: true, reconciled: true, yaml_entities: 3,
        label_additions: 0, label_removals: 77};
    return {generated: true};
  });
  panel._stagedRestore = {
    mode: "restore_preview", backup_id: "old.bak",
    backup_sha256: "a".repeat(64),
    production_sha256: "b".repeat(64),
    label_plan_sha256: "c".repeat(64),
    label_plan: {add: [], remove: [], review: []},
    projection: {ready: true},
    production_summary: {total: 80},
    comparison: {
      status: "ok", identical_text: false, added: [],
      removed: Array.from({length: 77}, (_, i) => "switch.old_" + i),
    },
  };
  panel._loadPreview = async () => {};
  panel._loadEntities = async () => {};
  await panel._applyPreview();
  assert.equal(calls[0].type, "ha_voice_label_sync/apply_backup_preview");
  assert.equal(calls[0].acknowledged_bulk_removals, 77);
});



function attachPreviewTab(panel) {
  const original = panel.querySelector.bind(panel);
  const tabNames = ["summary", "exclusions", "entities", "preview",
    "backups", "migration"];
  const buttons = Object.fromEntries(tabNames.map(name => {
    const classes = new Set();
    return [name, {
      hidden: false, dataset: {tab: name}, textContent: "",
      classList: {
        toggle(token, enabled) {
          if (enabled) classes.add(token); else classes.delete(token);
        },
        contains(token) {return classes.has(token);},
      },
    }];
  }));
  panel.querySelector = selector => {
    const tabName = selector.match(/^\.hvls-tab\[data-tab="([^"]+)"\]$/)?.[1];
    return tabName ? buttons[tabName] : original(selector);
  };
  panel._updateTabLabels();
  return buttons;
}

test("Selecting multiple entities stays in Statistics or Entity Management and updates Preview badge", async () => {
  for (const startingTab of ["summary", "entities"]) {
    const calls = [], navigations = [];
    const entities = [
      {entity_id: "switch.one", has_label: false, eligible: true},
      {entity_id: "switch.two", has_label: false, eligible: true},
      {entity_id: "switch.three", has_label: false, eligible: true},
    ];
    const {panel, controls} = makePanel(async request => {
      calls.push(request.type);
      if (request.type === "ha_voice_label_sync/prepare_manual_label_preview")
        return manualStage(request.changes);
      if (request.type === "ha_voice_label_sync/get_preview") return preview();
      throw Error("Unexpected API call");
    });
    const tabs = attachPreviewTab(panel);
    panel._activateTab = name => navigations.push(name);
    panel._entityCatalog = {entities};
    for (const entity of entities) {
      await panel._setEntityLabel(entity, {checked: true});
    }
    assert.deepEqual(navigations, [],
      startingTab + " should not redirect on checkbox change");
    assert.equal(tabs.preview.textContent, "4 · Preview (3)");
    assert.equal(tabs.preview.classList.contains("has-pending"), true);
    assert.equal(tabs.summary.classList.contains("has-pending"), false);
    assert.equal(tabs.entities.classList.contains("has-pending"), false);
    assert.equal(controls.apply.disabled, false);
    assert.equal(panel._manualLabelChanges.size, 3);

    // Undo an item while staying in the same tab: this is a net-count.
    await panel._setEntityLabel(entities[0], {checked: false});
    assert.equal(tabs.preview.textContent, "4 · Preview (2)");
    await panel._setEntityLabel(entities[1], {checked: false});
    assert.equal(tabs.preview.textContent, "4 · Preview (1)");
    await panel._setEntityLabel(entities[2], {checked: false});
    assert.equal(tabs.preview.textContent, "4 · Preview");
    assert.equal(tabs.preview.classList.contains("has-pending"), false);
    assert.deepEqual(navigations, []);
    assert.equal(panel._manualLabelChanges, null);
    assert.ok(calls.every(type => [
      "ha_voice_label_sync/prepare_manual_label_preview",
      "ha_voice_label_sync/get_preview",
    ].includes(type)));
    assert.ok(!calls.some(type => /apply|set_entity_label/.test(type)));
  }
});

test("Pending Preview badge reflects reviewed diff and clears when approval disappears", () => {
  const {panel} = makePanel(async () => preview());
  const tabs = attachPreviewTab(panel);
  panel._lastAnalysis = {
    comparison: {status: "ok", added: ["switch.a"], removed: ["switch.b"],
      modified: [{entity_id: "switch.c"}]},
  };
  panel._review = {preview_sha256: "a".repeat(64)};
  panel._updateTabLabels();
  assert.equal(tabs.preview.textContent, "4 · Preview (3)");
  assert.equal(tabs.preview.classList.contains("has-pending"), true);
  panel._review = null;
  panel._updateTabLabels();
  assert.equal(tabs.preview.textContent, "4 · Preview");
  assert.equal(tabs.preview.classList.contains("has-pending"), false);
});

test("Restoration badge counts distinct YAML and HA-label changes", () => {
  const {panel} = makePanel(async () => ({}));
  const tabs = attachPreviewTab(panel);
  panel._stagedRestore = {
    mode: "restore_preview",
    comparison: {status: "ok", added: ["light.a"], removed: ["switch.b"],
      modified: []},
    label_plan: {add: ["light.a", "light.c"], remove: ["switch.b"]},
  };
  panel._updateTabLabels();
  assert.equal(tabs.preview.textContent, "4 · Preview (3)");
  panel._stagedRestore = {mode: "restore_preview",
    comparison: {status: "missing"}, summary: {total: 7}};
  panel._updateTabLabels();
  assert.equal(tabs.preview.textContent, "4 · Preview (7)");
});

test("Blocked draft remains visible but never grants Apply authorization", () => {
  const {panel,controls} = makePanel(async () => ({}));
  const tabs = attachPreviewTab(panel);
  panel._manualLabelChanges = new Map([["switch.a", true]]);
  panel._stagedRestore = {mode: "saved_draft_blocked", changes: [
    {entity_id: "switch.a", enabled: true}
  ], projection: {ready: false}};
  panel._updateApplyButton();
  assert.equal(tabs.preview.textContent, "4 · Preview (1)");
  assert.equal(tabs.preview.classList.contains("has-pending"), true);
  assert.equal(controls.apply.disabled, true);
  panel._manualLabelChanges = null;
  panel._stagedRestore = null;
  panel._updateApplyButton();
  assert.equal(tabs.preview.textContent, "4 · Preview");
});

test("Changing language recomputes translated Preview badge but retains count", () => {
  const {panel} = makePanel(async () => ({}));
  const tabs = attachPreviewTab(panel);
  panel._stagedRestore = manualStage([
    {entity_id: "switch.a", enabled: true},
    {entity_id: "switch.b", enabled: true},
  ]);
  panel._updateTabLabels();
  assert.equal(tabs.preview.textContent, "4 · Preview (2)");
  panel._language = "en";
  panel._updateTabLabels();
  assert.equal(tabs.preview.textContent, "4 · Preview (2)");
});

test("Statistics keeps expanded room and domain lists during analysis refresh", () => {
  const {panel} = makePanel(async () => ({}));
  const controls = {};
  const makeContainer = () => ({
    children: [],
    replaceChildren(...children) {this.children = children;},
    appendChild(child) {this.children.push(child);},
    querySelectorAll(selector) {
      assert.equal(selector, "details[data-stats-group]");
      const result = [];
      function walk(node) {
        if (!node || typeof node !== "object") return;
        if (node.tag === "details" && node.dataset?.statsGroup) result.push(node);
        for (const child of node.children || []) walk(child);
      }
      for (const child of this.children) walk(child);
      return result;
    },
  });
  controls["#analysis"] = makeContainer();
  for (const id of ["#exclusions", "#previewChanges"]) {
    controls[id] = makeContainer();
  }
  controls["#unifiedDiff"] = {textContent: ""};
  controls["#rawDiffDetails"] = {hidden: true};
  panel.querySelector = selector => controls[selector] || null;
  panel._renderPreviewChanges = () => {};
  panel._renderRestoreWarning = () => {};
  panel._renderRestoreReconciliation = () => {};
  panel._renderStagedRestorePlan = () => {};
  // makePanel stubs all full renders by default: restore the real method.
  panel._renderAnalysis = Object.getPrototypeOf(panel)._renderAnalysis.bind(panel);
  const snapshot = {
    available: true, production_summary: {
      total: 1, rooms: 1, without_room: 0,
      domains: {switch: 1}, by_room: {"Bureau": 1},
      entities: [{entity_id: "switch.lampe", domain: "switch", room: "Bureau"}],
    },
    comparison: {status: "ok", added: [], removed: [], modified: [],
      unchanged: 1},
    exclusions: {entities: []},
  };
  panel._renderAnalysis(snapshot);
  const groups = controls["#analysis"].querySelectorAll("details[data-stats-group]");
  assert.equal(groups.length, 2);
  groups[0].open = true;
  groups[1].open = true;
  panel._renderAnalysis(snapshot);
  const refreshed = controls["#analysis"].querySelectorAll("details[data-stats-group]");
  assert.equal(refreshed.length, 2);
  assert.ok(refreshed.every(group => group.open),
    "Expanded domain and room groups should remain open");
});

test("New entity management defaults to eligible entities without HVLS", () => {
  const option = '<option value="eligible_no" selected>';
  assert.ok(source.includes(option));
  assert.ok(source.includes(
    'const filter = this.querySelector("#entityFilter")?.value || "eligible_no";'
  ));
});

test("Removing the last selected HVLS entity requires explicit confirmation", () => {
  const prompts = [];
  const {panel} = makePanel(async () => ({}), message => {
    prompts.push(message);
    return true;
  });
  const emptyPlan = {
    mode: "label_preview",
    summary: {total: 0},
    production_summary: {total: 1},
    comparison: {status: "ok", added: [], removed: ["switch.one"],
      modified: []},
  };
  const approved = panel._confirmWithBulkRemoval(emptyPlan, "Appliquer ?");
  assert.equal(approved, 0);
  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /dernière entité HVLS/);
  const normalPlan = {...emptyPlan, summary: {total: 1}};
  panel._confirmWithBulkRemoval(normalPlan, "Appliquer ?");
  assert.equal(prompts.length, 2);
  assert.doesNotMatch(prompts[1], /dernière entité HVLS/);
});

test("Refusing removal of the last selected entity leaves Apply unapproved", () => {
  const {panel} = makePanel(async () => ({}), () => false);
  const result = {
    mode: "label_preview", summary: {total: 0},
    production_summary: {total: 1},
    comparison: {status: "ok", added: [], removed: ["switch.one"],
      modified: []},
  };
  assert.equal(panel._confirmWithBulkRemoval(result, "Appliquer ?"), null);
});

test("Assistant provides a localized direct GitHub issue-report link", () => {
  assert.ok(source.includes('id="assistantReportIssue"'));
  assert.ok(source.includes(
    'href="https://github.com/flimo44/ha-voice-label-sync/issues/new"'
  ));
  assert.ok(source.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(source.includes('Signaler un problème sur GitHub'));
  assert.ok(source.includes('Report an issue on GitHub'));
});

test("Bulk removal confirmation covers small HA configurations (UI/backend parity)", () => {
  const {panel} = makePanel(async () => ({}));
  for (const [before, removed, needed] of [
    [10, 9, true], [8, 7, true], [6, 3, true],
    [3, 3, true], [3, 2, false], [2, 2, false],
    [6, 2, false], [10, 3, false], [100, 20, false],
    [20, 10, true], [20, 9, false],
  ]) {
    const result = {
      production_summary: {total: before},
      comparison: {status: "ok", added: [],
        removed: Array.from({length: removed}, (_, i) => "switch." + i)},
    };
    const details = panel._bulkRemovalDetails(result);
    assert.equal(details !== null, needed, before + " -> " + (before - removed));
    if (needed) {
      assert.equal(details.removed, removed);
      assert.equal(details.after, before - removed);
    }
  }
});

test("Small configuration removal sends exact count after confirmation", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/apply_preview")
      return {output_path: "/config/google_assistant_entities.yaml",
        bytes_written: 13};
    return preview();
  });
  panel._review = {preview_sha256: "a".repeat(64),
    production_sha256: "b".repeat(64)};
  panel._lastAnalysis = {
    production_summary: {total: 8},
    comparison: {status: "ok", added: [],
      removed: Array.from({length: 7}, (_, i) => "switch." + i)},
  };
  panel._loadPreview = async () => {};
  await panel._applyPreview();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].acknowledged_bulk_removals, 7);
});

function blockingRestore(overrides = {}) {
  return {
    mode: "restore_preview", backup_id: "backup.bak",
    backup_sha256: "b".repeat(64), production_sha256: "a".repeat(64),
    label_plan_sha256: "c".repeat(64), ignored_entities: [],
    ignore_candidates: ["sensor.temp", "sensor.smoke", "switch.gone"],
    comparison: {status: "ok", added: [], removed: [], modified: [],
      identical_entities: false},
    label_plan: {add: [], remove: [], review: []},
    projection: {ready: false, comparison: {
      status: "ok",
      added: ["light.extra"],
      removed: ["switch.gone"],
      modified: [
        {entity_id: "sensor.temp", fields: {name: {
          before: "Temperature", after: "Piscine mesure ZB Temperature"}}},
        {entity_id: "sensor.smoke", fields: {room: {
          before: "Salon", after: null}}},
      ],
    }},
    ...overrides,
  };
}

test("Restore blockers explain each difference and which can be ignored", () => {
  const {panel} = makePanel(async () => ({}));
  const blockers = panel._restoreBlockers(blockingRestore());

  assert.deepEqual([...blockers.map(item => item.entity_id)],
    ["light.extra", "sensor.smoke", "sensor.temp", "switch.gone"]);
  const byId = Object.fromEntries(blockers.map(item => [item.entity_id, item]));
  assert.equal(byId["sensor.temp"].ignorable, true);
  assert.match(byId["sensor.temp"].reasons[0],
    /nom : sauvegarde « Temperature » → Home Assistant aujourd'hui « Piscine mesure ZB Temperature »/);
  assert.match(byId["sensor.smoke"].reasons[0], /pièce : .*« \(aucune\) »/);
  assert.match(byId["switch.gone"].reasons[0], /ne peut pas être régénérée/);
  assert.match(byId["light.extra"].reasons[0], /absente de la sauvegarde/);
  assert.equal(byId["light.extra"].ignorable, false);
});

test("Restore blockers hide ignored entities and disappear once exact", () => {
  const {panel} = makePanel(async () => ({}));
  const partly = panel._restoreBlockers(
    blockingRestore({ignored_entities: ["sensor.temp"]})
  );
  assert.equal(partly.some(item => item.entity_id === "sensor.temp"), false);
  assert.equal(
    panel._restoreBlockers(blockingRestore({projection: {ready: true}})).length,
    0,
  );
});

test("Ignoring all blocking entities sends one server-side recalculation", async () => {
  const calls = [];
  const staged = blockingRestore();
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {
      ...staged, ignored_entities: request.ignored_entities,
      projection: {ready: true},
    };
  });
  panel._stagedRestore = staged;
  await panel._setRestoreIgnored(["sensor.temp", "sensor.smoke"], true);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "ha_voice_label_sync/prepare_backup_preview");
  assert.deepEqual([...calls[0].ignored_entities],
    ["sensor.smoke", "sensor.temp"]);
  assert.deepEqual([...panel._stagedRestore.ignored_entities],
    ["sensor.smoke", "sensor.temp"]);
});

test("Bulk ignore refuses any entity the server did not offer", async () => {
  const calls = [];
  const {panel} = makePanel(async request => { calls.push(request); });
  panel._stagedRestore = blockingRestore();
  await panel._setRestoreIgnored(["sensor.temp", "light.extra"], true);
  assert.equal(calls.length, 0);
  assert.equal(panel._stagedRestore.ignored_entities.length, 0);
});

function renderRestoreNotice(panel, staged) {
  const notice = {hidden: true, children: [],
    replaceChildren(...items) {this.children = items;},
    appendChild(item) {this.children.push(item);},
  };
  const originalQuery = panel.querySelector.bind(panel);
  panel.querySelector = selector => selector === "#backupPreviewNotice"
    ? notice : originalQuery(selector);
  panel._stagedRestore = staged;
  panel._renderStagedRestorePlan();
  return notice;
}

function findNodes(node, predicate, found = []) {
  if (!node || typeof node !== "object") return found;
  if (predicate(node)) found.push(node);
  for (const child of node.children || []) findNodes(child, predicate, found);
  return found;
}

test("Restore box lists ignored entities with undo and dedupes other list", () => {
  const {panel} = makePanel(async () => ({}));
  const notice = renderRestoreNotice(panel, blockingRestore({
    ignored_entities: ["sensor.smoke"],
    ignore_candidates: ["sensor.temp", "sensor.smoke", "switch.gone",
      "switch.other"],
  }));
  const summaries = findNodes(notice, node => node.tag === "summary")
    .map(node => node.textContent);
  assert.ok(summaries.some(text =>
    /3 entité\(s\) empêchent la restauration exacte/.test(text)));
  assert.ok(findNodes(notice, node =>
    /Entités ignorées \(1\) — elles ne seront pas restaurées/
      .test(node.textContent)).length);
  const undo = findNodes(notice, node =>
    node.tag === "button" && node.textContent === "Rétablir");
  assert.equal(undo.length, 1);
  assert.match(undo[0]["aria-label"], /sensor\.smoke/);

  // The other list only contains entities not already shown, collapsed.
  const other = findNodes(notice, node => node.tag === "details" &&
    node.children[0]?.textContent === "Autres entités pouvant être ignorées");
  assert.equal(other.length, 1);
  assert.equal(other[0].open, false);
  const otherIds = findNodes(other[0], node => node.tag === "span")
    .map(node => node.textContent);
  assert.equal(otherIds.length, 1);
  assert.match(otherIds[0], /^switch\.other/);
});

test("Partial restoration box stays visible once nothing blocks", () => {
  const {panel} = makePanel(async () => ({}));
  const notice = renderRestoreNotice(panel, blockingRestore({
    ignored_entities: ["sensor.temp", "sensor.smoke"],
    projection: {ready: true},
  }));
  const summaries = findNodes(notice, node => node.tag === "summary")
    .map(node => node.textContent);
  assert.ok(summaries.includes(
    "Restauration partielle : 2 entité(s) ignorée(s)"));
  assert.equal(findNodes(notice, node =>
    node.tag === "button" && node.textContent === "Tout rétablir").length, 1);
});

test("Ignore controls are disabled while the Preview is recalculated", async () => {
  const pending = deferred();
  const {panel} = makePanel(async () => pending.promise);
  const staged = blockingRestore();
  const notice = renderRestoreNotice(panel, staged);
  const buttons = findNodes(notice, node => node.tag === "button");
  assert.ok(buttons.length >= 3);
  assert.ok(buttons.every(button => button.disabled === false));

  const updating = panel._setRestoreIgnored("sensor.temp", true);
  assert.ok(buttons.every(button => button.disabled === true));
  pending.resolve({...staged, ignored_entities: ["sensor.temp"]});
  await updating;
  assert.ok(buttons.every(button => button.disabled === false));
});

test("Final restore confirmation names the ignored entities", async () => {
  const confirmations = [];
  const {panel} = makePanel(async () => {
    throw new Error("No request expected after a refused confirmation");
  }, message => { confirmations.push(message); return false; });
  panel._stagedRestore = blockingRestore({
    ignored_entities: ["sensor.temp", "sensor.smoke"],
    projection: {ready: true},
    label_plan: {add: ["switch.gone"], remove: [], review: []},
  });
  await panel._applyStagedRestore();
  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0],
    /2 entité\(s\) ignorée\(s\) ne seront pas restaurées.*sensor\.smoke, sensor\.temp/);
  assert.match(confirmations[0], /Appliquer la sauvegarde après contrôle/);

  assert.equal(panel._restoreConfirmMessage(blockingRestore()),
    panel._t("backupPreviewConfirm"));
});

test("Ignore buttons rendered during restore preparation become usable", () => {
  const {panel} = makePanel(async () => ({}));
  // The initial restore Preview is rendered while _restoring is still true.
  panel._restoring = true;
  const notice = renderRestoreNotice(panel, blockingRestore());
  const buttons = findNodes(notice, node => node.tag === "button");
  assert.ok(buttons.length >= 3);
  assert.ok(buttons.every(button => button.disabled === true));

  // _restoreBackup's finally block: busy state ends.
  panel._restoring = false;
  panel._updateApplyButton();
  assert.ok(buttons.every(button => button.disabled === false));

  // Any other operation in progress disables them again.
  panel._applying = true;
  panel._updateApplyButton();
  assert.ok(buttons.every(button => button.disabled === true));
});

test("Name/room-only blockers offer restore with current values", () => {
  const {panel} = makePanel(async () => ({}));
  const staged = blockingRestore({
    refresh_candidates: ["sensor.temp", "sensor.smoke"],
  });
  const byId = Object.fromEntries(
    panel._restoreBlockers(staged).map(item => [item.entity_id, item]));
  assert.equal(byId["sensor.temp"].refreshable, true);
  assert.equal(byId["switch.gone"].refreshable, false);

  const notice = renderRestoreNotice(panel, staged);
  const labels = findNodes(notice, node => node.tag === "button")
    .map(node => node.textContent);
  assert.ok(labels.includes(
    "Restaurer ces 2 entités avec leur nom et pièce actuels"));
  assert.equal(labels.filter(text =>
    text === "Restaurer avec le nom et la pièce actuels").length, 2);
});

test("Restore with current values sends both lists and keeps choices exclusive", async () => {
  const calls = [];
  const staged = blockingRestore({
    ignored_entities: ["sensor.temp"],
    refresh_candidates: ["sensor.temp", "sensor.smoke"],
    refreshed_entities: [],
  });
  const {panel} = makePanel(async request => {
    calls.push(request);
    return {...staged, ignored_entities: request.ignored_entities,
      refreshed_entities: request.refreshed_entities,
      projection: {ready: true}};
  });
  panel._stagedRestore = staged;
  await panel._setRestoreRefreshed(["sensor.temp", "sensor.smoke"], true);

  assert.equal(calls.length, 1);
  assert.deepEqual([...calls[0].refreshed_entities],
    ["sensor.smoke", "sensor.temp"]);
  assert.deepEqual([...calls[0].ignored_entities], []);  // no longer ignored
  assert.match(panel.status,
    /0 entité\(s\) ignorée\(s\), 2 restaurée\(s\) avec le nom et la pièce actuels/);

  // Undo one entity: only allowed for entities currently refreshed.
  await panel._setRestoreRefreshed("sensor.smoke", false);
  assert.equal(calls.length, 2);
  assert.deepEqual([...calls[1].refreshed_entities], ["sensor.temp"]);
});

test("Restore with current values refuses entities the server did not offer", async () => {
  const calls = [];
  const {panel} = makePanel(async request => { calls.push(request); });
  panel._stagedRestore = blockingRestore({refresh_candidates: ["sensor.temp"]});
  await panel._setRestoreRefreshed(["sensor.temp", "switch.gone"], true);
  await panel._setRestoreRefreshed("sensor.temp", false);  // not refreshed yet
  assert.equal(calls.length, 0);
});

test("Refreshed entities are listed with undo and named in the confirmation", async () => {
  const confirmations = [];
  const {panel} = makePanel(async () => {
    throw new Error("No request expected after a refused confirmation");
  }, message => { confirmations.push(message); return false; });
  const staged = blockingRestore({
    projection: {ready: true},
    refresh_candidates: ["sensor.temp"],
    refreshed_entities: ["sensor.temp"],
    ignored_entities: ["switch.gone"],
    label_plan: {add: ["sensor.temp"], remove: [], review: []},
  });
  const notice = renderRestoreNotice(panel, staged);
  assert.ok(findNodes(notice, node =>
    /Restaurées avec le nom et la pièce actuels de Home Assistant \(1\)/
      .test(node.textContent)).length);
  assert.equal(findNodes(notice, node =>
    node.tag === "button" && node.textContent === "Annuler").length, 1);

  await panel._applyStagedRestore();
  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0],
    /1 entité\(s\) seront restaurées avec leur nom et leur pièce actuels.*sensor\.temp/);
  assert.match(confirmations[0], /1 entité\(s\) ignorée\(s\).*switch\.gone/);
});

test("Apply sends the refreshed entities with the approval", async () => {
  const calls = [];
  const {panel} = makePanel(async request => {
    calls.push(request);
    if (request.type === "ha_voice_label_sync/apply_backup_preview") {
      return {applied: true, reconciled: true, yaml_entities: 2,
        label_additions: 1, label_removals: 0, safety_backup: "safety.bak"};
    }
    return {generated: true};
  });
  panel._stagedRestore = blockingRestore({
    projection: {ready: true},
    refresh_candidates: ["sensor.temp"],
    refreshed_entities: ["sensor.temp"],
    label_plan: {add: ["sensor.temp"], remove: [], review: []},
  });
  panel._loadPreview = async () => {};
  panel._loadEntities = async () => {};
  await panel._applyStagedRestore();
  const apply = calls.find(call =>
    call.type === "ha_voice_label_sync/apply_backup_preview");
  assert.deepEqual([...apply.refreshed_entities], ["sensor.temp"]);
});
