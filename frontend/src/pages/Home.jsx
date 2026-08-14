import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function Home({ user, setUser }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(user ? "welcome" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data =
        mode === "login"
          ? await api.login(username, password)
          : await api.register(username, password, displayName);
      localStorage.setItem("token", data.token);
      setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  if (user) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🐀</div>
        <h1 className="page-title" style={{ fontSize: "2.2rem" }}>
          Welcome back, {user.display_name || user.username}
        </h1>
        <p style={{ color: "var(--text-dim)", marginBottom: 32, fontSize: "1.1rem" }}>
          Create events, set up games, and manage your competition.
        </p>
        <button className="btn-primary" style={{ fontSize: "1.1rem", padding: "14px 32px" }} onClick={() => navigate("/dashboard")}>
          Go to Dashboard →
        </button>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 440, paddingTop: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: "3rem", marginBottom: 8 }}>🐀</div>
        <h1 className="page-title" style={{ marginBottom: 4 }}>HS Bingo</h1>
        <p style={{ color: "var(--text-dim)" }}>
          Multi-game competition platform for OSRS clans
        </p>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
          <button
            className="btn-ghost"
            style={{ flex: 1, borderRadius: 0, borderBottom: mode === "login" ? "2px solid var(--gold)" : "2px solid transparent", color: mode === "login" ? "var(--gold)" : "var(--text-dim)" }}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className="btn-ghost"
            style={{ flex: 1, borderRadius: 0, borderBottom: mode === "register" ? "2px solid var(--gold)" : "2px solid transparent", color: mode === "register" ? "var(--gold)" : "var(--text-dim)" }}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your clan name"
              />
            </div>
          )}
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }}>
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Are you a player? <a href="/play">Join a game</a>
        </p>
      </div>
    </div>
  );
}
