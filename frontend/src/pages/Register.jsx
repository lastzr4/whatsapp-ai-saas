import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Mail, Lock, Eye, EyeOff, User as UserIcon, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";
const GID = window.__ENV__?.GOOGLE_CLIENT_ID || "";

function GoogleBtn({ onSuccess }) {
  const divRef = React.useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!GID) return;
    function init() {
      window.google.accounts.id.initialize({
        client_id: GID,
        callback: async ({ credential }) => {
          setLoading(true);
          try { onSuccess(await api("POST", "/auth/google", { credential })); }
          catch(e) { alert(e.message); }
          finally { setLoading(false); }
        },
      });
      window.google.accounts.id.renderButton(divRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signup_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: divRef.current?.offsetWidth || 352,
      });
    }
    if (window.google?.accounts) { init(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, []);

  if (!GID) return null;

  return (
    <>
      <div style={{ position:"relative" }}>
        {loading && (
          <div style={{ position:"absolute",inset:0,background:"rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,zIndex:1 }}>
            <span className="spinner" style={{ width:20,height:20,borderColor:"rgba(0,0,0,.1)",borderTopColor:"#4285F4" }}/>
          </div>
        )}
        <div ref={divRef} style={{ width:"100%", minHeight:44 }}/>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:10,margin:"16px 0" }}>
        <div style={{ flex:1,height:1,background:"#e4e4e7" }}/>
        <span style={{ fontSize:12,color:"#71717a",fontWeight:500 }}>atau daftar dengan email</span>
        <div style={{ flex:1,height:1,background:"#e4e4e7" }}/>
      </div>
    </>
  );
}

export default function Register() {
  const [form, setForm]     = useState({ name:"", email:"", password:"" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
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
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"#f4f4f5" }}>
      <div style={{ width:"100%",maxWidth:400 }}>
        <div className="card" style={{ padding:32,textAlign:"center" }}>
          <div style={{ width:64,height:64,borderRadius:18,background:"#f0fdf4",border:"1px solid #bbf7d0",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
            <Mail size={30} style={{ color:"#16a34a" }}/>
          </div>
          <h2 style={{ fontWeight:800,fontSize:20,marginBottom:8 }}>Semak Email Anda! 📬</h2>
          <div style={{ background:"#f4f4f5",borderRadius:8,padding:"10px 16px",marginBottom:16,fontWeight:700,fontSize:14 }}>{doneEmail}</div>
          <div style={{ background:"#f0fdf4",borderRadius:10,padding:"12px 16px",marginBottom:20,border:"1px solid #bbf7d0" }}>
            <p style={{ fontSize:13,color:"#15803d",margin:0,lineHeight:1.6 }}>
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
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"#f4f4f5" }}>
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
        <div className="card" style={{ padding:28 }}>
          <h2 style={{ fontWeight:700,fontSize:19,marginBottom:4 }}>Buat Akaun</h2>
          <p style={{ fontSize:13,color:"#71717a",marginBottom:20 }}>Mulakan bot WhatsApp AI anda hari ini</p>
          <GoogleBtn onSuccess={handleSuccess}/>
          {error && <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13.5,color:"#dc2626" }}><AlertCircle size={15}/> {error}</div>}
          <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label className="form-label">Nama Penuh</label>
              <div style={{ position:"relative" }}>
                <UserIcon size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#71717a" }}/>
                <input className="input" placeholder="Nama anda" autoComplete="name" style={{ paddingLeft:38 }}
                  value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
              </div>
            </div>
            <div>
              <label className="form-label">Email</label>
              <div style={{ position:"relative" }}>
                <Mail size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#71717a" }}/>
                <input className="input" type="email" placeholder="email@example.com" autoComplete="email" style={{ paddingLeft:38 }}
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
              </div>
            </div>
            <div>
              <label className="form-label">Kata Laluan</label>
              <div style={{ position:"relative" }}>
                <Lock size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#71717a" }}/>
                <input className="input" type={showPw?"text":"password"} placeholder="Minimum 6 aksara" autoComplete="new-password"
                  style={{ paddingLeft:38,paddingRight:42 }} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} minLength={6} required/>
                <button type="button" onClick={()=>setShowPw(p=>!p)}
                  style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#71717a",display:"flex" }}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            <button className="btn btn-default btn-lg" type="submit" disabled={loading} style={{ width:"100%",marginTop:4 }}>
              {loading?<><span className="spinner spinner-white" style={{ width:16,height:16 }}/> Mendaftar...</>:"Daftar & Mula →"}
            </button>
          </form>
          <p style={{ textAlign:"center",marginTop:14,fontSize:13,color:"#71717a" }}>
            Sudah ada akaun?{" "}<Link to="/login" style={{ color:"#16a34a",fontWeight:600,textDecoration:"none" }}>Log masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
