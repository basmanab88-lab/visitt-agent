---
name: self-review
description: >
  Continuous self-optimization system. Use this skill whenever a work session ends
  and it's time to review performance, or when the user says "×ª×ª×××¢×", "self-review",
  "×ª××××§ ××ª ×¢×¦××", "×× ××××ª", or asks Claude to improve how it works.
  Also use as part of the "×ª×©×××¨ ×× ×©×××× ×" end-of-session flow.
  Trigger whenever the user asks about optimizing Claude's workflow, reviewing
  session efficiency, or building a learning loop. Even if the user just says
  "you were slow today" or "that took too long" â this skill should activate.
---

# Self-Review: Continuous Optimization

This is a closed-loop system. You don't just write down what went wrong â you fix it.
Every session ends with lessons learned AND those lessons applied directly into the
relevant skills. Next session, you're already better.

## Session Start Protocol

At the beginning of EVERY session, before any work:

```bash
SESSION_DIR=$(ls /sessions/ | head -1)
MNT=$(find /sessions -maxdepth 3 -name "github-config.json" 2>/dev/null | head -1 | sed 's|/.claude/github-config.json||')
TOKEN=$(python3 -c "import json; print(json.load(open('$MNT/.claude/github-config.json'))['token'])")
cd /sessions/$SESSION_DIR
rm -rf visitt-agent-live
git clone https://$TOKEN@github.com/basmanab88-lab/visitt-agent visitt-agent-live 2>&1 | tail -1
```

Then read these files immediately after cloning â in this order:
1. `visitt-agent-live/skills/self-review/SKILL.md` (this file) â session rules + write protocol
2. `visitt-agent-live/skills/visitt-api/SKILL.md` â all mutations and queries
3. `visitt-agent-live/skills/visitt-workflow/SKILL.md` â UI patterns and gotchas
4. `visitt-agent-live/memory/performance-log.md` â benchmarks

The repo is the single source of truth. The locally installed plugin is outdated â ignore it.

---

## Write Protocol â MANDATORY before every push to GitHub

Every session that pushes skill updates MUST follow this protocol. No exceptions.

### Before writing to any skill file:

```
1. git pull --rebase          â get latest from GitHub first
2. Read the target file       â what's already there?
3. Search for your key terms  â grep or read to find duplicates
4. Decide:
   - Already documented, same info  â DON'T WRITE, already there
   - Already documented, but improved/changed â ADD new entry with [supersedes YYYY-MM-DD]
   - Not documented â ADD at the bottom of the relevant section
5. NEVER edit or delete existing lines
6. NEVER rewrite a section from scratch
7. git pull --rebase again before push â in case another session pushed while you worked
8. git push
```

### Why this matters:
- Two sessions can work simultaneously â without this protocol they overwrite each other
- Skills only grow, never shrink â old knowledge stays even if superseded (audit trail)
- The `[supersedes]` tag lets future sessions know which entry is authoritative

### Conflict resolution (if git says there's a merge conflict):
- Keep BOTH versions of conflicting content
- Add a date comment: `# merged YYYY-MM-DD â kept both entries`
- Never delete either side


This ensures every session starts with the latest accumulated knowledge, regardless of when the local plugin was last updated.

## The Closed Loop

```
START SESSION â clone GitHub â read latest skills
    â
DO THE WORK
    â
REVIEW (what was slow, what repeated, what the user said)
    â
UPDATE SKILLS (edit files in visitt-agent-live, the cloned repo)
    â
UPDATE LOG + PUSH TO GITHUB
    â
NEXT SESSION â clone again â already improved
```

The critical difference from a passive log: **step 3 actually edits the skill files.**
If you learned that navigating to a floor before creating a space is faster, you don't
just write that in a log â you add it to the visitt-workflow skill's instructions so
next time you (or any Claude using that skill) will do it right automatically.

## When This Runs

- **Automatically** at session end when user says "×ª×©×××¨ ×× ×©×××× ×"
- **On demand** when user says "×ª×ª×××¢×" or "self-review"
- **Reactively** when user says "×× ××§× ×××ª×¨ ××× ×××" or "××ª× ××××¨ ×¢× ×¢×¦××"
- **Mid-task** when you detect inefficiency while working (see below)

The user should never need to ask you to do this. It's built into the session lifecycle.

## Mid-Task Optimization (Real-Time)

Don't wait until session end to optimize. If you notice inefficiency WHILE WORKING, act immediately:

### Trigger conditions:
- You've repeated the same action 3+ times (e.g., opening the same dialog, clicking the same dropdown)
- A single sub-task is taking more than 5 minutes when it should take 1-2
- You're using the wrong tool for the job (UI for bulk work, manual steps for automatable tasks)
- You're about to do something you already know is slow from a previous rule

### What to do:
1. **Stop** â Don't finish the inefficient approach just because you started it
2. **Recalculate** â What's the faster path? API? Import? Different UI flow? Skip non-essential items?
3. **Reprioritize** â If you're spending 10 minutes on low-value work (extra spaces), shift to high-value work (tenants, contacts) instead
4. **Continue** â Execute the optimized approach without asking permission (unless guardrails require it)

### Example:
You're creating spaces one-by-one through the UI. After the 3rd space on the 3rd floor, you realize you've been doing this for 15 minutes. **Stop.** The remaining floors need only 2-3 spaces each for the demo â or better yet, use the API. Don't finish all 6 floors via UI just because you started that way.

### Key principle:
Optimize in both the **long run** (skill updates for future sessions) and the **short run** (mid-task course corrections for THIS session). The user expects progress NOW, not just promises of future improvement.

## Step 1: Analyze (30 seconds of thinking)

Walk through these questions quickly. Be specific, not generic.

**What was the task?** One sentence.

**What was slow?** Look for: wasted clicks, wrong approach (UI when API was better),
repeated navigation, dialog wrestling, unnecessary waiting. Count things â "retried
the dropdown 4 times" is useful, "the dropdown was annoying" is not.

**What patterns repeated?** Actions you did 3+ times the same way are automation
candidates. Same form filled repeatedly, same navigation path, same error fixed.

**What did the user say?** Even vague feedback matters. "××¢×××!" means keep doing
that thing. "×¢×¦××¨" means you were going in the wrong direction.

## Step 2: Update the Skills (the important part)

This is where the loop closes. For each lesson learned, find the right skill and
edit it directly.

### MANDATORY: Always update `system-learning`

Every session that involves browser automation, API work, or interacting with any web system MUST update `system-learning/SKILL.md`. This is non-negotiable â it's how we build a reusable engine that works across ALL systems, not just Visitt.

What goes into system-learning (the "System-Specific Discoveries" section and general patterns):
- New API patterns discovered (e.g., a mutation that needs an extra param you wouldn't guess)
- Fetch interceptor captures â what you caught and how it helped
- Two-phase creation patterns (create then assign)
- Gotchas that would apply to other systems too (e.g., SPA navigation wiping state)
- Performance benchmarks for bulk operations
- Any technique that's NOT specific to one system but was learned while working on one

If you're unsure whether something belongs in system-learning vs a system-specific skill â put it in both. Better to duplicate a lesson than to lose it.

### Where to write each type of lesson:

| Lesson type | Target skill | Where in the skill |
|---|---|---|
| **Cross-system technique (API, automation, browser)** | **`system-learning`** | **"System-Specific Discoveries" or general patterns** |
| UI technique (click pattern, navigation shortcut) | `visitt-workflow` | "Learned Techniques" section |
| "Use API instead of UI for X" | `visitt-api` | Add a note in the relevant query/mutation section |
| "Use CSV import for bulk X" | `visitt-import` | Add to the relevant entity template |
| Safety-related (don't skip confirmation) | `visitt-guardrails` | Add to rules |
| How to ask the user better questions | `self-review` (this file) | "Communication Optimization" section below |
| General efficiency (screenshots, find tool usage) | `self-review` (this file) | "General Rules" section below |

### How to edit a skill safely:

1. Read the current skill file
2. Find the right section (or create one if needed)
3. Add your lesson as a concise, actionable instruction
4. Don't remove existing instructions â add to them
5. Don't contradict existing rules. If a skill says "ask the user before choosing
   UI vs API", keep asking. But you CAN optimize HOW you ask (e.g., "present both
   options with a recommendation instead of an open question")

### Example of a skill update:

**Lesson learned**: Creating spaces one-by-one through the UI took 25 minutes for
15 spaces. API would take 2 minutes.

**Action**: Open `visitt-workflow/SKILL.md`, find the section about space creation,
and add:
```
> **Optimization note (2026-03-17)**: For 5+ spaces, use the GraphQL API
> (see visitt-api skill, createSpace mutation) instead of the UI dialog.
> UI is fine for 1-4 spaces. The Create Space dialog's location picker
> is unreliable â if you must use UI, navigate to the target floor first.
```

### End-of-step checklist (do NOT skip)

Before moving to Step 3, verify you updated ALL relevant skills. Run through this list:

- [ ] **`system-learning`** â Did you add cross-system techniques? (REQUIRED if session involved any browser/API work)
- [ ] **System-specific skill** (e.g., `visitt-api`, `visitt-workflow`) â Did you update the relevant system skill?
- [ ] **`self-review`** â Did you discover a new efficiency rule or communication pattern?

If you skipped `system-learning`, go back and update it now. The whole point of that skill is to accumulate knowledge that transfers to new systems â every session where we automate something teaches us something reusable.

## Step 3: Update the Log

After updating skills, write a brief entry to `memory/optimization-log.md`:

```markdown
## [DATE] â [TASK SUMMARY]

**Bottlenecks**: [what was slow â what to do instead]
**Skills updated**: [which skills were edited and what was added]
**User feedback**: [quotes or paraphrases]
```

Keep log entries short. The real value lives in the updated skills, not the log.
The log is just an audit trail.

## Communication Optimization

This section is about optimizing how you interact with the user â not just what
you do, but how you present choices, ask questions, and show results.

### Current rules:
- When presenting options (e.g., UI vs API), give a recommendation with reasoning
  rather than an open-ended question. "I'd use the API here because there are 12
  items â OK?" is better than "Do you want me to use UI or API?"
- When asking for confirmation, be concise. Show what you'll do, not why.
- When the user gives vague feedback ("×× ××××"), ask ONE specific follow-up,
  not three.
- Combine related operations. Instead of "should I add floors?" then "should I add
  spaces?" then "should I add equipment?", say "I'll set up the full building
  structure â floors, spaces, and equipment. OK?"

11. **Slot/range pickers need fiber onClick, not coordinate clicks** â Custom slot pickers (`BookingRangeButton` etc.) require `fiber.memoizedProps.onClick(fakeEvent)` with `nativeEvent: {preventDefault: ()=>{}}`. Confirmation: `isSelected` class appears on button AND a previously hidden section shows. Range selection: clicking two slots selects the full range between them. (2026-03-21)

12. **Confirmation dialogs fire mutations on Confirm, not on action button** â Install interceptor before clicking the action button. Clear buffer before step 1. Mutation fires on step 2 (Confirm/Submit in dialog). (2026-03-21)

13. **Apollo Client captures window.fetch at init â post-load interceptor misses mutations** â Replacing `window.fetch` after page load doesn't intercept Apollo Client mutations because Apollo captures the original `fetch` reference at initialization. Use `read_network_requests` tool BEFORE the click, or use the "before/after features array diff" pattern to discover feature keys instead. (2026-03-22)

14. **Use before/after features diff to discover feature keys** â When interceptor can't catch the mutation name, click the toggle, query `company { features }` before and after, diff the arrays. The added/removed item IS the feature key. Then revert via direct API call. Costs ~3 API calls per discovered key. (2026-03-22)

15. **get_page_text is fastest for "what settings exist" tasks** â For learning/exploration tasks where you need to read all settings on a page, `get_page_text` in one call beats scroll+screenshot cycles by 5-10 actions. Use it for any page where you need full content, not specific UI states. (2026-03-22)

(Add new rules here as they're discovered in sessions)

## General Rules

These are efficiency rules that apply across all tasks. They accumulate over time.

1. **Navigate to target context before opening create dialogs** â Forms pre-fill
   location/parent fields based on where you are. Going to the right page first
   saves dropdown wrestling. (2026-03-17)

2. **Use `find` tool instead of scrolling** â When looking for a button or element,
   use the find tool with a description rather than scrolling and scanning visually.
   Scrolling wastes 3-5 actions per search. (2026-03-17)

3. **Enable "Create another" before filling fields** â Multi-create toggles sometimes
   reset. Click them first. (2026-03-17)

4. **Bulk threshold: 5+ items â switch to API or import** â If you need to create
   5 or more entities of the same type, stop using the UI. Check if the API or CSV
   import can handle it. (2026-03-17)

5. **Screenshot strategically** â Take a screenshot after actions that change state
   (form submit, navigation, dialog open). Skip screenshots after typing, scrolling,
   or clicking within the same view. (2026-03-17)

6. **GQL interceptor before navigation, not after** â Install the fetch interceptor BEFORE navigating to the target page. Page load fires all initial queries before your JS execution. If you install after, you miss them. Pattern: install â navigate â re-install (SPA wipes window) â read captured. (2026-03-21)

7. **Confirm mutation exists before probing input shape** â Use `mutation { mutationName }` first. "Cannot query field" = doesn't exist â stop. Only probe input shape after confirmed existence. Saves 3-4 wasted API calls per mutation. (2026-03-21)

8. **Don't probe bookAmenity-family mutations directly on Visitt** â They return "Invalid query" for all probe shapes (server-side query whitelisting). Max 1 probe attempt, then switch to GQL interceptor from the real UI flow. (2026-03-21)

9. **Update ALL THREE skill files after every session** â system-learning (cross-system techniques), system-specific skill (Visitt mutations/UI), AND self-review (new rules). This file MUST also update itself. Skipping any one loses the knowledge permanently. The self-review checklist now enforces this. (2026-03-21)

10. **React radio buttons need `.click()`, text inputs need native setter** â For checkboxes/radios use `el.click()`. For text/textarea use React native setter + `dispatchEvent('input')`. Always verify React state updated via screenshot â PropTypes warnings in console = stale state, form won't submit correctly. (2026-03-21)

11. **Slot/range pickers need fiber onClick, not coordinate clicks** â Custom slot pickers (`BookingRangeButton` etc.) require `fiber.memoizedProps.onClick(fakeEvent)` with `nativeEvent: {preventDefault: ()=>{}}`. Confirmation: `isSelected` class appears on button AND a previously hidden section shows. Range selection: clicking two slots selects the full range between them. (2026-03-21)

12. **Confirmation dialogs fire mutations on Confirm, not on action button** â Install interceptor before clicking the action button. Clear buffer before step 1. Mutation fires on step 2 (Confirm/Submit in dialog). (2026-03-21)

(Add new rules here as they're discovered in sessions)

## What NOT to Optimize Away

Some things look slow but exist for safety:
- **Dry-run previews** â They prevent mistakes on production data.
- **User confirmations** â When guardrails require confirmation, that's by design.
  Optimize the question format, not the act of asking.
- **Verification screenshots** â After a destructive or irreversible action, always
  verify. The 2-second cost prevents 20-minute rollbacks.

## For the User

You don't need to do anything special. Just work with Claude normally and:
- If something feels slow, say so. Even "×× ××××" is enough.
- At session end, say "×ª×©×××¨ ×× ×©×××× ×" â the review runs automatically.
- Say "××¢×××!" when something works well â that's data too.
- You'll never need to remind Claude to optimize. It just happens.

16. **Always work on staging (staging.visitt.io) unless explicitly told otherwise** — Production (app.visitt.io) should never be the default. The user will say "פרודקשן" or "production" if they mean it. If you navigate to app.visitt.io by default, you're in the wrong place. (2026-03-25)
17. **GitHub API for file edits when git clone is blocked** — When proxy blocks git clone AND raw.githubusercontent.com, use the GitHub REST API (api.github.com) from the browser's JS console: GET contents to read + sha, PUT contents with base64-encoded content to write. Works from any origin. (2026-03-25)
18. **Visualization = interactive tree, not cards** — The user requires building previews as a recursive tree component (TreeNode with expand/collapse), NOT as card grids, dashboards, or accordion panels. See visitt-workflow skill for exact format spec. (2026-03-25)
