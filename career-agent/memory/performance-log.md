# Performance Log — Career Agent

## Session History

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
- **Next session focus**:
  - Check if Claude Haiku produces better hit rate on CV replacements
  - Add llm_config + prompts management to Career Muse Settings UI
  - Monitor pg_cron daily run results

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
- Total jobs reviewed: ~60 (4 runs × 15)
- CV success rate: 20% → 67% (improved this session)
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

## Technical Reference
- **Supabase project**: ztqngvwdaxwbnobsgyuw
- **User ID**: bd4e2024-3ad1-4f90-a72d-635abf48e665
- **Edge functions**: agent-run (v40), cv-tailor-async (v1)
- **pg_cron**: job "career-muse-daily-run", schedule "0 7 * * *" (10:00 Israel)
- **Deploy workflow**: edit code → push to GitHub → deploy via Supabase MCP `deploy_edge_function` (NEVER subagents for code, they stub it)
- **llm_config**: default=Cerebras Qwen, resume_tailoring=Claude Haiku
- **CV tailor prompt**: stored in `settings.prompts.cv_tailor`
- **Anthropic API key**: saved in `settings.anthropic_api_key`
