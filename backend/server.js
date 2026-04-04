require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── DB Connection ────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── Init Tables ─────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      month       INTEGER NOT NULL,
      year        INTEGER NOT NULL,
      questions   JSONB NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS responses (
      id           TEXT PRIMARY KEY,
      exercise_id  TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      answers      JSONB NOT NULL DEFAULT '{}',
      percentage   INTEGER NOT NULL,
      device_hash  TEXT,
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_responses_exercise ON responses(exercise_id);
  `);
  console.log("✅ DB initialized");
}

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow Postman etc.
    if (allowedOrigins.some(o => origin.startsWith(o.trim()))) return cb(null, true);
    cb(new Error("CORS not allowed: " + origin));
  },
  credentials: true,
}));
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", ts: new Date() }));

// ─── EXERCISES ────────────────────────────────────────────────────────────────

// GET /api/exercises
app.get("/api/exercises", async (_, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM exercises ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/exercises/:id  (public — pour l'enquête utilisateur)
app.get("/api/exercises/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM exercises WHERE id = $1", [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/exercises
app.post("/api/exercises", async (req, res) => {
  const { title, month, year, questions } = req.body;
  if (!title || month === undefined || !year || !questions)
    return res.status(400).json({ error: "Champs manquants" });
  try {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO exercises (id, title, month, year, questions, status)
       VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
      [id, title, month, year, JSON.stringify(questions)]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/exercises/:id/status
app.patch("/api/exercises/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!["active", "closed"].includes(status))
    return res.status(400).json({ error: "Status invalide" });
  try {
    const { rows } = await pool.query(
      "UPDATE exercises SET status=$1 WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/exercises/:id
app.delete("/api/exercises/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM exercises WHERE id=$1", [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── RESPONSES ───────────────────────────────────────────────────────────────

// POST /api/exercises/:id/responses
app.post("/api/exercises/:id/responses", async (req, res) => {
  const { answers, percentage, deviceHash } = req.body;
  if (!answers || percentage === undefined)
    return res.status(400).json({ error: "Données manquantes" });

  try {
    // Vérifier que l'exercice existe et est actif
    const ex = await pool.query(
      "SELECT * FROM exercises WHERE id=$1", [req.params.id]
    );
    if (!ex.rows.length) return res.status(404).json({ error: "Exercice introuvable" });
    if (ex.rows[0].status === "closed")
      return res.status(403).json({ error: "Enquête fermée" });

    // Anti-doublon par deviceHash
    if (deviceHash) {
      const already = await pool.query(
        "SELECT id FROM responses WHERE exercise_id=$1 AND device_hash=$2",
        [req.params.id, deviceHash]
      );
      if (already.rows.length)
        return res.status(409).json({ error: "Déjà répondu" });
    }

    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO responses (id, exercise_id, answers, percentage, device_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, req.params.id, JSON.stringify(answers), percentage, deviceHash || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/exercises/:id/responses
app.get("/api/exercises/:id/responses", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM responses WHERE exercise_id=$1 ORDER BY submitted_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/stats  — statistiques globales + trimestrielles
app.get("/api/stats", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const exs = await pool.query("SELECT * FROM exercises WHERE year=$1", [year]);
    const resps = await pool.query(
      `SELECT r.* FROM responses r
       JOIN exercises e ON e.id = r.exercise_id
       WHERE e.year = $1`, [year]
    );

    const quarters = { Q1:[0,1,2], Q2:[3,4,5], Q3:[6,7,8], Q4:[9,10,11] };
    const qStats = {};
    for (const [q, months] of Object.entries(quarters)) {
      const exInQ = exs.rows.filter(e => months.includes(e.month));
      const rInQ  = resps.rows.filter(r =>
        exInQ.some(e => e.id === r.exercise_id)
      );
      const avg = rInQ.length
        ? Math.round(rInQ.reduce((a, r) => a + r.percentage, 0) / rInQ.length)
        : 0;
      qStats[q] = { exercises: exInQ.length, count: rInQ.length, avg };
    }

    const allResps = await pool.query("SELECT percentage FROM responses");
    const globalAvg = allResps.rows.length
      ? Math.round(allResps.rows.reduce((a, r) => a + r.percentage, 0) / allResps.rows.length)
      : 0;

    res.json({
      year,
      globalAvg,
      totalResponses: allResps.rows.length,
      totalExercises: (await pool.query("SELECT COUNT(*) FROM exercises")).rows[0].count,
      quarters: qStats,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
}).catch(err => {
  console.error("❌ DB init failed:", err);
  process.exit(1);
});
