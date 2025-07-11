#!/bin/zsh

# Dev run script for The Cycle - last updated: 2025-06-30 by coletrammell
# Use this script to run both backend and frontend in dev mode
# Update this comment with each commit to track changes

# Exit on error
set -e

# 1. Add all changes
git add .

# 2. Commit with a timestamped message
git commit -m "Docker Build Configured for Azure Redis: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit."

# 3. Push to GitHub remote first (always works)
echo "Pushing to GitHub..."
git push github main

echo "✅ Successfully pushed to GitHub."

# 4. Try to push to Azure DevOps (may require authentication setup)
echo "Attempting to push to Azure DevOps..."
if git push origin main 2>/dev/null; then
    echo "✅ Successfully pushed to Azure DevOps. Pipeline will be triggered."
else
    echo "⚠️  Azure DevOps push failed. This might be due to authentication issues."
    echo "📋 To fix Azure DevOps authentication:"
    echo "   1. Generate a Personal Access Token (PAT) in Azure DevOps"
    echo "   2. Update the remote URL: git remote set-url origin https://YOUR_PAT@dev.azure.com/c-tram/The%20Cycle/_git/The%20Cycle"
    echo "   3. Or use SSH: git remote set-url origin git@ssh.dev.azure.com:v3/c-tram/The%20Cycle/The%20Cycle"
    echo ""
    echo "📦 Your code has been successfully pushed to GitHub and will be preserved."
    echo "🚀 You can manually trigger the Azure DevOps pipeline from the Azure DevOps portal."
fi

# 5. (Optional) Restart Azure Web App after deployment
# az webapp restart --name thecycle-fxfta3e4g2cyg7c6 --resource-group Main

echo "✅ Deployment script completed."
echo "🌐 GitHub: https://github.com/c-tram/The-Cycle"
echo "🔧 Azure DevOps: https://dev.azure.com/c-tram/The%20Cycle"