# CivicFix — Smart Civic Grievance Management System

CivicFix is a full-stack web platform that lets citizens report civic issues
— potholes, garbage pileups, broken streetlights, water problems — with a
photo and a precise map location, and lets government/admin staff track,
prioritize, and resolve them from a live map-based dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (vanilla), Leaflet.js (maps) |
| Backend / API | PHP + MySQL (PDO, prepared statements, session auth) |
| Maps | OpenStreetMap tiles via Leaflet.js (no API key required) |

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Client["Citizen / Admin Browser"]
        UI["HTML + CSS + JS<br/>Leaflet Map UI"]
    end

    subgraph Backend["PHP Backend (Apache / XAMPP)"]
        AUTH["Auth APIs<br/>register / login / session"]
        COMPLAINTS["Complaint APIs<br/>submit / list / update status"]
    end

    DB[("MySQL Database<br/>users / complaints / complaint_updates")]

    UI -- "fetch() JSON calls" --> AUTH
    UI -- "fetch() JSON calls" --> COMPLAINTS
    AUTH <--> DB
    COMPLAINTS <--> DB

    style Client fill:#eef4fb,stroke:#1B4F82,color:#111
    style Backend fill:#fdf3e2,stroke:#d68c2c,color:#111
    style DB fill:#f4eef8,stroke:#7c4fa3,color:#111
```

A simple two-tier design: the browser talks directly to the PHP API over
JSON (`fetch()` calls), and PHP talks to MySQL. No external services are
required to run the app.

---

## 2. Database (Entity-Relationship Diagram)

```mermaid
erDiagram
    USERS ||--o{ COMPLAINTS : "reports"
    USERS ||--o{ COMPLAINT_UPDATES : "updates status of"
    COMPLAINTS ||--o{ COMPLAINT_UPDATES : "has history"

    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password
        enum role "citizen or admin"
        timestamp created_at
    }

    COMPLAINTS {
        int id PK
        int user_id FK
        varchar title
        text description
        varchar category
        enum status "pending, in_progress, resolved"
        decimal latitude
        decimal longitude
        varchar photo_path
        timestamp created_at
    }

    COMPLAINT_UPDATES {
        int id PK
        int complaint_id FK
        enum status
        text remarks
        int updated_by FK
        timestamp updated_at
    }
```

---

## 3. Complaint Submission Flow (Sequence)

```mermaid
sequenceDiagram
    actor Citizen
    participant UI as Frontend (submit.html)
    participant API as PHP Backend
    participant DB as MySQL

    Citizen->>UI: Fill title, description,<br/>category, photo, drop map pin
    UI->>API: POST submit_complaint.php (JSON + photo)
    API->>DB: INSERT INTO complaints (...)
    DB-->>API: new complaint id
    API-->>UI: success, id
    UI-->>Citizen: Confirmation shown
```

---

## 4. Admin Dashboard — Map Highlighting Logic

```mermaid
flowchart LR
    A["Admin opens Admin Dashboard"] --> B["Table + Map load<br/>all complaints with lat/lng"]
    B --> C{"Admin clicks a complaint<br/>('View' or map marker)"}
    C -->|"No selection yet"| D["All markers shown<br/>in neutral color"]
    C -->|"Complaint selected"| E["Selected complaint to<br/>RED marker (highlighted)"]
    E --> F["Haversine distance calculated<br/>(in-browser JavaScript)<br/>to every other complaint"]
    F --> G{"Distance less than or equal<br/>to radius (adjustable slider)?"}
    G -->|"Yes"| H["Marker becomes AMBER<br/>('nearby problem')"]
    G -->|"No"| I["Marker becomes GREY-BLUE<br/>('other complaint')"]
    H --> J["Table row also highlighted<br/>to stay in sync with map"]
    I --> J

    style E fill:#b8433a,color:#fff
    style H fill:#d68c2c,color:#fff
    style I fill:#33475b,color:#fff
```

This runs entirely client-side in `admin.js` — no server round-trip needed.
It lets field teams instantly see which unresolved issues are clustered near
the one they're currently working on, so they can plan an efficient route
instead of jumping across the city.

---

## 5. Setup Instructions (Local Demo with XAMPP)

### Step 1 — Database
1. Start **MySQL** in the XAMPP control panel.
2. Open phpMyAdmin → Import → select `database/schema.sql`.
   This creates the `civicfix` database with `users`, `complaints`, and
   `complaint_updates` tables.

### Step 2 — Backend (PHP)
1. Copy the `backend/` folder into `htdocs/civicfix/backend/`.
2. Check `backend/config/db.php` — default XAMPP credentials (`root` / no
   password) are already set; change if yours differ.
3. Start **Apache** in XAMPP.
4. Test: visit `http://localhost/civicfix/backend/api/check_session.php`
   → should return `{"logged_in":false}`.

### Step 3 — Frontend
1. Copy the `frontend/` folder into `htdocs/civicfix/frontend/`.
2. Visit `http://localhost/civicfix/frontend/index.html`.
3. Register two accounts to test both roles: one **Citizen**, one **Admin**.

### Startup order (every demo)
```
1. XAMPP        -> start MySQL + Apache
2. Browser      -> http://localhost/civicfix/frontend/index.html
```

---

## 6. Features

**Citizens can:**
- Register / log in
- Submit a complaint with title, description, category, photo, and
  map-pin location
- Track their own complaints with live status (pending / in progress / resolved)

**Admins can:**
- View all complaints in a table **and** on an interactive map
- Highlight any complaint on the map and instantly see nearby unresolved
  issues within an adjustable radius (color-coded markers)
- Filter by status and category, see summary stats
- Update complaint status with remarks (creates an audit history entry)

---

## 7. Project Structure

```
civicfix/
├── database/
│   └── schema.sql                 # MySQL schema (import this first)
├── backend/                       # PHP API - copy into htdocs/civicfix/backend
│   ├── config/db.php
│   └── api/
│       ├── register.php
│       ├── login.php
│       ├── logout.php
│       ├── check_session.php
│       ├── submit_complaint.php
│       ├── get_complaints.php
│       └── update_status.php
└── frontend/                      # HTML/CSS/JS
    ├── index.html                 # login / register
    ├── submit.html                # complaint form + map
    ├── dashboard.html             # citizen's own complaints
    ├── admin.html                 # admin dashboard + live map
    ├── css/style.css
    └── js/
        ├── auth.js
        ├── auth-guard.js          # session check on every protected page
        ├── submit.js
        ├── dashboard.js
        └── admin.js                # table + map + nearest-problem highlighting
```

---

## 8. Possible Extensions

- Email/SMS notification to citizens when complaint status changes
- Upvoting: let other citizens confirm an existing issue instead of filing
  a duplicate report
- Heatmap view (Leaflet heat plugin) showing complaint density across the city
- Re-introduce a Python microservice later for auto-categorization or
  duplicate detection, if you want a stronger "ML" angle for your resume
