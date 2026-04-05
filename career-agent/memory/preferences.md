# Job Search Preferences — Basman Abu Gazi
Last updated: 2026-04-06

## Target Roles
Product operations, AI operations, support/delivery leadership, technical operations — roles that combine operational excellence with AI/technology. Ideally where I can build systems, lead teams, and work with AI-driven products.
Also: AI Enabler, AI Evangelist, GTM AI, Solutions Architect, Technical Account Manager, Implementation Manager, Enablement Manager.

## Target Companies
- B2B SaaS companies, preferably mid-size to large
- Companies with AI products or strong AI adoption
- Israeli tech companies (but open to remote international)
- Companies of interest: monday.com, Gong, SimilarWeb, WalkMe, and similar scale

## Location
Tel Aviv area preferred. Open to remote or hybrid.

## Level
Manager, Lead, Director — not entry level, not pure IC.

## Key Strengths to Emphasize
- Built AI agents that automated 40%+ of support volume
- Cross-functional operations leadership (Support, Product, R&D)
- Enterprise B2B onboarding and implementation
- Trilingual: Hebrew, English, Arabic
- Blend of technical (AI/automation) and operational (process, team management)
- Identity: "Product Operations leader" — NEVER rename to Engineer/Developer/Analyst

## Deal Breakers
- Pure software engineering roles (developer, devops, QA, data engineer, frontend, backend, fullstack, MLOps)
- Junior roles
- Hardware/firmware/embedded roles
- CV layout MUST match the original template exactly — no text cut off, broken bullets, or cramped spacing

## Learned Patterns
- CV tailoring must be DIFFERENTIATED per job — Basman noticed when all CVs looked identical
- CV layout must not break — Google Docs replaceAllText destroys formatting if replacements differ in length
- CSM roles are OK in moderation (max 3 per run) but shouldn't dominate the pipeline
- "Technical Account Manager" and "Solutions Architect" are NOT CSM — they're high-priority roles
- Basman cares deeply about CV visual quality — a broken layout is a complete deal breaker ("?????????????")
- `base_resume_text` in DB must EXACTLY match the actual Google Doc template text — mismatch = broken CVs
- Length guard on replacements must be strict (±15%) to preserve Google Docs layout

## Explicit Requests
- CV tailoring prompt must be visible and editable in settings (stored in settings.prompts.cv_tailor)
- Daily agent run MUST happen autonomously without a Cowork session — "הרן עצמו זה חייב לקרות לבד"
- Basman wants to understand and control the AI logic, not just see results
- Add llm_config + prompts.cv_tailor management to Career Muse Settings UI (CONFIRMED "כןןןן", NOT YET BUILT)
- Main pipeline stays on Cerebras (fast), Claude Haiku only in async cv-tailor-async function
- Never change core identity — keep "Product Operations" in all CVs
