import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api/client.js";
import Topbar from "./components/Topbar.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import GameSetup from "./pages/GameSetup.jsx";
import GameBoard from "./pages/GameBoard.jsx";
import TeamLogin from "./pages/TeamLogin.jsx";
import TeamView from "./pages/TeamView.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Don't show topbar on team-facing routes
  const isTeamRoute = location.pathname.startsWith("/play/");

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>;
  }

  return (
    <div className="app-layout">
      {!isTeamRoute && <Topbar user={user} setUser={setUser} />}
      <Routes>
        <Route path="/" element={<Home user={user} setUser={setUser} />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/events/:id"
          element={user ? <EventDetail user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/games/:id/setup"
          element={user ? <GameSetup user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/games/:id/board"
          element={user ? <GameBoard user={user} /> : <Navigate to="/" />}
        />
        <Route path="/play/:code" element={<TeamLogin />} />
        <Route path="/play/:code/team/:teamId" element={<TeamView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
