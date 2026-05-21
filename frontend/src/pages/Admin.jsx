import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, ScrollText, Database, ShieldCheck,
  LogOut, BarChart3, Bot, Wifi, WifiOff, RefreshCw, Trash2,
  PlusCircle, Eye, EyeOff, UserCheck, UserX, Square, ChevronRight,
  Mail, User as UserIcon, AlertCircle, Search, Filter, BookOpen, Upload,
  Shield, ToggleLeft, ToggleRight, Settings2, Clock, Ban, Repeat, Zap,
} from "lucide-react";
import { api } from "../lib/api.js";

const PLANS = ["basic","starter","pro"];
const PLAN_LABELS = { basic:"Basic", starter:"Starter", pro:"Pro" };

// Default limits (overridden by DB)
const PLAN_DEFAULTS = {
  basic:   { max_messages:50,   max_logs:5,  max_numbers:1 },
  starter: { max_messages:500,  max_logs:50, max_numbers:3 },
  pro:     { max_messages:1000, max_logs:100,max_numbers:5 },
};

// ── Shared ───────────────────────────────────────────────────────────────────
function Toast({ text, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  const cls = type==="error"?"toast-error":"toast-success";
  return (
    <div className={`toast ${cls}`}>
      <span>{type==="error"?"❌":"✅"}</span>
      <span style={{ flex:1 }}>{text}</span>
      <button onClick={onDone} style={{ background:"none",border:"none",cursor:"pointer",color:"#a1a1aa",fontSize:18 }}>✕</button>
    </div>
  );
}

function BotBadge({ status }) {
  if (status==="connected") return <span className="badge badge-green"><span className="status-dot green" style={{ width:6,height:6 }}><span className="status-dot-ping"/><span className="status-dot-inner"/></span> Online</span>;
  if (status==="qr_pending"||status==="starting") return <span className="badge badge-amber">⏳ {status==="starting"?"Starting":"QR"}</span>;
  return <span className="badge badge-gray">Offline</span>;
}

function PlanBadge({ plan }) {
  const map = { basic:"badge-gray", starter:"badge-amber", pro:"badge-green" };
  const labels = { basic:"Basic", starter:"Starter", pro:"Pro" };
  return <span className={`badge ${map[plan]||"badge-gray"}`}>{labels[plan]||plan}</span>;
}

// ── DB Viewer ─────────────────────────────────────────────────────────────────
function DbViewer({ showToast }) {
  const [users, setUsers]             = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [loginSessions, setLoginSessions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [dbTab, setDbTab]             = useState(0);
  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState({ name:"", email:"", password:"", plan:"basic", is_admin:false });
  const [adding, setAdding]           = useState(false);
  const [showPw, setShowPw]           = useState({});

  async function load() {
    setLoading(true);
    try {
      const [u,s,ls] = await Promise.all([
        api("GET","/admin/db/users"),
        api("GET","/admin/db/sessions"),
        api("GET","/admin/db/login-sessions"),
      ]);
      setUsers(u); setSessions(s); setLoginSessions(ls);
    } catch(e) { showToast("Error: "+e.message,"error"); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function verifyAll() {
    if (!confirm("Verify semua user yang belum verified?")) return;
    const r = await api("POST","/admin/db/verify-all-users");
    showToast(`${r.updated} user dah diverify`); load();
  }
  async function verifyUser(id,email) {
    await api("POST",`/admin/db/verify-user/${id}`);
    showToast(`${email} dah diverify`); load();
  }
  async function deleteUser(id,email) {
    if (!confirm(`Padam akaun ${email}?\n\nSemua data akan dipadam. TIDAK boleh dibatalkan!`)) return;
    try { await api("DELETE",`/admin/tenants/${id}`); showToast(`${email} dipadam`); load(); }
    catch(e) { showToast(e.message,"error"); }
  }
  async function deleteLoginSession(id) {
    await api("DELETE",`/admin/db/login-sessions/${id}`);
    showToast("Session dipadam"); load();
  }
  async function deleteAllLoginSessions(userId,email) {
    if (!confirm(`Force logout semua browser untuk ${email}?`)) return;
    await api("DELETE",`/admin/db/login-sessions/user/${userId}`);
    showToast(`Semua session ${email} dipadam`); load();
  }
  async function addUser(e) {
    e.preventDefault(); setAdding(true);
    try {
      await api("POST","/admin/db/add-user",addForm);
      showToast(`User ${addForm.email} berjaya ditambah!`);
      setShowAdd(false); setAddForm({ name:"", email:"", password:"", plan:"basic", is_admin:false });
      load();
    } catch(err) { showToast(err.message,"error"); }
    setAdding(false);
  }

  const DB_TABS = ["👥 Users","🤖 Bot Sessions","🔐 Login Sessions"];

  if (loading) return (
    <div className="card" style={{ padding:48,textAlign:"center" }}>
      <div className="spinner" style={{ margin:"0 auto" }} />
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      {/* Add User Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <div><div style={{ fontWeight:700,fontSize:16 }}>➕ Tambah User Baru</div></div>
              <button className="modal-close" onClick={()=>setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={addUser} style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div className="grid-2">
                  <div><label className="form-label">Nama</label><input className="input" placeholder="Nama" value={addForm.name} onChange={e=>setAddForm({...addForm,name:e.target.value})} required /></div>
                  <div><label className="form-label">Email</label><input className="input" type="email" placeholder="email@example.com" value={addForm.email} onChange={e=>setAddForm({...addForm,email:e.target.value})} required /></div>
                </div>
                <div className="grid-2">
                  <div><label className="form-label">Kata Laluan</label><input className="input" type="password" placeholder="Min 6 aksara" value={addForm.password} onChange={e=>setAddForm({...addForm,password:e.target.value})} minLength={6} required /></div>
                  <div><label className="form-label">Plan</label><select className="input" value={addForm.plan} onChange={e=>setAddForm({...addForm,plan:e.target.value})}>{PLANS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10,background:"var(--muted-bg)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--border)" }}>
                  <label className="switch" style={{ margin:0 }}>
                    <input type="checkbox" checked={addForm.is_admin} onChange={e=>setAddForm({...addForm,is_admin:e.target.checked})} />
                    <span className="switch-track" />
                  </label>
                  <div><div style={{ fontWeight:600,fontSize:13 }}>Admin Access</div><div style={{ fontSize:11.5,color:"var(--muted)" }}>Boleh akses admin panel</div></div>
                </div>
                <div style={{ display:"flex",gap:10 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={()=>setShowAdd(false)}>Batal</button>
                  <button type="submit" className="btn btn-default" style={{ flex:2 }} disabled={adding}>
                    {adding?<><span className="spinner spinner-white" style={{ width:14,height:14 }}/> Menambah...</>:<><PlusCircle size={14}/> Tambah User</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sub tabs + actions */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap" }}>
        <div className="sub-tabs">
          {DB_TABS.map((t,i)=>(
            <button key={i} onClick={()=>setDbTab(i)}
              className={`btn btn-sm ${dbTab===i?"btn-default":"btn-secondary"}`}>
              {t}
              <span style={{ background:dbTab===i?"rgba(255,255,255,.2)":"var(--border)",borderRadius:99,padding:"1px 7px",fontSize:10.5,marginLeft:4 }}>
                {i===0?users.length:i===1?sessions.length:loginSessions.length}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={load}><RefreshCw size={14}/></button>
          {dbTab===0 && <>
            <button className="btn btn-secondary btn-sm" onClick={verifyAll}><UserCheck size={14}/> Verify All</button>
            <button className="btn btn-default btn-sm" onClick={()=>setShowAdd(true)}><PlusCircle size={14}/> Tambah</button>
          </>}
        </div>
      </div>

      {/* Users */}
      {dbTab===0 && (
        <div className="table-wrap">
          <table>
            <thead><tr>{["ID","Email","Name","Password","Plan","Active","Role","Verified","Dibuat",""].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {users.length===0?<tr><td colSpan={10} style={{ padding:32,textAlign:"center",color:"var(--muted)" }}>Tiada user</td></tr>
              :users.map(u=>(
                <tr key={u.id}>
                  <td style={{ color:"var(--muted)",fontSize:12 }}>{u.id}</td>
                  <td style={{ maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500 }}>{u.email}</td>
                  <td style={{ whiteSpace:"nowrap" }}>{u.name}</td>
                  <td>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <code style={{ fontSize:10,color:"var(--muted)",maxWidth:showPw[u.id]?140:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {showPw[u.id]?u.password:u.password?.slice(0,10)+"..."}
                      </code>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ padding:3 }} onClick={()=>setShowPw(p=>({...p,[u.id]:!p[u.id]}))}>
                        {showPw[u.id]?<EyeOff size={12}/>:<Eye size={12}/>}
                      </button>
                    </div>
                  </td>
                  <td><PlanBadge plan={u.plan}/></td>
                  <td style={{ textAlign:"center" }}>{u.is_active?"✅":"❌"}</td>
                  <td>{u.is_admin?<span className="badge badge-purple">🛡️ Admin</span>:<span className="badge badge-gray">User</span>}</td>
                  <td>{u.is_verified?<span className="badge badge-green">✅</span>:<span className="badge badge-red">❌</span>}</td>
                  <td style={{ color:"var(--muted)",whiteSpace:"nowrap",fontSize:12 }}>{new Date(u.created_at).toLocaleDateString("ms-MY")}</td>
                  <td>
                    <div style={{ display:"flex",gap:4 }}>
                      {!u.is_verified&&<button className="btn btn-default btn-sm" style={{ fontSize:11,padding:"4px 8px" }} onClick={()=>verifyUser(u.id,u.email)}>Verify</button>}
                      {!u.is_admin&&<button className="btn btn-destructive btn-sm btn-icon" style={{ padding:"4px 7px" }} onClick={()=>deleteUser(u.id,u.email)}><Trash2 size={12}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bot Sessions */}
      {dbTab===1 && (
        <div className="table-wrap">
          <table>
            <thead><tr>{["User ID","Email","Status","Phone","Updated"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {sessions.length===0?<tr><td colSpan={5} style={{ padding:32,textAlign:"center",color:"var(--muted)" }}>Tiada session</td></tr>
              :sessions.map(s=>(
                <tr key={s.id}>
                  <td style={{ color:"var(--muted)",fontSize:12 }}>{s.user_id}</td>
                  <td>{s.email||"—"}</td>
                  <td><BotBadge status={s.status}/></td>
                  <td>{s.phone_number?`+${s.phone_number}`:"—"}</td>
                  <td style={{ color:"var(--muted)",fontSize:12,whiteSpace:"nowrap" }}>{new Date(s.updated_at).toLocaleString("ms-MY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Login Sessions */}
      {dbTab===2 && (
        <div>
          <div style={{ padding:"11px 14px",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.2)",borderRadius:"10px 10px 0 0",fontSize:13,color:"#1d4ed8",fontWeight:500 }}>
            🔐 Active browser sessions — padam untuk force logout
          </div>
          <div className="table-wrap" style={{ borderRadius:"0 0 10px 10px",borderTop:"none" }}>
            <table>
              <thead><tr>{["ID","User","Email","Browser","IP","Login","Last Active",""].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {loginSessions.length===0?<tr><td colSpan={8} style={{ padding:32,textAlign:"center",color:"var(--muted)" }}>Tiada active session</td></tr>
                :loginSessions.map(s=>(
                  <tr key={s.id}>
                    <td style={{ color:"var(--muted)",fontSize:12 }}>{s.id}</td>
                    <td style={{ fontWeight:600 }}>{s.name||"—"}</td>
                    <td style={{ maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.email||"—"}</td>
                    <td style={{ maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--muted)",fontSize:12 }}>{s.user_agent?.split(" ").slice(-2).join(" ")||"—"}</td>
                    <td style={{ color:"var(--muted)",fontSize:12 }}>{s.ip_address||"—"}</td>
                    <td style={{ color:"var(--muted)",fontSize:11,whiteSpace:"nowrap" }}>{new Date(s.created_at).toLocaleString("ms-MY")}</td>
                    <td style={{ color:"var(--muted)",fontSize:11,whiteSpace:"nowrap" }}>{new Date(s.last_active).toLocaleString("ms-MY")}</td>
                    <td>
                      <div style={{ display:"flex",gap:4 }}>
                        <button className="btn btn-destructive btn-sm" style={{ fontSize:11,padding:"4px 8px" }} onClick={()=>deleteLoginSession(s.id)}>Logout</button>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize:11,padding:"4px 8px" }} onClick={()=>deleteAllLoginSessions(s.user_id,s.email)}>All</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tenant Modal ───────────────────────────────────────────────────────────────
function TenantModal({ tenant, onClose, onSave, showToast }) {
  const [modalTab, setModalTab] = useState(0);
  const [form, setForm]   = useState({
    name:tenant.name,
    email:tenant.email,
    plan:tenant.plan||"basic",
    is_active:!!tenant.is_active,
    max_messages:tenant.max_messages || PLAN_DEFAULTS[tenant.plan||"basic"].max_messages,
    max_logs:tenant.max_logs || PLAN_DEFAULTS[tenant.plan||"basic"].max_logs,
    max_numbers:tenant.max_numbers || PLAN_DEFAULTS[tenant.plan||"basic"].max_numbers,
    notes:tenant.notes||""
  });
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs]   = useState([]);

  useEffect(() => {
    api("GET",`/admin/tenants/${tenant.id}/logs`).then(setLogs).catch(()=>{});
  }, [tenant.id]);

  async function save() {
    setSaving(true);
    try { await api("PUT",`/admin/tenants/${tenant.id}`,form); showToast("Perubahan disimpan!"); onSave(); }
    catch(e) { showToast(e.message,"error"); }
    setSaving(false);
  }
  async function resetPw() {
    if (!newPw||newPw.length<6) return showToast("Min 6 aksara","error");
    await api("POST",`/admin/tenants/${tenant.id}/reset-password`,{ password:newPw });
    showToast("Kata laluan ditukar!"); setNewPw("");
  }
  async function stopBot() {
    await api("POST",`/admin/tenants/${tenant.id}/stop-bot`);
    showToast("Bot dihentikan"); onSave();
  }
  async function toggleActive() {
    const endpoint = form.is_active ? "suspend" : "activate";
    await api("POST",`/admin/tenants/${tenant.id}/${endpoint}`);
    setForm(f=>({...f,is_active:!f.is_active}));
    showToast(form.is_active?"Akaun digantung":"Akaun diaktifkan",form.is_active?"error":"success");
    onSave();
  }
  async function deleteTenant() {
    if (!confirm(`Padam akaun ${tenant.email}? TIDAK boleh dibatalkan!`)) return;
    await api("DELETE",`/admin/tenants/${tenant.id}`);
    onClose(); onSave();
  }

  const MTABS = ["✏️ Edit","🔐 Keselamatan","📋 Log"];

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-header">
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{tenant.name}</div>
            <div style={{ fontSize:12,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{tenant.email}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="sub-tabs" style={{ marginBottom:16 }}>
            {MTABS.map((t,i)=>(
              <button key={i} className={`btn btn-sm ${modalTab===i?"btn-default":"btn-secondary"}`} onClick={()=>setModalTab(i)}>{t}</button>
            ))}
          </div>

          {modalTab===0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div className="grid-2">
                <div><label className="form-label">Nama</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div><label className="form-label">Email</label><input className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              </div>
              <div className="grid-2">
                <div><label className="form-label">Plan</label>
                  <select className="input" value={form.plan} onChange={e=>{
                    const p = e.target.value;
                    const defaults = PLAN_DEFAULTS[p];
                    setForm(f=>({ ...f, plan:p, max_messages:defaults.max_messages, max_logs:defaults.max_logs, max_numbers:defaults.max_numbers }));
                  }}>
                    {PLANS.map(p=><option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Status</label>
                  <div style={{ display:"flex",alignItems:"center",gap:10,background:"var(--muted-bg)",borderRadius:8,padding:"11px 13px",border:"1px solid var(--border)",height:42 }}>
                    <label className="switch" style={{ margin:0 }}>
                      <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} />
                      <span className="switch-track" />
                    </label>
                    <span style={{ fontSize:13,fontWeight:500 }}>{form.is_active?"Aktif":"Digantung"}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                <div>
                  <label className="form-label">💬 Had Mesej</label>
                  <input className="input" type="number" min="1" value={form.max_messages}
                    onChange={e=>setForm({...form,max_messages:parseInt(e.target.value)||1})} />
                </div>
                <div>
                  <label className="form-label">📋 Had Log</label>
                  <input className="input" type="number" min="1" value={form.max_logs}
                    onChange={e=>setForm({...form,max_logs:parseInt(e.target.value)||1})} />
                </div>
                <div>
                  <label className="form-label">📱 Had Nombor</label>
                  <input className="input" type="number" min="1" value={form.max_numbers}
                    onChange={e=>setForm({...form,max_numbers:parseInt(e.target.value)||1})} />
                </div>
              </div>
              <div><label className="form-label">Nota Admin</label><textarea className="input" style={{ minHeight:80,fontFamily:"inherit",fontSize:13 }} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Nota peribadi tentang tenant ini..." /></div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                <button className="btn btn-default" onClick={save} disabled={saving} style={{ flex:1 }}>
                  {saving?<><span className="spinner spinner-white" style={{ width:14,height:14 }}/> Simpan...</>:"💾 Simpan"}
                </button>
                {tenant.is_running && <button className="btn btn-secondary" onClick={stopBot}><Square size={13}/> Stop Bot</button>}
                <button className="btn btn-destructive" onClick={deleteTenant} style={{ marginLeft:"auto" }}><Trash2 size={13}/> Padam</button>
              </div>
            </div>
          )}

          {modalTab===1 && (
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div>
                <label className="form-label">Set Kata Laluan Baru</label>
                <input className="input" type="password" placeholder="Minimum 6 aksara" value={newPw} onChange={e=>setNewPw(e.target.value)} />
              </div>
              <button className="btn btn-default" onClick={resetPw} style={{ alignSelf:"flex-start" }}>🔐 Tukar Kata Laluan</button>
              <div style={{ height:1,background:"var(--border)" }} />
              <button className={`btn ${form.is_active?"btn-destructive":"btn-default"}`} onClick={toggleActive}>
                {form.is_active?<><UserX size={14}/> Gantung Akaun</>:<><UserCheck size={14}/> Aktifkan Semula</>}
              </button>
            </div>
          )}

          {modalTab===2 && (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {logs.length===0
                ?<p style={{ color:"var(--muted)",textAlign:"center",padding:24 }}>Tiada log lagi.</p>
                :logs.map(l=>(
                <div key={l.id} style={{ background:"var(--muted-bg)",borderRadius:10,padding:12,fontSize:13 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:4 }}>
                    <span style={{ fontWeight:600 }}>📱 +{l.sender}</span>
                    <span style={{ color:"var(--muted)",fontSize:11 }}>{new Date(l.created_at).toLocaleString("ms-MY")}</span>
                  </div>
                  <div className="bubble-user" style={{ marginBottom:6 }}>👤 {l.message}</div>
                  <div className="bubble-bot">🤖 {l.reply}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan Config Component ─────────────────────────────────────────────────────
function PlanConfig({ showToast }) {
  const [limits, setLimits]   = useState(null);
  const [saving, setSaving]   = useState({});
  const [syncing, setSyncing] = useState(false);
  const [local, setLocal]     = useState({});

  async function load() {
    try {
      const data = await api("GET","/admin/plan-limits");
      const map = {};
      data.forEach(p => { map[p.plan] = { max_messages:p.max_messages, max_logs:p.max_logs, max_numbers:p.max_numbers }; });
      setLimits(map);
      setLocal(JSON.parse(JSON.stringify(map)));
    } catch(e) { showToast(e.message,"error"); }
  }

  useEffect(() => { load(); }, []);

  async function save(plan) {
    setSaving(s=>({...s,[plan]:true}));
    try {
      const r = await api("PUT",`/admin/plan-limits/${plan}`, local[plan]);
      showToast(`✅ Had ${PLAN_LABELS[plan]} dikemaskini! ${r.users_updated} user terkesan.`);
      load();
    } catch(e) { showToast(e.message,"error"); }
    setSaving(s=>({...s,[plan]:false}));
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const r = await api("POST","/admin/plan-limits/sync-all");
      showToast(`✅ ${r.users_updated} user disync dengan had plan semasa!`);
    } catch(e) { showToast(e.message,"error"); }
    setSyncing(false);
  }

  if (!limits) return <div style={{ textAlign:"center",padding:48 }}><div className="spinner" style={{ margin:"0 auto" }} /></div>;

  const planColors = { basic:"#71717a", starter:"#f59e0b", pro:"#22c55e" };

  return (
    <div style={{ maxWidth:800, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>
      <div className="card" style={{ padding:"16px 20px", background:"rgba(34,197,94,.04)", borderColor:"rgba(34,197,94,.2)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ fontWeight:600, fontSize:13.5, color:"var(--green-dark)" }}>
            ℹ️ Perubahan had plan akan affect <strong>semua user</strong> dalam plan tersebut secara serta-merta.
          </div>
          <button className="btn btn-default btn-sm" onClick={syncAll} disabled={syncing}>
            {syncing
              ? <><span className="spinner spinner-white" style={{ width:13,height:13 }}/> Syncing...</>
              : <><RefreshCw size={13}/> Sync Semua User Sekarang</>
            }
          </button>
        </div>
      </div>

      {PLANS.map(plan => {
        const lims = local[plan] || PLAN_DEFAULTS[plan];
        const color = planColors[plan];
        return (
          <div key={plan} className="card" style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }} />
              <div style={{ fontWeight:700, fontSize:16 }}>{PLAN_LABELS[plan]}</div>
              <PlanBadge plan={plan} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:20 }}>
              <div>
                <label className="form-label">💬 Had Mesej / Bulan</label>
                <input className="input" type="number" min="1" max="999999"
                  value={lims.max_messages}
                  onChange={e=>setLocal(l=>({...l,[plan]:{...l[plan],max_messages:parseInt(e.target.value)||1}}))} />
                <p style={{ fontSize:11.5, color:"var(--muted)", marginTop:4 }}>Bot berhenti balas bila had dicapai</p>
              </div>
              <div>
                <label className="form-label">📋 Had Log Mesej</label>
                <input className="input" type="number" min="1" max="9999"
                  value={lims.max_logs}
                  onChange={e=>setLocal(l=>({...l,[plan]:{...l[plan],max_logs:parseInt(e.target.value)||1}}))} />
                <p style={{ fontSize:11.5, color:"var(--muted)", marginTop:4 }}>Jumlah log terkini boleh dilihat</p>
              </div>
              <div>
                <label className="form-label">📱 Had Nombor WhatsApp</label>
                <input className="input" type="number" min="1" max="99"
                  value={lims.max_numbers}
                  onChange={e=>setLocal(l=>({...l,[plan]:{...l[plan],max_numbers:parseInt(e.target.value)||1}}))} />
                <p style={{ fontSize:11.5, color:"var(--muted)", marginTop:4 }}>Nombor WA boleh disambung</p>
              </div>
            </div>
            <button className="btn btn-default btn-sm" onClick={()=>save(plan)} disabled={saving[plan]}>
              {saving[plan]?<><span className="spinner spinner-white" style={{ width:13,height:13 }}/> Menyimpan...</>:`💾 Simpan Had ${PLAN_LABELS[plan]}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Global Knowledge Base Component ──────────────────────────────────────────
function GlobalKnowledge({ showToast }) {
  const [list, setList]         = useState([]);
  const [selected, setSelected] = useState(null); // knowledge item being managed
  const [view, setView]         = useState("list"); // list | create | assign
  const [form, setForm]         = useState({ name:"", description:"", content:"", file_name:"" });
  const [assignments, setAssignments] = useState({ assigned:[], all:[] });
  const [saving, setSaving]     = useState(false);
  const [extracting, setExtracting] = useState(false);

  async function load() {
    try { setList(await api("GET","/admin/global-knowledge")); } catch(e) { showToast(e.message,"error"); }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setExtracting(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/global-knowledge/upload", { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(f=>({ ...f, content:data.content, file_name:data.file_name, name:f.name||file.name.replace(/\.[^.]+$/,"") }));
      showToast(`✅ ${data.characters.toLocaleString()} aksara diekstrak`);
    } catch(e) { showToast(e.message,"error"); }
    setExtracting(false);
  }

  async function handleSave() {
    if (!form.name || !form.content) return showToast("Nama dan kandungan diperlukan","error");
    setSaving(true);
    try {
      if (selected?.id) {
        await api("PUT",`/admin/global-knowledge/${selected.id}`, form);
        showToast("✅ Knowledge dikemaskini");
      } else {
        await api("POST","/admin/global-knowledge", form);
        showToast("✅ Knowledge dicipta");
      }
      setView("list"); setForm({ name:"",description:"",content:"",file_name:"" }); setSelected(null);
      load();
    } catch(e) { showToast(e.message,"error"); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Padam knowledge ini? Semua assignment akan dibuang.")) return;
    try { await api("DELETE",`/admin/global-knowledge/${id}`); showToast("Dipadam"); load(); }
    catch(e) { showToast(e.message,"error"); }
  }

  async function openAssign(item) {
    setSelected(item);
    const data = await api("GET",`/admin/global-knowledge/${item.id}/assignments`);
    setAssignments(data);
    setView("assign");
  }

  async function bulkSave(userIds) {
    try {
      await api("POST",`/admin/global-knowledge/${selected.id}/bulk-assign`, { user_ids: userIds });
      showToast("✅ Assignment disimpan");
      openAssign(selected);
      load();
    } catch(e) { showToast(e.message,"error"); }
  }

  // ── List View ──────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div style={{ maxWidth:900,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontWeight:700,fontSize:16 }}>📚 Global Knowledge Base</div>
          <div style={{ fontSize:13,color:"var(--muted)" }}>Upload knowledge untuk dikongsi dengan tenant terpilih</div>
        </div>
        <button className="btn btn-default" onClick={()=>{ setForm({ name:"",description:"",content:"",file_name:"" }); setSelected(null); setView("create"); }}>
          + Tambah Knowledge
        </button>
      </div>
      {list.length === 0 && (
        <div className="card" style={{ padding:48,textAlign:"center" }}>
          <BookOpen size={48} style={{ margin:"0 auto 12px",color:"#d4d4d8" }}/>
          <div style={{ fontWeight:600,marginBottom:8 }}>Belum ada Global Knowledge</div>
          <p style={{ fontSize:13,color:"var(--muted)",marginBottom:20 }}>Upload price table, FAQ, atau katalog untuk dikongsi dengan tenant</p>
          <button className="btn btn-default" onClick={()=>{ setForm({ name:"",description:"",content:"",file_name:"" }); setView("create"); }}>
            + Upload Pertama
          </button>
        </div>
      )}
      {list.map(item => (
        <div key={item.id} className="card" style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
            <div style={{ width:42,height:42,borderRadius:10,background:"var(--green-bg)",border:"1px solid var(--green-border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20 }}>📄</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:700,fontSize:14,marginBottom:3 }}>{item.name}</div>
              {item.description && <div style={{ fontSize:12,color:"var(--muted)",marginBottom:4 }}>{item.description}</div>}
              <div style={{ display:"flex",gap:12,fontSize:12,color:"var(--muted)",flexWrap:"wrap" }}>
                <span>📝 {item.content.length.toLocaleString()} aksara</span>
                {item.file_name && <span>📎 {item.file_name}</span>}
                <span>👥 {item.assigned_count} tenant</span>
                <span>🕐 {new Date(item.created_at).toLocaleDateString("ms-MY")}</span>
              </div>
            </div>
            <div style={{ display:"flex",gap:8,flexShrink:0 }}>
              <button className="btn btn-secondary btn-sm" onClick={()=>openAssign(item)}>
                👥 Assign ({item.assigned_count})
              </button>
              <button className="btn btn-outline btn-sm" onClick={()=>{ setSelected(item); setForm({ name:item.name,description:item.description,content:item.content,file_name:item.file_name }); setView("create"); }}>
                Edit
              </button>
              <button className="btn btn-destructive btn-sm" onClick={()=>handleDelete(item.id)}>
                <Trash2 size={13}/>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Create/Edit View ───────────────────────────────────────────────────────
  if (view === "create") return (
    <div style={{ maxWidth:800,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <button className="btn btn-ghost btn-sm" onClick={()=>{ setView("list"); setSelected(null); }}>← Kembali</button>
        <div style={{ fontWeight:700,fontSize:16 }}>{selected?.id ? "Edit Knowledge" : "Tambah Knowledge Baru"}</div>
      </div>
      <div className="card" style={{ padding:"20px 22px",display:"flex",flexDirection:"column",gap:14 }}>
        <div>
          <label className="form-label">Nama Knowledge *</label>
          <input className="input" placeholder="cth: Harga Trade-In 2024" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        </div>
        <div>
          <label className="form-label">Keterangan (optional)</label>
          <input className="input" placeholder="cth: Jadual anggaran harga trade-in kereta" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        </div>
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
            <label className="form-label" style={{ margin:0 }}>Kandungan Knowledge *</label>
            <label className="btn btn-outline btn-sm" style={{ cursor:extracting?"not-allowed":"pointer" }}>
              {extracting ? <><span className="spinner" style={{ width:13,height:13 }}/> Mengekstrak...</> : <><Upload size={13}/> Upload Fail</>}
              <input type="file" accept=".txt,.pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.csv" style={{ display:"none" }} disabled={extracting} onChange={handleUpload}/>
            </label>
          </div>
          <textarea className="input" style={{ minHeight:300,fontFamily:"'Courier New',monospace",fontSize:12.5 }}
            placeholder={"JADUAL HARGA TRADE-IN\n========================\n\nPROTON MYVI\n-----------\n2020 1.5 SE Auto: RM32,000 - RM35,000\n2019 1.5 SE Auto: RM28,000 - RM31,000\n2018 1.5 SE Auto: RM25,000 - RM28,000\n...\n\nNOTA: Harga tertakluk kepada pemeriksaan."}
            value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/>
          <div style={{ fontSize:11.5,color:"var(--muted)",marginTop:4 }}>
            {form.content.length.toLocaleString()} aksara · PDF, Excel, Word, JPG, TXT disokong
          </div>
        </div>
        <div className="btn-row">
          <button className="btn btn-default" onClick={handleSave} disabled={saving}>
            {saving?<><span className="spinner spinner-white" style={{ width:14,height:14 }}/> Menyimpan...</>:"💾 Simpan Knowledge"}
          </button>
          <button className="btn btn-ghost" onClick={()=>{ setView("list"); setSelected(null); }}>Batal</button>
        </div>
      </div>
    </div>
  );

  // ── Assign View ────────────────────────────────────────────────────────────
  if (view === "assign") {
    const assignedIds = new Set(assignments.assigned.map(u=>u.id));
    return (
      <div style={{ maxWidth:700,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setView("list")}>← Kembali</button>
          <div>
            <div style={{ fontWeight:700,fontSize:15 }}>Assign: {selected?.name}</div>
            <div style={{ fontSize:12,color:"var(--muted)" }}>Pilih tenant yang boleh guna knowledge ini</div>
          </div>
        </div>
        <div className="card" style={{ padding:"16px 20px" }}>
          {assignments.all.length === 0 ? (
            <div style={{ textAlign:"center",padding:24,color:"var(--muted)" }}>Tiada tenant aktif</div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {assignments.all.map(u => {
                const isAssigned = assignedIds.has(u.id);
                return (
                  <div key={u.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,border:`1.5px solid ${isAssigned?"var(--green)":"var(--border)"}`,background:isAssigned?"var(--green-bg)":"var(--surface)",transition:"all .15s" }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:600,fontSize:13 }}>{u.name}</div>
                      <div style={{ fontSize:12,color:"var(--muted)" }}>{u.email} · <span className={`badge badge-${u.plan==="pro"?"green":u.plan==="starter"?"amber":"gray"}`}>{u.plan}</span></div>
                    </div>
                    <button
                      className={isAssigned?"btn btn-destructive btn-sm":"btn btn-primary btn-sm"}
                      onClick={async()=>{
                        const newIds = isAssigned ? [...assignedIds].filter(id=>id!==u.id) : [...assignedIds,u.id];
                        await bulkSave(newIds);
                      }}>
                      {isAssigned ? "Unassign" : "Assign"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card" style={{ padding:"14px 18px",background:"var(--green-bg)",borderColor:"var(--green-border)" }}>
          <div style={{ fontSize:13,color:"var(--green-dark)" }}>
            ✅ <strong>{assignments.assigned.length}</strong> tenant di-assign · Knowledge ini akan disertakan dalam bot mereka secara automatik
          </div>
        </div>
      </div>
    );
  }
}

// ── Guardrails Component ──────────────────────────────────────────────────────
const RULE_ICONS = {
  rate_limit:         "⚡",
  prompt_injection:   "🛡️",
  profanity_filter:   "🚫",
  business_hours:     "🕐",
  message_length:     "📏",
  conversation_limit: "💬",
  repeat_detection:   "🔄",
  number_blacklist:   "🚷",
};

function GuardrailsManager({ showToast }) {
  const [rules, setRules]   = useState([]);
  const [editing, setEditing] = useState(null); // rule being edited
  const [saving, setSaving] = useState({});

  async function load() {
    try { setRules(await api("GET","/admin/guardrails")); }
    catch(e) { showToast(e.message,"error"); }
  }
  useEffect(() => { load(); }, []);

  async function toggleRule(rule) {
    setSaving(s=>({...s,[rule.key]:true}));
    try {
      await api("PUT",`/admin/guardrails/${rule.key}`, { is_enabled: !rule.is_enabled, config: rule.config });
      showToast(`${!rule.is_enabled?"✅ Diaktifkan":"⏸️ Dinyahaktifkan"}: ${rule.name}`);
      load();
    } catch(e) { showToast(e.message,"error"); }
    setSaving(s=>({...s,[rule.key]:false}));
  }

  async function saveConfig(rule, newConfig) {
    setSaving(s=>({...s,[rule.key]:true}));
    try {
      await api("PUT",`/admin/guardrails/${rule.key}`, { is_enabled: rule.is_enabled, config: newConfig });
      showToast(`✅ ${rule.name} dikemaskini`);
      setEditing(null); load();
    } catch(e) { showToast(e.message,"error"); }
    setSaving(s=>({...s,[rule.key]:false}));
  }

  return (
    <div style={{ maxWidth:800,margin:"0 auto",display:"flex",flexDirection:"column",gap:14 }}>
      <div className="card" style={{ padding:"14px 18px",background:"rgba(99,102,241,.04)",borderColor:"rgba(99,102,241,.2)" }}>
        <div style={{ fontWeight:600,fontSize:13.5,color:"#4338ca" }}>
          🛡️ Guardrails diaplikasi secara global kepada semua tenant. Admin sahaja boleh mengkonfigurasi.
        </div>
      </div>

      {rules.map(rule => (
        <div key={rule.key} className="card" style={{ padding:"18px 20px",border:`1.5px solid ${rule.is_enabled?"rgba(34,197,94,.3)":"var(--border)"}`,transition:"all .2s" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ fontSize:28,flexShrink:0 }}>{RULE_ICONS[rule.key]||"🔧"}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                <span style={{ fontWeight:700,fontSize:14 }}>{rule.name}</span>
                <span className={`badge ${rule.is_enabled?"badge-green":"badge-gray"}`}>
                  {rule.is_enabled?"Aktif":"Tidak Aktif"}
                </span>
              </div>
              <div style={{ fontSize:12.5,color:"var(--muted)" }}>{rule.description}</div>
              {/* Config summary */}
              <div style={{ fontSize:11.5,color:"var(--muted)",marginTop:4 }}>
                {rule.key==="rate_limit" && `Max ${rule.config.max_per_minute} mesej/minit`}
                {rule.key==="message_length" && `Max ${rule.config.max_chars} aksara`}
                {rule.key==="conversation_limit" && `Max ${rule.config.max_per_day} mesej/hari`}
                {rule.key==="repeat_detection" && `Sekat selepas ${rule.config.max_repeat}x ulangan`}
                {rule.key==="business_hours" && `${rule.config.start}–${rule.config.end}`}
                {rule.key==="number_blacklist" && `${(rule.config.numbers||[]).length} nombor disekat`}
                {rule.key==="profanity_filter" && `${(rule.config.words||[]).length} kata terlarang`}
                {rule.key==="prompt_injection" && `${(rule.config.patterns||[]).length} pattern dikesan`}
              </div>
            </div>
            <div style={{ display:"flex",gap:8,flexShrink:0 }}>
              <button className="btn btn-outline btn-sm" onClick={()=>setEditing(editing?.key===rule.key?null:rule)}>
                <Settings2 size={13}/> Config
              </button>
              <button
                className={`btn btn-sm ${rule.is_enabled?"btn-destructive":"btn-primary"}`}
                disabled={saving[rule.key]}
                onClick={()=>toggleRule(rule)}>
                {saving[rule.key]
                  ? <span className="spinner spinner-white" style={{ width:13,height:13 }}/>
                  : rule.is_enabled ? "Matikan" : "Aktifkan"
                }
              </button>
            </div>
          </div>

          {/* Inline config editor */}
          {editing?.key === rule.key && (
            <ConfigEditor rule={rule} onSave={saveConfig} onCancel={()=>setEditing(null)} saving={saving[rule.key]}/>
          )}
        </div>
      ))}
    </div>
  );
}

function ConfigEditor({ rule, onSave, onCancel, saving }) {
  const [cfg, setCfg] = useState({ ...rule.config });

  function updateCfg(key, val) { setCfg(c=>({...c,[key]:val})); }

  return (
    <div style={{ marginTop:16,paddingTop:16,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:12 }}>
      {/* Rate Limit */}
      {rule.key==="rate_limit" && <>
        <div className="grid-2">
          <div>
            <label className="form-label">Max mesej per minit</label>
            <input className="input" type="number" min="1" max="60" value={cfg.max_per_minute} onChange={e=>updateCfg("max_per_minute",+e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Cool-down (saat)</label>
            <input className="input" type="number" min="0" value={cfg.cooldown_seconds} onChange={e=>updateCfg("cooldown_seconds",+e.target.value)}/>
          </div>
        </div>
      </>}

      {/* Business Hours */}
      {rule.key==="business_hours" && <>
        <div className="grid-2">
          <div>
            <label className="form-label">Masa Mula</label>
            <input className="input" type="time" value={cfg.start} onChange={e=>updateCfg("start",e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Masa Tamat</label>
            <input className="input" type="time" value={cfg.end} onChange={e=>updateCfg("end",e.target.value)}/>
          </div>
        </div>
        <div>
          <label className="form-label">Hari Operasi</label>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {["Ahd","Isn","Sel","Rab","Kha","Jum","Sab"].map((d,i)=>(
              <button key={i} type="button"
                className={`btn btn-sm ${(cfg.days||[]).includes(i)?"btn-default":"btn-ghost"}`}
                onClick={()=>{
                  const days = cfg.days||[];
                  updateCfg("days", days.includes(i)?days.filter(x=>x!==i):[...days,i].sort());
                }}>{d}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="form-label">Mesej Luar Waktu</label>
          <textarea className="input" rows={2} value={cfg.away_message} onChange={e=>updateCfg("away_message",e.target.value)}/>
        </div>
      </>}

      {/* Message Length */}
      {rule.key==="message_length" && (
        <div>
          <label className="form-label">Max aksara</label>
          <input className="input" type="number" min="50" max="5000" value={cfg.max_chars} onChange={e=>updateCfg("max_chars",+e.target.value)}/>
        </div>
      )}

      {/* Conversation Limit */}
      {rule.key==="conversation_limit" && <>
        <div>
          <label className="form-label">Max mesej per hari</label>
          <input className="input" type="number" min="1" value={cfg.max_per_day} onChange={e=>updateCfg("max_per_day",+e.target.value)}/>
        </div>
        <div>
          <label className="form-label">Mesej had dicapai</label>
          <textarea className="input" rows={2} value={cfg.away_message} onChange={e=>updateCfg("away_message",e.target.value)}/>
        </div>
      </>}

      {/* Repeat Detection */}
      {rule.key==="repeat_detection" && (
        <div className="grid-2">
          <div>
            <label className="form-label">Max ulangan</label>
            <input className="input" type="number" min="1" value={cfg.max_repeat} onChange={e=>updateCfg("max_repeat",+e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Tetingkap masa (minit)</label>
            <input className="input" type="number" min="1" value={cfg.window_minutes} onChange={e=>updateCfg("window_minutes",+e.target.value)}/>
          </div>
        </div>
      )}

      {/* Number Blacklist */}
      {rule.key==="number_blacklist" && (
        <div>
          <label className="form-label">Nombor disekat (satu per baris, cth: 60123456789)</label>
          <textarea className="input" rows={4}
            value={(cfg.numbers||[]).join("\n")}
            onChange={e=>updateCfg("numbers", e.target.value.split("\n").map(n=>n.trim()).filter(Boolean))}/>
          <div style={{ fontSize:12,color:"var(--muted)",marginTop:4 }}>{(cfg.numbers||[]).length} nombor disekat</div>
        </div>
      )}

      {/* Profanity Filter */}
      {rule.key==="profanity_filter" && (
        <div>
          <label className="form-label">Kata terlarang (satu per baris)</label>
          <textarea className="input" rows={4}
            value={(cfg.words||[]).join("\n")}
            onChange={e=>updateCfg("words", e.target.value.split("\n").map(w=>w.trim()).filter(Boolean))}/>
        </div>
      )}

      {/* Prompt Injection */}
      {rule.key==="prompt_injection" && (
        <div>
          <label className="form-label">Pattern berbahaya (satu per baris)</label>
          <textarea className="input" rows={5}
            value={(cfg.patterns||[]).join("\n")}
            onChange={e=>updateCfg("patterns", e.target.value.split("\n").map(p=>p.trim()).filter(Boolean))}/>
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-default btn-sm" disabled={saving} onClick={()=>onSave(rule,cfg)}>
          {saving?<><span className="spinner spinner-white" style={{ width:13,height:13 }}/> Menyimpan...</>:"💾 Simpan"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}

// ── Main Admin ────────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { id:0, icon:LayoutDashboard, label:"Overview" },
  { id:1, icon:Users,           label:"Tenants" },
  { id:2, icon:ScrollText,      label:"Semua Log" },
  { id:3, icon:Database,        label:"Database" },
  { id:4, icon:ShieldCheck,     label:"Plan Config" },
  { id:5, icon:BookOpen,        label:"Knowledge Base" },
  { id:6, icon:ShieldCheck,     label:"Guardrails" },
];

export default function Admin() {
  const navigate  = useNavigate();
  const [tab, setTab]           = useState(0);
  const [stats, setStats]       = useState(null);
  const [tenants, setTenants]   = useState([]);
  const [allLogs, setAllLogs]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [filterPlan, setFilterPlan]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast]       = useState(null);

  const showToast = (text, type="success") => setToast({ text, type });

  async function fetchAll() {
    try {
      const [s,t] = await Promise.all([api("GET","/admin/stats"),api("GET","/admin/tenants")]);
      setStats(s); setTenants(t);
    } catch(e) {
      if (e.message.includes("Admin")) { alert("Anda bukan admin!"); navigate("/dashboard"); }
    }
  }
  async function fetchLogs() {
    const l = await api("GET","/admin/logs").catch(()=>[]);
    setAllLogs(l);
  }

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (tab===2) fetchLogs(); }, [tab]);

  async function logout() {
    try { await api("POST","/auth/logout"); } catch {}
    localStorage.clear(); navigate("/login");
  }

  const filtered = tenants.filter(t => {
    const ms = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()) || (t.phone_number||"").includes(search);
    const mp = filterPlan==="all" || t.plan===filterPlan;
    const ms2 = filterStatus==="all"
      ||(filterStatus==="connected"&&t.bot_status==="connected")
      ||(filterStatus==="offline"&&t.bot_status!=="connected")
      ||(filterStatus==="suspended"&&!t.is_active);
    return ms&&mp&&ms2;
  });

  const SidebarContent = (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 12px rgba(99,102,241,.3)" }}>
          <ShieldCheck size={18} color="#fff" />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:14 }} className="truncate">Admin Panel</div>
          <div style={{ fontSize:11.5,color:"var(--muted)" }}>Super Admin</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {ADMIN_NAV.map(n=>(
          <button key={n.id} className={`nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <n.icon size={16} />
            <span className="truncate">{n.label}</span>
            {n.id===1&&tenants.length>0&&(
              <span style={{ marginLeft:"auto",background:tab===1?"rgba(255,255,255,.2)":"var(--border)",borderRadius:99,padding:"1px 7px",fontSize:11 }}>{tenants.length}</span>
            )}
          </button>
        ))}
        <div style={{ height:1,background:"var(--border)",margin:"8px 0" }} />
        <button className="nav-item" onClick={()=>navigate("/dashboard")}><Bot size={16}/> User Dashboard</button>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={logout}><LogOut size={15}/> Log Keluar</button>
        <div style={{ padding:"8px 12px 4px", fontSize:11, color:"#71717a", display:"flex", justifyContent:"space-between" }}>
          <span>JomReply.ai</span>
          <span style={{ background:"rgba(99,102,241,.15)", color:"#a5b4fc", borderRadius:4, padding:"1px 6px", fontWeight:600 }}>v1.0.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="layout">
      {toast && <Toast {...toast} onDone={()=>setToast(null)} />}

      <aside className="sidebar">{SidebarContent}</aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title" style={{ flex:1,minWidth:0 }}>
            {(() => { const n=ADMIN_NAV.find(x=>x.id===tab); return n ? <>
              <h1 style={{ display:"flex",alignItems:"center",gap:8 }}>
                <n.icon size={17} style={{ color:"#6366f1",flexShrink:0 }} />
                <span className="truncate">{n.label}</span>
              </h1>
              <p>Admin Panel</p>
            </> : null; })()}
          </div>
          <div style={{ display:"flex",gap:8,flexShrink:0 }}>
            <span className="badge badge-purple"><ShieldCheck size={11}/> Admin</span>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={fetchAll}><RefreshCw size={14}/></button>
          </div>
        </header>

        <div className="page fade-in">

          {/* ── Overview ── */}
          {tab===0 && stats && (
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div className="stats-grid">
                {[
                  { icon:Users,       label:"Total Tenant",   value:stats.totalUsers,    sub:`+${stats.newThisWeek} minggu ini`, color:"var(--green)" },
                  { icon:UserCheck,   label:"Aktif",          value:stats.activeUsers,   color:"#3b82f6" },
                  { icon:Bot,         label:"Bot Online",     value:stats.connectedBots, color:"#8b5cf6" },
                  { icon:ScrollText,  label:"Jumlah Mesej",   value:stats.totalMessages, sub:`${stats.todayMessages} hari ini`, color:"var(--amber)" },
                ].map(({ icon:Icon,label,value,sub,color },i)=>(
                  <div key={i} className="card" style={{ padding:16 }}>
                    <Icon size={22} style={{ color,marginBottom:8 }} />
                    <div style={{ fontSize:28,fontWeight:800,color,lineHeight:1 }}>{value}</div>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".04em",marginTop:4 }}>{label}</div>
                    {sub&&<div style={{ fontSize:11.5,color:"var(--muted)",marginTop:2 }}>{sub}</div>}
                  </div>
                ))}
              </div>

              <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
                <div className="card" style={{ flex:1,minWidth:180,padding:16 }}>
                  <div style={{ fontWeight:700,fontSize:14,marginBottom:12 }}>📊 Pecahan Plan</div>
                  {stats.plans.length===0?<p style={{ color:"var(--muted)",fontSize:13 }}>Tiada data</p>
                  :stats.plans.map(p=>(
                    <div key={p.plan} style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--border)",fontSize:13 }}>
                      <PlanBadge plan={p.plan} />
                      <span style={{ fontWeight:600 }}>{p.count}</span>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ flex:2,minWidth:220,padding:16 }}>
                  <div style={{ fontWeight:700,fontSize:14,marginBottom:12 }}>📈 Mesej 7 Hari</div>
                  {stats.msgChart.length===0?<p style={{ color:"var(--muted)",fontSize:13 }}>Tiada data lagi.</p>
                  :<div style={{ display:"flex",alignItems:"flex-end",gap:5,height:80 }}>
                    {stats.msgChart.map(d=>{
                      const max=Math.max(...stats.msgChart.map(x=>x.count),1);
                      const h=Math.max((d.count/max)*100,4);
                      return (
                        <div key={d.day} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                          <span style={{ fontSize:9,color:"var(--muted)" }}>{d.count}</span>
                          <div style={{ width:"100%",height:`${h}%`,background:"var(--green)",borderRadius:3,opacity:.85 }} />
                          <span style={{ fontSize:9,color:"var(--muted)" }}>{d.day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>}
                </div>
              </div>

              <div className="card" style={{ padding:16 }}>
                <div style={{ fontWeight:700,fontSize:14,marginBottom:12 }}>🔴 Bot Offline</div>
                {tenants.filter(t=>t.is_active&&t.bot_status!=="connected").length===0
                  ?<p style={{ color:"var(--green-dark)",fontSize:13 }}>✅ Semua bot bersambung!</p>
                  :tenants.filter(t=>t.is_active&&t.bot_status!=="connected").map(t=>(
                  <div key={t.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border)",flexWrap:"wrap",gap:8 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600,fontSize:13 }} className="truncate">{t.name}</div>
                      <div style={{ fontSize:11.5,color:"var(--muted)" }}>{t.email}</div>
                    </div>
                    <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                      <BotBadge status={t.bot_status} />
                      <button className="btn btn-secondary btn-sm" onClick={()=>setSelected(t)}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tenants ── */}
          {tab===1 && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                <div style={{ position:"relative",flex:1,minWidth:180 }}>
                  <Search size={15} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)" }} />
                  <input className="input" style={{ paddingLeft:36 }} placeholder="Cari nama, email..." value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <select className="input" style={{ width:130 }} value={filterPlan} onChange={e=>setFilterPlan(e.target.value)}>
                  <option value="all">Semua Plan</option>
                  {PLANS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
                <select className="input" style={{ width:140 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                  <option value="all">Semua Status</option>
                  <option value="connected">Bot Online</option>
                  <option value="offline">Bot Offline</option>
                  <option value="suspended">Digantung</option>
                </select>
                <button className="btn btn-secondary btn-sm btn-icon" onClick={fetchAll}><RefreshCw size={14}/></button>
              </div>
              <div style={{ fontSize:12.5,color:"var(--muted)" }}>Menunjukkan {filtered.length} daripada {tenants.length} tenant</div>
              <div className="table-wrap">
                <table>
                  <thead><tr>{["Tenant","Plan","Bot Status","Nombor WA","Mesej","Daftar",""].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.length===0
                      ?<tr><td colSpan={7} style={{ padding:32,textAlign:"center",color:"var(--muted)" }}>Tiada tenant dijumpai</td></tr>
                      :filtered.map(t=>(
                      <tr key={t.id}>
                        <td style={{ minWidth:160 }}>
                          <div style={{ fontWeight:600,fontSize:13 }}>{t.name}</div>
                          <div style={{ fontSize:11.5,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160 }}>{t.email}</div>
                          {!t.is_active&&<span className="badge badge-red" style={{ fontSize:10,marginTop:3 }}>DIGANTUNG</span>}
                        </td>
                        <td><PlanBadge plan={t.plan}/></td>
                        <td><BotBadge status={t.bot_status}/></td>
                        <td style={{ color:t.phone_number?"var(--text)":"var(--muted)",whiteSpace:"nowrap" }}>{t.phone_number?`+${t.phone_number}`:"—"}</td>
                        <td style={{ whiteSpace:"nowrap" }}>
                          <span style={{ fontWeight:600 }}>{t.total_messages}</span>
                          <span style={{ color:"var(--muted)",fontSize:11,marginLeft:4 }}>({t.today_messages})</span>
                        </td>
                        <td style={{ color:"var(--muted)",fontSize:12,whiteSpace:"nowrap" }}>{new Date(t.created_at).toLocaleDateString("ms-MY")}</td>
                        <td><button className="btn btn-secondary btn-sm" onClick={()=>setSelected(t)}>✏️ Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── All Logs ── */}
          {tab===2 && (
            <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8,flexWrap:"wrap" }}>
                <div style={{ fontWeight:700,fontSize:15 }}>📋 Semua Log <span style={{ fontWeight:400,color:"var(--muted)",fontSize:13 }}>({allLogs.length})</span></div>
                <button className="btn btn-secondary btn-sm btn-icon" onClick={fetchLogs}><RefreshCw size={14}/></button>
              </div>
              {allLogs.length===0
                ?<div className="card" style={{ padding:48,textAlign:"center",color:"var(--muted)" }}>Tiada log lagi.</div>
                :<div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {allLogs.map(l=>(
                    <div key={l.id} className="card" style={{ padding:14 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:4 }}>
                        <div style={{ minWidth:0 }}>
                          <span style={{ fontWeight:700,fontSize:13 }}>{l.user_name}</span>
                          <span style={{ color:"var(--muted)",fontSize:11,marginLeft:6 }}>→ +{l.sender}</span>
                        </div>
                        <span style={{ color:"var(--muted)",fontSize:11,flexShrink:0 }}>{new Date(l.created_at).toLocaleString("ms-MY")}</span>
                      </div>
                      <div className="bubble-user" style={{ marginBottom:6,fontSize:13 }}>👤 {l.message}</div>
                      <div className="bubble-bot" style={{ fontSize:13 }}>🤖 {l.reply}</div>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* ── Database ── */}
          {tab===3 && <DbViewer showToast={showToast} />}

          {/* ── Plan Config ── */}
          {tab===4 && <PlanConfig showToast={showToast} />}

          {/* ── Knowledge Base ── */}
          {tab===5 && <GlobalKnowledge showToast={showToast} />}

          {/* ── Guardrails ── */}
          {tab===6 && <GuardrailsManager showToast={showToast} />}

        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {ADMIN_NAV.map(n=>(
          <button key={n.id} className={`bottom-nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <n.icon />
            {n.label}
          </button>
        ))}
        <button className="bottom-nav-item" onClick={()=>navigate("/dashboard")}>
          <Bot />
          User
        </button>
      </nav>

      {selected && (
        <TenantModal
          tenant={selected}
          onClose={()=>setSelected(null)}
          onSave={()=>{ fetchAll(); showToast("Perubahan disimpan!"); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
