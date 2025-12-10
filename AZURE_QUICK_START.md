# Azure Deployment - Quick Setup Guide

## Prerequisites ✓
- ✅ Node.js v22.20.0
- ✅ npm 10.9.3
- ✅ Azure CLI installed
- ✅ Azure subscription

---

## Step 1: Login to Azure (5 minutes)

**Open PowerShell and run:**

```powershell
# New PowerShell window might be needed for Azure CLI to be in PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

az login
```

This will open a browser to authenticate. After successful login, you'll see your subscription details.

---

## Step 2: Create Azure Resources (10 minutes)

**Copy and run these commands in PowerShell:**

```powershell
# Set variables (customize these)
$resourceGroup = "ai-recruitment-rg"
$location = "eastus"
$appServicePlan = "ai-recruitment-plan"
$webAppName = "ai-recruitment-agent-app"  # Must be globally unique!
$sku = "B2"

# 2.1: Create Resource Group
Write-Host "Creating Resource Group..." -ForegroundColor Green
az group create --name $resourceGroup --location $location

# 2.2: Create App Service Plan (Linux, Node.js)
Write-Host "Creating App Service Plan..." -ForegroundColor Green
az appservice plan create `
  --name $appServicePlan `
  --resource-group $resourceGroup `
  --sku $sku `
  --is-linux

# 2.3: Create Web App
Write-Host "Creating Web App..." -ForegroundColor Green
az webapp create `
  --resource-group $resourceGroup `
  --plan $appServicePlan `
  --name $webAppName `
  --runtime "NODE|20-lts"

# Verify it was created
Write-Host "Web App URL: https://$webAppName.azurewebsites.net" -ForegroundColor Cyan
```

**⚠️ Important:** Replace `ai-recruitment-agent-app` with a unique name (Azure requires globally unique URLs).

---

## Step 3: Configure Environment Variables (5 minutes)

**Get your values ready:**

From your `.env.local`, gather:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `VAPI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Run in PowerShell:**

```powershell
# Update these with your actual values
$resourceGroup = "ai-recruitment-rg"
$webAppName = "ai-recruitment-agent-app"

az webapp config appsettings set `
  --resource-group $resourceGroup `
  --name $webAppName `
  --settings `
    NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" `
    NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here" `
    NEXT_PUBLIC_USERS_TABLE_NAME="users" `
    NEXT_PUBLIC_INTERVIEWS_TABLE_NAME="interviews" `
    NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME="interview_results" `
    OPENROUTER_API_KEY="your_openrouter_key" `
    VAPI_API_KEY="your_vapi_key" `
    GOOGLE_CLIENT_ID="your_google_id" `
    GOOGLE_CLIENT_SECRET="your_google_secret" `
    NEXT_PUBLIC_AUTH_REDIRECT_URL="https://$webAppName.azurewebsites.net" `
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    WEBSITE_NODE_DEFAULT_VERSION="20-lts"
```

**Verify settings were applied:**

```powershell
az webapp config appsettings list `
  --resource-group $resourceGroup `
  --name $webAppName
```

---

## Step 4: Deploy Your App (15 minutes)

### Option A: ZIP Deployment (Simplest)

**In PowerShell at your project root:**

```powershell
cd c:\Projects\AI-Recruitment-Agent

# 4.1: Install dependencies and build
npm ci
npm run build

# 4.2: Create ZIP package
Compress-Archive -Path . -DestinationPath app.zip -Force
Write-Host "Created app.zip" -ForegroundColor Green

# 4.3: Deploy to Azure
az webapp deployment source config-zip `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app `
  --src app.zip

Write-Host "Deployment started! Check progress..." -ForegroundColor Cyan
```

**Monitor deployment (wait 2-5 minutes):**

```powershell
az webapp log tail `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app
```

### Option B: GitHub Actions (Recommended for CI/CD)

**Already configured! Just:**

1. Add GitHub Secrets (Settings > Secrets > Actions):
   - `AZURE_CREDENTIALS` (create from service principal below)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`, etc.

2. Create Azure Service Principal:

```powershell
$subscriptionId = az account show --query id -o tsv
az ad sp create-for-rbac `
  --name "github-deployment" `
  --role contributor `
  --scopes "/subscriptions/$subscriptionId/resourceGroups/ai-recruitment-rg"
```

3. Copy the JSON output as `AZURE_CREDENTIALS` secret in GitHub

4. Push to `main` branch:

```powershell
git add .
git commit -m "Add Azure deployment"
git push origin main
```

GitHub Actions will automatically deploy!

---

## Step 5: Verify Deployment (5 minutes)

### Check App Status

```powershell
az webapp show `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app `
  --query "state"

# Should show: "Running"
```

### Visit Your App

Open browser: `https://ai-recruitment-agent-app.azurewebsites.net`

### Test API Endpoint

```powershell
curl -X POST https://ai-recruitment-agent-app.azurewebsites.net/api/ai-model `
  -H "Content-Type: application/json" `
  -d '{"job_position":"Engineer","job_description":"Test","duration":30,"type":"technical"}'
```

### Check Logs in Real-Time

```powershell
az webapp log tail `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app `
  -n 50  # Last 50 lines
```

---

## Step 6: Update OAuth Redirect URIs (If Using OAuth)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to Credentials > OAuth 2.0 Client IDs
4. Add authorized redirect URI:
   ```
   https://ai-recruitment-agent-app.azurewebsites.net/auth/callback
   ```

### GitHub OAuth (if used)

1. Settings > Developer settings > OAuth Apps
2. Update Authorization callback URL:
   ```
   https://ai-recruitment-agent-app.azurewebsites.net/auth/callback
   ```

---

## Troubleshooting

### Issue: "npm ERR! ERESOLVE unable to resolve dependency tree"
**Solution:** Already fixed with `.npmrc`

### Issue: App shows "Application Error"
**Check logs:**
```powershell
az webapp log tail --resource-group ai-recruitment-rg --name ai-recruitment-agent-app
```

### Issue: 401/403 Errors on API Calls
- Verify `OPENROUTER_API_KEY` is correct
- Check Supabase CORS settings
- Ensure `VAPI_API_KEY` is valid

### Issue: Build timeout (>60 minutes)
Increase App Service plan tier (B2 → B3 or higher)

### Issue: Restart app
```powershell
az webapp restart `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app
```

---

## Cost Estimates

| Service | Monthly Cost |
|---------|-------------|
| App Service Plan (B2) | ~$26 |
| Application Insights | ~$2 |
| Data Transfer (100GB) | ~$15 |
| **Total** | **~$43** |

To reduce costs: use B1 (~$13/month) for dev/staging

---

## Next Steps After Deployment

1. ✅ Test all user flows (login, interview creation, feedback)
2. ✅ Test video recording and upload
3. ✅ Monitor logs and errors
4. ✅ Set up Azure Application Insights for monitoring
5. ✅ Configure custom domain (optional)
6. ✅ Set up SSL certificate (automatic with App Service)
7. ✅ Enable auto-scaling for production

---

**Questions?** Check `AZURE_DEPLOYMENT_GUIDE.md` for detailed info or Azure documentation.
