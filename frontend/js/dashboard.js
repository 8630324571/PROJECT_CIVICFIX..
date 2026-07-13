// Uses API_BASE and requireAuth() from auth-guard.js

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  document.getElementById("welcomeMsg").textContent = `Welcome, ${user.name}`;
  loadComplaints();
});

function statusLabel(status) {
  return status.replace("_", " ");
}

async function loadComplaints() {
  const container = document.getElementById("complaintsList");
  container.innerHTML = "<p style='color:var(--text-muted);'>Loading...</p>";

  try {
    const res = await fetch(`${API_BASE}/get_complaints.php`, { credentials: "include" });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<p class="error-msg" style="display:block;">${data.error}</p>`;
      return;
    }

    const complaints = data.complaints;

    if (complaints.length === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          <p>You haven't reported any issues yet.</p>
          <a href="submit.html" class="btn btn-primary">Report your first issue</a>
        </div>`;
      return;
    }

    container.innerHTML = complaints.map(c => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h3 style="margin:0 0 6px;">${escapeHtml(c.title)}</h3>
            <span class="category-tag">${escapeHtml(c.category)}</span>
            <span class="badge badge-${c.status}" style="margin-left:8px;">${statusLabel(c.status)}</span>
          </div>
          <span style="font-size:12px; color:var(--text-muted);">${new Date(c.created_at).toLocaleDateString()}</span>
        </div>
        <p style="margin:12px 0 4px; color:var(--slate);">${escapeHtml(c.description)}</p>
        ${c.duplicate_of ? `<p class="dup-flag">⚠ Flagged as similar to existing report #${c.duplicate_of}</p>` : ""}
        ${c.photo_path ? `<img src="../backend/${c.photo_path}" style="max-width:200px; border-radius:6px; margin-top:8px;">` : ""}
        ${renderUpdateHistory(c.updates)}
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="error-msg" style="display:block;">Could not reach the server.</p>`;
  }
}

function renderUpdateHistory(updates) {
  if (!updates || updates.length === 0) return "";

  const items = updates.map(u => `
    <div style="padding:8px 0; border-top:1px solid var(--border, #e5e7eb); display:flex; gap:10px;">
      ${u.admin_photo ? `<img src="../backend/${u.admin_photo}" style="width:40px; height:40px; object-fit:cover; border-radius:50%; flex-shrink:0;">` : ""}
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; font-size:13px;">
          <span class="badge badge-${u.status}">${statusLabel(u.status)}</span>
          <span style="color:var(--text-muted);">${new Date(u.updated_at).toLocaleString()}</span>
        </div>
        <div style="font-size:13px; margin-top:4px;">
          By <strong>${escapeHtml(u.admin_name || "Unknown official")}</strong>
          ${u.designation ? ` — ${escapeHtml(u.designation)}` : ""}
          ${u.employee_id ? ` (ID: ${escapeHtml(u.employee_id)})` : ""}
        </div>
        ${u.remarks ? `<div style="font-size:13px; color:var(--slate); margin-top:2px;">"${escapeHtml(u.remarks)}"</div>` : ""}
      </div>
    </div>
  `).join("");

  return `
    <details style="margin-top:10px;">
      <summary style="cursor:pointer; font-size:13px; color:var(--text-muted);">
        Action history (${updates.length})
      </summary>
      ${items}
    </details>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
