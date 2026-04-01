# Visitt Agent Plugin

An AI agent system for the Visitt property management platform. This plugin turns Claude into a knowledgeable Visitt operator that can create buildings, manage inspections, deploy templates, and automate repetitive platform tasks — without the user needing to know anything about APIs, GraphQL, or prompt engineering.

## Architecture Overview

The system has two parts that work together:

1. **This Plugin** (static, installed on each Claude account) — the "ignition key" that tells Claude how to bootstrap itself
2. **A GitHub Repository** (dynamic, shared across all users) — the "brain" that holds all accumulated knowledge and gets smarter over time

```
┌──────────────────────────────────────────────────────────┐
│                    USER'S SESSION                         │
│                                                          │
│  User types: "create inspections for Hiffman"            │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────┐                        │
│  │  PLUGIN (this file)          │                        │
│  │  visitt-bootstrap/SKILL.md   │  ← triggers on any    │
│  │                              │    Visitt-related task  │
│  └──────────┬───────────────────┘                        │
│             │                                            │
│             ▼                                            │
│  ┌──────────────────────────────┐                        │
│  │  git clone (GitHub repo)     │  ← pulls latest       │
│  │  basmanab88-lab/visitt-agent │    knowledge           │
│  └──────────┬───────────────────┘                        │
│             │                                            │
│             ▼                                            │
│  ┌──────────────────────────────┐                        │
│  │  ROUTING.md                  │  ← finds the right    │
│  │  "inspections" → visitt-api  │    skill + section     │
│  │  § createAssignments...      │                        │
│  └──────────┬───────────────────┘                        │
│             │                                            │
│             ▼                                            │
│  ┌──────────────────────────────┐                        │
│  │  SKILL FILE                  │  ← reads the exact    │
│  │  visitt-api/SKILL.md         │    mutation, format,   │
│  │  § createAssignments...      │    and gotchas         │
│  └──────────┬───────────────────┘                        │
│             │                                            │
│             ▼                                            │
│  ┌──────────────────────────────┐                        │
│  │  EXECUTE                     │  ← sends GraphQL,     │
│  │  GraphQL calls via browser   │    navigates UI, etc.  │
│  └──────────┬───────────────────┘                        │
│             │                                            │
│             ▼                                            │
│  ┌──────────────────────────────┐                        │
│  │  SELF-REVIEW                 │  ← saves new          │
│  │  Update skills + ROUTING.md  │    knowledge to repo   │
│  │  git push                    │                        │
│  └──────────────────────────────┘                        │
│                                                          │
│  Next session (ANY user) gets the updated knowledge      │
└──────────────────────────────────────────────────────────┘
```

## Key Concepts

### The Plugin (Static Layer)

The plugin contains one skill: `visitt-bootstrap`. This skill:
- Triggers automatically on any Visitt-related user request
- Clones the GitHub repo to get the latest knowledge
- Reads ROUTING.md to find the right skill for the task
- Executes the task using the knowledge from the skills
- Runs self-review after each completed task to save learnings

The plugin itself rarely changes. It's the "ignition key" — it knows HOW to start, but the actual knowledge lives in GitHub.

### The GitHub Repo (Dynamic Layer)

Repository: `github.com/basmanab88-lab/visitt-agent`

This is where all the accumulated knowledge lives:

```
visitt-agent/
├── ROUTING.md                    ← Task routing brain
├── skills/
│   ├── visitt-api/
│   │   ├── SKILL.md              ← GraphQL mutations, queries, formats
│   │   └── LOCKED.md             ← Protected sections list
│   ├── visitt-workflow/
│   │   ├── SKILL.md              ← UI patterns, browser automation
│   │   └── LOCKED.md
│   ├── self-review/
│   │   └── SKILL.md              ← Self-review protocol
│   ├── system-learning/
│   │   └── SKILL.md              ← Cross-system techniques
│   └── [future skills]/          ← Created automatically when needed
├── memory/
│   ├── performance-log.md        ← Speed benchmarks
│   └── optimization-log.md       ← Session audit trail
├── overrides/                    ← Personal overrides (gitignored)
│   └── .gitkeep
└── .gitignore
```

### ROUTING.md (The Brain)

A mapping table from user intent → skill file → specific section. Example:

| Intent | Skill | Section | Notes |
|--------|-------|---------|-------|
| "unpause inspections" | visitt-api | §updateAssignmentsIsPaused | Batch call |
| "deploy a building" | visitt-api + visitt-workflow | §insertBuilding | Must visualize first |
| "Hiffman rent roll" | visitt-api | §createAssignmentsFromTemplates | templateId: 6971c389... |

When a user's request doesn't match any route, Claude works without a skill, discovers what's needed, and adds a new route during self-review.

### Self-Review (The Learning Loop)

After every successfully completed task, Claude:

1. Checks if it learned anything new (mutations, gotchas, patterns)
2. Finds the right skill file to save it in
3. Checks LOCKED.md and `<!-- LOCKED -->` markers before editing
4. Follows the Write Protocol (pull → read → check duplicates → append → push)
5. Updates ROUTING.md if a new intent pattern was discovered

This means the system gets smarter with every session, regardless of which team member ran it.

### Immutability System (LOCKED)

Some parts of the skills are design decisions that shouldn't be changed by automated self-review. These are protected with two mechanisms:

**In-file markers:**
```markdown
<!-- LOCKED: DO NOT MODIFY — Owner: Basman -->
## Building Visualization
[protected content here]
<!-- END LOCKED -->
```

**Per-skill LOCKED.md files:**
```markdown
# Protected Content
- "Building Visualization" section
- references/building-viz.md
```

Self-review will never modify locked content. Instead, it creates "Suggested Enhancement" sections that the owner can review and merge manually.

Only the owner (basman@visitt.io) can modify locked sections by explicitly requesting the change in a session.

### Personal Overrides

Team members can have local customizations that never get pushed to the shared repo:

```
overrides/
└── visitt-workflow/
    └── visualization.md    ← personal preference, local only
```

The `overrides/` directory is gitignored. Override files are loaded AFTER main skill files and take precedence for that session only.

Use case: A team member prefers table view instead of tree view for building visualization. They ask Claude to "change the visualization for me only," and Claude creates a local override. The shared repo's tree visualization stays untouched.

### Autonomous Skill Creation

When Claude encounters a completely new task type (no match in ROUTING.md, no relevant existing skill), it:

1. Proceeds without a skill, using discovery techniques (fetch interceptor, UI exploration)
2. Completes the task
3. During self-review, decides:
   - Does this belong in an existing skill? → Add a section
   - Is this a new domain? → Create a new skill directory + SKILL.md
4. Adds a new row to ROUTING.md
5. Pushes to GitHub

New skills are only created when:
- The task was completed successfully (no unverified knowledge)
- The domain is genuinely different from existing skills
- There's enough knowledge to write useful instructions

## Environment

| Environment | URL | When to use |
|-------------|-----|-------------|
| Staging | staging.visitt.io | Testing, development, new features |
| Production | app.visitt.io | Real client work |

**Default: Always ask the user which environment.** Never assume production.

## Installation

### For a single user (current setup)

1. Download the `.plugin` file
2. In Claude Desktop → Settings → Plugins → Install
3. The plugin activates automatically on any Visitt-related request

### For a team (future)

1. Team admin uploads the `.plugin` file in Claude Teams admin settings
2. All team members get it automatically
3. Each member's sessions bootstrap from the shared GitHub repo

## GitHub Token

The plugin needs a GitHub personal access token with read/write access to the `basmanab88-lab/visitt-agent` repository. The token is referenced in the bootstrap skill and should be configured per-environment.

## Write Protocol

To prevent concurrent sessions from overwriting each other's changes:

1. `git pull --rebase` before any edits
2. Read the target file to check current content
3. Search for duplicates before adding
4. Append only — never delete or rewrite existing content
5. `git pull --rebase` again before push
6. `git push`

If there's a merge conflict: keep BOTH versions, add a date comment, never delete either side.

## FAQ

**Q: What if the GitHub token expires?**
A: The bootstrap skill falls back to reading raw files from GitHub via the browser. The session will work, but self-review won't be able to push updates.

**Q: What if two sessions push at the same time?**
A: The Write Protocol includes `git pull --rebase` before every push. If there's a conflict, both versions are kept.

**Q: Can a team member break something?**
A: LOCKED sections protect critical design decisions. The append-only write protocol means nothing gets deleted. Worst case, a bad entry gets superseded by a correct one later.

**Q: How do I see what changed?**
A: Check `memory/optimization-log.md` for session summaries, or use `git log` on the repo for full history.

**Q: How do I add a new locked section?**
A: Add `<!-- LOCKED: DO NOT MODIFY — Owner: Basman -->` and `<!-- END LOCKED -->` markers in the skill file, then add the section name to that skill's `LOCKED.md`.
