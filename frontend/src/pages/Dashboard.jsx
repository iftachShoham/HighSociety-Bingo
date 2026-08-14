import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.listEvents();
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createEvent(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createEvent(newName, newDesc);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event and all its games?")) return;
    await api.deleteEvent(id);
    load();
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Your Events</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <div className="card-title">Create Event</div>
          <form onSubmit={createEvent}>
            <div className="form-group">
              <label>Event Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Summer Competition 2026" required />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this event about?" />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn-primary">Create Event</button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No events yet. Create one to get started!</p>
        </div>
      ) : (
        events.map((ev) => (
          <div key={ev.id} className="list-item">
            <div className="list-item-info" onClick={() => navigate(`/events/${ev.id}`)} style={{ cursor: "pointer" }}>
              <div className="list-item-name">{ev.name}</div>
              <div className="list-item-meta">
                {ev.game_count} game{ev.game_count !== 1 ? "s" : ""} · {new Date(ev.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="list-item-actions">
              <button className="btn-secondary" onClick={() => navigate(`/events/${ev.id}`)}>Open</button>
              <button className="btn-danger" onClick={() => deleteEvent(ev.id)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
