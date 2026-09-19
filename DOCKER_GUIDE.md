# 🐳 Bulk SMS System - Docker Guide

This guide explains how to build, run, stop, and manage the Backend ecosystem using **Docker** and **Docker Compose**.

---

## 📦 Container Overview

When you run Docker Compose, the following containers are created:

| Container Name | Service | Port | Description |
| :--- | :--- | :--- | :--- |
| **`BULK_SMS-backend`** | FastAPI Web Server | `8000:8000` | REST API endpoints, Swagger docs, WebSockets |
| **`BULK_SMS-worker`** | Celery Worker | — | Background queue processor for SMS sending |
| **`BULK_SMS-redis`** | Redis | `6379:6379` | Queue broker & Pub/Sub messaging |
| **`BULK_SMS-db`** | PostgreSQL | `5432:5432` | Local relational database storage |

---

## 🚀 Quick Start Commands

### 1. Build and Start All Backend Containers (Detached Mode)
Run from the `backend` folder:
```powershell
cd "c:\Users\micha\OneDrive\Desktop\Personal project\Bulk_SMS_System\backend"

docker compose up --build -d
```

### 2. Verify Container Status
Check that all 4 containers are running and healthy:
```powershell
docker ps
```

### 3. Initialize & Seed Database (Run once on new database)
To create tables and add the default accounts (`superadmin@bulksms.lk` / `admin123`):
```powershell
docker exec -it BULK_SMS-backend python -m app.database.seed
```

---

## 🌐 Access Points

- **FastAPI Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Frontend App**: [http://localhost:5173](http://localhost:5173) (Run `npm run dev` in the `Frontend` folder)

---

## 📜 Viewing Container Logs

### View all logs in real-time:
```powershell
docker compose logs -f
```

### View FastAPI Backend logs only:
```powershell
docker logs -f BULK_SMS-backend
```

### View Celery SMS Worker logs only:
*(Great for watching real-time SMS delivery to Notify.lk)*
```powershell
docker logs -f BULK_SMS-worker
```

---

## 🛑 Stopping & Restarting Containers

### Stop containers without deleting data:
```powershell
docker compose stop
```

### Start stopped containers:
```powershell
docker compose start
```

### Stop and remove containers:
```powershell
docker compose down
```

### Restart a specific container (e.g. backend):
```powershell
docker restart BULK_SMS-backend
```

---

## 💡 Running the Frontend with the Docker Backend

While the backend is running in Docker, run the Frontend on your host:
```powershell
cd "c:\Users\micha\OneDrive\Desktop\Personal project\Bulk_SMS_System\Frontend"
npm run dev
```
The Frontend will automatically connect to `http://localhost:8000`.
