# Visitt API — Categories, Work Orders, Misc

### categories (get all categories for a company)
```graphql
query { allCategories(companyId: "COMPANY_ID") { _id name } }
```

### Category mutations Ã¢ÂÂ verified 2026-03-20
# Remove category from a property (unassign, not delete)
mutation { removeCategoryFromCompany(categoryId: "ID", companyId: "COMPANY_ID") }

# Delete a category globally
mutation { deleteCategory(categoryId: "ID") }

# Create a category (requires customerId, no color field)
mutation createCategory($input: CategoryInput!) {
  createCategory(input: $input) { _id name }
}
# Variables: { input: { name: "Fire Safety", companyId: "COMPANY_ID", customerId: "SLUG" } }

### Automation mutations Ã¢ÂÂ verified 2026-03-20
mutation createAutomation($input: AutomationInput!) {
  createAutomation(input: $input) { _id }
**CRITICAL automation rules:**
- `actionValue` is ALWAYS a string, even for JSON objects: `'{"number":4,"unit":"hours"}'`
- `eventFields` MUST include `companyId`: `{ companyId: "COMPANY_ID", categoryIds: [...] }`
- `triggerDelay` only for `issue_not_seen` / `issue_not_completed` events
- Category IDs must be fetched first Ã¢ÂÂ never assume names match IDs

## Category Management via API

Categories live at the account level (not property level). A category can be assigned to multiple properties. The hierarchy:
- Account Ã¢ÂÂ has categories
- Property Ã¢ÂÂ has assigned categories (subset of account categories)
- Categories can have subcategories (e.g., "Plumbing" Ã¢ÂÂ "Leak", "Clogged Drain")

To add a category to a property: use `assignCategory` (if it exists in the account) or `createCategory` (to create and assign in one step).

## File Upload

**Endpoint:** `POST https://partner-api.visitt.io/files`
**Method:** multipart/form-data
**Limits:** 20MB per file, 10 files per request, 20 requests/60 seconds
**Types:** images, PDF, video

Used when creating work orders with attachments.

## Webhooks

Subscribe to events and get notified via HTTPS POST. Verify webhook authenticity using HMAC SHA256 with your API token. Webhooks retry 12 times with exponential backoff if delivery fails.

## Rate Limits

Each token has per-operation rate limits. File upload is limited to 20 requests per 60 seconds. Plan batch operations accordingly Ã¢ÂÂ add delays between large batches.

## Common Patterns

### Batch create tenants
mutation {
  createTenant(input: {
    name: "John Doe"
    email: "john@example.com"
    phone: "+972501234567"
    unitId: "unit-id-here"
  }) {
    id
    name
  }
For bulk creation, loop through records and call createTenant for each. Respect rate limits.

### Query all tenants for a property
{
  tenants(filter: { propertyId: "property-id" }) {
    email
    unit { name }

## Demo Property Setup via API Ã¢ÂÂ Full Flow

This is the sequence for creating a complete demo property setup using the internal API:

1. insertBuilding  Ã¢ÂÂ get buildingId
2. upsertFloors    Ã¢ÂÂ create all floors at once (get floor IDs from response)
3. insertSite ÃÂN   Ã¢ÂÂ create spaces on each floor (modelType: "site")
4. insertSite ÃÂN   Ã¢ÂÂ create equipment on each floor (modelType: "equipment")
5. setTenant ÃÂN    Ã¢ÂÂ create tenants (get tenant IDs)
6. addContacts     Ã¢ÂÂ create contacts linked to tenants

**Estimated time:** ~10-20 seconds for a full property (vs 40-50 minutes via UI).

**Important IDs to know:**
- Skynet customer: companyId = `69bacea93772df3673fb6f57`, customerId = `skynet`
- These are for the staging environment. Production will differ.

## Edge Cases & Quirks

- **Internal API naming confusion:** `companyId` in mutations often means "property ID", not "company ID"
- `customerId` in insertBuilding is the customer's slug string (e.g., "skynet"), not an ObjectId
- Token (Partner API) is scoped to one company Ã¢ÂÂ you can't cross-query between companies
- Category deletion only works if the category isn't used by any property globally
- GraphQL errors return in the `errors` array, not as HTTP status codes
- Introspection is disabled on both APIs (Apollo Server config)
- `setTenant` is used for both create and update Ã¢ÂÂ presence of `_id` field determines which
- `insertSite` is the underlying mutation for ALL site types (spaces, equipment, floors) Ã¢ÂÂ `modelType` controls what type is created
- Floor `_id` in upsertFloors should be `dummy_id_N` for new floors; server generates real IDs
- The internal API uses the same `/graphql` endpoint for all operations; operationName helps with debugging

## Known Issues & Workarounds (updated 2026-03-19)

- **~~Spaces/equipment created without floor assignment~~ SOLVED:** Use `changeSitesLocation` after `insertSite`. See mutation docs above. Batch all siteIds per floor into one call.
- **Contact-tenant linking:** `ContactInput` requires `locations: []` but the format for assigning to a tenant is not `{ tenantId }`. Need to capture `ContactLocationInput` fields from UI.
- **Leasable spaces work:** Setting `modelType: "leasable_site"` correctly creates leasable spaces.
- **`companies` query requires pagination:** Must pass `limit: Int!` and `skip: Int!`. Response is nested: `data.companies.companies[]`. No `total` field on `PaginatedCompanies`.
- **Duplicate names:** When creating multiple entities with the same name (e.g., "ÃÂ©ÃÂÃÂ¨ÃÂÃÂªÃÂÃÂ" on different floors), track IDs carefully Ã¢ÂÂ `allSites` won't distinguish them by name alone. Use creation order or query after creation to map correctly.

---





## createWorkOrder Ã¢ÂÂ Internal API (verified 2026-03-21)

Work orders are created via the internal API at `/graphql`. Navigate to `/issues` first (or be on a property page) to ensure session context is set to the right property.

**Discovery method:** Intercepted by patching `window.fetch` on the `/issues` page after the page loaded. Apollo cached the ORIGINAL fetch reference at module load, but on this page the reference was live.

mutation createWorkOrder($input: CreateWorkOrderInput!) {
  createWorkOrder(input: $input) { _id }

**Full input Ã¢ÂÂ all discovered fields:**
```json
  "input": {
    "buildingId": "BUILDING_ID",
    "description": "Work order description here",
    "tenantId": null,
    "contactIds": [],
    "assignedUserIds": [],
    "checklist": null,
    "defectImages": [],
    "subCategoryId": "",
    "categoryId": "",
    "priority": null,
    "siteId": ""

**Key notes (2026-03-21):**
- `buildingId` is REQUIRED Ã¢ÂÂ omitting it causes DataLoader error ("The loader.load() function must be called with a value, but got: undefined")
- `description` is the only other required field (`String!`)
- `companyId`/`propertyId`/`locationId` are NOT valid fields Ã¢ÂÂ use `buildingId` instead
- The work order is automatically scoped to the property that owns the building
- Navigate to the property's work orders page first, then fire mutations Ã¢ÂÂ session context matters
- The `/issues/issue/create` URL opens the create dialog directly

**Batch creation script pattern:**
```javascript
const CREATE_WO = `mutation createWorkOrder($input: CreateWorkOrderInput!) {
}`;
// Get buildingId via: allBuildings(companyId: PROPERTY_ID) { _id }
// Then fire one mutation per work order with 400ms delay

## createAutomation Ã¢ÂÂ eventFields format correction (2026-03-21)

The `eventFields` format documented above (`{ companyId, categoryIds }`) is WRONG for the current API. The correct format discovered from Apollo cache inspection:

    "eventType": "newIssue",
    "eventFields": [{ "type": "companyId", "_id": "PROPERTY_ID" }],
    "action": "setPriority",
    "actionValue": "\"10\"",
    "isBasedOnOfficeHours": true

**Confirmed action values:**
- `setDefaultDueDate` Ã¢ÂÂ `actionValue: JSON.stringify({ number: 3, unit: 'days' })` e.g. `'{"number":3,"unit":"days"}'`
- `setPriority` Ã¢ÂÂ `actionValue: JSON.stringify('"10"')` = `'"10"'` (Low), `'"20"'` = Medium, `'"30"'` = High, `'"40"'` = Critical
- `setAssignedUsers` Ã¢ÂÂ `actionValue` = JSON array of user IDs

**Error: "Similar automation exists"** Ã¢ÂÂ The API rejects duplicate automation types per property. Check existing automations before creating.

**Fetch intercept gotcha (2026-03-21):** Apollo caches its fetch reference at module load. Replacing `window.fetch` after load misses Apollo mutations MOST of the time. However, on the `/issues` page, `createWorkOrder` WAS caught by a post-load `window.fetch` override Ã¢ÂÂ possibly because the work order mutation uses a different Apollo link or is batched differently. For `createAutomation`, the override did NOT work. To safely intercept mutations: use `window.__APOLLO_CLIENT__` for cache inspection, and probe input types iteratively with `variables: { input: {} }` error messages.









## Documents Mutations (2026-03-21, updated 2026-04-13)

### createDocument — verified 2026-04-13
```graphql
mutation createDocument($input: CreateDocumentInput!) {
  createDocument(input: $input) { _id name __typename }
}
```
Variables: `{ "input": { "companyId": "PROPERTY_ID", "name": "שם המסמך", "tagIds": [] } }`
- `tagIds` is **required** (pass `[]` if no tags)
- `startDate` is NOT a valid field in CreateDocumentInput — dates are added separately after creation
- Pass tag IDs in `tagIds` at creation time → no need for a separate updateDocumentTags call

### updateDocumentTags — verified 2026-04-13
```graphql
mutation updateDocumentTags($documentId: String!, $tagIds: [String]!) {
  updateDocumentTags(documentId: $documentId, tagIds: $tagIds) {
    _id tags { _id name color __typename } __typename
  }
}
```
Variables: `{ "documentId": "DOC_ID", "tagIds": ["TAG_ID"] }`
- Replaces ALL tags on the document — pass full desired list
- Pass `[]` to remove all tags

### documents query — verified 2026-04-13
```graphql
query { documents(input: { companyId: "PROPERTY_ID" }, skip: 0, limit: 100) { documents { _id name tags { _id name } } } }
```

### documentTags query — verified 2026-04-13
```graphql
query { documentTags(companyId: "PROPERTY_ID") { _id name color documentCount } }
```
Returns `[]` if no tags exist yet.

### One-pass workflow (create docs WITH tags already set) — 2026-04-13
1. Create all tags first via `createDocumentTag`, collect IDs into `tagMap`
2. Pass `tagIds: [tagMap[category]]` inside `createDocument` input — no second pass needed
3. Use `Promise.all` for batch speed


### deleteDocuments
mutation deleteDocuments($documentIds: [String!]) {
  deleteDocuments(documentIds: $documentIds)
Variables: `{ documentIds: ["<id>", ...] }` Ã¢ÂÂ accepts array, bulk delete supported.

### createDocumentTag
mutation createDocumentTag($companyId: String!, $name: String!) {
  createDocumentTag(companyId: $companyId, name: $name) {
    _id name color documentCount __typename
Variables: `{ companyId: "...", name: "TagName" }`

### deleteDocumentTag
mutation deleteDocumentTag($documentTagId: String!) {
  deleteDocumentTag(documentTagId: $documentTagId)
Variables: `{ documentTagId: "..." }` Ã¢ÂÂ **NOT** `tagId` or `id`, must be `documentTagId`.








## Amenity Booking Mutations (2026-03-21)

### createAmenityBooking
Captured from real UI submit on `/amenity/book`.
mutation createAmenityBooking($input: CreateAmenityBookingInput!) {
  createAmenityBooking(input: $input) {
    issue {
      _id
      __typename
    }
    __typename
Variables:
    "contactId": "<String!>",
    "amenityId": "<String!>",
    "comment": "",
    "companyId": "<String!>",
    "bookingRange": {
      "startDate": "2026-03-21T18:00:00.000Z",
      "endDate": "2026-03-21T21:00:00.000Z"
    },
    "customFields": [],
    "type": "tenant_booking"
Notes:
- `bookingRange` uses ISO timestamps (UTC)
- Slot selection is a RANGE Ã¢ÂÂ click start slot then end slot in UI (range selector, not single)
- `customFields` = empty array if amenity has no booking questions
- `type` is always `"tenant_booking"` from the UI

### updateAmenityBookingStatus
Single mutation handles cancel, approve, and reject.
mutation updateAmenityBookingStatus($amenityBookingId: String!, $input: UpdateAmenityBookingStatusInput!) {
  updateAmenityBookingStatus(amenityBookingId: $amenityBookingId, input: $input) {
    _id
    status
    statusText
    ...IssueAmenityBooking
  "amenityBookingId": "<String!>",
    "status": "canceled",
    "comment": "Reason text"
Status values: `"canceled"`, `"approved"`, `"rejected"`
- Cancel: requires confirmation dialog with reason Ã¢ÂÂ `comment` field
- `amenityBookingId` = the `_id` on the `amenityBooking` object (NOT the issue `_id`)



## Amenity API (discovered 2026-03-22)

### amenity Ã¢ÂÂ get single amenity
query {
  amenity(amenityId: "AMENITY_ID") {
    description
    maxPeopleNumber
    timeSlotDuration
    timeSlotPrice
    currency
    buildingId
    isActive
    schedule {
      day
      startTime
      endTime
    building { _id name }
    location { _id name }

### amenities Ã¢ÂÂ get all amenities for a property
  amenities(companyId: "COMPANY_ID") {
    amenities {
      name
      description
      buildingId
      building { _id name }
    totalCount

### setAmenity Ã¢ÂÂ create or update amenity
Pass `_id` to update an existing amenity; omit `_id` to create new.
mutation setAmenity($input: AmenityInput!) {
  setAmenity(input: $input) {
**Key input fields** (all from captured network traffic):
    "_id": "AMENITY_ID",
    "name": "Rooftop Conference Room",
    "description": "Description text",
    "companyId": "COMPANY_ID",
    "maxPeopleNumber": 20,
    "timeSlotDuration": 30,
    "timeSlotPrice": null,
    "currency": "USD",
    "schedule": [
      { "day": 5, "startTime": "08:00", "endTime": "17:00" },
      { "day": 0, "startTime": "08:00", "endTime": "17:00" }
    ],
    "images": [],
    "isActive": true
**Schedule `day` values**: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.

> **CRITICAL**: If you create an amenity with only one day (e.g., Friday=5), it will NOT appear in Visitt+ `/book-amenity` on any other day. Add all required days to the schedule.

### Amenity bookings Ã¢ÂÂ query
Amenity bookings are stored as issues with `type: "amenity_booking"`:
  issues(input: { companyId: "COMPANY_ID", type: "amenity_booking" }) {
    issues {
      status
      amenityBooking { _id amenity { _id name } startTime endTime }
      contact { _id name }


## Billable Items API (discovered 2026-03-25)

### upsertBillableItem Ã¢ÂÂ create or update

mutation upsertBillableItem($input: BillableItemInput!) {
  upsertBillableItem(input: $input) {
    _id companyId type name price currencyCode markup markupUnit chargeCode active taxable __typename

**Variables (create new):**
    "chargeCode": "",
    "type": "material",
    "price": 1.23,
    "name": "Item Name",
    "active": true,
    "taxable": false,
    "currencyCode": "$",
    "markup": 0,
    "markupUnit": "fix_price",
    "companyId": "PROPERTY_ID"

**Variables (update existing):** Add `"_id": "ITEM_ID"` to the input object.

**Type values:** `material`, `labor`

> **GOTCHA â€“ `active` default:** The Visitt UI modal creates billable items with `active: false` by default. When creating via API, always set `"active": true` explicitly or items won't appear in active lists.

> **GOTCHA â€“ `taxable` toggle:** The Taxable toggle in the UI only appears after a tax rate is configured in Admin > Billing > Tax & Markup for the property. Via API, you can set `"taxable": true` regardless, but it only takes effect if tax is configured.

**Deactivate (no delete mutation available):** Use `upsertBillableItem` with `_id` + `active: false`.

> **CRITICAL:** `deleteBillableItem`, `archiveBillableItem`, `removeBillableItem` are all server-whitelisted and return "Invalid query". Use `active: false` instead.

### billableItems Ã¢ÂÂ query list

query billableItems($filters: BillableItemsFilters!, $skip: Int!, $limit: Int!, $sort: String, $sortDirection: SortDirection) {
  billableItems(filters: $filters, skip: $skip, limit: $limit, sort: $sort, sortDirection: $sortDirection) {
    items { _id name type price active currencyCode markup markupUnit chargeCode taxable }

**Variables:**
  "filters": { "companyId": "PROPERTY_ID" },
  "skip": 0,
  "limit": 50,
  "sort": "name",
  "sortDirection": "ASC"

> **Note:** `sortDirection` uses the `SortDirection` enum type (not `String`). Values: `ASC`, `DESC`.

### Bulk creation pattern

- Use `fetch('/graphql', ...)` from browser console (same-origin, session cookie auth)
- 400ms delay between calls for stability
- Achieved: 34 items in ~14s (2.4 items/s)
- Zero errors at this rate




## createUser — Create a new user (verified 2026-04-09)

Captured from Settings → Account → Users → "Add new user" form.

```graphql
mutation createUser($input: UserInput!, $customerId: String!, $withNotification: Boolean) {
  createUser(
    input: $input
    customerId: $customerId
    withNotification: $withNotification
  ) {
    _id
    name
    __typename
  }
}
```

**Variables example:**
```json
{
  "input": {
    "firstName": "שליו",
    "lastName": "פחימה",
    "position": "מנהל אחזקה",
    "email": "user@mekdan.com",
    "phone": "+972XXXXXXXXX",
    "userType": "manager",
    "propertiesAccess": ["PROPERTY_ID"]
  },
  "customerId": "mekdan",
  "withNotification": true
}
```

**Notes:**
- `customerId`: the customer slug (e.g. `"mekdan"`, `"hiffman_national"`) — NOT the property ID
- UI path: `/settings/account/{customerId}/users` → "Add new user"
- Field names on User type: `name` (full name), NOT `firstName`/`lastName` — use `allUsers` query
- `allUsers(customerId: "mekdan")` returns `{ _id, name }` — no email field exposed in this query
- After creating, user appears with ID immediately — no email confirmation needed to deploy inspections

## allUsers — Query all users for a customer (verified 2026-04-09)

```graphql
query { allUsers(customerId: "CUSTOMER_ID") { _id name } }
```
Note: `firstName`/`lastName`/`email` are NOT valid fields on the User query type. Only `_id` and `name` confirmed.
