#!/usr/bin/env pwsh
# GitHub Notes Extension Build Script
# Build script for Chrome/Edge extension store submission

Write-Host "Starting GitHub Notes extension build..." -ForegroundColor Green

# Clean and recreate release directory
Write-Host "Cleaning old release directory..." -ForegroundColor Yellow
Remove-Item -Path release -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path release | Out-Null

# Copy required files
Write-Host "Copying core files..." -ForegroundColor Yellow
Copy-Item -Path manifest.json -Destination release/

Write-Host "Copying source code..." -ForegroundColor Yellow
Copy-Item -Path src -Destination release/ -Recurse

Write-Host "Copying page files..." -ForegroundColor Yellow
Copy-Item -Path pages -Destination release/ -Recurse

Write-Host "Copying style files..." -ForegroundColor Yellow
Copy-Item -Path styles -Destination release/ -Recurse

Write-Host "Copying localization files..." -ForegroundColor Yellow
Copy-Item -Path _locales -Destination release/ -Recurse

# Create assets directory and copy icons
Write-Host "Copying icon assets..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path release/assets | Out-Null
Copy-Item -Path assets/icon*.* -Destination release/assets/

# Get version number
$manifestContent = Get-Content -Path manifest.json -Raw | ConvertFrom-Json
$version = $manifestContent.version
$zipFileName = "github-notes-v$version.zip"

# Count files before packaging
$fileCount = (Get-ChildItem -Path release -Recurse -File).Count

# Create ZIP package
Write-Host "Creating ZIP package: $zipFileName" -ForegroundColor Yellow
Compress-Archive -Path release/* -DestinationPath $zipFileName -Force

# Move ZIP file to release folder
Write-Host "Moving ZIP file to release folder..." -ForegroundColor Yellow
Move-Item -Path $zipFileName -Destination "release/$zipFileName" -Force

# Clean up other files in release folder, keep only ZIP
Write-Host "Cleaning up release folder..." -ForegroundColor Yellow
Get-ChildItem -Path release -Exclude "*.zip" | Remove-Item -Recurse -Force

# Display results
Write-Host "`nExtension build completed!" -ForegroundColor Green
Write-Host "Output file: release/$zipFileName" -ForegroundColor Cyan
Write-Host "Release directory: release/" -ForegroundColor Cyan

# Display file size
$zipSize = (Get-Item "release/$zipFileName").Length
$zipSizeKB = [math]::Round($zipSize / 1KB, 2)
Write-Host "Package size: $zipSizeKB KB" -ForegroundColor Cyan
Write-Host "File count: $fileCount files" -ForegroundColor Cyan

Write-Host "`nYou can now submit release/$zipFileName to Chrome/Edge extension stores!" -ForegroundColor Green

# Optional: open folder
# Invoke-Item .