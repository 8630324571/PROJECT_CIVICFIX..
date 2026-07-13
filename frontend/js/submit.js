// Uses API_BASE and requireAuth() from auth-guard.js (loaded before this file)

let map, marker;
let selectedLat = null;
let selectedLng = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth(); // any logged-in user can submit
  if (!user) return;
  initMap();
});

function initMap() {
  // Default view — Agra, India. Adjust center as needed for your demo city.
  map = L.map('map').setView([27.1767, 78.0081], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  map.on('click', function (e) {
    selectedLat = e.latlng.lat;
    selectedLng = e.latlng.lng;

    if (marker) {
      marker.setLatLng(e.latlng);
    } else {
      marker = L.marker(e.latlng).addTo(map);
    }

    document.getElementById('coordsDisplay').textContent =
      `Selected: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
  });

  // Try to center on the user's actual location if they allow it
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 15);
    });
  }
}

function showMsg(elId, message, isError = true) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.style.display = "block";
}

function hideMsgs() {
  ["submitError", "submitSuccess"].forEach(id => {
    document.getElementById(id).style.display = "none";
  });
}

async function submitComplaint() {
  hideMsgs();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const photoInput = document.getElementById("photo");

  if (!title || !description) {
    showMsg("submitError", "Title and description are required.");
    return;
  }
  if (selectedLat === null) {
    showMsg("submitError", "Please click on the map to select the issue location.");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("category", category);
  formData.append("latitude", selectedLat);
  formData.append("longitude", selectedLng);
  if (photoInput.files[0]) {
    formData.append("photo", photoInput.files[0]);
  }

  try {
    const res = await fetch(`${API_BASE}/submit_complaint.php`, {
      method: "POST",
      credentials: "include",
      body: formData
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg("submitError", data.error || "Submission failed.");
      return;
    }

    document.getElementById("submitSuccess").textContent =
      `Report submitted! Filed under "${data.category}".`;
    document.getElementById("submitSuccess").style.display = "block";

    setTimeout(() => window.location.href = "dashboard.html", 2000);
  } catch (err) {
    showMsg("submitError", "Could not reach the server. Is PHP/XAMPP running?");
  }
}