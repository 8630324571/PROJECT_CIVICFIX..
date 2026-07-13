// Uses API_BASE and requireAuth() from auth-guard.js

let adminMap, markersLayer;
let allComplaints = [];
let selectedComplaintId = null;
let initialFitDone = false;
const NEARBY_RADIUS_KM = 2; // complaints within this distance of the selected one are treated as "nearby"

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth("admin"); // admin-only page
  if (!user) return;

  document.getElementById("adminIdentity").innerHTML = `
    ${user.admin_photo ? `<img src="../backend/${user.admin_photo}" style="width:32px; height:32px; object-fit:cover; border-radius:50%; vertical-align:middle; margin-right:8px;">` : ""}
    Logged in as ${user.name}${user.designation ? " — " + user.designation : ""}${user.employee_id ? " (ID: " + user.employee_id + ")" : ""}. This identity is shown on every complaint you update.
  `;

  initAdminMap();
  loadComplaints();
});

function initAdminMap() {
  // Default view — Agra, India. Adjust center as needed for your demo city.
  adminMap = L.map('adminMap').setView([27.1767, 78.0081], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(adminMap);

  markersLayer = L.layerGroup().addTo(adminMap);
}

// Classic teardrop map-pin icon (like a Google Maps pin), color-coded.
// This is what makes the "currently viewed" complaint visually pop compared
// to every other pin on the map.
function makePinIcon(color, size) {
  const height = Math.round(size * 1.35);
  const svg = `
    <svg width="${size}" height="${height}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"
         style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45));">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 10.5 18.5 11.2 19.2.4.4 1.1.4 1.5 0C13.5 30.5 24 21 24 12 24 5.4 18.6 0 12 0z"
            fill="${color}" stroke="white" stroke-width="1.2"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`;
  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],   // pin tip touches the exact coordinate
    popupAnchor: [0, -height + 4]
  });
}

// Great-circle distance between two lat/lng points, in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function statusLabel(status) {
  return status.replace("_", " ");
}

function renderStats(complaints) {
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === "pending").length;
  const inProgress = complaints.filter(c => c.status === "in_progress").length;
  const resolved = complaints.filter(c => c.status === "resolved").length;

  document.getElementById("statsRow").innerHTML = `
    <div class="stat-card"><div class="num">${total}</div><div class="label">Total</div></div>
    <div class="stat-card"><div class="num">${pending}</div><div class="label">Pending</div></div>
    <div class="stat-card"><div class="num">${inProgress}</div><div class="label">In Progress</div></div>
    <div class="stat-card"><div class="num">${resolved}</div><div class="label">Resolved</div></div>
  `;
}

// Draws every complaint that has coordinates. The selected complaint is red
// and larger; complaints within NEARBY_RADIUS_KM of it are amber; everything
// else stays the default navy dot.
function renderMapMarkers() {
  markersLayer.clearLayers();

  const withCoords = allComplaints.filter(c => c.latitude && c.longitude);
  if (withCoords.length === 0) return;

  const selected = withCoords.find(c => String(c.id) === String(selectedComplaintId)) || null;

  withCoords.forEach(c => {
    let color = '#2c5aa0'; // default: other complaints (blue pin)
    let size = 28;
    let zIndexOffset = 0;

    if (selected && String(c.id) === String(selected.id)) {
      color = '#e63946'; // currently viewed complaint (red pin, bigger)
      size = 42;
      zIndexOffset = 1000;
    } else if (selected) {
      const dist = haversineKm(
        parseFloat(selected.latitude), parseFloat(selected.longitude),
        parseFloat(c.latitude), parseFloat(c.longitude)
      );
      if (dist <= NEARBY_RADIUS_KM) {
        color = '#d68c2c'; // nearby complaint (amber pin)
        size = 32;
        zIndexOffset = 500;
      }
    }

    const marker = L.marker(
      [parseFloat(c.latitude), parseFloat(c.longitude)],
      { icon: makePinIcon(color, size), zIndexOffset }
    );

    // Hover tooltip — shows the problem summary just by resting the cursor
    // on a pin, no click needed.
    marker.bindTooltip(`
      <strong>#${c.id} ${escapeHtml(c.title)}</strong><br>
      ${escapeHtml(c.category)} · ${statusLabel(c.status)}
    `, { direction: 'top', offset: [0, -size], opacity: 0.95 });

    marker.bindPopup(`
      <strong>#${c.id} ${escapeHtml(c.title)}</strong><br>
      <span class="category-tag">${escapeHtml(c.category)}</span>
      <span class="badge badge-${c.status}">${statusLabel(c.status)}</span><br>
      Reported by ${escapeHtml(c.reporter_name || '')}<br>
      <button class="btn btn-outline" style="margin-top:6px; padding:4px 10px; font-size:12px;"
              onclick="selectComplaint(${c.id})">View &amp; find nearby</button>
    `);

    marker.on('click', () => selectComplaint(c.id));

    marker.addTo(markersLayer);
  });

  // On the very first render, zoom out to fit every complaint on screen —
  // even though one is auto-selected as "currently viewed" (red pin), the
  // admin should still see the whole picture before drilling into one spot.
  if (!initialFitDone) {
    const bounds = L.latLngBounds(withCoords.map(c => [parseFloat(c.latitude), parseFloat(c.longitude)]));
    adminMap.fitBounds(bounds, { padding: [40, 40] });
    initialFitDone = true;
  }
}

// Marks a complaint as "currently being looked at": highlights its marker,
// centers the map on it, lists nearby open complaints, and highlights its
// table row.
function selectComplaint(id) {
  const c = allComplaints.find(x => String(x.id) === String(id));
  if (!c) return;

  if (!c.latitude || !c.longitude) {
    alert("This complaint has no location data saved, so it can't be shown on the map.");
    return;
  }

  selectedComplaintId = id;
  renderMapMarkers();
  adminMap.setView([parseFloat(c.latitude), parseFloat(c.longitude)], 16);
  renderNearbyPanel(c);
  highlightSelectedRow();
}

function renderNearbyPanel(selected) {
  const panel = document.getElementById('nearbyPanel');

  const nearby = allComplaints
    .filter(c => String(c.id) !== String(selected.id) && c.latitude && c.longitude)
    .map(c => ({
      ...c,
      _dist: haversineKm(
        parseFloat(selected.latitude), parseFloat(selected.longitude),
        parseFloat(c.latitude), parseFloat(c.longitude)
      )
    }))
    .filter(c => c._dist <= NEARBY_RADIUS_KM)
    .sort((a, b) => a._dist - b._dist);

  panel.style.display = 'block';

  if (nearby.length === 0) {
    panel.innerHTML = `<strong>#${selected.id} ${escapeHtml(selected.title)}</strong> selected — no other open complaints within ${NEARBY_RADIUS_KM} km.`;
    return;
  }

  panel.innerHTML = `
    <strong>#${selected.id} ${escapeHtml(selected.title)}</strong> selected —
    ${nearby.length} nearby complaint${nearby.length > 1 ? 's' : ''} within ${NEARBY_RADIUS_KM} km
    (worth combining into the same field visit):
    <ul style="margin:8px 0 0; padding-left:18px;">
      ${nearby.map(c => `
        <li style="margin-bottom:5px; cursor:pointer;" onclick="selectComplaint(${c.id})">
          #${c.id} ${escapeHtml(c.title)}
          <span class="category-tag">${escapeHtml(c.category)}</span>
          <span class="badge badge-${c.status}">${statusLabel(c.status)}</span>
          — ${c._dist < 1 ? Math.round(c._dist * 1000) + ' m' : c._dist.toFixed(1) + ' km'} away
        </li>
      `).join("")}
    </ul>
  `;
}

function highlightSelectedRow() {
  document.querySelectorAll('tr[data-complaint-row]').forEach(row => {
    row.style.background = String(row.dataset.complaintRow) === String(selectedComplaintId) ? '#fdf1e0' : '';
  });
}

async function loadComplaints() {
  const status = document.getElementById("statusFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const container = document.getElementById("complaintsTable");

  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (category) params.append("category", category);

  container.innerHTML = "<p style='color:var(--text-muted);'>Loading...</p>";

  try {
    const res = await fetch(`${API_BASE}/get_complaints.php?${params}`, { credentials: "include" });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<p class="error-msg" style="display:block;">${data.error}</p>`;
      return;
    }

    allComplaints = data.complaints;
    renderStats(allComplaints);

    if (allComplaints.length === 0) {
      container.innerHTML = `<div class="card empty-state"><p>No complaints match these filters.</p></div>`;
      markersLayer.clearLayers();
      document.getElementById('nearbyPanel').style.display = 'none';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Title</th><th>Category</th><th>Reporter</th>
            <th>Status</th><th>Reported</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${allComplaints.map(c => `
            <tr data-complaint-row="${c.id}">
              <td>#${c.id}</td>
              <td>
                ${escapeHtml(c.title)}
                ${c.duplicate_of ? `<div class="dup-flag">⚠ similar to #${c.duplicate_of}</div>` : ""}
                ${(!c.latitude || !c.longitude) ? `<div style="font-size:11px; color:var(--text-muted);">No location submitted</div>` : ""}
                ${c.photo_path ? `
                  <div style="margin-top:6px;">
                    <a href="../backend/${c.photo_path}" target="_blank" title="Click to view full size">
                      <img src="../backend/${c.photo_path}" style="width:56px; height:56px; object-fit:cover; border-radius:4px; border:1px solid var(--border); display:block;">
                    </a>
                  </div>
                ` : ""}
              </td>
              <td><span class="category-tag">${escapeHtml(c.category)}</span></td>
              <td>${escapeHtml(c.reporter_name)}</td>
              <td><span class="badge badge-${c.status}">${statusLabel(c.status)}</span></td>
              <td>${new Date(c.created_at).toLocaleDateString()}</td>
              <td>
                <select onchange="updateStatus(${c.id}, this.value)" style="width:auto; font-size:13px; padding:6px 8px;">
                  <option value="">Update...</option>
                  <option value="pending" ${c.status === 'pending' ? 'disabled' : ''}>Pending</option>
                  <option value="in_progress" ${c.status === 'in_progress' ? 'disabled' : ''}>In Progress</option>
                  <option value="resolved" ${c.status === 'resolved' ? 'disabled' : ''}>Resolved</option>
                </select>
                ${(c.latitude && c.longitude) ? `
                  <button class="btn btn-outline" style="margin-top:6px; padding:4px 8px; font-size:12px; display:block; width:100%;"
                          onclick="selectComplaint(${c.id})">View on map</button>
                ` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    // Keep the current selection only if that complaint is still in view
    // (e.g. after changing filters); otherwise clear it.
    if (selectedComplaintId && !allComplaints.find(c => String(c.id) === String(selectedComplaintId))) {
      selectedComplaintId = null;
      document.getElementById('nearbyPanel').style.display = 'none';
    }

    renderMapMarkers();

    if (selectedComplaintId) {
      const sel = allComplaints.find(c => String(c.id) === String(selectedComplaintId));
      if (sel) {
        renderNearbyPanel(sel);
        highlightSelectedRow();
      }
    }
  } catch (err) {
    container.innerHTML = `<p class="error-msg" style="display:block;">Could not reach the server.</p>`;
  }
}

async function updateStatus(complaintId, newStatus) {
  if (!newStatus) return;

  const remarks = prompt(`Add a remark for this status change (optional):`, "");
  if (remarks === null) {
    loadComplaints(); // reset the dropdown
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/update_status.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint_id: complaintId, status: newStatus, remarks })
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Update failed.");
      return;
    }
    loadComplaints();
  } catch (err) {
    alert("Could not reach the server.");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}