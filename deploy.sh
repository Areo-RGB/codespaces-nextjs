#!/bin/bash

# Deployment script for video player app
# Requires GITHUB_TOKEN to be set in .env file

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if token exists
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN not found in .env"
    exit 1
fi

# Repository details
REPO_NAME="video-player-spa"
GITHUB_USERNAME="Areo-RGB"  # Your GitHub username

echo "🚀 Starting deployment..."

# Build the application
echo "📦 Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Create GitHub repository if it doesn't exist
echo "🔧 Setting up repository..."

# Check if remote exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "📍 Remote origin already exists"
else
    # Add remote origin
    git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git
    echo "📍 Added remote origin"
fi

# Add all files and commit
echo "📝 Committing changes..."
git add .
git commit -m "Deploy video player app

Features:
- Full screen video player with mobile-first design
- Dual video mode for side-by-side playback
- Custom controls with speed adjustment (0.25x-2x)
- 30-second timer with adjustable increments
- Video selection interface with thumbnails
- Title overlay for video transitions
- Touch-optimized mobile interface

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed to GitHub!"
    echo "🌐 Repository URL: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
else
    echo "❌ Push failed"
    exit 1
fi

echo "🎉 Deployment complete!"