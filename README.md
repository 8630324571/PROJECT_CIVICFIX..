# CivicFix — Smart Civic Grievance Management System

A full-stack web app that lets citizens report civic issues (potholes, garbage,
broken streetlights, water problems) and lets admins track and resolve them.
A Python microservice automatically categorizes each complaint by department
and detects likely duplicate reports using text similarity + location proximity.

**Tech stack:** HTML/CSS/JavaScript (frontend + Leaflet maps) · PHP + MySQL (backend/API)
· Python + Flask + scikit-learn (ML microservice for classification & duplicate detection)

---

## How it works (architecture)

```
Browser (HTML/CSS/JS + Leaflet map)
        │  fetch() calls
        ▼
PHP backend (Apache/XAMPP)  ──────────────►  MySQL database
        │
        │  cURL POST (JSON)
        ▼
Python Flask microservice (localhost:5000)
   - classify()       → assigns department category from complaint text
   - find_duplicate()  → TF-IDF cosine similarity + distance check
        against other open complaints in the same category
```

When a citizen submits a complaint, PHP saves the photo (if any), sends the
complaint text + nearby existing complaints to the Flask service, gets back
a category and possible duplicate match, then stores everything in MySQL.
If the Python service is down, PHP still saves the complaint (category
defaults to "Other") so the app degrades gracefully instead of failing.

---

## Setup Instructions (local demo with XAMPP)

### 1. Database
1. Start MySQL in XAMPP control panel.
2. Open phpMyAdmin → Import → select `database/schema.sql`. This creates the
   `civicfix` database with `users`, `complaints`, and `complaint_updates` tables.

### 2. Backend (PHP)
1. Copy the `backend/` folder into your XAMPP `htdocs/civicfix/` directory,
   so the path looks like `htdocs/civicfix/backend/api/...`.
2. Check `backend/config/db.php` — default XAMPP credentials (`root` / no
   password) are already set. Change if yours differ.
3. Start Apache in XAMPP.
4. Test it works by visiting: `http://localhost/civicfix/backend/api/check_session.php`
   — you should see `{"logged_in":false}`.

### 3. ML Microservice (Python)
1. Open a terminal in the `ml_service/` folder.
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run the service:
   ```
   python app.py
   ```
4. It should say `Running on http://0.0.0.0:5000`. Leave this terminal open —
   the PHP backend calls this service every time a complaint is submitted.
5. Test it: visit `http://localhost:5000/health` — you should see a status OK message.

### 4. Frontend
1. Copy the `frontend/` folder into `htdocs/civicfix/frontend/` as well (or
   open the HTML files directly — but running through Apache is more reliable
   since it avoids CORS/cookie issues).
2. Visit `http://localhost/civicfix/frontend/index.html` in your browser.
3. Register two accounts to test both roles:
   - one as **Citizen** (to report issues)
   - one as **Admin** (to manage/resolve them — pick "Admin (demo)" on registration)

### Order to start everything (every time you demo this)
1. XAMPP → start MySQL + Apache
2. Terminal → `python app.py` inside `ml_service/`
3. Browser → `http://localhost/civicfix/frontend/index.html`

---

## Features

**Citizens can:**
- Register/log in
- Submit a complaint with title, description, photo, and map-pin location
- See their own complaints with live status (pending / in progress / resolved)
- See if their report was flagged as a likely duplicate of an existing one

**Admins can:**
- View all complaints with filters by status and category
- See summary stats (total / pending / in progress / resolved)
- Update complaint status with remarks (creates a history entry)

**Automatically, behind the scenes:**
- Every complaint is auto-categorized (Roads / Sanitation / Electricity / Water / Other)
  using keyword-based NLP matching
- Duplicate reports are detected using TF-IDF cosine similarity on complaint text,
  combined with a 500-meter geographic proximity check (Haversine formula)

---

## Project structure

```
civicfix/
├── database/
│   └── schema.sql              # MySQL schema (import this first)
├── backend/                    # PHP API — copy into htdocs/civicfix/backend
│   ├── config/db.php
│   └── api/
│       ├── register.php
│       ├── login.php
│       ├── logout.php
│       ├── check_session.php
│       ├── submit_complaint.php   # calls the Python service
│       ├── get_complaints.php
│       └── update_status.php
├── ml_service/                 # Python Flask microservice
│   ├── app.py
│   ├── classifier.py            # classification + duplicate detection logic
│   └── requirements.txt
└── frontend/                   # HTML/CSS/JS
    ├── index.html               # login/register
    ├── submit.html              # complaint form + map
    ├── dashboard.html           # citizen's own complaints
    ├── admin.html               # admin dashboard
    ├── css/style.css
    └── js/
        ├── auth.js
        ├── auth-guard.js         # session check used on every protected page
        ├── submit.js
        ├── dashboard.js
        └── admin.js
```

---

## Notes on what was tested

This project was built and verified end-to-end in a Linux sandbox before
delivery: PHP files were syntax-checked, the Flask classifier/duplicate-detection
logic was unit tested, and the full stack (MySQL + PHP dev server + Flask) was
run together to confirm registration, login, role-based access control,
complaint submission with live ML classification, duplicate flagging, filtering,
and status updates all work correctly. You're getting working code, not just
a first draft — but do walk through the setup steps yourself once so you can
explain the architecture confidently in an interview.

## Possible extensions (if you have extra time before your resume deadline)
- Email/SMS notification to citizen when their complaint status changes
- Upvoting: let other citizens confirm they've seen the same issue instead of
  filing a duplicate report
- Heatmap view (Leaflet heat plugin) showing complaint density across the city
- Replace the keyword classifier with a small trained text-classification model
  for a stronger "ML" story on your resume
