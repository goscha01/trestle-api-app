const { useState, useEffect, useMemo, useRef } = React;

/* =======================================================
   PALETTE THEMES (for Tweaks)
   ======================================================= */
const THEMES = {
  navy: {
    name: "Navy & Brass",
    bg: "#F5F1E8",
    bg2: "#EDE7D6",
    paper: "#FAF7EF",
    ink: "#0A0A0A",
    primary: "#0B1F3A",
    primary2: "#13294B",
    primary3: "#1C3458",
    accent: "#C9A74B",
    accent2: "#A8872F",
    muted: "#5A6476",
    line: "rgba(11,31,58,0.12)",
    line2: "rgba(11,31,58,0.22)",
    risk: "#9B2B2B",
    good: "#4B6A5A",
    onDark: "rgba(245,241,232,0.72)"
  },
  forest: {
    name: "Forest & Bone",
    bg: "#F2EEE3",
    bg2: "#E7E2D1",
    paper: "#FAF7EF",
    ink: "#0F0F0F",
    primary: "#1B2E24",
    primary2: "#243A2D",
    primary3: "#2F4A3A",
    accent: "#B58B3A",
    accent2: "#8E6C2A",
    muted: "#5E6558",
    line: "rgba(27,46,36,0.12)",
    line2: "rgba(27,46,36,0.22)",
    risk: "#8C2A1E",
    good: "#4E6A4F",
    onDark: "rgba(242,238,227,0.72)"
  },
  slate: {
    name: "Slate & Ink",
    bg: "#EFEFEA",
    bg2: "#E3E3DD",
    paper: "#F7F6F1",
    ink: "#0A0A0A",
    primary: "#1A1A1F",
    primary2: "#26262E",
    primary3: "#33333D",
    accent: "#B8935A",
    accent2: "#8E6C3C",
    muted: "#56575C",
    line: "rgba(26,26,31,0.12)",
    line2: "rgba(26,26,31,0.22)",
    risk: "#8E2B2B",
    good: "#4E6A5A",
    onDark: "rgba(239,239,234,0.72)"
  },
  oxblood: {
    name: "Oxblood & Cream",
    bg: "#F3EDDE",
    bg2: "#E7DEC8",
    paper: "#FAF6EC",
    ink: "#0A0A0A",
    primary: "#3A0F1A",
    primary2: "#4E1624",
    primary3: "#5F1E2E",
    accent: "#C89A4B",
    accent2: "#9A7530",
    muted: "#5A4F50",
    line: "rgba(58,15,26,0.14)",
    line2: "rgba(58,15,26,0.24)",
    risk: "#8A1B1B",
    good: "#4E6A55",
    onDark: "rgba(243,237,222,0.72)"
  }
};

function applyTheme(key){
  const t = THEMES[key] || THEMES.navy;
  const r = document.documentElement.style;
  r.setProperty('--bg', t.bg);
  r.setProperty('--bg2', t.bg2);
  r.setProperty('--paper', t.paper);
  r.setProperty('--ink', t.ink);
  r.setProperty('--primary', t.primary);
  r.setProperty('--primary2', t.primary2);
  r.setProperty('--primary3', t.primary3);
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent2', t.accent2);
  r.setProperty('--muted', t.muted);
  r.setProperty('--line', t.line);
  r.setProperty('--line2', t.line2);
  r.setProperty('--risk', t.risk);
  r.setProperty('--good', t.good);
  r.setProperty('--onDark', t.onDark);
  document.body.style.background = t.bg;
  return t;
}

/* =======================================================
   FAKE DEMO DATA (triggered by exact matches only)
   ======================================================= */
const DEMO_QUERIES = {
  "8139212100": {
    inputType: "phone",
    subject: {
      name: "Maren E. Ashby",
      age: 41,
      gender: "Female",
      confidence: 0.94,
      phone: "+1 (813) 921-2100",
      phoneFormatted: "(813) 921-2100",
      phoneType: "Mobile",
      carrier: "Verizon Wireless",
      lineActive: true,
      lineTenureMonths: 84,
      emails: [
        { value: "maren.ashby@gmail.com", confidence: 0.91, sources: ["PDL","Enformion"] },
        { value: "m.ashby@northwind.co", confidence: 0.72, sources: ["PDL"] }
      ],
      addresses: [
        { line1: "4120 Bayshore Blvd, Apt 7B", city: "Tampa", state: "FL", zip: "33611", recency: "Current", years: 6, confidence: 0.93 },
        { line1: "812 Magnolia Ave", city: "St. Petersburg", state: "FL", zip: "33701", recency: "Prior", years: 3, confidence: 0.78 }
      ],
      employment: { title: "Director, Revenue Operations", company: "Northwind Logistics", tenure: "3y 2mo", confidence: 0.88 },
      socials: [
        { kind: "linkedin", handle: "in/maren-ashby", confidence: 0.95 },
        { kind: "twitter", handle: "@marenashby", confidence: 0.61 }
      ],
      risk: { score: 12, label: "Low", signals: [
        { k: "SIM swap (90d)", v: "None detected", ok: true },
        { k: "SMS pumping", v: "Not suspicious", ok: true },
        { k: "Line age", v: "7y active", ok: true },
        { k: "Disposable / VoIP", v: "No", ok: true }
      ]}
    },
    sources: [
      { id:"trestle", name:"Trestle IQ", fields:["name","phone","address","line"], match:0.94, latency: 412 },
      { id:"twilio", name:"Twilio Lookup", fields:["phone","carrier","risk","line"], match:0.98, latency: 188 },
      { id:"pdl", name:"PeopleDataLabs", fields:["name","email","employment","social"], match:0.89, latency: 604 },
      { id:"enformion", name:"Enformion", fields:["name","address","email","phone"], match:0.86, latency: 921 }
    ]
  },
  "maren.ashby@gmail.com": "alias:8139212100",
  "maren ashby": "alias:8139212100"
};

function resolveDemo(q){
  const key = q.toLowerCase().trim();
  let r = DEMO_QUERIES[key];
  if(typeof r === "string" && r.startsWith("alias:")) r = DEMO_QUERIES[r.slice(6)];
  return r;
}

function detectInput(raw){
  const s = (raw||"").trim();
  if(!s) return { kind:null, label:"" };
  if(/^https?:\/\//i.test(s) || /linkedin\.com|twitter\.com|x\.com/i.test(s)) return { kind:"url", label:"URL" };
  if(/@/.test(s) && /\./.test(s)) return { kind:"email", label:"Email" };
  const digits = s.replace(/\D/g,"");
  if(digits.length >= 7 && digits.length <= 15 && /^[\d\s().+\-]+$/.test(s)) return { kind:"phone", label:"Phone" };
  if(/^[a-z .'-]+$/i.test(s) && s.includes(" ")) return { kind:"name", label:"Name" };
  return { kind:"unknown", label:"Query" };
}

/* =======================================================
   REAL API MERGER — maps Trestle / Twilio / PDL / Enformion
   responses into the unified subject shape used by the UI
   ======================================================= */
function formatPhone(ph){
  const d = (ph||"").replace(/\D/g,"");
  if(d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if(d.length === 11) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return ph;
}

function cap(s){ return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s; }

async function fetchJson(url, opts){
  try {
    const t0 = performance.now();
    const r = await fetch(url, opts);
    const j = await r.json().catch(()=> ({}));
    return { ok: r.ok, status: r.status, data: j, latency: Math.round(performance.now() - t0) };
  } catch(e){
    return { ok: false, status: 0, data: { error: e.message }, latency: 0 };
  }
}

function mergeApiResults(results, phoneRaw){
  const t = results.trestle && results.trestle.data || {};
  const tw = results.twilio && results.twilio.data || {};
  const pd = results.pdl && results.pdl.data || {};
  const en = results.enformion && results.enformion.data || {};

  const tOwner = (t.owners && t.owners[0]) || null;
  const pdData = pd.data || null;
  const enPerson = (en.data && en.data.Persons && en.data.Persons[0]) || null;

  // Name
  const trestleName = tOwner ? [tOwner.firstname, tOwner.middlename, tOwner.lastname].filter(Boolean).join(" ") : "";
  const enName = enPerson && enPerson.name ? [enPerson.name.firstName, enPerson.name.middleName, enPerson.name.lastName].filter(Boolean).join(" ") : "";
  const name = (pdData && pdData.full_name && pdData.full_name.split(" ").map(cap).join(" "))
           || trestleName
           || enName
           || "No Record Found";

  // Age / Gender
  let age = null;
  if(tOwner && tOwner.age_range){
    const m = String(tOwner.age_range).match(/\d+/);
    if(m) age = parseInt(m[0]);
  }
  if(!age && enPerson && enPerson.age) age = parseInt(enPerson.age);
  if(!age && pdData && pdData.inferred_years_experience) age = 22 + pdData.inferred_years_experience;

  const gender = (pdData && cap(pdData.sex))
             || (tOwner && cap(tOwner.gender))
             || (enPerson && cap(enPerson.gender))
             || "—";

  // Phone / carrier
  const carrier = (tw.carrier && tw.carrier.name) || (t.carrier && t.carrier.name) || null;
  let phoneType = (tw.carrier && tw.carrier.type) || (t.line_type) || null;
  if(phoneType) phoneType = cap(phoneType);

  // Emails — dedupe
  const emailMap = new Map();
  if(pdData && Array.isArray(pdData.emails)){
    pdData.emails.forEach(e => {
      const v = (e && e.address) || (typeof e === "string" ? e : null);
      if(!v) return;
      const lk = v.toLowerCase();
      const prev = emailMap.get(lk) || { value: v, confidence: 0.7, sources: [] };
      if(!prev.sources.includes("PDL")) prev.sources.push("PDL");
      prev.confidence = Math.max(prev.confidence, Math.min(0.95, (pd.likelihood ? pd.likelihood/10 : 0.8)));
      emailMap.set(lk, prev);
    });
  }
  if(enPerson && Array.isArray(enPerson.emailAddresses)){
    enPerson.emailAddresses.forEach(e => {
      const v = (e && e.emailAddress) || (typeof e === "string" ? e : null);
      if(!v) return;
      const lk = v.toLowerCase();
      const prev = emailMap.get(lk) || { value: v, confidence: 0.7, sources: [] };
      if(!prev.sources.includes("Enformion")) prev.sources.push("Enformion");
      if(prev.sources.length >= 2) prev.confidence = Math.max(prev.confidence, 0.9);
      emailMap.set(lk, prev);
    });
  }
  const emails = Array.from(emailMap.values()).sort((a,b)=> b.confidence - a.confidence).slice(0,4);

  // Addresses — dedupe
  const addrMap = new Map();
  const pushAddr = (src, raw, idx)=>{
    const line1 = raw.line1 || raw.street ||
      [raw.houseNumber, raw.streetName, raw.streetType, raw.unit].filter(Boolean).join(" ") ||
      raw.fullAddress ||
      raw.AddressLine1 ||
      null;
    const city = raw.city || raw.City || "";
    const state = raw.state || raw.stateCode || raw.State || "";
    const zip = raw.zip || raw.postalCode || raw.Zip || "";
    if(!line1 && !city) return;
    const key = `${line1}|${city}|${state}|${zip}`.toLowerCase();
    const prev = addrMap.get(key) || { line1: line1 || "—", city, state, zip, recency: idx===0 ? "Current" : "Prior", years: raw.years || (idx===0 ? 4 : 2), confidence: 0.7, sources: [] };
    if(!prev.sources.includes(src)) prev.sources.push(src);
    if(prev.sources.length >= 2) prev.confidence = Math.min(0.95, prev.confidence + 0.15);
    addrMap.set(key, prev);
  };
  if(tOwner && Array.isArray(tOwner.current_addresses)){
    tOwner.current_addresses.forEach((a,i)=> pushAddr("Trestle", a, i));
  }
  if(enPerson && Array.isArray(enPerson.addresses)){
    enPerson.addresses.slice(0,4).forEach((a,i)=> pushAddr("Enformion", a, addrMap.size));
  }
  if(pdData && Array.isArray(pdData.street_addresses)){
    pdData.street_addresses.slice(0,2).forEach((a,i)=> pushAddr("PDL", a, addrMap.size));
  }
  const addresses = Array.from(addrMap.values()).slice(0, 4);
  if(addresses.length === 0){
    addresses.push({ line1:"Not available", city:"", state:"", zip:"", recency:"—", years:0, confidence: 0.1, sources: [] });
  }

  // Employment
  const employment = {
    title: (pdData && pdData.job_title) || "—",
    company: (pdData && pdData.job_company_name) || (pdData && pdData.job_company_website) || "—",
    tenure: (pdData && pdData.job_start_date) ? pdData.job_start_date : "—",
    confidence: pdData && pdData.job_title ? Math.min(0.95, (pd.likelihood||7)/10) : 0.2
  };

  // Socials
  const socials = [];
  if(pdData){
    if(pdData.linkedin_url){
      const handle = pdData.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\//,"").replace(/\/$/,"");
      socials.push({ kind:"linkedin", handle, confidence: 0.9 });
    }
    if(pdData.twitter_username){
      socials.push({ kind:"twitter", handle: "@"+pdData.twitter_username, confidence: 0.75 });
    }
  }

  // Risk signals
  const carrierType = (phoneType || "").toLowerCase();
  const isVoip = /voip/.test(carrierType);
  const matchCount = [tOwner, pdData, enPerson].filter(Boolean).length;
  const riskScore = isVoip ? 62 : (matchCount === 0 ? 55 : matchCount === 1 ? 28 : 14);
  const riskLabel = riskScore >= 60 ? "High" : riskScore >= 30 ? "Medium" : "Low";
  const risk = {
    score: riskScore,
    label: riskLabel,
    signals: [
      { k: "Disposable / VoIP", v: isVoip ? "Flagged" : "No", ok: !isVoip },
      { k: "Carrier verified", v: carrier ? "Yes" : "Unknown", ok: !!carrier },
      { k: "Cross-source identity", v: `${matchCount} of 3 sources matched`, ok: matchCount >= 2 },
      { k: "Line type", v: phoneType || "Unknown", ok: !!phoneType }
    ]
  };

  // Per-source match score / latency
  const sources = [
    { id:"trestle", name:"Trestle IQ",     fields:["name","phone","address","line"], match: tOwner ? 0.9 : (t && t.is_valid ? 0.55 : 0.2), latency: (results.trestle && results.trestle.latency) || 0 },
    { id:"twilio",  name:"Twilio Lookup",  fields:["phone","carrier","line"],         match: (tw.carrier ? 0.96 : (tw.phone_number ? 0.6 : 0.2)), latency: (results.twilio && results.twilio.latency) || 0 },
    { id:"pdl",     name:"PeopleDataLabs", fields:["name","email","employment","social"], match: pdData ? Math.min(0.96, (pd.likelihood||7)/10) : 0.15, latency: (results.pdl && results.pdl.latency) || 0 },
    { id:"enformion", name:"Enformion",    fields:["name","address","email","phone"], match: enPerson ? 0.85 : 0.15, latency: (results.enformion && results.enformion.latency) || 0 }
  ];

  const overallConfidence = Math.min(0.97, 0.32 + matchCount * 0.18 + (carrier ? 0.06 : 0));

  const phoneDigits = (phoneRaw||"").replace(/\D/g,"");
  return {
    inputType: "phone",
    subject: {
      name,
      age,
      gender,
      confidence: overallConfidence,
      phone: phoneDigits.length === 10 ? `+1${phoneDigits}` : `+${phoneDigits}`,
      phoneFormatted: formatPhone(phoneDigits),
      phoneType: phoneType || "Unknown",
      carrier: carrier || "Unknown",
      lineActive: true,
      lineTenureMonths: 0,
      emails,
      addresses,
      employment,
      socials,
      risk
    },
    sources
  };
}

/* =======================================================
   ICONS — minimal strokes
   ======================================================= */
const Ico = {
  search: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  phone: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>,
  mail: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></svg>,
  user: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>,
  link: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>,
  pin: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  shield: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/></svg>,
  check: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 12 4 4 10-10"/></svg>,
  x: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg>,
  dot: (p)=> <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>,
  arrow: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>,
  chev: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m9 6 6 6-6 6"/></svg>,
  copy: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>,
  history: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>,
  download: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/></svg>,
  briefcase: (p)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>,
  li: (p)=> <svg {...p} viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><path fill="#fff" d="M7 10h2v7H7zM8 7.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zM11 10h2v1c.6-.8 1.7-1.2 2.6-1.2 2 0 2.4 1.3 2.4 3V17h-2v-3.4c0-.8 0-1.8-1.1-1.8-1.1 0-1.3.9-1.3 1.7V17h-2z"/></svg>,
  tw: (p)=> <svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 3h3l-6.6 7.6L22 21h-6l-4.7-6.2L5.8 21H2.7l7-8L2 3h6.1l4.2 5.6L18.2 3z"/></svg>
};

/* =======================================================
   BRAND MARK — refreshed "triangulation" compass
   ======================================================= */
function Mark({size=36}){
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <rect x="2" y="2" width="44" height="44" rx="10" fill="var(--primary)"/>
      <g stroke="var(--accent)" strokeWidth="1.1" opacity="0.9">
        <circle cx="14" cy="30" r="10" />
        <circle cx="34" cy="30" r="10" />
        <circle cx="24" cy="14" r="10" />
      </g>
      <g fill="var(--accent)">
        <circle cx="14" cy="30" r="1.6"/>
        <circle cx="34" cy="30" r="1.6"/>
        <circle cx="24" cy="14" r="1.6"/>
      </g>
      <circle cx="24" cy="25" r="2.6" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.2"/>
    </svg>
  );
}

function Wordmark({size=20}){
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <Mark size={size*1.6}/>
      <div style={{fontFamily:"'Source Serif 4',serif",fontWeight:500,fontSize:size,letterSpacing:"-0.015em",color:"var(--primary)"}}>
        TracePoint
        <span style={{color:"var(--accent2)",fontStyle:"italic",fontWeight:400}}>.</span>
      </div>
    </div>
  );
}

/* =======================================================
   SMART INPUT — auto-detects type
   ======================================================= */
function SmartInput({value, onChange, onSearch, disabled}){
  const det = detectInput(value);
  const ref = useRef(null);
  const icon = det.kind==="phone" ? <Ico.phone width="18" height="18"/>
             : det.kind==="email" ? <Ico.mail width="18" height="18"/>
             : det.kind==="url" ? <Ico.link width="18" height="18"/>
             : det.kind==="name" ? <Ico.user width="18" height="18"/>
             : <Ico.search width="18" height="18"/>;

  return (
    <div style={{position:"relative"}}>
      <div style={{
        display:"flex",alignItems:"center",gap:14,
        background:"var(--paper)",border:"1px solid var(--line2)",
        borderRadius:14,padding:"14px 16px",
        boxShadow:"0 1px 0 rgba(255,255,255,0.6) inset, 0 18px 40px -24px rgba(11,31,58,0.25)"
      }}>
        <div style={{color:"var(--primary)",display:"flex"}}>{icon}</div>
        <input
          ref={ref}
          value={value}
          onChange={e=>onChange(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") onSearch(); }}
          placeholder="Search by phone, email, name, or social URL…"
          disabled={disabled}
          style={{
            flex:1,border:"none",outline:"none",background:"transparent",
            fontFamily:"'Source Serif 4',serif",
            fontSize:22,letterSpacing:"-0.01em",color:"var(--ink)",
            padding:"4px 0"
          }}
        />
        {det.kind && (
          <div className="mono" style={{
            fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",
            color:"var(--accent2)",background:"var(--bg2)",
            padding:"4px 8px",borderRadius:6,border:"1px solid var(--line)"
          }}>
            detected · {det.label}
          </div>
        )}
        <button
          onClick={onSearch}
          disabled={disabled || !value.trim()}
          style={{
            background:"var(--primary)",color:"var(--bg)",
            padding:"10px 18px",borderRadius:10,
            fontWeight:600,fontSize:14,
            display:"flex",alignItems:"center",gap:8,
            opacity: (disabled||!value.trim()) ? 0.45 : 1,
            transition:"transform .15s"
          }}
          onMouseDown={e=>e.currentTarget.style.transform="translateY(1px)"}
          onMouseUp={e=>e.currentTarget.style.transform="translateY(0)"}
        >
          Trace
          <Ico.arrow width="16" height="16"/>
        </button>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
        <span className="mono" style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.08em",textTransform:"uppercase"}}>Try</span>
        {["(813) 921-2100","maren.ashby@gmail.com","Maren Ashby"].map(s=>(
          <button key={s} onClick={()=>{onChange(s); setTimeout(onSearch, 50);}}
            className="mono"
            style={{
              fontSize:12,padding:"5px 10px",borderRadius:999,
              border:"1px solid var(--line2)",background:"transparent",
              color:"var(--primary)"
            }}>{s}</button>
        ))}
      </div>
    </div>
  );
}

/* =======================================================
   CONFIDENCE BAR
   ======================================================= */
function Confidence({value, size="md", label=true}){
  const pct = Math.round(value*100);
  const w = size==="sm" ? 40 : 72;
  const h = size==="sm" ? 4 : 6;
  const color = pct>=85 ? "var(--good)" : pct>=65 ? "var(--accent2)" : "var(--risk)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:w,height:h,background:"var(--bg2)",borderRadius:999,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:999}}/>
      </div>
      {label && <span className="mono" style={{fontSize:11,color:"var(--muted)"}}>{pct}</span>}
    </div>
  );
}

/* =======================================================
   TOP NAV
   ======================================================= */
function TopNav({onOpenHistory, onOpenTweaks, tweaksAvailable}){
  return (
    <div style={{
      position:"sticky",top:0,zIndex:40,
      background:"color-mix(in oklab, var(--bg) 88%, transparent)",
      backdropFilter:"blur(10px)",
      borderBottom:"1px solid var(--line)"
    }}>
      <div style={{maxWidth:1240,margin:"0 auto",padding:"14px 28px",display:"flex",alignItems:"center",gap:24}}>
        <Wordmark size={18}/>
        <div style={{flex:1,display:"flex",gap:6,marginLeft:24}}>
          {[
            {k:"search",label:"Search",active:true},
            {k:"history",label:"History"},
            {k:"watchlists",label:"Watchlists"},
            {k:"api",label:"API"},
            {k:"billing",label:"Billing"}
          ].map(t=>(
            <button key={t.k} style={{
              padding:"6px 12px",fontSize:13,
              color: t.active?"var(--primary)":"var(--muted)",
              fontWeight: t.active?600:500,
              borderRadius:8,
              background: t.active?"var(--bg2)":"transparent"
            }}>{t.label}</button>
          ))}
        </div>
        <div className="mono" style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:8}}>
          <span style={{width:6,height:6,borderRadius:999,background:"var(--good)",display:"inline-block"}}/>
          4 / 4 sources online
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onOpenHistory} title="History" style={{padding:8,color:"var(--primary)"}}><Ico.history width="18" height="18"/></button>
          <div style={{
            width:32,height:32,borderRadius:999,
            background:"var(--primary)",color:"var(--bg)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:12,fontWeight:600,fontFamily:"'Source Serif 4',serif"
          }}>LR</div>
        </div>
      </div>
    </div>
  );
}

/* =======================================================
   EMPTY STATE — replaces the hero
   ======================================================= */
function EmptyState({onPick}){
  return (
    <div style={{padding:"44px 28px 28px"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <div className="mono" style={{
          fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",
          color:"var(--accent2)",marginBottom:18
        }}>Identity intelligence, triangulated</div>
        <h1 style={{
          fontFamily:"'Source Serif 4',serif",
          fontSize:"clamp(38px, 5.4vw, 64px)",
          lineHeight:1.02,letterSpacing:"-0.022em",fontWeight:400,
          color:"var(--primary)",textWrap:"pretty",marginBottom:18
        }}>
          One identifier in.<br/>
          <em style={{fontStyle:"italic",color:"var(--accent2)"}}>Four sources,</em> one verdict out.
        </h1>
        <p style={{
          fontSize:17,color:"var(--muted)",maxWidth:620,lineHeight:1.55,marginBottom:34
        }}>
          TracePoint triangulates Trestle IQ, Twilio, PeopleDataLabs, and Enformion
          into a single ranked record — with per-field confidence and source attribution.
          Built for revenue teams who clean leads before they ever hit the pipe.
        </p>

        <div style={{
          display:"grid",gridTemplateColumns:"repeat(4, 1fr)",
          gap:14,maxWidth:820,marginTop:32
        }}>
          {[
            {k:"TI",name:"Trestle IQ",sub:"Reverse phone · line intel"},
            {k:"TW",name:"Twilio Lookup",sub:"Carrier · fraud · caller name"},
            {k:"PD",name:"PeopleDataLabs",sub:"Person enrichment · employment"},
            {k:"EN",name:"Enformion",sub:"Identity · history · addresses"}
          ].map(s=>(
            <div key={s.k} style={{
              padding:"14px 14px 16px",
              border:"1px solid var(--line)",borderRadius:12,
              background:"var(--paper)"
            }}>
              <div className="mono" style={{
                fontSize:10,letterSpacing:"0.12em",color:"var(--accent2)",
                marginBottom:10
              }}>{s.k}</div>
              <div style={{fontFamily:"'Source Serif 4',serif",fontSize:16,fontWeight:500,color:"var(--primary)"}}>{s.name}</div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =======================================================
   LOADING STATE
   ======================================================= */
function Loader({query}){
  const sources = ["Trestle IQ","Twilio Lookup","PeopleDataLabs","Enformion"];
  const [progress, setProgress] = useState([0,0,0,0]);
  useEffect(()=>{
    const targets = [0.6, 1, 0.85, 0.4];
    const int = setInterval(()=>{
      setProgress(p => p.map((x,i)=> Math.min(targets[i], x + 0.04 + Math.random()*0.06)));
    }, 80);
    return ()=>clearInterval(int);
  },[]);
  return (
    <div style={{padding:"32px 28px",maxWidth:960,margin:"0 auto"}}>
      <div className="mono" style={{
        fontSize:11,letterSpacing:"0.12em",color:"var(--muted)",
        textTransform:"uppercase",marginBottom:14
      }}>Triangulating · {query}</div>
      <div style={{display:"grid",gap:12}}>
        {sources.map((s,i)=>(
          <div key={s} style={{
            display:"grid",gridTemplateColumns:"200px 1fr 60px",
            alignItems:"center",gap:16,
            padding:"14px 16px",background:"var(--paper)",
            border:"1px solid var(--line)",borderRadius:10
          }}>
            <div style={{fontFamily:"'Source Serif 4',serif",fontSize:15,color:"var(--primary)"}}>{s}</div>
            <div style={{height:4,background:"var(--bg2)",borderRadius:999,overflow:"hidden"}}>
              <div style={{width:`${progress[i]*100}%`,height:"100%",background:"var(--primary)",transition:"width .1s"}}/>
            </div>
            <div className="mono" style={{fontSize:11,color:"var(--muted)",textAlign:"right"}}>
              {progress[i] >= 0.99 ? "200 OK" : progress[i] < 0.05 ? "queued" : "fetching"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =======================================================
   RESULTS
   ======================================================= */
function SourceChip({s}){
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      padding:"2px 6px",borderRadius:4,
      fontSize:10,fontFamily:"'JetBrains Mono',monospace",
      border:"1px solid var(--line2)",color:"var(--muted)",
      letterSpacing:"0.04em",textTransform:"uppercase"
    }}>{s}</span>
  );
}

function FieldRow({label, value, confidence, sources, children}){
  return (
    <div style={{
      display:"grid",gridTemplateColumns:"140px 1fr auto",alignItems:"center",gap:16,
      padding:"12px 0",borderBottom:"1px solid var(--line)"
    }}>
      <div className="mono" style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        {children || <span style={{fontSize:15,color:"var(--primary)"}}>{value}</span>}
        {sources && <div style={{display:"flex",gap:4}}>{sources.map(s=><SourceChip key={s} s={s}/>)}</div>}
      </div>
      {confidence != null && <Confidence value={confidence} size="sm"/>}
    </div>
  );
}

function ResultsView({data, onReset}){
  const s = data.subject;
  const overall = Math.round(s.confidence*100);
  const totalLatency = data.sources.reduce((a,x)=>a + (x.latency||0), 0);
  const okSources = data.sources.filter(x => x.match > 0.5).length;

  return (
    <div style={{padding:"28px 28px 80px",maxWidth:1180,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div className="mono" style={{fontSize:11,letterSpacing:"0.12em",color:"var(--muted)",textTransform:"uppercase"}}>
          Trace complete · {okSources} / 4 sources · {(totalLatency/1000).toFixed(2)}s
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onReset} style={{
            fontSize:13,padding:"7px 12px",borderRadius:8,
            border:"1px solid var(--line2)",color:"var(--primary)",
            display:"flex",alignItems:"center",gap:6
          }}>New trace</button>
          <button onClick={()=>{ try { navigator.clipboard.writeText(JSON.stringify(data, null, 2)); } catch(e){} }} style={{
            fontSize:13,padding:"7px 12px",borderRadius:8,
            border:"1px solid var(--line2)",color:"var(--primary)",
            display:"flex",alignItems:"center",gap:6
          }}><Ico.copy width="14" height="14"/> Copy JSON</button>
          <button onClick={()=>{
            const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `tracepoint-${Date.now()}.json`; a.click();
            setTimeout(()=>URL.revokeObjectURL(url), 1000);
          }} style={{
            fontSize:13,padding:"7px 12px",borderRadius:8,
            background:"var(--primary)",color:"var(--bg)",
            display:"flex",alignItems:"center",gap:6
          }}><Ico.download width="14" height="14"/> Export</button>
        </div>
      </div>

      <div style={{
        background:"var(--primary)",color:"var(--bg)",
        borderRadius:16,padding:"32px 36px",
        display:"grid",gridTemplateColumns:"1fr 300px",gap:40,
        marginBottom:20,
        boxShadow:"0 30px 60px -30px rgba(11,31,58,0.4)"
      }}>
        <div>
          <div className="mono" style={{fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--accent)",marginBottom:10}}>
            Subject record · triangulated
          </div>
          <h2 style={{
            fontFamily:"'Source Serif 4',serif",fontWeight:400,
            fontSize:48,lineHeight:1.02,letterSpacing:"-0.02em",
            color:"var(--bg)",marginBottom:4
          }}>{s.name}</h2>
          <div style={{color:"var(--onDark)",fontSize:15,marginBottom:22,display:"flex",gap:16,flexWrap:"wrap"}}>
            <span>{s.gender}{s.age ? ` · ${s.age}` : ""}</span>
            {s.employment && s.employment.title && s.employment.title !== "—" && <><span>·</span><span>{s.employment.title}</span></>}
            {s.addresses[0] && s.addresses[0].city && <><span>·</span><span>{s.addresses[0].city}{s.addresses[0].state?`, ${s.addresses[0].state}`:""}</span></>}
          </div>

          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {data.sources.map(src=>(
              <div key={src.id} style={{minWidth:120}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{width:6,height:6,borderRadius:999,background:"var(--accent)"}}/>
                  <span className="mono" style={{fontSize:11,color:"var(--onDark)",letterSpacing:"0.06em"}}>{src.name.toUpperCase()}</span>
                </div>
                <div style={{fontFamily:"'Source Serif 4',serif",fontSize:20,color:"var(--bg)"}}>
                  {Math.round(src.match*100)}<span style={{color:"var(--accent)",fontSize:12,marginLeft:2}}>%</span>
                </div>
                <div className="mono" style={{fontSize:10,color:"var(--onDark)",opacity:0.7}}>{src.latency}ms</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <ConfidenceDial value={overall}/>
          <div style={{marginTop:14,textAlign:"center"}}>
            <div style={{fontFamily:"'Source Serif 4',serif",fontStyle:"italic",fontSize:15,color:"var(--accent)"}}>
              {overall >= 85 ? "High confidence" : overall >= 65 ? "Medium confidence" : "Low confidence"}
            </div>
            <div className="mono" style={{fontSize:10,color:"var(--onDark)",letterSpacing:"0.12em",marginTop:4,textTransform:"uppercase"}}>Cross-source agreement</div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <Card icon={<Ico.phone width="16" height="16"/>} title="Phone intelligence">
          <FieldRow label="Number" confidence={0.98} sources={["Trestle","Twilio"]}>
            <span style={{fontFamily:"'Source Serif 4',serif",fontSize:22,color:"var(--primary)"}}>{s.phoneFormatted}</span>
          </FieldRow>
          <FieldRow label="Type" value={s.phoneType} confidence={0.97} sources={["Twilio"]}/>
          <FieldRow label="Carrier" value={s.carrier} confidence={0.97} sources={["Twilio"]}/>
          <FieldRow label="Line age" value={s.lineTenureMonths ? `${Math.round(s.lineTenureMonths/12)} years · active` : "—"} confidence={0.88} sources={["Trestle"]}/>
        </Card>

        <Card icon={<Ico.shield width="16" height="16"/>} title="Risk signals" accent>
          <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:16,paddingBottom:16,borderBottom:"1px solid var(--line)"}}>
            <div style={{fontFamily:"'Source Serif 4',serif",fontSize:56,color: s.risk.score < 30 ? "var(--good)" : s.risk.score < 60 ? "var(--accent2)" : "var(--risk)",lineHeight:1}}>{s.risk.score}</div>
            <div>
              <div style={{fontFamily:"'Source Serif 4',serif",fontSize:18,color:"var(--primary)"}}>{s.risk.label} risk</div>
              <div className="mono" style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em"}}>score · 0–100</div>
            </div>
          </div>
          {s.risk.signals.map(sig=>(
            <div key={sig.k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--line)",alignItems:"center"}}>
              <span style={{fontSize:14,color:"var(--primary)"}}>{sig.k}</span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color: sig.ok ? "var(--good)":"var(--risk)"}}>
                {sig.ok ? <Ico.check width="14" height="14"/> : <Ico.x width="14" height="14"/>}
                {sig.v}
              </span>
            </div>
          ))}
        </Card>

        <Card icon={<Ico.briefcase width="16" height="16"/>} title="Employment">
          <div style={{padding:"6px 0"}}>
            <div style={{fontFamily:"'Source Serif 4',serif",fontSize:24,color:"var(--primary)",marginBottom:2}}>
              {s.employment.title}
            </div>
            <div style={{fontSize:15,color:"var(--muted)",marginBottom:12}}>at {s.employment.company}</div>
            <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <span className="mono" style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Tenure · {s.employment.tenure}</span>
              <Confidence value={s.employment.confidence}/>
              <SourceChip s="PDL"/>
            </div>
          </div>
          <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid var(--line)"}}>
            <div className="mono" style={{fontSize:10,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Social</div>
            {s.socials.length === 0 ? (
              <div style={{fontSize:13,color:"var(--muted)"}}>No social profiles linked.</div>
            ) : (
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {s.socials.map(so=>(
                  <div key={so.kind} style={{
                    display:"flex",alignItems:"center",gap:8,
                    padding:"6px 10px",border:"1px solid var(--line2)",borderRadius:8,
                    fontSize:13,color:"var(--primary)"
                  }}>
                    {so.kind==="linkedin" ? <Ico.li width="14" height="14"/> : <Ico.tw width="14" height="14"/>}
                    <span className="mono" style={{fontSize:12}}>{so.handle}</span>
                    <Confidence value={so.confidence} size="sm" label={false}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card icon={<Ico.mail width="16" height="16"/>} title="Emails">
          {s.emails.length === 0 ? (
            <div style={{fontSize:13,color:"var(--muted)",padding:"8px 0"}}>No emails found.</div>
          ) : s.emails.map(e=>(
            <div key={e.value} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid var(--line)",gap:12,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Source Serif 4',serif",fontSize:16,color:"var(--primary)",wordBreak:"break-all"}}>{e.value}</span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{display:"flex",gap:4}}>{e.sources.map(x=><SourceChip key={x} s={x}/>)}</div>
                <Confidence value={e.confidence}/>
              </div>
            </div>
          ))}
        </Card>

        <Card icon={<Ico.pin width="16" height="16"/>} title="Addresses" span={2}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            {s.addresses.map((a,i)=>(
              <div key={i} style={{
                padding:18,border:"1px solid var(--line)",borderRadius:10,
                background: i===0 ? "var(--bg2)" : "transparent"
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span className="mono" style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--accent2)"}}>{a.recency}{a.years ? ` · ${a.years} yrs` : ""}</span>
                  <Confidence value={a.confidence} size="sm"/>
                </div>
                <div style={{fontFamily:"'Source Serif 4',serif",fontSize:18,color:"var(--primary)",lineHeight:1.3,marginBottom:4}}>
                  {a.line1}
                </div>
                <div style={{fontSize:14,color:"var(--muted)"}}>{[a.city, a.state].filter(Boolean).join(", ")} {a.zip}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({icon, title, children, span, accent}){
  return (
    <div style={{
      gridColumn: span===2 ? "1 / -1" : "auto",
      background:"var(--paper)",border:"1px solid var(--line)",borderRadius:14,
      padding:"22px 26px"
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:14,borderBottom:"1px solid var(--line)"}}>
        <span style={{color: accent?"var(--accent2)":"var(--primary)"}}>{icon}</span>
        <h3 style={{fontFamily:"'Source Serif 4',serif",fontSize:18,fontWeight:500,color:"var(--primary)",letterSpacing:"-0.01em"}}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ConfidenceDial({value}){
  const r=56, c=2*Math.PI*r;
  const pct = value/100;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(245,241,232,0.15)" strokeWidth="7"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--accent)" strokeWidth="7"
        strokeDasharray={`${c*pct} ${c}`} strokeLinecap="round"
        transform="rotate(-90 70 70)"/>
      <text x="70" y="76" textAnchor="middle" fontFamily="'Source Serif 4',serif" fontSize="36" fill="var(--bg)">{value}</text>
      <text x="70" y="94" textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize="9" fill="var(--accent)" letterSpacing="2">CONFIDENCE</text>
    </svg>
  );
}

/* =======================================================
   HISTORY PANEL
   ======================================================= */
function HistoryPanel({open, onClose, items, onPick}){
  if(!open) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(11,31,58,0.3)",zIndex:60,backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"absolute",right:0,top:0,bottom:0,width:420,
        background:"var(--bg)",borderLeft:"1px solid var(--line2)",
        padding:"28px 28px",overflow:"auto"
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <h3 style={{fontFamily:"'Source Serif 4',serif",fontSize:22,color:"var(--primary)",fontWeight:400}}>Recent traces</h3>
          <button onClick={onClose} style={{color:"var(--muted)"}}><Ico.x width="18" height="18"/></button>
        </div>
        {items.length===0 && <div style={{fontSize:14,color:"var(--muted)"}}>No traces yet. Try any of the examples.</div>}
        {items.map((h,i)=>(
          <button key={i} onClick={()=>onPick(h.q)} style={{
            display:"block",width:"100%",textAlign:"left",
            padding:"14px 0",borderBottom:"1px solid var(--line)"
          }}>
            <div style={{fontFamily:"'Source Serif 4',serif",fontSize:16,color:"var(--primary)",marginBottom:2}}>{h.subject}</div>
            <div className="mono" style={{fontSize:11,color:"var(--muted)"}}>{h.q} · {h.when}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* =======================================================
   TWEAKS PANEL
   ======================================================= */
function TweaksPanel({visible, theme, setTheme}){
  if(!visible) return null;
  return (
    <div style={{
      position:"fixed",right:22,bottom:22,width:280,zIndex:70,
      background:"var(--paper)",border:"1px solid var(--line2)",borderRadius:14,
      padding:18,
      boxShadow:"0 24px 60px -20px rgba(11,31,58,0.35)"
    }}>
      <div style={{fontFamily:"'Source Serif 4',serif",fontSize:16,color:"var(--primary)",marginBottom:4}}>Tweaks</div>
      <div className="mono" style={{fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:14}}>Palette</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {Object.entries(THEMES).map(([k,t])=>(
          <button key={k} onClick={()=>setTheme(k)} style={{
            padding:"10px 10px",border: theme===k?"2px solid var(--primary)":"1px solid var(--line2)",
            borderRadius:10,background:"transparent",textAlign:"left",
            display:"flex",alignItems:"center",gap:10
          }}>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <div style={{width:36,height:12,background:t.primary,borderRadius:2}}/>
              <div style={{width:36,height:6,background:t.accent,borderRadius:2}}/>
              <div style={{width:36,height:4,background:t.bg2,borderRadius:2,border:"1px solid var(--line)"}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--primary)"}}>{t.name}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* =======================================================
   APP
   ======================================================= */
function App(){
  const initialTheme = (window.__TWEAKS__ && window.__TWEAKS__.palette) || "navy";
  const [theme, setTheme] = useState(initialTheme);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("empty"); // empty | loading | results
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tweaksOn, setTweaksOn] = useState(false);

  useEffect(()=>{ applyTheme(theme); },[theme]);

  useEffect(()=>{
    const handler = (e)=>{
      const d = e.data || {};
      if(d.type === "__activate_edit_mode") setTweaksOn(true);
      if(d.type === "__deactivate_edit_mode") setTweaksOn(false);
    };
    window.addEventListener("message", handler);
    try { window.parent.postMessage({type:"__edit_mode_available"}, "*"); } catch(e){}
    return ()=>window.removeEventListener("message", handler);
  },[]);

  function persist(key, val){
    try { window.parent.postMessage({type:"__edit_mode_set_keys", edits:{[key]:val}}, "*"); } catch(e){}
  }

  function pushHistory(q, subject){
    setHistory(h => {
      if(h.find(x=>x.q===q)) return h;
      return [{ q, subject, when: "just now" }, ...h].slice(0,12);
    });
  }

  async function runSearch(q){
    const queryText = (q ?? "").trim();
    if(!queryText) return;
    setQuery(queryText);
    setStage("loading");

    // Demo fast-path for scripted example queries
    const demo = resolveDemo(queryText);
    if(demo){
      setTimeout(()=>{
        setData(demo);
        setStage("results");
        pushHistory(queryText, demo.subject.name);
      }, 1200);
      return;
    }

    const det = detectInput(queryText);

    // Phone: call all 4 real APIs in parallel
    if(det.kind === "phone"){
      const digits = queryText.replace(/\D/g,"");
      const phone10 = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

      const [trestle, twilio, pdl, enformion] = await Promise.all([
        fetchJson(`/api/trestle?endpoint=reverse_phone&phone=${phone10}`),
        fetchJson(`/api/twilio?phone=${phone10}`),
        fetchJson(`/api/peopledatalabs?phone=${phone10}`),
        fetchJson(`/api/enformion?endpoint=reverse-phone&phone=${phone10}`)
      ]);

      const merged = mergeApiResults({ trestle, twilio, pdl, enformion }, phone10);
      setData(merged);
      setStage("results");
      pushHistory(queryText, merged.subject.name);
      return;
    }

    // Email: PDL enrich
    if(det.kind === "email"){
      const pdl = await fetchJson(`/api/peopledatalabs?email=${encodeURIComponent(queryText)}`);
      const merged = mergeApiResults({
        trestle: { data: {}, latency: 0 },
        twilio: { data: {}, latency: 0 },
        pdl,
        enformion: { data: {}, latency: 0 }
      }, "");
      setData(merged);
      setStage("results");
      pushHistory(queryText, merged.subject.name);
      return;
    }

    // Name / URL / unknown — no reliable cross-source path; show empty record
    const empty = mergeApiResults({
      trestle: { data: {}, latency: 0 },
      twilio: { data: {}, latency: 0 },
      pdl: { data: {}, latency: 0 },
      enformion: { data: {}, latency: 0 }
    }, "");
    setData(empty);
    setStage("results");
    pushHistory(queryText, empty.subject.name);
  }

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <TopNav onOpenHistory={()=>setShowHistory(true)}/>

      <div style={{padding:"34px 28px 0"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <SmartInput value={query} onChange={setQuery} onSearch={()=>runSearch(query)} disabled={stage==="loading"}/>
        </div>
      </div>

      {stage==="empty" && <EmptyState/>}
      {stage==="loading" && <Loader query={query}/>}
      {stage==="results" && data && <ResultsView data={data} onReset={()=>{setStage("empty");setQuery("")}}/>}

      <div style={{borderTop:"1px solid var(--line)",padding:"22px 28px",marginTop:40}}>
        <div style={{maxWidth:1180,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div className="mono" style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.08em",textTransform:"uppercase"}}>
            TracePoint · v2.0 · SOC 2 Type II
          </div>
          <div className="mono" style={{fontSize:11,color:"var(--muted)"}}>
            Aggregating Trestle IQ · Twilio · PeopleDataLabs · Enformion
          </div>
        </div>
      </div>

      <HistoryPanel open={showHistory} onClose={()=>setShowHistory(false)} items={history} onPick={q=>{setShowHistory(false);runSearch(q);}}/>
      <TweaksPanel visible={tweaksOn} theme={theme} setTheme={t=>{setTheme(t); persist("palette", t);}}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
