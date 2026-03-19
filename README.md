# Visitt Agent Plugin

AI automation agent for the Visitt property management platform. Automates building deployment, space management, and bulk operations.

## What This Plugin Does

- **Building Deployment**: Parse Excel implementation sheets → visualize building structure → deploy via GraphQL API
- **Browser Automation**: Automate repetitive UI tasks (settings, categories, configurations) across multiple properties
- **Self-Optimization**: Continuously learns from each session and improves its own workflow

## Components

### Skills

| Skill | Purpose |
|-------|---------|
| `visitt-workflow` | Browser-based automation, UI patterns, deployment flow |
| `visitt-api` | GraphQL API reference — all mutations, queries, and patterns |
| `self-review` | Continuous optimization loop — reviews and improves after every task |

### Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `visitt-context.md` | SessionStart | Loads working rules at the start of every session |

## Setup

1. Install this plugin in Claude Cowork
2. Log into Visitt (staging.visitt.io or app.visitt.io) in the browser
3. Start working — the agent knows the API, the UI patterns, and the deployment flow

No API keys or environment variables required — the plugin uses browser session cookies for authentication.

## Key Workflows

### Deploy a Building from Excel
1. Upload an implementation sheet (Excel)
2. The agent parses floors, spaces, equipment
3. A visual preview is shown for approval
4. After approval, deployment runs via API (~10-20 seconds)

### Bulk Property Configuration
1. Tell the agent what settings to update
2. It learns the pattern from 2-3 manual repetitions
3. Switches to JavaScript automation for the rest

## Important Rules

- **Always visualize before deploy** — No exceptions
- **dummy_id_N format** — Floor IDs must use this exact format
- **Self-review runs automatically** — After every task

## Environments

| Environment | URL | Concurrency | Delay |
|-------------|-----|-------------|-------|
| Staging | staging.visitt.io | 5 | 400ms |
| Production | app.visitt.io | 3 | 800ms |
