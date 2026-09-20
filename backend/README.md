# Enterprise Bulk SMS Management System - Backend

This is the production-ready Python FastAPI backend for the **Bulk SMS Campaign Management** platform, integrated with **Dialog eSMS API v3.2 (Adeona Technologies / Dialog Axiata PLC)**.

It provides a multi-batch campaign architecture, monotonic unique 64-bit transaction generation, authoritative backend GSM-7/Unicode SMS segmentation, idempotent delivery report webhooks, Celery background workers + Celery Beat schedulers, and real-time WebSocket progress broadcasts.

---

## Technical Stack

* **Web Framework**: FastAPI (Python 3.12 / 3.13)
* **Database**: PostgreSQL (SQLAlchemy 2.0 async ORM engine with asyncpg)
* **Migrations**: Alembic
* **Background Processing**: Celery & Celery Beat (broker & backend powered by Redis)
* **SMS Gateway**: Dialog eSMS API v3.2 (POST `/api/v2/sms`, GET `/api/v1/sms/delivery-report`, POST `/api/v2/sms/check-transaction`)
* **Real-time Engine**: Redis Pub/Sub WebSocket broadcasting (`campaign_progress`, `sms_status`, `dashboard_update`, `notification`)
* **Authentication**: JWT Access & Refresh tokens + RBAC (Admin, Manager, Operator, Viewer)
* **Validation**: Pydantic V2
* **Rate Limiting**: SlowAPI

---

## Directory Structure

```
backend/
├── alembic/                      # Alembic database migrations
│   ├── versions/
│   │   └── 001_create_campaign_batches.py
│   └── env.py
├── app/
│   ├── api/                      # REST API routers & delivery webhooks
│   │   ├── auth.py               # Authentication & token endpoints
│   │   ├── campaigns.py          # Campaign management & batch queries
│   │   ├── contacts.py           # Contact address book & CSV import
│   │   ├── groups.py             # Recipient group definitions
│   │   ├── templates.py          # SMS templates & variable tags
│   │   ├── sms.py                # Single/bulk SMS & Dialog eSMS webhook
│   │   ├── dashboard.py          # Aggregated dashboard metrics
│   │   ├── reports.py            # Analytics & delivery reporting
│   │   ├── settings.py           # SMS gateway configurations & balances
│   │   └── audit_logs.py         # Compliance audit logs
│   ├── core/                     # Configuration, database engine & errors
│   │   ├── config.py             # Settings (Dialog eSMS credentials & limits)
│   │   └── database.py           # Async SQLAlchemy engine & session maker
│   ├── dependencies/             # FastAPI auth & RBAC dependencies
│   ├── middleware/               # Security headers & exception wrappers
│   ├── models/                   # SQLAlchemy 2.0 ORM models
│   │   ├── campaign.py           # Campaign & CampaignRecipient models
│   │   ├── campaign_batch.py     # CampaignBatch model (1,000 limit chunking)
│   │   ├── delivery_event.py     # Gateway delivery events audit log
│   │   ├── gateway_transaction.py# Gateway transaction journal
│   │   └── ...
│   ├── repositories/             # Clean CRUD data access layer
│   ├── schemas/                  # Pydantic V2 schemas & validators
│   ├── services/                 # Business logic & SMS gateway providers
│   │   ├── sms_segment_service.py# Authoritative GSM-7 & Unicode segmentation
│   │   ├── sms_provider.py       # Strict SMS provider factory
│   │   └── providers/
│   │       ├── esms_provider.py  # Dialog eSMS v3.2 Gateway Provider
│   │       ├── notifylk_provider.py
│   │       └── mobitel_provider.py
│   ├── websocket/                # WebSocket managers & Redis Pub/Sub events
│   ├── workers/                  # Celery background workers & schedulers
│   │   ├── celery_app.py         # Celery & Celery Beat periodic schedules
│   │   └── tasks.py              # Multi-batch processor & scheduled worker
│   └── main.py                   # FastAPI application initialization
├── tests/                        # Automated unit & integration tests
├── .env.example                  # Environment configuration template
├── alembic.ini                   # Alembic configuration
├── docker-compose.yml            # Container orchestration
└── requirements.txt              # Python requirements
```

---

## Dialog eSMS Gateway Architecture

### 1. Multi-Batch Processing (`CampaignBatch`)
* Dialog eSMS API allows up to **1,000 recipients per HTTP POST** request (`ESMS_BATCH_SIZE=1000`).
* Campaigns with > 1,000 recipients are automatically partitioned into ordered batches:
  * Batch 1: 1,000 recipients
  * Batch 2: 1,000 recipients
  * Batch 3: remaining recipients
* Each batch is dispatched independently, linked to the parent `Campaign`, and assigned a unique 64-bit `transaction_id`.

### 2. Transaction ID Generation (Dialog Error 104 Prevention)
* Dialog eSMS enforces unique numeric transaction IDs (1 to 18 digits) and rejects duplicates with error code `104`.
* `DialogESMSProvider.generate_unique_transaction_id()` generates monotonically increasing 64-bit numeric IDs using epoch milliseconds, worker salt, and atomic sequence counters.
* On transient network retries (timeouts, 117 rate limits), a **new transaction ID** is generated for the retry attempt.

### 3. Server-Side Token Lifecycle
* Dialog eSMS JWT tokens are acquired via `POST /api/v2/user/login`.
* Tokens are cached server-side for **12 hours (43,200 seconds)** with asynchronous mutex locking.
* Tokens are automatically renewed upon expiry or refreshed if error `100` (invalid/expired token) is encountered.
* Gateway credentials and tokens are **never exposed to the frontend client**.

### 4. Authoritative Backend SMS Segmentation
* **GSM-7**:
  * 1 Segment: 1 to 160 characters
  * Multipart: 153 characters per segment (7 characters reserved for UDH header)
  * GSM-7 Extensions (`\`, `^`, `{`, `}`, `[`, `]`, `~`, `|`, `€`): Counted as 2 characters.
* **Unicode / UCS-2 (Sinhala, Tamil, Emojis)**:
  * 1 Segment: 1 to 70 characters
  * Multipart: 67 characters per segment (3 characters reserved for UDH header)
* Required SMS credits are calculated authoritatively by the backend (`recipients * segments`) and reserved atomically before dispatch.

### 5. Delivery Report Webhook Processing (`GET /api/v1/sms/delivery-report`)
Dialog eSMS pushes real-time delivery reports to the configured webhook endpoint:
* Query parameters: `campaignId=<id>&msisdn=<number>&status=<code>`
  * `status=1`: Successfully submitted to SMSC (`SUBMITTED`)
  * `status=2`: SMS submission failed (`FAILED`)
  * `status=3`: Successfully delivered to handset (`DELIVERED`)
  * `status=4`: Delivery failed (`FAILED`)
* **Idempotency & Out-of-Order Safety**: If status `3` (`DELIVERED`) is received before status `1` (`SUBMITTED`), the status is preserved as `DELIVERED` and never regressed.
* Automatically recalculates `CampaignBatch` and parent `Campaign` counters in real time.

---

## Dialog eSMS Environment Variables

Configure the following in `backend/.env`:

```ini
# Gateway Selection (Strict, no silent fallback)
SMS_GATEWAY=ESMS

# Dialog eSMS v3.2 Credentials & Endpoints
ESMS_USERNAME=your_esms_username
ESMS_PASSWORD=your_esms_password
ESMS_BASE_URL=https://e-sms.dialog.lk
ESMS_AUTH_URL=https://esms.dialog.lk
ESMS_DEFAULT_MASK=CAFECHAI
ESMS_PAYMENT_METHOD=0
ESMS_DELIVERY_REPORT_URL=https://your-domain.com/api/v1/sms/delivery-report
ESMS_TIMEOUT_SECONDS=30
ESMS_BATCH_SIZE=1000
ESMS_SEND_TPS=20
ESMS_TOKEN_CACHE_HOURS=12

# Database & Celery
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bulk_sms_db
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

---

## Running the Application

### 1. Database Migrations
```bash
alembic upgrade head
```

### 2. Start FastAPI Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Start Celery Worker
```bash
celery -A app.workers.celery_app.celery_app worker --loglevel=info -P solo
```

### 4. Start Celery Beat (Scheduled Campaigns & Status Reconciliation)
```bash
celery -A app.workers.celery_app.celery_app beat --loglevel=info
```

---

## Running Automated Tests

Run the full pytest suite covering authentication, phone normalization, transaction ID generation, multi-batch splitting, Celery schedulers, webhook delivery reports, and segmentation:

```bash
python -m pytest tests/ -v
```
