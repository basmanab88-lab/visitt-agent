# Visitt API — Tenants & Contacts

### setTenant
Creates or updates a tenant. Also used to assign spaces (leased/authorized) and contacts to a tenant.
```graphql
mutation setTenant($input: TenantInput!) {
  setTenant(input: $input) {
    _id
    name
  }
}
```
**Variables (create minimal):**
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "name": "Tenant Company Name",
    "locations": [],
    "contacts": []
**Variables (full update Ã¢ÂÂ verified 2026-03-20):**
    "tenantId": "TENANT_ID",
    "name": "Cyberdyne Systems",
    "tenantCode": "",
    "billingCompanyName": "",
    "billingContactName": "",
    "billingAddress": "",
    "isTaxExempt": false,
    "locations": [
      {
        "buildingId": "BUILDING_ID",
        "siteId": "SITE_ID",
        "isLeased": true
      }
    ],
    "contacts": [
        "_id": "CONTACT_ID",
        "roles": []
    ]
**Key notes:**
- `setTenant` is used for BOTH create and update. Include `tenantId` field to update existing.
- `locations[].isLeased: true` Ã¢ÂÂ Leased space (exclusive use). `isLeased: false` Ã¢ÂÂ Authorized space (work order creation rights only).
- `contacts[].roles` Ã¢ÂÂ admin roles for the contact within this tenant. Empty array = regular contact.
- **IMPORTANT**: `setTenant` replaces the ENTIRE tenant. When updating locations, include ALL existing contacts in the `contacts` array, and vice versa Ã¢ÂÂ omitting them removes them.
- Space options are fetched via `allSites` query: `{input: {companyId: "PROPERTY_ID"}}`

### addContacts
Creates one or more contacts. Can link directly to a tenant during creation. Ã¢ÂÂ verified 2026-03-20
mutation addContacts($input: [ContactInput!]!) {
  addContacts(input: $input) {
    email
    phone
**Variables (full Ã¢ÂÂ verified 2026-03-20):**
  "input": [
    {
      "companyId": "PROPERTY_ID",
      "name": "John Connor",
      "phone": "+972501234567",
      "email": "john@example.com",
      "extraInfo": "",
      "tenants": [
        {
          "_id": "TENANT_ID",
          "isAdmin": false
        }
      ],
      "locations": [],
      "supervisedContactIds": []
    }
  ]
- `tenants[].isAdmin: true` makes the contact an admin for that tenant (can manage work orders in Visitt+)
- `locations` Ã¢ÂÂ `[ContactLocationInput]` Ã¢ÂÂ optional building/space-level assignment, use `[]` if not needed
- `supervisedContactIds` Ã¢ÂÂ contacts this person supervises, use `[]` if not needed
- Batch: pass multiple objects in the `input` array to create many contacts at once
- After creation, if invite toggle is ON, a `createBroadcast` fires automatically with welcome email template `"not_invited_to_portal_contacts"`
- Global contacts URL: `/tenants#contacts`; per-tenant contacts: `/tenant/<id>?activeSideMenuItem=contacts`
- **Phone validation (2026-03-21):** The API validates Israeli phones with libphonenumber. Format MUST be `+97250XXXXXXX` / `+97252XXXXXXX` / `+97254XXXXXXX` (9 digits after +972). Sub-ranges like `052-1XXXXXX` (`+9725[12]1XXXXXX`) may fail validation Ã¢ÂÂ they're unallocated. **Always test one contact first before batching 50.** Use distinct test emails/phones (e.g. `_test_@...`) to avoid polluting the system with dummy contacts that then block real ones via duplicate-phone/email check.

### tenants (internal query Ã¢ÂÂ verified 2026-03-21)
Get all tenants for a property. Note: uses `input: TenantSearchInput!` (not direct args).
query tenants($input: TenantSearchInput!) {
  tenants(input: $input) {
    tenants { _id name }
**Variables:** `{ "input": { "companyId": "PROPERTY_ID" } }`
- `TenantSearchInput` does NOT accept `limit` or `skip` fields
- Returns `PaginatedTenants { tenants[] }` Ã¢ÂÂ no `total` field

### Getting leasable sites via Apollo cache (fallback Ã¢ÂÂ 2026-03-21)
When `allSites` queries return empty (schema mismatch or missing buildingId), extract from Apollo cache instead:
```javascript
const ac = window.__APOLLO_CLIENT__;
const cache = ac.cache.extract();
const buildingId = 'YOUR_BUILDING_ID';
const leasable = [];
for (const [key, val] of Object.entries(cache)) {
  if (!key.startsWith('Site:')) continue;
  if (JSON.stringify(val).includes(buildingId) && val.modelType === 'leasable_site') {
    leasable.push({ _id: key.replace('Site:', ''), name: val.name });
// Store: window.__leasableSites = leasable;
This works when already navigated to the building page (cache is pre-populated from UI queries). IDs extracted this way are valid for `setTenant locations[].siteId`.

### Other useful mutations discovered in code:
- `updateBuilding` Ã¢ÂÂ UpdateBuildingInput!
- `updateSite` Ã¢ÂÂ siteId: String!, input: UpdateSiteInput!
- `deleteSites` Ã¢ÂÂ deletes spaces/equipment
- `archiveBuilding` Ã¢ÂÂ buildingId, companyId, isAutoResolve
- `changeSitesBuilding` Ã¢ÂÂ move sites between buildings
- `changeSitesLocation` Ã¢ÂÂ move sites between floors
- `updateContact` Ã¢ÂÂ contactId: String!, input: ContactInput!
- `archiveContact` / `unarchiveContact` Ã¢ÂÂ contactId: String!
- `deleteTenant` Ã¢ÂÂ tenantId: String!
- `makeSpacesLeasable` (updateSitesModelType) Ã¢ÂÂ siteIds: [String]!, modelType: String!


### tenants (list all tenants for a property) Ã¢ÂÂ verified 2026-03-20
query tenants($input: TenantsSearchInput!) {
    status
    isActive
    tenantCode

### tenant (single tenant detail) Ã¢ÂÂ verified 2026-03-20
query tenant($tenantId: String!) {
  tenant(tenantId: $tenantId) {
    companyId
    admins { _id name email phone }
    contacts { _id name email phone }
    locations { buildingId siteId isLeased }

### contacts (list contacts with filtering) Ã¢ÂÂ verified 2026-03-20
query contacts($input: ContactSearchInput!, $skip: Int!, $limit: Int!) {
  contacts(input: $input, skip: $skip, limit: $limit) {
    contacts { _id name phone email isArchived }
    hasNext
    totalCount
**Variables:**
  "skip": 0,
  "limit": 40,
    "status": null,
    "inviteStatus": [],
    "search": "",
    "isArchived": false
Filter by tenant: add `"tenantId": "TENANT_ID"` to the input object.


### sitesSearch (paginated space search with filtering) Ã¢ÂÂ verified 2026-03-20
query sitesSearch($input: SitesSearchInput, $skip: Int!, $limit: Int!, $sortBy: String, $sortDirection: String) {
  sitesSearch(input: $input, skip: $skip, limit: $limit, sortBy: $sortBy, sortDirection: $sortDirection) {
    modelType
    buildingId
    buildingName
    parentBranches { _id name }
    tenant { _id }
  "limit": 50,
  "sortBy": "parentBranches",
  "sortDirection": "ASC",
    "modelType": ["site", "leasable_site"],
    "buildingId": "BUILDING_ID",
    "parentBranchIds": null,
    "type": [],
    "groupByBuilding": false


## Leasable Spaces Ã¢ÂÂ Full Concept Guide (verified 2026-03-21)

### What is a Leasable Space?

A **leasable space** is a space with `modelType: "leasable_site"`. It represents a Suite (commercial) or Residential Unit that a tenant can occupy exclusively.

**Space types:**
- `modelType: "leasable_site"` Ã¢ÂÂ Leasable space Ã¢ÂÂ can be leased or left vacant
- `modelType: "site"` Ã¢ÂÂ Regular space Ã¢ÂÂ common areas, technical rooms, etc.
- `modelType: "equipment"` Ã¢ÂÂ Equipment item

**Leasable space statuses (from UI perspective):**
- **Leased** = a leasable space currently assigned to a tenant with `isLeased: true`
- **Vacant** = a leasable space not assigned to any tenant

**Key rules (from product-release Slack, Aug 2024):**
- A leasable space can only be LEASED by ONE tenant (exclusive)
- A leasable space can be set as AUTHORIZED for other tenants (for work order creation on sub-leased spaces)
- This was confirmed in Jan 2026: "Leasable spaces can still only be leased by a single tenant, but they can now also be set as authorized spaces for other tenants"

### Connecting Tenants to Leasable Spaces

Use `setTenant` mutation with `locations` array:
- `isLeased: true` Ã¢ÂÂ Leased space (exclusive occupancy, primary space for tenant)
- `isLeased: false` Ã¢ÂÂ Authorized space (WO creation rights, not exclusive)

**IMPORTANT**: `setTenant` replaces the ENTIRE tenant Ã¢ÂÂ always include ALL existing locations + contacts.

### tenants (plural) query Ã¢ÂÂ locations field uses NESTED objects (2026-03-21)
The `tenants` plural query returns locations with nested objects (NOT flat fields):
    tenants {
      _id name
      locations {
        site { _id name }
        building { _id }
        isLeased
      contacts { _id }
**NOTE**: This is DIFFERENT from the `tenant` (singular) query which uses flat `{ buildingId siteId isLeased }`.
If you query locations in the plural `tenants` query using flat fields, you get `GRAPHQL_VALIDATION_FAILED`.

### buildings query Ã¢ÂÂ correct syntax (2026-03-21)
The `buildings` query (NOT `allBuildings`) requires `limit` and `skip`:
query { buildings(companyId: "PROPERTY_ID", limit: 10, skip: 0) { buildings { _id name } } }
- Returns `PaginatedBuildings { buildings[] }`
- `limit` and `skip` are REQUIRED Ã¢ÂÂ omitting either causes validation error
- The old `allBuildings` pattern in docs above may be outdated Ã¢ÂÂ use `buildings` with pagination args

### allSites for leasable spaces Ã¢ÂÂ use building(buildingId) NOT allSites (2026-03-22)

> Ã¢ÂÂ Ã¯Â¸Â **CORRECTION**: `allSites(input: { buildingId })` causes `GRAPHQL_VALIDATION_FAILED`. `buildingId` is NOT a valid field in `SitesSearchInput`. Use the `building(buildingId)` query instead:

// CORRECT way to get leasable spaces for a building
const res = await fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: `query { building(buildingId: "BUILDING_ID") { sites { _id name modelType } } }`
  })
}).then(r => r.json());
const leasable = res.data.building.sites.filter(s => s.modelType === 'leasable_site');

Alternatively, if you're already on the building page in the browser, read from Apollo cache (faster, no extra fetch):
const cache = window.__APOLLO_CLIENT__.cache.extract();
const leasable = Object.entries(cache)
  .filter(([k, v]) => k.startsWith('Site:') && v.modelType === 'leasable_site')
  .map(([k, v]) => ({ _id: v._id, name: v.name }));

---

### Rename tenant + rename space pattern (verified 2026-04-19, production)

Task: rename a tenant AND its leased space in one pass. Verified on מתחם תש"ח
(companyId: 69bbf32a22a9764e3bb59c19), one pilot then bulk over 70 units.

Two mutations, run in any order:

1. Rename the space (the apartment/suite):
```graphql
mutation updateSite($siteId: String!, $input: UpdateSiteInput!) {
  updateSite(siteId: $siteId, input: $input) { _id name }
}
```
Minimal input works: `{ "name": "New Space Name" }`. Other UpdateSiteInput fields
(type, parentBranches, modelType, buildingName) are optional for rename. Confirmed
by running on a leasable_site with only `{name}` - no other field required, no
side effects on tenant linkage or isLeased flag.

2. Rename the tenant (setTenant replaces ENTIRE tenant - must include full locations+contacts):
```javascript
const input = {
  tenantId: t._id,
  companyId: "PROPERTY_ID",
  name: "New Tenant Name",
  tenantCode: "",
  billingCompanyName: "",
  billingContactName: "",
  billingAddress: "",
  isTaxExempt: false,
  locations: t.locations.map(l => ({
    buildingId: l.building._id,
    siteId: l.site._id,
    isLeased: l.isLeased
  })),
  contacts: t.contacts.map(c => ({ _id: c._id, roles: [] }))
};
// fetch setTenant with { input }
```

**Gotchas verified by post-mutation query:**
- Contacts (name, phone, email) remain attached and intact
- isLeased flag preserved
- No duplicate tenant created
- Total tenants count unchanged after rename

**Pattern to fetch targets first:**
```graphql
query tenants($input: TenantSearchInput!) {
  tenants(input: $input) {
    tenants {
      _id name
      locations { site { _id name } building { _id } isLeased }
      contacts { _id }
    }
  }
}
```
Variables: `{ "input": { "companyId": "PROPERTY_ID" } }`.
Note: TenantSearchInput (singular), NOT TenantsSearchInput. Both exist in schema;
using the plural one for this query returns GRAPHQL_VALIDATION_FAILED "Invalid query".

**Bulk performance:** 70 units × 2 mutations = 140 calls, ran clean at 400ms delay.

---

### Tenants + Contacts WITHOUT phone/email (verified 2026-04-20, production)

Task: create tenants and their contacts when customer provides NAMES ONLY (no phone, no email).
Verified on קרסו חדרה (companyId: `68db9312c6dcec3d08b55c26`), 16 tenants + 15 contacts, 0 failures.

**Key finding:** `addContacts` accepts `phone: ""` and `email: ""` without validation rejection.
Server returns `phone: null` and `email: null` in the response. No placeholder needed.
Contacts created this way can't be invited to the portal (no delivery channel) but they show up
in the tenant's contacts list normally.

**Recommended flow: tenant-then-contact (NOT setTenant with contacts[])**

When creating NEW tenants with NEW contacts, do NOT try to pass contacts in setTenant's
`contacts` array — those require `_id` which doesn't exist yet for new contacts. Instead:

1. `setTenant` — create the tenant with `contacts: []`, `locations: []`. Capture `tenantId`.
2. `addContacts` — create the contact linked via `tenants: [{ _id: tenantId, isAdmin: false }]`.

This pattern also lets the contact's archivable lifecycle stay independent of the tenant's.

**Pilot-first-then-batch is mandatory on production.** Always create ONE tenant + contact pair
first, confirm success, then loop the rest. Caught no issues this time but the rule stood up on
מתחם תש"ח rename session (2026-04-19) where pilot caught a bug before bulk.

**API shapes used (copy-paste ready):**
```javascript
// setTenant (minimal — empty tenant)
{
  input: {
    companyId: PROPERTY_ID,
    name: "Tenant Name",
    tenantCode: "", billingCompanyName: "", billingContactName: "",
    billingAddress: "", isTaxExempt: false,
    locations: [], contacts: []
  }
}

// addContacts (one contact, name-only, linked to tenant)
{
  input: [{
    companyId: PROPERTY_ID,
    name: "Contact Name",
    phone: "", email: "",
    extraInfo: "",
    tenants: [{ _id: TENANT_ID, isAdmin: false }],
    locations: [], supervisedContactIds: []
  }]
}
```

**Bulk performance:** 16 tenants × 2 mutations (setTenant + addContacts) + 1 pilot-only tenant
= 31 mutations ran clean at 400ms delay. ~15 seconds total.

**When the customer didn't mark space assignments:** create tenants WITHOUT locations
(`locations: []`). You can add locations later with another setTenant call — but remember
setTenant replaces the entire tenant, so you must re-include contacts in that later call.

---



## setTenant accepts regular `site` modelType (verified 2026-04-26 Yokneam)

`setTenant` `locations[].siteId` accepts BOTH `modelType: "leasable_site"` AND `modelType: "site"` (regular site). No need to call `makeSpacesLeasable` first to convert.

Verified by: created `_TEST_TENANT_DELETE_ME_` linking to a regular `site` ("פראגון"), succeeded, then `deleteTenant`. Cleanup confirmed.

```javascript
// Works fine - no need to convert space type first
setTenant({ input: { 
  companyId, 
  name: "Tenant Name",
  locations: [{ buildingId, siteId: REGULAR_SITE_ID, isLeased: true }],
  contacts: []
}})
```

This unblocks bulk tenant deployment for properties where most spaces are `modelType: "site"` rather than `leasable_site`.

## Orphan contact failure — always verify tenant link after addContacts (verified 2026-04-26)

When creating contacts with `addContacts` and a `tenants[]` link, the API may silently return success but leave the contact **orphaned** (no tenant linkage). Cause is unclear — possibly an issue with special characters in the tenant name (hyphens + English mixed: e.g., `"שפיירא-SMART SOLUTIONS-נורלמן"`). Hash-key lookup in JS may produce phantom mismatches.

**Symptom:** `addContacts` returns success, contact exists in `contacts` query, but the `tenants` field on the contact is `[]`, and the corresponding tenant's `contacts` field doesn't include it.

**Mitigation:**
1. After bulk `addContacts`, query each tenant's contacts to verify count matches expected.
2. If orphans found, use `updateContact` with the correct `tenants: [{ _id: tenantId, isAdmin: false }]` to relink.

```javascript
// Verification query
const r = await fetch('/graphql', {
  body: JSON.stringify({
    query: `query contacts($input: ContactSearchInput!, $skip: Int!, $limit: Int!) {
      contacts(input: $input, skip: $skip, limit: $limit) {
        contacts { _id name tenants { _id name } }
      }
    }`,
    variables: { input: { companyId, isArchived: false }, skip: 0, limit: 100 }
  })
}).then(r => r.json());
// orphan = contacts with tenants.length === 0
```

## Anomaly: name field substitution at create time (open question, 2026-04-26)

Single observed case: created contact with input `name: '(שם לא ידוע)'`, contact was saved with `name: 'שיר '` (with trailing space). Cannot reproduce reliably. Possibly: server-side substitution rule on the parens char `(` triggers some text-replace logic in Visitt's contacts pipeline. Safe practice: don't use parentheses in contact names; use plain text or skip the field.

