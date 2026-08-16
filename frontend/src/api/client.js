const API_BASE = "/api";

function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const api = {
  // Auth
  register: (username, password, displayName) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, display_name: displayName }),
    }),
  login: (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request("/auth/me"),

  // Upload
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },

  // Events
  listEvents: () => request("/events"),
  createEvent: (name, description) =>
    request("/events", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  getEvent: (id) => request(`/events/${id}`),
  deleteEvent: (id) => request(`/events/${id}`, { method: "DELETE" }),

  // Games
  listGames: (eventId) => request(`/games/event/${eventId}`),
  createGame: (event_id, name, game_type, config) =>
    request("/games", {
      method: "POST",
      body: JSON.stringify({ event_id, name, game_type, config }),
    }),
  getGame: (id) => request(`/games/${id}`),
  getGameByCode: (code) => request(`/games/code/${code}`),
  updateGame: (id, updates) =>
    request(`/games/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  deleteGame: (id) => request(`/games/${id}`, { method: "DELETE" }),

  // Teams
  listTeams: (gameId) => request(`/teams/game/${gameId}`),
  createTeam: (data) =>
    request("/teams", { method: "POST", body: JSON.stringify(data) }),
  updateTeam: (id, data) =>
    request(`/teams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTeam: (id) => request(`/teams/${id}`, { method: "DELETE" }),
  teamLogin: (game_id, team_name, password) =>
    request("/teams/login", {
      method: "POST",
      body: JSON.stringify({ game_id, team_name, password }),
    }),
  teamLoginByCode: (join_code, password) =>
    request("/teams/login-by-code", {
      method: "POST",
      body: JSON.stringify({ join_code, password }),
    }),
  getTeamByCode: (code) => request(`/teams/code/${code}`),

  // Tiles
  listTiles: (gameId) => request(`/tiles/game/${gameId}`),
  listPublicTiles: (gameId) => request(`/tiles/public/game/${gameId}`),
  bulkUpdateTiles: (gameId, tiles) =>
    request(`/tiles/bulk/${gameId}`, {
      method: "PUT",
      body: JSON.stringify({ tiles }),
    }),
  updateTile: (id, data) =>
    request(`/tiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Submissions
  submitProof: (data) =>
    request("/submissions", { method: "POST", body: JSON.stringify(data) }),
  listTeamSubmissions: (teamId) => request(`/submissions/team/${teamId}`),
  listGameSubmissions: (gameId) => request(`/submissions/game/${gameId}`),
  deleteSubmission: (id) =>
    request(`/submissions/${id}`, { method: "DELETE" }),

  // Ships (battleship)
  placeShips: (team_id, ships) =>
    request("/ships/place", { method: "POST", body: JSON.stringify({ team_id, ships }) }),
  getTeamShips: (teamId) => request(`/ships/team/${teamId}`),
  getShipState: (gameId) => request(`/ships/game/${gameId}/state`),
  clearTeamShips: (teamId) => request(`/ships/team/${teamId}`, { method: "DELETE" }),

  // Board
  getBoard: (gameId) => request(`/board/${gameId}`),
  getActivity: (gameId) => request(`/board/${gameId}/activity`),
  moveTeam: (gameId, team_id, position) =>
    request(`/board/${gameId}/move-team`, {
      method: "POST",
      body: JSON.stringify({ team_id, position }),
    }),
  postToDiscord: (gameId, team_id, message, image_url) =>
    request(`/board/${gameId}/post-discord`, {
      method: "POST",
      body: JSON.stringify({ team_id, message, image_url }),
    }),
  resetGame: (gameId) =>
    request(`/board/${gameId}/reset`, { method: "POST" }),
};
