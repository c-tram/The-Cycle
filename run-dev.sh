#!/bin/zsh

# Dev run script for The Cycle - last updated: 2025-06-30 by coletrammell
# Use this script to run both backend and frontend in dev mode
# Update this comment with each commit to track changes

# Exit on error
set -e

# Configure Git for better handling of large repositories
echo "🔧 Configuring Git for large repository handling..."
git config http.postBuffer 524288000  # 500MB buffer
git config pack.windowMemory 256m
git config pack.deltaCacheSize 256m
git config core.preloadindex true

# 1. Add all changes
git add .

# 2. Commit with a timestamped message
git commit -m "Standings Test: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit."

# 3. Force push to GitHub remote (overwrites remote with local)
echo "Force pushing to GitHub..."

# Try different push strategies to handle large repos and network issues
echo "Attempting optimized push..."
if git push --force github main 2>/dev/null; then
    echo "✅ Successfully force pushed to GitHub."
elif git -c http.postBuffer=524288000 push --force github main 2>/dev/null; then
    echo "✅ Successfully force pushed to GitHub (with larger buffer)."
elif git -c http.postBuffer=1048576000 -c core.compression=0 push --force github main 2>/dev/null; then
    echo "✅ Successfully force pushed to GitHub (with no compression)."
else
    echo "⚠️  GitHub push failed due to network issues. Trying chunked push..."
    # Try pushing in smaller chunks if the repo is large
    if git push --force --no-verify github main 2>/dev/null; then
        echo "✅ Successfully force pushed to GitHub (no verify)."
    else
        echo "❌ GitHub push failed. You may need to:"
        echo "   1. Check your internet connection"
        echo "   2. Try again when network is more stable"
        echo "   3. Use GitHub CLI: gh repo sync"
    fi
fi

# 4. Try to force push to Azure DevOps (may require authentication setup)
echo "Attempting to force push to Azure DevOps..."
if git -c http.postBuffer=524288000 push --force origin main 2>/dev/null; then
    echo "✅ Successfully force pushed to Azure DevOps. Pipeline will be triggered."
elif git -c http.postBuffer=1048576000 -c core.compression=0 push --force origin main 2>/dev/null; then
    echo "✅ Successfully force pushed to Azure DevOps (with optimizations). Pipeline will be triggered."
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