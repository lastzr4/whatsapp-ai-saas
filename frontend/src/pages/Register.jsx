import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Mail, Lock, Eye, EyeOff, User as UserIcon, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";

function useGoogleClientId() {
  const [gid, setGid] = useState(null);
  useEffect(() => {
    fetch("/api/auth/google-config")
      .then(r => r.json())
      .then(d => setGid(d.clientId || ""))
      .catch(() => setGid(""));
  }, []);
  return gid;
}

function GoogleBtn({ label, onSuccess }) {
  const gid = useGoogleClientId();
  const [loading, setLoading] = useState(false);

  if (!gid) return null;

  function handleClick() {
    function init() {
      window.google.accounts.id.initialize({
        client_id: gid,
        callback: async ({ credential }) => {
          setLoading(true);
          try { const d = await api("POST", "/auth/google", { credential }); onSuccess(d); }
          catch(e) { alert(e.message); }
          setLoading(false);
        },
      });
      window.google.accounts.id.prompt();
    }
    if (window.google) { init(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = init;
    document.head.appendChild(s);
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={loading}
        style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"11px 16px",borderRadius:10,border:"1.5px solid var(--border)",background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,color:"#374151",transition:"all .15s" }}
        onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
        {loading
          ? <span className="spinner" style={{ width:18,height:18,borderColor:"rgba(0,0,0,.1)",borderTopColor:"#374151" }} />
          : <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        }
        {label}
      </button>
      <div style={{ display:"flex",alignItems:"center",gap:10,margin:"18px 0" }}>
        <div style={{ flex:1,height:1,background:"var(--border)" }} />
        <span style={{ fontSize:12,color:"var(--muted)",fontWeight:500 }}>atau daftar dengan email</span>
        <div style={{ flex:1,height:1,background:"var(--border)" }} />
      </div>
    </>
  );
}

export default function Register() {
  const [form, setForm]       = useState({ name:"", email:"", password:"" });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [doneEmail, setDoneEmail] = useState("");
  const navigate = useNavigate();

  function handleSuccess(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify({ name:data.name, email:data.email, is_admin:data.is_admin }));
    navigate("/dashboard");
  }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data = await api("POST","/auth/register",form);
      if (data.requiresVerification) { setDoneEmail(form.email); setDone(true); }
      else handleSuccess(data);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (done) return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,background:"#f4f4f5" }}>
      <div style={{ width:"100%",maxWidth:400 }}>
        <div className="card" style={{ padding:32,textAlign:"center" }}>
          <div style={{ width:64,height:64,borderRadius:18,background:"var(--green-bg)",border:"1px solid var(--green-border)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
            <Mail size={30} style={{ color:"var(--green-dark)" }} />
          </div>
          <h2 style={{ fontWeight:800,fontSize:20,marginBottom:8 }}>Semak Email Anda! 📬</h2>
          <div style={{ background:"var(--muted-bg)",borderRadius:8,padding:"10px 16px",marginBottom:16,fontWeight:700,fontSize:14 }}>{doneEmail}</div>
          <div style={{ background:"var(--green-bg)",borderRadius:10,padding:"12px 16px",marginBottom:20,border:"1px solid var(--green-border)" }}>
            <p style={{ fontSize:13,color:"var(--green-dark)",margin:0,lineHeight:1.6 }}>
              ✅ Klik link dalam email untuk aktifkan akaun.<br/>
              📁 Semak folder <strong>Spam</strong> jika tidak jumpa.
            </p>
          </div>
          <Link to="/login"><button className="btn btn-default btn-lg" style={{ width:"100%" }}>Kembali ke Login →</button></Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,background:"#f4f4f5" }}>
      <div style={{ width:"100%",maxWidth:400 }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <Link to="/" style={{ textDecoration:"none" }}>
            <div style={{ width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:"0 6px 20px rgba(34,197,94,.3)" }}>
              <Bot size={26} color="#fff" />
            </div>
            <div style={{ fontWeight:800,fontSize:20,color:"#0f172a",marginBottom:3 }}>JomReply<span style={{ color:"#22c55e" }}>.ai</span></div>
          </Link>
          <p style={{ fontSize:13,color:"var(--muted)" }}>Bot WhatsApp AI Platform</p>
        </div>
        <div className="card" style={{ padding:28 }}>
          <h2 style={{ fontWeight:700,fontSize:19,marginBottom:4 }}>Buat Akaun</h2>
          <p style={{ fontSize:13,color:"var(--muted)",marginBottom:20 }}>Mulakan bot WhatsApp AI anda hari ini</p>
          <GoogleBtn label="Daftar dengan Google" onSuccess={handleSuccess} />
          {error && (
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13.5,color:"#dc2626" }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label className="form-label">Nama Penuh</label>
              <div style={{ position:"relative" }}>
                <UserIcon size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"var(--muted)" }} />
                <input className="input" placeholder="Nama anda" autoComplete="name" style={{ paddingLeft:38 }}
                  value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
              </div>
            </div>
            <div>
              <label className="form-label">Email</label>
              <div style={{ position:"relative" }}>
                <Mail size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"var(--muted)" }} />
                <input className="input" type="email" placeholder="email@example.com" autoComplete="email" style={{ paddingLeft:38 }}
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
              </div>
            </div>
            <div>
              <label className="form-label">Kata Laluan</label>
              <div style={{ position:"relative" }}>
                <Lock size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"var(--muted)" }} />
                <input className="input" type={showPw?"text":"password"} placeholder="Minimum 6 aksara" autoComplete="new-password"
                  style={{ paddingLeft:38,paddingRight:42 }} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} minLength={6} required />
                <button type="button" onClick={()=>setShowPw(p=>!p)}
                  style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex" }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button className="btn btn-default btn-lg" type="submit" disabled={loading} style={{ width:"100%",marginTop:4 }}>
              {loading ? <><span className="spinner spinner-white" style={{ width:16,height:16 }}/> Mendaftar...</> : "Daftar & Mula →"}
            </button>
          </form>
          <p style={{ textAlign:"center",marginTop:14,fontSize:13,color:"var(--muted)" }}>
            Sudah ada akaun?{" "}<Link to="/login" style={{ color:"var(--green-dark)",fontWeight:600,textDecoration:"none" }}>Log masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
