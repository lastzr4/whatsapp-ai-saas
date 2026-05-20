# JomReply Update Script
# Run this after downloading the zip from Claude

param(
    [string]$ZipPath = "$env:userX\Downloads\whatsapp-saas-prod.zip",
    [string]$ProjectPath = "C:\whatsapp-saas-prod",
    [string]$Branch = "dev",
    [string]$Message = "fix: update from Claude"
)

Write-Host "🔄 JomReply Update Script" -ForegroundColor Cyan
Write-Host "================================"

# Check zip exists
if (-not (Test-Path $ZipPath)) {
    Write-Host "❌ Zip not found: $ZipPath" -ForegroundColor Red
    Write-Host "Download the zip from Claude first, save to Downloads folder"
    exit 1
}

# Extract to temp
$TempDir = "$env:TEMP\jomreply-update"
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
Write-Host "📦 Extracting zip..." -ForegroundColor Yellow
Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force

# Find extracted files
$ExtractedRoot = "$TempDir\whatsapp-saas-prod"
$Files = Get-ChildItem -Path $ExtractedRoot -Recurse -File

Write-Host "📁 Found $($Files.Count) files to update:" -ForegroundColor Yellow
foreach ($file in $Files) {
    $RelPath = $file.FullName.Replace($ExtractedRoot + "\", "").Replace("\", "/")
    $Dest = Join-Path $ProjectPath $RelPath
    $DestDir = Split-Path $Dest -Parent
    
    # Create directory if needed
    if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }
    
    # Copy file
    Copy-Item $file.FullName $Dest -Force
    Write-Host "  ✅ $RelPath" -ForegroundColor Green
}

# Git operations
Write-Host ""
Write-Host "🚀 Committing to GitHub ($Branch)..." -ForegroundColor Yellow
Set-Location $ProjectPath

git checkout $Branch
git add -A

$Status = git status --porcelain
if ($Status) {
    git commit -m $Message
    git push origin $Branch
    Write-Host ""
    Write-Host "✅ Done! Changes pushed to $Branch" -ForegroundColor Green
} else {
    Write-Host "⚠️ No changes detected - files may already be up to date" -ForegroundColor Yellow
}

# Cleanup
Remove-Item $TempDir -Recurse -Force
Write-Host "🧹 Temp files cleaned" -ForegroundColor Gray