# Performance Log — Career Agent

## Session History

## 2026-04-06 (session 2) — CV Layout Fix + Test Run
- **Jobs reviewed**: 15 per run (2 test runs with v41)
- **CVs tailored**: 13/15 (87%) — up from 67% in previous session
- **Key changes**:
  1. CRITICAL FIX: Synced `base_resume_text` in DB to match actual Google Doc template ("Product Operations Strategist" version, not the old "AI Implementation Lead" version)
  2. Tightened length guard from ±60% to ±15% in both agent-run and cv-tailor-async
  3. Updated `settings.prompts.cv_tailor` to emphasize SAME LENGTH as non-negotiable rule
  4. Cleaned up stuck "running" agent_runs
  5. Deployed agent-run v41 + cv-tailor-async v3
- **CV differentiation verified**:
  - Cato Networks → security language (6 replacements)
  - Seeking Alpha → LLM/Multi-Agent terms (4 replacements)
  - Torq → PLG/enablement terms (4 replacements)
  - Align Technology → process automation terms (5 replacements)
- **Issues found**:
  - Browser viewport too small (611px) to visually verify Google Docs layout — Basman needs to check himself
  - The first trigger from net.http_post doesn't show up immediately in agent_runs — function runs in background after 5-second http timeout
  - Google Drive MCP can't access Basman's personal docs (error -32000)
- **STILL PENDING**:
  - Basman needs to visually verify CV layout in the generated Google Docs
  - Settings UI for llm_config + prompts management (confirmed "כןןןן" but not built)
  - cv-tailor-async trigger verification (fire-and-forget fetch may not execute)
- **Next session focus**:
  - Get Basman's feedback on CV layout quality
  - Build Settings UI for llm_config + prompts.cv_tailor
  - Verify cv-tailor-async actually processes the 2 remaining CVs
  - Monitor pg_cron daily run results

## 2026-04-06 — CV Tailoring Overhaul + Autonomous Daily Run
- **Jobs reviewed**: 15 per run (4 test runs during session)
- **CVs tailored**: improved from 3/15 (20%) → 10/15 (67%)
- **Key changes**:
  1. Rewrote CV tailoring prompt — forces JD keyword extraction before generating replacements
  2. Added length guards (±60%) to prevent Google Docs layout breaks
  3. Added min 15-char find length to prevent accidental matches
  4. Stored full CV tailoring prompt in `settings.prompts.cv_tailor` — user-visible and editable
  5. Fixed pg_cron daily job — was using wrong function (`extensions.http_post` → `net.http_post`)
  6. Created `cv-tailor-async` edge function for async retry with Claude
  7. Set `llm_config.resume_tailoring` to use Claude Haiku for better accuracy
  8. Deployed v40 of agent-run, v1 of cv-tailor-async
- **Issues found**:
  - Subagent deployment often replaces code with stubs — must verify after deploy
  - `net.http_post` has 5-second timeout but function continues — check agent_runs table for results
  - Cerebras/Qwen struggles with exact substring quoting (main reason for failed CV replacements)

## 2026-04-05 — Multi-Provider AI Routing
- **Summary**: Built multi-provider routing (Cerebras/Anthropic/OpenAI) in the edge function
- **CVs tailored**: 7/15 with Cerebras (v35)
- **Key changes**: Added `llm_config` JSONB field, provider-specific API calls, Anthropic Messages API adapter
- **Issue**: Claude Haiku causes edge function timeout (150s limit). Solution: async separation.

## 2026-04-02 — Plugin Creation
- **Summary**: Created the career-agent plugin architecture
- **Components**: 3 skills (career-bootstrap, job-pipeline, self-review), memory files, reference docs
- **Architecture**: Claude (Cowork) as agent brain, Career Muse as data layer + dashboard

## Metrics
- Total jobs reviewed: ~90 (6 runs × 15)
- CV success rate: 20% → 67% → 87% (improved across sessions)
- Total approved: TBD (user hasn't reviewed latest batch yet)
- Total applied: 0
- Total interviews: 0

## Key Learnings
- Google Docs `replaceAllText` breaks bullet formatting if replacements are significantly longer/shorter
- Cerebras/Qwen is fast but poor at exact text quoting — Claude is much better
- The cv_tailor prompt must explicitly force JD keyword extraction BEFORE generating replacements
- Prompt should be stored in settings, not hardcoded — user wants to see and control the logic
- pg_cron + `net.http_post` is the right pattern for autonomous daily runs
- `verify_jwt: false` is needed for edge functions called from pg_net
- **CRITICAL**: `base_resume_text` must exactly match the Google Doc template — if they diverge, find/replace pairs target nonexistent text and layout breaks
- Length guard ±15% is the sweet spot — strict enough to prevent layout breaks, loose enough for 87% hit rate
- Google Docs canvas rendering makes visual verification via browser automation nearly impossible

## Technical Reference
- **Supabase project**: ztqngvwdaxwbnobsgyuw
- **User ID**: bd4e2024-3ad1-4f90-a72d-635abf48e665
- **Edge functions**: agent-run (v41), cv-tailor-async (v3)
- **pg_cron**: job "career-muse-daily-run", schedule "0 7 * * *" (10:00 Israel)
- **Deploy workflow**: edit code locally → deploy via Supabase MCP `deploy_edge_function` (NEVER subagents for code, they stub it)
- **llm_config**: default=Cerebras Qwen, resume_tailoring=Cerebras Qwen (main pipeline), Claude Haiku forced in cv-tailor-async only
- **CV tailor prompt**: stored in `settings.prompts.cv_tailor`
- **Anthropic API key**: saved in `settings.anthropic_api_key`
- **Google Doc template**: `1BunocWZ2lmoxc9vRJyvzytW7xtyx9r3AzoXR5B1-YcM`
- **base_resume_text**: Must match the Google Doc exactly — "Product Operations Strategist" version
