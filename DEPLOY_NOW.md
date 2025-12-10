# Deploy to Azure - Step by Step

Follow these commands in order. Copy and paste each block into PowerShell.

---

## Step 1: Login to Azure (1 minute)

```powershell
az login
```

This will open your browser. Sign in with your Azure account.

---

## Step 2: Set Your Variables (30 seconds)

**IMPORTANT:** Change `ai-recruitment-agent-xyz123` to a unique name (must be globally unique).

```powershell
$resourceGroup = "ai-recruitment-rg"
$location = "eastus"
$appServicePlan = "ai-recruitment-plan"
$webAppName = "ai-recruitment-agent-xyz123"  # ← CHANGE THIS TO BE UNIQUE!
$sku = "B2"
```

---

## Step 3: Create Resource Group (30 seconds)

```powershell
Write-Host "Creating Resource Group..." -ForegroundColor Green
az group create --name $resourceGroup --location $location
Write-Host "✓ Resource Group created" -ForegroundColor Green
```

---

## Step 4: Create App Service Plan (1 minute)

```powershell
Write-Host "Creating App Service Plan..." -ForegroundColor Green
az appservice plan create `
  --name $appServicePlan `
  --resource-group $resourceGroup `
  --sku $sku `
  --is-linux
Write-Host "✓ App Service Plan created" -ForegroundColor Green
```

---

## Step 5: Create Web App (2 minutes)

```powershell
Write-Host "Creating Web App..." -ForegroundColor Green
az webapp create `
  --resource-group $resourceGroup `
  --plan $appServicePlan `
  --name $webAppName `
  --runtime "NODE|20-lts"
Write-Host "✓ Web App created at: https://$webAppName.azurewebsites.net" -ForegroundColor Cyan
```

---

## Step 6: Set Environment Variables (1 minute)

**Replace the placeholder values with your actual credentials:**

```powershell
az webapp config appsettings set `
  --resource-group $resourceGroup `
  --name $webAppName `
  --settings `
    NEXT_PUBLIC_SUPABASE_URL="PASTE_YOUR_SUPABASE_URL_HERE" `
    NEXT_PUBLIC_SUPABASE_ANON_KEY="PASTE_YOUR_SUPABASE_ANON_KEY_HERE" `
    NEXT_PUBLIC_USERS_TABLE_NAME="users" `
    NEXT_PUBLIC_INTERVIEWS_TABLE_NAME="interviews" `
    NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME="interview_results" `
    OPENROUTER_API_KEY="PASTE_YOUR_OPENROUTER_KEY_HERE" `
    VAPI_API_KEY="PASTE_YOUR_VAPI_KEY_HERE" `
    GOOGLE_CLIENT_ID="PASTE_YOUR_GOOGLE_CLIENT_ID_HERE" `
    GOOGLE_CLIENT_SECRET="PASTE_YOUR_GOOGLE_CLIENT_SECRET_HERE" `
    NEXT_PUBLIC_AUTH_REDIRECT_URL="https://$webAppName.azurewebsites.net" `
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    WEBSITE_NODE_DEFAULT_VERSION="20-lts"
Write-Host "✓ Environment variables set" -ForegroundColor Green
```

---

## Step 7: Build Your App (3-5 minutes)

```powershell
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

Write-Host "Building Next.js app..." -ForegroundColor Green
npm run build
Write-Host "✓ Build complete" -ForegroundColor Green
```

---

## Step 8: Create Deployment Package (1 minute)

```powershell
Write-Host "Creating deployment package..." -ForegroundColor Green
if (Test-Path "app.zip") { Remove-Item "app.zip" -Force }
Compress-Archive -Path . -DestinationPath app.zip -Force
$size = (Get-Item "app.zip").Length / 1MB
Write-Host "✓ Created app.zip ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
```

---

## Step 9: Deploy to Azure (5-10 minutes)

```powershell
Write-Host "Deploying to Azure..." -ForegroundColor Green
az webapp deployment source config-zip `
  --resource-group $resourceGroup `
  --name $webAppName `
  --src app.zip
Write-Host "✓ Deployment initiated" -ForegroundColor Green
```

---

## Step 10: Monitor Deployment

```powershell
Write-Host "Monitoring deployment logs (Ctrl+C to exit)..." -ForegroundColor Yellow
az webapp log tail --resource-group $resourceGroup --name $webAppName
```

---

## Step 11: Open Your App

```powershell
Start-Process "https://$webAppName.azurewebsites.net"
```

---

## Troubleshooting

**If deployment fails:**
```powershell
# Check app status
az webapp show --resource-group $resourceGroup --name $webAppName --query "state"

# Restart app
az webapp restart --resource-group $resourceGroup --name $webAppName

# View detailed logs
az webapp log tail --resource-group $resourceGroup --name $webAppName -n 100
```

**If you need to redeploy:**
```powershell
# Just rebuild and redeploy
npm run build
Compress-Archive -Path . -DestinationPath app.zip -Force
az webapp deployment source config-zip `
  --resource-group $resourceGroup `
  --name $webAppName `
  --src app.zip
```

---

## Update OAuth Redirect URIs

After deployment, update your OAuth providers:

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to "Authorized redirect URIs":
   ```
   https://<your-app-name>.azurewebsites.net/auth/callback
   ```

**GitHub OAuth (if used):**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Update "Authorization callback URL":
   ```
   https://<your-app-name>.azurewebsites.net/auth/callback
   ```

---

## Clean Up (if needed)

To delete everything and start over:
```powershell
az group delete --name $resourceGroup --yes --no-wait
```

---

**Ready?** Start with Step 1 above!
