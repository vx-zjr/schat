# Backup and Restore Runbook

## Backup

Backups include a PostgreSQL dump and MinIO object data archive. The first script version writes local files under `backups/`; add external encrypted storage as an operational step before relying on this for production retention.

```powershell
pwsh ./infra/scripts/backup-production.ps1
```

## Restore

Restore into a fresh environment first, verify `/health`, then promote manually.

```powershell
pwsh ./infra/scripts/restore-production.ps1 -BackupPath <path>
```
