# Google Drive Sync

OpenClaw KB stores wiki pages as plain Markdown files in the `wiki/` directory. You can sync this directory to Google Drive for cloud backup, cross-device access, or sharing with collaborators using [rclone](https://rclone.org/).

## Prerequisites

- A working OpenClaw KB installation with wiki pages in `wiki/`
- [rclone](https://rclone.org/downloads/) installed on your system
- A Google account with Google Drive access

## Installing rclone

=== "macOS"

    ```bash
    brew install rclone
    ```

=== "Linux"

    ```bash
    curl https://rclone.org/install.sh | sudo bash
    ```

=== "Windows"

    Download the latest release from [rclone.org/downloads](https://rclone.org/downloads/) and add it to your PATH.

Verify the installation:

```bash
rclone version
```

## Configuring Google Drive Remote

Run the interactive configuration:

```bash
rclone config
```

Follow the prompts:

1. Choose **n** for new remote
2. Name it `gdrive` (or any name you prefer)
3. Select **Google Drive** from the storage list
4. Leave client ID and secret blank (uses rclone defaults)
5. Choose **drive** scope for full access
6. Skip advanced config
7. Authorize rclone in your browser when prompted

Verify the remote works:

```bash
rclone lsd gdrive:
```

## Syncing Wiki to Google Drive

### One-Time Upload

Push your local `wiki/` directory to a Google Drive folder:

```bash
rclone copy wiki/ gdrive:openclaw-kb/wiki/ --progress
```

This copies all files to `openclaw-kb/wiki/` in your Google Drive without deleting anything at the destination.

### Mirror Sync (Local → Remote)

To make the remote an exact mirror of your local directory:

```bash
rclone sync wiki/ gdrive:openclaw-kb/wiki/ --progress
```

!!! warning "Destructive Operation"
    `rclone sync` deletes files on the remote that don't exist locally. Always use `--dry-run` first to preview changes:

    ```bash
    rclone sync wiki/ gdrive:openclaw-kb/wiki/ --dry-run
    ```

### Pulling Changes (Remote → Local)

To download changes from Google Drive back to your local wiki:

```bash
rclone copy gdrive:openclaw-kb/wiki/ wiki/ --progress
```

## Bidirectional Sync

!!! note "Experimental Feature"
    rclone's bidirectional sync (`rclone bisync`) is considered experimental. Use with caution on production data.

For true two-way sync where changes on either side are propagated:

```bash
# First run requires --resync to establish baseline
rclone bisync wiki/ gdrive:openclaw-kb/wiki/ --resync

# Subsequent runs
rclone bisync wiki/ gdrive:openclaw-kb/wiki/
```

### Caveats

- **No real-time sync** — rclone is a batch tool; changes are only synced when you run the command.
- **Conflict resolution** — If the same file is modified on both sides between syncs, rclone will flag a conflict. The newer file wins by default; the older version is renamed with a `.conflict` suffix.
- **Metadata loss** — Google Drive does not preserve Unix file permissions or symlinks.
- **Rate limits** — Google Drive API has rate limits. Large initial syncs may need `--drive-chunk-size 256M` and `--transfers 2` to stay within limits.

## Automation with Cron

### macOS / Linux

Add a cron job to sync every hour:

```bash
crontab -e
```

Add this line (adjust paths to your setup):

```cron
0 * * * * cd /path/to/openclaw-kb && rclone sync wiki/ gdrive:openclaw-kb/wiki/ --log-file=/tmp/rclone-wiki.log --log-level INFO
```

### Using a Shell Script

Create a wrapper script for more control:

```bash title="sync-wiki.sh"
#!/usr/bin/env bash
set -euo pipefail

WIKI_DIR="${1:-wiki}"
REMOTE="gdrive:openclaw-kb/wiki/"
LOG_FILE="/tmp/rclone-wiki-$(date +%Y%m%d).log"

echo "[$(date -Iseconds)] Starting wiki sync..." >> "$LOG_FILE"
rclone sync "$WIKI_DIR" "$REMOTE" \
  --log-file="$LOG_FILE" \
  --log-level INFO \
  --transfers 4 \
  --checkers 8
echo "[$(date -Iseconds)] Sync complete." >> "$LOG_FILE"
```

Make it executable and schedule it:

```bash
chmod +x sync-wiki.sh
# Add to crontab:
# 0 * * * * /path/to/sync-wiki.sh /path/to/wiki
```

## Conflict Resolution

When conflicts arise (e.g., editing the same wiki page on two machines between syncs):

1. **Check for conflicts** — Look for `.conflict` files in your wiki directory after a bisync
2. **Compare versions** — Use `diff` or your editor to compare the original and conflict files
3. **Resolve manually** — Keep the version you want and delete the conflict file
4. **Re-sync** — Run the sync again to push the resolved state

!!! tip "Avoiding Conflicts"
    The simplest conflict-avoidance strategy is to use **one-directional sync** (local → remote) and treat Google Drive as a read-only backup. Edit wiki pages only on your local machine.

## Excluding Files

To skip certain files or directories during sync, create a filter file:

```text title="rclone-filter.txt"
- log.md
- .DS_Store
- **/.obsidian/**
```

Use it with:

```bash
rclone sync wiki/ gdrive:openclaw-kb/wiki/ --filter-from rclone-filter.txt
```

This skips the operation log, macOS metadata files, and Obsidian configuration directories.

## Syncing the Database

!!! warning "Do Not Sync the SQLite Database via Google Drive"
    SQLite databases (`jarvis.db`) must not be synced via cloud storage services like Google Drive. Concurrent access or partial uploads can corrupt the database. Use the [Export & Import](export-import.md) feature instead for database backup and portability.

To back up the database alongside your wiki:

```bash
# Export database to flat files
node src/kb-export.mjs backups/latest/

# Sync both wiki and backups
rclone sync wiki/ gdrive:openclaw-kb/wiki/ --progress
rclone sync backups/latest/ gdrive:openclaw-kb/backups/latest/ --progress
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Failed to create file system` | Re-run `rclone config` and re-authorize |
| `quota exceeded` | Wait an hour or reduce `--transfers` to 1 |
| `couldn't find root directory` | The remote path doesn't exist yet — rclone creates it automatically on first sync |
| Sync is very slow | Use `--transfers 4 --checkers 8` for parallel operations |
| Files appear duplicated on Drive | Google Drive allows duplicate names — use `--drive-skip-gdocs` and check for name collisions |
