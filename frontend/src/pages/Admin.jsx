import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

const PLANS = ["basic", "pro", "enterprise"];
const TABS  = ["📊 Overview", "👥 Tenants", "📋 Semua Log"];

// ── Small reusable components ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "#25d366" }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BotBadge({ status }) {
  const map = {
    connected:   { cls: "badge-green",  label: "🟢 Online" },
    qr_pending:  { cls: "badge-yellow", label: "🟡 QR" },
    starting:    { cls: "badge-yellow", label: "🟡 Starting" },
    disconnected:{ cls: "badge-gray",   label: "⚫ Offline" },
    auth_failed: { cls: "badge-red",    label: "🔴 Auth Fail" },
  };
  const s = map[status] || map.disconnected;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function PlanBadge({ plan }) {
  const map = {
    basic:      { cls: "badge-gray",   label: "Basic" },
    pro:        { cls: "badge-yellow", label: "Pro ⭐" },
    enterprise: { cls: "badge-green",  label: "Enterprise 🚀" },
  };
  const p = map[plan] || map.basic;
  return <span className={`badge ${p.cls}`}>{p.label}</span>;
}

// ── Tenant Detail Modal ───────────────────────────────────────────────────────
function TenantModal({ tenant, onClose, onSave }) {
  const [form, setForm] = useState({
    name: tenant.name,
    email: tenant.email,
    plan: tenant.plan || "basic",
    is_active: !!tenant.is_active,
    max_messages: tenant.max_messages || 1000,
    notes: tenant.notes || "",
  });
  const [newPw, setNewPw]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");
  const [logs, setLogs]       = useState([]);
  const [modalTab, setModalTab] = useState(0);

  useEffect(() => {
    api("GET", `/admin/tenants/${tenant.id}/logs`).then(setLogs).catch(() => {});
  }, [tenant.id]);

  async function save() {
    setSaving(true);
    try {
      await api("PUT", `/admin/tenants/${tenant.id}`, form);
      setMsg("✅ Disimpan!");
      onSave();
    } catch (e) { setMsg("❌ " + e.message); }
    setSaving(false);
  }

  async function resetPw() {
    if (!newPw || newPw.length < 6) return setMsg("❌ Min 6 aksara");
    await api("POST", `/admin/tenants/${tenant.id}/reset-password`, { password: newPw });
    setMsg("✅ Kata laluan ditukar!");
    setNewPw("");
  }

  async function stopBot() {
    await api("POST", `/admin/tenants/${tenant.id}/stop-bot`);
    setMsg("✅ Bot dihentikan");
    onSave();
  }

  async function deleteTenant() {
    if (!confirm(`Padam akaun ${tenant.email}? Tindakan ini TIDAK boleh dibatalkan!`)) return;
    await api("DELETE", `/admin/tenants/${tenant.id}`);
    onClose();
    onSave();
  }

  const MTABS = ["✏️ Edit", "🔐 Keselamatan", "📋 Log Mesej"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 18 }}>{tenant.name}</h2>
            <p style={{ fontSize: 13, color: "#6b7280" }}>{tenant.email}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>

        {msg && <div className={`alert ${msg.startsWith("✅") ? "alert-success" : "alert-error"}`}>{msg}</div>}

        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {MTABS.map((t, i) => (
            <button key={i} onClick={() => setModalTab(i)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: modalTab === i ? "#25d366" : "#f3f4f6", color: modalTab === i ? "#fff" : "#374151" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Edit Tab */}
        {modalTab === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Nama</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label>Email</label><input className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Plan</label>
                <select className="input" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
                  {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label>Had Mesej / Bulan</label>
                <input className="input" type="number" value={form.max_messages} onChange={e => setForm({...form, max_messages: parseInt(e.target.value)})} />
              </div>
            </div>
            <div>
              <label>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} style={{ marginRight: 8 }} />
                Akaun Aktif
              </label>
            </div>
            <div>
              <label>Nota Admin (tidak kelihatan kepada user)</label>
              <textarea className="input" style={{ minHeight: 80 }} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Nota tentang tenant ini..." />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "💾 Simpan"}</button>
              {tenant.is_running && <button className="btn btn-secondary" onClick={stopBot}>⏹ Stop Bot</button>}
              <button className="btn btn-danger" onClick={deleteTenant} style={{ marginLeft: "auto" }}>🗑 Padam Akaun</button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {modalTab === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label>Set Kata Laluan Baru</label>
              <input className="input" type="password" placeholder="Minimum 6 aksara" value={newPw} onChange={e => setNewPw(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={resetPw} style={{ alignSelf: "flex-start" }}>🔐 Tukar Kata Laluan</button>
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>Tindakan akaun:</p>
              <div style={{ display: "flex", gap: 8 }}>
                {form.is_active
                  ? <button className="btn btn-danger" onClick={async () => { await api("POST", `/admin/tenants/${tenant.id}/suspend`); setForm({...form, is_active: false}); setMsg("✅ Akaun digantung"); onSave(); }}>🚫 Gantung Akaun</button>
                  : <button className="btn btn-primary" onClick={async () => { await api("POST", `/admin/tenants/${tenant.id}/activate`); setForm({...form, is_active: true}); setMsg("✅ Akaun diaktifkan"); onSave(); }}>✅ Aktifkan Semula</button>
                }
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {modalTab === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {logs.length === 0
              ? <p style={{ color: "#6b7280", textAlign: "center", padding: 24 }}>Tiada log lagi.</p>
              : logs.map(l => (
                <div key={l.id} style={{ background: "#f9fafb", borderRadius: 8, padding: 12, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>📱 +{l.sender}</span>
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>{new Date(l.created_at).toLocaleString("ms-MY")}</span>
                  </div>
                  <div style={{ background: "#e0f2fe", borderRadius: 5, padding: "6px 10px", marginBottom: 4 }}>👤 {l.message}</div>
                  <div style={{ background: "#dcfce7", borderRadius: 5, padding: "6px 10px" }}>🤖 {l.reply}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin() {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab]           = useState(0);
  const [stats, setStats]       = useState(null);
  const [tenants, setTenants]   = useState([]);
  const [allLogs, setAllLogs]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [filterPlan, setFilterPlan]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [globalMsg, setGlobalMsg]       = useState({ text: "", type: "" });

  function showGlobalMsg(text, type = "success") {
    setGlobalMsg({ text, type });
    setTimeout(() => setGlobalMsg({ text: "", type: "" }), 3000);
  }

  async function fetchAll() {
    try {
      const [s, t] = await Promise.all([
        api("GET", "/admin/stats"),
        api("GET", "/admin/tenants"),
      ]);
      setStats(s);
      setTenants(t);
    } catch (e) {
      if (e.message.includes("Admin")) {
        alert("Anda bukan admin!");
        navigate("/dashboard");
      }
    }
  }

  async function fetchLogs() {
    const l = await api("GET", "/admin/logs").catch(() => []);
    setAllLogs(l);
  }

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (tab === 2) fetchLogs(); }, [tab]);

  const filtered = tenants.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()) || (t.phone_number || "").includes(search);
    const matchPlan   = filterPlan === "all" || t.plan === filterPlan;
    const matchStatus = filterStatus === "all"
      || (filterStatus === "connected" && t.bot_status === "connected")
      || (filterStatus === "offline" && t.bot_status !== "connected")
      || (filterStatus === "suspended" && !t.is_active);
    return matchSearch && matchPlan && matchStatus;
  });

  function logout() { localStorage.clear(); navigate("/login"); }

  const ADMIN_NAV = [
    { icon:"📊", label:"Overview",   id:0 },
    { icon:"👥", label:"Tenants",    id:1 },
    { icon:"📋", label:"Semua Log",  id:2 },
  ];

  return (
    <div className="layout">
      {globalMsg.text && (
        <div className={`toast toast-${globalMsg.type === "error" ? "error" : "success"}`}>
          <span>{globalMsg.type==="error"?"❌":"✅"}</span>
          <span>{globalMsg.text}</span>
          <button onClick={() => setGlobalMsg({text:"",type:""})} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:16 }}>✕</button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>🛡️</div>
          <div>
            <div style={{ color:"#f1f5f9",fontWeight:700,fontSize:14 }}>Admin Panel</div>
            <div style={{ color:"#64748b",fontSize:11 }}>Super Admin</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {ADMIN_NAV.map(n => (
            <button key={n.id} className={`nav-item${tab===n.id?" active":""}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.id===1 && tenants.length>0 && (
                <span style={{ marginLeft:"auto",background:"rgba(255,255,255,.1)",color:"#94a3b8",borderRadius:99,padding:"1px 7px",fontSize:11 }}>{tenants.length}</span>
              )}
            </button>
          ))}
          <div className="divider" style={{ margin:"10px 0" }} />
          <button className="nav-item" onClick={() => navigate("/dashboard")}>
            <span className="nav-icon">👤</span> User Dashboard
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={logout}>
            <span className="nav-icon">🚪</span> Log Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div>
            <div style={{ fontWeight:700,fontSize:16 }}>{ADMIN_NAV[tab]?.icon} {ADMIN_NAV[tab]?.label}</div>
            <div style={{ fontSize:12,color:"#94a3b8" }}>Platform administration</div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <span className="badge badge-purple">🛡️ Super Admin</span>
            <button className="btn btn-secondary btn-sm" onClick={fetchAll}>🔄 Refresh</button>
          </div>
        </div>

        <div className="page fade-in">

        {/* ── TAB: Overview ── */}
        {tab === 0 && stats && (
          <div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard icon="👥" label="Total Tenant"     value={stats.totalUsers}    sub={`+${stats.newThisWeek} minggu ini`} />
              <StatCard icon="✅" label="Akaun Aktif"      value={stats.activeUsers}   color="#3b82f6" />
              <StatCard icon="🤖" label="Bot Bersambung"   value={stats.connectedBots} color="#8b5cf6" />
              <StatCard icon="💬" label="Jumlah Mesej"     value={stats.totalMessages} sub={`${stats.todayMessages} hari ini`} color="#f59e0b" />
            </div>

            {/* Plan breakdown */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <div className="card" style={{ flex: 1, minWidth: 200 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 14 }}>📊 Pecahan Plan</h3>
                {stats.plans.length === 0
                  ? <p style={{ color: "#6b7280", fontSize: 13 }}>Tiada data</p>
                  : stats.plans.map(p => (
                    <div key={p.plan} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 }}>
                      <PlanBadge plan={p.plan} />
                      <span style={{ fontWeight: 700 }}>{p.count} tenant</span>
                    </div>
                  ))
                }
              </div>

              <div className="card" style={{ flex: 2, minWidth: 300 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 14 }}>📈 Mesej 7 Hari Lepas</h3>
                {stats.msgChart.length === 0
                  ? <p style={{ color: "#6b7280", fontSize: 13 }}>Tiada data lagi.</p>
                  : <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
                    {stats.msgChart.map(d => {
                      const max = Math.max(...stats.msgChart.map(x => x.count), 1);
                      const h   = Math.max((d.count / max) * 100, 4);
                      return (
                        <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 10, color: "#6b7280" }}>{d.count}</span>
                          <div style={{ width: "100%", height: `${h}%`, background: "#25d366", borderRadius: 4 }} title={`${d.day}: ${d.count} mesej`} />
                          <span style={{ fontSize: 9, color: "#9ca3af" }}>{d.day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            </div>

            {/* Quick tenant list */}
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>🔴 Bot Offline / Ada Masalah</h3>
              {tenants.filter(t => t.is_active && t.bot_status !== "connected").length === 0
                ? <p style={{ color: "#16a34a", fontSize: 13 }}>✅ Semua bot bersambung!</p>
                : tenants.filter(t => t.is_active && t.bot_status !== "connected").map(t => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                      <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>{t.email}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <BotBadge status={t.bot_status} />
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setSelected(t)}>Edit</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── TAB: Tenants ── */}
        {tab === 1 && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="🔍 Cari nama, email, nombor..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <select className="input" style={{ width: 140 }} value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
                <option value="all">Semua Plan</option>
                {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
              <select className="input" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Semua Status</option>
                <option value="connected">Bot Online</option>
                <option value="offline">Bot Offline</option>
                <option value="suspended">Digantung</option>
              </select>
              <button className="btn btn-secondary" onClick={fetchAll}>🔄</button>
            </div>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
              Menunjukkan {filtered.length} daripada {tenants.length} tenant
            </div>

            {/* Tenant table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Tenant", "Plan", "Bot Status", "Nombor WA", "Mesej", "Daftar", ""].map((h, i) => (
                        <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>Tiada tenant dijumpai</td></tr>
                      : filtered.map(t => (
                        <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                            <div style={{ color: "#6b7280", fontSize: 12 }}>{t.email}</div>
                            {!t.is_active && <span className="badge badge-red" style={{ fontSize: 10, marginTop: 2 }}>DIGANTUNG</span>}
                          </td>
                          <td style={{ padding: "12px 16px" }}><PlanBadge plan={t.plan} /></td>
                          <td style={{ padding: "12px 16px" }}><BotBadge status={t.bot_status} /></td>
                          <td style={{ padding: "12px 16px", color: t.phone_number ? "#111" : "#9ca3af" }}>
                            {t.phone_number ? `+${t.phone_number}` : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontWeight: 600 }}>{t.total_messages}</span>
                            <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 4 }}>({t.today_messages} hari ini)</span>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                            {new Date(t.created_at).toLocaleDateString("ms-MY")}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <button className="btn btn-outline" style={{ fontSize: 12, padding: "5px 12px" }}
                              onClick={() => setSelected(t)}>
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: All Logs ── */}
        {tab === 2 && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700 }}>📋 Semua Log Mesej (100 terbaru)</h2>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={fetchLogs}>🔄 Refresh</button>
            </div>
            {allLogs.length === 0
              ? <p style={{ color: "#6b7280", textAlign: "center", padding: 32 }}>Tiada log lagi.</p>
              : allLogs.map(l => (
                <div key={l.id} style={{ background: "#f9fafb", borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{l.user_name}</span>
                      <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 6 }}>{l.email}</span>
                      <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 6 }}>→ +{l.sender}</span>
                    </div>
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>{new Date(l.created_at).toLocaleString("ms-MY")}</span>
                  </div>
                  <div style={{ background: "#e0f2fe", borderRadius: 5, padding: "6px 10px", marginBottom: 4 }}>👤 {l.message}</div>
                  <div style={{ background: "#dcfce7", borderRadius: 5, padding: "6px 10px" }}>🤖 {l.reply}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
      </main>

      {/* Tenant Modal */}
      {selected && (
        <TenantModal
          tenant={selected}
          onClose={() => setSelected(null)}
          onSave={() => { fetchAll(); showGlobalMsg("✅ Perubahan disimpan!"); }}
        />
      )}

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {ADMIN_NAV.map(n => (
          <button key={n.id} className={`bottom-nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
        <button className="bottom-nav-item" onClick={()=>navigate("/dashboard")}>
          <span className="nav-icon">👤</span>
          <span>User</span>
        </button>
      </nav>
    </div>
  );
}
