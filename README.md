# Visitt Agent Plugin v0.4.0

AI automation agent for Visitt property management (app.visitt.io / staging.visitt.io).

## What it does

Automates property management tasks in Visitt via GraphQL API and browser automation:

- **Building deployment** — Parse Excel implementation sheets, visualize building structures, deploy buildings with floors, spaces, and equipment via API
- **Automation management** — Create, update, and deploy work order automations across multiple properties with visual preview
- **Bulk operations** — Apply configurations (categories, automations, settings) across multiple properties simultaneously
- **System learning** — Methodology for approaching and mastering any new SaaS/web system
- **Self-optimization** — Learns from each session and improves workflow efficiency over time

## Skills

| Skill | Description |
|-------|-------------|
| `visitt-api` | GraphQL API patterns for all Visitt entities — buildings, floors, spaces, equipment, tenants, automations |
| `visitt-workflow` | Browser automation best practices, UI patterns, bulk configuration workflows |
| `system-learning` | General methodology for learning new SaaS platforms — fetch interception, API discovery, automation escalation |
| `self-review` | Continuous improvement loop — analyzes performance and updates skills after each task |

## Key Workflows

### Building Deployment
Excel → Parse → React JSX visualization → User approval → API deploy

### Automation Deployment
Discussion → Automation Builder (React JSX) → User review/edit → Approval → API deploy to N properties

### Visual Preview (Mandatory)
Every deployment requires a visual preview step. No exceptions.

### Learning a New System
Reconnaissance → Exploration → Automation Escalation → Problem Solving → Self-Updating

## Changelog

### v0.4.0 (2026-03-19)
- **Added Automation Builder visual template** (automation-builder-template.jsx) — locked React JSX template for visual automation previews before deployment
- Added SessionStart hook (visitt-context.md) — working rules loaded at every session
- Incorporated all automation learnings from business session: triggers, actions, bulk deploy patterns, category conflict handling
- Full sync with latest .skills versions + CLAUDE.md knowledge

### v0.3.0 (2026-03-19)
- Added `system-learning` skill — general methodology for mastering any SaaS platform
- Synced all skills to latest .skills versions
- Updated plugin metadata and README

### v0.2.0
- Added automation management (automations-api.md reference)
- Updated visitt-api with automation mutations and queries
- Updated visitt-workflow with multi-property automation deployment

### v0.1.0
- Initial release with visitt-api, visitt-workflow, self-review

## Requirements

- Logged into Visitt staging or production in the browser
- Chrome browser with Claude in Chrome extension for API calls
