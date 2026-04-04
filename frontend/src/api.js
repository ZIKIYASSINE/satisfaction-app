const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getToken = () => localStorage.getItem("arwa_token");

const req = async (path, opts = {}) => {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
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
  login:          (email, password)  => req("/api/auth/login", { method:"POST", body:{email,password} }),
  me:             ()                 => req("/api/auth/me"),
  getUsers:       ()                 => req("/api/users"),
  createUser:     (data)             => req("/api/users", { method:"POST", body:data }),
  resetPassword:  (id, password)     => req(`/api/users/${id}/password`, { method:"PATCH", body:{password} }),
  deleteUser:     (id)               => req(`/api/users/${id}`, { method:"DELETE" }),
  getExercises:   ()                 => req("/api/exercises"),
  getExercise:    (id)               => req(`/api/exercises/${id}`),
  createExercise: (data)             => req("/api/exercises", { method:"POST", body:data }),
  updateStatus:   (id, status)       => req(`/api/exercises/${id}/status`, { method:"PATCH", body:{status} }),
  deleteExercise: (id)               => req(`/api/exercises/${id}`, { method:"DELETE" }),
  getResponses:   (id)               => req(`/api/exercises/${id}/responses`),
  submitResponse: (id, data)         => req(`/api/exercises/${id}/responses`, { method:"POST", body:data }),
  myResponse:     (id)               => req(`/api/exercises/${id}/my-response`),
  getStats:       (year)             => req(`/api/stats?year=${year}`),
};
