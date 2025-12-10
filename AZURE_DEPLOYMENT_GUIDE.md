# Azure App Service Deployment Guide

This guide walks you through deploying the AI Recruitment Agent to Azure App Service.

## Prerequisites

- Azure subscription ([Create free account](https://azure.microsoft.com/en-us/free/))
- Azure CLI installed ([Download](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli))
- GitHub account with this repo
- All environment variables ready (see `.env.example`)

## Step 1: Create Azure Resources

### 1.1 Login to Azure

```powershell
az login
```

This opens your browser to authenticate.

### 1.2 Create a Resource Group

```powershell
$resourceGroup = "ai-recruitment-rg"
$location = "eastus"

az group create --name $resourceGroup --location $location
```

### 1.3 Create an App Service Plan

```powershell
$appServicePlan = "ai-recruitment-plan"

az appservice plan create `
  --name $appServicePlan `
  --resource-group $resourceGroup `
  --sku B2 `
  --is-linux
```

**SKU Options:**

- `B1` - Small, ~$13/month (dev/test)
- `B2` - Medium, ~$26/month (small production) ← Recommended
- `B3` - Large, ~$52/month (production)
- `S1` - Standard, ~$75/month (scalable)

### 1.4 Create Web App

```powershell
$webAppName = "ai-recruitment-agent-app"  # Must be globally unique

az webapp create `
  --resource-group $resourceGroup `
  --plan $appServicePlan `
  --name $webAppName `
  --runtime "NODE|20-lts"
```

**Note:** Replace `ai-recruitment-agent-app` with a unique name (Azure requires global uniqueness).

Your app will be live at: `https://<webAppName>.azurewebsites.net`

---

## Step 2: Configure Environment Variables

### 2.1 Prepare Your Secrets

Gather all environment variables from your local `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_USERS_TABLE_NAME=users
NEXT_PUBLIC_INTERVIEWS_TABLE_NAME=interviews
NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME=interview_results
OPENROUTER_API_KEY=your_openrouter_key
VAPI_API_KEY=your_vapi_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_AUTH_REDIRECT_URL=https://<webAppName>.azurewebsites.net
```

### 2.2 Set App Settings in Azure

```powershell
$webAppName = "ai-recruitment-agent-app"
$resourceGroup = "ai-recruitment-rg"

# Set all environment variables at once
az webapp config appsettings set `
  --resource-group $resourceGroup `
  --name $webAppName `
  --settings `
    NEXT_PUBLIC_SUPABASE_URL="your_supabase_url" `
    NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key" `
    NEXT_PUBLIC_USERS_TABLE_NAME="users" `
    NEXT_PUBLIC_INTERVIEWS_TABLE_NAME="interviews" `
    NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME="interview_results" `
    OPENROUTER_API_KEY="your_openrouter_key" `
    VAPI_API_KEY="your_vapi_key" `
    GOOGLE_CLIENT_ID="your_google_client_id" `
    GOOGLE_CLIENT_SECRET="your_google_client_secret" `
    NEXT_PUBLIC_AUTH_REDIRECT_URL="https://<webAppName>.azurewebsites.net" `
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    WEBSITE_NODE_DEFAULT_VERSION="20-lts"
```

**Replace placeholder values with your actual secrets.**

### 2.3 Verify Settings

```powershell
az webapp config appsettings list `
  --resource-group $resourceGroup `
  --name $webAppName
```

---

## Step 3: Set Up GitHub Actions for CI/CD

### 3.1 Create Azure Service Principal

This allows GitHub to deploy on your behalf:

```powershell
$subscriptionId = "your-subscription-id"  # Get from: az account show --query id

az ad sp create-for-rbac `
  --name "github-deployment" `
  --role contributor `
  --scopes "/subscriptions/$subscriptionId/resourceGroups/ai-recruitment-rg"
```

**Save the output:** You'll need `clientId`, `clientSecret`, `subscriptionId`, and `tenantId`.

### 3.2 Add GitHub Secrets

In your GitHub repo:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `AZURE_SUBSCRIPTION_ID` = (from step 3.1)
   - `AZURE_CLIENT_ID` = (from step 3.1)
   - `AZURE_CLIENT_SECRET` = (from step 3.1)
   - `AZURE_TENANT_ID` = (from step 3.1)

### 3.3 Create GitHub Actions Workflow

Create file: `.github/workflows/azure-deploy.yml`

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint
        continue-on-error: true

      - name: Build Next.js
        run: npm run build

      - name: Azure login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ai-recruitment-agent-app
          package: .

      - name: Azure logout
        run: az logout
```

**Note:** Update `app-name` to match your web app name.

---

## Step 4: Deploy Your App

### Option A: Deploy via GitHub Actions (Recommended)

1. Update `.github/workflows/azure-deploy.yml` (created above)
2. Create Azure Service Principal and add secrets (Step 3.1 & 3.2)
3. Push to `main` branch:
   ```powershell
   git add .
   git commit -m "Add Azure deployment workflow"
   git push origin main
   ```
4. Monitor deployment in GitHub **Actions** tab

### Option B: Deploy via Azure CLI (Manual)

1. Build locally:

   ```powershell
   npm run build
   ```

2. Deploy using zip:

   ```powershell
   # Create deployment package
   Compress-Archive -Path . -DestinationPath app.zip -Force

   # Deploy to Azure
   az webapp deployment source config-zip `
     --resource-group ai-recruitment-rg `
     --name ai-recruitment-agent-app `
     --src app.zip
   ```

### Option C: Deploy via Git Push (Kudu)

```powershell
# Get deployment credentials
az webapp deployment list-publishing-profiles `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app `
  --query "[0].publishUrl" `
  --output tsv

# Add Azure as remote and push
git remote add azure <deploymentUrl>
git push azure main
```

---

## Step 5: Verify Deployment

### 5.1 Check App Status

```powershell
az webapp show `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app `
  --query "state"
```

### 5.2 View Live App

Open: `https://ai-recruitment-agent-app.azurewebsites.net`

### 5.3 Stream Live Logs

```powershell
az webapp log tail `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app
```

### 5.4 Test Key Endpoints

```powershell
# Test homepage
curl https://ai-recruitment-agent-app.azurewebsites.net

# Test API route
curl -X POST https://ai-recruitment-agent-app.azurewebsites.net/api/ai-model `
  -H "Content-Type: application/json" `
  -d '{"job_position":"Engineer","job_description":"Test","duration":30,"type":"technical"}'
```

---

## Step 6: Monitoring & Troubleshooting

### Enable Application Insights

```powershell
$appInsightsName = "ai-recruitment-insights"

az monitor app-insights component create `
  --app $appInsightsName `
  --location $location `
  --resource-group $resourceGroup

# Link to Web App
$appInsightsId = az monitor app-insights component show `
  --app $appInsightsName `
  --resource-group $resourceGroup `
  --query "id" -o tsv

az webapp config appsettings set `
  --resource-group $resourceGroup `
  --name ai-recruitment-agent-app `
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<key-from-above>"
```

### Common Issues

**1. Build fails with "npm ERR! ERESOLVE unable to resolve dependency tree"**

- Solution: Add `legacy-peer-deps=true` to `.npmrc`
  ```
  legacy-peer-deps=true
  ```

**2. App shows "Application Error" or blank page**

- Check logs: `az webapp log tail --resource-group ai-recruitment-rg --name ai-recruitment-agent-app`
- Verify all env vars are set correctly

**3. API calls fail with 401/403**

- Ensure `OPENROUTER_API_KEY`, `VAPI_API_KEY` are correct
- Check Supabase CORS settings

**4. Google OAuth not working**

- Update `NEXT_PUBLIC_AUTH_REDIRECT_URL` in OAuth app settings on Google Cloud Console
- Add `https://ai-recruitment-agent-app.azurewebsites.net/auth/callback` as authorized redirect URI

---

## Step 7: Auto-Scaling (Optional)

For production, enable auto-scaling:

```powershell
az monitor autoscale create `
  --resource-group ai-recruitment-rg `
  --resource-name ai-recruitment-plan `
  --resource-type "Microsoft.Web/serverfarms" `
  --min-count 1 `
  --max-count 5 `
  --count 2 `
  --metric-trigger-metric-type "CpuPercentage" `
  --metric-trigger-metric-stat "Average" `
  --metric-trigger-time-grain "PT1M" `
  --metric-trigger-time-window "PT5M" `
  --metric-trigger-statistic "Average" `
  --metric-trigger-time-aggregation "Average" `
  --metric-trigger-operator "GreaterThan" `
  --metric-trigger-threshold 70 `
  --scale-action-direction "Increase" `
  --scale-action-type "ChangeCount" `
  --scale-action-value 1 `
  --scale-action-cooldown "PT5M"
```

---

## Cost Estimates

| Service              | SKU       | Monthly Cost |
| -------------------- | --------- | ------------ |
| App Service Plan     | B2        | ~$26         |
| Application Insights | Basic     | ~$2          |
| Data Transfer        | 100GB out | ~$10-20      |
| **Total**            | -         | **~$40-50**  |

---

## Rollback Deployment

If something goes wrong:

```powershell
# View deployment history
az webapp deployment list `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app

# Rollback to previous version
az webapp deployment slot swap `
  --resource-group ai-recruitment-rg `
  --name ai-recruitment-agent-app `
  --slot staging
```

---

## Next Steps

1. ✅ Create Azure resources (Step 1)
2. ✅ Configure environment variables (Step 2)
3. ✅ Set up GitHub Actions (Step 3)
4. ✅ Deploy app (Step 4)
5. ✅ Verify deployment (Step 5)
6. 📊 Enable monitoring (Step 6)
7. 🔄 Set up auto-scaling (Step 7)

**Need help?** Check [Azure App Service troubleshooting](https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-common-app-service-errors).
