# ROUTING.md — Task Routing Table

This file maps user intents to the correct skill files and sections.
Claude reads this file at the START of every session to know where to find
the right knowledge for any given task.

## How to read this table

| Column | Meaning |
|--------|---------|
| Intent Pattern | What the user might say (English or Hebrew) |
| Skill | Which skill file to read |
| Section | Which section within that skill |
| Key Mutation/Query | The primary API call involved |
| Notes | Gotchas, prerequisites, important context |

## Routing Table

| Intent Pattern | Skill | Section | Key Mutation/Query | Notes |
|---|---|---|---|---|
| "unpause inspections" / "activate paused" / "הפעל ביקורות" | visitt-api | §updateAssignmentsIsPaused | `updateAssignmentsIsPaused` | Batch call, needs assignmentIds array + isPaused: false |
| "pause inspections" / "השהה ביקורות" | visitt-api | §updateAssignmentsIsPaused | `updateAssignmentsIsPaused` | isPaused: true |
| "create inspections from template" / "צור ביקורות" | visitt-api | §createAssignmentsFromTemplates | `createAssignmentsFromTemplates` | Needs templateId + companyId + siteIds |
| "delete inspections" / "מחק ביקורות" | visitt-api | §deleteAssignments | `deleteAssignments` | Param is assignmentIds (NOT ids) |
| "check inspection status" / "מה מצב הביקורות" | visitt-api + visitt-workflow | §assignments query | `assignments` query | MUST include customerId or returns empty |
| "list templates" / "הצג תבניות" | visitt-api | §templates query | `templates` query | Requires TemplateSearchInput with customerId |
| "deploy a building" / "הטמע בניין" | visitt-api + visitt-workflow | §insertBuilding, §upsertFloors, §insertSite | Multiple mutations | MUST visualize first (React JSX tree). dummy_id_N format. |
| "create spaces" / "צור יחידות" | visitt-api | §insertSite | `insertSite` / `createSite` | modelType: leasable_site for rentable |
| "create equipment" / "הוסף ציוד" | visitt-api | §createEquipment | `createEquipment` | Needs buildingId + floorId + siteId |
| "add vendors" / "הוסף ספקים" | visitt-api | §setVendor | `setVendor` | E.164 phone format required |
| "create tenants" / "הוסף דיירים" | visitt-api | §tenant mutations | Various | Can use Partner API or Internal API |
| "assign user to inspection" / "שייך עובד לביקורת" | visitt-api | §updateAssignment | `updateAssignment` | Must pass all required fields + assignedUserIds |
| "update settings" / "עדכן הגדרות" | visitt-workflow | §settings pages | N/A (UI-based) | Usually requires browser automation |
| "update categories" / "עדכן קטגוריות" | visitt-workflow | §category management | N/A (UI-based) | Bulk updates benefit from JS automation |
| "create work orders" / "פתח קריאות" | visitt-api | §work order mutations | `createWorkOrder` | Can use Partner API |
| "import data" / "ייבא נתונים" | visitt-import | §CSV import | N/A | For bulk data loads from CSV |
| "generate report" / "הפק דוח" | visitt-api | §queries | Various queries | May need new skill if complex reporting |

## Hiffman-Specific Routes

| Intent Pattern | Skill | Section | Key Info |
|---|---|---|---|
| "Hiffman inspections" / "ביקורות הילמן" | visitt-api | §Hiffman Template IDs | customerId: "hiffman_national" |
| "Hiffman rent roll" | visitt-api | §createAssignmentsFromTemplates | templateId: 6971c3893ac06b4ffceec582 |
| "Hiffman vacancy" | visitt-api | §createAssignmentsFromTemplates | Industrial/Office/Retail templates — see template table |

## Template ID Reference (Hiffman, verified 2026-04-01)

| Template Name | Template ID |
|---|---|
| Association/Land | 6971c307efbab709fcd6a56e |
| Exterior (Industrial) | 6971c307efbab709fcd6a570 |
| Exterior (Office) | 6971c307efbab709fcd6a571 |
| Exterior (Retail) | 6971c307efbab709fcd6a572 |
| Interior (Industrial) | 6971c307efbab709fcd6a573 |
| Interior (Office) | 6971c307efbab709fcd6a56f |
| Move In/Move Out (Industrial) - UPDATED | 6971c30c7a546d2b7cf4479f |
| Move In/Move Out (Office) - UPDATED | 6971c30c7a546d2b7cf447a1 |
| Move In/Move Out (Retail) - UPDATED | 6971c30c7a546d2b7cf447a2 |
| Rent Roll Review | 6971c3893ac06b4ffceec582 |
| Vacancy (Industrial) - UPDATED | 6971c3a07a546d2b7cf4483f |
| Vacancy (Office) - UPDATED | 6971c3bb3ac06b4ffceec5a5 |
| Vacancy (Retail) - UPDATED | 6971c3c07a546d2b7cf4485d |
| Portfolio Info Update | 699def58b3b7cb375a9d4e30 |

## No Match Found?

If the user's request doesn't match any row above:
1. Proceed without a pre-existing skill
2. Use the fetch interceptor to discover needed mutations
3. Execute the task
4. During self-review, ADD a new row to this table for the discovered pattern
