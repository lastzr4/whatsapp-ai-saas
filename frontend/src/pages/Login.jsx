import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Login() {
  const [form, setForm]         = useState({ email:"", password:"" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [view, setView]         = useState("login"); // login | forgot | forgot_sent | verify_notice
  const [forgotEmail, setForgotEmail] = useState("");
  const [resending, setResending]     = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await api("POST","/auth/login",form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({ name:data.name, email:data.email }));
      navigate("/dashboard");
    } catch(err) {
      if (err.message.includes("sahkan email") || err.message.includes("requiresVerification")) {
        setUnverifiedEmail(form.email);
        setView("verify_notice");
      } else {
        setError(err.message);
      }
    } finally { setLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await api("POST","/auth/forgot-password",{ email:forgotEmail });
      setView("forgot_sent");
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function resendVerification() {
    setResending(true);
    try {
      await api("POST","/auth/resend-verification",{ email:unverifiedEmail });
      alert("Email pengesahan telah dihantar semula! Sila semak inbox anda.");
    } catch(err) { alert(err.message); }
    finally { setResending(false); }
  }

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f2027 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20 }}>
      {/* Logo */}
      <div style={{ textAlign:"center",marginBottom:24 }}>
        <div style={{ width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#25d366,#128c5e)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:"0 6px 20px rgba(37,211,102,.4)",marginBottom:12 }}>🤖</div>
        <h1 style={{ color:"#fff",fontWeight:800,fontSize:20,marginBottom:2 }}>WhatsApp AI Bot</h1>
        <p style={{ color:"#94a3b8",fontSize:13 }}>Dashboard Platform</p>
      </div>

      <div style={{ width:"100%",maxWidth:380,background:"rgba(255,255,255,.06)",backdropFilter:"blur(20px)",borderRadius:20,padding:28,border:"1px solid rgba(255,255,255,.1)" }}>

        {/* ── Login ── */}
        {view==="login" && <>
          <h2 style={{ color:"#fff",fontWeight:700,fontSize:20,marginBottom:4 }}>Log Masuk</h2>
          <p style={{ color:"#94a3b8",fontSize:13,marginBottom:22 }}>Selamat kembali!</p>
          {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠️ {error}</div>}
          <form onSubmit={handleLogin} style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label style={{ color:"#94a3b8" }}>Email</label>
              <input className="input" type="email" placeholder="email@example.com" autoComplete="email"
                style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
                value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
            </div>
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                <label style={{ color:"#94a3b8",margin:0 }}>Kata Laluan</label>
                <button type="button" onClick={()=>{ setForgotEmail(form.email); setView("forgot"); setError(""); }}
                  style={{ background:"none",border:"none",color:"#4ade80",fontSize:12,cursor:"pointer",fontWeight:600,padding:0 }}>
                  Lupa kata laluan?
                </button>
              </div>
              <input className="input" type="password" placeholder="••••••••" autoComplete="current-password"
                style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
                value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:"100%",padding:13,fontSize:15,marginTop:4 }}>
              {loading?<><span className="spinner" style={{ width:15,height:15 }}/> Log masuk...</>:"Log Masuk →"}
            </button>
          </form>
          <p style={{ textAlign:"center",marginTop:18,fontSize:13,color:"#64748b" }}>
            Belum ada akaun?{" "}<Link to="/register" style={{ color:"#4ade80",fontWeight:600 }}>Daftar sekarang</Link>
          </p>
        </>}

        {/* ── Forgot Password ── */}
        {view==="forgot" && <>
          <button onClick={()=>{ setView("login"); setError(""); }} style={{ background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:13,marginBottom:16,padding:0,display:"flex",alignItems:"center",gap:5 }}>
            ← Kembali
          </button>
          <h2 style={{ color:"#fff",fontWeight:700,fontSize:20,marginBottom:4 }}>Lupa Kata Laluan?</h2>
          <p style={{ color:"#94a3b8",fontSize:13,marginBottom:22 }}>Masukkan email anda dan kami akan hantar link reset.</p>
          {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠️ {error}</div>}
          <form onSubmit={handleForgot} style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label style={{ color:"#94a3b8" }}>Email</label>
              <input className="input" type="email" placeholder="email@example.com" autoComplete="email"
                style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
                value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:"100%",padding:13,fontSize:15 }}>
              {loading?<><span className="spinner" style={{ width:15,height:15 }}/> Menghantar...</>:"📧 Hantar Link Reset"}
            </button>
          </form>
        </>}

        {/* ── Forgot Sent ── */}
        {view==="forgot_sent" && <>
          <div style={{ textAlign:"center",padding:"16px 0" }}>
            <div style={{ fontSize:52,marginBottom:14 }}>📬</div>
            <h2 style={{ color:"#fff",fontWeight:700,fontSize:20,marginBottom:10 }}>Email Dihantar!</h2>
            <p style={{ color:"#94a3b8",fontSize:14,lineHeight:1.6,marginBottom:24 }}>
              Kami telah menghantar link reset ke <strong style={{ color:"#e2e8f0" }}>{forgotEmail}</strong>.<br/>
              Sila semak inbox atau folder spam anda.
            </p>
            <p style={{ color:"#64748b",fontSize:12,marginBottom:20 }}>Link sah selama 1 jam.</p>
            <button onClick={()=>{ setView("login"); setError(""); }} className="btn btn-secondary" style={{ width:"100%" }}>
              ← Kembali ke Login
            </button>
          </div>
        </>}

        {/* ── Email Not Verified ── */}
        {view==="verify_notice" && <>
          <div style={{ textAlign:"center",padding:"16px 0" }}>
            <div style={{ fontSize:52,marginBottom:14 }}>📧</div>
            <h2 style={{ color:"#fff",fontWeight:700,fontSize:20,marginBottom:10 }}>Sahkan Email Anda</h2>
            <p style={{ color:"#94a3b8",fontSize:14,lineHeight:1.6,marginBottom:24 }}>
              Sila klik link pengesahan yang telah dihantar ke <strong style={{ color:"#e2e8f0" }}>{unverifiedEmail}</strong> semasa mendaftar.
            </p>
            <button onClick={resendVerification} disabled={resending} className="btn btn-outline" style={{ width:"100%",marginBottom:12,color:"#4ade80",borderColor:"#4ade80" }}>
              {resending?<><span className="spinner spinner-dark" style={{ width:14,height:14 }}/> Menghantar...</>:"🔄 Hantar Semula Email"}
            </button>
            <button onClick={()=>{ setView("login"); setError(""); }} style={{ background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:13,width:"100%" }}>
              ← Kembali ke Login
            </button>
          </div>
        </>}

      </div>
    </div>
  );
}
