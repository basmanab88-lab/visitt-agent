# Visitt Terminology Glossary

Maps casual user language (Hebrew and English) to the correct Visitt platform entities.
Claude reads this file during bootstrap to understand what the user means.

## Confidence Levels & Behavior

| Level | What Claude does |
|---|---|
| **HIGH** | Proceed without asking. The term maps unambiguously to one entity. |
| **MEDIUM** | Mention the assumption briefly: "I understand you mean Inspections — correct?" |
| **LOW** | Ask before doing anything: "When you say 'report', do you mean an inspection report? Or something else?" |

## Terminology Table

### Core Entities

| User says (English) | User says (Hebrew) | Visitt Entity | API Name | Confidence | Notes |
|---|---|---|---|---|---|
| inspections | ביקורות, ביקורת | Assignment | `assignments` query | HIGH | Direct match |
| tasks, my tasks | משימות, משימה | Assignment | `assignments` query | MEDIUM | In Visitt "tasks" = inspections. Ask if ambiguous. |
| work orders, tickets | קריאות, קריאה, תקלות | WorkOrder | `workOrders` query | HIGH | |
| buildings | בניינים, בניין | Building | `buildings` query | HIGH | |
| floors | קומות, קומה | Floor | `floors` (nested in building) | HIGH | |
| units, suites | יחידות, יחידה, סוויטות | Site (leasable_site) | `sites` query | HIGH | modelType = leasable_site |
| spaces | חללים, מרחבים, חלל | Site | `sites` query | MEDIUM | Could be leasable_site or common site. Ask which. |
| common areas | שטחים משותפים | Site (site) | `sites` query | HIGH | modelType = site |
| tenants | דיירים, דייר, שוכרים | Tenant | `tenants` query | HIGH | |
| vendors, contractors | ספקים, ספק, קבלנים | Vendor | `vendors` query | HIGH | |
| properties, portfolios | נכסים, נכס, פורטפוליו | Company | `companies` query | HIGH | "Property" in Visitt = Company entity |
| equipment, assets | ציוד, נכס טכני | Equipment | `equipment` query | HIGH | |
| categories | קטגוריות, קטגוריה | Category | `categories` query | MEDIUM | Request categories? Inspection categories? Work order categories? Ask. |
| templates | תבניות, תבנית | Template | `templates` query | MEDIUM | Assignment template? Report template? Ask. |
| charges, billing | חיובים, חיוב | BillableItem | `billableItems` query | HIGH | |
| contacts | אנשי קשר, איש קשר | Contact | `contacts` query | HIGH | |

### Actions & Operations

| User says (English) | User says (Hebrew) | Visitt Operation | Confidence | Notes |
|---|---|---|---|---|
| activate, unpause, resume | הפעל, הפעלה, חדש פעולה | updateAssignmentsIsPaused (isPaused: false) | HIGH | |
| pause, deactivate, stop | השהה, עצור, הפסק | updateAssignmentsIsPaused (isPaused: true) | HIGH | |
| create inspections, assign | צור ביקורות, שייך ביקורות | createAssignmentsFromTemplates | HIGH | |
| delete inspections, remove | מחק ביקורות, הסר | deleteAssignments | HIGH | Param is assignmentIds (NOT ids) |
| deploy a building, set up | הטמע בניין, הקם בניין | insertBuilding + upsertFloors + insertSite | HIGH | Must visualize first |
| import, bulk load | ייבא, טעינה | CSV import flow | HIGH | |
| check status, what's happening | מה המצב, בדוק סטטוס | Various queries | MEDIUM | Ask: status of what? Inspections? Work orders? |
| generate report, pull data | הפק דוח, משוך נתונים | Various queries | LOW | Too vague — ask what kind of report |

### Customer/Client Names

| User says | Visitt customerId | Notes |
|---|---|---|
| Hiffman, Hiffman National | hiffman_national | Large client with many templates |
| (add more customers as discovered) | | |

## Self-Review Rule

When a user uses a term NOT in this glossary, and Claude successfully maps it to a Visitt entity:
1. Add the new term to the appropriate table
2. Set the confidence level based on how obvious the mapping was
3. Push with the rest of the self-review changes
