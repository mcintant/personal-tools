# Kobo Auto-Sync Setup

This script automatically detects when your Kobo device is connected, backs up the database, and opens the React app.

## Quick Start

### Option 1: Manual Run (Recommended for testing)

Simply run the script when you plug in your Kobo:

```bash
./kobo-sync-improved.sh
```

Or wait for the device to be connected:

```bash
./kobo-sync-improved.sh --wait
```

Or provide the path manually:

```bash
./kobo-sync-improved.sh /Volumes/KOBOeReader
```

### Option 2: Automatic Detection (macOS LaunchAgent)

To automatically run the script when you plug in your Kobo:

1. **Install the LaunchAgent:**
   ```bash
   cp com.kobo.sync.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.kobo.sync.plist
   ```

2. **To uninstall later:**
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.kobo.sync.plist
   rm ~/Library/LaunchAgents/com.kobo.sync.plist
   ```

### Option 3: Folder Action (Automatic Detection)

For automatic detection when Kobo is plugged in:

1. **Save the AppleScript:**
   - The `kobo-folder-action.applescript` file is already created

2. **Attach Folder Action:**
   - Right-click on `/Volumes` in Finder
   - Select "Services" → "Folder Actions Setup" (or use Automator)
   - Or use this command:
   ```bash
   osascript -e 'tell application "Folder Actions" to attach action "kobo-folder-action.applescript" to folder "Volumes"'
   ```

3. **Alternative - Use Automator:**
   - Open Automator
   - Create new "Folder Action"
   - Set folder to `/Volumes`
   - Add "Run Shell Script" action
   - Paste: `/Users/Tony/dev/kobo/kobo-sync-improved.sh "$1"`
   - Save as "Kobo Auto-Sync"

### Option 4: macOS Automator Application

1. Open Automator
2. Create a new "Application"
3. Add "Run Shell Script" action
4. Paste: `/Users/Tony/dev/kobo/kobo-sync-improved.sh --wait`
5. Save as "Kobo Sync.app"
6. Set it to run on login or create a shortcut

## What the Script Does

1. ✅ Detects Kobo device when mounted
2. ✅ Creates backup of existing database in `~/kobo-backups/`
3. ✅ Copies database from Kobo to `public/KoboReader.sqlite`
4. ✅ Starts React dev server (if not running)
5. ✅ Opens browser to http://localhost:3000
6. ✅ Ejects Kobo device safely

## Scripts

- **`kobo-sync-improved.sh`** - Main improved script (recommended)
- **`kobo-sync.sh`** - Original script
- **`kobo-folder-action.applescript`** - Folder action for auto-detection

## Configuration

Edit `kobo-sync-improved.sh` to customize:

- `BACKUP_DIR`: Where to store backups (default: `~/kobo-backups/`)
- `PROJECT_DIR`: Your project directory
- `KOBO_MOUNT_POINT`: Expected mount point (usually `/Volumes/KOBOeReader`)

## Troubleshooting

### Device not detected
- Make sure Kobo is properly connected and mounted
- Check if it appears in `/Volumes/`
- Try running with `--wait` flag

### Permission denied
- Make sure script is executable: `chmod +x kobo-sync.sh`
- Check that you have write access to the project directory

### Database not found
- Verify the database path on your Kobo device
- Some devices might have a different path structure

### Eject fails
- You may need to manually eject from Finder
- Make sure no apps are accessing files on the device

## Backup Location

Backups are stored in: `~/kobo-backups/`

Each backup is named: `KoboReader_YYYYMMDD_HHMMSS.sqlite`

