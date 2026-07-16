# Enterprise SMS Campaign Management - Backend

This is the enterprise-grade Python FastAPI backend designed for the **Bulk SMS Campaign Management** application. It implements repository/service architectural patterns, JWT access/refresh token authentications, and asynchronous background worker queues utilizing Celery and Redis.

---

## Technical Stack

* **Web Framework**: FastAPI (Python 3.12+)
* **Database**: PostgreSQL (SQLAlchemy 2.0 async ORM engine)
* **Migrations**: Alembic
* **Background Processing**: Celery (broker & backend powered by Redis)
* **Authentication**: JWT Access/Refresh tokens + RBAC (Role-Based Access Control)
* **Validation**: Pydantic V2
* **Rate Limiting**: SlowAPI

---

## Directory Structure

```
backend/
├── app/
│   ├── api/          # API Routers & endpoints
│   ├── core/         # Config, database engine, logging, exception handlers
│   ├── dependencies/ # FastAPI dependencies (Auth checkers, Rate Limiters)
│   ├── middleware/   # Custom security headers & exception wrappers
│   ├── models/       # SQLAlchemy 2.0 ORM models (User, Contact, Campaign, etc.)
│   ├── repositories/ # Generic CRUD repositories (SOLID)
│   ├── schemas/      # Pydantic V2 input/output data validators
│   ├── services/     # Business logic & SMS Gateway strategy adapters
│   ├── workers/      # Celery app config and asynchronous task dispatches
│   └── main.py       # API router registration & entry point
├── Dockerfile        # Container setup
├── docker-compose.yml# Container orchestration
├── requirements.txt  # Python requirements file
├── .env.example      # Sample configurations template
└── README.md         # This manual
```

---

## Quick Start via Docker Compose (Recommended)

To run the entire ecosystem (FastAPI Server, Postgres DB, Redis broker, and Celery Worker) inside containers:

1. **Copy environmental configurations**:
   ```bash
   cp .env.example .env
   ```
2. **Build and start services**:
   ```bash
   docker-compose up --build
   ```
3. **Verify API health**:
   Navigate to `http://localhost:8000/health`. You should receive a healthy status response.
4. **Access interactive documentation**:
   Navigate to `http://localhost:8000/api/v1/docs` or `http://localhost:8000/api/docs` to access the Swagger open API docs.

---

## Local Setup (Manual Running)

If you prefer to run the application components locally outside of Docker containers:

### 1. Prerequisites
- Python 3.12+ installed
- Redis server running on `localhost:6379`
- PostgreSQL database created and running on `localhost:5432`

### 2. Setup Virtual Environment
Create and activate a python virtual environment inside the `backend` folder:
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configuration
Create a `.env` file (copied from `.env.example`) and adjust values (e.g. `DATABASE_URL`, `REDIS_URL`) to map your local database credentials.

### 5. Create Tables & Seed Mock Data
To initialize schemas and seed defaults (default admin accounts: `anika@cafechai.lk` / `admin123`):
```bash
python -m app.database.seed
```

### 6. Start the API Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 7. Run Celery Background Worker
Open a separate terminal window, activate the virtual environment, and run:
```bash
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

---

## Core System Architectures

### 1. Consistent Response Envelope
Every endpoint returns a unified JSON payload shape:
* **Success Envelope**:
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": { ... },
    "errors": null
  }
  ```
* **Error Envelope (Validation / Auth / Exception)**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "data": null,
    "errors": [
      { "field": "email", "message": "value is not a valid email address" }
    ]
  }
  ```

### 2. Role-Based Access Control (RBAC)
Four permission hierarchies are enforced via endpoint decorators:
* `ADMIN`: Access to user creations, user deletions, database configurations, logs exports.
* `MANAGER`: Full access to campaigns, contacts, groups, app settings updates.
* `OPERATOR`: Access to campaign triggering, template modifications, contact uploads.
* `VIEWER`: Read-only access to summaries, lists, logs history, and charts.

### 3. Asynchronous Campaigns Pipeline
* Immediate Campaigns dispatches accept input, resolve target lists, and instantly return a `202 Accepted` status to keep user interface responsive.
* Celery workers retrieve jobs, perform variable template parses (resolving variables like `{name}` for each subscriber), contact status validations, credit deductions, and write delivery logs back to database in real-time.
