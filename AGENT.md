# Agent Checklist & PR Guidance

This file contains a compact checklist for AI coding agents and maintainers when making changes in this repository.

Purpose: short, actionable items to ensure safe changes to AI prompts, env vars, and server routes.

Checklist (pre-PR)

- **Update prompts**: If you change interview or feedback wording, edit `services/Constants.jsx`. Use `{{placeholder}}` tokens and keep them consistent with routes.

- **Server routes**: Server-side AI calls live under `app/api/*`. Update `app/api/ai-model/route.jsx` and `app/api/ai-feedback/route.jsx` when changing providers or models.

- **Env vars**: Validate env names in `services/Constants.jsx`. Server-only secrets must be non-`NEXT_PUBLIC_*` (e.g., `OPENROUTER_API_KEY`, `VAPI_API_KEY`).

- **Local test**: Run the local dev server (`npm run dev`) and use the test scripts in `scripts/` to exercise API endpoints before opening a PR.

- **Lint**: Run `npm run lint` and `npm run format` to keep style consistent. Only run `npm run lint:all` if you intend to fix many files.

PR review checklist

- **Prompts**: Confirm prompt JSON format if route expects JSON responses.

- **DB table envs**: Ensure `NEXT_PUBLIC_*` table envs used on client are safe to expose.

- **No secrets in UI**: Verify no server secrets are exported to client bundles.

- **Add migrations**: If database schema changes are needed, include SQL snippets or a Supabase migration.

How to test AI endpoints locally

- Start the dev server: `npm run dev`

- Run the test scripts (examples):
  - `npm run test:ai-model`

  - `npm run test:ai-feedback`

If something is unclear or risky, ask a human reviewer.
