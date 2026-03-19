/**
 * Automation Builder — Visual Template (LOCKED)
 *
 * Usage: Copy this file, replace ONLY the PROPERTY_DATA object.
 * NEVER change the styling, layout, or component logic.
 *
 * Workflow:
 *   1. User says "deploy automations" or "build automations"
 *   2. Claude asks: which property? new or existing?
 *   3. Claude fetches categories, users, existing automations from API
 *   4. Claude renders this template with real data
 *   5. User reviews, edits, approves in the visual builder
 *   6. Claude deploys via createAutomation / updateAutomation / deleteAutomation
 *
 * IMPORTANT: This visual step is MANDATORY before any automation deployment.
 */

// ============================================================
// DATA — Replace this object with real data from the API
// ============================================================
const PROPERTY_DATA = {
  customerName: "Example Customer",
  properties: [
    { name: "Property 1", companyId: "abc123" },
    { name: "Property 2", companyId: "def456" },
  ],
  categories: [
    { _id: "cat1", name: "Electricity" },
    { _id: "cat2", name: "Plumbing" },
    { _id: "cat3", name: "Cleaning" },
    { _id: "cat4", name: "HVAC" },
    { _id: "cat5", name: "Elevators" },
    { _id: "cat6", name: "Common Areas" },
  ],
  users: [
    { _id: "user1", name: "John Doe" },
  ],
  automations: [
    // status: "existing" = already deployed, "new" = to be created
    {
      status: "existing",
      eventType: "newIssue",
      action: "setDefaultDueDate",
      actionValue: '{"number":3,"unit":"days"}',
      categories: [],       // empty = any category
      priority: null,       // null = any priority
      buildings: [],        // empty = any building
      officeHours: false,
    },
    {
      status: "new",
      eventType: "newIssue",
      action: "setPriority",
      actionValue: '"10"',  // Low
      categories: ["Electricity", "Plumbing"],
      priority: null,
      buildings: [],
      officeHours: false,
    },
  ],
};

// ============================================================
// CONSTANTS — Do not modify
// ============================================================
const TRIGGERS = [
  { value: "newIssue", label: "New work order opened", hasDelay: false },
  { value: "issue_not_seen", label: "Work order wasn't seen for", hasDelay: true },
  { value: "issue_no_response", label: "Work order received no response for", hasDelay: true },
  { value: "issue_not_completed", label: "Work order wasn't completed for", hasDelay: true },
  { value: "issue_duplicate", label: "Work order duplication detected", hasDelay: false },
  { value: "issue_completed", label: "Work order was completed", hasDelay: false },
];

const ACTIONS_BY_TRIGGER = {
  newIssue: ["setDefaultDueDate", "setPriority", "setAssignedUsers", "notifyUsers"],
  issue_not_seen: ["notifyUsers"],
  issue_no_response: ["notifyUsers"],
  issue_not_completed: ["notifyUsers"],
  issue_duplicate: ["notifyUsers"],
  issue_completed: ["createIssue"],
};

const ACTION_LABELS = {
  setDefaultDueDate: "Set due date",
  setPriority: "Set priority",
  setAssignedUsers: "Set assigned users",
  notifyUsers: "Notify users",
  createIssue: "Create same work order",
};

const PRIORITY_MAP = {
  "10": { label: "Low", color: "#3b82f6" },
  "20": { label: "Medium", color: "#f59e0b" },
  "30": { label: "High", color: "#f97316" },
  "40": { label: "Urgent", color: "#ef4444" },
};

// ============================================================
// COMPONENT — Do not modify layout/styling
// ============================================================
const AutomationBuilder = () => {
  const [automations, setAutomations] = React.useState(PROPERTY_DATA.automations);
  const [showDeploy, setShowDeploy] = React.useState(false);

  const addAutomation = () => {
    setAutomations([...automations, {
      status: "new",
      eventType: "newIssue",
      action: "setDefaultDueDate",
      actionValue: '{"number":3,"unit":"days"}',
      categories: [],
      priority: null,
      buildings: [],
      officeHours: false,
    }]);
  };

  const removeAutomation = (index) => {
    setAutomations(automations.filter((_, i) => i !== index));
  };

  const updateAutomation = (index, field, value) => {
    const updated = [...automations];
    updated[index] = { ...updated[index], [field]: value };
    // Reset action when trigger changes
    if (field === "eventType") {
      const available = ACTIONS_BY_TRIGGER[value] || [];
      updated[index].action = available[0] || "notifyUsers";
    }
    setAutomations(updated);
  };

  const toggleCategory = (index, catName) => {
    const updated = [...automations];
    const cats = updated[index].categories || [];
    updated[index].categories = cats.includes(catName)
      ? cats.filter(c => c !== catName)
      : [...cats, catName];
    setAutomations(updated);
  };

  const existingCount = automations.filter(a => a.status === "existing").length;
  const newCount = automations.filter(a => a.status === "new").length;

  const formatAction = (a) => {
    const label = ACTION_LABELS[a.action] || a.action;
    if (a.action === "setDefaultDueDate") {
      try {
        const v = JSON.parse(a.actionValue);
        return `${label} → ${v.number} ${v.unit}`;
      } catch { return label; }
    }
    if (a.action === "setPriority") {
      const p = PRIORITY_MAP[a.actionValue?.replace(/"/g, "")] || {};
      return `${label} → ${p.label || a.actionValue}`;
    }
    if (a.action === "createIssue") return "Create same work order";
    return label;
  };

  const formatTrigger = (eventType) => {
    const t = TRIGGERS.find(t => t.value === eventType);
    return t ? t.label : eventType;
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 800, margin: "0 auto", padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#1e293b" }}>Automation Builder</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
              {PROPERTY_DATA.customerName} — {PROPERTY_DATA.properties.length} properties
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {existingCount} existing
            </span>
            {newCount > 0 && (
              <span style={{ background: "#dbeafe", color: "#1e40af", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {newCount} new
              </span>
            )}
          </div>
        </div>
        {/* Property chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
          {PROPERTY_DATA.properties.map((p, i) => (
            <span key={i} style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
              {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* Automation Cards */}
      {automations.map((auto, idx) => {
        const isNew = auto.status === "new";
        const borderColor = isNew ? "#3b82f6" : "#22c55e";
        const badgeColor = isNew ? "#dbeafe" : "#dcfce7";
        const badgeText = isNew ? "#1e40af" : "#166534";
        const availableActions = ACTIONS_BY_TRIGGER[auto.eventType] || [];

        return (
          <div key={idx} style={{ background: "white", borderRadius: 10, padding: 16, marginBottom: 10, borderLeft: `4px solid ${borderColor}`, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ background: badgeColor, color: badgeText, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                {isNew ? "NEW" : "EXISTING"}
              </span>
              {isNew && (
                <button onClick={() => removeAutomation(idx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
              )}
            </div>

            {/* When */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>When</label>
              {isNew ? (
                <select value={auto.eventType} onChange={e => updateAutomation(idx, "eventType", e.target.value)}
                  style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4, borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}>
                  {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 14, color: "#334155", marginTop: 4, fontWeight: 500 }}>
                  📋 {formatTrigger(auto.eventType)}
                </div>
              )}
            </div>

            {/* Categories filter */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Categories</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {auto.categories && auto.categories.length > 0 ? (
                  auto.categories.map((cat, ci) => (
                    <span key={ci} style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontSize: 12, cursor: isNew ? "pointer" : "default" }}
                      onClick={() => isNew && toggleCategory(idx, cat)}>
                      {cat} {isNew && "✕"}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>Any category</span>
                )}
              </div>
              {isNew && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                  {PROPERTY_DATA.categories
                    .filter(c => !(auto.categories || []).includes(c.name))
                    .map((c, ci) => (
                      <button key={ci} onClick={() => toggleCategory(idx, c.name)}
                        style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#64748b", padding: "2px 6px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                        + {c.name}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Then (Action) */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Then</label>
              {isNew ? (
                <select value={auto.action} onChange={e => updateAutomation(idx, "action", e.target.value)}
                  style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4, borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}>
                  {availableActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 14, color: "#334155", marginTop: 4, fontWeight: 500 }}>
                  📊 {formatAction(auto)}
                </div>
              )}
            </div>

            {/* Action value config (for new) */}
            {isNew && auto.action === "setPriority" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Priority</label>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {Object.entries(PRIORITY_MAP).map(([val, { label, color }]) => (
                    <button key={val} onClick={() => updateAutomation(idx, "actionValue", `"${val}"`)}
                      style={{
                        padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: auto.actionValue === `"${val}"` ? color : "#f1f5f9",
                        color: auto.actionValue === `"${val}"` ? "white" : "#64748b",
                        border: "none",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isNew && auto.action === "setDefaultDueDate" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Due date</label>
                <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                  <input type="number" defaultValue={3} min={1} style={{ width: 50, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}
                    onChange={e => {
                      try {
                        const v = JSON.parse(auto.actionValue);
                        updateAutomation(idx, "actionValue", JSON.stringify({ number: parseInt(e.target.value), unit: v.unit || "days" }));
                      } catch {}
                    }} />
                  <select defaultValue="days" style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}
                    onChange={e => {
                      try {
                        const v = JSON.parse(auto.actionValue);
                        updateAutomation(idx, "actionValue", JSON.stringify({ number: v.number || 3, unit: e.target.value }));
                      } catch {}
                    }}>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            )}

            {/* Existing action display */}
            {!isNew && (
              <div style={{ fontSize: 14, color: "#334155", fontWeight: 500, marginTop: -4 }}>
                📊 {formatAction(auto)}
              </div>
            )}
          </div>
        );
      })}

      {/* Add button */}
      <button onClick={addAutomation}
        style={{ width: "100%", padding: 12, background: "white", border: "2px dashed #cbd5e1", borderRadius: 10, color: "#3b82f6", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
        + Add Automation
      </button>

      {/* Deploy Summary */}
      {newCount > 0 && (
        <div style={{ background: "#eff6ff", borderRadius: 10, padding: 16, border: "1px solid #bfdbfe" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#1e40af" }}>Deploy Summary</h3>
          <p style={{ margin: 0, color: "#1e40af", fontSize: 13 }}>
            {newCount} new automation{newCount > 1 ? "s" : ""} × {PROPERTY_DATA.properties.length} properties = {newCount * PROPERTY_DATA.properties.length} API calls
          </p>
          <div style={{ marginTop: 8 }}>
            {automations.filter(a => a.status === "new").map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: "#3b82f6", marginTop: 4 }}>
                → {formatTrigger(a.eventType)} → {a.categories.length > 0 ? `[${a.categories.join(", ")}]` : "Any"} → {formatAction(a)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationBuilder;
