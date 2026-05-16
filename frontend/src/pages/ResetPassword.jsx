import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bot, Lock, CheckCircle2, AlertCircle } from "lucide-react";
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

  useEffect(() => { if (!token) navigate("/login"); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Kata laluan tidak sepadan");
    if (password.length < 6)  return setError("Kata laluan minimum 6 aksara");
    setLoading(true); setError("");
    try { await api("POST","/auth/reset-password",{ token, password }); setDone(true); }
    catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, background:"#f4f4f5" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#22c55e,#16a34a)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:14, boxShadow:"0 6px 20px rgba(34,197,94,.3)" }}>
            <Bot size={26} color="#fff" />
          </div>
          <h1 style={{ fontWeight:800, fontSize:20, marginBottom:3 }}>WhatsApp AI Bot</h1>
        </div>
        <div className="card" style={{ padding:28 }}>
          {!done ? <>
            <h2 style={{ fontWeight:700, fontSize:19, marginBottom:4 }}>Set Kata Laluan Baru</h2>
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:20 }}>Masukkan kata laluan baru untuk akaun anda.</p>
            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13.5, color:"#dc2626" }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label className="form-label">Kata Laluan Baru</label>
                <div style={{ position:"relative" }}>
                  <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
                  <input className="input" type="password" placeholder="Minimum 6 aksara" autoComplete="new-password"
                    style={{ paddingLeft:38 }} value={password} onChange={e=>setPassword(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="form-label">Sahkan Kata Laluan</label>
                <div style={{ position:"relative" }}>
                  <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }} />
                  <input className="input" type="password" placeholder="Taip semula" autoComplete="new-password"
                    style={{ paddingLeft:38, borderColor:confirm&&confirm!==password?"var(--red)":"" }}
                    value={confirm} onChange={e=>setConfirm(e.target.value)} required />
                </div>
                {confirm && confirm!==password && <p style={{ fontSize:12, color:"var(--red)", marginTop:4 }}>Kata laluan tidak sepadan</p>}
              </div>
              <button className="btn btn-default btn-lg" type="submit" disabled={loading||!password||password!==confirm} style={{ width:"100%", marginTop:4 }}>
                {loading ? <><span className="spinner spinner-white" style={{ width:16,height:16 }} /> Menyimpan...</> : "✅ Simpan Kata Laluan"}
              </button>
            </form>
          </> : (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ width:56, height:56, borderRadius:14, background:"var(--green-bg)", border:"1px solid var(--green-border)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <CheckCircle2 size={26} style={{ color:"var(--green-dark)" }} />
              </div>
              <h2 style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Kata Laluan Ditukar!</h2>
              <p style={{ fontSize:13.5, color:"var(--muted)", lineHeight:1.6, marginBottom:22 }}>Sila log masuk dengan kata laluan baru anda.</p>
              <button className="btn btn-default btn-lg" style={{ width:"100%" }} onClick={()=>navigate("/login")}>
                Log Masuk →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
