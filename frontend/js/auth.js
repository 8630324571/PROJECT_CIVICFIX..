// Base URL of the PHP backend — auto-detects host/port so it works whether
// XAMPP's Apache is on port 80, 81, or anything else.
const API_BASE = `${window.location.protocol}//${window.location.host}/civicfix/backend/api`;

function toggleAdminFields() {
  const role = document.getElementById("regRole").value;
  document.getElementById("adminFields").style.display = role === "admin" ? "block" : "none";
  if (role === "admin") {
    startCamera();
  } else {
    stopCamera();
  }
}

let cameraStream = null;
let capturedPhotoData = null; // base64 JPEG data URL, set only after a real capture

function resetCaptureUI() {
  capturedPhotoData = null;
  const video = document.getElementById("camPreview");
  const preview = document.getElementById("capturedPreview");
  preview.style.display = "none";
  video.style.display = "block";
  document.getElementById("captureBtn").style.display = "inline-block";
  document.getElementById("retakeBtn").style.display = "none";
}

async function startCamera() {
  const camError = document.getElementById("camError");
  camError.style.display = "none";
  resetCaptureUI();
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    const video = document.getElementById("camPreview");
    video.srcObject = cameraStream;
  } catch (err) {
    camError.textContent = "Could not access camera. Please allow camera permission to register as admin.";
    camError.style.display = "block";
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  capturedPhotoData = null;
}

function capturePhoto() {
  const video = document.getElementById("camPreview");
  const canvas = document.getElementById("camCanvas");
  if (!video.videoWidth) return; // camera not ready yet

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  capturedPhotoData = canvas.toDataURL("image/jpeg", 0.85);

  document.getElementById("capturedPreview").src = capturedPhotoData;
  document.getElementById("capturedPreview").style.display = "block";
  video.style.display = "none";
  document.getElementById("captureBtn").style.display = "none";
  document.getElementById("retakeBtn").style.display = "inline-block";

  // Freeze the camera once captured — no need to keep the feed running
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function retakePhoto() {
  resetCaptureUI();
  startCamera(); // reopen the camera feed so they can capture a fresh photo
}

function toggleForm() {
  const login = document.getElementById("loginForm");
  const register = document.getElementById("registerForm");
  login.style.display = login.style.display === "none" ? "block" : "none";
  register.style.display = register.style.display === "none" ? "block" : "none";
  stopCamera(); // don't leave the webcam running when leaving the register form
}

function showError(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.style.display = "block";
}

function hideMessages(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

async function handleLogin() {
  hideMessages("loginError");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showError("loginError", "Please enter both email and password.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showError("loginError", data.error || "Login failed.");
      return;
    }

    // Redirect based on role
    if (data.user.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    showError("loginError", "Could not reach the server. Is PHP/XAMPP running?");
  }
}

async function handleRegister() {
  hideMessages("registerError", "registerSuccess");
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("regRole").value;
  const employeeId = document.getElementById("regEmployeeId").value.trim();
  const designation = document.getElementById("regDesignation").value.trim();

  if (!name || !email || !password) {
    showError("registerError", "All fields are required.");
    return;
  }
  if (password.length < 6) {
    showError("registerError", "Password must be at least 6 characters.");
    return;
  }
  if (role === "admin" && (!employeeId || !designation)) {
    showError("registerError", "Employee ID and designation are required for admin accounts.");
    return;
  }
  if (role === "admin" && !capturedPhotoData) {
    showError("registerError", "Please capture a live photo using your camera before registering.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/register.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, email, password, role,
        employee_id: employeeId,
        designation,
        live_photo: role === "admin" ? capturedPhotoData : null
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showError("registerError", data.error || "Registration failed.");
      return;
    }

    document.getElementById("registerSuccess").textContent = "Account created! You can log in now.";
    document.getElementById("registerSuccess").style.display = "block";
    setTimeout(toggleForm, 1200);
  } catch (err) {
    showError("registerError", "Could not reach the server. Is PHP/XAMPP running?");
  }
}
