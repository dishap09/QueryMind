#!/bin/bash
# Script to rename screenshots to match README references

cd "$(dirname "$0")"

# Rename the screenshots to match README references
if [ -f "Screenshot 2025-11-12 at 4.49.54 PM.png" ]; then
    mv "Screenshot 2025-11-12 at 4.49.54 PM.png" "main-interface.png"
    echo "Renamed first screenshot to main-interface.png"
fi

if [ -f "Screenshot 2025-11-12 at 4.50.27 PM.png" ]; then
    mv "Screenshot 2025-11-12 at 4.50.27 PM.png" "query-results.png"
    echo "Renamed second screenshot to query-results.png"
fi

echo "Done! Screenshots renamed."

