# Setting Up Folder Action in Automator

Follow these steps to automatically sync your Kobo when you plug it in:

## Step-by-Step Instructions

### Step 1: Open Automator
1. Press `Cmd + Space` to open Spotlight
2. Type "Automator" and press Enter
3. Or find it in Applications → Automator

### Step 2: Create New Folder Action
1. When Automator opens, you'll see a template chooser
2. Select **"Folder Action"** from the list
3. Click **"Choose"**

### Step 3: Configure the Folder
1. At the top of the workflow, you'll see a dropdown that says "Folder Action receives files and folders added to:"
2. Click the dropdown
3. Select **"Other..."** from the bottom of the list
4. In the file picker, press `Cmd + Shift + G` to open "Go to folder"
5. Type: `/Volumes`
6. Click **"Go"**
7. Click **"Open"** (you're selecting the Volumes folder itself, not a subfolder)

### Step 4: Add Shell Script Action
1. In the left sidebar, search for "Run Shell Script"
2. Drag **"Run Shell Script"** into the workflow area (on the right)
3. In the "Run Shell Script" action that appears:
   - Set "Shell" to: `/bin/bash`
   - Set "Pass input" to: **"as arguments"**
   - In the script box, paste this:
   ```bash
   # Check if the added item is a Kobo device
   for item in "$@"; do
       if [ -f "$item/.kobo/KoboReader.sqlite" ]; then
           /Users/Tony/dev/kobo/kobo-sync-improved.sh "$item"
       fi
   done
   ```

### Step 5: Save the Folder Action
1. Press `Cmd + S` or go to File → Save
2. Name it: **"Kobo Auto-Sync"**
3. Click **"Save"**

### Step 6: Enable Folder Actions (if needed)
1. Go to **System Settings** (or System Preferences on older macOS)
2. Search for "Folder Actions" or go to **Privacy & Security → Automation**
3. Make sure Folder Actions are enabled
4. If prompted, allow Automator to control your computer

## Alternative: Simpler Version

If the above doesn't work, try this simpler version:

### In the Shell Script box, use this instead:
```bash
/Users/Tony/dev/kobo/kobo-sync-improved.sh "$1"
```

This will run the script on any volume that gets mounted. The script itself will check if it's a Kobo device.

## Testing

1. **Unplug your Kobo** (if it's connected)
2. **Plug it back in**
3. You should see the sync script run automatically
4. Check Terminal or Console for any output

## Troubleshooting

### Folder Action not running?
- Make sure Folder Actions are enabled in System Settings
- Check System Settings → Privacy & Security → Automation
- Grant necessary permissions if prompted

### Script not found?
- Make sure the path `/Users/Tony/dev/kobo/kobo-sync-improved.sh` is correct
- Verify the script is executable: `chmod +x /Users/Tony/dev/kobo/kobo-sync-improved.sh`

### Want to see what's happening?
- Open Console.app to see system logs
- Or modify the script to show notifications:
  ```bash
  osascript -e 'display notification "Syncing Kobo..." with title "Kobo Sync"'
  /Users/Tony/dev/kobo/kobo-sync-improved.sh "$1"
  ```

## Disable/Remove Folder Action

1. Open Automator
2. File → Open Recent → "Kobo Auto-Sync"
3. Or find it in: `~/Library/Services/`
4. Delete the file or disable it in System Settings



