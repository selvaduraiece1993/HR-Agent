# Azure App Service Deployment Script
# This script automates the entire deployment process for AI Recruitment Agent

param(
    [string]$ResourceGroup = "ai-recruitment-rg",
    [string]$Location = "eastus",
    [string]$AppServicePlan = "ai-recruitment-plan",
    [string]$WebAppName = "ai-recruitment-agent-app",
    [string]$SkuName = "B2"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure App Service Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Authenticate to Azure
Write-Host "[1] Authenticating to Azure..." -ForegroundColor Yellow
try {
    $account = az account show 2>$null
    if (!$account) {
        Write-Host "Not logged in. Opening Azure login..." -ForegroundColor Green
        az login
    }
    else {
        Write-Host "Already logged in." -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create Resource Group
Write-Host "[2] Creating Resource Group '$ResourceGroup' in $Location..." -ForegroundColor Yellow
try {
    az group create --name $ResourceGroup --location $Location --output none
    Write-Host "✓ Resource Group created successfully." -ForegroundColor Green
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create App Service Plan
Write-Host "[3] Creating App Service Plan '$AppServicePlan' (SKU: $SkuName)..." -ForegroundColor Yellow
try {
    az appservice plan create `
        --name $AppServicePlan `
        --resource-group $ResourceGroup `
        --sku $SkuName `
        --is-linux `
        --output none
    Write-Host "✓ App Service Plan created successfully." -ForegroundColor Green
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Create Web App
Write-Host "[4] Creating Web App '$WebAppName'..." -ForegroundColor Yellow
try {
    az webapp create `
        --resource-group $ResourceGroup `
        --plan $AppServicePlan `
        --name $WebAppName `
        --runtime "NODE|20-lts" `
        --output none
    Write-Host "✓ Web App created successfully." -ForegroundColor Green
    Write-Host "   URL: https://$WebAppName.azurewebsites.net" -ForegroundColor Cyan
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Prompt for Environment Variables
Write-Host "[5] Configuring Environment Variables..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please provide the following values:" -ForegroundColor Cyan
Write-Host "(Press Enter to use defaults where applicable)" -ForegroundColor Gray
Write-Host ""

$supabaseUrl = Read-Host "Supabase URL (NEXT_PUBLIC_SUPABASE_URL)"
$supabaseKey = Read-Host "Supabase Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)"
$usersTable = Read-Host "Users Table Name [users]"
$interviewsTable = Read-Host "Interviews Table Name [interviews]"
$resultsTable = Read-Host "Results Table Name [interview_results]"
$openrouterKey = Read-Host "OpenRouter API Key (OPENROUTER_API_KEY)"
$vapiKey = Read-Host "VAPI API Key (VAPI_API_KEY)"
$googleClientId = Read-Host "Google Client ID (GOOGLE_CLIENT_ID)"
$googleClientSecret = Read-Host "Google Client Secret (GOOGLE_CLIENT_SECRET)"

# Set defaults if empty
if ([string]::IsNullOrWhiteSpace($usersTable)) { $usersTable = "users" }
if ([string]::IsNullOrWhiteSpace($interviewsTable)) { $interviewsTable = "interviews" }
if ([string]::IsNullOrWhiteSpace($resultsTable)) { $resultsTable = "interview_results" }

Write-Host ""
Write-Host "Setting environment variables..." -ForegroundColor Yellow
try {
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $WebAppName `
        --settings `
        NEXT_PUBLIC_SUPABASE_URL="$supabaseUrl" `
        NEXT_PUBLIC_SUPABASE_ANON_KEY="$supabaseKey" `
        NEXT_PUBLIC_USERS_TABLE_NAME="$usersTable" `
        NEXT_PUBLIC_INTERVIEWS_TABLE_NAME="$interviewsTable" `
        NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME="$resultsTable" `
        OPENROUTER_API_KEY="$openrouterKey" `
        VAPI_API_KEY="$vapiKey" `
        GOOGLE_CLIENT_ID="$googleClientId" `
        GOOGLE_CLIENT_SECRET="$googleClientSecret" `
        NEXT_PUBLIC_AUTH_REDIRECT_URL="https://$WebAppName.azurewebsites.net" `
        SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
        WEBSITE_NODE_DEFAULT_VERSION="20-lts" `
        --output none
    Write-Host "✓ Environment variables configured successfully." -ForegroundColor Green
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Configure Deployment
Write-Host "[6] Configuring deployment options..." -ForegroundColor Yellow
try {
    # Enable zip deployment
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $WebAppName `
        --linux-fx-version "NODE|20-lts" `
        --output none
    
    # Configure git deployment (optional)
    Write-Host "✓ Deployment configured successfully." -ForegroundColor Green
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 7: Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Web App Details:" -ForegroundColor Yellow
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor Cyan
Write-Host "  App Service Plan: $AppServicePlan" -ForegroundColor Cyan
Write-Host "  Web App Name: $WebAppName" -ForegroundColor Cyan
Write-Host "  URL: https://$WebAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "  Runtime: Node.js 20 LTS (Linux)" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Build your app locally:" -ForegroundColor Cyan
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy to Azure (Option A - ZIP Deployment):" -ForegroundColor Cyan
Write-Host "   Compress-Archive -Path . -DestinationPath app.zip -Force" -ForegroundColor Gray
Write-Host "   az webapp deployment source config-zip --resource-group $ResourceGroup --name $WebAppName --src app.zip" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy to Azure (Option B - GitHub Actions):" -ForegroundColor Cyan
Write-Host "   a. Create GitHub Secrets (Settings -> Secrets -> Actions):" -ForegroundColor Gray
Write-Host "      - AZURE_CREDENTIALS (from service principal)" -ForegroundColor Gray
Write-Host "      - SUPABASE_URL, SUPABASE_ANON_KEY, etc." -ForegroundColor Gray
Write-Host "   b. Push to main branch to trigger deployment" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Monitor deployment:" -ForegroundColor Cyan
Write-Host "   az webapp log tail --resource-group $ResourceGroup --name $WebAppName" -ForegroundColor Gray
Write-Host ""

Write-Host "For detailed instructions, see AZURE_DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
