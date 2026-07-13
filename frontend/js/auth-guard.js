// Include this on every page that requires login.
// Redirects to index.html if the user isn't logged in,
// and enforces admin-only pages.

// Auto-detects host/port so it works whether XAMPP's Apache is on port 80, 81, or anything else.
const API_BASE = `${window.location.protocol}//${window.location.host}/civicfix/backend/api`;
let CURRENT_USER = null;

async function requireAuth(requiredRole = null) {
  try {
    const res = await fetch(`${API_BASE}/check_session.php`, { credentials: "include" });
    const data = await res.json();

    if (!data.logged_in) {
      window.location.href = "index.html";
      return null;
    }

    if (requiredRole && data.user.role !== requiredRole) {
      // Wrong role trying to access this page — send them to their own dashboard
      window.location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
      return null;
    }

    CURRENT_USER = data.user;
    return data.user;
  } catch (err) {
    console.error("Session check failed:", err);
    window.location.href = "index.html";
    return null;
  }
}

async function logout() {
  await fetch(`${API_BASE}/logout.php`, { method: "POST", credentials: "include" });
  window.location.href = "index.html";
}
