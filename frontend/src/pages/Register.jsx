import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Register() {
  const [form, setForm]       = useState({ name:"", email:"", password:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await api("POST","/auth/register",form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({ name:data.name, email:data.email }));
      navigate("/dashboard");
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f2027 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,#25d366,#128c5e)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:"0 6px 20px rgba(37,211,102,.4)",marginBottom:14 }}>🤖</div>
        <h1 style={{ color:"#fff",fontWeight:800,fontSize:22,marginBottom:4 }}>Buat Akaun Baru</h1>
        <p style={{ color:"#94a3b8",fontSize:14 }}>Mulakan bot WhatsApp AI anda hari ini</p>
      </div>

      <div style={{ width:"100%",maxWidth:380,background:"rgba(255,255,255,.06)",backdropFilter:"blur(20px)",borderRadius:20,padding:28,border:"1px solid rgba(255,255,255,.1)" }}>
        {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <div>
            <label style={{ color:"#94a3b8" }}>Nama Penuh</label>
            <input className="input" placeholder="Nama anda" autoComplete="name"
              style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
              value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          </div>
          <div>
            <label style={{ color:"#94a3b8" }}>Email</label>
            <input className="input" type="email" placeholder="email@example.com" autoComplete="email"
              style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
              value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
          </div>
          <div>
            <label style={{ color:"#94a3b8" }}>Kata Laluan</label>
            <input className="input" type="password" placeholder="Minimum 6 aksara" autoComplete="new-password"
              style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
              value={form.password} onChange={e=>setForm({...form,password:e.target.value})} minLength={6} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width:"100%",padding:13,fontSize:15,marginTop:4 }}>
            {loading ? <><span className="spinner" style={{ width:16,height:16 }}/> Mendaftar...</> : "Daftar & Mula →"}
          </button>
        </form>

        <p style={{ textAlign:"center",marginTop:20,fontSize:14,color:"#64748b" }}>
          Sudah ada akaun?{" "}
          <Link to="/login" style={{ color:"#4ade80",fontWeight:600 }}>Log masuk</Link>
        </p>
      </div>
    </div>
  );
}
