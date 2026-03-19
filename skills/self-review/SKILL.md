---
name: self-review
description: >
  Continuous self-optimization system. Use this skill whenever a work session ends
  and it's time to review performance, or when the user says "תתייעל", "self-review",
  "תבדוק את עצמך", "מה למדת", or asks Claude to improve how it works.
  Also use as part of the "תשמור מה שלמדנו" end-of-session flow.
  Trigger whenever the user asks about optimizing Claude's workflow, reviewing
  session efficiency, or building a learning loop. Even if the user just says
  "you were slow today" or "that took too long" — this skill should activate.
---

# Self-Review: Continuous Optimization

This is a closed-loop system. You don't just write down what went wrong — you fix it.
Every session ends with lessons learned AND those lessons applied directly into the
relevant skills. Next session, you're already better.

## The Closed Loop

```
DO THE WORK
    ↓
REVIEW (what was slow, what repeated, what the user said)
    ↓
UPDATE SKILLS (write the lessons INTO the relevant skill files)
    ↓
UPDATE LOG (record what changed and why)
    ↓
NEXT SESSION → read updated skills → already improved
```

The critical difference from a passive log: **step 3 actually edits the skill files.**
If you learned that navigating to a floor before creating a space is faster, you don't
just write that in a log — you add it to the visitt-workflow skill's instructions so
next time you (or any Claude using that skill) will do it right automatically.

## When This Runs

- **Automatically** at session end when user says "תשמור מה שלמדנו"
- **On demand** when user says "תתייעל" or "self-review"
- **Reactively** when user says "זה לקח יותר מדי זמן" or "אתה חוזר על עצמך"
- **Mid-task** when you detect inefficiency while working

## Mid-Task Optimization (Real-Time)

Don't wait until session end to optimize. If you notice inefficiency WHILE WORKING, act immediately:

### Trigger conditions:
- You've repeated the same action 3+ times
- A single sub-task is taking more than 5 minutes when it should take 1-2
- You're using the wrong tool for the job (UI for bulk work, manual steps for automatable tasks)

### What to do:
1. **Stop** — Don't finish the inefficient approach just because you started it
2. **Recalculate** — What's the faster path? API? Import? Different UI flow?
3. **Reprioritize** — If spending 10 minutes on low-value work, shift to high-value work instead
4. **Continue** — Execute the optimized approach

## Step 1: Analyze (30 seconds of thinking)

**What was the task?** One sentence.

**What was slow?** Count things — "retried the dropdown 4 times" is useful, "the dropdown was annoying" is not.

**What patterns repeated?** Actions done 3+ times the same way are automation candidates.

**What did the user say?** Even vague feedback matters. "מעולה!" means keep doing that. "עצור" means wrong direction.

## Step 2: Update the Skills

For each lesson learned, find the right skill and edit it directly.

### Where to write each type of lesson:

| Lesson type | Target skill | Where in the skill |
|---|---|---|
| UI technique (click pattern, navigation shortcut) | `visitt-workflow` | Relevant section |
| "Use API instead of UI for X" | `visitt-api` | Relevant mutation section |
| Safety-related (don't skip confirmation) | `visitt-workflow` | Deployment Flow section |
| How to ask the user better questions | `self-review` (this file) | Communication Optimization section |
| General efficiency | `self-review` (this file) | General Rules section |

### How to edit a skill safely:

1. Read the current skill file
2. Find the right section (or create one if needed)
3. Add your lesson as a concise, actionable instruction
4. Don't remove existing instructions — add to them
5. Don't contradict existing rules

## Step 3: Update the Log

Write a brief entry to an optimization log:

```markdown
## [DATE] — [TASK SUMMARY]

**Bottlenecks**: [what was slow → what to do instead]
**Skills updated**: [which skills were edited and what was added]
**User feedback**: [quotes or paraphrases]
```

## Communication Optimization

- When presenting options, give a recommendation with reasoning rather than an open-ended question
- When asking for confirmation, be concise. Show what you'll do, not why.
- When the user gives vague feedback, ask ONE specific follow-up, not three.
- Combine related operations into one approval question

## General Rules

1. **Navigate to target context before opening create dialogs** — Forms pre-fill based on where you are.
2. **Use `find` tool instead of scrolling** — Saves 3-5 actions per search.
3. **Enable "Create another" before filling fields** — Multi-create toggles sometimes reset.
4. **Bulk threshold: 5+ items → switch to API or import**
5. **Screenshot strategically** — After state changes, not after typing or scrolling.

## What NOT to Optimize Away

- **Dry-run previews** — They prevent mistakes on production data.
- **User confirmations** — Optimize the question format, not the act of asking.
- **Verification screenshots** — After destructive actions, always verify.
