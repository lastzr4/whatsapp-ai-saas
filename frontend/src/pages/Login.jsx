import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Mail, Lock, ArrowLeft, Send, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";

function AuthCard({ children }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, background:"#f4f4f5" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#22c55e,#16a34a)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:14, boxShadow:"0 6px 20px rgba(34,197,94,.3)" }}>
            <Bot size={26} color="#fff" />
          </div>
          <h1 style={{ fontWeight:800, fontSize:20, marginBottom:3 }}>WhatsApp AI Bot</h1>
          <p style={{ fontSize:13, color:"var(--muted)" }}>Dashboard Platform</p>
        </div>
        {/* Card */}
        <div className="card" style={{ padding:28 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [form, setForm]         = useState({ email:"", password:"" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [view, setView]         = useState("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resending, setResending]     = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data = await api("POST","/auth/login",form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({ name:data.name, email:data.email, is_admin:data.is_admin }));
      navigate(data.is_admin ? "/admin" : "/dashboard");
    } catch(err) {
      if (err.message.includes("sahkan email")||err.message.includes("requiresVerification")) {
        setUnverifiedEmail(form.email); setView("verify_notice");
      } else { setError(err.message); }
    } finally { setLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault(); setLoading(true); setError("");
    try { await api("POST","/auth/forgot-password",{ email:forgotEmail }); setView("forgot_sent"); }
    catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function resendVerification() {
    setResending(true);
    try { await api("POST","/auth/resend-verification",{ email:unverifiedEmail }); alert("Email dihantar semula! Sila semak inbox anda."); }
    catch(err) { alert(err.message); }
    finally { setResending(false); }
  }

  return (
    <AuthCard>
      {/* ── Login ── */}
      {view==="login" && <>
        <h2 style={{ fontWeight:700, fontSize:19, marginBottom:4 }}>Log Masuk</h2>
        <p style={{ fontSize:13, color:"var(--muted)", marginBottom:20 }}>Selamat kembali!</p>
        {error && (
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13.5, color:"#dc2626" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="form-label">Email</label>
            <div style={{ position:"relative" }}>
              <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
              <input className="input" type="email" placeholder="email@example.com" autoComplete="email"
                style={{ paddingLeft:38 }} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
            </div>
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <label className="form-label" style={{ margin:0 }}>Kata Laluan</label>
              <button type="button" onClick={()=>{ setForgotEmail(form.email); setView("forgot"); setError(""); }}
                style={{ background:"none", border:"none", color:"var(--green)", fontSize:12.5, cursor:"pointer", fontWeight:500 }}>
                Lupa kata laluan?
              </button>
            </div>
            <div style={{ position:"relative" }}>
              <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
              <input className="input" type="password" placeholder="••••••••" autoComplete="current-password"
                style={{ paddingLeft:38 }} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
            </div>
          </div>
          <button className="btn btn-default btn-lg" type="submit" disabled={loading} style={{ width:"100%", marginTop:4 }}>
            {loading ? <><span className="spinner spinner-white" style={{ width:16,height:16 }} /> Memproses...</> : "Log Masuk →"}
          </button>
        </form>
        <p style={{ textAlign:"center", marginTop:18, fontSize:13, color:"var(--muted)" }}>
          Belum ada akaun?{" "}<Link to="/register" style={{ color:"var(--green-dark)", fontWeight:600, textDecoration:"none" }}>Daftar sekarang</Link>
        </p>
      </>}

      {/* ── Forgot Password ── */}
      {view==="forgot" && <>
        <button onClick={()=>{ setView("login"); setError(""); }}
          style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:13, marginBottom:18, padding:0 }}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <h2 style={{ fontWeight:700, fontSize:19, marginBottom:4 }}>Lupa Kata Laluan?</h2>
        <p style={{ fontSize:13, color:"var(--muted)", marginBottom:20 }}>Masukkan email anda untuk reset kata laluan.</p>
        {error && (
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13.5, color:"#dc2626" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <form onSubmit={handleForgot} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="form-label">Email</label>
            <div style={{ position:"relative" }}>
              <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
              <input className="input" type="email" placeholder="email@example.com" autoComplete="email"
                style={{ paddingLeft:38 }} value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required />
            </div>
          </div>
          <button className="btn btn-default btn-lg" type="submit" disabled={loading} style={{ width:"100%" }}>
            {loading ? <><span className="spinner spinner-white" style={{ width:16,height:16 }} /> Menghantar...</> : <><Send size={15} /> Hantar Link Reset</>}
          </button>
        </form>
      </>}

      {/* ── Forgot Sent ── */}
      {view==="forgot_sent" && (
        <div style={{ textAlign:"center", padding:"8px 0" }}>
          <div style={{ width:56, height:56, borderRadius:14, background:"var(--green-bg)", border:"1px solid var(--green-border)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
            <Mail size={26} style={{ color:"var(--green-dark)" }} />
          </div>
          <h2 style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Email Dihantar!</h2>
          <p style={{ fontSize:13.5, color:"var(--muted)", lineHeight:1.6, marginBottom:6 }}>
            Link reset telah dihantar ke <strong style={{ color:"var(--text)" }}>{forgotEmail}</strong>
          </p>
          <p style={{ fontSize:12, color:"var(--muted)", marginBottom:22 }}>Sila semak inbox atau folder spam. Link sah 1 jam.</p>
          <button onClick={()=>{ setView("login"); setError(""); }} className="btn btn-secondary" style={{ width:"100%" }}>
            <ArrowLeft size={14} /> Kembali ke Login
          </button>
        </div>
      )}

      {/* ── Email Not Verified ── */}
      {view==="verify_notice" && (
        <div style={{ textAlign:"center", padding:"8px 0" }}>
          <div style={{ width:56, height:56, borderRadius:14, background:"rgba(59,130,246,.08)", border:"1px solid rgba(59,130,246,.2)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
            <Mail size={26} style={{ color:"#3b82f6" }} />
          </div>
          <h2 style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Sahkan Email Anda</h2>
          <p style={{ fontSize:13.5, color:"var(--muted)", lineHeight:1.6, marginBottom:20 }}>
            Link pengesahan telah dihantar ke <strong style={{ color:"var(--text)" }}>{unverifiedEmail}</strong>
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={resendVerification} disabled={resending} className="btn btn-outline" style={{ width:"100%" }}>
              {resending ? <><span className="spinner" style={{ width:14,height:14 }} /> Menghantar...</> : <><RefreshCw size={14} /> Hantar Semula Email</>}
            </button>
            <button onClick={()=>{ setView("login"); setError(""); }} className="btn btn-ghost" style={{ width:"100%", fontSize:13 }}>
              <ArrowLeft size={13} /> Kembali ke Login
            </button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
