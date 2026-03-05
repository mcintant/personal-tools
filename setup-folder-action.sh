#!/bin/bash

# Quick setup script for Folder Action
# This creates the Automator workflow file directly

WORKFLOW_DIR="$HOME/Library/Services"
WORKFLOW_NAME="Kobo Auto-Sync.workflow"
WORKFLOW_PATH="$WORKFLOW_DIR/$WORKFLOW_NAME"

echo "Creating Folder Action workflow..."

# Create Services directory if it doesn't exist
mkdir -p "$WORKFLOW_DIR"

# Create the workflow
cat > "$WORKFLOW_PATH" << 'WORKFLOW_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>540</string>
	<key>AMApplicationVersion</key>
	<string>2.11</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.path</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict>
						<key>AMParameterDefaultValue</key>
						<string># Check if the added item is a Kobo device
for item in "$@"; do
    if [ -f "$item/.kobo/KoboReader.sqlite" ]; then
        /Users/Tony/dev/kobo/kobo-sync-improved.sh "$item"
    fi
done</string>
					</dict>
					<key>CheckedForUserDefault</key>
					<true/>
					<key>UserDefaultValue</key>
					<string></string>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.path</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string># Check if the added item is a Kobo device
for item in "$@"; do
    if [ -f "$item/.kobo/KoboReader.sqlite" ]; then
        /Users/Tony/dev/kobo/kobo-sync-improved.sh "$item"
    fi
done</string>
					<key>CheckedForUserDefault</key>
					<true/>
					<key>COMMAND_STDIN</key>
					<string></string>
					<key>COMMAND_STDIN_MODE</key>
					<integer>0</integer>
					<key>COMMAND_STDIN_TEXT</key>
					<string></string>
					<key>COMMAND_STDIN_TEXT_MODE</key>
					<integer>0</integer>
					<key>COMMAND_STDIN_USE</key>
					<integer>0</integer>
					<key>COMMAND_STDIN_USE_TEXT</key>
					<integer>0</integer>
					<key>COMMAND_STDIN_USE_TEXT_MODE</key>
					<integer>0</integer>
					<key>COMMAND_STDIN_USE_TEXT_VALUE</key>
					<string></string>
					<key>IgnoreStdErr</key>
					<false/>
					<key>IgnoreStdOut</key>
					<false/>
					<key>PassInput</key>
					<integer>1</integer>
					<key>Shell</key>
					<string>/bin/bash</string>
					<key>UserDefault</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>B8C1C1C1-1C1C-1C1C-1C1C-1C1C1C1C1C1</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Run</string>
					<string>Execute</string>
					<string>Command</string>
					<string>Unix</string>
				</array>
				<key>OutputUUID</key>
				<string>B8C1C1C1-1C1C-1C1C-1C1C-1C1C1C1C1C2</string>
				<key>UUID</key>
				<string>B8C1C1C1-1C1C-1C1C-1C1C-1C1C1C1C1C3</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
				<key>arguments</key>
				<dict>
					<key>0</key>
					<dict>
						<key>default value</key>
						<integer>0</integer>
						<key>name</key>
						<string>inputMethod</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>0</string>
					</dict>
					<key>1</key>
					<dict>
						<key>default value</key>
						<integer>1</integer>
						<key>name</key>
						<string>PassInput</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>1</string>
					</dict>
				</dict>
				<key>conversionLabel</key>
				<integer>0</integer>
				<key>isViewVisible</key>
				<integer>1</integer>
				<key>location</key>
				<string>578.000000:300.000000</string>
				<key>nestedActions</key>
				<array/>
				<key>nestedActionsWidth</key>
				<integer>0</integer>
				<key>shouldTryAdHocSigning</key>
				<false/>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowType</key>
	<string>FolderAction</string>
	<key>workflowMetaData</key>
	<dict>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject.folder</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceApplicationBundleID</key>
		<string>com.apple.Finder</string>
		<key>serviceApplicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>serviceReceives</key>
		<string>files</string>
		<key>serviceFolderActionFolder</key>
		<string>/Volumes</string>
	</dict>
</dict>
</plist>
WORKFLOW_EOF

if [ $? -eq 0 ]; then
    echo "✅ Workflow created successfully!"
    echo ""
    echo "The Folder Action has been created at:"
    echo "$WORKFLOW_PATH"
    echo ""
    echo "To enable it:"
    echo "1. Open System Settings → Privacy & Security → Automation"
    echo "2. Make sure Folder Actions are enabled"
    echo "3. Plug in your Kobo to test!"
    echo ""
    echo "Or you can enable it via command line:"
    echo "  open \"$WORKFLOW_PATH\""
else
    echo "❌ Failed to create workflow"
    exit 1
fi



