-- Folder Action Script for Kobo Auto-Sync
-- Attach this to /Volumes folder to auto-detect Kobo devices

on adding folder items to this_folder after receiving added_items
    repeat with added_item in added_items
        set item_path to POSIX path of added_item
        set item_name to name of (info for added_item)
        
        -- Check if it's a Kobo device
        try
            set kobo_db to item_path & ".kobo/KoboReader.sqlite"
            if (POSIX file kobo_db) exists then
                -- It's a Kobo device!
                display notification "Kobo device detected! Syncing..." with title "Kobo Sync"
                
                -- Run the sync script
                do shell script "/Users/Tony/dev/kobo/kobo-sync-improved.sh " & quoted form of item_path
            end if
        on error
            -- Not a Kobo device or error checking
        end try
    end repeat
end adding folder items to



