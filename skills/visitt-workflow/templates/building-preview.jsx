/**
 * STANDARD BUILDING DEPLOY PREVIEW — DO NOT MODIFY STRUCTURE
 * Use this exact component every time before deploying anything under My Property.
 * Covers: buildings, floors, sites (regular + leasable), sub-sites, equipment.
 *
 * INIT data format (replace per session — DO NOT push session-specific INIT to GitHub):
 *   customerName  — e.g. "SKYNET"
 *   propertyName  — e.g. "Tower 1"
 *   env           — "Staging" | "Production"
 *   buildingName  — e.g. "Main Building"
 *   floors[]      — array of floor objects (see schema below)
 *
 * Floor schema:
 *   { id, name, level, levelNote?,
 *     sites: [{ id, name, type, modelType, area?, note?,
 *               subSites?: [{ id, name, type }],
 *               equipment?: [{ id, name, type }] }],
 *     floorEquipment: [{ id, name, type, note? }]   ← equipment not under any site
 *   }
 *
 * modelType values: "site" | "leasable_site"
 *
 * Rules (NON-NEGOTIABLE):
 *   - Show this preview and wait for explicit user approval before ANY deploy
 *   - User must be able to: rename any entity (dbl-click), delete (🗑 on hover),
 *     restore deleted items (↩), open/close all
 *   - Left panel shows live entity counts (floors, sites, sub-sites, equipment, total)
 *   - "Pending approval" badge stays visible until user approves
 *   - After approval, replace badge with "✅ Approved — say תטמיע"
 *   - ⚠️ badge = entity moved from sites→equipment (client mistake)
 *   - ✏️ badge = entity added manually (client forgot)
 *   - ❓ badge = value needs confirmation from user
 */

import { useState, useRef, useEffect } from "react";

// ─── Inline edit ───────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef();
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); if (val.trim()) onSave(val.trim()); else setVal(value); };
  if (editing) return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape"){ setVal(value); setEditing(false); } }}
      style={{ fontSize:13, border:"none", borderBottom:"2px solid #6366f1", outline:"none", background:"transparent", width:160, ...style }} />
  );
  return <span onDoubleClick={()=>setEditing(true)} title="לחץ פעמיים לעריכה" style={{ cursor:"text", ...style }}>{value}</span>;
}

function Badge({ label, bg, text }) {
  return <span style={{ fontSize:10, background:bg, color:text, borderRadius:99, padding:"2px 7px", fontWeight:600, flexShrink:0 }}>{label}</span>;
}

function IconBtn({ icon, title, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={e=>{e.stopPropagation();onClick();}} title={title}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background: hov?(danger?"#fee2e2":"#f1f5f9"):"transparent", border:"none", borderRadius:5, cursor:"pointer", padding:"2px 5px", fontSize:13,
        color: danger?(hov?"#dc2626":"#fca5a5"):(hov?"#475569":"#cbd5e1"), transition:"all 0.15s" }}>
      {icon}
    </button>
  );
}

// ─── INIT — REPLACE THIS BLOCK PER DEPLOYMENT (do NOT push session data to GitHub) ─
const INIT = {
  customerName: "CUSTOMER_NAME",
  propertyName: "PROPERTY_NAME",
  env: "Staging",
  buildingName: "BUILDING_NAME",
  floors: [
    {
      id: "f_minus1", name: "Basement", level: -1,
      sites: [
        { id:"s_b1", name:"Pump Room", type:"pump room", modelType:"site",
          equipment:[
            { id:"e_b1", name:"Pump 1", type:"pump" },
            { id:"e_b2", name:"Pump 2", type:"pump" },
          ]
        },
        { id:"s_b2", name:"Parking", type:"parking", modelType:"site" },
      ],
      floorEquipment: [
        { id:"fe_b1", name:"Electrical Panel", type:"", note:"⚠️ הועבר מאתרים לציוד" },
      ]
    },
    {
      id: "f_0", name: "Ground Floor", level: 0,
      sites: [
        { id:"s_0_1", name:"Lobby", type:"lobby", modelType:"site" },
        { id:"s_0_2", name:"Tenant A", type:"office", modelType:"leasable_site", area:500,
          subSites:[{ id:"ss_0_1", name:"Kitchen", type:"" }]
        },
        { id:"s_0_3", name:"Storage Room", type:"storage", modelType:"site", note:"✏️ נוסף (לקוח שכח)" },
      ],
      floorEquipment: []
    },
    {
      id: "f_roof", name: "Roof", level: 3, levelNote:"❓ מפלס — נא לאשר",
      sites: [
        { id:"s_r1", name:"Generator Room", type:"generator", modelType:"site" },
        { id:"s_r2", name:"Solar System", type:"solar", modelType:"site" },
      ],
      floorEquipment: []
    },
  ]
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function BuildingPreview() {
  const initFloors = INIT.floors.map(f => ({
    ...f,
    open: false,
    enabled: true,
    sites: (f.sites||[]).map(s => ({
      ...s, enabled: true, open: false,
      subSites: (s.subSites||[]).map(ss=>({...ss, enabled:true})),
      equipment: (s.equipment||[]).map(e=>({...e, enabled:true})),
    })),
    floorEquipment: (f.floorEquipment||[]).map(e=>({...e, enabled:true})),
  }));

  const [building, setBuilding] = useState({ name: INIT.buildingName });
  const [floors, setFloors] = useState(initFloors);
  const [approved, setApproved] = useState(false);
  const [deleted, setDeleted] = useState([]);

  // ── counts ──
  const activeFloors  = floors.filter(f=>f.enabled);
  const totalFloors   = activeFloors.length;
  const totalSites    = activeFloors.reduce((a,f)=> a + f.sites.filter(s=>s.enabled).length, 0);
  const totalSubSites = activeFloors.reduce((a,f)=> a + f.sites.filter(s=>s.enabled).reduce((b,s)=> b + (s.subSites||[]).filter(ss=>ss.enabled).length ,0), 0);
  const totalEq       = activeFloors.reduce((a,f)=>
    a + f.floorEquipment.filter(e=>e.enabled).length
      + f.sites.filter(s=>s.enabled).reduce((b,s)=> b + (s.equipment||[]).filter(e=>e.enabled).length ,0)
  , 0);

  // ── helpers ──
  const upFloor = (id, fn) => setFloors(fs=>fs.map(f=> f.id===id ? fn(f) : f));
  const upSite  = (fid,sid, fn) => upFloor(fid, f=>({...f, sites: f.sites.map(s=> s.id===sid ? fn(s) : s)}));
  const delFloor = id => { const fl=floors.find(f=>f.id===id); setDeleted(d=>[...d,`קומה: ${fl.name}`]); upFloor(id, f=>({...f,enabled:false,open:false})); };
  const delSite  = (fid,sid) => { const s=floors.find(f=>f.id===fid)?.sites.find(s=>s.id===sid); setDeleted(d=>[...d,`אתר: ${s?.name}`]); upSite(fid,sid,s=>({...s,enabled:false})); };
  const delEq    = (fid,sid,eid,nm) => { setDeleted(d=>[...d,`ציוד: ${nm}`]); if(sid) upSite(fid,sid,s=>({...s,equipment:s.equipment.map(e=>e.id===eid?{...e,enabled:false}:e)})); else upFloor(fid,f=>({...f,floorEquipment:f.floorEquipment.map(e=>e.id===eid?{...e,enabled:false}:e)})); };
  const openAll  = () => setFloors(fs=>fs.map(f=>({...f,open:true,sites:f.sites.map(s=>({...s,open:true}))})));
  const closeAll = () => setFloors(fs=>fs.map(f=>({...f,open:false,sites:f.sites.map(s=>({...s,open:false}))})));

  const ROW = (pl) => ({ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", paddingLeft:pl, borderRadius:6, marginBottom:2, transition:"background 0.1s" });
  const onHEV = e => { e.currentTarget.style.background="#f1f5f9"; const a=e.currentTarget.querySelector(".act"); if(a) a.style.opacity=1; };
  const onHEL = e => { e.currentTarget.style.background="transparent"; const a=e.currentTarget.querySelector(".act"); if(a) a.style.opacity=0; };

  const modelBadge = mt => mt==="leasable_site"
    ? <Badge label="לניהול שכירות" bg="#fef9c3" text="#854d0e"/>
    : null;

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", display:"flex", height:"100vh", background:"#f8fafc", direction:"rtl" }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width:220, background:"#0f172a", color:"#e2e8f0", padding:"20px 16px", display:"flex", flexDirection:"column", gap:16, flexShrink:0, overflowY:"auto" }}>
        {[["לקוח", INIT.customerName],["נכס", INIT.propertyName],["בניין", building.name]].map(([lbl,val])=>(
          <div key={lbl}>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:1.2, textTransform:"uppercase", marginBottom:3 }}>{lbl}</div>
            <div style={{ fontSize:13, fontWeight:700, color:lbl==="בניין"?"#60a5fa":"#e2e8f0" }}>{val}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize:9, color:"#475569", letterSpacing:1.2, textTransform:"uppercase", marginBottom:3 }}>סביבה</div>
          <div style={{ fontSize:12, color:INIT.env==="Production"?"#f87171":"#f59e0b", fontWeight:600 }}>● {INIT.env}</div>
        </div>

        <div style={{ borderTop:"1px solid #1e293b", paddingTop:14, display:"flex", flexDirection:"column", gap:8 }}>
          {[["📐","קומות",totalFloors],["📁","אתרים",totalSites],["↳","תת-אתרים",totalSubSites],["🔧","ציוד",totalEq]].map(([ic,lb,ct])=>(
            <div key={lb} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:6, alignItems:"center", fontSize:12, color:"#94a3b8" }}><span>{ic}</span><span>{lb}</span></div>
              <span style={{ fontWeight:700, fontSize:14, color:"#e2e8f0" }}>{ct}</span>
            </div>
          ))}
          <div style={{ borderTop:"1px solid #1e293b", paddingTop:8, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:"#64748b" }}>סה״כ ישויות</span>
            <span style={{ fontWeight:700, fontSize:15, color:"#60a5fa" }}>{1+totalFloors+totalSites+totalSubSites+totalEq}</span>
          </div>
        </div>

        {deleted.length>0 && (
          <div style={{ borderTop:"1px solid #1e293b", paddingTop:12 }}>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:1.2, marginBottom:6 }}>הוסר</div>
            {deleted.map((d,i)=><div key={i} style={{ fontSize:11, color:"#ef4444", marginBottom:3 }}>✕ {d}</div>)}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #e2e8f0", background:"#fff", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#1e293b" }}>מבנה הבניין — תצוגה מקדימה</div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {["פתח הכל","סגור הכל"].map((lbl,i)=>(
              <button key={lbl} onClick={i===0?openAll:closeAll}
                style={{ fontSize:11, padding:"4px 10px", borderRadius:6, background:"#f1f5f9", border:"1px solid #e2e8f0", cursor:"pointer", color:"#475569", fontWeight:500 }}>{lbl}</button>
            ))}
            {approved
              ? <div style={{ fontSize:10, padding:"4px 12px", borderRadius:99, background:"#dcfce7", color:"#166534", border:"1px solid #bbf7d0", fontWeight:600 }}>✅ אושר — אמור "תטמיע"</div>
              : <button onClick={()=>setApproved(true)} style={{ fontSize:10, padding:"4px 12px", borderRadius:99, background:"#fef9c3", color:"#92400e", border:"1px solid #fde68a", fontWeight:600, cursor:"pointer" }}>ממתין לאישור — לחץ לאשר</button>
            }
          </div>
        </div>
        <div style={{ padding:"5px 16px", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", fontSize:11, color:"#94a3b8" }}>
          לחץ פעמיים על שם לעריכה · 🗑 על hover למחיקה · ⚠️ = הועבר מאתרים לציוד · ✏️ = נוסף ידנית · ❓ = ממתין לאישור
        </div>

        {/* Tree */}
        <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>

          {/* Building */}
          <div style={{ ...ROW(8), marginBottom:8 }}>
            <span style={{ fontSize:18 }}>🏢</span>
            <InlineEdit value={building.name} onSave={v=>setBuilding({name:v})} style={{ fontWeight:700, fontSize:15, color:"#1e293b" }} />
            <Badge label="building" bg="#dbeafe" text="#1d4ed8"/>
          </div>

          {/* Floors */}
          {floors.map(floor => !floor.enabled ? null : (
            <div key={floor.id} style={{ marginBottom:4 }}>
              {/* Floor row */}
              <div onClick={()=>upFloor(floor.id,f=>({...f,open:!f.open}))}
                style={{ ...ROW(18), cursor:"pointer", background:floor.open?"#f0f9ff":"transparent" }}
                onMouseEnter={onHEV} onMouseLeave={onHEL}>
                <span style={{ fontSize:10, color:"#94a3b8", width:12, textAlign:"center" }}>{floor.open?"▼":"▶"}</span>
                <span style={{ fontSize:14 }}>📐</span>
                <InlineEdit value={floor.name} onSave={v=>upFloor(floor.id,f=>({...f,name:v}))} style={{ fontWeight:600, fontSize:13, color:"#1e293b" }} />
                <Badge label={`level ${floor.level}`} bg="#f0fdf4" text="#16a34a"/>
                {floor.levelNote && <span style={{ fontSize:10, color:"#f59e0b" }}>{floor.levelNote}</span>}
                <span style={{ fontSize:10, color:"#94a3b8", marginRight:"auto" }}>{floor.sites.filter(s=>s.enabled).length} אתרים · {floor.floorEquipment.filter(e=>e.enabled).length} ציוד</span>
                <div className="act" style={{ display:"flex", gap:2, opacity:0, transition:"opacity 0.15s" }}>
                  <IconBtn icon="🗑" title="מחק קומה" onClick={()=>delFloor(floor.id)} danger/>
                </div>
              </div>

              {/* Sites + floor equipment (shown when floor is open) */}
              {floor.open && <>
                {floor.sites.map(site => !site.enabled ? null : (
                  <div key={site.id}>
                    {/* Site row */}
                    <div
                      onClick={()=>(site.subSites?.length>0||site.equipment?.length>0) && upSite(floor.id,site.id,s=>({...s,open:!s.open}))}
                      style={{ ...ROW(36), cursor:(site.subSites?.length>0||site.equipment?.length>0)?"pointer":"default" }}
                      onMouseEnter={onHEV} onMouseLeave={onHEL}>
                      {(site.subSites?.length>0||site.equipment?.length>0)
                        ? <span style={{ fontSize:9, color:"#94a3b8", width:10 }}>{site.open?"▼":"▶"}</span>
                        : <span style={{ width:10 }}/>}
                      <span style={{ fontSize:13 }}>{site.modelType==="leasable_site"?"🏠":"📁"}</span>
                      <InlineEdit value={site.name} onSave={v=>upSite(floor.id,site.id,s=>({...s,name:v}))} style={{ fontSize:13, color:"#1e293b" }} />
                      {site.type && <Badge label={site.type} bg="#ede9fe" text="#7c3aed"/>}
                      {modelBadge(site.modelType)}
                      {site.area && <Badge label={`${site.area} מ"ר`} bg="#f0fdf4" text="#15803d"/>}
                      {site.note && <span style={{ fontSize:10, color:"#f59e0b" }}>{site.note}</span>}
                      <div className="act" style={{ marginRight:"auto", display:"flex", gap:2, opacity:0, transition:"opacity 0.15s" }}>
                        <IconBtn icon="🗑" title="מחק אתר" onClick={()=>delSite(floor.id,site.id)} danger/>
                      </div>
                    </div>

                    {/* Sub-sites (shown when site is open) */}
                    {site.open && (site.subSites||[]).map(ss => !ss.enabled ? null : (
                      <div key={ss.id} style={{ ...ROW(54) }} onMouseEnter={onHEV} onMouseLeave={onHEL}>
                        <span style={{ width:10 }}/>
                        <span style={{ fontSize:12 }}>↳</span>
                        <InlineEdit value={ss.name} onSave={v=>upSite(floor.id,site.id,s=>({...s,subSites:s.subSites.map(x=>x.id===ss.id?{...x,name:v}:x)}))} style={{ fontSize:12, color:"#475569" }} />
                        {ss.type && <Badge label={ss.type} bg="#f1f5f9" text="#475569"/>}
                        <div className="act" style={{ marginRight:"auto", display:"flex", gap:2, opacity:0 }}>
                          <IconBtn icon="🗑" title="מחק תת-אתר" onClick={()=>upSite(floor.id,site.id,s=>({...s,subSites:s.subSites.map(x=>x.id===ss.id?{...x,enabled:false}:x)}))} danger/>
                        </div>
                      </div>
                    ))}

                    {/* Equipment under site (shown when site is open) */}
                    {site.open && (site.equipment||[]).map(eq => !eq.enabled ? null : (
                      <div key={eq.id} style={{ ...ROW(54) }} onMouseEnter={onHEV} onMouseLeave={onHEL}>
                        <span style={{ width:10 }}/>
                        <span style={{ fontSize:13 }}>🔧</span>
                        <InlineEdit value={eq.name} onSave={v=>upSite(floor.id,site.id,s=>({...s,equipment:s.equipment.map(x=>x.id===eq.id?{...x,name:v}:x)}))} style={{ fontSize:12, color:"#64748b" }} />
                        {eq.type && <Badge label={eq.type} bg="#fff7ed" text="#c2410c"/>}
                        <div className="act" style={{ marginRight:"auto", display:"flex", gap:2, opacity:0 }}>
                          <IconBtn icon="🗑" title="מחק ציוד" onClick={()=>delEq(floor.id,site.id,eq.id,eq.name)} danger/>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Floor-level equipment */}
                {floor.floorEquipment.filter(e=>e.enabled).length > 0 && (
                  <div style={{ marginRight:36, marginBottom:2 }}>
                    <div style={{ fontSize:10, color:"#94a3b8", padding:"3px 8px", letterSpacing:0.5 }}>ציוד ישיר על הקומה</div>
                    {floor.floorEquipment.map(eq => !eq.enabled ? null : (
                      <div key={eq.id} style={{ ...ROW(44) }} onMouseEnter={onHEV} onMouseLeave={onHEL}>
                        <span style={{ width:10 }}/>
                        <span style={{ fontSize:13 }}>🔧</span>
                        <InlineEdit value={eq.name} onSave={v=>upFloor(floor.id,f=>({...f,floorEquipment:f.floorEquipment.map(x=>x.id===eq.id?{...x,name:v}:x)}))} style={{ fontSize:12, color:"#64748b" }} />
                        {eq.type && <Badge label={eq.type} bg="#fff7ed" text="#c2410c"/>}
                        {eq.note && <span style={{ fontSize:10, color:"#f59e0b" }}>{eq.note}</span>}
                        <div className="act" style={{ marginRight:"auto", display:"flex", gap:2, opacity:0 }}>
                          <IconBtn icon="🗑" title="מחק ציוד" onClick={()=>delEq(floor.id,null,eq.id,eq.name)} danger/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 16px", background:"#fff", borderTop:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:11, color:"#94a3b8" }}>ערוך → אשר → אמור "תטמיע" להטמעה</span>
          <span style={{ fontSize:12, color:"#475569", fontWeight:500 }}>{totalFloors} קומות · {totalSites} אתרים · {totalSubSites} תת-אתרים · {totalEq} ציוד</span>
        </div>
      </div>
    </div>
  );
}
