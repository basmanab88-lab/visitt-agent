import { useState } from "react";

// ============================================================
// DATA — קרסו חדרה — 13 משימות לטמיעה
// ============================================================

const PROPERTY = "קרסו חדרה";
const CUSTOMER = "מקדן";
const ENV = "Production";

const CATEGORIES = {
  "אחזקה": { id: "ccjNA7BWpNqbLowvc", color: "#3b82f6" },
  "מיזוג אויר": { id: "635225496bf43934ff2e73e7", color: "#8b5cf6", note: "שם בויזיט: מיזוג" },
  "כיבוי אש": { id: "631da6b54802925dbf545777", color: "#ef4444" },
};

const FREQ_LABELS = {
  "יומית": { label: "יומי", iso: "P1D", color: "#0ea5e9" },
  "שבועית": { label: "שבועי", iso: "P1W", color: "#10b981" },
  "חודשית": { label: "חודשי", iso: "P1M", color: "#f59e0b" },
  "תלת חודשית": { label: "כל 3 חודשים", iso: "P3M", color: "#f97316" },
  "חצי שנתית": { label: "חצי שנתי", iso: "P6M", color: "#ec4899" },
};

// Sites confirmed to exist in Visitt
const SITES_IN_SYSTEM = {
  "כל הבניין": { id: "NEW", note: "יוצר חדש — ללא שיוך לקומה" },
  "גנרטור": { id: "69d7bfd0bcc9bdb337321b68", note: "קומת גג טכני" },
  "חדר משאבות (מינוס 2)": { id: "69d7bfcafd4c93e01992a4fe", note: "קומת חניון מינוס 2" },
  "חדר משאבות (קומה 0)": { id: "69d7bfccbcc9bdb337321b50", note: "קומה 0" },
  "עמדת כיבוי אש (×4)": { id: "MULTI", note: "4 עמדות בבניין" },
  "שירותי גברים + נשים + נכים": { id: "MULTI", note: "3 אתרי שירותים" },
};

const INSPECTIONS = [
  {
    id: 1,
    name: "סיור יומי",
    freq: "יומית",
    category: "אחזקה",
    site: "כל הבניין",
    siteNote: "NEW — ללא שיוך קומה",
    tasks: [
      { desc: "בצע בדיקה ויזואלית", type: "בחירה מרובה", opts: "נבדק, לא נבדק" },
      { desc: "בדיקת תקינות תאורה", type: "צ'ק" },
      { desc: "בדוק ניקיון", type: "צ'ק" },
      { desc: "בדוק כי אין מפגעים", type: "צ'ק" },
      { desc: "בדוק כי אין נזילות", type: "צ'ק" },
    ],
  },
  {
    id: 2,
    name: "סיור יומי חניון",
    freq: "יומית",
    category: "אחזקה",
    site: "כל הבניין",
    siteNote: "בהיעדר אתר חניון ייעודי",
    tasks: [
      { desc: "בצע בדיקה ויזואלית", type: "צ'ק" },
      { desc: "בדוק כי הדלתות נעולות", type: "צ'ק" },
      { desc: "בדוק תאורה", type: "צ'ק" },
      { desc: "בדוק נזילות", type: "צ'ק" },
      { desc: "בדוק ניקיון", type: "צ'ק" },
    ],
  },
  {
    id: 3,
    name: "בדיקת צ׳ילרים (יומית)",
    freq: "יומית",
    category: "מיזוג אויר",
    site: "כל הבניין",
    siteNote: "אין אתר צ'ילרים — הצעה: כל הבניין",
    tasks: [
      { desc: "בדוק תקינות ויזואלית", type: "צ'ק" },
      { desc: "בדוק נזילות", type: "צ'ק" },
      { desc: "רשום לחץ יניקה", type: "מספר", unit: "PSI" },
      { desc: "רשום לחץ דחיסה", type: "מספר", unit: "PSI" },
      { desc: "רשום לחץ שמן", type: "מספר", unit: "PSI" },
      { desc: "רשום טמפ' מים בכניסה", type: "מספר", unit: "°C" },
      { desc: "רשום טמפ' מים ביציאה", type: "מספר", unit: "°C" },
    ],
  },
  {
    id: 4,
    name: "בדיקת חדרי משאבות",
    freq: "יומית",
    category: "כיבוי אש",
    site: "חדר משאבות",
    siteNote: "קיים ×2 — מינוס 2 וקומה 0",
    tasks: [
      { desc: "בדוק בדיקה ויזואלית", type: "צ'ק" },
      { desc: "חוסר נזילות מים מצנרת ומשאבות", type: "צ'ק" },
      { desc: "בדוק תקינות לוחות חשמל", type: "צ'ק" },
      { desc: "וודא חוסר גלישת מים ממאגר המים", type: "צ'ק" },
      { desc: "וודא ניקיון חדר המשאבות", type: "צ'ק" },
    ],
  },
  {
    id: 5,
    name: "בדיקת צ׳ילרים (שבועית)",
    freq: "שבועית",
    category: "מיזוג אויר",
    site: "כל הבניין",
    siteNote: "אין אתר צ'ילרים — הצעה: כל הבניין",
    tasks: [
      { desc: "בדוק תקינות ויזואלית", type: "צ'ק" },
      { desc: "בדוק נזילות", type: "צ'ק" },
      { desc: "רשום לחץ יניקה", type: "מספר", unit: "PSI" },
      { desc: "רשום לחץ דחיסה", type: "מספר", unit: "PSI" },
      { desc: "רשום לחץ שמן", type: "מספר", unit: "PSI" },
      { desc: "רשום טמפ' מים בכניסה", type: "מספר", unit: "°C" },
      { desc: "רשום טמפ' מים ביציאה", type: "מספר", unit: "°C" },
      { desc: "הקשב לרעשים חריגים", type: "צ'ק" },
      { desc: "בדוק כתמי שמן ומים מסביב ליחידה", type: "צ'ק" },
      { desc: "נקה מסננים במערכות המים", type: "צ'ק" },
      { desc: "בדוק תקינות הבידוד", type: "צ'ק" },
    ],
  },
  {
    id: 6,
    name: "בדיקת משאבות מים",
    freq: "שבועית",
    category: "אחזקה",
    site: "חדר משאבות",
    siteNote: "קיים ×2 — מינוס 2 וקומה 0",
    tasks: [
      { desc: "רשום לחץ מים יניקה-אטמ'", type: "צ'ק" },
      { desc: "רשום לחץ מים סניקה-אטמ'", type: "צ'ק" },
      { desc: "הקשב לרעידות ולרעשים חריגים", type: "צ'ק" },
      { desc: "בדוק נזילות מים", type: "צ'ק" },
    ],
  },
  {
    id: 7,
    name: "בדיקת ציוד כיבוי אש בקומות",
    freq: "שבועית",
    category: "כיבוי אש",
    site: "כל הבניין",
    siteNote: "אושר ע\"י בסמן — אחד לכל הבניין",
    tasks: [
      { desc: "בדוק הימצאות מזנק", type: "צ'ק" },
      { desc: "בדוק הימצאות מטף", type: "צ'ק" },
      { desc: "בדוק הימצאות 2 צינורות בד", type: "צ'ק" },
    ],
  },
  {
    id: 8,
    name: "בדיקת גנרטור דיזל",
    freq: "שבועית",
    category: "אחזקה",
    site: "גנרטור",
    siteNote: "קיים — קומת גג טכני",
    tasks: [
      { desc: "בדוק בדיקה ויזואלית לגנרטור וסביבתו", type: "צ'ק" },
      { desc: "בדוק גובה שמן באגן השמן", type: "צ'ק" },
      { desc: "בדוק גובה מים ברדיאטור", type: "צ'ק" },
      { desc: "וודא שהכבלים של המצבר מחוזקים", type: "צ'ק" },
      { desc: "בדוק ורשום זרם ומתח הטעינה", type: "מספר", unit: "A" },
      { desc: "בדוק ברז המאצרות סגור ומבנה המאצרה תקין", type: "צ'ק" },
      { desc: "בדוק מטפים אוטומטיים בלוח החשמל", type: "צ'ק" },
      { desc: "בדוק מאצרות סולר", type: "צ'ק" },
      { desc: "בדוק תקינות מיכל הדלק", type: "צ'ק" },
      { desc: "בדוק מיכל דלק יומי מלא (לפחות 75%)", type: "צ'ק" },
      { desc: "בדוק כי הברז בין הגנרטור למיכל הסולר פתוח", type: "צ'ק" },
    ],
  },
  {
    id: 9,
    name: "בדיקת תקינות קומות",
    freq: "חודשית",
    category: "אחזקה",
    site: "כל הבניין",
    siteNote: "אושר ע\"י בסמן — אחד לכל הבניין",
    tasks: [
      { desc: "בדוק תקינות צבע", type: "צ'ק" },
      { desc: "בדיקת ניקיון ותקינות רצפה", type: "צ'ק" },
      { desc: "בדיקת תקינות דלתות", type: "צ'ק" },
      { desc: "בדיקת תקינות תאורה", type: "צ'ק" },
      { desc: "בדיקת תקינות שלטים", type: "צ'ק" },
      { desc: "בדיקת תקינות פאנל מעליות", type: "צ'ק" },
    ],
  },
  {
    id: 10,
    name: 'בדיקת יט"אות',
    freq: "חודשית",
    category: "מיזוג אויר",
    site: "כל הבניין",
    siteNote: "FCU — אין אתר ייעודי",
    tasks: [
      { desc: "בדוק ויזואלית לרעשים ורעידות", type: "צ'ק" },
      { desc: "בדוק טמפ' אוויר ביציאה ובכניסה (הפרש 12°C)", type: "מספר", unit: "°C" },
      { desc: "בדוק מכלול המכונה לרעשים ורעידות", type: "צ'ק" },
      { desc: "בדוק ניקיון יציאת ניקוז המים", type: "צ'ק" },
      { desc: "בדוק מסנן אוויר ומסגרות, החלף או נקה", type: "צ'ק" },
      { desc: "בדוק אביזרי פקוד, תרמוסטט", type: "צ'ק" },
      { desc: "בדוק מגן השהיה למדחס", type: "צ'ק" },
    ],
  },
  {
    id: 11,
    name: "בדיקת שירותים",
    freq: "תלת חודשית",
    category: "אחזקה",
    site: "שירותי גברים / נשים / נכים",
    siteNote: "3 אתרי שירותים קיימים בבניין",
    tasks: [
      { desc: "אסלות — בדוק ויזואלית", type: "צ'ק" },
      { desc: "מכסה אסלות — בדוק חיזוק", type: "צ'ק" },
      { desc: "כיורים — בדוק ויזואלית", type: "צ'ק" },
      { desc: "ברזים — בדוק קיבוע", type: "צ'ק" },
      { desc: "סבוניות — בדוק קיבוע", type: "צ'ק" },
      { desc: "מראה — בדוק קיבוע", type: "צ'ק" },
      { desc: "מדיפי ריח — בדוק קיבוע", type: "צ'ק" },
      { desc: "מכשיר נייר טואלט — בדוק קיבוע", type: "צ'ק" },
      { desc: "בצע פירוק 'סיפון' לבדיקת ניקיון", type: "צ'ק" },
      { desc: "בודק יניקת אוויר משירותים", type: "צ'ק" },
      { desc: "בדוק חיזוק דלתות השירותים", type: "צ'ק" },
    ],
  },
  {
    id: 12,
    name: "בדיקת מזגן מפוצל",
    freq: "תלת חודשית",
    category: "מיזוג אויר",
    site: "כל הבניין",
    siteNote: "אין אתר ייעודי — הצעה: כל הבניין",
    tasks: [
      { desc: "בדוק טמפרטורת אויר ביציאה ובכניסה (הפרש 12°C)", type: "מספר", unit: "°C" },
      { desc: "בדוק מכלול המכונה לרעשים ורעידות", type: "צ'ק" },
      { desc: "בדוק נקיון יציאת נקוז המים", type: "צ'ק" },
      { desc: "בדוק מסנן אויר ומסגרות", type: "צ'ק" },
      { desc: "בדוק אביזרי פקוד, תרמוסטט", type: "צ'ק" },
      { desc: "בדוק מגן השהיה למדחס ובדוק בידוד", type: "צ'ק" },
    ],
  },
  {
    id: 13,
    name: "בדיקת עמדות כיבוי אש",
    freq: "חצי שנתית",
    category: "כיבוי אש",
    site: "עמדת כיבוי אש (×4)",
    siteNote: "4 עמדות קיימות בבניין",
    tasks: [
      { desc: "וודא הימצאות זרנוק ×2", type: "צ'ק" },
      { desc: "וודא הימצאות 1 מזנק 2\"", type: "צ'ק" },
      { desc: "וודא הימצאות גלגלון 25מ' עם מזנק 3/4\"", type: "צ'ק" },
      { desc: "וודא הימצאות מטף אבקה 6 ק\"ג", type: "צ'ק" },
      { desc: "בדוק תקינות המטף — מחוג על הירוק", type: "צ'ק" },
      { desc: "בדוק נזילות מים בצנרת כיבוי האש", type: "צ'ק" },
      { desc: "בדוק ניקיון העמדה", type: "צ'ק" },
    ],
  },
];

const TYPE_ICON = {
  "צ'ק": "☑",
  "מספר": "🔢",
  "בחירה מרובה": "◉",
};

const CAT_COLOR = { "אחזקה": "#3b82f6", "מיזוג אויר": "#8b5cf6", "כיבוי אש": "#ef4444" };

export default function InspectionsPreview() {
  const [expanded, setExpanded] = useState({});
  const [userApproved, setUserApproved] = useState(false);

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const freqCounts = INSPECTIONS.reduce((acc, i) => {
    acc[i.freq] = (acc[i.freq] || 0) + 1;
    return acc;
  }, {});

  const totalTasks = INSPECTIONS.reduce((sum, i) => sum + i.tasks.length, 0);

  return (
    <div dir="rtl" style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex" }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#1e293b", color: "#e2e8f0", padding: 20, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>🏢 {PROPERTY}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>לקוח: {CUSTOMER}</div>
        <div style={{ background: "#ef4444", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11, display: "inline-block", marginBottom: 16 }}>
          {ENV}
        </div>

        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>סיכום</div>
        <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#38bdf8" }}>{INSPECTIONS.length}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>משימות לטמיעה</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa", marginTop: 8 }}>{totalTasks}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>בדיקות סה"כ</div>
        </div>

        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>לפי תדירות</div>
        {Object.entries(freqCounts).map(([freq, count]) => (
          <div key={freq} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px solid #1e3a5f" }}>
            <span style={{ color: FREQ_LABELS[freq]?.color || "#e2e8f0" }}>{FREQ_LABELS[freq]?.label || freq}</span>
            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{count}</span>
          </div>
        ))}

        <div style={{ marginTop: 16, background: "#7c2d12", borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5", marginBottom: 4 }}>⚠️ שים לב</div>
          <div style={{ fontSize: 11, color: "#fcd9bd", lineHeight: 1.5 }}>
            <strong>שליו פחימה</strong> לא קיים במערכת.<br />
            יש לבחור משתמש חלופי.
          </div>
        </div>

        <div style={{ marginTop: 12, background: "#14532d", borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#86efac", marginBottom: 4 }}>✨ אתר חדש</div>
          <div style={{ fontSize: 11, color: "#bbf7d0", lineHeight: 1.5 }}>
            <strong>כל הבניין</strong> יוצר ללא שיוך קומה (8 משימות)
          </div>
        </div>

        <div style={{ marginTop: 20, padding: "10px 0", borderTop: "1px solid #334155" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>קטגוריות</div>
          {Object.entries(CAT_COLOR).map(([cat, col]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: col }} />
              <span style={{ color: "#e2e8f0" }}>{cat}</span>
            </div>
          ))}
        </div>

        {!userApproved && (
          <button
            onClick={() => setUserApproved(true)}
            style={{ marginTop: 20, width: "100%", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            ✅ אשר וטמע
          </button>
        )}
        {userApproved && (
          <div style={{ marginTop: 20, background: "#16a34a", borderRadius: 8, padding: 10, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
            ✅ מאושר — ממתין לאגנט
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#0f172a" }}>
            תצוגה מקדימה — 13 משימות לטמיעה
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            לחץ על כל משימה לפירוט הבדיקות • אשר ואז שלח "תטמיע"
          </p>
        </div>

        {INSPECTIONS.map((insp) => {
          const catColor = CAT_COLOR[insp.category] || "#64748b";
          const freqInfo = FREQ_LABELS[insp.freq] || {};
          const isOpen = expanded[insp.id];

          return (
            <div
              key={insp.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                marginBottom: 10,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                border: `1px solid ${isOpen ? catColor + "40" : "#e2e8f0"}`,
                overflow: "hidden",
              }}
            >
              {/* Header row */}
              <div
                onClick={() => toggle(insp.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderRight: `4px solid ${catColor}`,
                  background: isOpen ? catColor + "08" : "transparent",
                }}
              >
                <div style={{ minWidth: 28, height: 28, borderRadius: "50%", background: catColor + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: catColor }}>
                  {insp.id}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{insp.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    📍 {insp.site}
                    {insp.siteNote && <span style={{ color: "#94a3b8", marginRight: 4 }}>({insp.siteNote})</span>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ background: catColor + "20", color: catColor, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                    {insp.category}
                  </span>
                  <span style={{ background: (freqInfo.color || "#64748b") + "20", color: freqInfo.color || "#64748b", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                    {freqInfo.label || insp.freq}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>{insp.tasks.length} בדיקות</span>
                  <span style={{ color: "#94a3b8", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded tasks */}
              {isOpen && (
                <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, fontWeight: 600 }}>
                    ISO Duration: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{freqInfo.iso}</code>
                    &nbsp;&nbsp;|&nbsp;&nbsp; Completion Policy: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>iso_duration</code>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {insp.tasks.map((t, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px", background: "#f8fafc", borderRadius: 6 }}>
                        <span style={{ fontSize: 14, marginTop: 1 }}>{TYPE_ICON[t.type] || "•"}</span>
                        <div style={{ flex: 1, fontSize: 13, color: "#374151" }}>
                          {t.desc}
                          {t.opts && <span style={{ color: "#94a3b8", fontSize: 11, marginRight: 6 }}>[{t.opts}]</span>}
                          {t.unit && <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 4, padding: "1px 5px", fontSize: 10, marginRight: 6 }}>{t.unit}</span>}
                        </div>
                        <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap" }}>{t.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Warning box */}
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 16, marginTop: 16 }}>
          <div style={{ fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>⚠️ נדרש אישורך לפני טמיעה</div>
          <div style={{ fontSize: 13, color: "#7c2d12", lineHeight: 1.8 }}>
            <strong>1. משתמש:</strong> שליו פחימה לא נמצא ב-51 משתמשי מקדן. מי צריך לקבל את המשימות?<br />
            <strong>2. אתר "כל הבניין":</strong> יוצר חדש ללא שיוך לקומה — אישור?<br />
            <strong>3. צ'ילרים:</strong> אין אתר צ'ילרים בבניין — שיוך ל"כל הבניין" או ליצור אתר חדש?<br />
            <strong>4. חדר משאבות:</strong> יש 2 אתרים — ליצור משימה נפרדת לכל אחד או אחת לשניהם?
          </div>
        </div>
      </div>
    </div>
  );
}
