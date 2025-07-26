#!/bin/zsh

# Deployment script for The Cycle - last updated: 2025-07-25 by coletrammell
# Use this script to commit and deploy changes to Azure
# Update this comment with each commit to track changes

# Exit on error
set -e

echo "🚀 Starting deployment process..."

# 1. Add all changes
echo "📦 Adding changes to git..."
git add .

# 2. Commit with a timestamped message
COMMIT_MSG="${1:-Express Backend & React Frontend: $(date '+%Y-%m-%d %H:%M:%S')}"
echo "💾 Committing with message: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" || echo "No changes to commit."

# 3. Push to GitHub remote first (always works)
echo "📤 Pushing to GitHub..."
git push github main

echo "✅ Successfully pushed to GitHub."

# 4. Try to push to Azure DevOps (may require authentication setup)
echo "🔄 Attempting to push to Azure DevOps..."
if git push origin main 2>/dev/null; then
    echo "✅ Successfully pushed to Azure DevOps. Pipeline will be triggered."
    echo "🔗 Monitor the pipeline at: https://dev.azure.com/c-tram/The%20Cycle/_build"
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

# 5. (Optional) Restart Azure Web Apps after deployment
# Uncomment the lines below if you want to restart the apps after deployment
# echo "🔄 Restarting Azure Web Apps..."
# az webapp restart --name TheCycle-Backend --resource-group Main
# az webapp restart --name TheCycle-Frontend --resource-group Main

echo ""
echo "✅ Deployment script completed."
echo "🌐 GitHub: https://github.com/c-tram/The-Cycle"
echo "🔧 Azure DevOps: https://dev.azure.com/c-tram/The%20Cycle"
echo "🏗️  Backend App: https://thecycle-backend.azurewebsites.net"
echo "🌐 Frontend App: https://thecycle-frontend.azurewebsites.net"
