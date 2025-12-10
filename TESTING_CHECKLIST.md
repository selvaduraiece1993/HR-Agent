# Testing & Verification Checklist

## Pre-Merge Validation

This document provides step-by-step instructions to validate all changes before merging.

### 1. Environment Setup

```bash
cd c:\Projects\AI-Recruitment-Agent
npm install
```

Verify no install errors.

### 2. Linting Validation

```bash
npm run lint:all
```

**Expected Output**:

```
✖ 20 problems (0 errors, 20 warnings)
exit code 0
```

**⚠️ If you see errors:**

- Run `npm run lint` (Next.js linter) for details
- Check file modifications for syntax errors
- Revert and re-apply patches carefully

### 3. Build Test

```bash
npm run build
```

**Expected Output**:

- No build errors
- All pages compile successfully
- Ready for production deployment

### 4. Dev Server Smoke Test

```bash
npm run dev
```

In browser, navigate to:

- `http://localhost:3000` — Home page
- `http://localhost:3000/login` — Login page (Image fixed)
- `http://localhost:3000/register` — Register page (Image fixed)
- `http://localhost:3000/admin` — Admin dashboard (Link nav fixed)

**Expected**: All pages load without console errors.

### 5. AI Endpoint Testing

**Prerequisites**:

```bash
# Set environment variables (Windows PowerShell):
$env:OPENROUTER_API_KEY = "sk-..."
$env:VAPI_API_KEY = "..."  # Optional
```

**Start dev server in one terminal**:

```bash
npm run dev
```

**In another terminal, run smoke tests**:

```bash
npm run test:ai-model
npm run test:ai-feedback
```

**Expected Output**:

```json
{
  "success": true,
  "questions": [
    { "question": "...", "answer": "..." },
    ...
  ]
}
```

**If tests fail:**

- Check API key is valid
- Verify dev server is running on port 3000
- Check network connectivity
- Review console logs in dev server terminal

### 6. Code Review Checklist

For each modified file:

- [ ] No unused variables remain (grep for `// eslint-disable`)
- [ ] No commented-out code blocks (except legitimate TODOs)
- [ ] Async/await properly handled (no synchronous setState)
- [ ] `useCallback` functions have correct deps
- [ ] `useEffect` deps arrays complete
- [ ] Next.js Image/Link used instead of `<img>`/`<a>`

### 7. Behavior Regression Tests

#### Authentication Flow

- [ ] Login with email/password works
- [ ] Google OAuth works (if configured)
- [ ] Redirect to recruiter/candidate dashboard based on role
- [ ] Admin auth checks work

#### Interview Creation

- [ ] Recruiter can create interview
- [ ] Questions generate via AI endpoint
- [ ] Interview saved to Supabase

#### Interview Participation

- [ ] Candidate can join interview link
- [ ] Interview timer starts
- [ ] AI feedback generated after completion

#### Admin Panel

- [ ] Admin can access `/admin`
- [ ] Dashboard loads user/interview lists
- [ ] Navigation links work (Link component)
- [ ] Ban user functionality works

#### Profile Pages

- [ ] Recruiter profile loads and saves
- [ ] Candidate profile loads and saves
- [ ] CV upload works

### 8. Performance Validation

```bash
npm run dev

# In browser DevTools:
# 1. Open Lighthouse tab
# 2. Click "Analyze page load"
# 3. Check Performance score ≥ 80
```

**Key metrics**:

- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1

### 9. Accessibility Check

```bash
# In browser DevTools, Lighthouse:
# 1. Check Accessibility score ≥ 90
# 2. Look for any color contrast warnings
# 3. Verify alt text on all images (from Image component)
```

### 10. Cross-Browser Testing

Test on:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

**Expected**: No broken layouts or console errors.

---

## If Issues Are Found

### ESLint Errors

```bash
git diff HEAD~1 app/<file>
# Review changes
git checkout app/<file>  # Revert if needed
```

### Build Failures

```bash
npm run build -- --debug
# Check error messages
```

### Runtime Errors

```bash
# Check browser DevTools Console
# Check terminal output from `npm run dev`
# Search for `console.error()` entries
```

---

## Sign-Off

After completing all checks:

- [ ] All tests pass (0 errors)
- [ ] No regressions observed
- [ ] Code review complete
- [ ] Ready for merge

**Reviewer**: ********\_\_\_\_********  
**Date**: ********\_\_\_\_********  
**Notes**: ********\_\_\_\_********

---

## Quick Reference: Files Changed

**Core Changes**:

- `app/provider.jsx` — Auth logic refactored to async IIFE
- `app/admin/layout.js` — Admin auth + navigation links
- `app/api/ai-model/route.jsx` — Vendor selection + error logging
- `app/api/ai-feedback/route.jsx` — Vendor selection
- `lib/llm.js` — Unified LLM wrapper

**UI Updates**:

- `app/login/page.jsx` — img → Image
- `app/register/page.jsx` — img → Image
- `app/page.js` — img → Image (client logos)

**Documentation**:

- `.github/copilot-instructions.md` — Agent guidance
- `AGENT.md` — PR checklist
- `PR_SUMMARY.md` — This PR summary

**Infrastructure**:

- `scripts/test_ai_model.js` — AI endpoint smoke test
- `scripts/test_ai_feedback.js` — AI endpoint smoke test
- `lib/getModel.js` — Model selection logic
- `.vscode/tasks.json` — VS Code tasks

---

**Last Updated**: Turn 10+  
**ESLint Status**: 0 errors, 20 warnings (advisory only)  
**Build Status**: ✅ Ready
