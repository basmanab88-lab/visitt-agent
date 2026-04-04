import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CEREBRAS_KEY = Deno.env.get("CEREBRAS_API_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function aiCall(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${CEREBRAS_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Cerebras ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Google token helpers ──
function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function getGoogleAccessToken(
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return null;

  let accessToken = tokenRow.access_token;
  const expiresAt = tokenRow.token_expires_at ? new Date(tokenRow.token_expires_at) : null;

  if (expiresAt && expiresAt <= new Date() && tokenRow.refresh_token) {
    const newToken = await refreshGoogleToken(tokenRow.refresh_token);
    if (newToken) {
      accessToken = newToken;
      await supabase
        .from("google_tokens")
        .update({
          access_token: newToken,
          token_expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  return accessToken;
}

// ── CV Copy + Apply Replacements ──
async function createTailoredCV(
  accessToken: string,
  templateDocUrl: string,
  companyName: string,
  replacements: Array<{ find: string; replace: string }>
): Promise<string | null> {
  const docId = extractDocId(templateDocUrl);
  if (!docId) return null;

  const copyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: `CV - ${companyName}` }),
    }
  );

  if (!copyRes.ok) {
    console.error("Drive copy error:", copyRes.status, await copyRes.text());
    return null;
  }

  const copyData = await copyRes.json();
  const newDocId = copyData.id;

  if (replacements?.length) {
    const requests = replacements.map((r) => ({
      replaceAllText: {
        containsText: { text: r.find, matchCase: true },
        replaceText: r.replace,
      },
    }));

    const updateRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${newDocId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!updateRes.ok) {
      console.error("Docs batchUpdate error:", updateRes.status, await updateRes.text());
    }
  }

  return `https://docs.google.com/document/d/${newDocId}/edit`;
}

// ── Send Summary Email via Resend ──
async function sendSummaryEmail(
  toEmail: string,
  results: any[],
  runId: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("No RESEND_API_KEY — skipping email");
    return false;
  }

  const jobRows = results
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">
            <strong><a href="${r.job_url_text || "#"}">${r.job_title_text || "Unknown"}</a></strong><br/>
            ${r.job_company_text || ""} · ${r.job_city_text || ""}
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Math.round((r.match_score || 0) * 100)}%</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${(r.contacts_json || []).length}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${r.google_doc_url ? '<a href="' + r.google_doc_url + '">View CV</a>' : "—"}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2563eb">Career Muse — Daily Run</h2>
      <p>Found <strong>${results.length}</strong> matching jobs today.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f8fafc">
          <th style="padding:8px;text-align:left">Job</th>
          <th style="padding:8px;text-align:center">Match</th>
          <th style="padding:8px;text-align:center">Contacts</th>
          <th style="padding:8px;text-align:center">CV</th>
        </tr>
        ${jobRows}
      </table>
      <p style="margin-top:16px">
        <a href="https://career-muse-os.vercel.app/agent" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
          Review in Career Muse
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Run ID: ${runId}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Career Muse <onboarding@resend.dev>",
      to: [toEmail],
      subject: `Career Muse — ${results.length} new jobs found`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
    return false;
  }
  return true;
}

// ══════════════════════════════════════════
//  CONTACT MATCHING — v13 UPGRADED
// ══════════════════════════════════════════

// Relevant titles for outreach (hiring managers, recruiters, team leads, ops people)
const RELEVANT_TITLE_PATTERNS = [
  /\brecruit/i, /\btalent\b/i, /\bhr\b/i, /\bhuman resources/i,
  /\bhiring/i, /\bpeople\b/i,
  /\bhead of/i, /\bvp\b/i, /\bdirector/i, /\bmanager/i, /\blead\b/i,
  /\bproduct/i, /\boperations/i, /\bops\b/i,
  /\bco-?founder/i, /\bceo\b/i, /\bcoo\b/i, /\bcto\b/i,
];

function isRelevantTitle(title: string | null): boolean {
  if (!title) return false;
  return RELEVANT_TITLE_PATTERNS.some((p) => p.test(title));
}

function scoreContact(contact: any, jobCompanyNorm: string, jobTitle: string): number {
  let score = 0;
  const contactCoNorm = (contact.company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const title = (contact.title || "").toLowerCase();
  const jobTitleLower = (jobTitle || "").toLowerCase();

  // Priority 1: Works at the target company (+100)
  if (contactCoNorm && jobCompanyNorm) {
    if (contactCoNorm.includes(jobCompanyNorm) || jobCompanyNorm.includes(contactCoNorm)) {
      score += 100;
    }
  }

  // Priority 2: Has a relevant title (+10-30)
  if (/recruit|talent|hiring|hr|human resources|people\s+(ops|oper)/i.test(title)) {
    score += 30; // Recruiters/talent are golden
  } else if (/head of|vp|director|c[eot]o|co-?founder/i.test(title)) {
    score += 25; // Senior leaders
  } else if (/manager|lead/i.test(title)) {
    score += 20; // Managers
  } else if (/product|operations|ops/i.test(title)) {
    score += 15; // Same domain
  }

  // Priority 3: Title overlaps with job title (+5)
  const jobWords = jobTitleLower.split(/\s+/).filter((w: string) => w.length > 3);
  for (const word of jobWords) {
    if (title.includes(word)) {
      score += 5;
      break;
    }
  }

  return score;
}

interface ScoredContact {
  full_name: string;
  title: string | null;
  company: string | null;
  linkedin_url: string | null;
  score: number;
  relevance: string; // Why this contact is relevant
}

function findBestContacts(
  allContacts: any[],
  jobCompany: string,
  jobTitle: string,
  maxContacts: number = 5
): ScoredContact[] {
  const jobCompanyNorm = (jobCompany || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const scored: ScoredContact[] = allContacts.map((c) => {
    const s = scoreContact(c, jobCompanyNorm, jobTitle);
    const contactCoNorm = (c.company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const atCompany = contactCoNorm && jobCompanyNorm &&
      (contactCoNorm.includes(jobCompanyNorm) || jobCompanyNorm.includes(contactCoNorm));

    let relevance = "";
    if (atCompany) {
      relevance = `Works at ${jobCompany}`;
      if (c.title) relevance += ` as ${c.title}`;
    } else if (s > 0 && isRelevantTitle(c.title)) {
      relevance = `${c.title} at ${c.company || "unknown"}`;
    }

    return {
      full_name: c.full_name,
      title: c.title,
      company: c.company,
      linkedin_url: c.linkedin_url,
      score: s,
      relevance,
    };
  });

  // Sort by score descending, take top N, but ONLY contacts with score > 0
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxContacts);
}

// ══════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { userId, mode } = body;

    // ── Mode: tailor_cv — on-demand CV tailoring from the UI ──
    if (mode === "tailor_cv") {
      const { originalCvText, jobTitle, jobCompany, jobDescription, tailorPrompt } = body;
      console.log("tailor_cv called:", { jobTitle, jobCompany, cvLen: originalCvText?.length, descLen: jobDescription?.length });
      if (!originalCvText || originalCvText.length < 50 || !jobTitle) {
        console.log("Skipping — insufficient data");
        return ok({ replacements: [], debug: "CV text too short or missing job title" });
      }

      try {
        const aiRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${CEREBRAS_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "qwen-3-235b-a22b-instruct-2507",
            messages: [
              {
                role: "system",
                content: `You tailor CVs for job applications. Given the original CV text and a job description, suggest specific text replacements to make the CV more relevant. Return a JSON array of {find, replace} objects. Each "find" must be an EXACT substring from the original CV. Each "replace" is the improved version. Focus on: professional summary, skill keywords, and experience descriptions. Keep changes minimal but impactful. Max 5 replacements. ${tailorPrompt || ""}`,
              },
              {
                role: "user",
                content: `Original CV:\n${originalCvText}\n\nJob: ${jobTitle} at ${jobCompany}\nDescription: ${jobDescription}`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "cv_replacements",
                parameters: {
                  type: "object",
                  properties: {
                    replacements: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { find: { type: "string" }, replace: { type: "string" } },
                        required: ["find", "replace"],
                      },
                    },
                  },
                  required: ["replacements"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "cv_replacements" } },
            temperature: 0.3,
          }),
        });
        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("Cerebras error:", aiRes.status, errText.slice(0, 200));
          return ok({ replacements: [], debug: `AI error ${aiRes.status}` });
        }
        const data = await aiRes.json();
        const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        console.log("AI args:", args?.slice(0, 300));
        const parsed = JSON.parse(args);
        return ok({ replacements: parsed?.replacements ?? [] });
      } catch (e) {
        console.error("CV tailor error:", e);
        return ok({ replacements: [] });
      }
    }

    if (!userId) return ok({ error: "userId required" });

    // ══════════════════════════════════════
    //  DAILY RUN PIPELINE
    // ══════════════════════════════════════

    // 1. Create a run record
    const { data: run, error: runErr } = await supabase
      .from("agent_runs")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (runErr) throw new Error(runErr.message);
    const runId = run.id;

    // 2. Get user preferences + embedding
    const { data: prefs } = await supabase
      .from("suggestion_preferences")
      .select("preferences, embedding")
      .eq("user_id", userId)
      .maybeSingle();

    // 3. Get already-acted job IDs (from previous runs + signals)
    const { data: prevResults } = await supabase
      .from("agent_results")
      .select("job_directory_id")
      .eq("user_id", userId);
    const { data: signals } = await supabase
      .from("user_signals")
      .select("job_directory_id")
      .eq("user_id", userId);

    const excludeIds = [
      ...new Set([
        ...(prevResults ?? []).map((r: any) => r.job_directory_id),
        ...(signals ?? []).map((s: any) => s.job_directory_id),
      ]),
    ].filter((id) => id != null); // CRITICAL: filter nulls to prevent PostgREST serialization issues

    console.log("Exclude IDs count:", excludeIds.length, "(nulls filtered)");

    // 4. DISCOVER: Find top matching jobs via vector similarity
    let matches: any[] = [];

    if (prefs?.embedding) {
      const embeddingStr = typeof prefs.embedding === "string" ? prefs.embedding : JSON.stringify(prefs.embedding);
      const { data: vectorMatches, error: vecErr } = await supabase.rpc("match_jobs_by_embedding", {
        query_embedding: embeddingStr,
        exclude_ids: excludeIds.length > 0 ? excludeIds : [],
        match_threshold: 0.15,
        match_count: 15,
      });
      if (vecErr) console.error("Vector search error:", vecErr);
      matches = vectorMatches ?? [];
      console.log("Vector matches:", matches.length, "top:", matches[0]?.title, matches[0]?.similarity, "excludes:", excludeIds.length);
    } else {
      console.log("No embedding found for user");
    }

    // Fallback: keyword search if no vector matches
    if (!matches.length && prefs?.preferences) {
      const keywords = prefs.preferences.split(/[,\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 2);
      if (keywords.length) {
        const orParts = keywords.slice(0, 10).flatMap((kw: string) => {
          const safe = kw.replace(/[%_'\"]/g, "");
          return safe ? [`title.ilike.%${safe}%`, `description.ilike.%${safe}%`] : [];
        });
        const { data: kwMatches } = await supabase
          .from("jobs_directory")
          .select("id, title, company, city, url, description")
          .or(orParts.join(","))
          .not("description", "is", null)
          .limit(15);
        matches = (kwMatches ?? [])
          .filter((j: any) => !excludeIds.includes(j.id))
          .map((j: any) => ({ ...j, similarity: 0.5 }));
      }
    }

    if (!matches.length) {
      await supabase
        .from("agent_runs")
        .update({ status: "completed", completed_at: new Date().toISOString(), job_count: 0 })
        .eq("id", runId);
      return ok({ runId, jobCount: 0, message: "No new matching jobs found. Try adjusting your preferences." });
    }

    // 5. Get user settings (for CV tailoring + email)
    const { data: settings } = await supabase
      .from("settings")
      .select("base_resume_text, tailor_prompt, candidate_name, enrich_api_key, shared_google_doc_url")
      .eq("user_id", userId)
      .maybeSingle();

    // 6. Get Google access token for CV copy
    const googleToken = await getGoogleAccessToken(supabase, userId);
    const templateDocUrl = settings?.shared_google_doc_url || "";

    // 7. Get ALL user's LinkedIn contacts (no limit — need full pool for matching)
    const { data: globalContacts } = await supabase
      .from("global_contacts")
      .select("full_name, title, linkedin_url, company")
      .eq("user_id", userId);

    // 8. Process each match: contacts + CV tailoring + CV copy + messages
    const results: any[] = [];

    for (const job of matches.slice(0, 5)) {
      const result: any = {
        run_id: runId,
        user_id: userId,
        job_directory_id: job.id,
        match_score: job.similarity ?? 0.5,
        user_action: "pending",
        source: "search",
        job_title_text: job.title || null,
        job_company_text: job.company || null,
        job_city_text: job.city || null,
        job_url_text: job.url || null,
        job_level_text: job.level || null,
        job_description_text: job.description || null,
      };

      // ── Find contacts — UPGRADED v13 ──
      const bestContacts = findBestContacts(
        globalContacts ?? [],
        job.company || "",
        job.title || "",
        5
      );

      result.contacts_json = bestContacts.map((c) => ({
        name: c.full_name,
        title: c.title,
        company: c.company,
        linkedin_url: c.linkedin_url,
        relevance: c.relevance,
        score: c.score,
      }));

      // ── Generate AI analysis + CV find-and-replace pairs ──
      if (CEREBRAS_KEY) {
        const cvText = settings?.base_resume_text || "";
        const tailorPrompt = settings?.tailor_prompt || "Focus on relevant experience and transferable skills.";
        const resumeContext = cvText
          ? `\n\nCandidate Resume:\n${cvText.slice(0, 3000)}`
          : `\n\nCandidate: ${settings?.candidate_name || "Job seeker"} — experienced in operations, customer success, and process optimization.`;

        // Step A: Generate insights
        try {
          const cvAnalysis = await aiCall(
            `You help job seekers prepare for applications. Given a job posting and candidate info, provide:\n1. A tailored professional summary (3-4 sentences) the candidate can use in their CV for this role\n2. Key strengths that match this role\n3. Any gaps or areas to address\n4. Suggested talking points for an interview\n\nBe specific and actionable. ${tailorPrompt}`,
            `Job: ${job.title} at ${job.company}\nDescription: ${(job.description || "").slice(0, 1500)}${resumeContext}`
          );
          result.tailored_cv_text = cvAnalysis;
        } catch (e) {
          console.error("CV analysis error:", e);
        }
        await new Promise((r) => setTimeout(r, 500));

        // Step B: Generate COMPREHENSIVE find-and-replace pairs — UPGRADED v13
        if (cvText.length > 100) {
          try {
            const repRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${CEREBRAS_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "qwen-3-235b-a22b-instruct-2507",
                messages: [
                  {
                    role: "system",
                    content: `You tailor CVs for job applications by producing find-and-replace pairs.

ABSOLUTE RULES (NEVER BREAK THESE):
- NEVER change job titles from experience section (e.g. "Support Operations & Product Delivery Lead" must stay exactly as is)
- NEVER change the candidate's identity line (the opening "Product Operations leader with 5+ years..." must keep "Product Operations" — you may adjust what follows but NEVER rename them to Engineer/Developer/Analyst/etc.)
- NEVER use em-dashes or long dashes (the character — or –). Use regular hyphens (-) only.
- Each "find" must be an EXACT character-for-character substring from the original CV text
- Each "replace" is the improved version tailored to the target job
- NEVER fabricate experience, credentials, or companies
- NEVER add tools/skills the candidate doesn't have

WHAT TO CHANGE (aim for 6-10 replacements, WOVEN THROUGHOUT the entire CV):
1. Professional summary (1-2 replacements) - reframe emphasis for the target role but KEEP "Product Operations" identity. Only adjust the description of what they specialize in.
2. Recent experience bullet points (2-3 replacements) - reword to emphasize transferable achievements that align with the job description. Use keywords from the job naturally.
3. AI Projects section bullets (1-2 replacements) - highlight the most relevant project aspects for this specific role
4. Older experience bullets (1 replacement) - connect past work to the target role's needs
5. Core competencies line (1 replacement) - reorder skills to front-load the ones most relevant to this job

STYLE:
- Keep it authentic. This person is an operations leader who builds AI tools, not an engineer.
- Use action verbs and quantified results
- Mirror keywords from the job description but keep it natural
- Subtle and professional, not over-optimized
- Use regular hyphens (-) not em-dashes`,
                  },
                  {
                    role: "user",
                    content: `Target: ${job.title} at ${job.company}\nJob Description: ${(job.description || "").slice(0, 1500)}\n\nOriginal CV:\n${cvText}`,
                  },
                ],
                tools: [{
                  type: "function",
                  function: {
                    name: "cv_replacements",
                    parameters: {
                      type: "object",
                      properties: {
                        replacements: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              find: { type: "string", description: "Exact text from the original CV" },
                              replace: { type: "string", description: "Tailored replacement text" },
                              section: { type: "string", description: "Which CV section: summary|title|experience|skills" },
                            },
                            required: ["find", "replace"],
                          },
                        },
                      },
                      required: ["replacements"],
                    },
                  },
                }],
                tool_choice: { type: "function", function: { name: "cv_replacements" } },
                temperature: 0.3,
              }),
            });
            if (repRes.ok) {
              const repData = await repRes.json();
              const toolCall = repData.choices?.[0]?.message?.tool_calls?.[0];
              if (toolCall) {
                const parsed = JSON.parse(toolCall.function.arguments);
                if (parsed?.replacements?.length) {
                  // POST-PROCESSING: Filter out dangerous replacements
                  const PROTECTED_STRINGS = [
                    "Support Operations & Product Delivery Lead",
                    "Onboarding Manager",
                    "Technical Support Specialist",
                    "Arabic Tutor",
                    "Security Operations Lead",
                    "Product Operations & AI Implementation Lead", // header title
                  ];
                  const filtered = parsed.replacements.filter((r: any) => {
                    const find = r.find?.trim() || "";
                    // Block any replacement that targets a protected job title
                    if (PROTECTED_STRINGS.some((p) => find === p || find.includes(p))) {
                      console.log("Blocked title replacement:", find, "->", r.replace);
                      return false;
                    }
                    // Block replacements that remove "Product Operations" from the identity line
                    if (find.startsWith("Product Operations leader") && !r.replace?.includes("Product Operations")) {
                      console.log("Blocked identity change:", find.slice(0, 40), "->", r.replace?.slice(0, 40));
                      return false;
                    }
                    // Block replacements with em-dashes in the output
                    if (r.replace && (r.replace.includes("\u2014") || r.replace.includes("\u2013"))) {
                      console.log("Blocked em-dash replacement:", r.replace.slice(0, 50));
                      return false;
                    }
                    return true;
                  });
                  if (filtered.length) {
                    result.cv_replacements = filtered;
                  }
                }
              }
            }
          } catch (e) {
            console.error("CV replacements error:", e);
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        // ── Step C — Create tailored Google Doc copy ──
        if (googleToken && templateDocUrl && result.cv_replacements?.length) {
          try {
            const docUrl = await createTailoredCV(
              googleToken,
              templateDocUrl,
              job.company || job.title || "Tailored",
              result.cv_replacements
            );
            if (docUrl) {
              result.google_doc_url = docUrl;
              console.log(`CV created for ${job.company}:`, docUrl);
            }
          } catch (e) {
            console.error("CV copy error:", e);
          }
        }
      }

      // ── Generate outreach messages — UPGRADED v13 ──
      const contactsForMessages = bestContacts.filter((c) => c.score > 0);
      if (contactsForMessages.length > 0 && CEREBRAS_KEY) {
        try {
          const msgText = await aiCall(
            `You write LinkedIn outreach messages for Basman, who is looking for his next role in tech.

BASMAN'S VOICE — follow these rules exactly:
- Casual, direct, Israeli tech style. Like texting a colleague, not writing a cover letter.
- Short. 2-3 sentences MAX. No fluff, no filler.
- NEVER use hyphens (—) or em-dashes in the message text.
- NEVER start with "I'm Basman and I'm very interested in..."
- NEVER use words like "thriving", "leveraged", "I'd welcome", "I admire your"
- Start with "Hey [name]," not "Hi [name],"
- Get to the point fast: what he wants (intro, referral, quick chat, info about the role)
- If the contact works at the target company: ask about the role directly, or ask for a referral
- If the contact is a recruiter: be direct about interest
- If the contact is a random connection: ask if they know anyone at the company
- End with something actionable: "any chance you could intro me?" or "down for a quick call?"
- Sound like a real person, not a bot. Zero AI vibes.

Return a JSON array of objects: [{to: "name", text: "message"}]
Do NOT number them. Return ONLY valid JSON, no markdown.`,
            `Role I'm after: "${job.title}" at ${job.company}

Contacts to message:
${contactsForMessages.map((c) => `- ${c.full_name} (${c.title || "no title"} at ${c.company || "unknown"}) — ${c.relevance}`).join("\n")}`
          );

          // Parse the messages — handle both JSON and numbered format
          let messages: any[] = [];
          try {
            // Try JSON parse first
            const cleaned = msgText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            messages = JSON.parse(cleaned);
          } catch {
            // Fallback: parse numbered format
            const msgLines = msgText.split(/\d+[.\)]\s+/).filter(Boolean);
            messages = contactsForMessages.map((c, i) => ({
              to: c.full_name,
              text: msgLines[i]?.trim() || `Hey ${c.full_name}, saw ${job.company} is hiring for ${job.title}. Know anything about the role?`,
            }));
          }

          result.messages_json = messages;
        } catch (e) {
          console.error("Message generation error:", e);
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      results.push(result);
    }

    // 9. Insert all results
    if (results.length) {
      await supabase.from("agent_results").insert(results);
    }

    // 10. Complete the run
    await supabase
      .from("agent_runs")
      .update({ status: "completed", completed_at: new Date().toISOString(), job_count: results.length })
      .eq("id", runId);

    // ── 11. Send summary email ──
    const emailSent = await sendSummaryEmail("basmanab88@gmail.com", results, runId);
    console.log("Email sent:", emailSent);

    return ok({ runId, jobCount: results.length, emailSent });
  } catch (err: unknown) {
    console.error(err);
    return ok({ error: err instanceof Error ? err.message : String(err) });
  }
});
