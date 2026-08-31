# 🚀 Bulk SMS System - Complete Run & Setup Guide

This guide explains step-by-step how to start both the **Frontend** and **Backend** (including **Redis** and the **Celery Worker**) on your machine.

---

## 📋 Overview of Required Services

For campaigns to send messages in real-time, **4 components** work together:

1. **Redis Server** (Port `6379`) — Background task queue broker
2. **FastAPI Backend Server** (Port `8000`) — REST API & WebSockets
3. **Celery Worker** — Background processor that executes SMS sending to Notify.lk / SMSLenz
4. **React Frontend (Vite)** (Port `5173`) — User interface dashboard

---

## ⚡ Quick Start (Terminal Commands)

### 1️⃣ Step 1: Start Redis
Make sure Redis is running. If using Docker:
```powershell
docker run -d -p 6379:6379 --name bulk-sms-redis redis:alpine
```
*(If port 6379 is already allocated, Redis is already running on your system!)*

---

### 2️⃣ Step 2: Start the Celery Worker (Terminal 1)
Open **Terminal 1** to process SMS dispatch queues:

```powershell
cd "c:\Users\micha\OneDrive\Desktop\Personal project\Bulk_SMS_System\backend"

# Run with python -m (avoids any Windows venv launcher path issues)
python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -P solo
```

> **Note for Windows:** The `-P solo` flag is required on Windows for Celery tasks to execute properly.

---

### 3️⃣ Step 3: Start the FastAPI Backend Server (Terminal 2)
Open **Terminal 2**:

```powershell
cd "c:\Users\micha\OneDrive\Desktop\Personal project\Bulk_SMS_System\backend"

python -m uvicorn app.main:app --reload --port 8000
```

- API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

### 4️⃣ Step 4: Start the Frontend App (Terminal 3)
Open **Terminal 3**:

```powershell
cd "c:\Users\micha\OneDrive\Desktop\Personal project\Bulk_SMS_System\Frontend"

npm run dev
```

- Frontend URL: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Default Credentials & Configurations

### Default Login
- **Email**: `admin@bulksms.lk`
- **Password**: `admin123`

### SMS Gateway Configuration (`backend/.env`)
The system is configured to use Notify.lk:
```ini
SMS_GATEWAY=NOTIFY
NOTIFY_USER_ID=32372
NOTIFY_API_KEY=8K1xL5xQK3LCHwZvL9i1
NOTIFY_SENDER_ID=NotifyDEMO
NOTIFY_BASE_URL=https://app.notify.lk/api/v1
```

---

## 🛠️ Troubleshooting Common Issues

### 🔴 Problem 1: "Fatal error in launcher: The system cannot find the file specified"
**Cause:** On Windows, when a project is moved (e.g. into `OneDrive`), python `.exe` wrappers in `venv\Scripts` have old hardcoded paths.

**Fix:**
- **Quick Fix:** Prefix your commands with `python -m`:
  ```powershell
  python -m uvicorn app.main:app --reload --port 8000
  python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -P solo
  ```
- **Permanent Fix (Recreate venv):**
  ```powershell
  cd "c:\Users\micha\OneDrive\Desktop\Personal project\Bulk_SMS_System\backend"
  python -m venv venv --clear
  .\venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  ```

---

### 🔴 Problem 2: Campaign stays in "Processing (0 / 2)" / SMS Not Received
**Cause:** Celery background worker is not running or Redis is unreachable.

**Fix:**
1. Check that Redis is running on port `6379`.
2. Ensure you have **Terminal 1** running Celery with:
   `python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -P solo`
3. Check the Celery terminal window — it will show output whenever a message is dispatched to Notify.lk.

---

### 🔴 Problem 3: "npm error ENOENT: no such file or directory, open backend\package.json"
**Cause:** Running `npm run dev` inside `backend`. `backend` is a Python project (FastAPI).

**Fix:** Only run `npm run dev` inside the `Frontend` directory.
