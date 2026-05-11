import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadFile } from "../lib/api.js";

const NAV = [
  { icon:"🔌", label:"Sambungan",      id:0 },
  { icon:"⚙️", label:"Tetapan Bot",    id:1 },
  { icon:"📚", label:"Pengetahuan",    id:2 },
  { icon:"💳", label:"QR Bayaran",     id:3 },
  { icon:"📋", label:"Log Mesej",      id:4 },
];

function Toast({ text, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  return (
    <div className={`toast toast-${type}`}>
      <span style={{ fontSize:18 }}>{type==="success"?"✅":"❌"}</span>
      <span>{text}</span>
      <button onClick={onDone} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:16 }}>✕</button>
    </div>
  );
}

function StatusDot({ status }) {
  const map = { connected:"green", qr_pending:"yellow", starting:"yellow", disconnected:"gray", auth_failed:"red" };
  return <span className={`pulse-dot ${map[status]||"gray"}`} />;
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab]           = useState(0);
  const [status, setStatus]     = useState({ status:"disconnected", is_running:false });
  const [config, setConfig]     = useState(null);
  const [logs, setLogs]         = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [qrTimestamp, setQrTimestamp]   = useState(Date.now()); // force re-fetch QR image
  const [toast, setToast]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const pollRef = useRef(null);

  function showToast(text, type="success") { setToast({ text, type }); }

  async function fetchStatus() {
    try { const s = await api("GET","/bot/status"); setStatus(s); } catch {}
  }
  async function fetchConfig() {
    try { const c = await api("GET","/config"); setConfig(c); } catch {}
  }
  async function fetchLogs() {
    try { const l = await api("GET","/config/logs"); setLogs(l); } catch {}
  }

  useEffect(() => {
    fetchStatus(); fetchConfig();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => { if (tab===4) fetchLogs(); }, [tab]);

  async function startBot()   { await api("POST","/bot/start");   showToast("Bot sedang dihidupkan..."); }
  async function stopBot()    { await api("POST","/bot/stop");    showToast("Bot dihentikan","error"); }
  async function restartBot() { await api("POST","/bot/restart"); showToast("Bot sedang dimulakan semula..."); }

  async function deleteSelectedLogs() {
    if (!selectedLogs.size) return;
    if (!confirm(`Padam ${selectedLogs.size} log yang dipilih?`)) return;
    try {
      await api("DELETE", "/config/logs", { ids: [...selectedLogs] });
      setSelectedLogs(new Set());
      await fetchLogs();
      showToast(`${selectedLogs.size} log berjaya dipadam`);
    } catch (e) { showToast(e.message, "error"); }
  }

  async function clearAllLogs() {
    if (!confirm("Padam SEMUA log mesej? Tindakan ini tidak boleh dibatalkan!")) return;
    try {
      const r = await api("DELETE", "/config/logs/all");
      setSelectedLogs(new Set());
      await fetchLogs();
      showToast(`${r.deleted} log berjaya dipadam`);
    } catch (e) { showToast(e.message, "error"); }
  }

  function toggleLog(id) {
    setSelectedLogs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllLogs() {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(logs.map(l => l.id)));
    }
  }

  async function saveConfig() {
    setSaving(true);
    try { await api("PUT","/config",config); showToast("Tetapan disimpan!"); }
    catch (e) { showToast(e.message,"error"); }
    setSaving(false);
  }

  const statusLabel = {
    connected:   "Bersambung",
    qr_pending:  "Imbas QR",
    starting:    "Sedang mula...",
    disconnected:"Terputus",
    auth_failed: "Auth Gagal",
  }[status.status] || "Terputus";

  const statusBadge = {
    connected:   "badge-green",
    qr_pending:  "badge-yellow",
    starting:    "badge-yellow",
    disconnected:"badge-gray",
    auth_failed: "badge-red",
  }[status.status] || "badge-gray";

  return (
    <div className="layout">
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🤖</div>
          <div>
            <div style={{ color:"#f1f5f9",fontWeight:700,fontSize:14 }}>WA AI Bot</div>
            <div style={{ color:"#64748b",fontSize:11 }}>Dashboard</div>
          </div>
        </div>

        {/* Bot status pill */}
        <div style={{ margin:"12px 10px", background:"rgba(255,255,255,.05)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
            <StatusDot status={status.status} />
            <span className={`badge ${statusBadge}`} style={{ fontSize:11 }}>{statusLabel}</span>
          </div>
          {status.phone_number && <div style={{ fontSize:11,color:"#64748b",marginTop:4 }}>📱 +{status.phone_number}</div>}
          <div style={{ display:"flex",gap:6,marginTop:10 }}>
            {!status.is_running && <button className="btn btn-primary btn-sm" style={{ flex:1,fontSize:11 }} onClick={startBot}>▶ Hidupkan</button>}
            {status.is_running  && <button className="btn btn-secondary btn-sm" style={{ flex:1,fontSize:11 }} onClick={restartBot}>🔄</button>}
            {status.is_running  && <button className="btn btn-danger btn-sm" style={{ flex:1,fontSize:11 }} onClick={stopBot}>⏹</button>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-item${tab===n.id?" active":""}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ color:"#64748b",fontSize:12,padding:"4px 12px",marginBottom:8 }}>
            <div style={{ fontWeight:600,color:"#94a3b8" }}>{user.name}</div>
            <div style={{ marginTop:2 }}>{user.email}</div>
          </div>
          <button className="nav-item" onClick={() => { localStorage.clear(); navigate("/login"); }}>
            <span className="nav-icon">🚪</span> Log Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div>
            <div style={{ fontWeight:700,fontSize:16 }}>{NAV[tab]?.icon} {NAV[tab]?.label}</div>
            <div style={{ fontSize:12,color:"#94a3b8" }}>Urus bot WhatsApp AI anda</div>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <span className={`badge ${statusBadge}`}><StatusDot status={status.status} />{statusLabel}</span>
          </div>
        </div>

        <div className="page fade-in">

          {/* ── Tab 0: Connection ── */}
          {tab===0 && (
            <div style={{ maxWidth:600,margin:"0 auto" }}>
              {status.status==="connected" && (
                <div className="card" style={{ textAlign:"center",padding:48 }}>
                  <div style={{ width:80,height:80,borderRadius:20,background:"linear-gradient(135deg,#25d366,#128c5e)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:16,boxShadow:"0 8px 24px rgba(37,211,102,.3)" }}>✅</div>
                  <h2 style={{ fontWeight:800,fontSize:22,marginBottom:8 }}>WhatsApp Bersambung!</h2>
                  <p style={{ color:"#64748b",marginBottom:4 }}>📱 +{status.phone_number}</p>
                  <p style={{ color:"#94a3b8",fontSize:13 }}>Bot anda aktif dan menjawab mesej pelanggan secara automatik.</p>
                  <div style={{ display:"flex",gap:10,justifyContent:"center",marginTop:24 }}>
                    <button className="btn btn-secondary" onClick={restartBot}>🔄 Restart Bot</button>
                    <button className="btn btn-danger" onClick={stopBot}>⏹ Hentikan</button>
                  </div>
                </div>
              )}

              {status.status==="qr_pending" && status.qr_code && (
                <div className="card" style={{ textAlign:"center" }}>
                  <h2 style={{ fontWeight:800,fontSize:20,marginBottom:6 }}>Imbas Kod QR</h2>
                  <p style={{ color:"#64748b",fontSize:14,marginBottom:24 }}>
                    Buka WhatsApp → <b>Peranti Terpaut</b> → <b>Tautkan Peranti</b>
                  </p>
                  <div style={{ display:"inline-block",padding:12,background:"#fff",borderRadius:16,border:"2px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
                    <img src={status.qr_code} alt="QR" style={{ width:220,height:220,display:"block" }} />
                  </div>
                  <p style={{ marginTop:16,fontSize:12,color:"#94a3b8" }}>⏱ QR tamat dalam ~60 saat. Ia akan refresh automatik.</p>
                </div>
              )}

              {(status.status==="starting") && (
                <div className="card" style={{ textAlign:"center",padding:48 }}>
                  <div style={{ width:60,height:60,borderRadius:16,background:"#f0fdf4",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
                    <span className="spinner spinner-dark" style={{ width:28,height:28 }} />
                  </div>
                  <h2 style={{ fontWeight:700,fontSize:18,marginBottom:8 }}>Sedang Memulakan...</h2>
                  <p style={{ color:"#94a3b8",fontSize:13 }}>Kod QR akan muncul sebentar lagi. Sila tunggu.</p>
                </div>
              )}

              {(status.status==="disconnected"||status.status==="auth_failed") && !status.is_running && (
                <div className="card" style={{ textAlign:"center",padding:48 }}>
                  <div style={{ fontSize:60,marginBottom:16 }}>📵</div>
                  <h2 style={{ fontWeight:800,fontSize:20,marginBottom:8 }}>Bot Belum Aktif</h2>
                  <p style={{ color:"#94a3b8",fontSize:14,marginBottom:28 }}>
                    Klik butang di bawah untuk menghidupkan bot dan dapatkan kod QR untuk imbas.
                  </p>
                  <button className="btn btn-primary" style={{ padding:"12px 28px",fontSize:15 }} onClick={startBot}>
                    ▶ Hidupkan Bot
                  </button>
                </div>
              )}

              {/* Steps guide */}
              {status.status!=="connected" && (
                <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    ["1️⃣","Hidupkan Bot","Klik butang Hidupkan Bot di atas"],
                    ["2️⃣","Imbas QR","Kod QR akan muncul — imbas dengan WhatsApp anda"],
                    ["3️⃣","Bot Aktif!","Bot mula menjawab mesej pelanggan secara automatik"],
                  ].map(([num,title,desc],i)=>(
                    <div key={i} className="card" style={{ display:"flex",gap:14,alignItems:"center",padding:16 }}>
                      <span style={{ fontSize:24 }}>{num}</span>
                      <div>
                        <div style={{ fontWeight:700,fontSize:14 }}>{title}</div>
                        <div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 1: Bot Settings ── */}
          {tab===1 && config && (
            <div style={{ maxWidth:600,margin:"0 auto", display:"flex",flexDirection:"column",gap:16 }}>
              <div className="card">
                <div className="section-title">⚙️ Tetapan Am</div>
                <div className="section-sub">Konfigurasi asas bot anda</div>
                <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                  <div>
                    <label>Nama Bot</label>
                    <input className="input" value={config.bot_name} onChange={e=>setConfig({...config,bot_name:e.target.value})} placeholder="Contoh: AI Assistant Kedai Saya" />
                    <p style={{ fontSize:11,color:"#94a3b8",marginTop:5 }}>Nama ini digunakan dalam sistem prompt bot.</p>
                  </div>
                  <div>
                    <label>Nombor Dibenarkan</label>
                    <input className="input" value={config.allowed_numbers} onChange={e=>setConfig({...config,allowed_numbers:e.target.value})} placeholder="60123456789,60198765432 (kosong = semua)" />
                    <p style={{ fontSize:11,color:"#94a3b8",marginTop:5 }}>Pisahkan dengan koma. Kod negara tanpa +. Kosongkan untuk benarkan semua nombor.</p>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0" }}>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>Abaikan Mesej Kumpulan</div>
                      <div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>Bot tidak akan balas mesej dalam group WhatsApp</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={!!config.ignore_groups} onChange={e=>setConfig({...config,ignore_groups:e.target.checked})} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ alignSelf:"flex-start",padding:"11px 24px" }}>
                {saving ? <><span className="spinner" style={{ width:15,height:15 }}/> Menyimpan...</> : "💾 Simpan Tetapan"}
              </button>
            </div>
          )}

          {/* ── Tab 2: Knowledge ── */}
          {tab===2 && config && (
            <div style={{ maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:16 }}>
              <div className="card">
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
                  <div>
                    <div className="section-title">📚 Pangkalan Pengetahuan</div>
                    <div className="section-sub">Bot menjawab berdasarkan maklumat yang anda masukkan di sini</div>
                  </div>
                  <div style={{ fontSize:12,color:"#94a3b8",background:"#f1f5f9",padding:"4px 10px",borderRadius:99 }}>
                    {(config.knowledge||"").length.toLocaleString()} aksara
                  </div>
                </div>
                <textarea className="input" style={{ minHeight:380 }}
                  placeholder={"TENTANG PERNIAGAAN\n===================\nNama: Kedai Saya\nWebsite: www.example.com\n\nPRODUK\n=======\n1. Produk A — RM50\n2. Produk B — RM100\n\nSOALAN LAZIM\n============\nS: Macam mana nak beli?\nJ: Pergi ke website kami..."}
                  value={config.knowledge}
                  onChange={e=>setConfig({...config,knowledge:e.target.value})} />
                <div style={{ display:"flex",gap:10,marginTop:14,flexWrap:"wrap" }}>
                  <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
                    {saving ? <><span className="spinner" style={{ width:15,height:15 }}/> Menyimpan...</> : "💾 Simpan"}
                  </button>
                  <label className="btn btn-outline" style={{ cursor:"pointer" }}>
                    📁 Upload .txt
                    <input type="file" accept=".txt" style={{ display:"none" }}
                      onChange={async e=>{
                        if(!e.target.files[0]) return;
                        try {
                          const r = await uploadFile("/config/upload-knowledge","knowledge",e.target.files[0]);
                          await fetchConfig();
                          showToast(`✅ ${r.characters.toLocaleString()} aksara dimuatkan!`);
                        } catch(err) { showToast(err.message,"error"); }
                      }} />
                  </label>
                  {config.knowledge && (
                    <button className="btn btn-ghost" onClick={()=>{ setConfig({...config,knowledge:""}); }}>🗑 Kosongkan</button>
                  )}
                </div>
              </div>
              <div className="card" style={{ background:"#f0fdf4",border:"1px solid #bbf7d0" }}>
                <div style={{ fontWeight:700,fontSize:13,color:"#15803d",marginBottom:8 }}>💡 Tips untuk knowledge base yang bagus</div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {["Masukkan info produk, harga dan cara beli","Tambah soalan lazim (FAQ) dan jawapannya","Sertakan waktu operasi, polisi pulangan, cara hubungi","Guna bahasa yang sama dengan pelanggan anda"].map((t,i)=>(
                    <div key={i} style={{ fontSize:12,color:"#166534",display:"flex",gap:8 }}><span>✓</span>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 3: Payment QR ── */}
          {tab===3 && config && (
            <div style={{ maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",gap:16 }}>
              <div className="card">
                <div className="section-title">💳 QR Pembayaran</div>
                <div className="section-sub">Bot akan hantar QR ini apabila pelanggan bertanya tentang bayaran</div>

                {config.has_payment_qr ? (
                  /* ── QR exists: show image preview ── */
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}>
                      <div style={{ position:"relative",display:"inline-block" }}>
                        <img
                          key={qrTimestamp}
                          src={`/api/config/payment-qr-image?t=${qrTimestamp}`}
                          alt="Payment QR"
                          style={{ width:220,height:220,objectFit:"contain",borderRadius:16,border:"2px solid #e2e8f0",padding:10,background:"#fff",boxShadow:"0 4px 20px rgba(0,0,0,.08)",display:"block" }}
                        />
                        <div style={{ position:"absolute",top:8,right:8,background:"#22c55e",borderRadius:99,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,boxShadow:"0 2px 6px rgba(0,0,0,.2)" }}>✓</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"center",marginBottom:12 }}>
                      <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>QR Pembayaran Aktif</div>
                      <div style={{ fontSize:12,color:"#94a3b8" }}>Bot akan hantar imej ini kepada pelanggan yang bertanya tentang bayaran</div>
                    </div>
                    <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
                      <label className="btn btn-outline" style={{ cursor:"pointer" }}>
                        🔄 Ganti QR
                        <input type="file" accept="image/*" style={{ display:"none" }}
                          onChange={async e=>{
                            if(!e.target.files[0]) return;
                            try {
                              await uploadFile("/config/upload-qr","paymentQr",e.target.files[0]);
                              setQrTimestamp(Date.now());
                              await fetchConfig();
                              showToast("QR Pembayaran berjaya diganti!");
                            } catch(err) { showToast(err.message,"error"); }
                          }} />
                      </label>
                    </div>
                  </div>
                ) : (
                  /* ── No QR yet ── */
                  <div style={{ border:"2px dashed #e2e8f0",borderRadius:14,padding:36,textAlign:"center",background:"#f8fafc",marginBottom:20 }}>
                    <div style={{ width:64,height:64,borderRadius:14,background:"#f1f5f9",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:12 }}>📷</div>
                    <div style={{ fontWeight:600,fontSize:15,color:"#475569",marginBottom:6 }}>Belum ada QR Pembayaran</div>
                    <div style={{ fontSize:13,color:"#94a3b8",marginBottom:20 }}>Upload imej QR DuitNow, TNG, atau mana-mana eWallet anda</div>
                    <label className="btn btn-primary" style={{ cursor:"pointer" }}>
                      📤 Upload QR Sekarang
                      <input type="file" accept="image/*" style={{ display:"none" }}
                        onChange={async e=>{
                          if(!e.target.files[0]) return;
                          try {
                            await uploadFile("/config/upload-qr","paymentQr",e.target.files[0]);
                            setQrTimestamp(Date.now());
                            await fetchConfig();
                            showToast("QR Pembayaran berjaya dimuat naik!");
                          } catch(err) { showToast(err.message,"error"); }
                        }} />
                    </label>
                  </div>
                )}

                <div style={{ marginBottom:16 }}>
                  <label>Teks Kapsyen QR</label>
                  <textarea className="input" style={{ minHeight:100,fontFamily:"inherit" }} value={config.payment_caption} onChange={e=>setConfig({...config,payment_caption:e.target.value})} />
                </div>

                <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ alignSelf:"flex-start" }}>
                  {saving ? <><span className="spinner" style={{ width:15,height:15 }}/> Menyimpan...</> : "💾 Simpan Kapsyen"}
                </button>
              </div>

              <div className="card" style={{ background:"#eff6ff",border:"1px solid #bfdbfe" }}>
                <div style={{ fontWeight:700,fontSize:13,color:"#1d4ed8",marginBottom:8 }}>🔑 Kata kunci yang mencetuskan QR secara automatik:</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {["bayar","bayaran","qr","duitnow","tng","ewallet","maybank","cimb","transfer","nak beli","cara bayar","payment","pay"].map(k=>(
                    <span key={k} className="badge badge-blue" style={{ fontSize:11 }}>{k}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 4: Logs ── */}
          {tab===4 && (
            <div style={{ maxWidth:760,margin:"0 auto" }}>
              {/* Header */}
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10 }}>
                <div>
                  <div className="section-title">📋 Log Mesej</div>
                  <div className="section-sub">
                    {logs.length} perbualan
                    {selectedLogs.size>0 && <span style={{ color:"#3b82f6",fontWeight:600 }}> · {selectedLogs.size} dipilih</span>}
                  </div>
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  {selectedLogs.size>0 && (
                    <button className="btn btn-danger btn-sm" onClick={deleteSelectedLogs}>
                      🗑 Padam ({selectedLogs.size})
                    </button>
                  )}
                  {logs.length>0 && (
                    <button className="btn btn-secondary btn-sm" onClick={clearAllLogs} style={{ color:"#dc2626" }}>
                      🗑 Clear All
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>🔄 Refresh</button>
                </div>
              </div>

              {logs.length===0 ? (
                <div className="card">
                  <div className="empty">
                    <div className="empty-icon">💬</div>
                    <div className="empty-title">Tiada log lagi</div>
                    <div className="empty-desc">Mesej akan muncul di sini setelah bot bersambung dan menerima mesej.</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Select all bar */}
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"#f8fafc",borderRadius:10,marginBottom:12,border:"1px solid #e2e8f0" }}>
                    <input type="checkbox"
                      checked={selectedLogs.size===logs.length && logs.length>0}
                      onChange={toggleAllLogs}
                      style={{ width:16,height:16,cursor:"pointer",accentColor:"#25d366" }}
                    />
                    <span style={{ fontSize:13,color:"#64748b",fontWeight:500 }}>
                      {selectedLogs.size===logs.length && logs.length>0 ? "Nyahpilih semua" : "Pilih semua"}
                    </span>
                    {selectedLogs.size>0 && (
                      <span style={{ marginLeft:"auto",fontSize:12,color:"#3b82f6",fontWeight:600 }}>
                        {selectedLogs.size} / {logs.length} dipilih
                      </span>
                    )}
                  </div>

                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {logs.map(log=>(
                      <div key={log.id} className="card"
                        style={{ padding:16, cursor:"pointer", border: selectedLogs.has(log.id) ? "2px solid #25d366" : "1px solid #e2e8f0", background: selectedLogs.has(log.id) ? "#f0fdf4" : "#fff", transition:"all .15s" }}
                        onClick={()=>toggleLog(log.id)}
                      >
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"center" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                            <input type="checkbox"
                              checked={selectedLogs.has(log.id)}
                              onChange={()=>toggleLog(log.id)}
                              onClick={e=>e.stopPropagation()}
                              style={{ width:16,height:16,cursor:"pointer",accentColor:"#25d366",flexShrink:0 }}
                            />
                            <div style={{ width:32,height:32,borderRadius:8,background:selectedLogs.has(log.id)?"#dcfce7":"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>📱</div>
                            <span style={{ fontWeight:700,fontSize:13 }}>+{log.sender}</span>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <span style={{ fontSize:11,color:"#94a3b8" }}>{new Date(log.created_at).toLocaleString("ms-MY")}</span>
                            <button
                              className="btn btn-ghost btn-icon"
                              style={{ padding:"4px 8px",fontSize:14,color:"#ef4444" }}
                              onClick={async e=>{ e.stopPropagation(); await api("DELETE","/config/logs",{ids:[log.id]}); await fetchLogs(); showToast("Log dipadam"); }}
                              title="Padam log ini"
                            >🗑</button>
                          </div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          <div>
                            <div style={{ fontSize:10,fontWeight:600,color:"#3b82f6",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em" }}>👤 Pelanggan</div>
                            <div className="bubble-user">{log.message}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:10,fontWeight:600,color:"#16a34a",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em" }}>🤖 Bot</div>
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
    </div>
  );
}
