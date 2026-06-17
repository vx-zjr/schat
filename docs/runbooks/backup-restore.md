# Backup and Restore Runbook

## Backup

Backups include a PostgreSQL dump and MinIO object data archive. The script stages plaintext files temporarily, creates a tar archive, encrypts it with `openssl enc -aes-256-cbc -pbkdf2`, removes the plaintext staging/archive files, and leaves a `*.tar.gz.enc` artifact under `BACKUP_DIR`.

Set a real `BACKUP_ENCRYPTION_PASSWORD` in `.env.production`; the example value is rejected.

```powershell
pwsh ./infra/scripts/backup-production.ps1
```

## Restore

Restore into a fresh environment first, verify `/health`, then promote manually. `-BackupPath` can point either to the encrypted `*.tar.gz.enc` file or to a directory containing one.

```powershell
pwsh ./infra/scripts/restore-production.ps1 -BackupPath <path>
```

After restore, run:

```powershell
pwsh ./infra/scripts/verify-production.ps1
```
