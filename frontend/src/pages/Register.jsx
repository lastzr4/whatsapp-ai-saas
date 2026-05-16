import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api.js";

export default function Register() {
  const [form, setForm]       = useState({ name:"", email:"", password:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data = await api("POST","/auth/register",form);
      if (data.requiresVerification) {
        setDone(true);
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify({ name:data.name, email:data.email }));
        navigate("/dashboard");
      }
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

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

        <div className="card" style={{ padding:28 }}>
          {!done ? <>
            <h2 style={{ fontWeight:700, fontSize:19, marginBottom:4 }}>Buat Akaun</h2>
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:20 }}>Mulakan bot WhatsApp AI anda hari ini</p>
            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13.5, color:"#dc2626" }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label className="form-label">Nama Penuh</label>
                <div style={{ position:"relative" }}>
                  <UserIcon size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
                  <input className="input" placeholder="Nama anda" autoComplete="name"
                    style={{ paddingLeft:38 }} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="form-label">Email</label>
                <div style={{ position:"relative" }}>
                  <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
                  <input className="input" type="email" placeholder="email@example.com" autoComplete="email"
                    style={{ paddingLeft:38 }} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="form-label">Kata Laluan</label>
                <div style={{ position:"relative" }}>
                  <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
                  <input className="input" type="password" placeholder="Minimum 6 aksara" autoComplete="new-password"
                    style={{ paddingLeft:38 }} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} minLength={6} required />
                </div>
              </div>
              <button className="btn btn-default btn-lg" type="submit" disabled={loading} style={{ width:"100%", marginTop:4 }}>
                {loading ? <><span className="spinner spinner-white" style={{ width:16,height:16 }} /> Mendaftar...</> : "Daftar & Mula →"}
              </button>
            </form>
            <p style={{ textAlign:"center", marginTop:18, fontSize:13, color:"var(--muted)" }}>
              Sudah ada akaun?{" "}<Link to="/login" style={{ color:"var(--green-dark)", fontWeight:600, textDecoration:"none" }}>Log masuk</Link>
            </p>
          </> : (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ width:56, height:56, borderRadius:14, background:"var(--green-bg)", border:"1px solid var(--green-border)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <Mail size={26} style={{ color:"var(--green-dark)" }} />
              </div>
              <h2 style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Semak Email Anda!</h2>
              <p style={{ fontSize:13.5, color:"var(--muted)", lineHeight:1.6, marginBottom:6 }}>
                Link pengesahan dihantar ke <strong style={{ color:"var(--text)" }}>{form.email}</strong>
              </p>
              <p style={{ fontSize:12, color:"var(--muted)", marginBottom:22 }}>Klik link dalam email untuk aktifkan akaun. Semak juga folder spam.</p>
              <Link to="/login" className="btn btn-secondary" style={{ display:"block", textAlign:"center", textDecoration:"none", width:"100%", padding:"10px" }}>
                ← Kembali ke Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
