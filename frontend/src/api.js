// ⚠️ Remplace cette URL par l'URL Railway de ton backend après déploiement
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const req = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Erreur serveur");
  }
  return res.json();
};

export const api = {
  // Exercises
  getExercises:       ()               => req("/api/exercises"),
  getExercise:        (id)             => req(`/api/exercises/${id}`),
  createExercise:     (data)           => req("/api/exercises", { method:"POST", body:data }),
  updateStatus:       (id, status)     => req(`/api/exercises/${id}/status`, { method:"PATCH", body:{status} }),
  deleteExercise:     (id)             => req(`/api/exercises/${id}`, { method:"DELETE" }),

  // Responses
  getResponses:       (id)             => req(`/api/exercises/${id}/responses`),
  submitResponse:     (id, data)       => req(`/api/exercises/${id}/responses`, { method:"POST", body:data }),

  // Stats
  getStats:           (year)           => req(`/api/stats?year=${year}`),
};
