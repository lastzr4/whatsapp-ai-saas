import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plug, Settings, BookOpen, CreditCard, ScrollText,
  Bot, LogOut, Play, RotateCw, Square, Upload, Trash2,
  RefreshCw, Smartphone, CheckCircle2, Camera, MessageSquare,
  User as UserIcon, AlertCircle,
} from "lucide-react";
import { api, uploadFile } from "../lib/api.js";

const NAV = [
  { id:0, icon:Plug,        label:"Sambungan", full:"Sambungan" },
  { id:1, icon:Settings,    label:"Tetapan",   full:"Tetapan Bot" },
  { id:2, icon:BookOpen,    label:"Knowledge", full:"Pengetahuan" },
  { id:3, icon:CreditCard,  label:"QR",        full:"QR Bayaran" },
  { id:4, icon:ScrollText,  label:"Log",       full:"Log Mesej" },
];

const STATUS_LABEL = {
  connected:"Bersambung", qr_pending:"Imbas QR",
  starting:"Memulakan...", disconnected:"Terputus", auth_failed:"Auth Gagal",
};

function statusColor(s) {
  if (s==="connected") return "green";
  if (s==="qr_pending"||s==="starting") return "amber";
  if (s==="auth_failed") return "red";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab]                   = useState(0);
  const [status, setStatus]             = useState({ status:"disconnected", is_running:false });
  const [config, setConfig]             = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError]   = useState(null);
  const [logs, setLogs]                 = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [qrTs, setQrTs]                 = useState(Date.now());
  const [toast, setToast]               = useState(null);
  const [saving, setSaving]             = useState(false);
  const pollRef = useRef(null);

  const showToast = (text, type="success") => setToast({ text, type });

  async function fetchStatus() { try { setStatus(await api("GET","/bot/status")); } catch {} }
  async function fetchConfig() {
    setConfigLoading(true); setConfigError(null);
    try {
      const c = await api("GET","/config");
      setConfig(c);
    } catch(e) {
      setConfigError(e.message);
    }
    setConfigLoading(false);
  }
  async function fetchLogs()   { try { setLogs(await api("GET","/config/logs")); } catch {} }

  useEffect(() => {
    fetchStatus(); fetchConfig();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, []);
  useEffect(() => { if (tab===4) fetchLogs(); }, [tab]);

  const startBot   = async () => { await api("POST","/bot/start");   showToast("Bot sedang dihidupkan...","info"); };
  const stopBot    = async () => { await api("POST","/bot/stop");    showToast("Bot dihentikan","error"); };
  const restartBot = async () => { await api("POST","/bot/restart"); showToast("Bot dimulakan semula...","info"); };

  async function saveConfig() {
    setSaving(true);
    try { await api("PUT","/config",config); showToast("Tetapan disimpan!"); }
    catch(e) { showToast(e.message,"error"); }
    setSaving(false);
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
        <div className="btn-row" style={{ gap:6 }}>
          {!status.is_running && (
            <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={startBot}>
              <Play size={12} /> Hidupkan
            </button>
          )}
          {status.is_running && (
            <>
              <button className="btn btn-secondary btn-sm btn-icon" style={{ flex:1 }} onClick={restartBot}><RotateCw size={14} /></button>
              <button className="btn btn-destructive btn-sm btn-icon" style={{ flex:1 }} onClick={stopBot}><Square size={14} /></button>
            </>
          )}
        </div>
      </div>

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
        <button className="nav-item" onClick={async()=>{ try{await api("POST","/auth/logout");}catch{} localStorage.clear(); navigate("/login"); }}>
          <LogOut size={15} />
          Log Keluar
        </button>
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
          <div className="btn-row" style={{ flexShrink:0 }}>
            <div style={{ display:"none" }} className="status-desktop"><StatusBadge status={status.status} /></div>
            {!status.is_running
              ? <button className="btn btn-primary btn-sm" onClick={startBot}><Play size={13} /> <span>Hidupkan</span></button>
              : <>
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={restartBot}><RotateCw size={15} /></button>
                  <button className="btn btn-destructive btn-icon btn-sm" onClick={stopBot}><Square size={15} /></button>
                </>
            }
          </div>
        </header>

        {/* Content */}
        <div className="page fade-in">

          {/* ── Tab 0: Connection ── */}
          {tab===0 && (
            <div style={{ maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
              {status.status==="connected" && (
                <div className="card" style={{ padding:"36px 24px",textAlign:"center" }}>
                  <div style={{ width:68,height:68,borderRadius:18,background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16,boxShadow:"0 8px 24px rgba(34,197,94,.3)" }}>
                    <CheckCircle2 size={32} color="#fff" />
                  </div>
                  <h2 style={{ fontWeight:800,fontSize:20,marginBottom:6 }}>WhatsApp Bersambung!</h2>
                  <p style={{ color:"var(--muted)",fontSize:14,marginBottom:4 }}>📱 +{status.phone_number}</p>
                  <p style={{ color:"var(--muted)",fontSize:13,marginBottom:24 }}>Bot aktif & menjawab mesej automatik</p>
                  <div className="btn-row" style={{ justifyContent:"center" }}>
                    <button className="btn btn-secondary" onClick={restartBot}><RotateCw size={15} /> Restart</button>
                    <button className="btn btn-destructive" onClick={stopBot}><Square size={15} /> Hentikan</button>
                  </div>
                </div>
              )}
              {status.status==="qr_pending" && status.qr_code && (
                <div className="card" style={{ padding:"28px 24px",textAlign:"center" }}>
                  <h2 style={{ fontWeight:800,fontSize:18,marginBottom:6 }}>Imbas Kod QR</h2>
                  <p style={{ color:"var(--muted)",fontSize:13,marginBottom:22 }}>WhatsApp → <b>Peranti Terpaut</b> → <b>Tautkan Peranti</b></p>
                  <div style={{ display:"inline-block",padding:12,background:"#fff",borderRadius:16,border:"2px solid var(--border)",boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
                    <img src={status.qr_code} alt="QR" style={{ width:200,height:200,display:"block" }} />
                  </div>
                  <p style={{ marginTop:14,fontSize:12,color:"var(--muted)" }}>⏱ Tamat dalam ~60 saat</p>
                </div>
              )}
              {status.status==="starting" && (
                <div className="card" style={{ padding:"48px 24px",textAlign:"center" }}>
                  <div className="spinner" style={{ margin:"0 auto 16px" }} />
                  <h2 style={{ fontWeight:700,fontSize:17,marginBottom:8 }}>Sedang Memulakan...</h2>
                  <p style={{ color:"var(--muted)",fontSize:13 }}>Kod QR akan muncul sebentar lagi</p>
                </div>
              )}
              {(status.status==="disconnected"||status.status==="auth_failed") && !status.is_running && (
                <div className="card" style={{ padding:"48px 24px",textAlign:"center" }}>
                  <Smartphone size={52} style={{ margin:"0 auto 16px",color:"#d4d4d8" }} />
                  <h2 style={{ fontWeight:800,fontSize:20,marginBottom:8 }}>Bot Belum Aktif</h2>
                  <p style={{ color:"var(--muted)",fontSize:14,marginBottom:24 }}>Klik butang di bawah untuk hidupkan bot</p>
                  <button className="btn btn-primary btn-lg" onClick={startBot}><Play size={16} /> Hidupkan Bot</button>
                </div>
              )}
              {status.status!=="connected" && (
                <div className="steps-grid">
                  {[["1","Hidupkan Bot","Klik butang Hidupkan Bot"],["2","Imbas QR","Scan dengan WhatsApp anda"],["3","Bot Aktif!","Mula menjawab 24/7"]].map(([n,t,d])=>(
                    <div key={n} className="card" style={{ display:"flex",alignItems:"center",gap:12,padding:16 }}>
                      <div style={{ width:36,height:36,borderRadius:99,background:"rgba(34,197,94,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--green)",flexShrink:0,fontSize:15 }}>{n}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700,fontSize:13 }}>{t}</div>
                        <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>{d}</div>
                      </div>
                    </div>
                  ))}
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
              <div className="card" style={{ padding:"20px 22px" }}>
                <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>⚙️ Tetapan Bot</div>
                <p style={{ fontSize:13,color:"var(--muted)",marginBottom:20 }}>Konfigurasi asas bot anda</p>
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
              <div className="card" style={{ padding:"20px 22px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:10,flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:15,marginBottom:3 }}>📚 Pangkalan Pengetahuan</div>
                    <p style={{ fontSize:13,color:"var(--muted)" }}>Bot menjawab berdasarkan info ini</p>
                  </div>
                  <span className="badge badge-secondary">{(config.knowledge||"").length.toLocaleString()} aksara</span>
                </div>
                <textarea className="input" style={{ minHeight:320,fontFamily:"'Courier New',monospace",fontSize:13.5 }}
                  placeholder={"TENTANG PERNIAGAAN\n===================\nNama: Kedai Saya\n\nPRODUK\n=======\n1. Produk A — RM50\n\nFAQ\n====\nS: Cara beli?\nJ: Pergi ke website..."}
                  value={config.knowledge}
                  onChange={e=>setConfig({...config,knowledge:e.target.value})} />
                <div className="btn-row" style={{ marginTop:14 }}>
                  <button className="btn btn-default" onClick={saveConfig} disabled={saving}>
                    {saving?<><span className="spinner spinner-white" style={{ width:15,height:15 }}/> Menyimpan...</>:"💾 Simpan"}
                  </button>
                  <label className="btn btn-outline" style={{ cursor:"pointer" }}>
                    <Upload size={15} /> Upload .txt
                    <input type="file" accept=".txt" style={{ display:"none" }} onChange={async e=>{
                      if(!e.target.files[0]) return;
                      try {
                        const r = await uploadFile("/config/upload-knowledge","knowledge",e.target.files[0]);
                        await fetchConfig();
                        showToast(`✅ ${r.characters.toLocaleString()} aksara dimuat!`);
                      } catch(err) { showToast(err.message,"error"); }
                    }} />
                  </label>
                  {config.knowledge && (
                    <button className="btn btn-ghost" onClick={()=>setConfig({...config,knowledge:""})}>
                      <Trash2 size={15} /> Kosong
                    </button>
                  )}
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

          {/* ── Tab 3: Payment QR ── */}
          {tab===3 && (
            configLoading ? <div style={{ textAlign:"center",padding:48 }}><div className="spinner" style={{ margin:"0 auto" }} /></div>
            : configError ? (
              <div className="card" style={{ padding:32,textAlign:"center",maxWidth:400,margin:"0 auto" }}>
                <AlertCircle size={36} style={{ margin:"0 auto 12px",color:"var(--red)" }} />
                <div style={{ fontWeight:600,marginBottom:8 }}>Gagal memuatkan tetapan</div>
                <button className="btn btn-default btn-sm" onClick={fetchConfig} style={{ marginTop:8 }}>Cuba Semula</button>
              </div>
            ) : config && (
            <div style={{ maxWidth:520,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
              <div className="card" style={{ padding:"20px 22px" }}>
                <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>💳 QR Pembayaran</div>
                <p style={{ fontSize:13,color:"var(--muted)",marginBottom:20 }}>Bot hantar QR ini bila pelanggan tanya tentang bayaran</p>

                {config.has_payment_qr ? (
                  <div style={{ textAlign:"center",marginBottom:20 }}>
                    <div style={{ position:"relative",display:"inline-block" }}>
                      <div style={{ borderRadius:16,border:"2px solid var(--border)",background:"#fff",padding:12,display:"inline-block" }}>
                        <img key={qrTs} src={`/api/config/payment-qr-image?t=${qrTs}`} alt="QR"
                          style={{ width:180,height:180,objectFit:"contain",display:"block" }} />
                      </div>
                      <div style={{ position:"absolute",top:8,right:8,width:24,height:24,borderRadius:99,background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <CheckCircle2 size={14} color="#fff" />
                      </div>
                    </div>
                    <div style={{ fontWeight:700,fontSize:14,marginTop:12,marginBottom:4 }}>QR Pembayaran Aktif ✅</div>
                    <div style={{ fontSize:12,color:"var(--muted)",marginBottom:14 }}>Bot akan hantar QR ini secara automatik</div>
                    <label className="btn btn-outline" style={{ cursor:"pointer" }}>
                      <RotateCw size={14} /> Ganti QR
                      <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e=>{
                        if(!e.target.files[0]) return;
                        await uploadFile("/config/upload-qr","paymentQr",e.target.files[0]);
                        setQrTs(Date.now()); await fetchConfig(); showToast("QR berjaya diganti!");
                      }} />
                    </label>
                  </div>
                ) : (
                  <div style={{ border:"2px dashed var(--border)",borderRadius:14,padding:36,textAlign:"center",background:"var(--muted-bg)",marginBottom:18 }}>
                    <Camera size={48} style={{ margin:"0 auto 12px",color:"#d4d4d8" }} />
                    <div style={{ fontWeight:600,fontSize:14,marginBottom:6 }}>Belum ada QR Pembayaran</div>
                    <p style={{ fontSize:12,color:"var(--muted)",marginBottom:18 }}>Upload imej QR DuitNow, TNG, atau eWallet anda</p>
                    <label className="btn btn-default" style={{ cursor:"pointer" }}>
                      <Upload size={15} /> Upload QR
                      <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e=>{
                        if(!e.target.files[0]) return;
                        await uploadFile("/config/upload-qr","paymentQr",e.target.files[0]);
                        setQrTs(Date.now()); await fetchConfig(); showToast("QR berjaya dimuat naik!");
                      }} />
                    </label>
                  </div>
                )}

                <div style={{ marginBottom:16 }}>
                  <label className="form-label">Teks Kapsyen QR</label>
                  <textarea className="input" style={{ minHeight:90,fontFamily:"inherit" }}
                    value={config.payment_caption} onChange={e=>setConfig({...config,payment_caption:e.target.value})} />
                </div>
                <button className="btn btn-default" style={{ width:"100%" }} onClick={saveConfig} disabled={saving}>
                  {saving?<><span className="spinner spinner-white" style={{ width:15,height:15 }}/> Menyimpan...</>:"💾 Simpan Kapsyen"}
                </button>
              </div>

              <div className="card" style={{ padding:"14px 18px",background:"var(--blue-bg)",borderColor:"var(--blue-border)" }}>
                <div style={{ fontWeight:700,fontSize:12,color:"var(--blue-text)",marginBottom:8 }}>🔑 Kata kunci pencetus QR</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {["bayar","bayaran","qr","duitnow","tng","ewallet","maybank","cimb","transfer","payment","pay"].map(k=>(
                    <span key={k} className="badge badge-blue" style={{ fontSize:11 }}>{k}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* ── Tab 4: Logs ── */}
          {tab===4 && (
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
      <nav className="bottom-nav">
        {NAV.map(n => (
          <button key={n.id} className={`bottom-nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <n.icon />
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
