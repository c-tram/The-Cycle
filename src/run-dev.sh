#!/bin/zsh

# Exit on error
set -e

# 1. Add all changes
git add .

# 2. Commit with a timestamped message
git commit -m "Automated CI/CD deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit."

# 3. Pull latest changes from Azure DevOps remote (origin) and merge
git pull origin main --no-rebase

# 4. Push to main (triggers Azure DevOps pipeline)
git push origin main

echo "Pushed to main. Azure DevOps pipeline will build and deploy your app."

# 5. (Optional) Restart Azure Web App after deployment
# az webapp restart --name thecycle-fxfta3e4g2cyg7c6 --resource-group Main

echo "Done."