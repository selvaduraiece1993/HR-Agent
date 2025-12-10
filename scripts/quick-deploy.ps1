#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Simple Azure deployment helper script
.DESCRIPTION
    Builds and deploys the app to Azure via ZIP deployment
.EXAMPLE
    .\scripts\quick-deploy.ps1
#>

param(
    [string]$ResourceGroup = "ai-recruitment-rg",
    [string]$WebAppName = "ai-recruitment-agent-app"
)

function Write-Step {
    param([string]$Message, [int]$Step)
    Write-Host "[$Step] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

try {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "Azure Deployment Helper" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""

    # Step 1: Check Azure CLI
    Write-Step "Checking Azure CLI..." 1
    $azPath = Get-Command az -ErrorAction SilentlyContinue
    if (-not $azPath) {
        Write-Error-Custom "Azure CLI not found. Install from: https://aka.ms/installazurecliwindows"
        exit 1
    }
    Write-Success "Azure CLI found"

    # Step 2: Verify logged in
    Write-Step "Checking Azure login..." 2
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Host "Not logged in. Starting login..." -ForegroundColor Yellow
        az login
        $account = az account show | ConvertFrom-Json
    }
    Write-Success "Logged in as: $($account.user.name)"
    Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray

    # Step 3: Build app
    Write-Step "Building application..." 3
    Write-Host "   npm ci..." -ForegroundColor Gray
    npm ci | Out-Null
    Write-Host "   npm run build..." -ForegroundColor Gray
    npm run build | Out-Null
    Write-Success "Build complete"

    # Step 4: Create ZIP
    Write-Step "Creating deployment package..." 4
    if (Test-Path "app.zip") {
        Remove-Item "app.zip" -Force
    }
    Compress-Archive -Path . -DestinationPath app.zip -Force -CompressionLevel Optimal
    $zipSize = (Get-Item "app.zip").Length / 1MB
    Write-Success "Created app.zip ($([math]::Round($zipSize, 2)) MB)"

    # Step 5: Deploy
    Write-Step "Deploying to Azure..." 5
    Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor Gray
    Write-Host "   Web App: $WebAppName" -ForegroundColor Gray
    
    $deployOutput = az webapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $WebAppName `
        --src app.zip 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Deployment initiated"
    } else {
        Write-Error-Custom "Deployment failed: $deployOutput"
        exit 1
    }

    # Step 6: Show info
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "Deployment Started!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Monitor deployment with:" -ForegroundColor Yellow
    Write-Host "  az webapp log tail --resource-group $ResourceGroup --name $WebAppName" -ForegroundColor Gray
    Write-Host ""
    Write-Host "App URL:" -ForegroundColor Yellow
    Write-Host "  https://$WebAppName.azurewebsites.net" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Cleanup (after verification):" -ForegroundColor Yellow
    Write-Host "  Remove-Item app.zip" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Error-Custom "Error: $_"
    exit 1
}
