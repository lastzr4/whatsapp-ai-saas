import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plug, Settings, BookOpen, CreditCard, ScrollText,
  Bot, LogOut, Play, RotateCw, Square, Upload, Trash2,
  RefreshCw, Smartphone, CheckCircle2, Camera, MessageSquare,
  User as UserIcon, AlertCircle, Download, ShieldCheck,
} from "lucide-react";
import { api, uploadFile } from "../lib/api.js";

const NAV = [
  { id:0, icon:Plug,        label:"Bot",       full:"Sambungan" },
  { id:1, icon:Settings,    label:"Tetapan",   full:"Tetapan Bot" },
  { id:2, icon:BookOpen,    label:"Ilmu",      full:"Pengetahuan" },
  { id:3, icon:ScrollText,  label:"Log",       full:"Log Mesej" },
];

const STATUS_LABEL = {
  connected:"Bersambung", qr_pending:"Imbas QR",
  starting:"Memulakan...", disconnected:"Belum Mula",
  stopped:"Dihentikan", auth_failed:"Auth Gagal",
};

function statusColor(s) {
  if (s==="connected") return "green";
  if (s==="qr_pending"||s==="starting") return "amber";
  if (s==="auth_failed") return "red";
  if (s==="stopped") return "gray";
  return "gray";
}

function StatusDot({ status }) {
  const c = statusColor(status);
  return (
    <span className={`status-dot ${c}`}>
      <span className="status-dot-ping" />
      <span className="status-dot-inner" />
    </span>
  );
}

function PlanBadge({ plan }) {
  const map = { basic:"badge-gray", starter:"badge-amber", pro:"badge-green" };
  const labels = { basic:"Basic", starter:"Starter", pro:"Pro" };
  return <span className={`badge ${map[plan]||"badge-gray"}`} style={{ fontSize:10.5 }}>{labels[plan]||plan}</span>;
}

// Animated QR countdown — counts 60s, resets when QR refreshes
function QrCountdown() {
  const [secs, setSecs] = useState(60);
  useEffect(() => {
    setSecs(60);
    const t = setInterval(() => setSecs(s => s <= 1 ? 60 : s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  const pct = secs / 60;
  const r = 16, circ = 2 * Math.PI * r;
  const color = secs > 20 ? "#22c55e" : secs > 10 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"var(--muted-bg)",border:"1px solid var(--border)",borderRadius:99,padding:"5px 12px 5px 8px",fontSize:12,fontWeight:600,color }}>
      <svg width={36} height={36} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={18} cy={18} r={r} fill="none" stroke="var(--border)" strokeWidth={2.5} />
        <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 1s linear, stroke .3s" }} />
        <text x={18} y={18} textAnchor="middle" dominantBaseline="middle"
          style={{ fill:color, fontSize:10, fontWeight:700, transform:"rotate(90deg)", transformOrigin:"18px 18px" }}>
          {secs}
        </text>
      </svg>
      ⏱ QR tamat dalam {secs} saat
    </div>
  );
}

function StatusBadge({ status }) {
  const c = statusColor(status);
  const cls = c==="green"?"badge-green":c==="amber"?"badge-amber":c==="red"?"badge-red":"badge-gray";
  return (
    <span className={`badge ${cls}`}>
      <StatusDot status={status} />
      {STATUS_LABEL[status]||"Terputus"}
    </span>
  );
}

function Toast({ text, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  const cls = type==="error"?"toast-error":type==="info"?"toast-info":"toast-success";
  const icon = type==="error"?"❌":type==="info"?"ℹ️":"✅";
  return (
    <div className={`toast ${cls}`}>
      <span>{icon}</span>
      <span style={{ flex:1 }}>{text}</span>
      <button onClick={onDone} style={{ background:"none",border:"none",cursor:"pointer",color:"#a1a1aa",fontSize:18,lineHeight:1 }}>✕</button>
    </div>
  );
}

function QrPaymentSection({ config, setConfig, fetchConfig, showToast, qrBlobUrl, fetchQrImage, saving, saveConfig }) {
  const handleQrUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = "";
    showToast("Memuat naik QR...","info");
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData(); fd.append("paymentQr", file);
      const res = await fetch("/api/config/upload-qr", { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchConfig(); fetchQrImage();
      showToast("✅ QR berjaya dimuat naik!");
    } catch(err) { showToast(err.message,"error"); }
  };
  return (
    <div style={{ maxWidth:520,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
      <div className="card" style={{ padding:"20px 22px" }}>
        <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>💳 QR Pembayaran</div>
        <p style={{ fontSize:13,color:"var(--muted)",marginBottom:20 }}>Bot hantar QR ini bila pelanggan tanya tentang bayaran</p>
        {config.has_payment_qr ? (
          <div style={{ textAlign:"center",marginBottom:20 }}>
            <div style={{ position:"relative",display:"inline-block" }}>
              <div style={{ borderRadius:16,border:"2px solid var(--border)",background:"#fff",padding:16,display:"inline-block",boxShadow:"0 4px 16px rgba(0,0,0,.06)" }}>
                {qrBlobUrl
                  ? <img src={qrBlobUrl} alt="QR" style={{ width:200,height:200,objectFit:"contain",display:"block",borderRadius:8 }}/>
                  : <div style={{ width:200,height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,background:"#f5f5f4",borderRadius:8 }}>
                      <Camera size={32} style={{ color:"#d4d4d8" }}/>
                      <button className="btn btn-default btn-sm" onClick={fetchQrImage}>Cuba Semula</button>
                    </div>
                }
              </div>
              <div style={{ position:"absolute",top:-8,right:-8,width:26,height:26,borderRadius:99,background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <CheckCircle2 size={14} color="#fff"/>
              </div>
            </div>
            <div style={{ fontWeight:700,fontSize:14,marginTop:14,marginBottom:4 }}>QR Aktif ✅</div>
            <div style={{ fontSize:12,color:"var(--muted)",marginBottom:16 }}>Bot hantar QR ini secara automatik</div>
            <label className="btn btn-outline" style={{ cursor:"pointer" }}>
              <RotateCw size={14}/> Ganti QR
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }} onChange={handleQrUpload}/>
            </label>
          </div>
        ) : (
          <div style={{ border:"2px dashed var(--border)",borderRadius:14,padding:36,textAlign:"center",background:"var(--muted-bg)",marginBottom:18 }}>
            <Camera size={48} style={{ margin:"0 auto 12px",color:"#d4d4d8" }}/>
            <div style={{ fontWeight:600,fontSize:14,marginBottom:6 }}>Belum ada QR</div>
            <p style={{ fontSize:13,color:"var(--muted)",marginBottom:20 }}>Upload QR DuitNow, TNG, atau eWallet</p>
            <label className="btn btn-default" style={{ cursor:"pointer" }}>
              <Upload size={15}/> Upload QR
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }} onChange={handleQrUpload}/>
            </label>
          </div>
        )}
        <div style={{ marginBottom:16 }}>
          <label className="form-label">Teks Kapsyen QR</label>
          <textarea className="input" style={{ minHeight:90,fontFamily:"inherit" }}
            value={config.payment_caption} onChange={e=>setConfig({...config,payment_caption:e.target.value})}/>
        </div>
        <button className="btn btn-default" style={{ width:"100%" }} onClick={saveConfig} disabled={saving}>
          {saving?<><span className="spinner spinner-white" style={{ width:15,height:15 }}/> Menyimpan...</>:"💾 Simpan Kapsyen"}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab]                   = useState(0);
  const [settingsTab, setSettingsTab]   = useState(0); // 0=tetapan, 1=QR
  const [status, setStatus]             = useState({ status:"disconnected", is_running:false });
  const [config, setConfig]             = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError]   = useState(null);
  const [logs, setLogs]                 = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [qrBlobUrl, setQrBlobUrl]       = useState(null);
  const [toast, setToast]               = useState(null);
  const [saving, setSaving]             = useState(false);
  const pollRef          = useRef(null);
  const startingTimerRef = useRef(null);
  const prevStatusRef    = useRef(null);
  const [startingSeconds, setStartingSeconds] = useState(0);

  const showToast = (text, type="success") => setToast({ text, type });

  async function fetchStatus() { try { setStatus(await api("GET","/bot/status")); } catch {} }
  async function fetchQrImage() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/config/payment-qr-image?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { setQrBlobUrl(null); return; }
      const blob = await res.blob();
      setQrBlobUrl(URL.createObjectURL(blob));
    } catch { setQrBlobUrl(null); }
  }

  async function fetchConfig() {
    setConfigLoading(true); setConfigError(null);
    try {
      const c = await api("GET","/config");
      setConfig(c);
      if (c.has_payment_qr) fetchQrImage();
    } catch(e) { setConfigError(e.message); }
    setConfigLoading(false);
  }
  async function fetchLogs() { try { setLogs(await api("GET","/config/logs")); } catch {} }

  useEffect(() => {
    fetchStatus(); fetchConfig();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (status.status === "starting") {
      setStartingSeconds(0);
      startingTimerRef.current = setInterval(() => setStartingSeconds(s => s + 1), 1000);
    } else {
      clearInterval(startingTimerRef.current);
      setStartingSeconds(0);
    }
    return () => clearInterval(startingTimerRef.current);
  }, [status.status]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== null && prev !== status.status) {
      if (status.status === "qr_pending") { setTab(0); showToast("QR sedia! Sila imbas sekarang 📱","info"); }
      if (status.status === "connected")  { setTab(0); showToast("WhatsApp Bersambung! 🎉"); }
    }
    prevStatusRef.current = status.status;
  }, [status.status]);

  useEffect(() => { if (tab===3) fetchLogs(); }, [tab]);

  const startBot   = async () => { await api("POST","/bot/start"); showToast("Bot sedang dihidupkan...","info"); };
  const stopBot    = async () => { await api("POST","/bot/stop");    showToast("Bot dihentikan","error"); };
  const restartBot = async () => { await api("POST","/bot/restart"); showToast("Bot dimulakan semula...","info"); };

  async function saveConfig() {
    setSaving(true);
    try { await api("PUT","/config",config); showToast("Tetapan disimpan!"); }
    catch(e) { showToast(e.message,"error"); }
    setSaving(false);
  }

  async function handleQrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    // 1. Type check
    const allowed = ["image/jpeg","image/jpg","image/png","image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("Hanya PNG, JPG atau WEBP dibenarkan","error"); return;
    }
    // 2. Size check
    if (file.size > 5*1024*1024) {
      showToast("Saiz fail terlalu besar. Maksimum 5MB","error"); return;
    }

    // 3. Validate image loads + detect QR code using canvas
    try {
      const hasQR = await new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          try {
            // Draw to canvas and scan for QR
            const canvas = document.createElement("canvas");
            canvas.width  = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Use jsQR if available, otherwise just accept the image
            if (window.jsQR) {
              const code = window.jsQR(imageData.data, imageData.width, imageData.height);
              resolve(!!code);
            } else {
              resolve(true); // jsQR not loaded, skip QR check
            }
          } catch { resolve(true); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Fail tidak sah")); };
        img.src = url;
      });

      if (!hasQR) {
        showToast("⚠️ QR code tidak dijumpai dalam imej ini. Sila upload imej QR yang betul.","error");
        return;
      }
    } catch(err) {
      showToast(err.message || "Fail imej tidak sah","error"); return;
    }

    // 4. Upload
    try {
      await uploadFile("/config/upload-qr","paymentQr",file);
      await fetchConfig(); // this will also call fetchQrImage
      showToast("QR berjaya dimuat naik! ✅");
    } catch(err) { showToast(err.message,"error"); }
  }

  async function deleteSelectedLogs() {
    if (!selectedLogs.size || !confirm(`Padam ${selectedLogs.size} log?`)) return;
    await api("DELETE","/config/logs",{ ids:[...selectedLogs] });
    setSelectedLogs(new Set()); await fetchLogs(); showToast("Log dipadam");
  }
  async function clearAllLogs() {
    if (!confirm("Padam SEMUA log?")) return;
    const r = await api("DELETE","/config/logs/all");
    setSelectedLogs(new Set()); await fetchLogs(); showToast(`${r.deleted} log dipadam`);
  }
  const toggleLog = (id) => setSelectedLogs(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSelectedLogs(selectedLogs.size===logs.length?new Set():new Set(logs.map(l=>l.id)));

  const current = NAV.find(n=>n.id===tab);
  const Icon = current?.icon;

  // Sidebar content — shared between desktop and (future) sheet
  const SidebarContent = (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🤖</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:14 }} className="truncate">WA AI Bot</div>
          <div style={{ fontSize:11.5,color:"var(--muted)" }}>Dashboard</div>
        </div>
      </div>

      {/* Bot status pill */}
      <div className="sidebar-status">
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
          <StatusBadge status={status.status} />
          {status.phone_number && (
            <span style={{ marginLeft:"auto",fontSize:10.5,color:"var(--muted)" }} className="truncate">
              +{status.phone_number}
            </span>
          )}
        </div>
        {/* Single toggle button */}
        {!status.is_running ? (
          <button className="btn btn-primary btn-sm" style={{ width:"100%" }} onClick={startBot}>
            <Play size={13} /> Hidupkan Bot
          </button>
        ) : (
          <div style={{ display:"flex",gap:6 }}>
            <button className="btn btn-destructive btn-sm" style={{ flex:1 }} onClick={stopBot}>
              <Square size={13} /> Hentikan
            </button>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={restartBot} title="Restart">
              <RotateCw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Usage stats */}
      {config && (
        <div style={{ borderRadius:10, border:"1px solid var(--border)", background:"var(--muted-bg)", padding:"10px 12px", fontSize:12 }}>
          <div style={{ fontWeight:600, color:"var(--muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:".05em", fontSize:10.5 }}>
            Penggunaan Bulan Ini
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ color:"var(--muted)" }}>💬 Mesej</span>
              <span style={{ fontWeight:600, color: config.msg_remaining===0?"var(--red)":"var(--text)" }}>
                {config.msg_this_month}/{config.max_messages}
              </span>
            </div>
            <div style={{ height:4, borderRadius:99, background:"var(--border)", overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:99, width:`${Math.min(100,(config.msg_this_month/config.max_messages)*100)}%`, background: config.msg_remaining===0?"var(--red)":config.msg_this_month/config.max_messages>0.8?"var(--amber)":"var(--green)", transition:"width .3s" }} />
            </div>
            {config.msg_remaining===0
              ? <div style={{ fontSize:10.5,color:"var(--red)",marginTop:3 }}>Had dicapai! Reset 1hb bulan depan.</div>
              : <div style={{ fontSize:10.5,color:"var(--muted)",marginTop:3 }}>{config.msg_remaining} baki · Reset 1hb bulan depan</div>
            }
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5 }}>
            <span style={{ color:"var(--muted)" }}>Plan</span>
            <PlanBadge plan={config.plan} />
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV.map(n => (
          <button key={n.id} className={`nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <n.icon size={16} />
            <span className="truncate">{n.full}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="nav-item" style={{ cursor:"default",pointerEvents:"none" }}>
          <UserIcon size={15} />
          <span className="truncate" style={{ fontSize:13 }}>{user.name}</span>
        </div>
        {user.is_admin && (
          <button className="nav-item" onClick={()=>navigate("/admin")}
            style={{ background:"rgba(139,92,246,.1)",color:"#7c3aed",borderRadius:8,margin:"2px 8px",fontWeight:600 }}>
            <ShieldCheck size={15} style={{ color:"#7c3aed" }} />
            Admin Panel
          </button>
        )}
        <button className="nav-item" onClick={async()=>{
          try { await api("POST","/bot/stop"); } catch {}
          try { await api("POST","/auth/logout"); } catch {}
          localStorage.clear();
          navigate("/login");
        }}>
          <LogOut size={15} />
          Log Keluar
        </button>
        <div style={{ padding:"8px 12px 4px", fontSize:11, color:"#71717a", display:"flex", justifyContent:"space-between" }}>
          <span>JomReply.ai</span>
          <span style={{ background:"rgba(34,197,94,.15)", color:"#4ade80", borderRadius:4, padding:"1px 6px", fontWeight:600 }}>v1.0.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="layout">
      {toast && <Toast {...toast} onDone={()=>setToast(null)} />}

      {/* Desktop sidebar */}
      <aside className="sidebar">{SidebarContent}</aside>

      {/* Main */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title" style={{ flex:1,minWidth:0 }}>
            <h1 style={{ display:"flex",alignItems:"center",gap:8 }}>
              {Icon && <Icon size={17} style={{ color:"var(--green)",flexShrink:0 }} />}
              <span className="truncate">{current?.full}</span>
            </h1>
            <p>WhatsApp AI Bot</p>
          </div>
          {status.status !== "disconnected" && <StatusBadge status={status.status} />}
        </header>

        {/* Content */}
        <div className="page fade-in">

          {/* ── Tab 0: Connection ── */}
          {tab===0 && (
            <div style={{ maxWidth:640,margin:"0 auto" }}>

              {/* CONNECTED */}
              {status.status==="connected" && (
                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  <div className="card" style={{ padding:"28px 24px",textAlign:"center" }}>
                    <div style={{ width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16,boxShadow:"0 12px 32px rgba(34,197,94,.35)" }}>
                      <CheckCircle2 size={36} color="#fff" />
                    </div>
                    <h2 style={{ fontWeight:900,fontSize:22,marginBottom:6 }}>WhatsApp Bersambung! 🎉</h2>
                    <p style={{ color:"var(--muted)",fontSize:15,marginBottom:4,fontWeight:600 }}>📱 +{status.phone_number}</p>
                    <p style={{ color:"var(--muted)",fontSize:13,marginBottom:24 }}>Bot sedang aktif & menjawab pelanggan secara automatik</p>
                    <div className="btn-row" style={{ justifyContent:"center" }}>
                      <button className="btn btn-secondary" onClick={restartBot}><RotateCw size={15} /> Restart</button>
                      <button className="btn btn-destructive" onClick={stopBot}><Square size={15} /> Hentikan Bot</button>
                    </div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    <button className="card" style={{ padding:16,textAlign:"left",cursor:"pointer",border:"1px solid var(--border)",background:"var(--surface)",transition:"all .15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.transform="translateY(-1px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}
                      onClick={()=>setTab(2)}>
                      <BookOpen size={22} style={{ color:"var(--green)",marginBottom:8 }} />
                      <div style={{ fontWeight:700,fontSize:13,marginBottom:3 }}>Kemaskini Knowledge</div>
                      <div style={{ fontSize:12,color:"var(--muted)" }}>Tambah info produk & FAQ</div>
                    </button>
                    <button className="card" style={{ padding:16,textAlign:"left",cursor:"pointer",border:"1px solid var(--border)",background:"var(--surface)",transition:"all .15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.transform="translateY(-1px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}
                      onClick={()=>setTab(4)}>
                      <ScrollText size={22} style={{ color:"#3b82f6",marginBottom:8 }} />
                      <div style={{ fontWeight:700,fontSize:13,marginBottom:3 }}>Lihat Log Mesej</div>
                      <div style={{ fontSize:12,color:"var(--muted)" }}>Semak perbualan terkini</div>
                    </button>
                  </div>
                </div>
              )}

              {/* QR PENDING */}
              {status.status==="qr_pending" && status.qr_code && (
                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  <div className="card" style={{ padding:"24px",textAlign:"center" }}>
                    <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.3)",borderRadius:99,padding:"6px 14px",fontSize:13,fontWeight:600,color:"#b45309",marginBottom:20 }}>
                      <span style={{ width:7,height:7,borderRadius:"50%",background:"#f59e0b",display:"inline-block" }} />
                      Menunggu imbasan QR
                    </div>
                    <h2 style={{ fontWeight:800,fontSize:19,marginBottom:6 }}>Imbas Kod QR WhatsApp</h2>
                    <p style={{ color:"var(--muted)",fontSize:13,marginBottom:20,lineHeight:1.6 }}>
                      Buka WhatsApp → Tekan <strong>⋮</strong> → <strong>Peranti Terpaut</strong> → <strong>+ Tautkan Peranti</strong>
                    </p>
                    <div style={{ display:"inline-block",marginBottom:20 }}>
                      <div style={{ padding:14,background:"#fff",borderRadius:18,border:"3px solid #22c55e",boxShadow:"0 8px 32px rgba(34,197,94,.2)",display:"inline-block" }}>
                        <img src={status.qr_code} alt="QR WhatsApp" style={{ width:220,height:220,display:"block" }} />
                      </div>
                      <div style={{ marginTop:14 }}>
                        <QrCountdown />
                      </div>
                    </div>
                    <div style={{ marginTop:24 }}>
                      <a href={status.qr_code} download="jomreply-qr.png"
                        style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,background:"var(--muted-bg)",border:"1px solid var(--border)",fontSize:13,fontWeight:600,color:"var(--text)",textDecoration:"none" }}>
                        <Download size={15} /> Muat Turun QR untuk Scan dari Telefon
                      </a>
                    </div>
                  </div>
                  <div className="card" style={{ padding:"16px 20px" }}>
                    <div style={{ fontWeight:700,fontSize:13,marginBottom:12 }}>📱 Cara imbas dari telefon:</div>
                    {[["1","Buka WhatsApp di telefon anda"],["2","Tekan ikon ⋮ → Peranti Terpaut"],["3","Tekan + Tautkan Peranti"],["4","Imbas QR di atas"]].map(([n,t])=>(
                      <div key={n} style={{ display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:n!=="4"?"1px solid var(--border)":"none" }}>
                        <div style={{ width:24,height:24,borderRadius:99,background:"var(--green)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{n}</div>
                        <div style={{ fontSize:13 }}>{t}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STARTING */}
              {status.status==="starting" && (
                <div className="card" style={{ padding:"36px 24px",textAlign:"center" }}>
                  {startingSeconds < 45 ? (<>
                    <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(34,197,94,.1)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
                      <div className="spinner" style={{ width:28,height:28,borderColor:"rgba(34,197,94,.2)",borderTopColor:"var(--green)" }} />
                    </div>
                    <h2 style={{ fontWeight:700,fontSize:17,marginBottom:8 }}>Sedang Memulakan Bot...</h2>
                    <p style={{ color:"var(--muted)",fontSize:13,marginBottom:16 }}>Kod QR akan muncul dalam beberapa saat</p>
                    {/* Progress bar */}
                    <div style={{ maxWidth:200,margin:"0 auto 8px",height:4,borderRadius:99,background:"var(--border)",overflow:"hidden" }}>
                      <div style={{ height:"100%",background:"var(--green)",borderRadius:99,width:`${(startingSeconds/45)*100}%`,transition:"width 1s linear" }} />
                    </div>
                    <p style={{ fontSize:12,color:"var(--muted)" }}>{45 - startingSeconds} saat lagi...</p>
                  </>) : (<>
                    <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(239,68,68,.1)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
                      <AlertCircle size={28} style={{ color:"var(--red)" }} />
                    </div>
                    <h2 style={{ fontWeight:700,fontSize:17,marginBottom:8 }}>Mengambil masa terlalu lama</h2>
                    <p style={{ color:"var(--muted)",fontSize:13,marginBottom:20,lineHeight:1.6 }}>
                      Bot mengambil masa lebih lama dari biasa.<br/>Cuba mulakan semula atau cuba sebentar lagi.
                    </p>
                    <div className="btn-row" style={{ justifyContent:"center" }}>
                      <button className="btn btn-primary" onClick={restartBot}><RotateCw size={15}/> Cuba Semula</button>
                      <button className="btn btn-secondary" onClick={stopBot}><Square size={15}/> Berhenti</button>
                    </div>
                  </>)}
                </div>
              )}

              {/* DISCONNECTED / STOPPED — Guided Setup */}
              {(status.status==="disconnected"||status.status==="stopped"||status.status==="auth_failed") && !status.is_running && config && (
                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>

                  {/* Stopped — had previous session */}
                  {status.status==="stopped" && status.phone_number && (
                    <div className="card" style={{ padding:"14px 18px",background:"rgba(34,197,94,.04)",border:"1px solid rgba(34,197,94,.2)" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:22 }}>📱</span>
                        <div>
                          <div style={{ fontWeight:700,fontSize:14,color:"var(--green-dark)" }}>Sesi WhatsApp Tersimpan</div>
                          <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>+{status.phone_number} — Tekan Hidupkan untuk sambung semula tanpa imbas QR</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {status.status==="auth_failed" && (
                    <div className="card" style={{ padding:"14px 18px",background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.2)" }}>
                      <div style={{ fontWeight:700,fontSize:13,color:"var(--red)",marginBottom:4 }}>❌ Pengesahan Gagal</div>
                      <div style={{ fontSize:13,color:"#b91c1c" }}>Sesi WhatsApp tamat. Sila hidupkan semula dan imbas QR baru.</div>
                    </div>
                  )}
                  <div className="card" style={{ padding:"18px 22px",background:"linear-gradient(135deg,rgba(34,197,94,.06),rgba(34,197,94,.02))",borderColor:"rgba(34,197,94,.2)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      <div style={{ width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <Bot size={22} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontWeight:800,fontSize:16 }}>Setup Bot dalam 3 Minit</div>
                        <div style={{ fontSize:13,color:"var(--muted)" }}>Ikut langkah di bawah untuk aktifkan bot anda</div>
                      </div>
                    </div>
                  </div>

                  {/* Setup steps — only show for fresh accounts */}
                  {status.status!=="stopped" && (<>
                  {/* Step 1 */}
                  <div className="card" style={{ padding:0,overflow:"hidden",border:config.knowledge?"1.5px solid var(--green)":"1px solid var(--border)" }}>
                    <div style={{ padding:"16px 20px",display:"flex",alignItems:"center",gap:14 }}>
                      <div style={{ width:36,height:36,borderRadius:10,background:config.knowledge?"var(--green)":"var(--muted-bg)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s" }}>
                        {config.knowledge?<CheckCircle2 size={18} color="#fff"/>:<span style={{ fontWeight:800,fontSize:14,color:"var(--muted)" }}>1</span>}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                          Tambah Pengetahuan Bot
                          {config.knowledge&&<span style={{ fontSize:11,background:"var(--green-bg)",color:"var(--green-dark)",borderRadius:99,padding:"1px 8px",fontWeight:600 }}>✓ Siap</span>}
                        </div>
                        <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>
                          {config.knowledge?`${config.knowledge.length.toLocaleString()} aksara`:"Bot perlu info produk & FAQ"}
                        </div>
                      </div>
                      <button className="btn btn-default btn-sm" onClick={()=>setTab(2)} style={{ flexShrink:0 }}>
                        {config.knowledge?"Edit →":"Mula →"}
                      </button>
                    </div>
                    {!config.knowledge&&(
                      <div style={{ padding:"0 20px 16px",borderTop:"1px solid var(--border)" }}>
                        <textarea className="input" style={{ minHeight:90,fontFamily:"'Courier New',monospace",fontSize:12.5,marginBottom:8,marginTop:12 }}
                          placeholder={"Nama kedai: Kedai Anda\nProduk: Baju T-shirt RM30\nWaktu: Isnin-Jumaat 9am-6pm"}
                          value={config.knowledge}
                          onChange={e=>setConfig({...config,knowledge:e.target.value})} />
                        <button className="btn btn-default btn-sm" onClick={saveConfig} disabled={saving} style={{ width:"100%" }}>
                          {saving?<><span className="spinner spinner-white" style={{ width:13,height:13 }}/> Menyimpan...</>:"💾 Simpan & Teruskan"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className="card" style={{ padding:"16px 20px",display:"flex",alignItems:"center",gap:14,border:config.has_payment_qr?"1.5px solid var(--green)":"1px solid var(--border)" }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:config.has_payment_qr?"var(--green)":"var(--muted-bg)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      {config.has_payment_qr?<CheckCircle2 size={18} color="#fff"/>:<span style={{ fontWeight:800,fontSize:14,color:"var(--muted)" }}>2</span>}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                        Upload QR Bayaran
                        <span style={{ fontSize:11,background:"var(--muted-bg)",color:"var(--muted)",borderRadius:99,padding:"1px 8px" }}>Optional</span>
                        {config.has_payment_qr&&<span style={{ fontSize:11,background:"var(--green-bg)",color:"var(--green-dark)",borderRadius:99,padding:"1px 8px",fontWeight:600 }}>✓ Siap</span>}
                      </div>
                      <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>
                        {config.has_payment_qr?"QR DuitNow/TNG sudah diupload":"Bot hantar QR auto bila pelanggan tanya bayaran"}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={()=>setTab(3)} style={{ flexShrink:0 }}>
                      {config.has_payment_qr?"Tukar":"Upload"}
                    </button>
                  </div>
                  </>)}

                  {/* Step 3 — Activate (always shown) */}
                  <div className="card" style={{ padding:"20px 22px",background:"linear-gradient(135deg,rgba(34,197,94,.08),rgba(34,197,94,.03))",borderColor:"rgba(34,197,94,.25)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                      <div style={{ width:36,height:36,borderRadius:10,background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <Play size={16} color="#fff" />
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:700,fontSize:14 }}>
                          {status.status==="stopped" ? "Sambung Semula Bot" : "Hidupkan Bot"}
                        </div>
                        <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>
                          {status.status==="stopped"
                            ? "Tekan untuk sambung semula — tiada perlu imbas QR"
                            : config.knowledge ? "Bot sedia! Klik untuk sambung WhatsApp" : "Lengkapkan langkah 1 dahulu"}
                        </div>
                      </div>
                      <button className="btn btn-primary" onClick={startBot}
                        disabled={status.status!=="stopped" && !config.knowledge}
                        style={{ flexShrink:0, opacity:(status.status==="stopped"||config.knowledge)?1:.5 }}>
                        <Play size={15} /> {status.status==="stopped" ? "Sambung" : "Hidupkan"}
                      </button>
                    </div>
                    {status.status!=="stopped" && !config.knowledge && (
                      <div style={{ marginTop:12,fontSize:12,color:"var(--muted)",padding:"8px 12px",background:"rgba(0,0,0,.04)",borderRadius:8 }}>
                        💡 Tambah pengetahuan (Langkah 1) supaya bot boleh menjawab soalan pelanggan.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 1: Settings ── */}
          {tab===1 && (
            configLoading ? <div style={{ textAlign:"center",padding:48 }}><div className="spinner" style={{ margin:"0 auto" }} /></div>
            : configError ? (
              <div className="card" style={{ padding:32,textAlign:"center",maxWidth:400,margin:"0 auto" }}>
                <AlertCircle size={36} style={{ margin:"0 auto 12px",color:"var(--red)" }} />
                <div style={{ fontWeight:600,marginBottom:8 }}>Gagal memuatkan tetapan</div>
                <p style={{ fontSize:13,color:"var(--muted)",marginBottom:16 }}>{configError}</p>
                <button className="btn btn-default" onClick={fetchConfig}>Cuba Semula</button>
              </div>
            ) : config && (
            <div style={{ maxWidth:580,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
              {/* Sub-tabs: Tetapan Bot | QR Bayaran */}
              <div style={{ display:"flex",gap:4,background:"var(--surface-2,rgba(255,255,255,0.04))",borderRadius:10,padding:4,border:"1px solid var(--border-soft)" }}>
                {[{id:0,label:"⚙️ Tetapan Bot"},{id:1,label:"💳 QR Bayaran"}].map(t=>(
                  <button key={t.id} onClick={()=>setSettingsTab(t.id)}
                    style={{ flex:1,padding:"7px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                      background:settingsTab===t.id?"rgba(16,185,129,0.2)":"transparent",
                      color:settingsTab===t.id?"#6ee7b7":"var(--muted)",
                      transition:"all .15s" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {settingsTab===0 && <>
                <div className="card" style={{ padding:"20px 22px" }}>
                  <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>⚙️ Tetapan Bot</div>
                  <p style={{ fontSize:13,color:"var(--muted)",marginBottom:16 }}>Konfigurasi asas bot anda</p>
                <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                  <div>
                    <label className="form-label">Nama Bot</label>
                    <input className="input" value={config.bot_name} onChange={e=>setConfig({...config,bot_name:e.target.value})} placeholder="Contoh: AI Assistant Kedai Saya" />
                  </div>
                  <div>
                    <label className="form-label">Nombor Dibenarkan</label>
                    <input className="input" value={config.allowed_numbers} onChange={e=>setConfig({...config,allowed_numbers:e.target.value})} placeholder="60123456789,60198765432 (kosong = semua)" />
                    <p style={{ fontSize:12,color:"var(--muted)",marginTop:5 }}>Pisahkan koma. Tanpa +</p>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:"var(--muted-bg)",borderRadius:10,padding:"13px 16px",border:"1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>Abaikan Group</div>
                      <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>Bot tak balas mesej group</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={!!config.ignore_groups} onChange={e=>setConfig({...config,ignore_groups:e.target.checked})} />
                      <span className="switch-track" />
                    </label>
                  </div>
                </div>
                </div>
              <button className="btn btn-default btn-lg" style={{ width:"100%" }} onClick={saveConfig} disabled={saving}>
                {saving?<><span className="spinner spinner-white" style={{ width:16,height:16 }}/> Menyimpan...</>:"💾 Simpan Tetapan"}
              </button>
              </>}
              {settingsTab===1 && <QrPaymentSection config={config} setConfig={setConfig} fetchConfig={fetchConfig} showToast={showToast} qrBlobUrl={qrBlobUrl} fetchQrImage={fetchQrImage} saving={saving} saveConfig={saveConfig}/>}
            </div>
          ))}

          {/* ── Tab 2: Knowledge ── */}
          {tab===2 && (
            configLoading ? <div style={{ textAlign:"center",padding:48 }}><div className="spinner" style={{ margin:"0 auto" }} /></div>
            : configError ? (
              <div className="card" style={{ padding:32,textAlign:"center",maxWidth:400,margin:"0 auto" }}>
                <AlertCircle size={36} style={{ margin:"0 auto 12px",color:"var(--red)" }} />
                <div style={{ fontWeight:600,marginBottom:8 }}>Gagal memuatkan tetapan</div>
                <button className="btn btn-default btn-sm" onClick={fetchConfig} style={{ marginTop:8 }}>Cuba Semula</button>
              </div>
            ) : config && (
            <div style={{ maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
              <div className="card" style={{ padding:"20px 22px",position:"relative",overflow:"hidden" }}>
                {/* Extracting overlay */}
                {config._extracting && (
                  <div style={{ position:"absolute",inset:0,background:"rgba(255,255,255,.92)",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,borderRadius:"inherit" }}>
                    <div style={{ position:"relative",width:64,height:64 }}>
                      <div style={{ position:"absolute",inset:0,borderRadius:"50%",border:"3px solid rgba(34,197,94,.2)",borderTopColor:"var(--green)",animation:"spin 1s linear infinite" }}/>
                      <div style={{ position:"absolute",inset:8,borderRadius:"50%",border:"3px solid rgba(34,197,94,.1)",borderBottomColor:"var(--green)",animation:"spin 1.5s linear infinite reverse" }}/>
                      <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>📄</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontWeight:700,fontSize:15,color:"var(--text)",marginBottom:6 }}>Sedang Mengekstrak...</div>
                      <div style={{ fontSize:13,color:"var(--muted)" }}>AI sedang membaca fail anda</div>
                      <div style={{ fontSize:12,color:"var(--muted)",marginTop:4 }}>PDF & imej mungkin mengambil masa 10-30 saat</div>
                    </div>
                    <div style={{ display:"flex",gap:6 }}>
                      {[0,1,2,3,4].map(i=>(
                        <div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"var(--green)",opacity:.3,animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:10,flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:15,marginBottom:3 }}>📚 Pangkalan Pengetahuan</div>
                    <p style={{ fontSize:13,color:"var(--muted)" }}>Bot menjawab berdasarkan info ini</p>
                  </div>
                  <span className="badge badge-secondary">{(config.knowledge||"").length.toLocaleString()} aksara</span>
                </div>
                <textarea className="input" style={{ minHeight:320,fontFamily:"'Courier New',monospace",fontSize:13.5,opacity:config._extracting?.5:1,transition:"opacity .3s" }}
                  placeholder={"TENTANG PERNIAGAAN\n===================\nNama: Kedai Saya\n\nPRODUK\n=======\n1. Produk A — RM50\n\nFAQ\n====\nS: Cara beli?\nJ: Pergi ke website..."}
                  value={config.knowledge}
                  onChange={e=>setConfig({...config,knowledge:e.target.value})}
                  disabled={config._extracting} />
                <div className="btn-row" style={{ marginTop:14 }}>
                  <button className="btn btn-default" onClick={saveConfig} disabled={saving||config._extracting}>
                    {saving?<><span className="spinner spinner-white" style={{ width:15,height:15 }}/> Menyimpan...</>:"💾 Simpan"}
                  </button>
                  <label className="btn btn-outline" style={{ cursor:config._extracting?"not-allowed":"pointer",opacity:config._extracting?.5:1 }}>
                    <Upload size={15} /> {config._extracting?"Memproses...":"Upload Fail"}
                    <input type="file" accept=".txt,.pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.csv" style={{ display:"none" }}
                      disabled={config._extracting}
                      onChange={async e=>{
                        const file = e.target.files[0];
                        if(!file) return;
                        e.target.value = "";
                        // Show extracting overlay
                        setConfig(c=>({...c,_extracting:true}));
                        try {
                          const r = await uploadFile("/config/upload-knowledge","knowledge",file);
                          const fresh = await api("GET","/config");
                          setConfig({...fresh,_extracting:false});
                          showToast(`✅ ${file.name} — ${r.characters.toLocaleString()} aksara berjaya diekstrak`);
                        } catch(err) {
                          setConfig(c=>({...c,_extracting:false}));
                          showToast(err.message,"error");
                        }
                      }} />
                  </label>
                  {config.knowledge && !config._extracting && (
                    <button className="btn btn-ghost" onClick={()=>setConfig({...config,knowledge:""})}>
                      <Trash2 size={15} /> Kosong
                    </button>
                  )}
                </div>
                <div style={{ marginTop:8,fontSize:11.5,color:"var(--muted)" }}>
                  📎 PDF · Excel · Word · JPG/PNG · CSV · TXT · Max 10MB
                </div>
              </div>
              <div className="card" style={{ padding:"16px 20px",background:"var(--green-bg)",borderColor:"var(--green-border)" }}>
                <div style={{ fontWeight:700,fontSize:13,color:"var(--green-dark)",marginBottom:8 }}>💡 Tips</div>
                {["Masukkan info produk & harga","Tambah FAQ pelanggan","Sertakan waktu operasi & cara hubungi"].map((t,i)=>(
                  <div key={i} style={{ fontSize:13,color:"var(--green-dark)",display:"flex",gap:6,marginBottom:5 }}><span>✓</span>{t}</div>
                ))}
              </div>
            </div>
          ))}

          {/* ── Tab 3: Logs ── */}
          {tab===3 && (
            <div style={{ maxWidth:760,margin:"0 auto" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:8,flexWrap:"wrap" }}>
                <div style={{ fontWeight:700,fontSize:15 }}>
                  📋 Log Mesej
                  <span style={{ fontSize:13,fontWeight:400,color:"var(--muted)",marginLeft:8 }}>
                    ({logs.length}){selectedLogs.size>0&&<span style={{ fontWeight:600,color:"var(--primary)" }}> · {selectedLogs.size} dipilih</span>}
                  </span>
                </div>
                <div className="btn-row">
                  {selectedLogs.size>0 && (
                    <button className="btn btn-destructive btn-sm" onClick={deleteSelectedLogs}>
                      <Trash2 size={13} /> ({selectedLogs.size})
                    </button>
                  )}
                  {logs.length>0 && (
                    <button className="btn btn-outline btn-sm" onClick={clearAllLogs}>
                      <Trash2 size={13} /> Clear
                    </button>
                  )}
                  <button className="btn btn-outline btn-sm btn-icon" onClick={fetchLogs}><RefreshCw size={14} /></button>
                </div>
              </div>

              {logs.length===0 ? (
                <div className="card" style={{ padding:48,textAlign:"center" }}>
                  <MessageSquare size={48} style={{ margin:"0 auto 12px",color:"#d4d4d8" }} />
                  <div style={{ fontWeight:700,fontSize:15,marginBottom:5 }}>Tiada log lagi</div>
                  <p style={{ fontSize:13,color:"var(--muted)" }}>Mesej akan muncul setelah bot aktif</p>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:"var(--muted-bg)",borderRadius:10,marginBottom:12,border:"1px solid var(--border)" }}>
                    <input type="checkbox" className="checkbox" checked={selectedLogs.size===logs.length&&logs.length>0} onChange={toggleAll} />
                    <span style={{ fontSize:13,color:"var(--muted)" }}>{selectedLogs.size===logs.length&&logs.length>0?"Nyahpilih semua":"Pilih semua"}</span>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {logs.map(log=>(
                      <div key={log.id} className="card" onClick={()=>toggleLog(log.id)}
                        style={{ padding:16,cursor:"pointer",border:selectedLogs.has(log.id)?"1.5px solid var(--primary)":"1px solid var(--border)",background:selectedLogs.has(log.id)?"rgba(24,24,27,.04)":"var(--surface)",transition:"all .15s" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12,gap:8 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8,minWidth:0 }}>
                            <input type="checkbox" className="checkbox" checked={selectedLogs.has(log.id)} onChange={()=>toggleLog(log.id)} onClick={e=>e.stopPropagation()} />
                            <span style={{ fontWeight:700,fontSize:13 }} className="truncate">📱 +{log.sender}</span>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
                            <span style={{ fontSize:11,color:"var(--muted)" }}>{new Date(log.created_at).toLocaleString("ms-MY")}</span>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color:"var(--red)" }}
                              onClick={async e=>{ e.stopPropagation(); await api("DELETE","/config/logs",{ids:[log.id]}); await fetchLogs(); showToast("Log dipadam"); }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                          <div>
                            <div style={{ fontSize:10,fontWeight:600,color:"#3b82f6",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em" }}>👤 Pelanggan</div>
                            <div className="bubble-user">{log.message}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:10,fontWeight:600,color:"var(--green-dark)",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em" }}>🤖 Bot</div>
                            <div className="bubble-bot">{log.reply}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav" style={{ gridTemplateColumns:`repeat(${NAV.length + (user.is_admin?3:2)},1fr)` }}>
        {NAV.map(n => (
          <button key={n.id} className={`bottom-nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <n.icon size={18}/>
            <span style={{ fontSize:9 }}>{n.label}</span>
          </button>
        ))}
        {user.is_admin && (
          <button className="bottom-nav-item" onClick={()=>navigate("/admin")} style={{ color:"#a78bfa" }}>
            <ShieldCheck size={18}/>
            <span style={{ fontSize:9 }}>Admin</span>
          </button>
        )}
        {/* Avatar + name */}
        <button className="bottom-nav-item" style={{ gap:2 }} onClick={()=>{}}>
          <div style={{ width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff" }}>
            {user.name?.[0]?.toUpperCase()||"U"}
          </div>
          <span style={{ fontSize:8.5,color:"var(--muted)",maxWidth:40,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.name?.split(" ")[0]}</span>
        </button>
        {/* Log Keluar */}
        <button className="bottom-nav-item" style={{ color:"var(--red)" }} onClick={async()=>{
          try{await api("POST","/auth/logout");}catch{}
          localStorage.clear(); navigate("/login");
        }}>
          <LogOut size={18}/>
          <span style={{ fontSize:9 }}>Keluar</span>
        </button>
      </nav>
    </div>
  );
}
