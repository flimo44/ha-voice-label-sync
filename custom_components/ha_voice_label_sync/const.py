"""Constants for HA Voice Label Sync."""

DOMAIN = "ha_voice_label_sync"
NAME = "HA Voice Label Sync"

CONF_BACKEND = "backend"
CONF_LABEL = "label"
CONF_OUTPUT = "output"
CONF_BACKUP_RETENTION = "backup_retention"
CONF_CREATE_BACKUP = "create_backup"

BACKEND_GOOGLE_ASSISTANT = "google_assistant"

DEFAULT_BACKEND = BACKEND_GOOGLE_ASSISTANT
DEFAULT_LABEL = "google_assistant"
DEFAULT_OUTPUT = "/config/google_assistant_entities.yaml"
DEFAULT_BACKUP_RETENTION = 10
DEFAULT_CREATE_BACKUP = True
