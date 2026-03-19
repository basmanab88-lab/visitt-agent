# Visitt Agent — Working Rules

These rules apply to ALL work with the Visitt property management platform.

## Non-Negotiable Rules

1. **Visualize before deploy** — NEVER deploy to Visitt without showing a React JSX preview first and getting explicit user approval. Flow: Parse data → Visualize → Get approval → Deploy.
2. **Run self-review after every task** — After completing any task (deployment, automation, browser work), invoke the `self-review` skill automatically. Don't wait to be asked.
3. **Optimize during work** — After 2-3 manual repetitions of any action, switch to automation (JavaScript/API). Don't keep clicking manually.
4. **Use dummy_id_N format** — When creating floors via `upsertFloors`, IDs MUST be `dummy_id_0`, `dummy_id_1`, etc. Other formats silently fail.

## Methodology: Automating Any Task in Visitt

1. **Discover** — Use fetch interceptor to capture API calls from the UI
2. **Document** — Record mutations, variables, auth patterns in the skill
3. **Automate** — Build bulk scripts with batched concurrency
4. **Visualize** — Always preview before deploying
5. **Optimize** — Measure performance, increase concurrency, reduce delays
6. **Persist** — Update skills with everything learned

## Building Visualization Rules

When showing a building preview before deployment, use this design system:

| Kind | Dot | Color |
|------|-----|-------|
| floor | 12px square, blue glow | #3b82f6 |
| site | 8px circle | #94a3b8 |
| leasable | 8px circle + "להשכרה" tag | #22c55e |
| equipment | 6px circle | #f59e0b |
| tenant | inline after ← | #7c3aed |

## Performance Guidelines

- **Staging:** Concurrency 5, delay 400ms between batches
- **Production:** Concurrency 3, delay 800ms between batches
- **Single script deployment** — Run everything in one `javascript_tool` call to minimize overhead
- **Bulk threshold:** 5+ entities of the same type → use API, not UI

## Communication Style

- Respond in Hebrew for conversation, English for code/technical content
- When presenting options, give a recommendation — don't ask open-ended questions
- Combine related operations into one approval question
