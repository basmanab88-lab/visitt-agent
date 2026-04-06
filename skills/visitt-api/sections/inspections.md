# Visitt API — Inspections (Assignments)

### createAssignment (Inspections) Ã¢ÂÂ verified 2026-03-20

Inspections are called "assignments" in the API. One mutation handles all frequency types.

```graphql
mutation createAssignment($input: CreateAssignmentInput!) {
  createAssignment(input: $input) {
    _id
    name
    interval
    __typename
  }
}
```

**Full variables example (Weekly):**
```json
{
  "input": {
    "name": "Weekly Lobby Check",
    "interval": "week",
    "daysInWeek": [0, 1, 2, 3, 4],
    "customFrequency": 1,
    "startDate": "2026-03-23T22:00:00.000Z",
    "categoryId": "",
    "description": "",
    "isGpsRequired": false,
    "items": [
      {
        "_id": "_ASSIGNMENT_ITEM_TEMP_ID_<timestamp><random>",
        "type": "sites_tasks",
        "subItems": [
          {
            "_id": "_ASSIGNMENT_ITEM_TEMP_ID_<timestamp>_<random>",
            "name": "Check cleanliness",
            "type": "text"
          }
        ],
        "siteIds": ["<siteId>"]
      }
    ],
    "siteIds": ["<siteId>"],
    "buildingIds": ["<buildingId>"],
    "plannedInInterval": 0,
    "companyId": "<companyId>",
    "assignedUserIds": [],
    "rrule": null,
    "completionEndOfUnit": "week",
    "completionPolicy": "end_of_unit"

**Interval values (frequency Ã¢ÂÂ API value):**
| UI Label | `interval` value | `daysInWeek` | `completionEndOfUnit` |
|----------|-----------------|--------------|----------------------|
| Hourly | `"hour"` | all days | `"hour"` |
| Daily | `"day"` | `[0,1,2,3,4,5,6]` | `"day"` |
| Weekly | `"week"` | `[0,1,2,3,4]` | `"week"` |
| Every two weeks | `"2week"` | `[0,1,2,3,4]` | `"week"` |
| Monthly | `"month"` | `[]` | `"month"` |
| Every 2 months | `"2month"` | `[]` | `"month"` |
| Every 3 months | `"3month"` | `[]` | `"month"` |
| Every 4 months | `"4month"` | `[]` | `"month"` |
| Every 6 months | `"6month"` | `[]` | `"month"` |
| Annual | `"year"` | `[]` | `"year"` |
| Custom | `"custom"` | varies | varies |

Note: Only `"week"` confirmed by capture. Others inferred from pattern Ã¢ÂÂ verify if they fail.

**Task types (`subItems[].type`):**
| UI Label | API type |
|----------|---------|
| Text | `"text"` |
| Number | `"numeric"` |
| Checkbox | `"checkbox"` |
| Section title | `"section_header"` |
| Multiple choice | `"multiple_choice"` |
| Signature | `"signature"` |
| QR scan | `"qr_scan"` |

**Temp ID format:** Generate unique IDs using `_ASSIGNMENT_ITEM_TEMP_ID_${Date.now()}${Math.random().toString(36).slice(2,14)}`. The parent item and each subItem need separate IDs.

**Multi-space inspections:** Include all siteIds from all item groups in the top-level `siteIds` array. Create separate `items` entries per space group if different tasks are needed per space.

**UI URL:** `/assignments#manageVisits` Ã¢ÂÂ Inspections list page. Use `#openVisits` for currently open inspections, `#manageVisits` for all inspection templates.

**Bulk creation pattern (20 inspections in ~10s):**
```javascript
const CREATE_ASSIGNMENT = `mutation createAssignment($input: CreateAssignmentInput!) {
  createAssignment(input: $input) { _id name interval __typename }
}`;

const tempId = () => `_ASSIGNMENT_ITEM_TEMP_ID_${Date.now()}${Math.random().toString(36).slice(2,14)}`;

const buildInput = (insp) => {
  const itemId = tempId();
  return {
    name: insp.name, interval: insp.interval, daysInWeek: insp.daysInWeek,
    customFrequency: 1, startDate: new Date().toISOString(),
    categoryId: "", description: "", isGpsRequired: false,
    items: [{ _id: itemId, type: "sites_tasks",
      subItems: insp.tasks.map(t => ({ _id: `${itemId}_${Math.random().toString(36).slice(2,8)}`, name: t.name, type: t.type })),
      siteIds: insp.siteIds }],
    siteIds: insp.siteIds, buildingIds: [BUILDING_ID], plannedInInterval: 0,
    companyId: COMPANY_ID, assignedUserIds: [], rrule: null,
    completionEndOfUnit: insp.completionEndOfUnit, completionPolicy: insp.completionPolicy
  };
};
// Loop with 400ms delay between each call

## createAssignment Ã¢ÂÂ CRITICAL Corrections (verified 2026-03-21)

**`completionPolicy: "end_of_unit"` FAILS** Ã¢ÂÂ error: "Missing inspection completion defenition of until end of unit"

Use `completionPolicy: "iso_duration"` + `completionISODuration` instead:
| Frequency | `interval` | `completionISODuration` |
|-----------|-----------|------------------------|
| Daily | `"day"` | `"PT24H"` Ã¢ÂÂ verified |
| Biweekly | `"biweekly"` | `"P14D"` (inferred, unverified) |
| Weekly | `"week"` | `"P7D"` (inferred, unverified) |
| Monthly | `"month"` | `"P1M"` (inferred, unverified) |

**Minimal working createAssignment (verified 2026-03-21):**
    "companyId": "PROPERTY_ID",
    "name": "Inspection Name",
    "interval": "day",
    "startDate": "2026-03-21",
    "siteIds": ["SITE_ID"],
    "daysInWeek": [0,1,2,3,4,5,6],
    "completionPolicy": "iso_duration",
    "completionISODuration": "PT24H",
    "plannedInInterval": 1,
    "items": [{ "type": "checkbox", "name": "Check item text" }]
Simple items: `{ type, name }` objects directly in `items` array Ã¢ÂÂ accepted by server (no `sites_tasks` wrapper needed for basic inspections).

**deleteAssignment returns String! Ã¢ÂÂ no subfields:**
mutation { deleteAssignment(assignmentId: "ASSIGNMENT_ID") }
# Ã¢ÂÂ WRONG: { deleteAssignment(...) { _id } }  Ã¢ÂÂ fails

**assignment query (single inspection by ID):**
query { assignment(assignmentId: "ID") {
  _id name interval completionPolicy completionISODuration plannedInInterval daysInWeek startDate
}}

### Missing-assignment check pattern (verified 2026-03-29)

To find which (property, user) pairs from a desired list are NOT yet assigned:
// 1. Fetch all users with companies
const users = await gql(`{ customer(customerId: "X") { allUsers(withDisabled: false) { _id name companies { _id } } } }`);
// 2. Build Set per userId
const userCompanies = {};
users.forEach(u => { userCompanies[u._id] = new Set(u.companies.map(c => c._id)); });
// 3. Cross-reference desired pairs
const missing = desiredPairs.filter(({ userId, companyId }) => !userCompanies[userId]?.has(companyId));
// 4. Run assignUserAccess only on missing pairs
This avoids over-assigning and runs only the truly missing ~5% of pairs.

### Apollo cache — extract data without network call (verified 2026-03-29)

When Apollo serves data from cache (no new network request made), access it via:
const cache = window.__APOLLO_CLIENT__.cache.data.data;
// All User objects:
const users = Object.entries(cache).filter(([k]) => k.startsWith('User:')).map(([,v]) => v);
// Customer's allUsers list (refs):
const rootQuery = cache['ROOT_QUERY'];
const customerRef = rootQuery['customer({"customerId":"hiffman_national"})']?.__ref;
const customerData = cache[customerRef];
const userRefs = customerData?.['allUsers({"withDisabled":false})'];
Note: `window.__APOLLO_CLIENT__` is available globally in the Visitt SPA.

### How to discover the correct mutation (fetch interceptor pattern)

When unsure which mutation a UI action calls:
const origFetch = window.fetch;
window.fetch = async (...args) => {
  if (args[0]?.includes?.('graphql')) {
    try { console.log('GQL:', JSON.parse(args[1]?.body)); } catch {}
  return origFetch(...args);
// Now perform the action in the UI — the mutation name appears in the console

## createAssignmentsFromTemplates — Batch Inspection Creation (verified 2026-03-31)

Creates inspections from existing templates. This is the preferred method for Hiffman bulk inspection deployment — faster and more reliable than `createAssignment` for template-based work.

### Mutation
mutation createAssignmentsFromTemplates($input: [CreateAssignmentFromTemplateInput!]!) {
  createAssignmentsFromTemplates(input: $input) {
    _id name __typename

### Input shape (per item)
  companyId: "company_id",           // from allCompanies
  templateId: "template_id",         // from templates query
  siteIds: ["whole_building_site_id"], // from allSites → "Whole Building"
  assignedUserIds: ["user_id"],      // from allUsers
  createAsPaused: false,
  plannedInInterval: 0,              // 0 for quarterly
  daysInWeek: null

### Template IDs (Hiffman National — constant)
| Inspection Name | Template ID |
|---|---|
| *Hiffman - Rent Roll Review | `6971c3893ac06b4ffceec582` |
| *Hiffman - Exterior (Industrial) | `6971c307efbab709fcd6a570` |
| *Hiffman - Exterior (Office) | `6971c307efbab709fcd6a571` |
| *Hiffman - Interior (Industrial) | `6971c307efbab709fcd6a573` |
| *Hiffman - Interior (Office) | `6971c307efbab709fcd6a56f` |

### templates query (to discover template IDs)
query {
  templates(input: { customerId: "hiffman_national", type: assignment }, limit: 50, skip: 0) {
    templates { _id name }

### CRITICAL: assignments query MUST include customerId
# CORRECT — returns results:
  assignments(input: { companyId: "XXX", customerId: "hiffman_national" }, limit: 500, skip: 0) {
    assignments { _id name isPaused }

# WRONG — returns 0 results!
  assignments(input: { companyId: "XXX" }, limit: 500, skip: 0) {
    assignments { _id name }
The `customerId` parameter is MANDATORY for `assignments` query. Without it, query returns empty array for all properties. This caused false "missing" reports in early sessions.

### categoryId filter in assignments query (verified 2026-04-05)
The UI uses `AssignmentsSearchInput` with a `categoryId: [String]` array filter. Use this to fetch only assignments of a specific category — much faster than fetching all and filtering client-side.
variables: {
  input: {
    customerId: "hiffman_national",
    categoryId: ["CATEGORY_ID"],  // array, not string
    isDeleted: false
  },
  skip: 0,
  limit: 500
Get the category ID first by fetching a small page of assignments and reading `assignment.category._id`. With 1,371 Inspection-category assignments across 540 Hiffman properties, this filter reduces fetching from 37,000+ to 1,371 in 3 pages.

### companyId in assignments query is [String] array
`companyId` accepts `[String]` (array), not a single string. Passing a single string causes a GraphQL validation error. Use: `companyId: ["ID1", "ID2"]` or omit entirely and rely on `customerId` alone.

### isPaused field
Use `isPaused` (boolean) on Assignment to check if an inspection exists but is inactive/paused. Other field names (`mode`, `status`, `paused`, `active`, `isActive`) do NOT exist on the Assignment type.

### Safe batch creation workflow (anti-duplicate pattern)
1. Build list of properties that need the inspection (from Google Sheet)
2. For EACH property, query `assignments(input: { companyId, customerId })` and check if inspection name already exists
3. Filter out any that already exist — this is the "double-check" step
4. Only create for verified-missing properties
5. Run in batches of 25 max
6. Spot-check 3-5 random properties after creation

This double-check saved 27 duplicates in one session (2026-03-31). Never skip it.

### Performance (2026-03-31)
- 129 inspections created: 5 batches × 25 + 1 × 4 = ~30 seconds total
- 8 inspections created: single batch = ~3 seconds
- 11 inspections created: single batch = ~4 seconds

### Helper queries for bulk operations
// Company name → ID mapping
const res = await fetch('/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `query { allCompanies(customerId: "hiffman_national") { _id name } }` })
});

// User name → ID mapping
  body: JSON.stringify({ query: `query { allUsers(customerId: "hiffman_national") { _id name } }` })
// Note: `firstName`/`lastName` fields do NOT exist on User type. Use `name` only.

// Site (Whole Building) for a company
  body: JSON.stringify({ query: `query { allSites(input: { companyId: "${cid}" }) { _id name } }` })
// Filter for: sites.find(s => s.name === "Whole Building")

## updateAssignmentsIsPaused — Bulk Pause/Unpause Inspections (verified 2026-04-01)

Pauses or unpauses (activates) inspections in bulk. Accepts an array of assignment IDs.

mutation updateAssignmentsIsPaused($assignmentIds: [String!]!, $isPaused: Boolean!) {
  updateAssignmentsIsPaused(assignmentIds: $assignmentIds, isPaused: $isPaused) {
    isPaused

### Variables
  assignmentIds: ["id1", "id2", "id3"],  // array of assignment _id values
  isPaused: false                         // false = activate, true = pause

### Discovery method
This mutation is NOT discoverable via introspection (blocked). It was found by:
1. Navigating to Manage Inspections tab
2. Clicking a paused inspection to open its side panel
3. Installing a fetch interceptor (`window.fetch` wrapper that logs mutation calls)
4. Clicking the "Activate" button → confirming the dialog
5. Reading `window.__capturedMutations` to capture the exact mutation name and variables

### Usage notes
- Can handle any number of IDs in a single call (tested with 9)
- Returns the updated assignments with their new `isPaused` value
- The UI shows "Activate" button for paused inspections and "Pause" for active ones
- No separate `resumeAssignment` or `togglePauseAssignment` mutation exists — this is the only one

## updateAssignment — Edit a Single Inspection (verified 2026-04-01)

mutation updateAssignment($assignmentId: String!, $input: UpdateAssignmentInput!) {
  updateAssignment(assignmentId: $assignmentId, input: $input) { _id name }

### Required fields in UpdateAssignmentInput
| Field | Type | Notes |
|---|---|---|
| `name` | `String!` | Inspection name |
| `interval` | `InspectionInterval!` | e.g. `"month"`, `"week"`, `"day"`, `"hour"`, `"custom"` |
| `startDate` | `Date!` | ISO 8601 date string |
| `siteIds` | `[String!]!` | Can be empty array `[]` |
| `completionPolicy` | required | e.g. `"end_of_unit"` — mutation fails with "Missing inspection completion policy" without it |
| `completionEndOfUnit` | required | e.g. `"month"`, `"week"`, `"day"` — match the interval |

### Optional fields
| `assignedUserIds` | `[String]` | Array of user IDs to assign. Use `allUsers(customerId)` to find IDs. |

### Example: assign a user to an existing inspection
await fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    query: `mutation updateAssignment($assignmentId: String!, $input: UpdateAssignmentInput!) {
      updateAssignment(assignmentId: $assignmentId, input: $input) { _id name }
    }`,
    variables: {
      assignmentId: "<assignment_id>",
      input: {
        name: "<current name>",
        interval: "<current interval>",
        startDate: "<current startDate>",
        siteIds: [],
        completionPolicy: "end_of_unit",
        completionEndOfUnit: "<match interval>",
        assignedUserIds: ["<user_id>"]
    }
  })

### Gotchas
- You MUST pass all required fields even if you're only changing `assignedUserIds`. Query the assignment first to get current values.
- `completionPolicy` + `completionEndOfUnit` are not returned by the `assignment` query but ARE required by the mutation. Use `"end_of_unit"` and match the interval.
- `assignedUserIds` is NOT a valid return field on Assignment type (query fails). Only use it as input.
- When assigning a user to ALL daily inspections of a property: query `assignments` with customerId → filter by `interval === "day"` → loop `updateAssignment` for each. Can use `Promise.all` for parallel execution (no delay needed for 5-10 items).
- Apollo cache trick: `window.__APOLLO_CLIENT__.cache.data.data['Company:COMPANY_ID'].customer.__ref` gives the customerId instantly without an API call.
- The Inspections page URL is `/assignments` (NOT `/inspections` — that returns 404).
- **`items` are NOT required in updateAssignment** — omitting them preserves existing tasks. Only pass items if you intend to modify them. (verified 2026-04-05)

### Performance (2026-04-01)
- 5 daily inspections bulk-assigned to a user: ~2 seconds (sequential with 300ms delay). Could be <1s with Promise.all.

## deleteAssignments — Delete Inspections (verified 2026-04-01)

mutation deleteAssignments($assignmentIds: [String!]!) {
  deleteAssignments(assignmentIds: $assignmentIds)

  assignmentIds: ["id1", "id2"]  // NOTE: parameter name is "assignmentIds", NOT "ids"
Returns array of deleted IDs. Use `restoreAssignments` (same signature) to undo.

## Extended Template IDs — Hiffman National (verified 2026-04-01)

[supersedes 2026-03-31 partial list]

Full template table including Vacancy, Move In/Out, and other types not in previous list:

| Template Name | Template ID | Notes |
| *Hiffman - Association/Land | `6971c307efbab709fcd6a56e` | |
| *Hiffman - Exterior (Industrial) | `6971c307efbab709fcd6a570` | |
| *Hiffman - Exterior (Office) | `6971c307efbab709fcd6a571` | |
| *Hiffman - Exterior (Retail) | `6971c307efbab709fcd6a572` | |
| *Hiffman - Interior (Industrial) | `6971c307efbab709fcd6a573` | |
| *Hiffman - Interior (Office) | `6971c307efbab709fcd6a56f` | |
| *Hiffman - Move In/Move Out (Industrial) - UPDATED | `6971c30c7a546d2b7cf4479f` | |
| *Hiffman - Move In/Move Out (Office) - UPDATED | `6971c30c7a546d2b7cf447a1` | |
| *Hiffman - Move In/Move Out (Retail) - UPDATED | `6971c30c7a546d2b7cf447a2` | |
| *Hiffman - Rent Roll Review | `6971c3893ac06b4ffceec582` | |
| *Hiffman - Vacancy (Industrial) - UPDATED | `6971c3a07a546d2b7cf4483f` | Was "Vacancy Inspection (Industrial)" |
| *Hiffman - Vacancy (Office) - UPDATED | `6971c3bb3ac06b4ffceec5a5` | Was "Vacancy Inspection" |
| *Hiffman - Vacancy (Retail) - UPDATED | `6971c3c07a546d2b7cf4485d` | |
| *Hiffman - Portfolio Info Update | `699def58b3b7cb375a9d4e30` | |

### GOTCHA: Template names ≠ old assignment names
As of ~March 2026, several templates were renamed with "- UPDATED" suffix. The created assignment inherits the TEMPLATE name, not the old name from the spreadsheet. For example:
- Sheet says: `*Hiffman - Vacancy Inspection (Industrial)` → Template creates: `*Hiffman - Vacancy (Industrial) - UPDATED`
- Sheet says: `*Hiffman - Move In/Move Out (Industrial)` → Template creates: `*Hiffman - Move In/Move Out (Industrial) - UPDATED`

When checking if an inspection exists, search by partial match (e.g., `name.includes('Vacancy')`) not exact match against the sheet value.

### templates query (variable-based — correct format)
The templates query requires variables, NOT inline arguments:
query templates($input: TemplateSearchInput!, $skip: Int!, $limit: Int!) {
  templates(input: $input, skip: $skip, limit: $limit) {
    totalCount
Variables:
  "skip": 0,
  "limit": 40,
    "customerId": "hiffman_national",
    "type": "assignment",
    "search": ""
NOTE: The inline format `templates(input: { customerId: "...", type: assignment }, ...)` also works but the variable-based format is more reliable.

