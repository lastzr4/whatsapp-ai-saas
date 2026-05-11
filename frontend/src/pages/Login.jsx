import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Login() {
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await api("POST", "/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({ name: data.name, email: data.email }));
      navigate("/dashboard");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f2027 100%)" }}>
      {/* Left panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, color:"#fff" }}>
        <div style={{ maxWidth:420 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:40 }}>
            <div style={{ width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#25d366,#128c5e)", display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 4px 16px rgba(37,211,102,.4)" }}>🤖</div>
            <div>
              <div style={{ fontWeight:800,fontSize:18 }}>WhatsApp AI Bot</div>
              <div style={{ fontSize:12,color:"#94a3b8" }}>SaaS Platform</div>
            </div>
          </div>
          <h1 style={{ fontSize:36,fontWeight:800,lineHeight:1.2,marginBottom:16 }}>
            Automate your<br/>
            <span style={{ background:"linear-gradient(135deg,#25d366,#4ade80)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>WhatsApp replies</span>
          </h1>
          <p style={{ color:"#94a3b8",fontSize:15,lineHeight:1.7,marginBottom:32 }}>
            Hubungkan WhatsApp anda dan biarkan AI menjawab pelanggan secara automatik 24/7.
          </p>
          {["✅ Setup dalam masa 2 minit","🤖 Dikuasakan oleh Claude AI","📚 Latih bot dengan info perniagaan anda","💳 Auto hantar QR bayaran"].map((f,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10,color:"#cbd5e1",fontSize:14 }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:460,display:"flex",alignItems:"center",justifyContent:"center",padding:32,background:"rgba(255,255,255,.03)",borderLeft:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ width:"100%",maxWidth:380 }}>
          <div style={{ background:"rgba(255,255,255,.05)",backdropFilter:"blur(20px)",borderRadius:20,padding:36,border:"1px solid rgba(255,255,255,.1)" }}>
            <h2 style={{ color:"#fff",fontWeight:700,fontSize:22,marginBottom:6 }}>Log Masuk</h2>
            <p style={{ color:"#94a3b8",fontSize:13,marginBottom:28 }}>Selamat kembali! Sila masuk untuk teruskan.</p>

            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div>
                <label style={{ color:"#94a3b8" }}>Email</label>
                <input className="input" type="email" placeholder="email@example.com"
                  style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
              </div>
              <div>
                <label style={{ color:"#94a3b8" }}>Kata Laluan</label>
                <input className="input" type="password" placeholder="••••••••"
                  style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
                  value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width:"100%",padding:"12px",marginTop:4,fontSize:14 }}>
                {loading ? <><span className="spinner" style={{ width:16,height:16 }}/> Sedang log masuk...</> : "Log Masuk →"}
              </button>
            </form>

            <p style={{ textAlign:"center",marginTop:20,fontSize:13,color:"#64748b" }}>
              Belum ada akaun?{" "}
              <Link to="/register" style={{ color:"#4ade80",fontWeight:600 }}>Daftar sekarang</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
