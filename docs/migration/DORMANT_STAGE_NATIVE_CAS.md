# PR #129 — Reuse native full-label CAS in the dormant stage writer

This PR follows the verified read-only native registry rehearsal (#128),
the crash/restart tests (#123) and the non-executing investigation ledger
(#127). It hardens the **already-existing, deliberately dormant**
`migration_stage_executor.stage_one_approved_label` implementation.

**No staging endpoint, UI button, service, startup hook, approval token,
recovery executable or Google Assistant write is introduced.**
The dormant code remains callable only directly by internal Python/test
code. This is not permission to expose it to users yet.

## Two native checks and a durable intent

The existing staging transaction proceeds as follows:

1. Under the existing HA workflow lock, build a fresh migration diagnostic,
   native catalog and approved staging plan. Require exactly one metadata-free
   import candidate and the matching reviewed plan SHA.
2. Verify that the original manual Google Assistant YAML and protected
   baseline have not drifted; read the transaction journal and require
   `labels_staging`, the expected revision and **no operation for this
   entity**.
3. **NEW, before writing a journal intent:** call the proven, synchronous
   `capture_native_boundary` from #128 on the actual HA event loop. Capture
   this entity's native registry ID, unique label ID and **complete sorted
   set of its labels**, including all unrelated labels. Refuse before intent
   on missing/disabled/hidden entries, invalid labels, incorrect identity
   or unexpected target membership.
4. Write a durable single-entity `intent` using the existing journal's
   revision-CAS and intent-before-write guarantee. If interrupted after
   this, no retry is permitted; the intent stays unconfirmed.
5. Recheck the unchanged source YAML/baseline in the executor. If source
   drifted, the durable intent remains **unconfirmed** and no HA label is
   written.
6. **NEW, immediately before the native registry update:** within the
   same synchronous event-loop function, call
   `assess_native_boundary` against the *original complete snapshot*.
   Reject a changed native entity, changed label identity, changed target
   membership **or any unrelated label addition/removal**. Verify that
   the capture's entity ID, native ID, label ID, configured name and
   add-one-label direction match the approved plan. Recheck the raw native
   label set before calling `async_update_entity`, with **no `await`
   between assessment and update**.
7. Keep the existing post-write identity and full label-set validation.
   Only then attempt to mark the journal entry applied using the protected
   journal CAS. Any failure before the ACK leaves a pending `intent`
   for human investigation. **Never infer success or automatically retry
   from observed target-label presence.**

The new #128 snapshot's SHA-256 is *not authenticated* and **is not an
authorization token**. The dormant stage function still has its prior
review arguments; this PR adds no new execution authority, and old
investigation ledger decisions are never promoted to approval.

## What our tests prove

Offline regression tests run the dormant stage with the real guard and a
synthetic native registry. They inject a race **after intent durability,
before the native write**:

- unrelated label added;
- unrelated label removed;
- target label added by another actor;
- native entity ID replaced.

Each scenario must preserve the pending intent and make **zero writer
calls**. An invalid pre-intent label identity must leave **no intent**;
post-update tampering must leave an **unconfirmed intent** rather than
an ACK. The normal, uncontested test stages exactly one label and preserves
all unrelated labels.

Our isolated **actual Home Assistant Core 2026.11** smoke now exercises
the *private, synchronous native writer itself*, not the full migration
workflow. It creates two synthetic entities in a disposable HA config,
writes journal intents **before** invoking the private writer:

- With an unchanged native label set, it writes one synthetic target
  label; the original YAML remains byte-exact and the intent deliberately
  remains unacknowledged (the test does not call the journal ACK).
- For the second synthetic entity, it adds an unrelated label in the
  actual native HA registry after intent and before the private writer;
  the writer must reject the stale capture without adding the target or
  destroying the unrelated label. Both journal intents remain pending.

The rest of #123–#128 real automation, process-restart, history and
race-injection tests stay in the same CI job.

## What is *not* established

- **Full migration is not enabled or production-verified.** HA Core is
  exercised in an isolated container, without real Google Home accounts,
  external Node-RED automations or a live user's configuration.
- An ABA change (native labels changed then returned to the original set)
  is still not evidence of no external side effects.
- The HA event loop prevents interleaving by *other asyncio callbacks*
  during the synchronous check/write section, not arbitrary concurrently
  executing threads or independent external processes. Other integration
  code remains outside HVLS's workflow lock.
- Disk YAML and journal checks run asynchronously and cannot be atomic
  with a native HA update across processes. Future execution admission
  must explicitly account for those limits.
- The existing `admin_approved` boolean and reviewed plan are **not a
  complete end-user authorization workflow**. Before exposure, a separate
  admin-only, explicit, durable execution admission design must guarantee
  fresh credentials, journal intent, exactly-once semantics and safe
  acknowledgement, without trusting the investigation ledger.
- Native registry writes may emit HA events observable by other
  integrations; no test proves they are harmless.

**Bottom line: the existing dormant writer now vetoes full-set native
registry races immediately before writing, but NO production stage or
recovery action is available as a result of this PR.**

Tracks #103; follows #113 and #120–#128.
