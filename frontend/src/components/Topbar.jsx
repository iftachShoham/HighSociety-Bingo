import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Topbar({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  }

  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo" style={{ textDecoration: "none" }}>
        🐀 HS Bingo
      </Link>
      <nav className="topbar-nav">
        {user ? (
          <>
            <Link
              to="/dashboard"
              className={location.pathname === "/dashboard" ? "active" : ""}
            >
              Dashboard
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "6px 10px" }}>
              {user.display_name || user.username}
            </span>
            <button className="btn-ghost" onClick={logout}>
              Logout
            </button>
          </>
        ) : null}
      </nav>
    </header>
  );
}
