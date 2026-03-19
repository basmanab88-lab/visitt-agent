# Work Order Automations API

## Overview
Automations are at: `staging.visitt.io/issues/automation#automations` (Work orders → Automation tab)
All CRUD operations go through GraphQL at `staging.visitt.io/graphql` with cookie auth.

## Triggers (eventType)
| UI Label | eventType | Has triggerDelay? | Available Actions |
|----------|-----------|-------------------|-------------------|
| New work order opened | `newIssue` | No | setDefaultDueDate, setPriority, setAssignedUsers, notifyUsers |
| Work order wasn't seen for | `issue_not_seen` | Yes (number+unit) | notifyUsers |
| Work order received no response for | `issue_no_response` | Yes (number+unit) | notifyUsers |
| Work order wasn't completed for | `issue_not_completed` | Yes (number+unit) | notifyUsers |
| Work order duplication detected | `issue_duplicate` | No | notifyUsers |
| Work order was completed | `issue_completed` | No | createIssue |

## Actions
| action | actionValue format | Example |
|--------|-------------------|---------|
| `setDefaultDueDate` | `{"number":3,"unit":"days"}` | 3 Days, 12 Hours |
| `setPriority` | `"10"` / `"20"` / `"30"` / `"40"` | Low=10, Medium=20, High=30, Urgent=40 |
| `setAssignedUsers` | `["userId1","userId2"]` | User IDs array |
| `notifyUsers` | `["userId"]` or `["__ASSIGNED_USERS__"]` | Special value for assigned users |
| `createIssue` | `""` (empty) | Creates same work order |

## eventFields (Filters/Conditions)
| type | Description | Example |
|------|-------------|---------|
| `companyId` | Which property (REQUIRED) | `{ type: "companyId", _id: "<id>" }` |
| `categoryId` | Filter by category | `{ type: "categoryId", _id: "<id>" }` |
| `priority` | Filter by priority | `{ type: "priority", _id: "10" }` (Low) |
| `buildingId` | Filter by building | `{ type: "buildingId", _id: "..." }` |

Multiple `categoryId` entries = OR logic (any of these categories).

## Mutations

### Create
```graphql
mutation createAutomation($input: AutomationInput!) {
  createAutomation(input: $input) {
    _id eventType action actionValue formattedActionValue
    eventFields { type _id name }
  }
}
```

### Update
```graphql
mutation updateAutomation($automationId: String!, $input: AutomationInput!) {
  updateAutomation(automationId: $automationId, input: $input) {
    _id eventType action actionValue formattedActionValue
    eventFields { type _id name }
  }
}
```

### Delete
```graphql
mutation deleteAutomation($automationId: String!) {
  deleteAutomation(automationId: $automationId) { _id }
}
```
**GOTCHA**: Must request at least one return field (`{ _id }`).

### Query All
```graphql
query automations($companyId: String!) {
  automations(companyId: $companyId) {
    _id eventType triggerDelay { number unit }
    eventFields { type _id name }
    action actionValue formattedActionValue
    isBasedOnOfficeHours rank removable
  }
}
```

### Form Data
```graphql
query automationFormData($companyId: String!, $companyIds: [String]) {
  allCategories(companyId: $companyId, withNoCategory: true) {
    _id name subCategories(companyId: $companyIds) { _id name }
  }
  company(companyId: $companyId) {
    _id buildings { _id name }
    customer { _id hasSLA }
    officeHours { dayOfWeek timeRanges { start } }
    features
  }
}
```

## Bulk Deployment Pattern
1. Query `automations(companyId)` from source property
2. For each target property, get `allCategories` to map category IDs
3. Create automations with mapped IDs using `createAutomation`
4. Match categories by **NAME** not ID (IDs differ between properties)

## Known Gotchas
- **companyId is REQUIRED** in eventFields
- **actionValue is always a STRING** — even for JSON objects and arrays
- **Priority values**: Low=`"10"`, Medium=`"20"`, High=`"30"`, Urgent=`"40"`
- **`__ASSIGNED_USERS__`** — special value for notifyUsers
- **"Similar automation exists" error** — Can't create when categories overlap with existing same-type automation. Solution: update existing first, then create new
- **Delete mutation needs return fields** — bare mutation without `{ _id }` fails
- **companies query** — `customerId` must be `[String]` array, not `String!`
