import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DEFAULT_QUESTIONS = [
  { id:"q1", text:"Satisfaction globale avec le support informatique" },
  { id:"q2", text:"Qualité et rapidité des interventions" },
  { id:"q3", text:"Disponibilité des systèmes et applications" },
  { id:"q4", text:"Facilité d'utilisation des outils mis à disposition" },
  { id:"q5", text:"Communication et suivi des demandes" },
];
const EMOJIS = ["😞","😕","😐","🙂","😄"];
const LABELS = ["Très insatisfait","Insatisfait","Neutre","Satisfait","Très satisfait"];
const QUARTERS = { Q1:[0,1,2], Q2:[3,4,5], Q3:[6,7,8], Q4:[9,10,11] };

const getColor = p => p>=75?"#16a34a":p>=50?"#d97706":"#dc2626";
const getBg    = p => p>=75?"#dcfce7":p>=50?"#fef3c7":"#fee2e2";
const getLabel = p => p>=75?"Bien":p>=50?"Moyen":"À améliorer";

/* ── Primitives ─────────────────────────────────────────────────────────────── */
const Bar = ({ pct, h=6 }) => (
  <div style={{height:h,background:"#e2e8f0",borderRadius:3,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:getColor(pct),borderRadius:3,transition:"width .5s"}}/>
  </div>
);

const Btn = ({ onClick, disabled, variant="ghost", children, style={} }) => {
  const variants = {
    primary: {background:"#0e5ba8",color:"#fff",border:"none",opacity:disabled?.5:1},
    danger:  {background:"transparent",color:"#dc2626",border:"1px solid #fecaca"},
    confirm: {background:"#dc2626",color:"#fff",border:"none"},
    ghost:   {background:"transparent",color:"#475569",border:"1px solid #e2e8f0"},
    info:    {background:"transparent",color:"#185fa5",border:"1px solid #b5d4f4"},
    success: {background:"transparent",color:"#16a34a",border:"1px solid #bbf7d0"},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{padding:"8px 16px",borderRadius:8,fontSize:13,cursor:disabled?"not-allowed":"pointer",
        fontWeight:500,transition:"opacity .15s",...variants[variant],...style}}>
      {children}
    </button>
  );
};

/* ── LOGIN PAGE ─────────────────────────────────────────────────────────────── */
function LoginPage({ onLogin }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem("arwa_token", token);
      localStorage.setItem("arwa_user", JSON.stringify(user));
      onLogin(user);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:2,marginBottom:12}}>
            <span style={{fontWeight:800,fontSize:28,color:"#0e5ba8",letterSpacing:-1}}>ARWA</span>
            <span style={{fontWeight:800,fontSize:28,color:"#008000",letterSpacing:-1}}>MEDIC</span>
          </div>
          <p style={{color:"#64748b",fontSize:14,margin:0}}>Plateforme de Satisfaction Utilisateur</p>
        </div>

        <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",padding:32}}>
          <h2 style={{fontSize:18,fontWeight:600,color:"#1a1a2e",marginBottom:24,textAlign:"center"}}>Connexion</h2>

          {error && (
            <div style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#dc2626"}}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:6,fontWeight:500}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="votre@email.com" required/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:6,fontWeight:500}}>Mot de passe</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••" required/>
            </div>
            <button type="submit" disabled={loading}
              style={{width:"100%",padding:"12px",borderRadius:8,border:"none",
                background:loading?"#94a3b8":"#0e5ba8",color:"#fff",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer"}}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"#94a3b8",marginTop:16}}>
          ARWAMEDIC — Direction des Systèmes d'Information
        </p>
      </div>
    </div>
  );
}

/* ── EMOJI PICKER ────────────────────────────────────────────────────────────── */
function EmojiPicker({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const active = hover ?? value;
  return (
    <div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>onChange(n)}
            onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(null)}
            style={{width:52,height:52,borderRadius:10,cursor:"pointer",fontSize:22,
              border:`2px solid ${active>=n?"#0e5ba8":"#e2e8f0"}`,
              background:active>=n?"#e6f1fb":"#f8f9fa",transition:"all .12s"}}>
            {EMOJIS[n-1]}
          </button>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#64748b"}}>
        <span>Très insatisfait</span>
        {active>0 && <span style={{fontWeight:500,color:"#0e5ba8"}}>{LABELS[active-1]}</span>}
        <span>Très satisfait</span>
      </div>
    </div>
  );
}

/* ── SURVEY PAGE (user) ──────────────────────────────────────────────────────── */
function SurveyPage({ exerciseId, user, onBack }) {
  const [exercise, setExercise]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [answers, setAnswers]     = useState({});
  const [done, setDone]           = useState(false);
  const [existing, setExisting]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  useEffect(()=>{
    (async()=>{
      try {
        const [ex, myResp] = await Promise.all([
          api.getExercise(exerciseId),
          api.myResponse(exerciseId),
        ]);
        setExercise(ex);
        if (myResp) { setExisting(myResp); setDone(true); }
      } catch(e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [exerciseId]);

  const submit = async () => {
    const qs = exercise.questions;
    if (Object.keys(answers).length < qs.length) return;
    setSubmitting(true);
    try {
      const scores = qs.map(q=>answers[q.id]||0);
      const pct = Math.round((scores.reduce((a,b)=>a+b,0)/(qs.length*5))*100);
      await api.submitResponse(exerciseId, { answers, percentage:pct });
      setDone(true);
    } catch(e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const wrap = ch => (
    <div style={{minHeight:"100vh",background:"#f8f9fa",padding:"32px 16px"}}>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        {/* Header bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,
          background:"#fff",borderRadius:12,padding:"12px 20px",border:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",gap:1}}>
            <span style={{fontWeight:700,fontSize:14,color:"#0e5ba8"}}>ARWA</span>
            <span style={{fontWeight:700,fontSize:14,color:"#008000"}}>MEDIC</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:12,color:"#64748b"}}>👤 {user.name}</span>
            {onBack && <Btn onClick={onBack} variant="ghost" style={{padding:"4px 10px",fontSize:11}}>← Retour</Btn>}
          </div>
        </div>
        {ch}
      </div>
    </div>
  );

  if (loading) return wrap(<div style={{textAlign:"center",padding:60,color:"#64748b"}}>Chargement...</div>);
  if (error)   return wrap(
    <div style={{textAlign:"center",padding:60}}>
      <div style={{fontSize:40,marginBottom:16}}>🔗</div>
      <h2 style={{color:"#1a1a2e",marginBottom:8}}>Lien invalide</h2>
      <p style={{color:"#64748b"}}>{error}</p>
    </div>
  );
  if (exercise?.status==="closed") return wrap(
    <div style={{textAlign:"center",padding:60,background:"#fff",borderRadius:16,border:"1px solid #e2e8f0"}}>
      <div style={{fontSize:40,marginBottom:16}}>🔒</div>
      <h2 style={{color:"#1a1a2e",marginBottom:8}}>Enquête fermée</h2>
      <p style={{color:"#64748b"}}>Cette enquête est terminée.</p>
    </div>
  );
  if (done) return wrap(
    <div style={{textAlign:"center",padding:60,background:"#fff",borderRadius:16,border:"1px solid #e2e8f0"}}>
      <div style={{width:72,height:72,borderRadius:"50%",background:"#dcfce7",display:"flex",alignItems:"center",
        justifyContent:"center",margin:"0 auto 20px",fontSize:32}}>✅</div>
      <h2 style={{color:"#1a1a2e",marginBottom:8}}>Merci, {user.name} !</h2>
      <p style={{color:"#64748b",marginBottom:16}}>Votre évaluation a été enregistrée.</p>
      {existing && (
        <div style={{display:"inline-block",background:"#f0fdf4",borderRadius:12,padding:"12px 24px",border:"1px solid #bbf7d0"}}>
          <p style={{fontSize:13,color:"#64748b",margin:"0 0 4px"}}>Votre score</p>
          <p style={{fontSize:32,fontWeight:700,color:getColor(existing.percentage),margin:0}}>{existing.percentage}%</p>
        </div>
      )}
    </div>
  );

  const total    = exercise.questions.length;
  const answered = Object.keys(answers).length;
  return wrap(
    <div>
      <div style={{textAlign:"center",marginBottom:28}}>
        <h1 style={{fontSize:18,fontWeight:600,color:"#1a1a2e",marginBottom:4}}>{exercise.title}</h1>
        <p style={{color:"#64748b",fontSize:13}}>{MONTHS_FR[exercise.month]} {exercise.year}</p>
        <div style={{maxWidth:240,margin:"14px auto 0"}}>
          <div style={{height:4,background:"#e2e8f0",borderRadius:2}}>
            <div style={{height:"100%",width:`${Math.round((answered/total)*100)}%`,background:"#0e5ba8",borderRadius:2,transition:"width .3s"}}/>
          </div>
          <p style={{fontSize:11,color:"#64748b",marginTop:4}}>{answered}/{total} questions</p>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {exercise.questions.map((q,i)=>(
          <div key={q.id} style={{background:"#fff",border:`1px solid ${answers[q.id]?"#b5d4f4":"#e2e8f0"}`,
            borderRadius:12,padding:"20px 24px",transition:"border-color .2s"}}>
            <p style={{fontWeight:600,fontSize:14,color:"#1a1a2e",marginBottom:16}}>
              <span style={{color:"#0e5ba8",marginRight:8}}>Q{i+1}.</span>{q.text}
            </p>
            <EmojiPicker value={answers[q.id]||0} onChange={v=>setAnswers(p=>({...p,[q.id]:v}))}/>
          </div>
        ))}
      </div>

      <div style={{textAlign:"center",marginTop:24}}>
        <Btn onClick={submit} disabled={submitting||answered<total} variant="primary"
          style={{padding:"13px 48px",fontSize:14,width:"100%",maxWidth:320}}>
          {submitting?"Envoi...":"Soumettre mon évaluation"}
        </Btn>
        <p style={{fontSize:11,color:"#94a3b8",marginTop:10}}>Réponse enregistrée sous votre identifiant</p>
      </div>
    </div>
  );
}

/* ── ADMIN APP ───────────────────────────────────────────────────────────────── */
function AdminApp({ user, onLogout, initialSurveyId }) {
  const [tab, setTab]         = useState(initialSurveyId ? "survey" : "dashboard");
  const [surveyId, setSurveyId] = useState(initialSurveyId);
  const [exercises, setExercises] = useState([]);
  const [users, setUsers]     = useState([]);
  const [respMap, setRespMap] = useState({});
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId]       = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [resetPwd, setResetPwd]       = useState(null);
  const [newPwd, setNewPwd]           = useState("");
  const [userForm, setUserForm] = useState({ name:"", email:"", password:"" });
  const [userFormErr, setUserFormErr] = useState("");
  const now = new Date();
  const [form, setForm] = useState({
    title:"", month:now.getMonth(), year:now.getFullYear(), questions:[...DEFAULT_QUESTIONS]
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exs, uss, st] = await Promise.all([
        api.getExercises(), api.getUsers(), api.getStats(now.getFullYear())
      ]);
      setExercises(exs); setUsers(uss); setStats(st);
      const map = {};
      await Promise.all(exs.map(async ex => { map[ex.id] = await api.getResponses(ex.id); }));
      setRespMap(map);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  // If came via survey link, show survey view for admin too
  if (tab==="survey" && surveyId) return (
    <SurveyPage exerciseId={surveyId} user={user}
      onBack={()=>{ setSurveyId(null); setTab("dashboard"); }}/>
  );

  const createExercise = async () => {
    if (!form.title.trim()) return;
    try {
      const ex = await api.createExercise(form);
      setExercises(p=>[ex,...p]);
      setRespMap(p=>({...p,[ex.id]:[]}));
      setForm({ title:"", month:now.getMonth(), year:now.getFullYear(), questions:[...DEFAULT_QUESTIONS] });
      setTab("exercises");
      await load();
    } catch(e) { alert(e.message); }
  };

  const createUser = async () => {
    setUserFormErr("");
    if (!userForm.name||!userForm.email||!userForm.password) { setUserFormErr("Tous les champs sont requis"); return; }
    try {
      const u = await api.createUser(userForm);
      setUsers(p=>[u,...p]);
      setUserForm({ name:"", email:"", password:"" });
      setShowUserForm(false);
    } catch(e) { setUserFormErr(e.message); }
  };

  const doResetPwd = async () => {
    if (!newPwd) return;
    try {
      await api.resetPassword(resetPwd, newPwd);
      setResetPwd(null); setNewPwd("");
      alert("Mot de passe mis à jour !");
    } catch(e) { alert(e.message); }
  };

  const deleteUser = async (id) => {
    try { await api.deleteUser(id); setUsers(p=>p.filter(u=>u.id!==id)); setDeleteUserConfirm(null); }
    catch(e) { alert(e.message); }
  };

  const toggleStatus = async (id, current) => {
    try {
      const updated = await api.updateStatus(id, current==="active"?"closed":"active");
      setExercises(p=>p.map(e=>e.id===id?updated:e));
    } catch(e) { alert(e.message); }
  };

  const deleteEx = async (id) => {
    try {
      await api.deleteExercise(id);
      setExercises(p=>p.filter(e=>e.id!==id));
      setDeleteConfirm(null);
      await load();
    } catch(e) { alert(e.message); }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}${import.meta.env.BASE_URL}#survey/${id}`;
    navigator.clipboard.writeText(link).catch(()=>{});
    setCopiedId(id); setTimeout(()=>setCopiedId(null), 2500);
  };

  const getLink = id => `${window.location.origin}${import.meta.env.BASE_URL}#survey/${id}`;

  const calcStats = (responses=[]) => {
    if (!responses.length) return { count:0, avg:0 };
    return { count:responses.length, avg:Math.round(responses.reduce((a,r)=>a+r.percentage,0)/responses.length) };
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #e2e8f0",borderTopColor:"#0e5ba8",
          borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/>
        <p style={{color:"#64748b"}}>Chargement...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const regularUsers = users.filter(u=>u.role==="user");

  return (
    <div style={{minHeight:"100vh",background:"#f8f9fa"}}>
      {/* Topbar */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 24px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:8,background:"#0e5ba8",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </div>
            <div>
              <div style={{display:"flex",gap:1}}>
                <span style={{fontWeight:700,fontSize:15,color:"#0e5ba8"}}>ARWA</span>
                <span style={{fontWeight:700,fontSize:15,color:"#008000"}}>MEDIC</span>
              </div>
              <p style={{fontSize:10,color:"#64748b",margin:0}}>Admin — Satisfaction Utilisateur</p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:12,color:"#64748b"}}>👤 {user.name}</span>
            <Btn onClick={onLogout} variant="ghost" style={{padding:"6px 12px",fontSize:12}}>Déconnexion</Btn>
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"24px"}}>
        {/* Tabs */}
        <div style={{display:"flex",gap:2,marginBottom:24,background:"#fff",borderRadius:10,padding:4,
          border:"1px solid #e2e8f0",width:"fit-content"}}>
          {[["dashboard","📊 Dashboard"],["exercises","📋 Exercices"],["users","👥 Utilisateurs"],["create","➕ Créer"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",borderRadius:8,border:"none",
              background:tab===t?"#0e5ba8":"transparent",color:tab===t?"#fff":"#475569",
              fontWeight:tab===t?500:400,fontSize:13,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && stats && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:28}}>
              {[
                {l:"Satisfaction globale",v:`${stats.globalAvg}%`,s:"Toutes périodes",c:stats.totalResponses>0?getColor(stats.globalAvg):undefined},
                {l:"Réponses totales",v:stats.totalResponses,s:`${stats.totalExercises} exercice(s)`},
                {l:"Utilisateurs",v:stats.totalUsers,s:"Comptes actifs"},
                {l:"Exercices actifs",v:exercises.filter(e=>e.status==="active").length,s:"En cours"},
              ].map(c=>(
                <div key={c.l} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:16,textAlign:"center"}}>
                  <p style={{fontSize:11,color:"#64748b",margin:"0 0 6px"}}>{c.l}</p>
                  <p style={{fontSize:28,fontWeight:700,color:c.c||"#1a1a2e",margin:"0 0 2px"}}>{c.v}</p>
                  <p style={{fontSize:11,color:"#94a3b8",margin:0}}>{c.s}</p>
                </div>
              ))}
            </div>

            <h2 style={{fontSize:13,color:"#64748b",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.6}}>
              Rapport trimestriel {stats.year}
            </h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:28}}>
              {Object.entries(stats.quarters).map(([q,s])=>{
                const months=QUARTERS[q].map(m=>MONTHS_FR[m].slice(0,3));
                return (
                  <div key={q} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div>
                        <p style={{fontWeight:600,fontSize:15,color:"#1a1a2e",margin:"0 0 2px"}}>{q} {stats.year}</p>
                        <p style={{fontSize:11,color:"#64748b",margin:0}}>{months.join(" · ")}</p>
                      </div>
                      {s.count>0 && <span style={{fontSize:10,padding:"3px 8px",borderRadius:20,
                        background:getBg(s.avg),color:getColor(s.avg),fontWeight:600}}>{getLabel(s.avg)}</span>}
                    </div>
                    {s.count>0 ? (
                      <>
                        <Bar pct={s.avg}/>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,alignItems:"baseline"}}>
                          <span style={{fontSize:30,fontWeight:700,color:getColor(s.avg)}}>{s.avg}%</span>
                          <div style={{textAlign:"right"}}>
                            <p style={{fontSize:11,color:"#64748b",margin:0}}>{s.count} réponse{s.count!==1?"s":""}</p>
                            <p style={{fontSize:11,color:"#64748b",margin:0}}>{s.exercises} exercice{s.exercises!==1?"s":""}</p>
                          </div>
                        </div>
                      </>
                    ) : <p style={{color:"#94a3b8",fontSize:12,textAlign:"center",paddingTop:12}}>Aucune donnée</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── EXERCISES ── */}
        {tab==="exercises" && (
          <div>
            {exercises.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 0"}}>
                <p style={{color:"#64748b",marginBottom:16}}>Aucun exercice.</p>
                <Btn onClick={()=>setTab("create")} variant="primary">Créer le premier</Btn>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {exercises.map(ex=>{
                  const resps = respMap[ex.id]||[];
                  const s = calcStats(resps);
                  const link = getLink(ex.id);
                  const pq = (ex.questions||[]).map(q=>{
                    if (!resps.length) return {q,avg:0};
                    const vals=resps.map(r=>(r.answers||{})[q.id]||0);
                    return {q, avg:Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100/5)};
                  });

                  return (
                    <div key={ex.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"22px 24px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <h3 style={{fontSize:15,fontWeight:600,color:"#1a1a2e",margin:0}}>{ex.title}</h3>
                            <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500,
                              background:ex.status==="active"?"#dcfce7":"#f1f5f9",
                              color:ex.status==="active"?"#16a34a":"#64748b"}}>
                              {ex.status==="active"?"Actif":"Fermé"}
                            </span>
                          </div>
                          <p style={{fontSize:12,color:"#64748b",margin:0}}>
                            {MONTHS_FR[ex.month]} {ex.year} · {s.count}/{regularUsers.length} réponses
                          </p>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <p style={{fontSize:26,fontWeight:700,color:s.count>0?getColor(s.avg):"#cbd5e1",margin:"0 0 3px"}}>
                            {s.count>0?`${s.avg}%`:"—"}
                          </p>
                          {s.count>0 && <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,
                            background:getBg(s.avg),color:getColor(s.avg),fontWeight:600}}>{getLabel(s.avg)}</span>}
                        </div>
                      </div>

                      {s.count>0 && (
                        <div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:6}}>
                          {pq.map(({q,avg})=>(
                            <div key={q.id}>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:3}}>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"82%"}}>{q.text}</span>
                                <span style={{fontWeight:600,color:"#1a1a2e"}}>{avg}%</span>
                              </div>
                              <Bar pct={avg} h={4}/>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Réponses par utilisateur */}
                      {resps.length>0 && (
                        <div style={{marginBottom:16}}>
                          <p style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:.4}}>
                            Réponses nominatives
                          </p>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {resps.map(r=>(
                              <div key={r.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",
                                background:"#f8f9fa",borderRadius:20,border:"1px solid #e2e8f0"}}>
                                <span style={{width:6,height:6,borderRadius:"50%",background:getColor(r.percentage),display:"inline-block"}}/>
                                <span style={{fontSize:11,color:"#1a1a2e"}}>{r.user_name}</span>
                                <span style={{fontSize:11,fontWeight:600,color:getColor(r.percentage)}}>{r.percentage}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Link */}
                      <div style={{display:"flex",gap:8,alignItems:"center",background:"#f8f9fa",
                        borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        <span style={{fontSize:11,color:"#64748b",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link}</span>
                        <button onClick={()=>copyLink(ex.id)} style={{padding:"4px 12px",borderRadius:6,
                          border:"1px solid #e2e8f0",
                          background:copiedId===ex.id?"#dcfce7":"#fff",
                          color:copiedId===ex.id?"#16a34a":"#475569",
                          fontSize:11,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>
                          {copiedId===ex.id?"✓ Copié":"Copier le lien"}
                        </button>
                      </div>

                      {/* Actions */}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <Btn onClick={()=>toggleStatus(ex.id,ex.status)} variant="ghost">
                          {ex.status==="active"?"Fermer l'enquête":"Réactiver"}
                        </Btn>
                        {deleteConfirm===ex.id ? (
                          <>
                            <Btn onClick={()=>deleteEx(ex.id)} variant="confirm">Confirmer</Btn>
                            <Btn onClick={()=>setDeleteConfirm(null)} variant="ghost">Annuler</Btn>
                          </>
                        ) : (
                          <Btn onClick={()=>setDeleteConfirm(ex.id)} variant="danger">Supprimer</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {tab==="users" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <p style={{fontSize:13,color:"#64748b",margin:0}}>{regularUsers.length} utilisateur(s)</p>
              <Btn onClick={()=>setShowUserForm(p=>!p)} variant="primary">+ Ajouter un utilisateur</Btn>
            </div>

            {showUserForm && (
              <div style={{background:"#fff",border:"1px solid #b5d4f4",borderRadius:12,padding:20,marginBottom:16}}>
                <h3 style={{fontSize:14,fontWeight:600,color:"#1a1a2e",marginBottom:16}}>Nouveau compte utilisateur</h3>
                {userFormErr && (
                  <div style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,
                    padding:"8px 12px",marginBottom:12,fontSize:12,color:"#dc2626"}}>
                    {userFormErr}
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
                  <div>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>Nom complet *</label>
                    <input value={userForm.name} onChange={e=>setUserForm(p=>({...p,name:e.target.value}))} placeholder="Prénom Nom"/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>Email *</label>
                    <input type="email" value={userForm.email} onChange={e=>setUserForm(p=>({...p,email:e.target.value}))} placeholder="email@arwamedic.ma"/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:500}}>Mot de passe *</label>
                    <input type="password" value={userForm.password} onChange={e=>setUserForm(p=>({...p,password:e.target.value}))} placeholder="••••••••"/>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn onClick={createUser} variant="primary">Créer le compte</Btn>
                  <Btn onClick={()=>{setShowUserForm(false);setUserFormErr("");}} variant="ghost">Annuler</Btn>
                </div>
              </div>
            )}

            {/* Reset password modal */}
            {resetPwd && (
              <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:20,marginBottom:16}}>
                <h3 style={{fontSize:14,fontWeight:600,color:"#1a1a2e",marginBottom:12}}>
                  Réinitialiser le mot de passe de {users.find(u=>u.id===resetPwd)?.name}
                </h3>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <input type="text" value={newPwd} onChange={e=>setNewPwd(e.target.value)}
                    placeholder="Nouveau mot de passe" style={{maxWidth:280}}/>
                  <Btn onClick={doResetPwd} variant="primary">Confirmer</Btn>
                  <Btn onClick={()=>{setResetPwd(null);setNewPwd("");}} variant="ghost">Annuler</Btn>
                </div>
              </div>
            )}

            {regularUsers.length===0 ? (
              <div style={{textAlign:"center",padding:"40px 0",color:"#64748b"}}>
                Aucun utilisateur. Ajoutez des comptes pour leur envoyer des enquêtes.
              </div>
            ) : (
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"#f8f9fa",borderBottom:"1px solid #e2e8f0"}}>
                      {["Nom","Email","Créé le","Actions"].map(h=>(
                        <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,
                          color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regularUsers.map((u,i)=>(
                      <tr key={u.id} style={{borderBottom:i<regularUsers.length-1?"1px solid #e2e8f0":"none"}}>
                        <td style={{padding:"12px 16px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:32,height:32,borderRadius:"50%",background:"#e6f1fb",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:12,fontWeight:600,color:"#0e5ba8"}}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{fontSize:13,fontWeight:500,color:"#1a1a2e"}}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{padding:"12px 16px",fontSize:13,color:"#64748b"}}>{u.email}</td>
                        <td style={{padding:"12px 16px",fontSize:12,color:"#94a3b8"}}>
                          {new Date(u.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td style={{padding:"12px 16px"}}>
                          <div style={{display:"flex",gap:6}}>
                            <Btn onClick={()=>setResetPwd(u.id)} variant="ghost" style={{padding:"4px 10px",fontSize:11}}>
                              🔑 Mot de passe
                            </Btn>
                            {deleteUserConfirm===u.id ? (
                              <>
                                <Btn onClick={()=>deleteUser(u.id)} variant="confirm" style={{padding:"4px 10px",fontSize:11}}>Confirmer</Btn>
                                <Btn onClick={()=>setDeleteUserConfirm(null)} variant="ghost" style={{padding:"4px 10px",fontSize:11}}>Annuler</Btn>
                              </>
                            ) : (
                              <Btn onClick={()=>setDeleteUserConfirm(u.id)} variant="danger" style={{padding:"4px 10px",fontSize:11}}>Supprimer</Btn>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE ── */}
        {tab==="create" && (
          <div style={{maxWidth:560}}>
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:28}}>
              <h2 style={{fontSize:16,fontWeight:600,color:"#1a1a2e",marginBottom:24}}>Nouvel exercice de satisfaction</h2>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:6,fontWeight:500}}>Titre *</label>
                <input type="text" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                  placeholder="Ex : Satisfaction DSI – Janvier 2026"/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                <div>
                  <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:6,fontWeight:500}}>Mois</label>
                  <select value={form.month} onChange={e=>setForm(p=>({...p,month:parseInt(e.target.value)}))}>
                    {MONTHS_FR.map((m,i)=><option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:6,fontWeight:500}}>Année</label>
                  <select value={form.year} onChange={e=>setForm(p=>({...p,year:parseInt(e.target.value)}))}>
                    {[2024,2025,2026,2027,2028].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:24}}>
                <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:10,fontWeight:500}}>
                  Questions ({form.questions.length})
                </label>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {form.questions.map((q,i)=>(
                    <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                      background:"#f8f9fa",borderRadius:8,border:"1px solid #e2e8f0"}}>
                      <span style={{fontSize:11,color:"#0e5ba8",fontWeight:600,minWidth:18}}>{i+1}</span>
                      <span style={{fontSize:13,color:"#1a1a2e",flex:1,lineHeight:1.4}}>{q.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:"#eff6ff",borderRadius:8,padding:"12px 14px",marginBottom:20,borderLeft:"3px solid #0e5ba8"}}>
                <p style={{fontSize:11,color:"#64748b",margin:"0 0 3px",fontWeight:500}}>💡 Workflow</p>
                <p style={{fontSize:11,color:"#1e40af",margin:0,lineHeight:1.5}}>
                  Créer l'exercice → Copier le lien → Envoyer aux utilisateurs par email.<br/>
                  Les utilisateurs doivent se connecter avec leur compte pour répondre.
                </p>
              </div>
              <Btn onClick={createExercise} disabled={!form.title.trim()} variant="primary"
                style={{width:"100%",padding:"13px",fontSize:14,display:"block"}}>
                Créer l'exercice et générer le lien →
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── USER APP (non-admin) ────────────────────────────────────────────────────── */
function UserApp({ user, onLogout, initialSurveyId }) {
  const [exercises, setExercises] = useState([]);
  const [myResponses, setMyResponses] = useState({});
  const [loading, setLoading]     = useState(true);
  const [activeSurvey, setActiveSurvey] = useState(initialSurveyId || null);

  useEffect(()=>{
    (async()=>{
      try {
        const exs = await api.getExercises();
        const active = exs.filter(e=>e.status==="active");
        setExercises(active);
        const map={};
        await Promise.all(active.map(async ex=>{
          map[ex.id] = await api.myResponse(ex.id);
        }));
        setMyResponses(map);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  },[]);

  if (activeSurvey) return (
    <SurveyPage exerciseId={activeSurvey} user={user}
      onBack={()=>setActiveSurvey(null)}/>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f8f9fa"}}>
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 24px"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",
          justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",gap:1}}>
            <span style={{fontWeight:700,fontSize:16,color:"#0e5ba8"}}>ARWA</span>
            <span style={{fontWeight:700,fontSize:16,color:"#008000"}}>MEDIC</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:12,color:"#64748b"}}>👤 {user.name}</span>
            <Btn onClick={onLogout} variant="ghost" style={{padding:"6px 12px",fontSize:12}}>Déconnexion</Btn>
          </div>
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"32px 24px"}}>
        <h1 style={{fontSize:18,fontWeight:600,color:"#1a1a2e",marginBottom:6}}>Mes enquêtes de satisfaction</h1>
        <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>
          Bonjour {user.name}, voici les enquêtes disponibles.
        </p>

        {loading ? (
          <p style={{color:"#64748b",textAlign:"center",padding:40}}>Chargement...</p>
        ) : exercises.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 0",background:"#fff",borderRadius:12,border:"1px solid #e2e8f0"}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <p style={{color:"#64748b"}}>Aucune enquête active pour le moment.</p>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {exercises.map(ex=>{
              const resp = myResponses[ex.id];
              return (
                <div key={ex.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"20px 24px",
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <h3 style={{fontSize:14,fontWeight:600,color:"#1a1a2e",margin:"0 0 4px"}}>{ex.title}</h3>
                    <p style={{fontSize:12,color:"#64748b",margin:0}}>{MONTHS_FR[ex.month]} {ex.year}</p>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    {resp ? (
                      <div style={{textAlign:"right"}}>
                        <p style={{fontSize:20,fontWeight:700,color:getColor(resp.percentage),margin:"0 0 2px"}}>{resp.percentage}%</p>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,
                          background:getBg(resp.percentage),color:getColor(resp.percentage),fontWeight:600}}>
                          Répondu ✓
                        </span>
                      </div>
                    ) : (
                      <Btn onClick={()=>setActiveSurvey(ex.id)} variant="primary">
                        Répondre →
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ROOT ────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser]     = useState(null);
  const [view, setView]     = useState("login");
  const [surveyId, setSurveyId] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(()=>{
    const parse = ()=>{
      const h = window.location.hash.replace("#","");
      if (h.startsWith("survey/")) setSurveyId(h.replace("survey/",""));
      else setSurveyId(null);
    };
    parse();
    window.addEventListener("hashchange", parse);
    // Check stored session
    const stored = localStorage.getItem("arwa_user");
    const token  = localStorage.getItem("arwa_token");
    if (stored && token) {
      const u = JSON.parse(stored);
      setUser(u);
      setView(u.role==="admin"?"admin":"user");
    }
    setChecking(false);
    return ()=>window.removeEventListener("hashchange", parse);
  },[]);

  const handleLogin = (u) => {
    setUser(u);
    setView(u.role==="admin"?"admin":"user");
  };

  const handleLogout = () => {
    localStorage.removeItem("arwa_token");
    localStorage.removeItem("arwa_user");
    setUser(null); setView("login");
    window.location.hash="";
  };

  if (checking) return null;
  if (view==="login") return <LoginPage onLogin={handleLogin}/>;
  if (view==="admin") return <AdminApp user={user} onLogout={handleLogout} initialSurveyId={surveyId}/>;
  return <UserApp user={user} onLogout={handleLogout} initialSurveyId={surveyId}/>;
}
