#!/bin/zsh

# Dev run script for The Cycle - last updated: 2025-05-28 by coletrammell
# Use this script to run both backend and frontend in dev mode
# Update this comment with each commit to track changes

# Exit on error
set -e

# 1. Add all changes
git add .

# 2. Commit with a timestamped message
git commit -m "Omit Pipeline tests that utilize localhost: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit."

# 3. Pull latest changes from Azure DevOps remote (origin) and merge
git pull origin main --no-rebase

# 4. Push to main (triggers Azure DevOps pipeline)
git push origin main

echo "Pushed to main. Azure DevOps pipeline will build and deploy your app."

# 5. (Optional) Restart Azure Web App after deployment
# az webapp restart --name thecycle-fxfta3e4g2cyg7c6 --resource-group Main

# 6. Push to GitHub remote (github)
git push github main

echo "Also pushed to GitHub remote."

echo "Done."