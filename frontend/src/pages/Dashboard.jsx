import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadFile } from "../lib/api.js";

const NAV = [
  { icon:"🔌", label:"Sambung",    id:0 },
  { icon:"⚙️", label:"Tetapan",   id:1 },
  { icon:"📚", label:"Knowledge",  id:2 },
  { icon:"💳", label:"QR",         id:3 },
  { icon:"📋", label:"Log",        id:4 },
];

function Toast({ text, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return ()=>clearTimeout(t); }, []);
  return (
    <div className={`toast${type==="error"?" toast-error":""}`}>
      <span>{type==="success"?"✅":"❌"}</span>
      <span style={{ flex:1 }}>{text}</span>
      <button onClick={onDone} style={{ background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18,padding:"0 0 0 8px" }}>✕</button>
    </div>
  );
}

function StatusDot({ status }) {
  const map = { connected:"green", qr_pending:"yellow", starting:"yellow", disconnected:"gray", auth_failed:"red" };
  return <span className={`pulse-dot ${map[status]||"gray"}`} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab]                   = useState(0);
  const [status, setStatus]             = useState({ status:"disconnected", is_running:false });
  const [config, setConfig]             = useState(null);
  const [logs, setLogs]                 = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [qrTs, setQrTs]                 = useState(Date.now());
  const [toast, setToast]               = useState(null);
  const [saving, setSaving]             = useState(false);
  const pollRef = useRef(null);

  const showToast = (text, type="success") => setToast({ text, type });

  async function fetchStatus() { try { setStatus(await api("GET","/bot/status")); } catch {} }
  async function fetchConfig() { try { setConfig(await api("GET","/config")); } catch {} }
  async function fetchLogs()   { try { setLogs(await api("GET","/config/logs")); } catch {} }

  useEffect(() => {
    fetchStatus(); fetchConfig();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, []);
  useEffect(() => { if (tab===4) fetchLogs(); }, [tab]);

  const startBot   = async () => { await api("POST","/bot/start");   showToast("Bot sedang dihidupkan..."); };
  const stopBot    = async () => { await api("POST","/bot/stop");    showToast("Bot dihentikan","error"); };
  const restartBot = async () => { await api("POST","/bot/restart"); showToast("Bot sedang dimulakan semula..."); };

  async function saveConfig() {
    setSaving(true);
    try { await api("PUT","/config",config); showToast("Tetapan disimpan! ✅"); }
    catch(e) { showToast(e.message,"error"); }
    setSaving(false);
  }

  async function deleteSelectedLogs() {
    if (!selectedLogs.size) return;
    if (!confirm(`Padam ${selectedLogs.size} log?`)) return;
    await api("DELETE","/config/logs",{ ids:[...selectedLogs] });
    setSelectedLogs(new Set()); await fetchLogs();
    showToast("Log dipadam");
  }
  async function clearAllLogs() {
    if (!confirm("Padam SEMUA log?")) return;
    const r = await api("DELETE","/config/logs/all");
    setSelectedLogs(new Set()); await fetchLogs();
    showToast(`${r.deleted} log dipadam`);
  }
  const toggleLog = (id) => setSelectedLogs(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSelectedLogs(selectedLogs.size===logs.length ? new Set() : new Set(logs.map(l=>l.id)));

  const statusLabel = { connected:"Bersambung", qr_pending:"Imbas QR", starting:"Sedang mula...", disconnected:"Terputus", auth_failed:"Auth Gagal" }[status.status] || "Terputus";
  const statusBadge = { connected:"badge-green", qr_pending:"badge-yellow", starting:"badge-yellow", disconnected:"badge-gray", auth_failed:"badge-red" }[status.status] || "badge-gray";

  const tabLabel = ["Sambungan","Tetapan Bot","Pengetahuan","QR Bayaran","Log Mesej"][tab];

  return (
    <div className="layout">
      {toast && <Toast {...toast} onDone={()=>setToast(null)} />}

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🤖</div>
          <div>
            <div style={{ color:"#f1f5f9",fontWeight:700,fontSize:14 }}>WA AI Bot</div>
            <div style={{ color:"#64748b",fontSize:11 }}>Dashboard</div>
          </div>
        </div>

        {/* Status pill */}
        <div style={{ margin:"10px 8px",background:"rgba(255,255,255,.05)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
            <StatusDot status={status.status} />
            <span className={`badge ${statusBadge}`} style={{ fontSize:11 }}>{statusLabel}</span>
          </div>
          {status.phone_number && <div style={{ fontSize:11,color:"#64748b",marginBottom:8 }}>📱 +{status.phone_number}</div>}
          <div style={{ display:"flex",gap:6 }}>
            {!status.is_running && <button className="btn btn-primary btn-sm" style={{ flex:1,fontSize:11 }} onClick={startBot}>▶ Hidupkan</button>}
            {status.is_running  && <button className="btn btn-secondary btn-sm" style={{ flex:1,fontSize:11 }} onClick={restartBot}>🔄</button>}
            {status.is_running  && <button className="btn btn-danger btn-sm" style={{ flex:1,fontSize:11 }} onClick={stopBot}>⏹</button>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{["Sambungan","Tetapan Bot","Pengetahuan","QR Bayaran","Log Mesej"][n.id]}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ color:"#64748b",fontSize:12,padding:"4px 12px",marginBottom:6 }}>
            <div style={{ fontWeight:600,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.name}</div>
          </div>
          <button className="nav-item" onClick={async()=>{ try{await api("POST","/auth/logout");}catch{} localStorage.clear(); navigate("/login"); }}>
            <span className="nav-icon">🚪</span> Log Keluar
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{NAV[tab]?.icon} {tabLabel}</div>
            <div style={{ fontSize:11,color:"#94a3b8",marginTop:1 }}>WhatsApp AI Bot</div>
          </div>
          <div style={{ display:"flex",gap:6,alignItems:"center",flexShrink:0 }}>
            <span className={`badge ${statusBadge}`} style={{ fontSize:10,flexShrink:0 }}>
              <StatusDot status={status.status} />{statusLabel}
            </span>
            {!status.is_running && <button className="btn btn-primary btn-sm" style={{ fontSize:11,padding:"5px 10px",flexShrink:0 }} onClick={startBot}>▶</button>}
            {status.is_running  && <button className="btn btn-secondary btn-sm" style={{ fontSize:11,padding:"5px 10px",flexShrink:0 }} onClick={restartBot}>🔄</button>}
            {status.is_running  && <button className="btn btn-danger btn-sm" style={{ fontSize:11,padding:"5px 10px",flexShrink:0 }} onClick={stopBot}>⏹</button>}
          </div>
        </div>

        {/* Page content */}
        <div className="page fade-in">

          {/* ── Tab 0: Connection ── */}
          {tab===0 && (
            <div style={{ maxWidth:520,margin:"0 auto" }}>
              {status.status==="connected" && (
                <div className="card" style={{ textAlign:"center",padding:"36px 20px" }}>
                  <div style={{ width:72,height:72,borderRadius:18,background:"linear-gradient(135deg,#25d366,#128c5e)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:14,boxShadow:"0 8px 24px rgba(37,211,102,.3)" }}>✅</div>
                  <h2 style={{ fontWeight:800,fontSize:20,marginBottom:6 }}>WhatsApp Bersambung!</h2>
                  <p style={{ color:"#64748b",fontSize:14,marginBottom:4 }}>📱 +{status.phone_number}</p>
                  <p style={{ color:"#94a3b8",fontSize:13,marginBottom:24 }}>Bot aktif & menjawab mesej secara automatik</p>
                  <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
                    <button className="btn btn-secondary" onClick={restartBot}>🔄 Restart</button>
                    <button className="btn btn-danger" onClick={stopBot}>⏹ Hentikan</button>
                  </div>
                </div>
              )}

              {status.status==="qr_pending" && status.qr_code && (
                <div className="card" style={{ textAlign:"center" }}>
                  <h2 style={{ fontWeight:800,fontSize:18,marginBottom:6 }}>Imbas Kod QR</h2>
                  <p style={{ color:"#64748b",fontSize:13,marginBottom:20 }}>
                    WhatsApp → <b>Peranti Terpaut</b> → <b>Tautkan Peranti</b>
                  </p>
                  <div style={{ display:"inline-block",padding:10,background:"#fff",borderRadius:14,border:"2px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
                    <img src={status.qr_code} alt="QR" style={{ width:200,height:200,display:"block" }} />
                  </div>
                  <p style={{ marginTop:14,fontSize:12,color:"#94a3b8" }}>⏱ Tamat dalam ~60 saat</p>
                </div>
              )}

              {status.status==="starting" && (
                <div className="card" style={{ textAlign:"center",padding:"40px 20px" }}>
                  <span className="spinner spinner-dark" style={{ width:32,height:32,display:"inline-block",marginBottom:16 }} />
                  <h2 style={{ fontWeight:700,fontSize:17,marginBottom:8 }}>Sedang Memulakan...</h2>
                  <p style={{ color:"#94a3b8",fontSize:13 }}>Kod QR akan muncul sebentar lagi</p>
                </div>
              )}

              {(status.status==="disconnected"||status.status==="auth_failed") && !status.is_running && (
                <div className="card" style={{ textAlign:"center",padding:"40px 20px" }}>
                  <div style={{ fontSize:56,marginBottom:14 }}>📵</div>
                  <h2 style={{ fontWeight:800,fontSize:20,marginBottom:8 }}>Bot Belum Aktif</h2>
                  <p style={{ color:"#94a3b8",fontSize:14,marginBottom:24 }}>Klik butang di bawah untuk hidupkan bot</p>
                  <button className="btn btn-primary" style={{ padding:"13px 32px",fontSize:15 }} onClick={startBot}>▶ Hidupkan Bot</button>
                </div>
              )}

              {status.status!=="connected" && (
                <div style={{ marginTop:16,display:"flex",flexDirection:"column",gap:10 }}>
                  {[["1️⃣","Hidupkan Bot","Klik butang Hidupkan Bot"],["2️⃣","Imbas QR","Scan dengan WhatsApp anda"],["3️⃣","Bot Aktif!","Mula menjawab pelanggan 24/7"]].map(([e,t,d],i)=>(
                    <div key={i} className="card" style={{ display:"flex",gap:12,alignItems:"center",padding:14 }}>
                      <span style={{ fontSize:22,flexShrink:0 }}>{e}</span>
                      <div><div style={{ fontWeight:700,fontSize:13 }}>{t}</div><div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>{d}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 1: Settings ── */}
          {tab===1 && config && (
            <div style={{ maxWidth:560,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
              <div className="card">
                <div className="section-title">⚙️ Tetapan Bot</div>
                <div className="section-sub">Konfigurasi asas bot anda</div>
                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  <div>
                    <label>Nama Bot</label>
                    <input className="input" value={config.bot_name} onChange={e=>setConfig({...config,bot_name:e.target.value})} placeholder="Contoh: AI Assistant Kedai Saya" />
                  </div>
                  <div>
                    <label>Nombor Dibenarkan</label>
                    <input className="input" value={config.allowed_numbers} onChange={e=>setConfig({...config,allowed_numbers:e.target.value})} placeholder="60123456789,60198765432 (kosong = semua)" />
                    <p style={{ fontSize:11,color:"#94a3b8",marginTop:5 }}>Pisahkan dengan koma. Kod negara tanpa +</p>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0" }}>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>Abaikan Group</div>
                      <div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>Bot tak balas mesej dalam group</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={!!config.ignore_groups} onChange={e=>setConfig({...config,ignore_groups:e.target.checked})} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ width:"100%",padding:13 }}>
                {saving?<><span className="spinner" style={{ width:15,height:15 }}/> Menyimpan...</>:"💾 Simpan Tetapan"}
              </button>
            </div>
          )}

          {/* ── Tab 2: Knowledge ── */}
          {tab===2 && config && (
            <div style={{ maxWidth:720,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
              <div className="card">
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8 }}>
                  <div>
                    <div className="section-title">📚 Pangkalan Pengetahuan</div>
                    <div className="section-sub" style={{ marginBottom:0 }}>Bot menjawab berdasarkan info ini</div>
                  </div>
                  <span style={{ fontSize:11,color:"#94a3b8",background:"#f1f5f9",padding:"4px 10px",borderRadius:99,flexShrink:0 }}>
                    {(config.knowledge||"").length.toLocaleString()} aksara
                  </span>
                </div>
                <textarea className="input" style={{ minHeight:300 }}
                  placeholder={"TENTANG PERNIAGAAN\n===================\nNama: Kedai Saya\n\nPRODUK\n=======\n1. Produk A — RM50\n\nFAQ\n====\nS: Cara beli?\nJ: Pergi ke website..."}
                  value={config.knowledge}
                  onChange={e=>setConfig({...config,knowledge:e.target.value})} />
                <div style={{ display:"flex",gap:10,marginTop:12,flexWrap:"wrap" }}>
                  <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ flex:1,minWidth:120 }}>
                    {saving?<><span className="spinner" style={{ width:14,height:14 }}/> Menyimpan...</>:"💾 Simpan"}
                  </button>
                  <label className="btn btn-outline" style={{ cursor:"pointer",flex:1,minWidth:120 }}>
                    📁 Upload .txt
                    <input type="file" accept=".txt" style={{ display:"none" }}
                      onChange={async e=>{
                        if(!e.target.files[0]) return;
                        try { const r=await uploadFile("/config/upload-knowledge","knowledge",e.target.files[0]); await fetchConfig(); showToast(`${r.characters.toLocaleString()} aksara dimuatkan!`); }
                        catch(err) { showToast(err.message,"error"); }
                      }} />
                  </label>
                </div>
              </div>
              <div className="card" style={{ background:"#f0fdf4",border:"1px solid #bbf7d0" }}>
                <div style={{ fontWeight:700,fontSize:13,color:"#15803d",marginBottom:8 }}>💡 Tips</div>
                {["Masukkan info produk & harga","Tambah FAQ pelanggan","Sertakan waktu operasi & cara hubungi"].map((t,i)=>(
                  <div key={i} style={{ fontSize:12,color:"#166534",display:"flex",gap:6,marginBottom:4 }}><span>✓</span>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab 3: Payment QR ── */}
          {tab===3 && config && (
            <div style={{ maxWidth:520,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
              <div className="card">
                <div className="section-title">💳 QR Pembayaran</div>
                <div className="section-sub">Bot hantar QR ini apabila pelanggan tanya tentang bayaran</div>

                {config.has_payment_qr ? (
                  <div style={{ textAlign:"center",marginBottom:20 }}>
                    <div style={{ display:"inline-block",position:"relative" }}>
                      <img key={qrTs} src={`/api/config/payment-qr-image?t=${qrTs}`} alt="QR"
                        style={{ width:200,height:200,objectFit:"contain",borderRadius:14,border:"2px solid #e2e8f0",padding:8,background:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,.08)",display:"block" }} />
                      <div style={{ position:"absolute",top:6,right:6,background:"#22c55e",borderRadius:99,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>✓</div>
                    </div>
                    <div style={{ fontWeight:700,fontSize:14,marginTop:12,marginBottom:4 }}>QR Pembayaran Aktif</div>
                    <div style={{ fontSize:12,color:"#94a3b8",marginBottom:14 }}>Bot akan hantar imej ini secara automatik</div>
                    <label className="btn btn-outline" style={{ cursor:"pointer" }}>
                      🔄 Ganti QR
                      <input type="file" accept="image/*" style={{ display:"none" }}
                        onChange={async e=>{ if(!e.target.files[0]) return; await uploadFile("/config/upload-qr","paymentQr",e.target.files[0]); setQrTs(Date.now()); await fetchConfig(); showToast("QR berjaya diganti!"); }} />
                    </label>
                  </div>
                ) : (
                  <div style={{ border:"2px dashed #e2e8f0",borderRadius:14,padding:32,textAlign:"center",background:"#f8fafc",marginBottom:16 }}>
                    <div style={{ fontSize:48,marginBottom:10 }}>📷</div>
                    <div style={{ fontWeight:600,fontSize:14,color:"#475569",marginBottom:6 }}>Belum ada QR Pembayaran</div>
                    <div style={{ fontSize:13,color:"#94a3b8",marginBottom:18 }}>Upload imej QR DuitNow, TNG, atau eWallet anda</div>
                    <label className="btn btn-primary" style={{ cursor:"pointer" }}>
                      📤 Upload QR
                      <input type="file" accept="image/*" style={{ display:"none" }}
                        onChange={async e=>{ if(!e.target.files[0]) return; await uploadFile("/config/upload-qr","paymentQr",e.target.files[0]); setQrTs(Date.now()); await fetchConfig(); showToast("QR berjaya dimuat naik!"); }} />
                    </label>
                  </div>
                )}

                <div style={{ marginBottom:14 }}>
                  <label>Teks Kapsyen QR</label>
                  <textarea className="input" style={{ minHeight:90,fontFamily:"inherit",fontSize:14 }} value={config.payment_caption} onChange={e=>setConfig({...config,payment_caption:e.target.value})} />
                </div>
                <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ width:"100%",padding:13 }}>
                  {saving?<><span className="spinner" style={{ width:14,height:14 }}/> Menyimpan...</>:"💾 Simpan Kapsyen"}
                </button>
              </div>

              <div className="card" style={{ background:"#eff6ff",border:"1px solid #bfdbfe" }}>
                <div style={{ fontWeight:700,fontSize:12,color:"#1d4ed8",marginBottom:8 }}>🔑 Kata kunci pencetus QR:</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                  {["bayar","bayaran","qr","duitnow","tng","ewallet","maybank","cimb","transfer","payment","pay"].map(k=>(
                    <span key={k} className="badge badge-blue" style={{ fontSize:11 }}>{k}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 4: Logs ── */}
          {tab===4 && (
            <div style={{ maxWidth:720,margin:"0 auto" }}>
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                  <div className="section-title">📋 Log Mesej <span style={{ fontSize:13,fontWeight:400,color:"#94a3b8" }}>({logs.length}){selectedLogs.size>0&&<span style={{ color:"#3b82f6",fontWeight:600 }}> · {selectedLogs.size} dipilih</span>}</span></div>
                  <div className="btn-row">
                    {selectedLogs.size>0 && <button className="btn btn-danger btn-sm" onClick={deleteSelectedLogs}>🗑 ({selectedLogs.size})</button>}
                    {logs.length>0 && <button className="btn btn-secondary btn-sm" style={{ color:"#dc2626" }} onClick={clearAllLogs}>🗑 Clear</button>}
                    <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>🔄</button>
                  </div>
                </div>
              </div>

              {logs.length===0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">💬</div><div className="empty-title">Tiada log lagi</div><div className="empty-desc">Mesej akan muncul setelah bot aktif</div></div></div>
              ) : (
                <>
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginBottom:10,border:"1px solid #e2e8f0" }}>
                    <input type="checkbox" checked={selectedLogs.size===logs.length&&logs.length>0} onChange={toggleAll}
                      style={{ width:16,height:16,cursor:"pointer",accentColor:"#25d366" }} />
                    <span style={{ fontSize:13,color:"#64748b" }}>{selectedLogs.size===logs.length&&logs.length>0?"Nyahpilih semua":"Pilih semua"}</span>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {logs.map(log=>(
                      <div key={log.id} className="card" onClick={()=>toggleLog(log.id)}
                        style={{ padding:14,cursor:"pointer",border:selectedLogs.has(log.id)?"2px solid #25d366":"1px solid #e2e8f0",background:selectedLogs.has(log.id)?"#f0fdf4":"#fff",transition:"all .15s" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10,alignItems:"center",gap:8 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8,minWidth:0 }}>
                            <input type="checkbox" checked={selectedLogs.has(log.id)} onChange={()=>toggleLog(log.id)}
                              onClick={e=>e.stopPropagation()} style={{ width:15,height:15,accentColor:"#25d366",flexShrink:0 }} />
                            <span style={{ fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📱 +{log.sender}</span>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
                            <span style={{ fontSize:10,color:"#94a3b8" }}>{new Date(log.created_at).toLocaleString("ms-MY")}</span>
                            <button className="btn btn-ghost btn-icon" style={{ padding:"3px 7px",fontSize:13,color:"#ef4444" }}
                              onClick={async e=>{ e.stopPropagation(); await api("DELETE","/config/logs",{ids:[log.id]}); await fetchLogs(); showToast("Log dipadam"); }}>🗑</button>
                          </div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          <div><div style={{ fontSize:10,fontWeight:600,color:"#3b82f6",marginBottom:3,textTransform:"uppercase" }}>👤 Pelanggan</div><div className="bubble-user">{log.message}</div></div>
                          <div><div style={{ fontSize:10,fontWeight:600,color:"#16a34a",marginBottom:3,textTransform:"uppercase" }}>🤖 Bot</div><div className="bubble-bot">{log.reply}</div></div>
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

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="bottom-nav">
        {NAV.map(n => (
          <button key={n.id} className={`bottom-nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
