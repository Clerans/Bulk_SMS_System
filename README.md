# Enterprise SMS Campaign Management

This is the repository for the **Enterprise SMS Campaign Management** application. It consists of a FastAPI Python backend and a Vite React frontend.

The project designs and Figma mockups can be found here:
* [SMS Campaign Management Design](https://www.figma.com/design/toFVZDldi4Ktt6pr4mlobP/Enterprise-SMS-Campaign-Management)
* [Bulk SMS Management System Design](https://www.figma.com/design/I4Yvl5WCfSM69W0NyRzkJf/Bulk-SMS-Management-System)

---

## Repository Structure

* [Frontend](file:///c:/Users/micha/Desktop/Personal%20project/Bulk_SMS_System/Frontend): React + Vite + Tailwind CSS / Material UI dashboard. See [Frontend README.md](file:///c:/Users/micha/Desktop/Personal%20project/Bulk_SMS_System/Frontend/README.md).
* [backend](file:///c:/Users/micha/Desktop/Personal%20project/Bulk_SMS_System/backend): Python FastAPI + PostgreSQL + Celery/Redis backend. See [backend README.md](file:///c:/Users/micha/Desktop/Personal%20project/Bulk_SMS_System/backend/README.md).

---

## Setup & Running Guide

### Method 1: Using Docker Compose (Quickest for Backend)

You can run the backend ecosystem (FastAPI, Postgres, Redis, and Celery Worker) using Docker:

1. Open your terminal and navigate to the [backend](file:///c:/Users/micha/Desktop/Personal%20project/Bulk_SMS_System/backend) directory:
   ```bash
   cd backend
   ```
2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```
3. Run docker-compose to build and spin up the backend services:
   ```bash
   docker-compose up --build
   ```
4. In a separate terminal window, initialize and seed the database schemas:
   ```bash
   docker exec -it sms_api python -m app.database.seed
   ```
5. Verify backend health at `http://localhost:8000/health` and access API documentation at `http://localhost:8000/api/docs`.

Once the backend services are running, proceed to the **Frontend Setup** section below to run the dashboard.

---

### Method 2: Running Components Locally (Step-by-Step)

#### 1. Backend Setup

**Prerequisites:**
* Python 3.12+
* PostgreSQL running locally on port `5432`
* Redis running locally on port `6379`

**Steps:**
1. Navigate to the [backend](file:///c:/Users/micha/Desktop/Personal%20project/Bulk_SMS_System/backend) directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   
   # Windows:
   venv\Scripts\activate
   
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
4. Copy the environment template and adjust database credentials (`DATABASE_URL`, `REDIS_URL`, etc.):
   ```bash
   cp .env.example .env
   ```
5. Seed the database schemas and mock records:
   ```bash
   python -m app.database.seed
   ```
   * *Note: Default admin account created is `anika@cafechai.lk` with password `admin123`.*
6. Start the FastAPI application server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
7. Start the Celery worker (in a separate terminal with virtual environment active):
   ```bash
   python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info
   ```

---

#### 2. Frontend Setup

**Prerequisites:**
* Node.js (v18+) and npm/pnpm installed

**Steps:**
1. Navigate to the [Frontend](file:///c:/Users/micha/Desktop/Personal%20project/Bulk_SMS_System/Frontend) directory:
   ```bash
   cd Frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the displayed URL in your browser (typically `http://localhost:5173`).
