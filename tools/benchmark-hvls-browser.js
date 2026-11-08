/*
 * HVLS beta.3 browser benchmark — run from the browser DevTools Console
 * while the HA Voice Label Sync panel is open.
 *
 * WARNING: _generatePreview() regenerates the PREVIEW file ONLY.
 * No labels are changed and apply_preview is NEVER called.
 * Run while no other HVLS operation is in progress.
 */
(async () => {
  "use strict";
  const panel = document.querySelector("hvls-preview-panel");
  if (!panel || !panel._hass) {
    console.error("[HVLS benchmark] Open the HVLS panel first.");
    return;
  }
  if (panel._applying || panel._refreshing || panel._generating ||
      panel._entityWritePending || panel._entityLoading) {
    console.warn("[HVLS benchmark] Another HVLS operation is in progress.");
    return;
  }

  const iterations = 3;
  const filter = panel.querySelector("#entityFilter");
  const search = panel.querySelector("#entitySearch");
  if (!filter || !search) {
    console.error("[HVLS benchmark] Entity filters not found.");
    return;
  }

  const savedFilter = filter.value;
  const savedSearch = search.value;
  const records = [];
  const now = () => performance.now();
  const measure = async (name, action) => {
    const samples = [];
    for (let i = 0; i < iterations; i++) {
      const start = now();
      await action();
      samples.push(now() - start);
    }
    samples.sort((a, b) => a - b);
    records.push({
      operation: name,
      runs: iterations,
      median_ms: +samples[1].toFixed(2),
      min_ms: +samples[0].toFixed(2),
      max_ms: +samples[2].toFixed(2),
    });
  };

  console.info("[HVLS benchmark] Starting — Preview regeneration only; no production apply.");
  try {
    await measure("Catalog: WebSocket + render", async () => {
      if (!await panel._loadEntities()) {
        throw new Error(panel._entityLoadError || "Catalog load failed");
      }
    });
    console.info("[HVLS benchmark] Catalog entities:", panel._entityCatalog?.total);

    // Measure the same filter and DOM rendering path used by the live UI.
    // Clear search only during the benchmark, then restore it.
    search.value = "";
    for (const [value, name] of [
      ["all", "Filter: all"],
      ["yes", "Filter: HVLS"],
      ["eligible_no", "Filter: eligible without HVLS"],
      ["ineligible", "Filter: ineligible"],
    ]) {
      if (![...filter.options].some(option => option.value === value)) continue;
      filter.value = value;
      await measure(name, () => panel._renderEntities());
    }

    // Preview regeneration may update the Preview file but never production.
    await measure("Preview: generate + fetch + render", async () => {
      await panel._generatePreview();
      if (panel._statusKey === "previewGenerateFailed") {
        throw new Error("Preview generation failed: " +
          (panel.querySelector("#status")?.textContent || "unknown error"));
      }
    });
    console.table(records);
    const report = {
      version: "hvls-beta3-benchmark-1",
      measured_at: new Date().toISOString(),
      entity_count: panel._entityCatalog?.total ?? null,
      iterations,
      timings_ms: records,
      note: "Browser wall-clock durations; catalog/preview include WebSocket and rendering; filters include DOM rendering.",
    };
    console.info("[HVLS benchmark] Copy this report to share:", JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    console.error("[HVLS benchmark] Stopped:", error);
  } finally {
    search.value = savedSearch;
    filter.value = savedFilter;
    panel._renderEntities();
    console.info("[HVLS benchmark] Original filters restored.");
  }
})();
