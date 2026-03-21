---
name: system-learning
description: "Methodology for approaching, learning, and mastering new SaaS/web systems. Use this skill whenever Claude encounters a system it hasn't worked with before, or when starting work on any web application platform. Triggers on: new system, learn platform, unfamiliar app, first time using, set up workflow, figure out how [system] works, browser automation on a new site. Also use this skill proactively whenever Claude opens a web app it doesn't have documented knowledge about — even if the user didn't explicitly say 'learn this system'."
---

# System Learning — How to Approach and Master New Web Systems

This skill captures Claude's methodology for learning new SaaS/web platforms from scratch and building effective workflows on them. It's designed to be **system-agnostic** — the same approach works whether you're navigating a property management tool, a CRM, a project tracker, or any other web application.

The skill also **self-updates**: every time you learn something significant about a new system, you add it to the knowledge base so future sessions benefit immediately.

## Phase 1: Reconnaissance — Understand Before You Act

When encountering a new system for the first time, resist the urge to start clicking immediately. Invest 2-3 minutes in orientation — it pays off enormously.

### Step 1: Read the page

Use `read_page` or `get_page_text` to capture the full visible content. Look for:

- **Navigation structure** — sidebar menus, top nav, tabs. This tells you the system's information architecture.
- **Current context** — breadcrumbs, page titles, selected menu items. Where are we?
- **Key UI patterns** — does this app use modals? Inline editing? Drawers? Multi-step wizards?
- **User role indicators** — admin badges, permission-limited sections. What can we do here?

### Step 2: Map the system's mental model

Every SaaS system has a core data model. Identify it early:

- What are the **primary entities**? (e.g., in a CRM: contacts, deals, companies; in a project tool: tasks, projects, sprints)
- What are the **relationships** between them? (one-to-many, many-to-many)
- What's the **hierarchy**? (organization → workspace → project → task)
- Where do **settings** live? (usually a gear icon, "Admin", or "Settings" in the sidebar)

You don't need to document this formally — just build a mental map so you can navigate confidently.

### Step 3: Identify the URL pattern

Most SaaS apps have predictable URL structures. Understanding them lets you navigate directly instead of clicking through menus:

- `/settings/general`, `/settings/billing`, `/settings/team`
- `/projects/123/tasks`, `/projects/123/settings`
- `/admin/properties/456/config`

Note the pattern early. It often reveals features and sections that aren't visible in the UI navigation.

## Phase 2: Exploration — Learn by Doing (Carefully)

### Start with low-risk actions

Before making changes, explore read-only views:

- Browse lists and tables to understand data structure
- Open detail views to see what fields exist
- Check settings pages to understand configuration options
- Look at any "help" or "?" icons for built-in documentation

### Understand the save/commit model

This is critical and varies between systems:

- **Auto-save** — changes apply immediately (dangerous for bulk operations)
- **Explicit save** — there's a "Save" button you must click (safer)
- **Draft/publish** — changes go to draft first (safest)
- **Undo support** — can you reverse changes? Is there version history?

Knowing this determines how cautious you need to be.

### Map the DOM structure for automation

When you'll need to automate interactions, examine the DOM early:

- Are elements identified by `data-testid`, `aria-label`, or semantic roles? (best case)
- Does the app use generic class names from a CSS framework? (harder but workable)
- Is there **virtual scrolling**? (lists that only render visible items — requires scroll-based strategies)
- Are there **shadow DOM** components? (may need special selectors)

Use the browser dev tools or `javascript_tool` to inspect:

```javascript
// Quick DOM audit — run this to understand the page structure
const summary = {
  forms: document.querySelectorAll('form').length,
  buttons: document.querySelectorAll('button').length,
  inputs: document.querySelectorAll('input, select, textarea').length,
  tables: document.querySelectorAll('table').length,
  dataAttributes: document.querySelectorAll('[data-testid]').length,
  ariaLabels: document.querySelectorAll('[aria-label]').length,
  modals: document.querySelectorAll('[role="dialog"]').length
};
console.log(JSON.stringify(summary, null, 2));
```

## Phase 3: Automation Escalation — The 2-3 Rule

This is the most important pattern and it applies to every system:

### Manual → Script Escalation

1. **First 2-3 repetitions**: Do the task manually via browser clicks. You're learning the exact sequence: what to click, what loads, what confirmations appear, what delays exist.
2. **After 2-3 repetitions**: Stop. Write a script (JavaScript via `javascript_tool`) that automates the remaining repetitions. The script should handle:
   - Element selection (use the selectors you discovered in step 1)
   - Timing/delays (some apps need time between actions for state to update)
   - Error handling (what if an element isn't found? what if a modal blocks?)
   - Progress reporting (log which item you're on so you can resume if something breaks)
3. **After automation works**: Immediately document what you built (see Phase 5).

### Why this matters

Manual browser clicking takes ~3-5 seconds per action. A JavaScript script can process hundreds of actions in seconds. Even for just 10 repetitions, the script saves minutes. For 50+ repetitions, it saves hours.

### Common automation patterns across SaaS systems

These patterns recur across almost every web application:

**Bulk selection/deselection:**
```javascript
// Pattern: "Select All" then deselect specific items
// Faster than selecting items one by one, especially with virtual scrolling
const selectAllBtn = document.querySelector('[text*="Select All"], [aria-label*="Select all"]');
if (selectAllBtn) selectAllBtn.click();
// Then deselect the few you don't want
```

**Navigating paginated lists:**
```javascript
// Pattern: Process current page, then click "Next"
async function processAllPages(processItem) {
  while (true) {
    const items = document.querySelectorAll('.list-item'); // adapt selector
    for (const item of items) await processItem(item);
    const nextBtn = document.querySelector('[aria-label="Next page"]');
    if (!nextBtn || nextBtn.disabled) break;
    nextBtn.click();
    await new Promise(r => setTimeout(r, 1000)); // wait for page load
  }
}
```

**Handling virtual scroll (items render only when visible):**
```javascript
// Pattern: Scroll to bottom in steps, collecting items as they render
async function scrollAndCollect(container, itemSelector) {
  const items = new Set();
  let lastHeight = 0;
  while (true) {
    document.querySelectorAll(itemSelector).forEach(el => items.add(el.textContent.trim()));
    container.scrollTop += 300;
    await new Promise(r => setTimeout(r, 200));
    if (container.scrollTop === lastHeight) break;
    lastHeight = container.scrollTop;
  }
  return [...items];
}
```

**Form fill across multiple entities:**
```javascript
// Pattern: Navigate to entity → fill form → save → next entity
async function bulkUpdate(entityIds, fillForm) {
  for (const id of entityIds) {
    window.location.href = `/entities/${id}/edit`; // adapt URL pattern
    await new Promise(r => setTimeout(r, 2000)); // wait for page load
    await fillForm();
    document.querySelector('button[type="submit"]').click();
    await new Promise(r => setTimeout(r, 1000)); // wait for save
  }
}
```

## Phase 3.5: API Discovery via Fetch Interceptor

This is one of the most powerful techniques for any web system. When you need to discover undocumented API mutations/queries, **intercept the app's own network calls** rather than guessing at the API schema.

### The Fetch Interceptor Pattern (system-agnostic)

```javascript
// Set up BEFORE the user performs the action in the UI
window._captured = [];
const origFetch = window._origFetch || window.fetch;
window._origFetch = origFetch;
window.fetch = function(...args) {
  const [url, opts] = args;
  if (opts && opts.body) {
    try {
      const body = JSON.parse(opts.body);
      window._captured.push({
        op: body.operationName,
        query: body.query,
        vars: body.variables
      });
    } catch(e) {}
  }
  return origFetch.apply(this, args);
};
```

Then ask the user to perform ONE action manually in the UI, and read `window._captured` to get the exact mutation signature, variable names, and types. This bypasses the need for API documentation or introspection.

**When to use this:**
- The API has introspection disabled (common with Apollo Server)
- You can't find documentation for a specific mutation
- You've tried guessing the mutation signature and keep getting validation errors
- You know the UI can do something but don't know the API call behind it

**Pro tip:** Filter captures by operation name to reduce noise. The UI makes many background queries — focus on mutations triggered by the user's action.

### Two-Phase Creation Pattern

Many hierarchical systems require creating entities first, then assigning relationships in a second pass. Don't assume one API call handles both creation and placement.

```
Phase 1: Create entities (flat, unassigned)
Phase 2: Assign to parents/locations/hierarchy (separate mutation)
```

**Lesson:** After bulk creation, always **verify entities appear in the correct hierarchy** — not just that they exist. A "success" response from the creation API doesn't mean the entity is properly placed.

### Window Variables Lost on SPA Navigation

Single-page apps re-render on navigation, which can wipe `window._variables` you stored earlier. **Never rely on stored window state across page navigations.** Instead:
- Re-query data from the API when you need it again
- Or store critical data in `sessionStorage` if the app allows it

## Phase 4: Problem Solving — When Things Don't Work

### Common issues and how to diagnose them

**Elements not found:**
- The page might not be fully loaded → add delays or wait for specific elements
- The element might be inside a shadow DOM → use `element.shadowRoot.querySelector()`
- The element might be in an iframe → switch to the iframe context first
- Virtual scrolling → the element isn't rendered yet, scroll it into view

**Clicks don't register:**
- React/Angular apps sometimes need events dispatched differently:
```javascript
// Sometimes .click() isn't enough. Try dispatching native events:
element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
// Or for React apps that use synthetic events:
element.dispatchEvent(new Event('input', { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));
```

**State doesn't update after programmatic changes:**
- Many frameworks (React, Vue, Angular) don't detect direct DOM manipulation
- Try triggering input/change events after setting values
- As a fallback, use the browser's click/type simulation rather than direct DOM manipulation

**Rate limiting or loading delays:**
- Add generous delays between API-triggering actions (500ms-2000ms)
- Watch for loading spinners/overlays and wait for them to disappear
- If the app uses optimistic updates, verify the change actually persisted

### When to use the browser UI vs. API

If you discover the system has an API (check network tab for XHR/fetch calls):
- **Use the API** for bulk data operations — it's faster and more reliable
- **Use the browser UI** for configuration changes — APIs often don't cover admin settings
- **Use the API to read, browser to write** — hybrid approach when the API is read-only for certain features

## Phase 5: Self-Updating Knowledge Base

### When to update this skill

After completing a task on any system, ask yourself:

1. Did I discover a **general technique** that would help on other systems? → Update the patterns sections above
2. Did I discover a **system-specific technique**? → Add it to the System-Specific Discoveries log below
3. Did I hit a **problem and solve it**? → Add it to the Problem Solving section

### How to update

Add entries to the "System-Specific Discoveries" section below with:
- **System name** and date
- **What the task was**
- **What approach worked** (and what didn't, if relevant)
- **Reusable selectors or code snippets**

Keep entries concise — future-you needs the gist, not a novel.

### Self-update trigger

**After every task that involves browser automation or learning a new system**, check whether there's something worth documenting. If there is, update this file before ending the task. This is not optional — the whole point of this skill is that it grows smarter over time.

---

## System-Specific Discoveries

This section is a living log. Add new entries as you work with different systems.

### Visitt (app.visitt.io) — Property Management
- **Multi-select dropdowns with virtual scrolling**: Use "Select All" then deselect unwanted items. Dramatically faster than individual selection.
- **Property navigation**: Properties selected via top-right dropdown. Each has its own config at `app.visitt.io/company-settings?activeSideMenuItem=requests#portal`
- **Request categories**: Can be bulk-configured using JavaScript to toggle checkboxes, but virtual scrolling means you need to scroll to render items first.
- **API-first building deployment (2026-03-19)**: Full building with 54 entities (5 floors, 36 spaces, 13 equipment) deployed in ~10s via internal GraphQL API. Flow: `insertBuilding` → `upsertFloors` → batch `insertSite` (concurrency 5, 400ms delay) → batch `changeSitesLocation` (one call per floor).
- **Fetch interceptor for mutation discovery (2026-03-19)**: Used interceptor to capture `changeSitesLocation` signature — discovered missing `buildingId` param that caused silent failures. The interceptor technique resolved a bug in 30 seconds that took 3 failed API attempts to diagnose.
- **Two-phase creation (2026-03-19)**: `insertSite` creates entities but does NOT assign them to floors. Must call `changeSitesLocation` as a second step. Entities without floor assignment appear under "Spaces & equipment without floors" — easy to miss if you don't verify visually.
- **`companies` query pagination**: Requires `limit: Int!` and `skip: Int!`. Response nested as `data.companies.companies[]`. No `total` field available. (2026-03-20)
- **Bulk category operations (2026-03-20)**: Flow: unassign (`removeCategoryFromCompany`) → delete (`deleteCategory`) → create (`createCategory`). `createCategory` takes `{name, companyId, customerId}` — NO color field. 600 categories across 30 properties created in ~25s.
- **Automation deployment (2026-03-20)**: `createAutomation` requires `actionValue` as string always (even JSON). `eventFields.companyId` is mandatory. `triggerDelay` only for `issue_not_seen`/`issue_not_completed`. 150 automations (5 × 30 properties) deployed in 24s.
- **Visual Builder pattern (2026-03-20)**: JSX = display only. Claude populates data → user reviews → user says "פרוס" in chat → Claude deploys. Localhost server, localStorage, Electron fs — all blocked/unavailable. Don't try programmatic communication between JSX and Claude.
- **Stacking plan: tree view first (2026-03-20)**: Always show collapsible tree (property→building→floor→spaces) BEFORE deploying. 2D grid is for reference only. Use `stacking-tree.jsx` pattern.
- **Tenants & Contacts API (2026-03-20)**: `addContacts` links contacts to tenants via `tenants[{_id, isAdmin}]` field (NOT via locations). `setTenant` is a REPLACE-ALL mutation — always include full existing locations+contacts array or you'll delete them. Tenant spaces: `locations[{buildingId, siteId, isLeased}]`. `isLeased: true` = leased, `false` = authorized (work order rights only).
- **Ariakit SelectCombobox vs react-select (2026-03-20)**: Two completely different dropdown libraries. react-select uses `[class*="-control"]` + `[class*="-option"]`. Ariakit uses `button.SelectComboboxValue` + `[role="option"], [class*="SelectItem"]`. Failing to distinguish them wastes 4+ attempts. Always inspect the component class before trying selectors.
- **`/building/current` URL shortcut (2026-03-20)**: "My property" sidebar link → `/building/current` → auto-redirects to `/building/<buildingId>`. Use this to get the current building ID via URL bar after navigation.
- **`insertSite` dual-purpose mutation (2026-03-20)**: Same mutation handles spaces (`modelType: "site"/"leasable_site"`) AND equipment (`modelType: "equipment"` + `equipmentData` object). Frontend operation name is `insertSpace` for spaces but `insertSite` for equipment — both call `insertSite` internally.
- **Test data pollution (2026-03-21):** Creating test contacts to probe phone format validation leaves real contacts in the system. Those contacts then block batch creation of real contacts (duplicate phone/email error). Fix: always use obviously-fake test data (`_test_@`, `+972509999901`) and delete test entities before running real batch. Or test with a single real contact from the batch first.
- **Bulk import session bootstrap (2026-03-21):** When the GitHub repo clone fails at session start, the local plugin skill may be OUTDATED. Critical knowledge (e.g., `setTenant` format, `addContacts` tenant linking) may already exist in the newer repo skill. Failing to read the latest skill causes unnecessary re-discovery time. Always verify clone succeeded before starting work.
- See the `visitt-api` skill for detailed Visitt API patterns.

### javascript_tool — Async Execution Pattern (cross-system, 2026-03-20)

`javascript_tool` does NOT support top-level `await`. The Promise returned by `(async () => { ... })()` is never resolved by the tool — the tool sees `undefined`.

**Correct pattern — store in window, read in next call:**
```javascript
// Call 1: Start async operation
fetch('/api').then(r => r.json()).then(d => {
  window.__result = JSON.stringify(d);
}).catch(e => { window.__result = "ERR: " + e.message; });
"fetching..."  // return value to confirm it ran

// Call 2: Read result (after a moment)
window.__result || "not yet"
```

**For long-running operations** (bulk deployments), use a log array:
```javascript
// Start
window.__log = [];
window.__done = false;
(async function run() {
  for (const item of items) {
    window.__log.push(`Processing ${item.name}...`);
    // ... do work ...
    window.__log.push(`✅ ${item.name} done`);
  }
  window.__done = true;
})();
"started"

// Poll
window.__done ? "DONE" : window.__log.slice(-5).join('\n')
```

**Shell substitution in chat**: When user sends `$(find ...)` in a chat message, the shell substitution is NOT evaluated — it arrives literally. Claude must run the `find` command manually via Bash tool.

### Cross-Session Access Pattern (2026-03-20)

Cannot access `/sessions/other-session-name/mnt/` from current session — each session is an isolated sandbox.

**Workaround**: Use `mcp__session_info__list_sessions` to find the target session ID, then `mcp__session_info__read_transcript` to read its history and extract file contents or context. This was used to find the GitHub repo URL when CLAUDE.md was inaccessible.

### Google Calendar — Batch Event Management
- **Bulk delete**: Use `[data-eventid]` to find events, `[data-datekey]` for day boundaries. Click event → click delete button (`[aria-label="Delete event"]`). Async loop with ~500ms delays.
- 65 events deleted in ~30 seconds vs. 10+ minutes manually.

---

## Quick Reference — The Learning Checklist

When starting with any new system, run through this mentally:

1. **Read** the page — understand the layout and navigation
2. **URL pattern** — can you navigate directly?
3. **Data model** — what are the main entities and relationships?
4. **Save model** — auto-save, explicit save, or draft/publish?
5. **DOM inspection** — what selectors are available for automation?
6. **2-3 manual reps** — learn the exact sequence
7. **Automate** — write a script for remaining repetitions
8. **Document** — update this skill file
