import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Mail, Lock, Eye, EyeOff, ArrowLeft, Send, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";
import { getGoogleClientId, onGoogleReady } from "../lib/googleAuth.js";

// ── Google Button ─────────────────────────────────────────────────────────────
function GoogleBtn({ onSuccess }) {
  const [gid, setGid] = useState(() => getGoogleClientId());
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const divRef = useState(null);

  useEffect(() => {
    // Wait for client ID
    if (gid) { loadGoogle(gid); }
    else { onGoogleReady(id => { if (id) { setGid(id); loadGoogle(id); } }); }
  }, []);

  function loadGoogle(clientId) {
    const load = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setLoading(true);
          try { const d = await api("POST", "/auth/google", { credential }); onSuccess(d); }
          catch(e) { alert(e.message); }
          finally { setLoading(false); }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setReady(true);
    };

    if (window.google?.accounts) { load(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = load;
    document.head.appendChild(s);
  }

  function handleClick() {
    if (!gid || !window.google) return;
    window.google.accounts.id.prompt();
  }

  if (!gid) return null;

  return (
    <>
      <button type="button" onClick={handleClick} disabled={loading || !ready}
        style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"11px 16px",borderRadius:10,border:"1.5px solid #e4e4e7",background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,color:"#374151",transition:"box-shadow .15s",boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}
        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.12)"}
        onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.06)"}>
        {loading
          ? <span className="spinner" style={{ width:18,height:18,borderColor:"rgba(0,0,0,.1)",borderTopColor:"#4285F4" }}/>
          : <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        }
        Teruskan dengan Google
      </button>
      <div style={{ display:"flex",alignItems:"center",gap:10,margin:"16px 0" }}>
        <div style={{ flex:1,height:1,background:"#e4e4e7" }}/>
        <span style={{ fontSize:12,color:"#71717a",fontWeight:500 }}>atau</span>
        <div style={{ flex:1,height:1,background:"#e4e4e7" }}/>
      </div>
    </>
  );
}

// ── Auth Card ─────────────────────────────────────────────────────────────────
function AuthCard({ children }) {
  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,background:"#f4f4f5" }}>
      <div style={{ width:"100%",maxWidth:400 }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <Link to="/" style={{ textDecoration:"none" }}>
            <div style={{ width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:"0 6px 20px rgba(34,197,94,.3)" }}>
              <Bot size={26} color="#fff"/>
            </div>
            <div style={{ fontWeight:800,fontSize:20,color:"#0f172a",marginBottom:3 }}>JomReply<span style={{ color:"#22c55e" }}>.ai</span></div>
          </Link>
          <p style={{ fontSize:13,color:"#71717a" }}>Bot WhatsApp AI Platform</p>
        </div>
        <div className="card" style={{ padding:28 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Main Login ────────────────────────────────────────────────────────────────
export default function Login() {
  const [form, setForm]     = useState({ email:"", password:"" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView]     = useState("login");
  const [forgotEmail, setForgotEmail]         = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  function handleSuccess(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify({ name:data.name, email:data.email, is_admin:data.is_admin }));
    navigate(data.is_admin ? "/admin" : "/dashboard");
  }

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError("");
    try { handleSuccess(await api("POST","/auth/login",form)); }
    catch(err) {
      if (err.message?.includes("sahkan")) { setUnverifiedEmail(form.email); setView("verify_notice"); }
      else setError(err.message);
    }
    finally { setLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault(); setLoading(true); setError("");
    try { await api("POST","/auth/forgot-password",{ email:forgotEmail }); setView("forgot_sent"); }
    catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function resend() {
    setResending(true);
    try { await api("POST","/auth/resend-verification",{ email:unverifiedEmail }); alert("Email dihantar semula!"); }
    catch(err) { alert(err.message); }
    finally { setResending(false); }
  }

  return (
    <AuthCard>
      {view==="login" && <>
        <h2 style={{ fontWeight:700,fontSize:19,marginBottom:4 }}>Log Masuk</h2>
        <p style={{ fontSize:13,color:"#71717a",marginBottom:20 }}>Selamat kembali!</p>
        <GoogleBtn onSuccess={handleSuccess}/>
        {error && <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13.5,color:"#dc2626" }}><AlertCircle size={15}/> {error}</div>}
        <form onSubmit={handleLogin} style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label className="form-label">Email</label>
            <div style={{ position:"relative" }}>
              <Mail size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#71717a" }}/>
              <input className="input" type="email" placeholder="email@example.com" autoComplete="email"
                style={{ paddingLeft:38 }} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
            </div>
          </div>
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
              <label className="form-label" style={{ margin:0 }}>Kata Laluan</label>
              <button type="button" onClick={()=>{ setForgotEmail(form.email); setView("forgot"); setError(""); }}
                style={{ background:"none",border:"none",color:"#16a34a",fontSize:12.5,cursor:"pointer",fontWeight:500 }}>
                Lupa kata laluan?
              </button>
            </div>
            <div style={{ position:"relative" }}>
              <Lock size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#71717a" }}/>
              <input className="input" type={showPw?"text":"password"} placeholder="••••••••" autoComplete="current-password"
                style={{ paddingLeft:38,paddingRight:42 }} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/>
              <button type="button" onClick={()=>setShowPw(p=>!p)}
                style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#71717a",display:"flex" }}>
                {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </div>
          <button className="btn btn-default btn-lg" type="submit" disabled={loading} style={{ width:"100%",marginTop:4 }}>
            {loading?<><span className="spinner spinner-white" style={{ width:16,height:16 }}/> Memproses...</>:"Log Masuk →"}
          </button>
        </form>
        <p style={{ textAlign:"center",marginTop:18,fontSize:13,color:"#71717a" }}>
          Belum ada akaun?{" "}<Link to="/register" style={{ color:"#16a34a",fontWeight:600,textDecoration:"none" }}>Daftar sekarang</Link>
        </p>
      </>}

      {view==="forgot" && <>
        <button onClick={()=>{ setView("login"); setError(""); }}
          style={{ display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:"#71717a",cursor:"pointer",fontSize:13,marginBottom:18,padding:0 }}>
          <ArrowLeft size={14}/> Kembali
        </button>
        <h2 style={{ fontWeight:700,fontSize:19,marginBottom:4 }}>Lupa Kata Laluan?</h2>
        <p style={{ fontSize:13,color:"#71717a",marginBottom:20 }}>Masukkan email untuk reset kata laluan.</p>
        {error && <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13.5,color:"#dc2626" }}><AlertCircle size={15}/> {error}</div>}
        <form onSubmit={handleForgot} style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label className="form-label">Email</label>
            <div style={{ position:"relative" }}>
              <Mail size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#71717a" }}/>
              <input className="input" type="email" placeholder="email@example.com" style={{ paddingLeft:38 }}
                value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required/>
            </div>
          </div>
          <button className="btn btn-default btn-lg" type="submit" disabled={loading} style={{ width:"100%" }}>
            {loading?<><span className="spinner spinner-white" style={{ width:16,height:16 }}/> Menghantar...</>:<><Send size={15}/> Hantar Link Reset</>}
          </button>
        </form>
      </>}

      {view==="forgot_sent" && (
        <div style={{ textAlign:"center",padding:"8px 0" }}>
          <div style={{ width:56,height:56,borderRadius:14,background:"#f0fdf4",border:"1px solid #bbf7d0",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
            <Mail size={26} style={{ color:"#16a34a" }}/>
          </div>
          <h2 style={{ fontWeight:700,fontSize:18,marginBottom:8 }}>Email Dihantar!</h2>
          <p style={{ fontSize:13.5,color:"#71717a",lineHeight:1.6,marginBottom:22 }}>
            Link reset dihantar ke <strong style={{ color:"#0f172a" }}>{forgotEmail}</strong>.<br/>Sah 1 jam. Semak folder spam.
          </p>
          <button onClick={()=>{ setView("login"); setError(""); }} className="btn btn-secondary" style={{ width:"100%" }}>
            <ArrowLeft size={14}/> Kembali ke Login
          </button>
        </div>
      )}

      {view==="verify_notice" && (
        <div style={{ textAlign:"center",padding:"8px 0" }}>
          <div style={{ width:56,height:56,borderRadius:14,background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
            <Mail size={26} style={{ color:"#3b82f6" }}/>
          </div>
          <h2 style={{ fontWeight:700,fontSize:18,marginBottom:8 }}>Sahkan Email Anda</h2>
          <p style={{ fontSize:13.5,color:"#71717a",lineHeight:1.6,marginBottom:20 }}>
            Dihantar ke <strong style={{ color:"#0f172a" }}>{unverifiedEmail}</strong>.<br/>Semak inbox atau folder spam.
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            <button onClick={resend} disabled={resending} className="btn btn-outline" style={{ width:"100%" }}>
              {resending?<><span className="spinner" style={{ width:14,height:14 }}/> Menghantar...</>:<><RefreshCw size={14}/> Hantar Semula</>}
            </button>
            <button onClick={()=>{ setView("login"); setError(""); }} className="btn btn-ghost" style={{ width:"100%",fontSize:13 }}>
              <ArrowLeft size={13}/> Kembali ke Login
            </button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
