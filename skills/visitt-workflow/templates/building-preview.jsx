/**
 * STANDARD BUILDING DEPLOY PREVIEW — DO NOT MODIFY STRUCTURE
 * Use this exact component every time before deploying anything under My Property.
 * Covers: buildings, floors, rooms (sites), equipment.
 *
 * Props (injected via initData at bottom):
 *   customerName  — e.g. "SKYNET"
 *   propertyName  — e.g. "T800"
 *   env           — "Staging" | "Production"
 *   buildingName  — e.g. "SKy Building"
 *   floors        — array of { name, level, room?: { name, type }, equipment?: { name, type } }
 *
 * Rules:
 *   - Show this preview and wait for explicit approval before ANY deploy
 *   - User must be able to: rename any entity (dbl-click), delete any entity (🗑 on hover),
 *     restore deleted items (↩), add a floor (+), open/close all
 *   - Left panel shows live entity counts
 *   - "Pending approval" badge stays visible until user approves
 *   - After approval, replace badge with "✅ Approved"
 */

import { useState, useRef, useEffect } from "react";

// ─── Inline edit ───────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef();
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => {
    setEditing(false);
    if (val.trim()) onSave(val.trim()); else setVal(value);
  };
  if (editing) return (
    <input ref={ref} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(value); setEditing(false); } }}
      style={{ fontSize: 13, border: "none", borderBottom: "2px solid #6366f1", outline: "none", background: "transparent", width: 130, ...style }}
    />
  );
  return <span onDoubleClick={() => setEditing(true)} title="לחץ פעמיים לעריכה" style={{ cursor: "text", ...style }}>{value}</span>;
}

// ─── Badge ──────────────────────────────────────────────────────────────────
function Badge({ label, bg, text }) {
  return <span style={{ fontSize: 10, background: bg, color: text, borderRadius: 99, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>{label}</span>;
}

// ─── Icon button ─────────────────────────────────────────────────────────────
function IconBtn({ icon, title, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? (danger ? "#fee2e2" : "#f1f5f9") : "transparent", border: "none", borderRadius: 5, cursor: "pointer", padding: "2px 5px", fontSize: 13, color: danger ? (hov ? "#dc2626" : "#fca5a5") : (hov ? "#475569" : "#cbd5e1"), transition: "all 0.15s" }}>
      {icon}
    </button>
  );
}

// ─── Init data — REPLACE THIS PER DEPLOYMENT ────────────────────────────────
const INIT = {
  customerName: "CUSTOMER",
  propertyName: "PROPERTY",
  env: "Staging",
  buildingName: "Building Name",
  floors: Array.from({ length: 3 }, (_, i) => ({
    id: `floor_${i}`,
    name: i === 0 ? "Ground Floor" : `Floor ${i}`,
    level: i,
    room: { name: "room 1", type: "site", enabled: true },
    equipment: { name: "ERT Kit", type: "equipment", enabled: true },
  })),
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function BuildingPreview() {
  const [building, setBuilding] = useState({ name: INIT.buildingName });
  const [floors, setFloors]     = useState(
    INIT.floors.map(f => ({ ...f, open: false, roomOpen: false,
      room: f.room ? { ...f.room, enabled: true } : null,
      equipment: f.equipment ? { ...f.equipment, enabled: true } : null,
    }))
  );
  const [approved, setApproved] = useState(false);
  const [deleted, setDeleted]   = useState([]);

  const totalFloors = floors.length;
  const totalRooms  = floors.filter(f => f.room?.enabled).length;
  const totalEq     = floors.filter(f => f.room?.enabled && f.equipment?.enabled).length;

  // ── helpers ──
  const toggle  = (id, key) => setFloors(fs => fs.map(f => f.id === id ? { ...f, [key]: !f[key] } : f));
  const rename  = (id, key, val) => setFloors(fs => fs.map(f => f.id === id ? { ...f, [key]: { ...f[key], name: val } } : f));
  const del     = (id, key, label) => { setDeleted(d => [...d, label]); setFloors(fs => fs.map(f => f.id === id ? { ...f, [key]: { ...f[key], enabled: false }, ...(key === 'room' ? { roomOpen: false } : {}) } : f)); };
  const restore = (id, key) => setFloors(fs => fs.map(f => f.id === id ? { ...f, [key]: { ...f[key], enabled: true } } : f));
  const delFloor = id => { const fl = floors.find(f => f.id === id); setDeleted(d => [...d, `קומה: ${fl.name}`]); setFloors(fs => fs.filter(f => f.id !== id)); };
  const addFloor = () => {
    const maxLevel = Math.max(...floors.map(f => f.level), -1);
    setFloors(fs => [...fs, { id: `floor_new_${Date.now()}`, name: `Floor ${maxLevel + 1}`, level: maxLevel + 1, open: true, roomOpen: false, room: { name: "room 1", type: "site", enabled: true }, equipment: { name: "ERT Kit", type: "equipment", enabled: true } }]);
  };
  const openAll  = () => setFloors(fs => fs.map(f => ({ ...f, open: true, roomOpen: true })));
  const closeAll = () => setFloors(fs => fs.map(f => ({ ...f, open: false, roomOpen: false })));

  const ROW = (pl) => ({ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", paddingLeft: pl, borderRadius: 7, marginBottom: 2, transition: "background 0.12s" });
  const HEV = e => { e.currentTarget.style.background = "#f1f5f9"; const a = e.currentTarget.querySelector(".act"); if (a) a.style.opacity = 1; };
  const HEL = e => { e.currentTarget.style.background = "transparent"; const a = e.currentTarget.querySelector(".act"); if (a) a.style.opacity = 0; };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", display: "flex", height: "100vh", background: "#f8fafc" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ width: 210, background: "#0f172a", color: "#e2e8f0", padding: "24px 18px", display: "flex", flexDirection: "column", gap: 20, flexShrink: 0 }}>
        {[["Customer", INIT.customerName], ["Property", INIT.propertyName], ["Building", building.name]].map(([lbl, val]) => (
          <div key={lbl}>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: lbl === "Building" ? "#60a5fa" : "#e2e8f0" }}>{val}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>Environment</div>
          <div style={{ fontSize: 12, color: INIT.env === "Production" ? "#f87171" : "#f59e0b", fontWeight: 600 }}>● {INIT.env}</div>
        </div>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[["📐","Floors",totalFloors],["📁","Rooms",totalRooms],["🔧","Equipment",totalEq]].map(([ic,lb,ct]) => (
            <div key={lb} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12, color: "#94a3b8" }}><span>{ic}</span><span>{lb}</span></div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{ct}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#60a5fa" }}>{1 + totalFloors + totalRooms + totalEq}</span>
          </div>
        </div>

        {deleted.length > 0 && (
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 14 }}>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>הוסר</div>
            {deleted.map((d, i) => <div key={i} style={{ fontSize: 11, color: "#ef4444", marginBottom: 4 }}>✕ {d}</div>)}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "13px 18px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>מבנה הבניין — תצוגה מקדימה</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["פתח הכל","סגור הכל"].map((lbl,i) => (
              <button key={lbl} onClick={i===0?openAll:closeAll} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, background: "#f1f5f9", border: "1px solid #e2e8f0", cursor: "pointer", color: "#475569", fontWeight: 500 }}>{lbl}</button>
            ))}
            {approved
              ? <div style={{ fontSize: 10, padding: "4px 12px", borderRadius: 99, background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", fontWeight: 600 }}>✅ אושר</div>
              : <div style={{ fontSize: 10, padding: "4px 12px", borderRadius: 99, background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a", fontWeight: 600 }}>ממתין לאישור</div>
            }
          </div>
        </div>

        {/* Hint */}
        <div style={{ padding: "6px 18px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8" }}>
          לחץ פעמיים על שם לעריכה · 🗑 על hover למחיקה · ↩ לשחזור
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>

          {/* Building */}
          <div style={{ ...ROW(8), marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🏢</span>
            <InlineEdit value={building.name} onSave={v => setBuilding({ name: v })} style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }} />
            <Badge label="building" bg="#dbeafe" text="#1d4ed8" />
          </div>

          {/* Floors */}
          {floors.map((floor) => (
            <div key={floor.id}>
              {/* Floor row */}
              <div onClick={() => toggle(floor.id, "open")} style={{ ...ROW(22), cursor: "pointer" }} onMouseEnter={HEV} onMouseLeave={HEL}>
                <span style={{ fontSize: 10, color: "#94a3b8", width: 12, textAlign: "center" }}>{floor.open ? "▼" : "▶"}</span>
                <span style={{ fontSize: 15 }}>📐</span>
                <InlineEdit value={floor.name} onSave={v => setFloors(fs => fs.map(f => f.id === floor.id ? { ...f, name: v } : f))} style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }} />
                <Badge label={`level ${floor.level}`} bg="#f0fdf4" text="#16a34a" />
                <div className="act" style={{ marginLeft: "auto", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s" }}>
                  <IconBtn icon="🗑" title="מחק קומה" onClick={() => delFloor(floor.id)} danger />
                </div>
              </div>

              {/* Room row */}
              {floor.open && floor.room && (
                floor.room.enabled ? (
                  <div>
                    <div onClick={() => toggle(floor.id, "roomOpen")} style={{ ...ROW(44), cursor: "pointer" }} onMouseEnter={HEV} onMouseLeave={HEL}>
                      <span style={{ fontSize: 10, color: "#94a3b8", width: 12, textAlign: "center" }}>{floor.roomOpen ? "▼" : "▶"}</span>
                      <span style={{ fontSize: 15 }}>📁</span>
                      <InlineEdit value={floor.room.name} onSave={v => rename(floor.id, "room", v)} style={{ fontSize: 13, color: "#1e293b" }} />
                      <Badge label={floor.room.type} bg="#ede9fe" text="#7c3aed" />
                      <div className="act" style={{ marginLeft: "auto", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s" }}>
                        <IconBtn icon="🗑" title="מחק חדר" onClick={() => del(floor.id, "room", `room בקומה ${floor.name}`)} danger />
                      </div>
                    </div>

                    {/* Equipment row */}
                    {floor.roomOpen && floor.equipment && (
                      floor.equipment.enabled ? (
                        <div style={{ ...ROW(64) }} onMouseEnter={HEV} onMouseLeave={HEL}>
                          <span style={{ width: 12 }} />
                          <span style={{ fontSize: 15 }}>🔧</span>
                          <InlineEdit value={floor.equipment.name} onSave={v => rename(floor.id, "equipment", v)} style={{ fontSize: 13, color: "#64748b" }} />
                          <Badge label={floor.equipment.type} bg="#fff7ed" text="#c2410c" />
                          <div className="act" style={{ marginLeft: "auto", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s" }}>
                            <IconBtn icon="🗑" title="מחק ציוד" onClick={() => del(floor.id, "equipment", `equipment בקומה ${floor.name}`)} danger />
                          </div>
                        </div>
                      ) : (
                        <div style={{ ...ROW(64), opacity: 0.4 }}>
                          <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>ציוד הוסר</span>
                          <button onClick={() => restore(floor.id, "equipment")} style={{ marginLeft: "auto", fontSize: 10, color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}>↩ שחזר</button>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div style={{ ...ROW(44), opacity: 0.4 }}>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>חדר הוסר</span>
                    <button onClick={() => restore(floor.id, "room")} style={{ marginLeft: "auto", fontSize: 10, color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}>↩ שחזר</button>
                  </div>
                )
              )}
            </div>
          ))}

          {/* Add floor */}
          <div onClick={addFloor} style={{ ...ROW(22), cursor: "pointer", marginTop: 6, border: "1px dashed #cbd5e1", justifyContent: "center", color: "#94a3b8" }}
            onMouseEnter={e => { e.currentTarget.style.background="#f1f5f9"; e.currentTarget.style.color="#475569"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#94a3b8"; }}>
            <span style={{ fontSize: 13 }}>+ הוסף קומה</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "11px 18px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>ערוך · אשר · ואז תגיד "תטמיע"</span>
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{totalFloors} floors · {totalRooms} rooms · {totalEq} equipment</span>
        </div>
      </div>
    </div>
  );
}
