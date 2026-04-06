require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "arwamedic_secret_2026";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      email               TEXT UNIQUE NOT NULL,
      password_hash       TEXT NOT NULL,
      role                TEXT NOT NULL DEFAULT 'user',
      must_change_password BOOLEAN NOT NULL DEFAULT true,
      last_login          TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS exercises (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      month       INTEGER NOT NULL,
      year        INTEGER NOT NULL,
      questions   JSONB NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Migration : ajouter must_change_password si colonne absente
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
  `).catch(()=>{});

  // Migration : ajouter comments si colonne absente
  await pool.query(`
    ALTER TABLE responses ADD COLUMN IF NOT EXISTS comments JSONB NOT NULL DEFAULT '{}';
  `).catch(()=>{});

  // Migration responses
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='responses' AND column_name='user_id'
  `);
  if (cols.rows.length === 0) {
    await pool.query(`DROP TABLE IF EXISTS responses CASCADE;`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS responses (
      id           TEXT PRIMARY KEY,
      exercise_id  TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      answers      JSONB NOT NULL DEFAULT '{}',
      comments     JSONB NOT NULL DEFAULT '{}',
      percentage   INTEGER NOT NULL,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(exercise_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_responses_exercise ON responses(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_responses_user ON responses(user_id);
  `);

  // Admin par défaut (must_change_password=false car admin connaît son mdp)
  const admin = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (!admin.rows.length) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@2026", 10);
    await pool.query(
      "INSERT INTO users (id,name,email,password_hash,role,must_change_password) VALUES ($1,$2,$3,$4,'admin',false)",
      [uuidv4(), "Administrateur", process.env.ADMIN_EMAIL || "admin@arwamedic.ma", hash]
    );
    console.log("✅ Admin créé: admin@arwamedic.ma / Admin@2026");
  }
  console.log("✅ DB initialized");
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o.trim()))) return cb(null, true);
    cb(new Error("CORS: " + origin));
  },
  credentials: true,
}));
app.use(express.json());

const auth = (roles = []) => (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token manquant" });
  try {
    const p = jwt.verify(h.split(" ")[1], JWT_SECRET);
    if (roles.length && !roles.includes(p.role)) return res.status(403).json({ error: "Accès refusé" });
    req.user = p;
    next();
  } catch { res.status(401).json({ error: "Token invalide" }); }
};

app.get("/health", (_, res) => res.json({ status: "ok", ts: new Date() }));

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: "Identifiants incorrects" });
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Identifiants incorrects" });

    // Mettre à jour last_login
    await pool.query("UPDATE users SET last_login=NOW() WHERE id=$1", [u.id]);

    const token = jwt.sign(
      { id:u.id, name:u.name, email:u.email, role:u.role, mustChangePassword:u.must_change_password },
      JWT_SECRET, { expiresIn:"7d" }
    );
    res.json({
      token,
      user: { id:u.id, name:u.name, email:u.email, role:u.role, mustChangePassword:u.must_change_password }
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/auth/me", auth(), (req, res) => res.json(req.user));

// Changement de mot de passe (première connexion ou volontaire)
app.post("/api/auth/change-password", auth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Mot de passe actuel et nouveau requis" });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères" });
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Mot de passe actuel incorrect" });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2",
      [hash, req.user.id]
    );
    // Nouveau token sans mustChangePassword
    const u = rows[0];
    const token = jwt.sign(
      { id:u.id, name:u.name, email:u.email, role:u.role, mustChangePassword:false },
      JWT_SECRET, { expiresIn:"7d" }
    );
    res.json({ token, user: { id:u.id, name:u.name, email:u.email, role:u.role, mustChangePassword:false } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get("/api/users", auth(["admin"]), async (_, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,name,email,role,must_change_password,last_login,created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/users", auth(["admin"]), async (req, res) => {
  const { name, email, password, role="user" } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Champs manquants" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (id,name,email,password_hash,role,must_change_password) VALUES ($1,$2,$3,$4,$5,true) RETURNING id,name,email,role,must_change_password,created_at",
      [uuidv4(), name, email.toLowerCase(), hash, role]
    );
    res.status(201).json(rows[0]);
  } catch(e) {
    if (e.code==="23505") return res.status(409).json({ error: "Email déjà utilisé" });
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/users/:id/password", auth(["admin"]), async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Mot de passe requis" });
  try {
    const hash = await bcrypt.hash(password, 10);
    // reset → force changement à la prochaine connexion
    await pool.query(
      "UPDATE users SET password_hash=$1, must_change_password=true WHERE id=$2",
      [hash, req.params.id]
    );
    res.json({ updated: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/users/:id", auth(["admin"]), async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id=$1 AND role!='admin'", [req.params.id]);
    res.json({ deleted: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── EXERCISES ────────────────────────────────────────────────────────────────
app.get("/api/exercises", auth(), async (_, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM exercises ORDER BY created_at DESC");
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/exercises/:id", auth(), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM exercises WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/exercises", auth(["admin"]), async (req, res) => {
  const { title, month, year, questions } = req.body;
  if (!title||month===undefined||!year||!questions) return res.status(400).json({ error: "Champs manquants" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO exercises (id,title,month,year,questions,status) VALUES ($1,$2,$3,$4,$5,'active') RETURNING *",
      [uuidv4(), title, month, year, JSON.stringify(questions)]
    );
    res.status(201).json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/exercises/:id/status", auth(["admin"]), async (req, res) => {
  const { status } = req.body;
  if (!["active","closed"].includes(status)) return res.status(400).json({ error: "Status invalide" });
  try {
    const { rows } = await pool.query(
      "UPDATE exercises SET status=$1 WHERE id=$2 RETURNING *", [status, req.params.id]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/exercises/:id", auth(["admin"]), async (req, res) => {
  try {
    await pool.query("DELETE FROM exercises WHERE id=$1", [req.params.id]);
    res.json({ deleted: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── RESPONSES ────────────────────────────────────────────────────────────────
app.post("/api/exercises/:id/responses", auth(), async (req, res) => {
  const { answers, comments={}, percentage } = req.body;
  if (!answers||percentage===undefined) return res.status(400).json({ error: "Données manquantes" });
  try {
    const ex = await pool.query("SELECT * FROM exercises WHERE id=$1", [req.params.id]);
    if (!ex.rows.length) return res.status(404).json({ error: "Exercice introuvable" });
    if (ex.rows[0].status==="closed") return res.status(403).json({ error: "Enquête fermée" });
    const { rows } = await pool.query(
      `INSERT INTO responses (id,exercise_id,user_id,answers,comments,percentage)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (exercise_id,user_id) DO UPDATE SET answers=$4,comments=$5,percentage=$6,submitted_at=NOW()
       RETURNING *`,
      [uuidv4(), req.params.id, req.user.id, JSON.stringify(answers), JSON.stringify(comments), percentage]
    );
    res.status(201).json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/exercises/:id/responses", auth(["admin"]), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM responses r JOIN users u ON u.id=r.user_id
       WHERE r.exercise_id=$1 ORDER BY r.submitted_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/exercises/:id/my-response", auth(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM responses WHERE exercise_id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    res.json(rows[0] || null);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── STATS ────────────────────────────────────────────────────────────────────
app.get("/api/stats", auth(["admin"]), async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const exs  = await pool.query("SELECT * FROM exercises WHERE year=$1", [year]);
    const resp = await pool.query(
      "SELECT r.* FROM responses r JOIN exercises e ON e.id=r.exercise_id WHERE e.year=$1", [year]
    );
    const quarters = { Q1:[0,1,2], Q2:[3,4,5], Q3:[6,7,8], Q4:[9,10,11] };
    const qStats = {};
    for (const [q,months] of Object.entries(quarters)) {
      const exInQ = exs.rows.filter(e=>months.includes(e.month));
      const rInQ  = resp.rows.filter(r=>exInQ.some(e=>e.id===r.exercise_id));
      qStats[q] = { exercises:exInQ.length, count:rInQ.length,
        avg: rInQ.length ? Math.round(rInQ.reduce((a,r)=>a+r.percentage,0)/rInQ.length) : 0 };
    }
    const all = await pool.query("SELECT percentage FROM responses");
    const globalAvg = all.rows.length
      ? Math.round(all.rows.reduce((a,r)=>a+r.percentage,0)/all.rows.length) : 0;
    const totalUsers    = (await pool.query("SELECT COUNT(*) FROM users WHERE role='user'")).rows[0].count;
    const pendingChange = (await pool.query("SELECT COUNT(*) FROM users WHERE must_change_password=true")).rows[0].count;
    res.json({ year, globalAvg, totalResponses:all.rows.length,
      totalExercises:(await pool.query("SELECT COUNT(*) FROM exercises")).rows[0].count,
      totalUsers, pendingChange, quarters:qStats });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

initDB().then(()=>app.listen(PORT,()=>console.log(`🚀 API on port ${PORT}`))).catch(err=>{
  console.error("❌ DB init failed:", err); process.exit(1);
});
