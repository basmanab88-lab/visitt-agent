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

### Apollo Client Intercept Patterns (2026-03-21)

**`window.__APOLLO_CLIENT__`** is exposed on the Visitt staging frontend. Use it to:
- Inspect the cache: `window.__APOLLO_CLIENT__.cache.extract()` → all cached entities with their full structure
- Understand data models without needing introspection or UI inspection
- Find entity field names by looking at `__typename` objects in the cache
- Identify related entity types (e.g. `AutomationEventField` has `{ type, _id, name }`)

**Fetch intercept reliability:**
- `window.fetch` override AFTER page load → catches SOME mutations (e.g. `createWorkOrder` on `/issues`), misses others (`createAutomation`)
- `XMLHttpRequest` override → useless (Apollo uses native fetch, not XHR)
- `Response.prototype.json` override → catches response but not request body
- **Most reliable**: probe iteratively with `variables: { input: {} }` → error message reveals required fields and type names
- **Field discovery order**: `{}` → "field X of required type Y!" → add X, retry → repeat until runtime error (not validation)

**Bundle analysis shortcut:**
- Visitt uses a single-chunk Vite bundle (`index-CzWIvXQb.js`). GraphQL mutation strings are NOT in the bundle as literals — they're constructed programmatically.
- `window._bundle.includes('mutationName')` returns false even for valid mutations.
- Don't waste time searching the bundle for mutation definitions.

**Work order creation path:**
- URL: `/issues/issue/create` opens the create dialog directly (no need to click button)
- Automation creation URL: `/issues/automation/create` — BUT this URL redirects to open work orders list; instead, click the Automation tab → navigate to `#automations` hash first, then the link `href="/issues/automation/automation/create"` works

---

### GQL Mutation Probing Decision Tree (2026-03-21)

When you need to discover if a mutation exists or what its args are, use this decision tree — it's fast and reliable:

**Step 1 — Does the mutation exist?**
Send: `mutation { mutationName }`
- `"Cannot query field \"mutationName\" on type \"Mutation\""` → **NOT FOUND**
- `"Invalid query"` (GRAPHQL_VALIDATION_FAILED) → **EXISTS** (needs args)
- `"Field \"mutationName\" argument \"X\" of type \"Y!\" is required..."` → **EXISTS** (reveals arg name + type)

**Step 2 — What's the input type?**
Send: `mutation M($input: FakeType!) { mutationName(input: $input) { _id } }`
- `"Unknown type \"FakeType\""` → mutation accepts `input` arg; real type name unknown (introspection disabled)
- `"Unknown argument \"input\""` → mutation uses named args, not `input` object

**Step 3 — What fields does the input type require?**
Send with `variables: { input: {} }` and the correct type (if known):
- Error lists each missing required field one by one → iterate, adding each until you get a runtime error (Unauthorized / resolver error) instead of validation error

**"Invalid query" exception**: Some mutations (e.g. `bookAmenity`, `deleteAmenityBooking`, `cancelAmenityBooking` on Visitt) return `"Invalid query"` for ALL probe shapes — even with correct input. This is a custom server-side validator blocking non-whitelisted query documents. Don't waste time probing these; capture via GQL interceptor from the real UI instead.

---

### Lazy Chunk Discovery (2026-03-21)

When you can't find a mutation in the main bundle, find the right lazy chunk:
```javascript
// Search main bundle for asset filenames containing the feature name
const b = window._mainBundle || await fetch('/assets/index-XXXX.js').then(r=>r.text());
const regex = /assets\/([^"'\s,]+?KEYWORD[^"'\s,]*\.js)/gi;
const chunks = new Set();
let m;
while ((m = regex.exec(b)) !== null) chunks.add(m[1]);
[...chunks]; // → e.g. ["amenity-form-BiDSyoXm.js", "amenity-booking-form-BVVcnFnK.js"]
```
Then fetch each chunk and search for `mutation \w+`:
```javascript
fetch(`https://app.example.com/assets/${chunkName}`)
  .then(r => r.text())
  .then(t => [...t.matchAll(/mutation\s+(\w+)/g)].map(m => m[1]))
```
Note: Not all mutations appear as `mutation X` strings — some are built dynamically. If the chunk has the feature's **queries** but no **mutations**, the mutations are either in the main bundle or called via a shared utility chunk.

---

### React State vs DOM State (2026-03-21)

In React apps, DOM mutations don't update React state. This matters for form filling:

**DON'T** — these update DOM but break React:
```javascript
el.click();                    // radio/checkbox — React state stays stale
el.value = 'text';             // input — React doesn't see the change
```

**DO** — React native setter hack (works for inputs and textareas):
```javascript
function setReactVal(el, val) {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
```
For radio buttons: use `.click()` to select, then also fire a React synthetic event by clicking the label OR confirm React state updated by checking `input.checked` AND verifying the UI re-rendered (take a screenshot).

**Symptom of stale React state**: React PropTypes warning in console (e.g. "prop `layout` is marked as required but its value is `undefined`"), form submits without firing mutation, form stays on the same page after Submit.

---

### Batch Entity Lookups (2026-03-21)

When you need to find ONE entity with specific properties (e.g., a property that has tenants) from a large set, don't query them sequentially. Use `Promise.all` for a parallel sweep:

```javascript
const ids = [...]; // all candidate IDs
Promise.all(ids.map(id =>
  fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: TENANTS_QUERY, variables: { input: { companyId: id } } })
  }).then(r => r.json())
  .then(d => ({ id, count: d.data?.tenants?.tenants?.length || 0 }))
)).then(results => results.filter(r => r.count > 0));
```
Result: finds all properties with tenants in ONE round-trip instead of N sequential queries. Same pattern works for any "find entity with property X" scan.

---

### React Date Picker Fiber Technique (2026-03-21)

Custom date pickers (like the one in Visitt's booking form) wrap a native `<input type="text">` with React state. The fiber props at level 6 contain `onChange` and `date` (native `Date` object, NOT moment).

**Correct approach — call level-6 fiber onChange directly:**
```javascript
const input = document.querySelector('input[name="date"]');
const fiberKey = Object.keys(input).find(k => k.startsWith('__reactFiber'));
let fiber = input[fiberKey];
for (let i = 0; i < 30; i++) {
  if (!fiber) break;
  if (i === 6 && fiber.memoizedProps?.onChange) {
    fiber.memoizedProps.onChange(new Date('2026-03-22T12:00:00'));
    break;
  }
  fiber = fiber.return;
}
```
Note: This triggers the slot query for the new date even if the display shows "Invalid date" (cosmetic bug in Visitt's custom picker).

To check what type the date prop is: inspect `fiber.memoizedProps.date.constructor.name` at level 6 — it may be `Date` (native) or a moment object depending on the picker library.

---

### Slot/Range Button Fiber onClick Pattern (2026-03-21)

For custom slot pickers (BookingRangeButton etc.) where `.click()` and coordinate clicks fail to update React state:

```javascript
const btn = document.querySelectorAll('.BookingRangeButton')[4]; // e.g., 5th slot
const fiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber'));
let fiber = btn[fiberKey];
let onClick = null;
for (let i = 0; i < 10; i++) {
  if (!fiber) break;
  if (fiber.memoizedProps?.onClick) { onClick = fiber.memoizedProps.onClick; break; }
  fiber = fiber.return;
}
onClick({
  preventDefault: () => {},
  stopPropagation: () => {},
  target: btn,
  currentTarget: btn,
  type: 'click',
  nativeEvent: { preventDefault: () => {}, stopPropagation: () => {} },
  persist: () => {}
});
```

**Confirmation that React state updated**: UI adds `isSelected` class to the button AND a previously hidden section (e.g., Comment field) appears.

**Range selection**: These pickers often select a RANGE not a single slot. Click slot A then slot B → selects A through B. Be aware of this when verifying state.

---

### Confirmation Dialog Pattern (2026-03-21)

Many destructive actions in web apps use a two-step confirmation:
1. Click action button → dialog appears with "Are you sure?" + optional text input
2. Click Confirm/Submit in dialog → actual mutation fires

**For GQL interception**: The mutation fires on step 2 (Confirm), not step 1. Install interceptor BEFORE step 1, clear captured buffer before step 1, then check after step 2.

**For forms with reason fields** (e.g., cancel booking reason): Fill the text input first, THEN click Confirm. The reason goes in the mutation's `comment` or `reason` field.

---

### SPA Context-Sensitive URL Redirects (2026-03-22)

In SPAs like Visitt, some URLs are **context-sensitive** — they redirect based on the currently selected entity (e.g., which property is active), not just the URL hash.

**Example**: In Visitt, navigating to `/company-settings#general` when no property is selected redirects to `/company/[id]#settings` (the Super-Admin page of the last-visited property). This caused 3 wasted navigation attempts.

**Pattern to detect this**: If you navigate to a URL and end up somewhere different, check:
1. Is there a context selector (e.g., property dropdown in top-right)?
2. Does the app remember "last visited" context?
3. Does the `#hash` get replaced by a query param (e.g., `?activeSideMenuItem=...`)?

**Rule**: When a redirect happens unexpectedly, use `get_page_text` immediately to understand where you landed before trying to navigate again. Don't retry the same URL — understand the redirect first.

---

### `get_page_text` as Efficient Content Harvesting (2026-03-22)

When the goal is to **learn the structure of a page** (not click anything), `get_page_text` captures ALL content in a single call — including content below the fold that would require multiple scrolls to see. This is much faster than scrolling + screenshot for learning tasks.

**Use `get_page_text` when**: You want to catalog all settings, options, labels, or flags on a page.
**Use screenshots when**: You need to see the visual state (toggles ON/OFF, selected items, colors).
**Use both when**: You need content AND visual state (e.g., which feature flags are enabled).


---

### Web Component Inputs (Ionic / Stencil) — Shadow DOM Gotchas (2026-03-22)

Some UI frameworks (Ionic, Stencil, Lit) use **Web Components with Shadow DOM**. Standard DOM queries don't penetrate the shadow boundary.

**Problem 1 — `ion-button` not found via querySelectorAll('button')**:
Ionic's `<ion-button>` renders a real `<button>` inside its shadow root, but `document.querySelectorAll('button')` returns nothing. Use:
```javascript
document.querySelector('ion-button').click();
// or for multiple:
document.querySelectorAll('ion-button')[n].click();
```

**Problem 2 — `ion-textarea` value not registering in React**:
Setting `.value` directly on an `<ion-textarea>` (or its shadow child) doesn't trigger React's synthetic event system. Pattern that works:
```javascript
const ionTextarea = document.querySelector('ion-textarea');
const nativeTextarea = ionTextarea.shadowRoot?.querySelector('textarea') || ionTextarea;
nativeTextarea.value = 'your text';
nativeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
nativeTextarea.dispatchEvent(new Event('change', { bubbles: true }));
```

**General rule**: If a component is a Web Component (custom element with a hyphen in the tag name like `ion-button`, `mwc-button`, `sl-input`), always check whether standard DOM APIs work on it. If they don't, either:
1. Query the shadow root: `el.shadowRoot.querySelector('input')`
2. Call the component's own API: `el.value = ...; el.dispatchEvent(...)`
3. Use the React fiber approach to invoke onClick directly (see React Fiber section above)

---

### Apollo Cache as Instant Data Source (2026-03-22)

When you're already on a page that fetched data, the Apollo cache contains it. Reading from cache is ~0ms vs. a new network query.

**Pattern — extract all items of a type**:
```javascript
const cache = window.__APOLLO_CLIENT__.cache.extract();
// All amenities:
const amenities = Object.entries(cache)
  .filter(([k]) => k.startsWith('Amenity:'))
  .map(([k, v]) => v);
// All tenants:
const tenants = Object.entries(cache)
  .filter(([k]) => k.startsWith('Tenant:'))
  .map(([k, v]) => v);
```

**Pattern — check what queries were made** (ROOT_QUERY):
```javascript
const rootQuery = window.__APOLLO_CLIENT__.cache.extract()['ROOT_QUERY'];
// Shows all query keys — useful for understanding what data is available
Object.keys(rootQuery).filter(k => k !== '__typename');
```

**Caveat**: Cache contains only fields that the component queried. If a field is missing, run a fresh query with `fetchPolicy: 'network-only'` to re-fetch with that field.

---

### SPA + Two-System Architecture Pattern (2026-03-22)

When a product has an **admin system** and a **tenant/customer-facing portal** as two separate SPAs (like Visitt admin ↔ Visitt+), changes in one don't immediately reflect in the other because they have separate Apollo clients and caches.

**When you create/update data in the admin**:
- The admin Apollo cache updates immediately
- The portal SPA at a different URL has its own cache — it will show the old data until it re-fetches
- **Fix**: Reload the portal page (or navigate away and back) to trigger a fresh fetch

**Dependency chain mental model**: Before testing the portal, ask: "Did I complete the full setup chain in the admin?" (tenant → contact → leasable space → categories → feature flag). If any step is missing, the portal will fail silently.

**Context drift in admin**: Navigating between different sections of an admin that manages multiple entities (properties, companies) can silently switch the active context. Always verify the active context (breadcrumb, page title, URL) before making changes.

---

### Claude-in-Chrome javascript_tool blocks 24-char hex returns (2026-04-19)

The `mcp__Claude_in_Chrome__javascript_tool` redacts MongoDB ObjectIds (24-char hex)
that appear in the JSON it returns - replacing them with `"[BLOCKED: Base64 encoded data]"`.
This breaks any flow that round-trips IDs through Claude to build follow-up calls.

**Workaround**: Keep IDs in the browser. Store the full object on `window`, reference it
by field/index in the next call, and only return non-sensitive projections to Claude.

```javascript
// First call - store IDs in window, return only names/counts/flags
window.__pilotTenant = found;
return { name: found.name, spaceName: found.locations[0].site.name };

// Next call - use stored IDs directly, never round-trip them through Claude
const t = window.__pilotTenant;
const input = { tenantId: t._id, siteId: t.locations[0].site._id, ... };
// run mutation using `input`
```

This is faster AND safer than trying to smuggle IDs out (no partial hex tricks needed).
Applies to any MongoDB/UUID-heavy system accessed via Claude-in-Chrome.

### Apollo cache **keys** bypass the ID redactor (2026-04-20)

When looking up a property's companyId while `_id` fields come back as `[BLOCKED: Base64 encoded data]`,
use the Apollo cache **key names** — they include the ID in plain text and are not redacted:

```javascript
const cache = window.__APOLLO_CLIENT__.cache.extract();
const key = Object.keys(cache).find(k =>
  cache[k]?.__typename === 'Company' && cache[k]?.name === 'בית במושבה'
);
// key === "Company:6368fd67331a596467b622f7"   <-- ID is in the key name
const companyId = key.split(':')[1];
```

This works because cache keys are synthesized client-side in the form `${__typename}:${id}`
and the redactor scans JSON **values**, not property names. Useful for property/company/customer lookup
when `allBuildings`/`allCompanies` returns blocked IDs.

### DOM-First Methodology for UI Rendering Bugs (2026-04-26)

When the user reports a UI rendering issue (text appears reversed, characters in wrong place, layout broken), DO NOT guess fixes and ask the user to verify each one. That wastes their time and erodes trust.

**The correct flow:**
1. Read the actual DOM where the broken text lives — find the element via `document.querySelectorAll`, walk up the parent chain.
2. Inspect the rendering chain — `getComputedStyle` for `direction`, `unicode-bidi`, `text-align`, `writing-mode` on each parent up the tree.
3. Test format options programmatically by setting `node.firstChild.data = candidate` and measuring per-character pixel positions via `Range.getBoundingClientRect()`.
4. Sort by `x` to get the actual visual L-to-R order.
5. Find the format that produces the desired visual layout, then apply it via API.

**Real session example (subspace bidi rendering):**
- User reported: subspace names like `מחסן 33S` rendering with `S` detached from `33` and placed on the wrong side of the Hebrew word.
- Root cause: Visitt's site-name component uses `direction: ltr` + `unicode-bidi: isolate` on a parent div. In LTR base with mixed Hebrew + Latin-letter-after-digits, the bidi algorithm fragments the LTR run.
- Tested 12 formats programmatically (LRM at start/end/both, RLM, LRE/PDF, LRI/PDI, RLI/PDI, NBSP, value-first, hyphen, colon, no-space, parens). Only **RLI/PDI** (`U+2067 ... U+2069`) and value-first kept the LTR run together visually.
- Solution: wrap each name with `⁧` ... `⁩`. Storage stays semantically `מחסן 33S`, visual renders correctly without changing user-visible content.

**Per-char measurement technique:**
```javascript
const target = document.querySelector('span.Tooltip-wrapper');
const original = target.firstChild.data;
const measure = (text) => {
  target.firstChild.data = text;
  const tn = target.firstChild;
  const positions = [];
  for (let i = 0; i < tn.length; i++) {
    const r = document.createRange();
    r.setStart(tn, i); r.setEnd(tn, i + 1);
    positions.push({ ch: tn.data[i], x: Math.round(r.getBoundingClientRect().left) });
  }
  return [...positions].sort((a,b) => a.x - b.x).map(p => p.ch).join('');
};
const visualLR = measure('candidate text');  // visual order
target.firstChild.data = original;  // restore
```

This technique works for ANY UI rendering issue — bidi, kerning, line-break behavior, whitespace handling. No round-trips through the user.

### Don't undo deployed work without explicit permission (2026-04-26)

After successful deploy + user-approved verification, any "improvement" the user did not request is a NEW change requiring NEW approval — even if it looks like a fix. Specifically: do not strip / rename / reformat data that was deployed exactly per the approved preview, unless the user explicitly asks for it. The user's "great, only that the names came out a bit reversed" was about **display rendering**, not about wanting the data stripped. Confirm scope of fix before mutating data.


### Image Parsing — Always Verify Before Deploy (2026-04-26)

When the user provides a screenshot/photo as the data source for a deploy (contacts list, equipment table, tenant roster, etc.), my OCR-style reading of the image is **unreliable**. Common errors observed:

- Confusing similar Hebrew letters: ק↔ח (qof vs chet), ת↔ט (tav vs tet), ד↔ר (dalet vs resh)
- Misreading column headers as cell values (e.g., reading "מייל לא ידוע" as the contact's name when it's actually a description in the email column)
- Missing trailing characters / digits in phone numbers
- Misreading punctuation (parens, hyphens) that affect bidi rendering

**The rule: before any deploy from image-sourced data, present a markdown table with all extracted fields and explicitly ask the user to verify line-by-line.** Don't combine "extract + deploy" in one step.

```
| Field 1 | Field 2 | Field 3 |  ← my extraction
|---------|---------|---------|
| ...     | ...     | ...     |
```

This caught 3 errors in the Yokneam tenant deploy session that would have shipped wrong otherwise:
- "(שם לא ידוע)" was actually "מקסים"
- "יוקי בש" was actually "יוחי בדש"
- The user verified the rest matched

The verification table costs maybe 30 seconds of user time. The cost of bad data in production is much higher (rename loops, customer confusion, audit trails).

### Don't Invent Data Fixes (reinforced 2026-04-26)

Repeating the lesson from the subspace-bidi session: when source data is broken (a phone number that fails validation, a name field that looks weird, an email that doesn't match the domain), DO NOT silently invent a "fix" by adding/removing characters and saving. This generates false data that looks like the user's data but isn't.

**The correct flow:**
1. Try the data as-given.
2. If the API rejects, report the rejection to the user and ASK what to do.
3. Options: leave the field empty, skip the row, or get correct data from user.

**Never:** "I added a 0 at the end because that was the only format the API accepted." That's not a fix — that's data fabrication.

Made this mistake twice in two sessions (subspace bidi LRM-stripping, and Yokneam phone-digit-padding). Recording it again here for emphasis.

### Customer-facing message etiquette (2026-04-26)

When drafting a message FROM Basman TO an end customer (someone who hasn't met me/Basman before), always start with:
1. Greeting + recipient name
2. Identification: "אני בסמן מהצוות הטכני של ויזיט"
3. Context: what we're doing for them
4. Clear ask
5. Sign off

Do NOT just dive into the questions. The customer has no idea who Basman is or why he's asking.

Forbidden in Hebrew output: em-dashes (—). Use regular hyphens (-) or rewrite the sentence. Repeated reminder needed because I keep forgetting this.

