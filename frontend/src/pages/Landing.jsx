import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// ── Animated counter ───────────────────────────────────────────────────────
function Counter({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = Math.ceil(to / 60);
        const t = setInterval(() => {
          start = Math.min(start + step, to);
          setVal(start);
          if (start >= to) clearInterval(t);
        }, 20);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "RM0",
    period: "/ selamanya",
    badge: "Percuma",
    badgeColor: "#22c55e",
    description: "Sempurna untuk mencuba dan perniagaan kecil",
    active: true,
    features: [
      "1 nombor WhatsApp",
      "AI menjawab automatik 24/7",
      "Pangkalan pengetahuan asas",
      "QR bayaran automatik",
      "50 mesej / bulan",
      "5 log mesej terkini",
      "Sokongan komuniti",
    ],
    missing: ["Analitik lanjutan", "Multi-bahasa AI", "Sokongan prioriti"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "RM19.90",
    period: "/ bulan",
    badge: "Popular",
    badgeColor: "#f59e0b",
    description: "Untuk perniagaan yang berkembang",
    active: false,
    features: [
      "3 nombor WhatsApp",
      "500 mesej / bulan",
      "50 log mesej terkini",
      "Semua dalam Basic",
      "Analitik & laporan",
      "Multi-bahasa AI",
      "Sokongan email prioriti",
    ],
    missing: ["Dedicated account manager"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "RM59.90",
    period: "/ bulan",
    badge: "Terbaik",
    badgeColor: "#8b5cf6",
    description: "Penyelesaian lengkap untuk korporat",
    active: false,
    features: [
      "5 nombor WhatsApp",
      "1,000 mesej / bulan",
      "100 log mesej terkini",
      "Semua dalam Starter",
      "Custom AI persona",
      "Integrasi CRM",
      "Dedicated account manager",
    ],
    missing: [],
  },
];

const FEATURES = [
  {
    icon: "🤖",
    title: "AI yang Benar-Benar Faham",
    desc: "Dikuasakan oleh Claude AI — model bahasa yang memahami konteks, nuansa dan soalan kompleks dalam Bahasa Malaysia.",
  },
  {
    icon: "📚",
    title: "Ajar Bot dengan Info Anda",
    desc: "Upload katalog produk, FAQ, harga dan polisi anda. Bot akan menjawab tepat berdasarkan maklumat perniagaan anda.",
  },
  {
    icon: "💳",
    title: "QR Bayaran Automatik",
    desc: "Bot hantar QR DuitNow/TNG secara automatik bila pelanggan tanya tentang bayaran. Tiada lagi copy-paste manual.",
  },
  {
    icon: "⚡",
    title: "Jawab dalam Saat",
    desc: "Pelanggan dapat respons segera pada bila-bila masa — tengah malam, hujung minggu, atau cuti umum.",
  },
  {
    icon: "📊",
    title: "Dashboard Lengkap",
    desc: "Pantau semua perbualan, urus tetapan bot dan lihat analitik — dari satu dashboard yang mudah.",
  },
  {
    icon: "🔒",
    title: "Selamat & Boleh Dipercayai",
    desc: "Data anda tersimpan dengan selamat. Session diasingkan untuk setiap pengguna. Uptime tinggi dengan auto-reconnect.",
  },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',system-ui,sans-serif", background:"#fafaf9", color:"#1c1917", overflowX:"hidden" }}>

      {/* ══ NAV ══ */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background: scrolled ? "rgba(250,250,249,.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,.06)" : "none",
        transition:"all .3s ease",
        padding:"0 24px",
      }}>
        <div style={{ maxWidth:1100, margin:"0 auto", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#22c55e,#16a34a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 4px 12px rgba(34,197,94,.3)" }}>💬</div>
            <span style={{ fontWeight:800, fontSize:18, letterSpacing:"-.02em" }}>JomReply<span style={{ color:"#22c55e" }}>.ai</span></span>
          </div>

          {/* Desktop nav */}
          <div style={{ display:"flex", alignItems:"center", gap:32, fontSize:14, fontWeight:500 }} className="nav-desktop">
            <a href="#features" style={{ color:"#57534e", textDecoration:"none" }}>Ciri-ciri</a>
            <a href="#pricing" style={{ color:"#57534e", textDecoration:"none" }}>Harga</a>
            <a href="#how" style={{ color:"#57534e", textDecoration:"none" }}>Cara Kerja</a>
          </div>

          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <Link to="/login" style={{ padding:"8px 16px", borderRadius:8, fontSize:14, fontWeight:500, color:"#1c1917", textDecoration:"none", background:"transparent", border:"1px solid #d6d3d1" }}>
              Log Masuk
            </Link>
            <Link to="/register" style={{ padding:"9px 18px", borderRadius:8, fontSize:14, fontWeight:600, color:"#fff", textDecoration:"none", background:"linear-gradient(135deg,#22c55e,#16a34a)", boxShadow:"0 2px 8px rgba(34,197,94,.3)" }}>
              Mula Percuma
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"120px 24px 80px", position:"relative", overflow:"hidden" }}>
        {/* Background decoration */}
        <div style={{ position:"absolute", top:-200, right:-200, width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(34,197,94,.12) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-100, left:-100, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,.08) 0%,transparent 70%)", pointerEvents:"none" }} />

        <div style={{ maxWidth:780, textAlign:"center", position:"relative" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", borderRadius:99, padding:"6px 14px", fontSize:13, fontWeight:600, color:"#16a34a", marginBottom:28 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block", animation:"ping2 1.5s ease infinite" }} />
            Bot WhatsApp AI Pertama dalam Bahasa Malaysia
          </div>

          <h1 style={{ fontSize:"clamp(36px,6vw,68px)", fontWeight:900, lineHeight:1.05, letterSpacing:"-.03em", marginBottom:24 }}>
            Bot WhatsApp yang<br />
            <span style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Faham Perniagaan</span><br />
            Anda
          </h1>

          <p style={{ fontSize:"clamp(16px,2.5vw,20px)", color:"#78716c", lineHeight:1.65, marginBottom:40, maxWidth:580, margin:"0 auto 40px" }}>
            Ajar bot dengan info perniagaan anda. Ia akan menjawab pelanggan secara automatik — 24/7, dalam Bahasa Malaysia, tepat berdasarkan katalog dan FAQ anda.
          </p>

          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:56 }}>
            <Link to="/register" style={{ padding:"14px 32px", borderRadius:12, fontSize:16, fontWeight:700, color:"#fff", textDecoration:"none", background:"linear-gradient(135deg,#22c55e,#16a34a)", boxShadow:"0 4px 20px rgba(34,197,94,.4)", letterSpacing:"-.01em" }}>
              Mula Sekarang — Percuma →
            </Link>
            <a href="#how" style={{ padding:"14px 28px", borderRadius:12, fontSize:16, fontWeight:600, color:"#1c1917", textDecoration:"none", background:"#fff", border:"1px solid #e7e5e4", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
              Tengok Cara Kerja
            </a>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:40, justifyContent:"center", flexWrap:"wrap" }}>
            {[["<2 min","Setup masa"], ["24/7","Jawab automatik"], ["0","Kod diperlukan"]].map(([v,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:28, fontWeight:900, letterSpacing:"-.02em", color:"#1c1917" }}>{v}</div>
                <div style={{ fontSize:13, color:"#a8a29e", marginTop:3, fontWeight:500 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div style={{ marginTop:72, maxWidth:640, width:"100%", position:"relative" }}>
          <div style={{ background:"#fff", borderRadius:20, border:"1px solid #e7e5e4", boxShadow:"0 24px 64px rgba(0,0,0,.1)", overflow:"hidden" }}>
            {/* Chat header */}
            <div style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🤖</div>
              <div>
                <div style={{ fontWeight:700, color:"#fff", fontSize:14 }}>Bot Kedai Anda</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.75)" }}>● Online sekarang</div>
              </div>
            </div>
            {/* Chat bubbles */}
            <div style={{ padding:"20px 20px", background:"#f5f5f0", display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { from:"customer", text:"Assalamualaikum, berapa harga produk A?" },
                { from:"bot", text:"Waalaikumsalam! 😊 Produk A berharga RM89 (200ml). Kami ada 3 varian:\n• Produk A Original — RM89\n• Produk A Plus — RM109\n• Produk A Pro — RM139\n\nStok masih ada! Nak order sekarang?" },
                { from:"customer", text:"Nak order Produk A Original. Macam mana nak bayar?" },
                { from:"bot", text:"Boleh bayar melalui QR di bawah 👇\nSelepas bayar, hantar screenshot resit ye!" },
              ].map((m,i) => (
                <div key={i} style={{ display:"flex", justifyContent:m.from==="bot"?"flex-start":"flex-end" }}>
                  <div style={{ maxWidth:"78%", background:m.from==="bot"?"#fff":"#dcf8c6", borderRadius:m.from==="bot"?"4px 16px 16px 16px":"16px 4px 16px 16px", padding:"10px 14px", fontSize:13.5, lineHeight:1.55, boxShadow:"0 1px 3px rgba(0,0,0,.06)", whiteSpace:"pre-line" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {/* QR placeholder */}
              <div style={{ display:"flex", justifyContent:"flex-start" }}>
                <div style={{ background:"#fff", borderRadius:"4px 16px 16px 16px", padding:"12px 16px", boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
                  <div style={{ width:100, height:100, background:"#f0f0f0", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>📱</div>
                  <div style={{ fontSize:12, color:"#78716c", marginTop:6, textAlign:"center" }}>QR DuitNow</div>
                </div>
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div style={{ position:"absolute", top:-16, right:-16, background:"#fff", borderRadius:12, padding:"10px 16px", boxShadow:"0 8px 24px rgba(0,0,0,.12)", border:"1px solid #e7e5e4", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>⚡</span> Jawab dalam &lt;3 saat
          </div>
        </div>
      </section>

      {/* ══ STATS BAR ══ */}
      <section style={{ background:"#1c1917", padding:"40px 24px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:32, textAlign:"center" }}>
          {[["10,000+","Mesej dijawab"],["99.9%","Uptime"],["<3s","Masa respons"],["100%","Halal & selamat"]].map(([v,l])=>(
            <div key={l}>
              <div style={{ fontSize:36, fontWeight:900, color:"#22c55e", letterSpacing:"-.02em" }}>{v}</div>
              <div style={{ fontSize:13, color:"#a8a29e", marginTop:4, fontWeight:500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" style={{ padding:"100px 24px", background:"#fafaf9" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#22c55e", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Mudah & Pantas</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:900, letterSpacing:"-.02em", marginBottom:16 }}>Sedia dalam 3 Langkah</h2>
            <p style={{ fontSize:17, color:"#78716c", maxWidth:480, margin:"0 auto" }}>Tiada pengetahuan teknikal diperlukan. Setup dalam masa kurang dari 2 minit.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:24 }}>
            {[
              { n:"01", icon:"📝", title:"Daftar & Log Masuk", desc:"Buat akaun percuma dalam 30 saat. Tiada kad kredit diperlukan." },
              { n:"02", icon:"📚", title:"Ajar Bot Anda", desc:"Taip atau upload maklumat produk, harga dan FAQ perniagaan anda." },
              { n:"03", icon:"📱", title:"Scan & Aktif!", desc:"Scan QR kod dengan WhatsApp anda. Bot terus aktif dan menjawab pelanggan." },
            ].map((s,i)=>(
              <div key={i} style={{ background:"#fff", borderRadius:16, padding:"28px 24px", border:"1px solid #e7e5e4", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:16, right:20, fontSize:52, fontWeight:900, color:"#f5f5f4", lineHeight:1 }}>{s.n}</div>
                <div style={{ fontSize:36, marginBottom:16 }}>{s.icon}</div>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:14, color:"#78716c", lineHeight:1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" style={{ padding:"100px 24px", background:"#fff" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#22c55e", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Ciri-ciri</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:900, letterSpacing:"-.02em", marginBottom:16 }}>Semua yang Anda Perlukan</h2>
            <p style={{ fontSize:17, color:"#78716c", maxWidth:480, margin:"0 auto" }}>Bot WhatsApp yang benar-benar faham perniagaan anda dan berinteraksi macam manusia.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:20 }}>
            {FEATURES.map((f,i)=>(
              <div key={i} style={{ padding:"24px", borderRadius:14, border:"1px solid #e7e5e4", transition:"all .2s ease" }}
                onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.08)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
                <div style={{ fontSize:32, marginBottom:14 }}>{f.icon}</div>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>{f.title}</div>
                <div style={{ fontSize:14, color:"#78716c", lineHeight:1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" style={{ padding:"100px 24px", background:"#fafaf9" }}>
        <div style={{ maxWidth:1020, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#22c55e", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Harga Berpatutan</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:900, letterSpacing:"-.02em", marginBottom:16 }}>Pilih Plan Anda</h2>
            <p style={{ fontSize:17, color:"#78716c", maxWidth:480, margin:"0 auto" }}>Mulakan percuma. Naik taraf bila perniagaan anda berkembang.</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:20 }}>
            {PLANS.map((plan,i)=>(
              <div key={plan.id} style={{
                background: i===1 ? "#1c1917" : "#fff",
                borderRadius:20, padding:"32px 28px",
                border: i===1 ? "none" : "1px solid #e7e5e4",
                boxShadow: i===1 ? "0 24px 48px rgba(0,0,0,.18)" : "0 2px 8px rgba(0,0,0,.04)",
                position:"relative",
                opacity: plan.active ? 1 : 0.6,
                transform: i===1 ? "scale(1.02)" : "scale(1)",
              }}>
                {/* Badge */}
                <div style={{ position:"absolute", top:20, right:20, background:plan.badgeColor, color:"#fff", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>
                  {plan.badge}
                </div>

                {!plan.active && (
                  <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, borderRadius:20, background:"rgba(250,250,249,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10, backdropFilter:"blur(2px)" }}>
                    <div style={{ background:"#1c1917", color:"#fff", fontSize:13, fontWeight:700, padding:"10px 20px", borderRadius:10, textAlign:"center" }}>
                      🔒 Akan Datang<br/><span style={{ fontSize:11, fontWeight:400, color:"#a8a29e" }}>Integrasi pembayaran dalam proses</span>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:600, color: i===1 ? "#a8a29e" : "#78716c" }}>{plan.name}</span>
                </div>
                <div style={{ marginBottom:6 }}>
                  <span style={{ fontSize:40, fontWeight:900, letterSpacing:"-.03em", color: i===1 ? "#fff" : "#1c1917" }}>{plan.price}</span>
                  <span style={{ fontSize:14, color: i===1 ? "#a8a29e" : "#78716c", marginLeft:4 }}>{plan.period}</span>
                </div>
                <p style={{ fontSize:13.5, color: i===1 ? "#a8a29e" : "#78716c", marginBottom:24, lineHeight:1.5 }}>{plan.description}</p>

                <div style={{ height:1, background: i===1 ? "rgba(255,255,255,.1)" : "#f5f5f4", marginBottom:20 }} />

                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28 }}>
                  {plan.features.map(f=>(
                    <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:13.5 }}>
                      <span style={{ color:"#22c55e", flexShrink:0, marginTop:1 }}>✓</span>
                      <span style={{ color: i===1 ? "#d6d3d1" : "#44403c" }}>{f}</span>
                    </div>
                  ))}
                  {plan.missing.map(f=>(
                    <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:13.5, opacity:.4 }}>
                      <span style={{ flexShrink:0, marginTop:1 }}>✕</span>
                      <span style={{ color: i===1 ? "#d6d3d1" : "#44403c" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {plan.active ? (
                  <Link to="/register" style={{
                    display:"block", textAlign:"center", padding:"13px",
                    borderRadius:10, fontSize:15, fontWeight:700, textDecoration:"none",
                    background: i===1 ? "#22c55e" : "#1c1917",
                    color:"#fff",
                    boxShadow: i===1 ? "0 4px 16px rgba(34,197,94,.4)" : "none",
                  }}>
                    Mula Percuma →
                  </Link>
                ) : (
                  <button disabled style={{ display:"block", width:"100%", padding:"13px", borderRadius:10, fontSize:15, fontWeight:700, background:"#e7e5e4", color:"#a8a29e", border:"none", cursor:"not-allowed" }}>
                    Akan Datang
                  </button>
                )}
              </div>
            ))}
          </div>

          <p style={{ textAlign:"center", marginTop:32, fontSize:13.5, color:"#a8a29e" }}>
            ✅ Plan Basic percuma selamanya · Tiada kad kredit diperlukan · Cancel bila-bila masa
          </p>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding:"100px 24px", background:"#1c1917", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(34,197,94,.15) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", maxWidth:600, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(30px,5vw,52px)", fontWeight:900, color:"#fff", letterSpacing:"-.03em", lineHeight:1.1, marginBottom:20 }}>
            Mula Balas Pelanggan<br /><span style={{ color:"#22c55e" }}>Secara Automatik</span>
          </h2>
          <p style={{ fontSize:17, color:"#a8a29e", marginBottom:40, lineHeight:1.6 }}>
            Sertai perniagaan yang dah guna JomReply untuk jimat masa dan tingkatkan kepuasan pelanggan.
          </p>
          <Link to="/register" style={{ display:"inline-block", padding:"16px 40px", borderRadius:14, fontSize:17, fontWeight:700, color:"#fff", textDecoration:"none", background:"linear-gradient(135deg,#22c55e,#16a34a)", boxShadow:"0 6px 24px rgba(34,197,94,.4)", letterSpacing:"-.01em" }}>
            Daftar Percuma Sekarang →
          </Link>
          <div style={{ marginTop:20, fontSize:13, color:"#57534e" }}>Tiada risiko · Percuma selamanya untuk plan Basic</div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:"#0f0f0e", padding:"40px 24px", textAlign:"center" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#22c55e,#16a34a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>💬</div>
          <span style={{ fontWeight:800, fontSize:16, color:"#fff" }}>JomReply<span style={{ color:"#22c55e" }}>.ai</span></span>
        </div>
        <p style={{ fontSize:13, color:"#57534e", marginBottom:16 }}>Bot WhatsApp AI untuk perniagaan Malaysia</p>
        <div style={{ display:"flex", gap:24, justifyContent:"center", fontSize:13, color:"#57534e" }}>
          <Link to="/login" style={{ color:"#57534e", textDecoration:"none" }}>Log Masuk</Link>
          <Link to="/register" style={{ color:"#57534e", textDecoration:"none" }}>Daftar</Link>
        </div>
        <div style={{ marginTop:24, fontSize:12, color:"#292524" }}>© 2026 JomReply.ai — Hak Cipta Terpelihara</div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes ping2 { 0%,100%{opacity:1} 50%{opacity:.3} }
        html { scroll-behavior: smooth; }
        @media(max-width:768px) {
          .nav-desktop { display: none !important; }
        }
      `}</style>
    </div>
  );
}
