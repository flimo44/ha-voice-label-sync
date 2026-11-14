"""WebSocket API for HA Voice Label Sync."""

from __future__ import annotations

from functools import partial
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from hvls import (
    FileWriterError,
    GenerationRequest,
    RegistryError,
    WorkflowError,
    run_google_assistant_workflow,
)
from hvls.owned_writer import evaluate_registered_output

from .backup_restore import (
    BackupRestoreError,
    list_backups,
    resolve_restored_output,
    restore_reviewed_backup,
    review_backup,
)
from .const import (
    CONF_BACKUP_RETENTION,
    CONF_CREATE_BACKUP,
    CONF_LABEL,
    CONF_OUTPUT,
    DEFAULT_BACKUP_RETENTION,
    DEFAULT_CREATE_BACKUP,
    DEFAULT_LABEL,
    DEFAULT_OUTPUT,
    DOMAIN,
)
from .entity_catalog import build_entity_catalog
from .entity_label_writer import update_entity_label
from .ha_registries import get_live_registries
from .label_update import LabelUpdateError, ensure_entity_eligible_for_addition
from .preview_apply import apply_reviewed_preview
from .preview_compare import PreviewFormatError, analyze_preview
from .preview_exclusions import analyze_exclusions
from .preview_guard import PreviewChangedError, preview_digest
from .restore_guard import assert_not_guarded, read_guard
from .services import DEFAULT_DOMAINS, async_run_workflow
from .workflow_lock import get_workflow_lock

WS_TYPE_RECOVERY_HISTORY = f"{DOMAIN}/get_migration_investigation_history"
WS_TYPE_RECOVERY_HISTORY_PREPARE = (
    f"{DOMAIN}/prepare_migration_investigation_record"
)
WS_TYPE_RECOVERY_HISTORY_CONFIRM = (
    f"{DOMAIN}/confirm_migration_investigation_record"
)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RECOVERY_HISTORY,
})
async def websocket_get_migration_investigation_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read verified non-authorizing recovery investigation history."""
    try:
        from .migration_recovery_records_api import (
            async_get_investigation_records,
        )
        result = await async_get_investigation_records(hass)
    except Exception:
        connection.send_error(
            msg["id"], "migration_investigation_history_unavailable",
            "Protected history unavailable; no changes made.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RECOVERY_HISTORY_PREPARE,
    vol.Required("entity_id"): str,
    vol.Required("disposition"): str,
})
async def websocket_prepare_migration_investigation_record(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Prepare protected investigation record, without any disk changes."""
    try:
        from .migration_recovery_records_api import (
            async_prepare_investigation_record,
        )
        result = await async_prepare_investigation_record(
            hass,
            administrator_id=connection.user.id,
            entity_id=msg["entity_id"],
            disposition=msg["disposition"],
        )
    except Exception:
        connection.send_error(
            msg["id"], "migration_investigation_prepare_refused",
            "Investigation preparation refused; nothing saved.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RECOVERY_HISTORY_CONFIRM,
    vol.Required("entity_id"): str,
    vol.Required("disposition"): str,
    vol.Required("confirmation_token"): str,
    vol.Required("confirmed"): bool,
    vol.Required("acknowledge_external_uncertainty"): bool,
})
async def websocket_confirm_migration_investigation_record(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Store signed-off investigation evidence; NO execution authorization."""
    try:
        from .migration_recovery_records_api import (
            async_confirm_investigation_record,
        )
        result = await async_confirm_investigation_record(
            hass,
            administrator_id=connection.user.id,
            entity_id=msg["entity_id"],
            disposition=msg["disposition"],
            confirmation_token=msg["confirmation_token"],
            confirmed=msg["confirmed"],
            acknowledge_external_uncertainty=(
                msg["acknowledge_external_uncertainty"]
            ),
        )
    except Exception:
        connection.send_error(
            msg["id"], "migration_investigation_confirmation_refused",
            "Investigation evidence changed or storage unavailable.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_ONE_SHOT_HISTORY = f"{DOMAIN}/get_migration_one_shot_rehearsal_history"
WS_TYPE_ONE_SHOT_PREPARE = f"{DOMAIN}/prepare_migration_one_shot_rehearsal"
WS_TYPE_ONE_SHOT_CONFIRM = f"{DOMAIN}/confirm_migration_one_shot_rehearsal"
WS_TYPE_ONE_SHOT_BURN = f"{DOMAIN}/burn_migration_one_shot_rehearsal"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ONE_SHOT_HISTORY,
})
async def websocket_get_migration_one_shot_rehearsal_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read all-verified NON-executing reservation and burn receipts."""
    try:
        from .migration_execution_one_shot_api import (
            get_one_shot_rehearsal_history,
        )
        result = await get_one_shot_rehearsal_history(hass)
    except Exception:
        connection.send_error(
            msg["id"], "one_shot_rehearsal_history_unavailable",
            "Protected rehearsal history unavailable; no action performed.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ONE_SHOT_PREPARE,
    vol.Required("entity_id"): str,
    vol.Required("action"): str,
})
async def websocket_prepare_migration_one_shot_rehearsal(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Prepare only one-entity one-shot rehearsal, without disk changes."""
    try:
        from .migration_execution_one_shot_api import (
            prepare_one_shot_rehearsal,
        )
        result = await prepare_one_shot_rehearsal(
            hass, administrator_id=connection.user.id,
            entity_id=msg["entity_id"], action=msg["action"],
        )
    except Exception:
        connection.send_error(
            msg["id"], "one_shot_rehearsal_prepare_refused",
            "One-shot rehearsal preparation refused; no changes made.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ONE_SHOT_CONFIRM,
    vol.Required("entity_id"): str,
    vol.Required("action"): str,
    vol.Required("confirmation_token"): str,
    vol.Required("confirmed"): bool,
    vol.Required("acknowledge_external_uncertainty"): bool,
})
async def websocket_confirm_migration_one_shot_rehearsal(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Store rehearsal reservation receipt, not a stage authorization."""
    try:
        from .migration_execution_one_shot_api import (
            confirm_one_shot_rehearsal,
        )
        result = await confirm_one_shot_rehearsal(
            hass, administrator_id=connection.user.id,
            entity_id=msg["entity_id"], action=msg["action"],
            confirmation_token=msg["confirmation_token"],
            confirmed=msg["confirmed"],
            acknowledge_external_uncertainty=(
                msg["acknowledge_external_uncertainty"]
            ),
        )
    except Exception:
        connection.send_error(
            msg["id"], "one_shot_rehearsal_confirmation_refused",
            "One-shot rehearsal confirmation refused; no stage performed.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ONE_SHOT_BURN,
    vol.Required("entity_id"): str,
    vol.Required("action"): str,
    vol.Required("receipt_id"): str,
    vol.Required("confirmed"): bool,
    vol.Required("acknowledge_external_uncertainty"): bool,
})
async def websocket_burn_migration_one_shot_rehearsal(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Irreversibly burn audit receipt; NO label, journal ACK or staging."""
    try:
        from .migration_execution_one_shot_api import (
            burn_one_shot_rehearsal,
        )
        result = await burn_one_shot_rehearsal(
            hass, administrator_id=connection.user.id,
            entity_id=msg["entity_id"], action=msg["action"],
            receipt_id=msg["receipt_id"], confirmed=msg["confirmed"],
            acknowledge_external_uncertainty=(
                msg["acknowledge_external_uncertainty"]
            ),
        )
    except Exception:
        connection.send_error(
            msg["id"], "one_shot_rehearsal_burn_refused",
            "Rehearsal burn refused; no migration operation performed.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_DURABLE_APPROVAL_INTENT_HISTORY = (
    f"{DOMAIN}/get_migration_durable_approval_intent_history"
)
WS_TYPE_DURABLE_APPROVAL_INTENT_PREPARE = (
    f"{DOMAIN}/prepare_migration_durable_approval_intent"
)
WS_TYPE_DURABLE_APPROVAL_INTENT_CONFIRM = (
    f"{DOMAIN}/confirm_migration_durable_approval_intent"
)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_DURABLE_APPROVAL_INTENT_HISTORY,
})
async def websocket_get_migration_durable_approval_intent_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read-only protected history of NON-executing admin approval intent."""
    try:
        from .migration_execution_approval_records_api import (
            async_get_approval_intent_history,
        )
        result = await async_get_approval_intent_history(hass)
    except Exception:
        connection.send_error(
            msg["id"], "durable_approval_intent_history_unavailable",
            "Protected approval-intent history unavailable; no change made.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_DURABLE_APPROVAL_INTENT_PREPARE,
    vol.Required("entity_id"): str,
    vol.Required("action"): str,
})
async def websocket_prepare_migration_durable_approval_intent(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Prepare evidence-only approval-intent audit, never stage permission."""
    try:
        from .migration_execution_approval_records_api import (
            prepare_admin_durable_approval_intent,
        )
        result = await prepare_admin_durable_approval_intent(
            hass, administrator_id=connection.user.id,
            entity_id=msg["entity_id"], action=msg["action"],
        )
    except Exception:
        connection.send_error(
            msg["id"], "durable_approval_intent_prepare_refused",
            "Durable approval-intent preparation refused; no action performed.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_DURABLE_APPROVAL_INTENT_CONFIRM,
    vol.Required("entity_id"): str,
    vol.Required("action"): str,
    vol.Required("confirmation_token"): str,
    vol.Required("confirmed"): bool,
    vol.Required("acknowledge_external_uncertainty"): bool,
})
async def websocket_confirm_migration_durable_approval_intent(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Append audit evidence only; NO staging, rollback, or journal ACK."""
    try:
        from .migration_execution_approval_records_api import (
            confirm_admin_durable_approval_intent,
        )
        result = await confirm_admin_durable_approval_intent(
            hass, administrator_id=connection.user.id,
            entity_id=msg["entity_id"], action=msg["action"],
            confirmation_token=msg["confirmation_token"],
            confirmed=msg["confirmed"],
            acknowledge_external_uncertainty=(
                msg["acknowledge_external_uncertainty"]
            ),
        )
    except Exception:
        connection.send_error(
            msg["id"], "durable_approval_intent_confirmation_refused",
            "Approval-intent evidence changed or storage unavailable.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_APPROVAL_DRYRUN_PREPARE = (
    f"{DOMAIN}/prepare_migration_execution_approval_dryrun"
)
WS_TYPE_APPROVAL_DRYRUN_CONFIRM = (
    f"{DOMAIN}/confirm_migration_execution_approval_dryrun"
)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_APPROVAL_DRYRUN_PREPARE,
    vol.Required("entity_id"): str,
    vol.Required("action"): str,
})
async def websocket_prepare_migration_execution_approval_dryrun(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """One-entity approval rehearsal; cannot issue stage authorization."""
    try:
        from .migration_execution_approval_dryrun import (
            prepare_admin_execution_approval_dryrun,
        )
        result = await prepare_admin_execution_approval_dryrun(
            hass,
            administrator_id=connection.user.id,
            entity_id=msg["entity_id"],
            action=msg["action"],
        )
    except Exception:
        connection.send_error(
            msg["id"], "migration_execution_approval_prepare_refused",
            "Fresh execution approval rehearsal unavailable; no action performed.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_APPROVAL_DRYRUN_CONFIRM,
    vol.Required("entity_id"): str,
    vol.Required("action"): str,
    vol.Required("confirmation_token"): str,
    vol.Required("confirmed"): bool,
    vol.Required("acknowledge_external_uncertainty"): bool,
})
async def websocket_confirm_migration_execution_approval_dryrun(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Consume once after fresh evidence; absolutely NO staging or ACK."""
    try:
        from .migration_execution_approval_dryrun import (
            confirm_admin_execution_approval_dryrun,
        )
        result = await confirm_admin_execution_approval_dryrun(
            hass,
            administrator_id=connection.user.id,
            entity_id=msg["entity_id"],
            action=msg["action"],
            confirmation_token=msg["confirmation_token"],
            confirmed=msg["confirmed"],
            acknowledge_external_uncertainty=(
                msg["acknowledge_external_uncertainty"]
            ),
        )
    except Exception:
        connection.send_error(
            msg["id"], "migration_execution_approval_confirmation_refused",
            "Execution approval rehearsal refused; no action performed.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_MIGRATION_EXECUTION_ADMISSION = (
    f"{DOMAIN}/get_migration_execution_admission_preview"
)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_MIGRATION_EXECUTION_ADMISSION,
    vol.Required("entity_id"): str,
})
async def websocket_get_migration_execution_admission_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read-only, fail-closed future admission preview: NEVER a stage call."""
    try:
        from .migration_execution_admission_api import (
            async_get_stage_admission_preview,
        )
        report = await async_get_stage_admission_preview(
            hass, entity_id=msg["entity_id"]
        )
    except Exception:
        connection.send_error(
            msg["id"], "migration_execution_admission_unavailable",
            "Execution admission cannot be inspected; no action was performed.",
        )
        return
    connection.send_result(msg["id"], report)


WS_TYPE_MIGRATION_RECOVERY_STATUS = f"{DOMAIN}/get_migration_recovery_status"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_MIGRATION_RECOVERY_STATUS}
)
async def websocket_get_migration_recovery_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Inspect recovery state, never acknowledge intent, write or retry."""
    try:
        from .migration_recovery_view import async_get_admin_migration_recovery

        result = await async_get_admin_migration_recovery(hass)
    except Exception:
        # No source content, raw exceptions, system paths or secrets.
        connection.send_error(
            msg["id"], "migration_recovery_unavailable",
            "Recovery review unavailable; no migration operation was attempted.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_RECOVERY_SIMULATION_PREPARE = (
    f"{DOMAIN}/prepare_migration_recovery_decision"
)
WS_TYPE_RECOVERY_SIMULATION_CONFIRM = (
    f"{DOMAIN}/confirm_migration_recovery_decision"
)
@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RECOVERY_SIMULATION_PREPARE,
    vol.Required("entity_id"): str,
    vol.Required("disposition"): str,
})
async def websocket_prepare_migration_recovery_decision(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Prepare a human investigation *simulation*, without any mutations."""
    try:
        from .migration_recovery_confirmation import (
            prepare_admin_recovery_decision,
        )
        result = await prepare_admin_recovery_decision(
            hass,
            administrator_id=connection.user.id,
            entity_id=msg["entity_id"],
            disposition=msg["disposition"],
        )
    except Exception:
        connection.send_error(
            msg["id"], "recovery_simulation_prepare_refused",
            "Fresh recovery investigation unavailable; no action performed.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RECOVERY_SIMULATION_CONFIRM,
    vol.Required("entity_id"): str,
    vol.Required("disposition"): str,
    vol.Required("confirmation_token"): str,
    vol.Required("confirmed"): bool,
    vol.Required("acknowledge_external_uncertainty"): bool,
})
async def websocket_confirm_migration_recovery_decision(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Consume one-time challenge; recheck the evidence; NEVER execute."""
    try:
        from .migration_recovery_confirmation import (
            confirm_admin_recovery_decision,
        )
        result = await confirm_admin_recovery_decision(
            hass,
            administrator_id=connection.user.id,
            entity_id=msg["entity_id"],
            disposition=msg["disposition"],
            confirmation_token=msg["confirmation_token"],
            confirmed=msg["confirmed"],
            acknowledge_external_uncertainty=(
                msg["acknowledge_external_uncertainty"]
            ),
        )
    except Exception:
        connection.send_error(
            msg["id"], "recovery_simulation_confirmation_refused",
            "Recovery evidence or confirmation changed; no action performed.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_MIGRATION_DIAGNOSTIC = f"{DOMAIN}/get_migration_diagnostic"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_MIGRATION_DIAGNOSTIC}
)
async def websocket_get_migration_diagnostic(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read-only migration report for HA administrators; never a cutover API."""
    if not hass.config_entries.async_entries(DOMAIN):
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return

    try:
        # Defer import: older V1 WebSocket tests load only legacy modules.
        from .migration_diagnostic import build_admin_migration_diagnostic

        report = await build_admin_migration_diagnostic(hass)
    except Exception:
        # Do not leak YAML, file paths, attributes or secret-bearing errors.
        connection.send_error(
            msg["id"], "migration_diagnostic_unavailable",
            "Migration diagnostic is unavailable; no changes were made.",
        )
        return

    connection.send_result(msg["id"], report)


WS_TYPE_ASSISTANT_HISTORY = f"{DOMAIN}/inspect_historical_google_yaml"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ASSISTANT_HISTORY,
    vol.Required("entity_path"): str,
})
async def websocket_inspect_historical_google_yaml(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read manually staged, isolated historical YAML. Never stage migration."""
    if not hass.config_entries.async_entries(DOMAIN):
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return
    try:
        from .historical_ga_inspector import inspect_historical_google_yaml

        report = await hass.async_add_executor_job(
            inspect_historical_google_yaml,
            hass.config.config_dir,
            msg["entity_path"],
        )
    except Exception:
        # No exceptions or YAML source contents are returned to the client.
        connection.send_error(
            msg["id"], "historical_review_unavailable",
            "Historical YAML review unavailable. No changes made.",
        )
        return
    connection.send_result(msg["id"], report)


WS_TYPE_ASSISTANT_ENTITY_FILE = f"{DOMAIN}/inspect_assistant_entity_file"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ASSISTANT_ENTITY_FILE,
    vol.Required("path"): str,
})
async def websocket_inspect_assistant_entity_file(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Inspect an explicitly selected YAML source, without migration authority."""
    if not hass.config_entries.async_entries(DOMAIN):
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return
    try:
        from .assistant_entity_file import inspect_google_entity_file

        report = await hass.async_add_executor_job(
            inspect_google_entity_file,
            hass.config.config_dir,
            msg["path"],
        )
    except Exception:
        # Never echo a user-selected path or private YAML values.
        connection.send_error(
            msg["id"], "assistant_file_check_unavailable",
            "Unable to inspect the selected file. No changes made.",
        )
        return
    connection.send_result(msg["id"], report)


WS_TYPE_ASSISTANT_TAKEOVER_PREPARE = f"{DOMAIN}/prepare_existing_output_takeover"
WS_TYPE_ASSISTANT_TAKEOVER_CONFIRM = f"{DOMAIN}/confirm_existing_output_takeover"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ASSISTANT_TAKEOVER_PREPARE,
    vol.Required("path"): str,
})
async def websocket_prepare_existing_output_takeover(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read-only comparison of the chosen YAML with Preview and ownership."""
    try:
        from .assistant_output_takeover import prepare_existing_output_takeover

        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            raise ValueError("HVLS is not configured")
        result = await hass.async_add_executor_job(
            partial(
                prepare_existing_output_takeover,
                config_dir=hass.config.config_dir,
                output_path=_configured_output(hass),
                preview_path=Path(hass.config.path(".hvls", "preview.yaml")),
                registry_path=Path(hass.config.path(".hvls", "ownership.json")),
                entry_id=entries[0].entry_id,
                selected_relative_path=msg["path"],
            )
        )
    except Exception:
        connection.send_error(
            msg["id"], "assistant_takeover_prepare_refused",
            "The selected YAML cannot be safely prepared. No changes made.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ASSISTANT_TAKEOVER_CONFIRM,
    vol.Required("path"): str,
    vol.Required("production_sha256"): str,
    vol.Required("preview_sha256"): str,
    vol.Required("confirmed"): bool,
})
async def websocket_confirm_existing_output_takeover(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Explicitly back up and record ownership; never Apply or edit YAML."""
    async with get_workflow_lock(hass):
        try:
            from .assistant_output_takeover import confirm_existing_output_takeover

            entries = hass.config_entries.async_entries(DOMAIN)
            if not entries:
                raise ValueError("HVLS is not configured")
            result = await hass.async_add_executor_job(
                partial(
                    confirm_existing_output_takeover,
                    config_dir=hass.config.config_dir,
                    output_path=_configured_output(hass),
                    preview_path=Path(hass.config.path(".hvls", "preview.yaml")),
                    registry_path=Path(hass.config.path(".hvls", "ownership.json")),
                    entry_id=entries[0].entry_id,
                    selected_relative_path=msg["path"],
                    production_sha256=msg["production_sha256"],
                    preview_sha256=msg["preview_sha256"],
                    confirmed=msg["confirmed"],
                )
            )
        except Exception:
            connection.send_error(
                msg["id"], "assistant_takeover_confirm_refused",
                "Takeover incomplete or refused. Inspect ownership and backups; "
                "refresh Preview before retrying.",
            )
            return
    connection.send_result(msg["id"], result)


WS_TYPE_MIGRATION_REVIEW = f"{DOMAIN}/get_migration_review"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_MIGRATION_REVIEW,
        vol.Required("decisions"): dict,
    }
)
async def websocket_get_migration_review(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Private read-only migration assessment, never a staging action."""
    if not hass.config_entries.async_entries(DOMAIN):
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return
    try:
        # Lazily import: V1 WebSocket clients do not load migration modules.
        from .migration_review_api import async_build_admin_review

        result = await async_build_admin_review(hass, msg["decisions"])
    except Exception:
        # Do not expose raw YAML, private override values, or filesystem paths
        # through untrusted exception messages. Never change any HA state.
        connection.send_error(
            msg["id"],
            "migration_review_unavailable",
            "Migration review is unavailable. No changes were made.",
        )
        return

    connection.send_result(msg["id"], result)


WS_TYPE_MIGRATION_BASELINE_PREPARE = f"{DOMAIN}/prepare_migration_baseline"
WS_TYPE_MIGRATION_BASELINE_INITIALIZE = f"{DOMAIN}/initialize_migration_baseline"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_MIGRATION_BASELINE_PREPARE}
)
async def websocket_prepare_migration_baseline(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Admin review of source backup scope; never writes protected files."""
    try:
        from .migration_initialize import prepare_admin_baseline

        user_id = connection.user.id
        result = await prepare_admin_baseline(hass, user_id=user_id)
    except Exception:
        # Never echo YAML, secrets, tokens or file paths in error messages.
        connection.send_error(
            msg["id"],
            "migration_baseline_prepare_unavailable",
            "Protected source preparation unavailable. No files were created.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_MIGRATION_BASELINE_INITIALIZE,
        vol.Required("confirmation_token"): str,
        vol.Required("confirmed"): bool,
    }
)
async def websocket_initialize_migration_baseline(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Explicit one-use admin authorization for protected baseline+journal."""
    try:
        from .migration_initialize import initialize_admin_baseline

        user_id = connection.user.id
        result = await initialize_admin_baseline(
            hass,
            user_id=user_id,
            confirmation_token=msg["confirmation_token"],
            confirmed=msg["confirmed"],
        )
    except Exception:
        # An interrupted operation may have created the immutable backup.
        # Never claim that the filesystem was left entirely untouched.
        connection.send_error(
            msg["id"],
            "migration_baseline_initialization_unavailable",
            "Initialization incomplete. Inspect the protected baseline and "
            "journal before preparing a fresh confirmation.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_MIGRATION_LOAD_DRAFT = f"{DOMAIN}/get_migration_decision_draft"
WS_TYPE_MIGRATION_SAVE_DRAFT = f"{DOMAIN}/save_migration_decision_draft"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_MIGRATION_LOAD_DRAFT}
)
async def websocket_get_migration_decision_draft(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read protected provisional selections; never an execution approval."""
    try:
        from .migration_draft_api import async_load_admin_draft

        result = await async_load_admin_draft(hass)
    except Exception:
        connection.send_error(
            msg["id"], "migration_draft_unavailable",
            "Saved migration selections unavailable; inspect protected files.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_MIGRATION_SAVE_DRAFT,
        vol.Required("decisions"): dict,
        vol.Required("review_token_sha256"): str,
        vol.Required("baseline_manifest_sha256"): str,
        vol.Required("journal_revision"): int,
        vol.Required("draft_revision"): int,
    }
)
async def websocket_save_migration_decision_draft(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Explicit CAS save of *non-authorizing* review choices only."""
    try:
        from .migration_draft_api import async_save_admin_draft

        result = await async_save_admin_draft(
            hass,
            user_id=connection.user.id,
            decisions=msg["decisions"],
            expected_review_token_sha256=msg["review_token_sha256"],
            expected_baseline_manifest_sha256=msg["baseline_manifest_sha256"],
            expected_journal_revision=msg["journal_revision"],
            expected_draft_revision=msg["draft_revision"],
        )
    except Exception:
        # No raw exception text: it could contain YAML values or filesystem
        # details. On ambiguous I/O failure, advise explicit inspection.
        connection.send_error(
            msg["id"], "migration_draft_save_refused",
            "Migration draft was not confirmed saved. Inspect protected state "
            "and refresh the review before retrying.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_MIGRATION_GET_ATTESTATION = f"{DOMAIN}/get_migration_review_attestation"
WS_TYPE_MIGRATION_ATTEST_REVIEW = f"{DOMAIN}/attest_migration_review"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_MIGRATION_GET_ATTESTATION}
)
async def websocket_get_migration_review_attestation(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read human review state, never claim approval for label staging."""
    try:
        from .migration_attestation_api import async_get_review_attestation

        result = await async_get_review_attestation(hass)
    except Exception:
        connection.send_error(
            msg["id"], "migration_attestation_unavailable",
            "Review status unavailable; check saved decisions and original files.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_MIGRATION_ATTEST_REVIEW,
        vol.Required("confirmed"): bool,
        vol.Required("acknowledge_issues"): bool,
        vol.Required("attestation_revision"): int,
        vol.Required("draft_revision"): int,
        vol.Required("journal_revision"): int,
        vol.Required("baseline_manifest_sha256"): str,
        vol.Required("review_evidence_sha256"): str,
    }
)
async def websocket_attest_migration_review(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Durably acknowledge reviewed findings; no execution capability."""
    try:
        from .migration_attestation_api import async_attest_admin_review

        result = await async_attest_admin_review(
            hass,
            administrator_id=connection.user.id,
            confirmed=msg["confirmed"],
            acknowledge_issues=msg["acknowledge_issues"],
            expected_attestation_revision=msg["attestation_revision"],
            expected_draft_revision=msg["draft_revision"],
            expected_journal_revision=msg["journal_revision"],
            expected_baseline_manifest_sha256=(
                msg["baseline_manifest_sha256"]
            ),
            expected_review_evidence_sha256=msg["review_evidence_sha256"],
        )
    except Exception:
        # Filesystem paths, raw YAML and server exceptions must never leak.
        connection.send_error(
            msg["id"], "migration_attestation_refused",
            "Review attestation refused. Refresh the saved draft and "
            "review findings before confirming again.",
        )
        return
    connection.send_result(msg["id"], result)


WS_TYPE_GET_PREVIEW = f"{DOMAIN}/get_preview"


def _read_file(path: Path) -> tuple[str | None, str | None]:
    """Read a YAML file, distinguishing missing and read errors."""
    try:
        return path.read_bytes().decode("utf-8"), None
    except FileNotFoundError:
        return None, "missing"
    except (OSError, UnicodeError) as exc:
        return None, str(exc)


def _read_and_compare(preview_path: Path, output_path: Path) -> dict[str, Any]:
    """Read and compare Preview and production off the HA event loop."""
    preview, preview_error = _read_file(preview_path)

    if preview is None:
        return {
            "available": False,
            "content": "",
            "path": str(preview_path),
            "error": preview_error if preview_error != "missing" else None,
            "can_apply": False,
            "preview_sha256": None,
            "production_sha256": None,
        }

    production, prod_error = _read_file(output_path)

    try:
        analysis = analyze_preview(preview, production)
    except PreviewFormatError as exc:
        return {
            "available": True,
            "content": preview,
            "path": str(preview_path),
            "error": f"Preview cannot be analyzed: {exc}",
            "can_apply": False,
            "preview_sha256": None,
            "production_sha256": None,
        }

    production_readable = prod_error is None or prod_error == "missing"

    # Dashboard statistics describe the actual production file, never the
    # proposed Preview. Do not silently substitute Preview if production is
    # missing, invalid or unreadable.
    production_summary = None
    production_summary_error = None
    if production is not None and production_readable:
        try:
            production_summary = analyze_preview(production, None)["summary"]
        except PreviewFormatError as exc:
            production_summary_error = str(exc)

    if not production_readable:
        analysis["comparison"] = {
            "status": "unreadable",
            "reason": prod_error,
        }

    return {
        "available": True,
        "content": preview,
        "path": str(preview_path),
        "production_path": str(output_path),
        **analysis,
        "production_summary": production_summary,
        "production_summary_error": production_summary_error,
        "can_apply": production_readable,
        "preview_sha256": preview_digest(preview),
        "production_sha256": (
            preview_digest(production) if production is not None else None
        ),
    }


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET_PREVIEW})
async def websocket_get_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return preview, read-only statistics and production differences."""
    preview_path = Path(hass.config.path(".hvls", "preview.yaml"))
    entries = hass.config_entries.async_entries(DOMAIN)
    settings = {**entries[0].data, **entries[0].options} if entries else {}
    output_path = Path(settings.get(CONF_OUTPUT, DEFAULT_OUTPUT))
    if not output_path.is_absolute():
        output_path = Path(hass.config.config_dir) / output_path
    # Native HA registries must be accessed on the event-loop thread.
    try:
        registries = get_live_registries(hass)
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        connection.send_error(
            msg["id"],
            "registry_error",
            f"Unable to read Home Assistant registries: {exc}",
        )
        return

    label = settings.get(CONF_LABEL, DEFAULT_LABEL)

    result = await hass.async_add_executor_job(
        _read_and_compare, preview_path, output_path
    )

    if entries:
        ownership = await hass.async_add_executor_job(
            evaluate_registered_output,
            output_path,
            entries[0].entry_id,
            Path(hass.config.path(".hvls", "ownership.json")),
        )
        ownership_details = {
            "status": ownership.status,
            "reason": ownership.reason,
            "reason_code": ownership.reason_code,
            "write_allowed": ownership.write_allowed,
        }
        try:
            pending_restore = await hass.async_add_executor_job(
                read_guard, Path(hass.config.path(".hvls", "ownership.json"))
            )
        except FileWriterError:
            ownership_details = {
                "status": "unknown", "write_allowed": False,
                "reason_code": "restore_guard_invalid",
                "reason": "Restore record cannot be verified; production is protected.",
            }
        else:
            if pending_restore is not None and ownership.status == "managed":
                if (pending_restore["entry_id"] == entries[0].entry_id
                        and pending_restore["output_path"] == str(output_path)):
                    ownership_details = {
                        "status": "restore_pending", "write_allowed": False,
                        "reason_code": "restore_reconciliation_required",
                        "reason": "Restore labels before another Apply.",
                    }
                    production_sha = result.get("production_sha256")
                    if production_sha == pending_restore["restored_sha256"]:
                        guard_state = "restored"
                    elif production_sha == pending_restore["original_sha256"]:
                        guard_state = "not_written"
                    else:
                        guard_state = "uncertain"
                    result["restore_reconciliation"] = {
                        "state": guard_state, "required": True,
                    }
                else:
                    ownership_details = {
                        "status": "unknown", "write_allowed": False,
                        "reason_code": "restore_guard_mismatch",
                        "reason": "Another restore transaction is unresolved.",
                    }
        result["ownership"] = ownership_details
        result["can_apply"] = bool(
            result.get("can_apply", False)
            and ownership_details["write_allowed"]
        )
    else:
        result["ownership"] = {
            "status": "unknown",
            "reason": "HVLS is not configured.",
            "reason_code": "not_configured",
            "write_allowed": False,
        }
        result["can_apply"] = False

    try:
        excluded = await hass.async_add_executor_job(
            analyze_exclusions,
            registries,
            label,
            DEFAULT_DOMAINS,
        )
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        connection.send_error(
            msg["id"],
            "exclusion_error",
            f"Unable to analyze excluded entities: {exc}",
        )
        return

    result["exclusions"] = {
        "count": len(excluded),
        "entities": excluded,
    }
    connection.send_result(msg["id"], result)


WS_TYPE_APPLY_PREVIEW = f"{DOMAIN}/apply_preview"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_APPLY_PREVIEW,
        vol.Required("preview_sha256"): str,
        vol.Required("production_sha256"): vol.Any(None, str),
    }
)
async def websocket_apply_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Apply exactly the reviewed Preview, or refuse the write."""
    async with get_workflow_lock(hass):
        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            connection.send_error(
                msg["id"], "not_configured", "HVLS is not configured."
            )
            return

        settings = {**entries[0].data, **entries[0].options}
        output_path = Path(settings.get(CONF_OUTPUT, DEFAULT_OUTPUT))
        if not output_path.is_absolute():
            output_path = Path(hass.config.config_dir) / output_path

        request = GenerationRequest(
            label=settings.get(CONF_LABEL, DEFAULT_LABEL),
            domains=DEFAULT_DOMAINS,
            output_path=output_path,
            dry_run=True,
        )
        preview_path = Path(hass.config.path(".hvls", "preview.yaml"))

        try:
            assert_not_guarded(
                Path(hass.config.path(".hvls", "ownership.json")),
                entries[0].entry_id, output_path,
            )
            registries = get_live_registries(hass)
            result = await hass.async_add_executor_job(
                partial(
                    apply_reviewed_preview,
                    request,
                    registries,
                    preview_path,
                    msg["preview_sha256"],
                    int(
                        settings.get(
                            CONF_BACKUP_RETENTION,
                            DEFAULT_BACKUP_RETENTION,
                        )
                    ),
                    settings.get(CONF_CREATE_BACKUP, DEFAULT_CREATE_BACKUP),
                    expected_production_digest=msg["production_sha256"],
                    entry_id=entries[0].entry_id,
                    ownership_registry_path=Path(
                        hass.config.path(".hvls", "ownership.json")
                    ),
                )
            )
        except (
            PreviewChangedError,
            FileWriterError,
            RegistryError,
            WorkflowError,
            OSError,
            ValueError,
            TypeError,
            KeyError,
            AttributeError,
        ) as exc:
            connection.send_error(msg["id"], "apply_failed", str(exc))
            return

        connection.send_result(
            msg["id"],
            {
                "applied": True,
                "output_path": str(result.output_path),
                "bytes_written": result.bytes_written,
                "backup_path": (
                    str(result.backup_path) if result.backup_path is not None else None
                ),
            },
        )



WS_TYPE_GENERATE_PREVIEW = f"{DOMAIN}/generate_preview"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_GENERATE_PREVIEW}
)
async def websocket_generate_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Regenerate Preview without writing to production."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return

    try:
        result = await async_run_workflow(
            hass, entries[0], dry_run=True
        )
    except Exception as exc:
        connection.send_error(
            msg["id"], "preview_failed", str(exc)
        )
        return

    connection.send_result(
        msg["id"],
        {"generated": True, "entity_count": result.entity_count},
    )


WS_TYPE_GET_ENTITIES = f"{DOMAIN}/get_entities"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_GET_ENTITIES}
)
async def websocket_get_entities(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return current HA entities and HVLS label membership."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return

    settings = {**entries[0].data, **entries[0].options}
    label = settings.get(CONF_LABEL, DEFAULT_LABEL)

    try:
        # Native HA registries must be read on the event-loop thread.
        registries = get_live_registries(hass)
        catalog = await hass.async_add_executor_job(
            build_entity_catalog, registries, label, DEFAULT_DOMAINS
        )
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        connection.send_error(
            msg["id"], "registry_error", str(exc)
        )
        return

    connection.send_result(msg["id"], catalog)


WS_TYPE_SET_ENTITY_LABEL = f"{DOMAIN}/set_entity_label"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SET_ENTITY_LABEL,
        vol.Required("entity_id"): str,
        vol.Required("enabled"): bool,
        vol.Required("expected_enabled"): bool,
    }
)
async def websocket_set_entity_label(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update exactly one entity's HVLS label, without generating YAML."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return

    settings = {**entries[0].data, **entries[0].options}
    configured_label = settings.get(CONF_LABEL, DEFAULT_LABEL)

    try:
        # Entire read/check/write sequence runs on the HA event loop.
        # Do not add an await between these operations.
        if msg["enabled"]:
            registries = get_live_registries(hass)
            catalog = build_entity_catalog(
                registries, configured_label, DEFAULT_DOMAINS
            )
            entity = next(
                (item for item in catalog["entities"]
                 if item["entity_id"] == msg["entity_id"]),
                None,
            )
            ensure_entity_eligible_for_addition(entity, msg["enabled"])

        result = update_entity_label(
            hass,
            msg["entity_id"],
            configured_label,
            msg["enabled"],
            msg["expected_enabled"],
        )
    except LabelUpdateError as exc:
        connection.send_error(msg["id"], "label_update_refused", str(exc))
        return
    except (ValueError, TypeError, KeyError, AttributeError) as exc:
        connection.send_error(msg["id"], "label_update_failed", str(exc))
        return

    connection.send_result(msg["id"], result)



WS_TYPE_LIST_BACKUPS = f"{DOMAIN}/list_backups"
WS_TYPE_REVIEW_BACKUP = f"{DOMAIN}/review_backup"
WS_TYPE_RESTORE_BACKUP = f"{DOMAIN}/restore_backup"
WS_TYPE_RESOLVE_RESTORE = f"{DOMAIN}/resolve_restored_output"


def _configured_output(hass: HomeAssistant) -> Path:
    """Resolve the output path from the active HA integration settings."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        raise BackupRestoreError("HVLS is not configured.")
    settings = {**entries[0].data, **entries[0].options}
    path = Path(settings.get(CONF_OUTPUT, DEFAULT_OUTPUT))
    if not path.is_absolute():
        path = Path(hass.config.config_dir) / path
    config_root = Path(hass.config.config_dir).resolve()
    if not path.resolve().is_relative_to(config_root):
        raise BackupRestoreError(
            "Production output must be inside the HA config directory."
        )
    if path.is_symlink():
        raise BackupRestoreError("Production output cannot be a symbolic link.")
    return path


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_LIST_BACKUPS})
async def websocket_list_backups(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List known HVLS backups without exposing arbitrary file paths."""
    try:
        path = _configured_output(hass)
        result = await hass.async_add_executor_job(list_backups, path)
    except (BackupRestoreError, OSError, ValueError) as exc:
        connection.send_error(msg["id"], "backup_list_failed", str(exc))
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_REVIEW_BACKUP,
    vol.Required("backup_id"): str,
})
async def websocket_review_backup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Compare a selected backup with the current production file."""
    try:
        path = _configured_output(hass)
        result = await hass.async_add_executor_job(
            review_backup, path, msg["backup_id"]
        )
    except (BackupRestoreError, OSError, ValueError) as exc:
        connection.send_error(msg["id"], "backup_review_failed", str(exc))
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RESTORE_BACKUP,
    vol.Required("backup_id"): str,
    vol.Required("backup_sha256"): str,
    vol.Required("production_sha256"): str,
})
async def websocket_restore_backup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Only restore a backup confirmed against current production."""
    async with get_workflow_lock(hass):
        try:
            path = _configured_output(hass)
            entries = hass.config_entries.async_entries(DOMAIN)
            result = await hass.async_add_executor_job(
                partial(
                    restore_reviewed_backup,
                    path,
                    msg["backup_id"],
                    msg["backup_sha256"],
                    msg["production_sha256"],
                    entry_id=entries[0].entry_id,
                    ownership_registry_path=Path(
                        hass.config.path(".hvls", "ownership.json")
                    ),
                )
            )
        except (
            BackupRestoreError,
            PreviewChangedError,
            FileWriterError,
            OSError,
            ValueError,
        ) as exc:
            connection.send_error(msg["id"], "backup_restore_failed", str(exc))
            return
        connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RESOLVE_RESTORE,
    vol.Required("production_sha256"): str,
    vol.Required("preview_sha256"): str,
    vol.Required("resolution"): str,
    vol.Required("confirmed"): bool,
})
async def websocket_resolve_restored_output(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """End restore protection only after a fresh, explicit decision."""
    async with get_workflow_lock(hass):
        try:
            entries = hass.config_entries.async_entries(DOMAIN)
            if len(entries) != 1:
                raise BackupRestoreError("HVLS entry unavailable or ambiguous")
            path = _configured_output(hass)
            settings = {**entries[0].data, **entries[0].options}
            registries = get_live_registries(hass)
            request = GenerationRequest(
                label=settings.get(CONF_LABEL, DEFAULT_LABEL),
                domains=DEFAULT_DOMAINS,
                output_path=path,
                dry_run=True,
            )
            generated = await hass.async_add_executor_job(
                partial(
                    run_google_assistant_workflow,
                    request=request,
                    registries=registries,
                )
            )
            result = await hass.async_add_executor_job(
                partial(
                    resolve_restored_output,
                    path,
                    Path(hass.config.path(".hvls", "preview.yaml")),
                    entry_id=entries[0].entry_id,
                    ownership_registry_path=Path(
                        hass.config.path(".hvls", "ownership.json")
                    ),
                    production_sha256=msg["production_sha256"],
                    preview_sha256=msg["preview_sha256"],
                    resolution=msg["resolution"],
                    confirmed=msg["confirmed"],
                    generated_content=generated.generation.content,
                )
            )
        except (
            BackupRestoreError, PreviewChangedError, FileWriterError,
            RegistryError, WorkflowError, OSError, ValueError,
            TypeError, KeyError, AttributeError,
        ):
            connection.send_error(
                msg["id"], "restore_reconciliation_refused",
                "The restoration cannot be reconciled. Refresh and review again.",
            )
            return
    connection.send_result(msg["id"], result)


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register the HVLS WebSocket API."""
    websocket_api.async_register_command(hass, websocket_get_preview)
    websocket_api.async_register_command(hass, websocket_get_migration_diagnostic)
    websocket_api.async_register_command(hass, websocket_inspect_assistant_entity_file)
    websocket_api.async_register_command(
        hass, websocket_prepare_existing_output_takeover
    )
    websocket_api.async_register_command(
        hass, websocket_confirm_existing_output_takeover
    )
    websocket_api.async_register_command(hass, websocket_inspect_historical_google_yaml)
    websocket_api.async_register_command(
        hass, websocket_get_migration_recovery_status
    )
    websocket_api.async_register_command(
        hass, websocket_get_migration_execution_admission_preview
    )
    websocket_api.async_register_command(
        hass, websocket_get_migration_durable_approval_intent_history
    )
    websocket_api.async_register_command(
        hass, websocket_get_migration_one_shot_rehearsal_history
    )
    websocket_api.async_register_command(
        hass, websocket_prepare_migration_one_shot_rehearsal
    )
    websocket_api.async_register_command(
        hass, websocket_confirm_migration_one_shot_rehearsal
    )
    websocket_api.async_register_command(
        hass, websocket_burn_migration_one_shot_rehearsal
    )
    websocket_api.async_register_command(
        hass, websocket_prepare_migration_durable_approval_intent
    )
    websocket_api.async_register_command(
        hass, websocket_confirm_migration_durable_approval_intent
    )
    websocket_api.async_register_command(
        hass, websocket_prepare_migration_execution_approval_dryrun
    )
    websocket_api.async_register_command(
        hass, websocket_confirm_migration_execution_approval_dryrun
    )
    websocket_api.async_register_command(
        hass, websocket_get_migration_investigation_history
    )
    websocket_api.async_register_command(
        hass, websocket_prepare_migration_investigation_record
    )
    websocket_api.async_register_command(
        hass, websocket_confirm_migration_investigation_record
    )
    websocket_api.async_register_command(
        hass, websocket_prepare_migration_recovery_decision
    )
    websocket_api.async_register_command(
        hass, websocket_confirm_migration_recovery_decision
    )
    websocket_api.async_register_command(hass, websocket_get_migration_review)
    websocket_api.async_register_command(hass, websocket_prepare_migration_baseline)
    websocket_api.async_register_command(hass, websocket_initialize_migration_baseline)
    websocket_api.async_register_command(hass, websocket_get_migration_decision_draft)
    websocket_api.async_register_command(hass, websocket_save_migration_decision_draft)
    websocket_api.async_register_command(
        hass, websocket_get_migration_review_attestation
    )
    websocket_api.async_register_command(hass, websocket_attest_migration_review)
    websocket_api.async_register_command(hass, websocket_get_entities)
    websocket_api.async_register_command(hass, websocket_set_entity_label)
    websocket_api.async_register_command(hass, websocket_apply_preview)
    websocket_api.async_register_command(hass, websocket_generate_preview)
    websocket_api.async_register_command(hass, websocket_list_backups)
    websocket_api.async_register_command(hass, websocket_review_backup)
    websocket_api.async_register_command(hass, websocket_restore_backup)
    websocket_api.async_register_command(
        hass, websocket_resolve_restored_output
    )
