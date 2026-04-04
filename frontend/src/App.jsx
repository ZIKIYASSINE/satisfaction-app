import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

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

const getDeviceId = () => {
  let id = localStorage.getItem("arwa_device");
  if (!id) { id = Math.random().toString(36).substr(2,16); localStorage.setItem("arwa_device",id); }
  return id;
};

const getColor = p => p>=75?"#16a34a":p>=50?"#d97706":"#dc2626";
const getBg    = p => p>=75?"#dcfce7":p>=50?"#fef3c7":"#fee2e2";
const getLabel = p => p>=75?"Bien":p>=50?"Moyen":"À améliorer";

/* ─── UI Primitives ─────────────────────────────────────────────────────────── */
const Bar = ({ pct, h=6 }) => (
  <div style={{height:h,background:"#e2e8f0",borderRadius:3,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:getColor(pct),borderRadius:3,transition:"width .5s ease"}}/>
  </div>
);

const Badge = ({ status }) => (
  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500,
    background:status==="active"?"#dcfce7":"#f1f5f9",
    color:status==="active"?"#16a34a":"#64748b"}}>
    {status==="active"?"Actif":"Fermé"}
  </span>
);

const Btn = ({ onClick, disabled, variant="ghost", children, style={} }) => {
  const base = {padding:"8px 16px",borderRadius:8,fontSize:13,cursor:disabled?"not-allowed":"pointer",fontWeight:500,border:"1px solid",transition:"opacity .15s",...style};
  const variants = {
    primary:  {...base,background:"#0e5ba8",color:"#fff",borderColor:"#0e5ba8",opacity:disabled?.5:1},
    danger:   {...base,background:"transparent",color:"#dc2626",borderColor:"#fecaca"},
    confirm:  {...base,background:"#dc2626",color:"#fff",borderColor:"#dc2626"},
    ghost:    {...base,background:"transparent",color:"#475569",borderColor:"#e2e8f0"},
    info:     {...base,background:"transparent",color:"#185fa5",borderColor:"#b5d4f4"},
  };
  return <button onClick={onClick} disabled={disabled} style={variants[variant]}>{children}</button>;
};

/* ─── Star / Emoji Picker ───────────────────────────────────────────────────── */
function EmojiPicker({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const active = hover ?? value;
  return (
    <div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={()=>onChange(n)} onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(null)}
            style={{width:52,height:52,borderRadius:10,cursor:"pointer",fontSize:22,
              border:`2px solid ${active>=n?"#0e5ba8":"#e2e8f0"}`,
              background:active>=n?"#e6f1fb":"#f8f9fa",transition:"all .12s"}}>
            {EMOJIS[n-1]}
          </button>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#64748b"}}>
        <span>Très insatisfait</span>
        {active && <span style={{fontWeight:500,color:"#0e5ba8"}}>{LABELS[active-1]}</span>}
        <span>Très satisfait</span>
      </div>
    </div>
  );
}

/* ─── SURVEY PAGE ───────────────────────────────────────────────────────────── */
function SurveyPage({ exerciseId, onBack }) {
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [answers, setAnswers]   = useState({});
  const [done, setDone]         = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ex = await api.getExercise(exerciseId);
        setExercise(ex);
        const alreadyDone = localStorage.getItem(`done_${exerciseId}`);
        if (alreadyDone) setDone(true);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [exerciseId]);

  const submit = async () => {
    const qs = exercise.questions;
    if (Object.keys(answers).length < qs.length) return;
    setSubmitting(true);
    try {
      const scores = qs.map(q => answers[q.id] || 0);
      const pct    = Math.round((scores.reduce((a,b)=>a+b,0) / (qs.length*5)) * 100);
      await api.submitResponse(exerciseId, {
        answers, percentage: pct, deviceHash: getDeviceId()
      });
      localStorage.setItem(`done_${exerciseId}`, "1");
      setDone(true);
    } catch (e) {
      if (e.message === "Déjà répondu") { setDone(true); return; }
      alert("Erreur : " + e.message);
    } finally { setSubmitting(false); }
  };

  const wrap = children => (
    <div style={{minHeight:"100vh",background:"#f8f9fa",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 16px"}}>
      <div style={{width:"100%",maxWidth:600}}>
        {onBack && (
          <button onClick={onBack} style={{marginBottom:24,background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:13}}>
            ← Retour admin
          </button>
        )}
        {children}
      </div>
    </div>
  );

  if (loading) return wrap(<div style={{textAlign:"center",padding:60,color:"#64748b"}}>Chargement...</div>);
  if (error)   return wrap(<StateCard icon="🔗" title="Lien invalide" sub={error}/>);
  if (exercise?.status==="closed") return wrap(<StateCard icon="🔒" title="Enquête fermée" sub="Cette enquête est terminée."/>);
  if (done)    return wrap(<StateCard icon="✅" title="Merci pour votre réponse !" sub="Votre évaluation a bien été enregistrée." green/>);

  const total    = exercise.questions.length;
  const answered = Object.keys(answers).length;

  return wrap(
    <div>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{display:"inline-flex",gap:1,marginBottom:12}}>
          <span style={{fontWeight:700,fontSize:24,color:"#0e5ba8"}}>ARWA</span>
          <span style={{fontWeight:700,fontSize:24,color:"#008000"}}>MEDIC</span>
        </div>
        <h1 style={{fontSize:18,fontWeight:600,color:"#1a1a2e",marginBottom:4}}>Enquête de Satisfaction</h1>
        <p style={{color:"#64748b",fontSize:13}}>{exercise.title} — {MONTHS_FR[exercise.month]} {exercise.year}</p>
        <div style={{maxWidth:240,margin:"16px auto 0"}}>
          <div style={{height:4,background:"#e2e8f0",borderRadius:2}}>
            <div style={{height:"100%",width:`${Math.round((answered/total)*100)}%`,background:"#0e5ba8",borderRadius:2,transition:"width .3s"}}/>
          </div>
          <p style={{fontSize:11,color:"#64748b",marginTop:4}}>{answered}/{total} questions</p>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {exercise.questions.map((q,i) => (
          <div key={q.id} style={{background:"#fff",border:`1px solid ${answers[q.id]?"#b5d4f4":"#e2e8f0"}`,borderRadius:12,padding:"20px 24px",transition:"border-color .2s"}}>
            <p style={{fontWeight:600,fontSize:14,color:"#1a1a2e",marginBottom:16}}>
              <span style={{color:"#0e5ba8",marginRight:8}}>Q{i+1}.</span>{q.text}
            </p>
            <EmojiPicker value={answers[q.id]||0} onChange={v=>setAnswers(p=>({...p,[q.id]:v}))}/>
          </div>
        ))}
      </div>

      <div style={{textAlign:"center",marginTop:28}}>
        <Btn onClick={submit} disabled={submitting||answered<total} variant="primary"
          style={{padding:"13px 48px",fontSize:14,width:"100%",maxWidth:320}}>
          {submitting?"Envoi...":"Soumettre mon évaluation"}
        </Btn>
        <p style={{fontSize:11,color:"#94a3b8",marginTop:10}}>Réponses anonymes et confidentielles</p>
      </div>
    </div>
  );
}

function StateCard({ icon, title, sub, green }) {
  return (
    <div style={{textAlign:"center",padding:"60px 24px",background:"#fff",borderRadius:16,border:"1px solid #e2e8f0"}}>
      <div style={{width:72,height:72,borderRadius:"50%",background:green?"#dcfce7":"#f1f5f9",
        display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:32}}>
        {icon}
      </div>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:8}}>{title}</h2>
      <p style={{color:"#64748b",fontSize:14}}>{sub}</p>
      {green && <p style={{color:"#0e5ba8",fontWeight:600,marginTop:20,fontSize:13}}>ARWAMEDIC — DSI</p>}
    </div>
  );
}

/* ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────── */
function AdminApp({ onPreview }) {
  const [tab, setTab]         = useState("dashboard");
  const [exercises, setExercises] = useState([]);
  const [respMap, setRespMap] = useState({});
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const now = new Date();
  const [form, setForm] = useState({
    title:"", month:now.getMonth(), year:now.getFullYear(), questions:[...DEFAULT_QUESTIONS]
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exs, st] = await Promise.all([api.getExercises(), api.getStats(now.getFullYear())]);
      setExercises(exs);
      setStats(st);
      const map = {};
      await Promise.all(exs.map(async ex => {
        map[ex.id] = await api.getResponses(ex.id);
      }));
      setRespMap(map);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createExercise = async () => {
    if (!form.title.trim()) return;
    try {
      const ex = await api.createExercise(form);
      setExercises(p => [ex, ...p]);
      setRespMap(p => ({...p, [ex.id]:[]}));
      setForm({ title:"", month:now.getMonth(), year:now.getFullYear(), questions:[...DEFAULT_QUESTIONS] });
      setTab("exercises");
      await load();
    } catch(e) { alert(e.message); }
  };

  const toggleStatus = async (id, current) => {
    const next = current==="active"?"closed":"active";
    try {
      const updated = await api.updateStatus(id, next);
      setExercises(p => p.map(e => e.id===id ? updated : e));
    } catch(e) { alert(e.message); }
  };

  const deleteEx = async (id) => {
    try {
      await api.deleteExercise(id);
      setExercises(p => p.filter(e => e.id!==id));
      setRespMap(p => { const n={...p}; delete n[id]; return n; });
      setDeleteConfirm(null);
      await load();
    } catch(e) { alert(e.message); }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}${import.meta.env.BASE_URL}#survey/${id}`;
    navigator.clipboard.writeText(link).catch(()=>{});
    setCopiedId(id); setTimeout(()=>setCopiedId(null), 2000);
  };

  const getLink = id => `${window.location.origin}${import.meta.env.BASE_URL}#survey/${id}`;

  const calcStats = (responses=[]) => {
    if (!responses.length) return { count:0, avg:0 };
    return { count:responses.length, avg:Math.round(responses.reduce((a,r)=>a+r.percentage,0)/responses.length) };
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #e2e8f0",borderTopColor:"#0e5ba8",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/>
        <p style={{color:"#64748b"}}>Chargement...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f8f9fa"}}>
      {/* Topbar */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 24px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:8,background:"#0e5ba8",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </div>
            <div>
              <div style={{display:"flex",gap:1}}>
                <span style={{fontWeight:700,fontSize:15,color:"#0e5ba8"}}>ARWA</span>
                <span style={{fontWeight:700,fontSize:15,color:"#008000"}}>MEDIC</span>
              </div>
              <p style={{fontSize:10,color:"#64748b",margin:0}}>Satisfaction Utilisateur — DSI</p>
            </div>
          </div>
          <Btn onClick={()=>setTab("create")} variant="primary" style={{padding:"8px 18px"}}>+ Nouvel exercice</Btn>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 24px"}}>
        {/* Tabs */}
        <div style={{display:"flex",gap:2,marginBottom:28,background:"#fff",borderRadius:10,padding:4,border:"1px solid #e2e8f0",width:"fit-content"}}>
          {[["dashboard","📊 Tableau de bord"],["exercises","📋 Exercices"],["create","➕ Créer"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"8px 20px",borderRadius:8,border:"none",
              background:tab===t?"#0e5ba8":"transparent",
              color:tab===t?"#fff":"#475569",
              fontWeight:tab===t?500:400,fontSize:13,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && stats && (
          <div>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:28}}>
              {[
                {l:"Satisfaction globale",v:`${stats.globalAvg}%`,s:"Toutes périodes",c:stats.totalResponses>0?getColor(stats.globalAvg):undefined},
                {l:"Réponses totales",v:stats.totalResponses,s:`${stats.totalExercises} exercice(s)`},
                {l:"Exercices actifs",v:exercises.filter(e=>e.status==="active").length,s:"En cours"},
                {l:"Exercices fermés",v:exercises.filter(e=>e.status==="closed").length,s:"Archivés"},
              ].map(c=>(
                <div key={c.l} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:16,textAlign:"center"}}>
                  <p style={{fontSize:11,color:"#64748b",margin:"0 0 6px"}}>{c.l}</p>
                  <p style={{fontSize:28,fontWeight:700,color:c.c||"#1a1a2e",margin:"0 0 2px"}}>{c.v}</p>
                  <p style={{fontSize:11,color:"#94a3b8",margin:0}}>{c.s}</p>
                </div>
              ))}
            </div>

            {/* Quarterly */}
            <h2 style={{fontSize:13,color:"#64748b",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.6}}>
              Rapport trimestriel {stats.year}
            </h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))",gap:14,marginBottom:32}}>
              {Object.entries(stats.quarters).map(([q,s])=>{
                const months = QUARTERS[q].map(m=>MONTHS_FR[m].slice(0,3));
                return (
                  <div key={q} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div>
                        <p style={{fontWeight:600,fontSize:15,color:"#1a1a2e",margin:"0 0 2px"}}>{q} {stats.year}</p>
                        <p style={{fontSize:11,color:"#64748b",margin:0}}>{months.join(" · ")}</p>
                      </div>
                      {s.count>0 && (
                        <span style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:getBg(s.avg),color:getColor(s.avg),fontWeight:600}}>
                          {getLabel(s.avg)}
                        </span>
                      )}
                    </div>
                    {s.count>0?(
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
                    ):(
                      <p style={{color:"#94a3b8",fontSize:12,textAlign:"center",paddingTop:16}}>
                        {s.exercises>0?"Aucune réponse":"Aucun exercice"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recent exercises */}
            <h2 style={{fontSize:13,color:"#64748b",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.6}}>Exercices récents</h2>
            {exercises.slice(0,5).map(ex=>{
              const s=calcStats(respMap[ex.id]);
              return (
                <div key={ex.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,marginBottom:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <p style={{fontWeight:500,fontSize:14,color:"#1a1a2e",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.title}</p>
                      <Badge status={ex.status}/>
                    </div>
                    <p style={{fontSize:12,color:"#64748b",margin:0}}>{MONTHS_FR[ex.month]} {ex.year} · {s.count} réponse{s.count!==1?"s":""}</p>
                  </div>
                  <span style={{fontSize:22,fontWeight:700,color:s.count>0?getColor(s.avg):"#cbd5e1",marginLeft:16}}>
                    {s.count>0?`${s.avg}%`:"—"}
                  </span>
                </div>
              );
            })}
            {exercises.length===0 && (
              <div style={{textAlign:"center",padding:40,color:"#64748b"}}>
                Aucun exercice.{" "}
                <button onClick={()=>setTab("create")} style={{color:"#0e5ba8",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                  Créer le premier →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── EXERCISES ── */}
        {tab==="exercises" && (
          <div>
            {exercises.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 0"}}>
                <p style={{color:"#64748b",marginBottom:16}}>Aucun exercice créé.</p>
                <Btn onClick={()=>setTab("create")} variant="primary">Créer mon premier exercice</Btn>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {exercises.map(ex=>{
                  const resps = respMap[ex.id]||[];
                  const s = calcStats(resps);
                  const link = getLink(ex.id);
                  const perQuestion = (ex.questions||[]).map(q=>{
                    if (!resps.length) return {q,avg:0};
                    const vals = resps.map(r=>(r.answers||{})[q.id]||0);
                    return {q, avg:Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100/5)};
                  });

                  return (
                    <div key={ex.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"22px 24px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <h3 style={{fontSize:15,fontWeight:600,color:"#1a1a2e",margin:0}}>{ex.title}</h3>
                            <Badge status={ex.status}/>
                          </div>
                          <p style={{fontSize:12,color:"#64748b",margin:0}}>{MONTHS_FR[ex.month]} {ex.year} · {s.count} réponse{s.count!==1?"s":""}</p>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <p style={{fontSize:26,fontWeight:700,color:s.count>0?getColor(s.avg):"#cbd5e1",margin:"0 0 3px"}}>{s.count>0?`${s.avg}%`:"—"}</p>
                          {s.count>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:getBg(s.avg),color:getColor(s.avg),fontWeight:600}}>{getLabel(s.avg)}</span>}
                        </div>
                      </div>

                      {s.count>0&&(
                        <div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:6}}>
                          {perQuestion.map(({q,avg})=>(
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

                      {/* Link row */}
                      <div style={{display:"flex",gap:8,alignItems:"center",background:"#f8f9fa",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <span style={{fontSize:11,color:"#64748b",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link}</span>
                        <button onClick={()=>copyLink(ex.id)} style={{padding:"4px 12px",borderRadius:6,border:"1px solid #e2e8f0",background:copiedId===ex.id?"#dcfce7":"#fff",color:copiedId===ex.id?"#16a34a":"#475569",fontSize:11,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>
                          {copiedId===ex.id?"✓ Copié":"Copier"}
                        </button>
                      </div>

                      {/* Actions */}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <Btn onClick={()=>toggleStatus(ex.id,ex.status)} variant="ghost">
                          {ex.status==="active"?"Fermer l'enquête":"Réactiver"}
                        </Btn>
                        <Btn onClick={()=>onPreview(ex.id)} variant="info">Prévisualiser</Btn>
                        {deleteConfirm===ex.id?(
                          <>
                            <Btn onClick={()=>deleteEx(ex.id)} variant="confirm">Confirmer</Btn>
                            <Btn onClick={()=>setDeleteConfirm(null)} variant="ghost">Annuler</Btn>
                          </>
                        ):(
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

        {/* ── CREATE ── */}
        {tab==="create" && (
          <div style={{maxWidth:560}}>
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:28}}>
              <h2 style={{fontSize:16,fontWeight:600,color:"#1a1a2e",marginBottom:24}}>Nouvel exercice de satisfaction</h2>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:6,fontWeight:500}}>Titre de l'exercice *</label>
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
                <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:10,fontWeight:500}}>Questions de l'enquête ({form.questions.length})</label>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {form.questions.map((q,i)=>(
                    <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#f8f9fa",borderRadius:8,border:"1px solid #e2e8f0"}}>
                      <span style={{fontSize:11,color:"#0e5ba8",fontWeight:600,minWidth:18}}>{i+1}</span>
                      <span style={{fontSize:13,color:"#1a1a2e",flex:1,lineHeight:1.4}}>{q.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:"#eff6ff",borderRadius:8,padding:"12px 14px",marginBottom:20,borderLeft:"3px solid #0e5ba8"}}>
                <p style={{fontSize:12,color:"#64748b",margin:"0 0 3px",fontWeight:500}}>Lien qui sera généré</p>
                <p style={{fontSize:11,color:"#0e5ba8",margin:0,wordBreak:"break-all"}}>
                  {window.location.origin}{import.meta.env.BASE_URL}#survey/<em style={{color:"#94a3b8"}}>[id-unique]</em>
                </p>
              </div>

              <Btn onClick={createExercise} disabled={!form.title.trim()} variant="primary"
                style={{width:"100%",padding:"13px",fontSize:14,justifyContent:"center",display:"block"}}>
                Créer l'exercice et générer le lien →
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView]       = useState("admin");
  const [surveyId, setSurveyId] = useState(null);

  useEffect(()=>{
    const parse = ()=>{
      const h = window.location.hash.replace("#","");
      if (h.startsWith("survey/")) { setSurveyId(h.replace("survey/","")); setView("survey"); }
      else { setView("admin"); setSurveyId(null); }
    };
    parse();
    window.addEventListener("hashchange", parse);
    return ()=>window.removeEventListener("hashchange", parse);
  },[]);

  if (view==="survey") return (
    <SurveyPage exerciseId={surveyId} onBack={()=>{ window.location.hash=""; }}/>
  );
  return <AdminApp onPreview={id=>{ window.location.hash=`survey/${id}`; }}/>;
}
