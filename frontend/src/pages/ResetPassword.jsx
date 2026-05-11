import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function ResetPassword() {
  const [params]          = useSearchParams();
  const navigate          = useNavigate();
  const token             = params.get("token");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    if (!token) navigate("/login");
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Kata laluan tidak sepadan");
    if (password.length < 6)  return setError("Kata laluan minimum 6 aksara");
    setLoading(true); setError("");
    try {
      await api("POST","/auth/reset-password",{ token, password });
      setDone(true);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f2027 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ textAlign:"center",marginBottom:24 }}>
        <div style={{ width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#25d366,#128c5e)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:12 }}>🔐</div>
        <h1 style={{ color:"#fff",fontWeight:800,fontSize:20 }}>WhatsApp AI Bot</h1>
      </div>

      <div style={{ width:"100%",maxWidth:380,background:"rgba(255,255,255,.06)",backdropFilter:"blur(20px)",borderRadius:20,padding:28,border:"1px solid rgba(255,255,255,.1)" }}>
        {!done ? <>
          <h2 style={{ color:"#fff",fontWeight:700,fontSize:20,marginBottom:4 }}>Set Kata Laluan Baru</h2>
          <p style={{ color:"#94a3b8",fontSize:13,marginBottom:22 }}>Masukkan kata laluan baru untuk akaun anda.</p>
          {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠️ {error}</div>}
          <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label style={{ color:"#94a3b8" }}>Kata Laluan Baru</label>
              <input className="input" type="password" placeholder="Minimum 6 aksara" autoComplete="new-password"
                style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff" }}
                value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            <div>
              <label style={{ color:"#94a3b8" }}>Sahkan Kata Laluan</label>
              <input className="input" type="password" placeholder="Taip semula kata laluan" autoComplete="new-password"
                style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff",borderColor:confirm&&confirm!==password?"#ef4444":"" }}
                value={confirm} onChange={e=>setConfirm(e.target.value)} required />
              {confirm && confirm !== password && <p style={{ color:"#ef4444",fontSize:12,marginTop:4 }}>Kata laluan tidak sepadan</p>}
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading||!password||password!==confirm} style={{ width:"100%",padding:13,fontSize:15,marginTop:4 }}>
              {loading?<><span className="spinner" style={{ width:15,height:15 }}/> Menyimpan...</>:"✅ Simpan Kata Laluan"}
            </button>
          </form>
        </> : (
          <div style={{ textAlign:"center",padding:"16px 0" }}>
            <div style={{ fontSize:52,marginBottom:14 }}>✅</div>
            <h2 style={{ color:"#fff",fontWeight:700,fontSize:20,marginBottom:10 }}>Kata Laluan Ditukar!</h2>
            <p style={{ color:"#94a3b8",fontSize:14,marginBottom:24,lineHeight:1.6 }}>Kata laluan anda berjaya ditukar. Sila log masuk dengan kata laluan baru.</p>
            <button className="btn btn-primary" style={{ width:"100%",padding:13 }} onClick={()=>navigate("/login")}>
              Log Masuk →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
