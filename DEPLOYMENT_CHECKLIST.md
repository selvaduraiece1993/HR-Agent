# Azure Deployment Checklist & Summary

## 📋 What Has Been Set Up

✅ **Configuration Files Created:**
- `.github/workflows/azure-deploy.yml` - GitHub Actions CI/CD pipeline
- `.npmrc` - Node.js peer dependency configuration
- `AZURE_DEPLOYMENT_GUIDE.md` - Detailed deployment reference
- `AZURE_QUICK_START.md` - Step-by-step quick start guide
- `scripts/deploy-to-azure.ps1` - Automated setup script
- `scripts/quick-deploy.ps1` - Quick deployment helper script

---

## 🚀 Deployment Path (Choose One)

### Path 1: Manual ZIP Deployment (Easiest - 20 minutes)

```powershell
# 1. Login to Azure (one-time setup)
az login

# 2. Create Azure Resources
$resourceGroup = "ai-recruitment-rg"
$location = "eastus"
$appServicePlan = "ai-recruitment-plan"
$webAppName = "ai-recruitment-agent-app-12345"  # Use unique name

# Create group
az group create --name $resourceGroup --location $location

# Create plan
az appservice plan create `
  --name $appServicePlan `
  --resource-group $resourceGroup `
  --sku B2 `
  --is-linux

# Create web app
az webapp create `
  --resource-group $resourceGroup `
  --plan $appServicePlan `
  --name $webAppName `
  --runtime "NODE|20-lts"

# 3. Set Environment Variables
az webapp config appsettings set `
  --resource-group $resourceGroup `
  --name $webAppName `
  --settings `
    NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL" `
    NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY" `
    NEXT_PUBLIC_USERS_TABLE_NAME="users" `
    NEXT_PUBLIC_INTERVIEWS_TABLE_NAME="interviews" `
    NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME="interview_results" `
    OPENROUTER_API_KEY="YOUR_KEY" `
    VAPI_API_KEY="YOUR_KEY" `
    GOOGLE_CLIENT_ID="YOUR_ID" `
    GOOGLE_CLIENT_SECRET="YOUR_SECRET" `
    NEXT_PUBLIC_AUTH_REDIRECT_URL="https://$webAppName.azurewebsites.net" `
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    WEBSITE_NODE_DEFAULT_VERSION="20-lts"

# 4. Build & Deploy
npm install
npm run build
Compress-Archive -Path . -DestinationPath app.zip -Force
az webapp deployment source config-zip `
  --resource-group $resourceGroup `
  --name $webAppName `
  --src app.zip

# 5. Monitor
az webapp log tail --resource-group $resourceGroup --name $webAppName

# Done! App available at: https://$webAppName.azurewebsites.net
```

### Path 2: GitHub Actions (Best for Continuous Deployment)

**Requirements:**
1. Service Principal for GitHub Actions
2. GitHub Secrets configured
3. `.github/workflows/azure-deploy.yml` (already created)

**Steps:**
```powershell
# 1. Create Service Principal
$subscriptionId = az account show --query id -o tsv
az ad sp create-for-rbac `
  --name "github-deployment" `
  --role contributor `
  --scopes "/subscriptions/$subscriptionId/resourceGroups/ai-recruitment-rg"

# Copy the JSON output
# 2. Go to GitHub > Settings > Secrets > Actions > New repository secret
#    Name: AZURE_CREDENTIALS
#    Value: (paste the JSON from above)

# 3. Also add these secrets:
#    SUPABASE_URL
#    SUPABASE_ANON_KEY
#    USERS_TABLE_NAME
#    INTERVIEWS_TABLE_NAME
#    INTERVIEW_RESULTS_TABLE_NAME
#    OPENROUTER_API_KEY
#    VAPI_API_KEY
#    GOOGLE_CLIENT_ID
#    GOOGLE_CLIENT_SECRET

# 4. Push to main to trigger deployment
git add .
git commit -m "Add Azure deployment"
git push origin main

# 5. Monitor in GitHub > Actions tab
```

---

## 🔧 Prerequisites Checklist

Before starting deployment, verify:

- [ ] Azure subscription created and active
- [ ] Azure CLI installed: `az --version`
- [ ] Node.js 20+ installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] Git configured: `git config --global user.name "Your Name"`
- [ ] All environment variables available:
  - [ ] Supabase URL
  - [ ] Supabase Anon Key
  - [ ] OpenRouter API Key
  - [ ] VAPI API Key
  - [ ] Google Client ID & Secret
  - [ ] (Optional) Azure Storage for additional features

---

## 📊 Cost Breakdown

**Monthly Costs (USD):**

| Resource | SKU | Cost |
|----------|-----|------|
| App Service Plan | B2 | $26 |
| Application Insights | Basic tier | $2 |
| Data transfer (100GB out) | - | $15 |
| **Total** | | **$43** |

**Cost Reduction Tips:**
- Use **B1** ($13/month) for staging/development
- Disable Application Insights for staging
- Use Azure Reserved Instances for 1-3 year commitments (30-40% savings)

---

## 🔐 Security Best Practices

1. **Environment Variables:**
   - Never commit secrets to git
   - Use Azure Key Vault for production
   - Rotate API keys regularly

2. **OAuth Redirect URIs:**
   - Update Google Cloud Console:
     ```
     https://<app-name>.azurewebsites.net/auth/callback
     ```
   - Update GitHub OAuth (if used)
   - Update any other OAuth providers

3. **CORS Settings:**
   - Configure in Supabase: allow `https://<app-name>.azurewebsites.net`
   - Configure in API services (OpenRouter, VAPI)

4. **SSL/TLS:**
   - Automatically provided by Azure App Service
   - Custom domain can be added for production

---

## 📈 Monitoring & Logs

**View Live Logs:**
```powershell
az webapp log tail --resource-group ai-recruitment-rg --name ai-recruitment-agent-app-12345 --n 50
```

**View Last 100 Lines:**
```powershell
az webapp log tail --resource-group ai-recruitment-rg --name ai-recruitment-agent-app-12345 --n 100
```

**Enable Application Insights:**
```powershell
az monitor app-insights component create `
  --app ai-recruitment-insights `
  --location eastus `
  --resource-group ai-recruitment-rg
```

**Common Log Patterns:**
- `npm ERR!` - Dependency or build issue
- `Error: ENOENT` - Missing file
- `FATAL ERROR: CALL_AND_RETRY_LAST` - Out of memory
- `503 Service Unavailable` - App crashed or restarting

---

## 🐛 Troubleshooting Quick Guide

| Issue | Solution |
|-------|----------|
| **"npm ERR! ERESOLVE"** | Already fixed with `.npmrc` |
| **Build timeout** | Use B3 SKU instead of B2 |
| **App shows "Application Error"** | Check logs: `az webapp log tail ...` |
| **401/403 API errors** | Verify API keys in app settings |
| **Deployment fails** | Clear npm cache: `npm cache clean --force` |
| **OAuth not working** | Update redirect URI in OAuth provider settings |
| **Video upload fails** | Check Supabase storage bucket permissions |
| **App won't start** | Check if PORT env var is set (Azure uses dynamic port) |

---

## 📝 Post-Deployment Tasks

After successful deployment:

1. **Test Core Features:**
   - [ ] User login (both OAuth and email)
   - [ ] Interview creation
   - [ ] Interview question generation
   - [ ] Video recording & upload
   - [ ] Feedback generation
   - [ ] User profile updates

2. **Performance Testing:**
   - [ ] Test with multiple concurrent users
   - [ ] Monitor API response times
   - [ ] Check database query performance

3. **Security Testing:**
   - [ ] Test CORS settings
   - [ ] Verify API keys are not exposed
   - [ ] Test unauthorized access attempts

4. **Production Setup:**
   - [ ] Configure custom domain
   - [ ] Set up email notifications for errors
   - [ ] Create backup strategy for database
   - [ ] Set up uptime monitoring

---

## 🚨 Emergency Commands

**Restart App:**
```powershell
az webapp restart --resource-group ai-recruitment-rg --name ai-recruitment-agent-app-12345
```

**Stop App (to save costs):**
```powershell
az webapp stop --resource-group ai-recruitment-rg --name ai-recruitment-agent-app-12345
```

**Start App:**
```powershell
az webapp start --resource-group ai-recruitment-rg --name ai-recruitment-agent-app-12345
```

**Delete Everything (cleanup):**
```powershell
az group delete --name ai-recruitment-rg --yes --no-wait
```

---

## 📚 Additional Resources

- [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment/vercel)
- [Node.js in Azure](https://learn.microsoft.com/en-us/azure/developer/nodejs/)
- [Supabase Hosting Guide](https://supabase.com/docs/guides/hosting/overview)

---

## ❓ Support

For issues, check:
1. `AZURE_DEPLOYMENT_GUIDE.md` - Detailed reference
2. `AZURE_QUICK_START.md` - Quick reference
3. GitHub Actions logs - Check workflow run history
4. Azure Portal - Check resource status and logs

---

**Ready to deploy?** Start with Path 1 (Manual ZIP) for fastest results, then migrate to Path 2 (GitHub Actions) for continuous deployment.
