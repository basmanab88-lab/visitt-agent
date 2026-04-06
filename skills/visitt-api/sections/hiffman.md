# Visitt API — Hiffman National (Client-Specific)

### Template IDs (Hiffman National — constant)
| Inspection Name | Template ID |
|---|---|
| *Hiffman - Rent Roll Review | `6971c3893ac06b4ffceec582` |
| *Hiffman - Exterior (Industrial) | `6971c307efbab709fcd6a570` |
| *Hiffman - Exterior (Office) | `6971c307efbab709fcd6a571` |
| *Hiffman - Interior (Industrial) | `6971c307efbab709fcd6a573` |
| *Hiffman - Interior (Office) | `6971c307efbab709fcd6a56f` |

### templates query (to discover template IDs)
```graphql
query {
  templates(input: { customerId: "hiffman_national", type: assignment }, limit: 50, skip: 0) {
    templates { _id name }
  }
}
```

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
```javascript
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

## Extended Template IDs — Hiffman National (verified 2026-04-01)

[supersedes 2026-03-31 partial list]

Full template table including Vacancy, Move In/Out, and other types not in previous list:

| Template Name | Template ID | Notes |
|---|---|---|
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
```json
{
  "skip": 0,
  "limit": 40,
  "input": {
    "customerId": "hiffman_national",
    "type": "assignment",
    "search": ""
NOTE: The inline format `templates(input: { customerId: "...", type: assignment }, ...)` also works but the variable-based format is more reliable.

